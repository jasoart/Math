#!/usr/bin/env node
'use strict';

// Production checks for the shared product shell and primary browser workflows.
// Detailed mathematical, security and import regressions remain in their suites.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {chromium} = require('playwright');

const root = path.resolve(__dirname, '..');
const reportPath = process.env.MATHLAB_PRODUCT_REPORT || '/tmp/mathlab-product-report.json';
const report = {startedAt: new Date().toISOString(), checks: [], errors: [], screenshots: []};
const pageNames = ['index.html', 'graph.html', 'spatial.html'];
const legacyCopy = /本次新增|這次新增|新增\s*50|歷屆|考試|考場|課綱|參考專案|GRAPH STUDIO\s+2\.4|\bv2\.[0-9]+(?:\.[0-9]+)?\b/i;
let server, browser;
const record = (name, details = {}) => {
  report.checks.push({name, ...details});
  process.stdout.write(`PASS ${name}\n`);
};
const settled = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

async function startServer() {
  server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1', '--directory', root], {stdio: ['ignore', 'pipe', 'pipe']});
  let logs = '';
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Static server startup timed out: ${logs}`)), 10000);
    server.on('error', error => {clearTimeout(timeout); reject(error);});
    server.once('exit', code => {clearTimeout(timeout); reject(new Error(`Static server exited (${code}): ${logs}`));});
    for (const stream of [server.stdout, server.stderr]) stream.on('data', data => {
      logs = (logs + data.toString()).slice(-1000);
      const port = logs.match(/port (\d+)/);
      if (port) {clearTimeout(timeout); resolve(`http://127.0.0.1:${port[1]}`);}
    });
  });
}

async function verifyLayout(page, label) {
  const bounds = await page.evaluate(() => {
    const width = innerWidth;
    return {width, document: document.documentElement.scrollWidth, body: document.body.scrollWidth,
      outside: [...document.querySelectorAll('main input, main select, main button, .brandbar a')].filter(element => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && (rect.left < -1 || rect.right > width + 1);
      }).slice(0, 8).map(element => ({tag: element.tagName, id: element.id, label: element.textContent.slice(0, 50)}))};
  });
  assert(bounds.document <= bounds.width + 1 && bounds.body <= bounds.width + 1, `${label}: horizontal overflow ${JSON.stringify(bounds)}`);
  assert.deepEqual(bounds.outside, [], `${label}: controls must stay inside the viewport`);
  record(`${label}: viewport and controls fit`, bounds);
}

async function verifyNavigation(page, context, base, file) {
  const links = await page.locator('.brandbar a[href]').evaluateAll(anchors => anchors.map(anchor => ({href: anchor.getAttribute('href'), label: anchor.textContent.trim()})));
  for (const name of pageNames) {
    assert(links.some(link => new URL(link.href, `${base}/${file}`).pathname === `/${name}`), `${file}: shared navigation includes ${name}`);
  }
  const localLinks = await page.locator('a[href]').evaluateAll(anchors => anchors.map(anchor => ({href: anchor.href, label: anchor.textContent.trim()})));
  for (const link of localLinks) {
    const url = new URL(link.href);
    if (url.origin !== base) continue;
    if (url.pathname === `/${file}` && url.hash) {
      const id = decodeURIComponent(url.hash.slice(1));
      assert(await page.evaluate(id => Boolean(document.getElementById(id)), id), `${file}: anchor ${url.hash} must resolve`);
    } else if (url.pathname !== `/${file}`) {
      const response = await context.request.get(url.origin + url.pathname);
      assert.equal(response.status(), 200, `${file}: local link ${link.href} must resolve`);
    }
  }
  assert.equal(await page.locator('h1').count(), 1, `${file}: one page title`);
  assert.match(await page.locator('.brandbar').innerText(), /MATH\s*LAB/i, `${file}: shared brand`);
  assert.match(await page.locator('.brandbar').innerText(), /數學工作室/, `${file}: shared brand name`);
  assert.doesNotMatch(await page.locator('body').innerText(), legacyCopy, `${file}: no historical release/exam/reference copy`);
  const assets = await page.locator('img').evaluateAll(images => images.map(image => ({src: image.getAttribute('src'), complete: image.complete, width: image.naturalWidth})));
  assert(assets.every(image => image.complete && image.width > 0), `${file}: every visible image must load: ${JSON.stringify(assets)}`);
  record(`${file}: shared brand, complete navigation and product copy`, {links: localLinks.length, images: assets.length});
}

async function verifyMainKeyboard(page) {
  await page.evaluate(() => MathLab.selectModule('circle-line'));
  const field = page.locator('#symbol-r');
  await field.click();
  await page.locator('#mathKeyboard [data-edit="clear"]').click();
  await page.locator('#mathKeyboard [data-insert="π"]').click();
  await page.locator('#mathKeyboard [data-insert="÷"]').click();
  await page.locator('#mathKeyboard [data-insert="2"]').click();
  assert.equal(await field.inputValue(), 'π÷2', 'Homepage keyboard preserves exact expression');
  await verifyLayout(page, 'homepage with mathematical keyboard open');
  await page.locator('#mathKeyboard [data-edit="apply"]').click();
  await page.waitForFunction(() => MathLab.getState().parameters.r === 'π÷2');
  assert.equal(await page.locator('#mathKeyboard').isVisible(), false);
  await page.locator('#shareBtn').click();
  assert.match(await page.locator('#shareURL').inputValue(), /circle-line/);
  await page.locator('#closeShareBtn').click();
  record('homepage symbolic keyboard and sharing workflow');
}

