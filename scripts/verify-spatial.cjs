'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');
let server, browser;
const errors = [], failed = [];
async function serve() {
  server = spawn('python3', ['-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: path.join(__dirname, '..'), env: { ...process.env, PYTHONUNBUFFERED: '1' } });
  return new Promise((resolve, reject) => { let output = ''; const timer = setTimeout(() => reject(Error('Server timeout')), 10000); server.stdout.on('data', chunk => { output += chunk; const match = output.match(/port (\d+)/); if (match) { clearTimeout(timer); resolve('http://127.0.0.1:' + match[1]); } }); server.on('error', reject); });
}
async function ready(page) { await page.waitForFunction(() => window.SpatialStudio?.getRenderReport().faces > 0); await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
async function state(page) { return page.evaluate(() => window.SpatialStudio.getState()); }
async function closeKeyboard(page) { await page.evaluate(() => window.MathKeyboard?.close()); }
async function dimensions(page) { assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal page overflow'); }
(async () => {
  const base = await serve();
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1, acceptDownloads: true });
  context.on('page', page => { page.on('pageerror', err => errors.push(err.message)); page.on('response', response => { if (response.status() >= 400) failed.push(response.url()); }); });
  const page = await context.newPage(); await page.goto(base + '/spatial.html'); await ready(page); await dimensions(page);
  assert.equal(await page.locator('.brand').innerText(), 'MATH LAB\n數學工作室');
  assert.equal(await page.locator('[aria-current="page"]').getAttribute('href'), 'spatial.html');
  const initial = await state(page), canvas = page.locator('#spatialCanvas');
  const beforeImage = await canvas.screenshot();
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width * .4, box.y + box.height * .5); await page.mouse.down(); await page.mouse.move(box.x + box.width * .55, box.y + box.height * .6, { steps: 8 }); await page.mouse.up(); await ready(page);
  assert.notEqual((await state(page)).camera.yaw, initial.camera.yaw, 'Pointer orbit updates camera');
  assert.notDeepEqual(await canvas.screenshot(), beforeImage, 'Orbit changes projected surface pixels');
  await canvas.focus(); const afterDrag = await state(page); await page.keyboard.press('ArrowRight'); await page.keyboard.press('+'); await ready(page);
  assert.ok((await state(page)).camera.yaw > afterDrag.camera.yaw && (await state(page)).camera.zoom > afterDrag.camera.zoom, 'Accessible keyboard orbit and zoom');
  const beforeWheel = (await state(page)).camera.zoom; await canvas.hover(); await page.mouse.wheel(0, -100); await ready(page); assert.ok((await state(page)).camera.zoom > beforeWheel, 'Wheel zoom');
  await page.locator('[data-view="top"]').click(); await ready(page); assert.equal((await state(page)).camera.pitch, Math.PI / 2);
  await page.locator('[data-view="front"]').click(); await ready(page); assert.equal((await state(page)).camera.pitch, 0);
  await page.locator('[data-view="home"]').click(); await ready(page); assert.deepEqual((await state(page)).camera, initial.camera);
  await page.locator('#wireMode').click(); await ready(page); assert.equal((await state(page)).mode, 'wire'); assert.equal(await page.locator('#wireMode').getAttribute('aria-pressed'), 'true');
  await page.locator('#surfaceMode').click();
  for (const id of ['ripple', 'gaussian', 'wave', 'bowl', 'hemisphere', 'saddle']) { await page.locator(`[data-preset="${id}"]`).click(); await ready(page); assert.equal(await page.locator(`[data-preset="${id}"]`).getAttribute('aria-pressed'), 'true'); }
  await page.locator('#surfaceExpression').fill('sin(x)+cos(y)'); await page.keyboard.press('Enter'); await ready(page); assert.equal((await state(page)).expression, 'sin(x)+cos(y)');
  await page.locator('#surfaceExpression').focus(); assert.equal(await page.locator('#mathKeyboardDiagnostic').getAttribute('data-status'), 'valid', 'Shared keyboard accepts both surface variables'); await closeKeyboard(page);
  await page.locator('#surfaceExpression').fill('window.alert(1)'); await page.keyboard.press('Enter'); await page.locator('#surfaceError:not([hidden])').waitFor(); assert.equal((await state(page)).expression, 'sin(x)+cos(y)', 'Invalid expression cannot replace surface');
  await page.locator('#surfaceExpression').fill('sqrt(x)'); await page.keyboard.press('Enter'); await ready(page); assert.ok((await page.evaluate(() => SpatialStudio.getRenderReport())).skipped > 0, 'Partial domain creates gaps');
  await page.locator('#xMin').fill('10'); await page.locator('#drawSurface').click(); await page.locator('#surfaceError:not([hidden])').waitFor(); assert.equal((await state(page)).domain[0], -4, 'Invalid domain is rejected');
  await page.locator('[data-preset="gaussian"]').click(); await ready(page);
  await canvas.focus(); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('+');
  const sharedState = await state(page); await page.locator('#shareSurface').click(); const sharedURL = await page.locator('#spatialShareURL').inputValue();
  assert.deepEqual(JSON.parse(decodeURIComponent(new URL(sharedURL).hash.slice(7))), sharedState, 'Share includes exact expression, bounds, camera and mode');
  await page.getByRole('button', { name: '關閉分享視窗' }).click();
  const sharedPage = await context.newPage(); await sharedPage.goto(sharedURL); await ready(sharedPage); assert.deepEqual(await state(sharedPage), sharedState, 'Shared state restores correctly');
  const downloadEvent = page.waitForEvent('download'); await page.locator('#exportSurface').click(); const download = await downloadEvent, bytes = await fs.readFile(await download.path());
  assert.equal(download.suggestedFilename(), 'mathlab-surface.png'); assert.equal(bytes.subarray(1, 4).toString(), 'PNG'); assert.ok(bytes.length > 10000); assert.ok(bytes.readUInt32BE(20) > (await canvas.boundingBox()).height, 'PNG includes complete image and math caption');
  await page.waitForTimeout(300); await page.reload(); await ready(page); assert.deepEqual(await state(page), sharedState, 'Local scene and camera persist');
  await page.screenshot({ path: '/tmp/mathlab-spatial-desktop.png', fullPage: true });
  for (const width of [820, 390, 360]) {
    await page.setViewportSize({ width, height: 900 }); await ready(page); await dimensions(page);
    const stage = await canvas.boundingBox(); assert.ok(stage.width >= 300 && stage.height >= 400, 'Mobile canvas remains usable');
    await page.locator('[data-preset="wave"]').click(); await ready(page);
    await page.locator('#surfaceExpression').focus(); await page.locator('#mathKeyboard').waitFor({ state: 'visible' }); await dimensions(page); await closeKeyboard(page);
    const zoom = (await state(page)).camera.zoom;
    await canvas.evaluate(el => { const r = el.getBoundingClientRect(); const send = (type, id, x) => el.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: r.x + x, clientY: r.y + 180, bubbles: true }));
      // Synthetic pointers do not get browser capture; provide capture only for this simulation.
      const capture = el.setPointerCapture; el.setPointerCapture = () => {}; send('pointerdown', 101, 100); send('pointerdown', 102, 200); send('pointermove', 102, 245); send('pointerup', 101, 100); send('pointerup', 102, 245); el.setPointerCapture = capture;
    });
    await ready(page); assert.ok((await state(page)).camera.zoom > zoom, 'Two-pointer pinch zoom');
    if (width === 390) { await page.locator('[data-view="home"]').click(); await ready(page); await page.screenshot({ path: '/tmp/mathlab-spatial-mobile.png', fullPage: true }); }
  }
  await sharedPage.goto(base + '/spatial.html#scene=%7B%22expression%22%3A%22%3Cscript%3E%22%7D'); await ready(sharedPage); assert.equal((await state(sharedPage)).expression, initial.expression, 'Malformed shared state falls back safely');
  assert.deepEqual(errors, [], 'No runtime errors'); assert.deepEqual(failed, [], 'All assets resolve');
  console.log('Spatial browser: desktop/mobile layouts, all presets, real orbit pixels, keyboard/wheel/pinch, bounds/errors, sharing/persistence and PNG passed.');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await browser?.close(); server?.kill(); });
