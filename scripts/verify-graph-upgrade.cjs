'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');

let server, browser;
const errors = [];
const root = path.join(__dirname, '..');

async function startServer() {
  server = spawn('python3', ['-m', 'http.server', '0', '--bind', '127.0.0.1'], {
    cwd: root, env: { ...process.env, PYTHONUNBUFFERED: '1' }
  });
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Static test server did not start')), 10000);
    let output = '';
    server.stdout.on('data', chunk => {
      output += String(chunk);
      const match = output.match(/port (\d+)/);
      if (match) { clearTimeout(timeout); resolve(`http://127.0.0.1:${match[1]}`); }
    });
    server.once('error', error => { clearTimeout(timeout); reject(error); });
    server.once('exit', code => { clearTimeout(timeout); reject(new Error(`Static test server exited (${code})`)); });
  });
}

async function ready(page, quality) {
  await page.waitForFunction(expected => {
    const report = window.GraphStudio?.getRenderReport();
    return report && Array.isArray(report.labels) && (!expected || report.quality === expected);
  }, quality);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function dismissKeyboard(page) {
  await page.evaluate(() => window.MathKeyboard.close());
}

async function importProject(page, state) {
  await page.locator('#projectFile').setInputFiles({
    name: 'browser-test.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(state))
  });
  await page.waitForFunction(expected => {
    const inputs = [...document.querySelectorAll('.expression-input')];
    return inputs.length === expected.length && inputs.every((input, i) => input.value === expected[i]);
  }, state.rows.map(row => row.text));
  await ready(page, state.display?.quality || 'balanced');
}

async function shareState(page) {
  await dismissKeyboard(page);
  await page.locator('#shareGraph').click();
  const url = await page.locator('#graphShareURL').inputValue();
  await page.getByRole('button', { name: '關閉', exact: true }).click();
  return { url, state: JSON.parse(decodeURIComponent(new URL(url).hash.slice(3))) };
}

async function download(page, selector) {
  await dismissKeyboard(page);
  const event = page.waitForEvent('download');
  await page.locator(selector).click();
  const result = await event;
  return { name: result.suggestedFilename(), bytes: await fs.readFile(await result.path()) };
}

async function assertLayout(page, description) {
  const data = await page.evaluate(() => {
    const canvas = document.getElementById('graphCanvas'), rect = canvas.getBoundingClientRect();
    return { report: window.GraphStudio.getRenderReport(), width: rect.width, height: rect.height, count: canvas.dataset.labelCount };
  });
  assert.equal(Number(data.count), data.report.labels.length, `${description}: visible count matches report`);
  for (const label of data.report.labels) {
    assert.ok([label.x, label.y, label.width, label.height].every(Number.isFinite), `${description}: finite label bounds`);
    assert.ok(label.width > 0 && label.height > 0, `${description}: positive label size`);
    assert.ok(label.x >= 0 && label.y >= 0 && label.x + label.width <= data.width + .01 && label.y + label.height <= data.height + .01,
      `${description}: label ${label.id} stays inside canvas`);
  }
  for (let i = 0; i < data.report.labels.length; i++) for (let j = i + 1; j < data.report.labels.length; j++) {
    const a = data.report.labels[i], b = data.report.labels[j];
    assert.ok(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y,
      `${description}: labels ${a.id} and ${b.id} do not overlap`);
  }
  return data.report;
}

(async () => {
  const base = await startServer();
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 2, acceptDownloads: true });
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  const page = await context.newPage();
  await page.goto(base + '/graph.html');
  await ready(page, 'balanced');
  await page.waitForSelector('.analysis-chip');

  await page.locator('.curve-label-input').first().fill('拋物線 A');
  await page.waitForFunction(() => window.GraphStudio.getRenderReport().labels.some(label => label.text === '拋物線 A'));
  assert.match(await page.locator('#graphLegend').innerText(), /拋物線 A/);
  const firstReport = await assertLayout(page, 'desktop custom labels');
  assert.ok(firstReport.evaluations > 0 && firstReport.segments > 0, 'render report records useful curve work');

  await page.locator('#labelMode').selectOption('none');
  await page.waitForFunction(() => window.GraphStudio.getRenderReport().labels.length === 0);
  assert.equal(await page.locator('#graphCanvas').getAttribute('data-label-count'), '0');
  await page.locator('#showLegend').uncheck();
  assert.equal(await page.locator('#graphLegend').isVisible(), false);
  await page.locator('#labelMode').selectOption('all');
  await page.waitForFunction(() => window.GraphStudio.getRenderReport().labels.some(label => label.text === '拋物線 A'));
  await assertLayout(page, 'all labels');
  await page.locator('#renderQuality').selectOption('precise');
  await ready(page, 'precise');
  assert.equal(await page.locator('#graphCanvas').getAttribute('data-quality'), 'precise');

  const hostile = '名稱 <script>alert("x")</script> & \'值\'';
  await page.locator('.curve-label-input').first().fill(hostile);
  await dismissKeyboard(page);
  await page.waitForFunction(value => document.getElementById('graphLegend').textContent.includes(value), hostile);
  assert.equal(await page.locator('#graphLegend script').count(), 0, 'legend treats labels as text');
  const svg = await download(page, '#exportSVG');
  assert.equal(svg.name, 'mathlab-graph.svg');
  const xml = svg.bytes.toString('utf8');
  assert.ok(xml.includes('&lt;script&gt;') && xml.includes('&amp;'), 'SVG escapes hostile label markup');
  const parsed = await page.evaluate(({ xml, hostile }) => {
    const document = new DOMParser().parseFromString(xml, 'image/svg+xml');
    return { name: document.documentElement.localName, errors: document.querySelectorAll('parsererror').length,
      scripts: document.querySelectorAll('script').length, label: document.documentElement.textContent.includes(hostile),
      viewBox: document.documentElement.getAttribute('viewBox') };
  }, { xml, hostile });
  assert.equal(parsed.name, 'svg');
  assert.equal(parsed.errors, 0, 'SVG is valid XML');
  assert.equal(parsed.scripts, 0, 'hostile label cannot create SVG script elements');
  assert.equal(parsed.label, true, 'SVG preserves complete custom label in export footer');
  assert.ok(!/NaN|Infinity/.test(xml), 'SVG coordinates are finite');
  const canvasSize = await page.locator('#graphCanvas').evaluate(canvas => ({ width: canvas.width, height: canvas.height, cssWidth: canvas.getBoundingClientRect().width }));
  const png = await download(page, '#exportGraph');
  assert.equal(png.name, 'mathlab-graph.png');
  assert.equal(png.bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(png.bytes.readUInt32BE(16), canvasSize.width, 'PNG preserves the full HiDPI canvas width');
  assert.equal(canvasSize.width, Math.round(canvasSize.cssWidth * 2), 'HiDPI canvas renders at twice the CSS width');
  assert.ok(png.bytes.readUInt32BE(20) > canvasSize.height, 'PNG includes the fully laid out expression footer');

  const shared = await shareState(page);
  assert.deepEqual(shared.state.display, { labels: 'all', quality: 'precise', legend: false });
  assert.equal(shared.state.rows[0].label, hostile);
  const sharedPage = await context.newPage();
  await sharedPage.goto(shared.url);
  await ready(sharedPage, 'precise');
  assert.equal(await sharedPage.locator('.curve-label-input').first().inputValue(), hostile);
  assert.equal(await sharedPage.locator('#labelMode').inputValue(), 'all');
  assert.equal(await sharedPage.locator('#showLegend').isChecked(), false);
  await sharedPage.close();

  const json = await download(page, '#saveProject');
  assert.equal(json.name, 'mathlab-graph.json');
  const saved = JSON.parse(json.bytes.toString('utf8'));
  assert.deepEqual(saved.display, shared.state.display);
  assert.equal(saved.rows[0].label, hostile);
  await page.locator('#exampleSelect').selectOption('circle');
  await importProject(page, saved);
  assert.equal(await page.locator('.curve-label-input').first().inputValue(), hostile);
  assert.equal(await page.locator('#labelMode').inputValue(), 'all');
  assert.equal(await page.locator('#showLegend').isChecked(), false);
  await page.waitForFunction(expected => {
    const state = JSON.parse(localStorage.getItem('mathlab-graph-v1') || 'null');
    return state?.rows[0].label === expected && state.display.quality === 'precise' && state.display.labels === 'all' && state.display.legend === false;
  }, hostile);
  await page.reload();
  await ready(page, 'precise');
  assert.equal(await page.locator('.curve-label-input').first().inputValue(), hostile, 'custom label survives reload');
  assert.equal(await page.locator('#labelMode').inputValue(), 'all', 'label mode survives reload');
  assert.equal(await page.locator('#showLegend').isChecked(), false, 'legend setting survives reload');

  for (const version of [1, 2]) {
    const legacy = { version, rows: [{ text: 'y=x', visible: true }], params: { a: 1, b: 1, c: 0 },
      view: { x: 0, y: 0, span: 14 }, t: [0, 2 * Math.PI], grid: true };
    await page.goto(base + '/graph.html#g=' + encodeURIComponent(JSON.stringify(legacy)));
    await ready(page, 'balanced');
    assert.equal(await page.locator('.expression-input').first().inputValue(), 'y=x', `v${version} share remains readable`);
    assert.equal(await page.locator('.curve-label-input').first().inputValue(), '');
    assert.equal(await page.locator('#labelMode').inputValue(), 'smart');
    assert.equal(await page.locator('#renderQuality').inputValue(), 'balanced');
    assert.equal(await page.locator('#showLegend').isChecked(), true);
  }

  const editor = page.locator('.expression-input').first();
  await editor.fill('');
  await page.locator('#mathKeyboard').waitFor({ state: 'visible' });
  await page.locator('[data-insert="(▯)/(▯)"]').click();
  assert.equal(await editor.inputValue(), '()/()');
  assert.equal(await page.locator('#mathKeyboardDiagnostic').getAttribute('data-status'), 'incomplete');
  await page.locator('[data-insert="√(▯)"]').click();
  assert.equal(await editor.inputValue(), '(√())/()');
  await page.locator('[data-insert="2"]').click();
  assert.equal(await editor.inputValue(), '(√(2))/()');
  await page.locator('[data-edit="next"]').click();
  assert.equal(await editor.evaluate(input => input.selectionStart), 8, 'next slot skips nested numerator to denominator');
  await page.locator('[data-insert="3"]').click();
  assert.equal(await editor.inputValue(), '(√(2))/(3)');
  assert.equal(await page.locator('#mathKeyboardDiagnostic').getAttribute('data-status'), 'valid');
  await page.locator('[data-edit="undo"]').click();
  assert.equal(await editor.inputValue(), '(√(2))/()', 'input undo restores the denominator slot');
  await page.locator('[data-edit="redo"]').click();
  assert.equal(await editor.inputValue(), '(√(2))/(3)', 'input redo restores the completed fraction');
  await editor.press('Control+z');
  assert.equal(await editor.inputValue(), '(√(2))/()', 'physical undo uses the same keyboard history');
  await editor.press('Control+Shift+z');
  assert.equal(await editor.inputValue(), '(√(2))/(3)', 'physical redo restores the fraction');
  await page.locator('[data-edit="apply"]').click();
  await page.waitForFunction(() => document.querySelector('.expression-input').getAttribute('aria-invalid') === 'false');
  assert.equal(await page.locator('#mathKeyboard').isVisible(), false);
  await page.locator('.curve-label-input').first().focus();
  assert.equal(await page.locator('#mathKeyboard').isVisible(), false, 'graph names keep the ordinary text keyboard');

  const dense = await page.evaluate(() => {
    const state = window.GraphState.defaults();
    state.rows = Array.from({ length: 12 }, (_, index) => ({ text: `(${(index % 4 - 1.5) * .22},${(Math.floor(index / 4) - 1) * .22})`,
      visible: true, color: window.GraphState.colors[index], label: `密集測量点 ${index + 1} · 中央區域` }));
    state.display = { labels: 'all', quality: 'balanced', legend: true };
    return state;
  });
  const mobile = await context.newPage();
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto(base + '/graph.html#g=' + encodeURIComponent(JSON.stringify(dense)));
  await ready(mobile, 'balanced');
  const mobileReport = await assertLayout(mobile, 'dense smartphone labels');
  assert.ok(mobileReport.labels.length > 0, 'dense smartphone still displays useful point labels');
  assert.ok(mobileReport.suppressed > 0, 'dense smartphone suppresses labels that cannot fit');
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no smartphone page overflow');
  assert.equal(await mobile.locator('#graphLegend > span').count(), 12, 'all dense points remain discoverable in the legend');
  await mobile.screenshot({ path: '/tmp/math-graph-upgrade-mobile.png', fullPage: true });
  await mobile.setViewportSize({ width: 820, height: 1180 });
  await ready(mobile, 'balanced');
  await assertLayout(mobile, 'dense tablet labels');
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no tablet page overflow');
  await mobile.screenshot({ path: '/tmp/math-graph-upgrade-tablet.png', fullPage: true });
  await mobile.close();

  assert.deepEqual(errors, [], 'no browser runtime errors');
  console.log('PASS graph upgrade browser checks: custom labels, collision-free layouts, settings, precise rendering, safe SVG, HiDPI PNG, share/JSON/reload persistence, v1/v2 links, nested keyboard slots and undo/redo, dense smartphone/tablet');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  if (server) server.kill();
});