async function verifyGraphKeyboard(page) {
  await page.locator('#exampleSelect').selectOption('quadratic');
  const field = page.getByRole('textbox', {name: '算式 1', exact: true});
  await field.fill('y=sin(x)');
  await field.press('Enter');
  await page.waitForFunction(() => document.querySelector('.expression-input').getAttribute('aria-invalid') === 'false');
  await field.click();
  await verifyLayout(page, 'graph with mathematical keyboard open');
  await field.press('Escape');
  assert.equal(await page.locator('#mathKeyboard').isVisible(), false, 'Escape closes the shared keyboard');
  const before = await page.locator('#viewReadout').innerText();
  await page.locator('#graphCanvas').focus();
  await page.keyboard.press('ArrowRight');
  await settled(page);
  assert.notEqual(await page.locator('#viewReadout').innerText(), before, 'Keyboard pans graph');
  await page.keyboard.press('0');
  await page.locator('#shareGraph').click();
  assert.match(await page.locator('#graphShareURL').inputValue(), /#g=/);
  await page.getByRole('button', {name: '關閉', exact: true}).click();
  record('graph expression editing, keyboard navigation and sharing workflow');
}

async function main() {
  const base = await startServer();
  browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage']});
  const context = await browser.newContext({viewport: {width: 1440, height: 1000}, acceptDownloads: true});
  const errors = [], failedAssets = [], retiredAssets = [], externalRequests = [];
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === base || ['data:', 'blob:'].includes(url.protocol)) return route.continue();
    externalRequests.push(url.href);
    return route.abort();
  });
  context.on('page', page => {
    page.setDefaultTimeout(10000);
    page.on('pageerror', error => errors.push({url: page.url(), message: error.message}));
    page.on('console', message => {if (message.type() === 'error') errors.push({url: page.url(), message: message.text()});});
    page.on('response', response => {if (response.status() >= 400) failedAssets.push({url: response.url(), status: response.status()});});
    page.on('request', request => {if (/\/(?:evidence|exam-explorer)\.js(?:\?|$)/.test(request.url())) retiredAssets.push(request.url());});
  });
  const page = await context.newPage();
  for (const viewport of [{width: 1440, height: 1000}, {width: 820, height: 1180}, {width: 390, height: 844}, {width: 360, height: 800}]) {
    await page.setViewportSize(viewport);
    for (const file of pageNames) {
      await page.goto(`${base}/${file}`, {waitUntil: 'networkidle'});
      if (file === 'index.html') await page.waitForFunction(() => window.MathLab?.modules.length === 196);
      if (file === 'graph.html') await page.waitForFunction(() => document.querySelectorAll('.expression-row').length > 0);
      if (file === 'spatial.html') await page.waitForFunction(() => window.GeometryStudio?.getRenderReport().triangles > 0);
      await settled(page);
      await verifyLayout(page, `${file} ${viewport.width}px`);
      if (viewport.width === 1440) await verifyNavigation(page, context, base, file);
      if ([1440, 390].includes(viewport.width)) {
        const device = viewport.width === 1440 ? 'desktop' : 'mobile';
        const screenshot = `/tmp/mathlab-product-${file.replace('.html', '')}-${device}.png`;
        await page.screenshot({path: screenshot, fullPage: true});
        report.screenshots.push(screenshot);
        if (file === 'index.html') {
          const viewportShot = `/tmp/mathlab-product-${device}-viewport.png`;
          await page.screenshot({path: viewportShot});
          report.screenshots.push(viewportShot);
        }
      }
      if (viewport.width === 360) {
        if (file === 'index.html') await verifyMainKeyboard(page);
        if (file === 'graph.html') await verifyGraphKeyboard(page);
      }
    }
  }
  // Exercise real navigation after link validation so styling cannot leave the
  // product navigation covered by another interactive surface.
  for (const file of ['index.html', 'graph.html', 'spatial.html', 'index.html']) {
    const href = await page.locator('.product-nav a[href]').evaluateAll((anchors, file) => anchors.find(anchor => new URL(anchor.href).pathname.endsWith('/' + file))?.getAttribute('href'), file);
    assert(href, `Navigation to ${file} must be available`);
    await page.locator(`.product-nav a[href="${href}"]`).first().click();
    await page.waitForURL(`${base}/${file}`);
    await settled(page);
  }
  record('shared navigation works through all three workspaces on mobile');
  assert.deepEqual(retiredAssets, [], 'Removed evidence and exam explorer bundles must not load');
  assert.deepEqual(externalRequests, [], 'Production app remains self contained with external networking blocked');
  assert.deepEqual(failedAssets, [], 'All production assets load');
  assert.deepEqual(errors, [], 'All production routes are free of runtime and console errors');
  record('all routes run without external requests, broken assets or browser errors');
  report.passed = true;
}

(async () => {
  let timer;
  try {
    await Promise.race([main(), new Promise((_, reject) => {timer = setTimeout(() => reject(new Error('Product checks exceeded 180 seconds')), 180000);})]);
  } catch (error) {
    report.passed = false;
    report.errors.push(error.stack || String(error));
    process.stderr.write(`${error.stack || error}\n`);
    process.exitCode = 1;
  } finally {
    clearTimeout(timer);
    if (browser) await browser.close().catch(() => {});
    if (server) server.kill();
    report.finishedAt = new Date().toISOString();
    await fs.mkdir(path.dirname(reportPath), {recursive: true});
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
    process.stdout.write(`Report: ${reportPath}\n`);
  }
})();
