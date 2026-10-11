'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
let server, browser;
async function main() {
  server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1', '--directory', root], {stdio: ['ignore', 'pipe', 'pipe']});
  const base = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Canvas verification server did not start')), 10000);
    let output = '';
    server.once('error', error => {clearTimeout(timer); reject(error);});
    server.stdout.on('data', data => {output += data; const match = output.match(/port (\d+)/); if (match) {clearTimeout(timer); resolve(`http://127.0.0.1:${match[1]}`);}});
  });
  browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox']});
  const report = {sizes: [], screenshots: [], runtimeErrors: []};
  for (const width of [360, 820, 1440]) {
    const page = await browser.newPage({viewport: {width, height: 1000}, deviceScaleFactor: 1});
    page.on('pageerror', error => report.runtimeErrors.push(error.message));
    await page.goto(base + '/index.html');
    await page.waitForFunction(() => window.MathLab && window.MathCanvas);
    await page.evaluate(() => document.fonts.ready);
    const results = await page.evaluate(() => MathLab.modules.map(module => {
      MathLab.selectModule(module.id);
      const frame = MathLab.getRenderReport();
      const overlaps = [];
      for (let i = 0; i < frame.labels.length; i++) for (let j = i + 1; j < frame.labels.length; j++) {
        const a = frame.labels[i], b = frame.labels[j];
        if (a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y) overlaps.push([a.text, b.text]);
      }
      return {id: module.id, engine: frame.engine, grids: frame.grids, curves: frame.curves, contours: frame.contours, evaluations: frame.evaluations, labels: frame.labels.length, suppressed: frame.labelsSuppressed, overlaps,
        outside: frame.labels.filter(label => label.x < 0 || label.y < 0 || label.x + label.width > frame.width + .01 || label.y + label.height > frame.height + .01), duration: MathLab.metrics.lastDuration};
    }));
    assert(results.length >= 148, 'all original modules remain available');
    assert(results.every(result => result.engine === 'adaptive-canvas'), `${width}: every module uses the shared frame lifecycle`);
    assert(results.every(result => !result.overlaps.length && !result.outside.length), `${width}: annotations fit and do not overlap`);
    assert(results.find(result => result.id === 'parabola').evaluations > 0, 'original function module uses adaptive sampling');
    assert(results.find(result => result.id === 'rational-sign-chart').evaluations > 0, 'scene-based function module uses adaptive sampling');
    assert(results.find(result => result.id === 'contour-gradient').contours > 0, 'contour module uses validated implicit geometry');
    assert(results.find(result => result.id === 'matrix').labels >= 3, 'matrix background grid preserves vector and determinant labels');
    assert(results.find(result => result.id === 'function-transformations').labels >= 1, 'a formula legend survives a narrow viewport');
    report.sizes.push({width, modules: results.length, results});
    await page.evaluate(() => MathLab.selectModule('circle-line'));
    const screenshot = `/tmp/mathlab-canvas-engine-${width}.png`;
    await page.locator('#plot').screenshot({path: screenshot}); report.screenshots.push(screenshot);
    await page.close();
    console.log(`PASS ${results.length} canvas modules at ${width}px: adaptive geometry, bounded and nonoverlapping annotations`);
  }
  assert.deepEqual(report.runtimeErrors, [], 'no browser runtime errors');
  await fs.writeFile('/tmp/mathlab-canvas-engine-report.json', JSON.stringify(report, null, 2));
}
main().catch(error => {console.error(error); process.exitCode = 1;}).finally(async () => {await browser?.close(); server?.kill();});
