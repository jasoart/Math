'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const os = require('node:os');
const { chromium } = require('playwright');
const { build } = require('./build-pwa.cjs');
const root = path.resolve(__dirname, '..');
let server, browser, profile, updatedWorker = false;
const errors = [];
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
async function serve() {
  server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      if (!url.pathname.startsWith('/Math/')) { response.writeHead(404); response.end(); return; }
      const relative = decodeURIComponent(url.pathname.slice('/Math/'.length)) || 'index.html';
      const filename = path.resolve(root, relative);
      if (!filename.startsWith(root + path.sep)) { response.writeHead(403); response.end(); return; }
      let data = await fs.readFile(filename);
      if (relative === 'sw.js' && updatedWorker) data = Buffer.from(data.toString().replace(/const BUILD = '([^']+)';/, "const BUILD = '$1-browser-update';"));
      response.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); response.end(data);
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return 'http://127.0.0.1:' + server.address().port + '/Math/';
}
async function ready(page) {
  await page.waitForFunction(() => window.MathPWA?.getStatus().offlineReady && navigator.serviceWorker.controller, { timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
}
(async () => {
  const shell = build(), base = await serve();
  profile = await fs.mkdtemp(path.join(os.tmpdir(), 'mathlab-pwa-browser-'));
  browser = await chromium.launchPersistentContext(profile, { headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'], viewport: { width: 390, height: 900 }, serviceWorkers: 'allow' });
  const context = browser;
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  const page = await context.newPage(); await page.goto(base + 'index.html'); await ready(page);
  await page.waitForFunction(() => MathLab?.modules.length >= 196);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'PWA status has no mobile overflow');
  const cdp = await context.newCDPSession(page);
  const appManifest = await cdp.send('Page.getAppManifest');
  assert.equal(appManifest.errors.length, 0, 'Browser parses the manifest without errors');
  assert.ok(appManifest.url.endsWith('/Math/manifest.webmanifest'), 'Manifest resolves at deployment subpath');
  const manifest = JSON.parse(appManifest.data);
  for (const icon of manifest.icons) {
    assert.ok(await page.evaluate(async source => { const image = new Image(); image.src = new URL(source, location.href); await image.decode(); return image.naturalWidth >= 192 && image.naturalHeight >= 192; }, icon.src), 'Browser decodes install icon: ' + icon.src);
  }
  // Chromium exposes actual installability reasons; a headless profile may not emit the install prompt.
  const installability = await cdp.send('Page.getInstallabilityErrors');
  const structuralErrors = installability.installabilityErrors.filter(error => !['not-from-secure-origin', 'no-user-gesture'].includes(error.errorId));
  assert.deepEqual(structuralErrors, [], 'Chromium confirms installable manifest and icons');
  const initialCaches = await page.evaluate(() => caches.keys());
  assert.equal(initialCaches.filter(name => name.includes('mathlab-pwa-') && name.includes('shell-')).length, 1, 'One coherent active shell');
  const cachedFiles = await page.evaluate(async () => { const name = (await caches.keys()).find(name => name.includes('shell-')); return (await (await caches.open(name)).keys()).map(request => new URL(request.url).pathname.slice('/Math/'.length)).sort(); });
  assert.deepEqual(cachedFiles, shell.files, 'Every runtime file and math font is precached');
  await page.locator('#moduleNotes').fill('PWA 更新保留的實驗筆記'); await page.locator('#moduleNotes').blur();
  await context.setOffline(true);
  await cdp.send('Network.overrideNetworkState', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  for (const file of ['graph.html', 'spatial.html', 'index.html']) {
    await page.goto(base + file + '?offline=1'); await ready(page);
    if (file === 'graph.html') {
      await page.waitForFunction(() => window.GraphStudio?.getRenderReport());
      const input = page.locator('.expression-input').first();
      await input.fill('x^2+1'); await input.blur();
      await page.waitForFunction(() => document.querySelector('.expression-preview [data-math-source]')?.dataset.mathSource === 'x^2+1');
      assert.ok(await page.locator('.expression-preview math').count() > 0, 'Graph math typesetting works entirely offline');
    } else if (file === 'spatial.html') {
      await page.waitForFunction(() => window.GeometryStudio?.getRenderReport());
      assert.ok(await page.locator('#geometryObjects').innerText(), 'Multi-object geometry workspace works offline');
      await page.locator('#surfaceWorkspaceTab').click();
      await page.waitForFunction(() => window.SpatialStudio?.getRenderReport().faces > 0);
      assert.ok(await page.locator('#surfacePreview math').count() > 0, 'Spatial formula and mesh work entirely offline');
    } else {
      await page.waitForFunction(() => window.MathLab?.modules.length >= 196);
      await page.evaluate(() => MathLab.selectModule('studio-symmetric-eigenspaces'));
      assert.ok(await page.locator('#formulaBox math').count() > 0, 'New module mathematical engine works offline');
    }
    assert.equal((await page.evaluate(() => MathPWA.getStatus())).online, false, file + ' reports offline network state');
    assert.ok((await page.locator('[data-pwa-status]').innerText()).includes('可繼續探索'), 'Accessible offline status');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Offline mobile layout remains bounded');
  }
  const unknown = await page.goto(base + 'missing.html'); assert.equal(unknown.status(), 503, 'Offline unknown page gets explicit safe fallback');
  await page.getByRole('link', { name: '返回離線工作區' }).click(); await ready(page);
  await context.setOffline(false); await cdp.send('Network.overrideNetworkState', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }); await page.reload(); await ready(page);
  updatedWorker = true;
  await page.evaluate(() => MathPWA.checkForUpdate());
  await page.waitForFunction(() => MathPWA.getStatus().updateWaiting);
  await page.locator('[data-pwa-update]').waitFor({ state: 'visible' });
  assert.equal((await page.evaluate(() => caches.keys())).filter(name => name.includes('shell-')).length, 2, 'New shell installs while old shell stays active');
  await page.getByRole('button', { name: '關閉應用程式通知', exact: true }).click();
  assert.ok((await page.evaluate(() => MathPWA.getStatus())).updateWaiting, 'Dismissing notice leaves update waiting');
  await page.reload(); await ready(page); await page.locator('[data-pwa-update]').waitFor({ state: 'visible' });
  const reload = page.waitForEvent('load'); await page.locator('[data-pwa-update]').click(); await reload; await ready(page);
  const updatedCaches = await page.evaluate(() => caches.keys());
  assert.equal(updatedCaches.filter(name => name.includes('shell-')).length, 1, 'Explicit update removes obsolete shell');
  assert.ok(updatedCaches.some(name => name.includes('browser-update')), 'Page is controlled by updated shell');
  await page.evaluate(() => MathLab.selectModule(MathLab.modules[0].id));
  assert.equal(await page.locator('#moduleNotes').inputValue(), 'PWA 更新保留的實驗筆記', 'Updates preserve saved local notes');
  await page.screenshot({ path: '/tmp/mathlab-pwa-mobile.png', fullPage: true });
  assert.deepEqual(errors, [], 'Offline and update journeys have no JavaScript errors');
  console.log('PWA browser: installable manifest/icons, /Math/ scope, all precached assets, three offline workspaces, safe fallback, explicit update and saved notes passed.');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await browser?.close(); if (server) await new Promise(resolve => server.close(resolve)); if (profile) await fs.rm(profile, { recursive: true, force: true }); });
