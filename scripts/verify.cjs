#!/usr/bin/env node
'use strict';

// Browser regressions for the static app. Requires Playwright and a Chromium
// executable; no application files, dependency manifests, or lockfiles change.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const {spawn} = require('node:child_process');
const {once} = require('node:events');
const {chromium} = require('playwright');

const root = path.resolve(__dirname, '..');
const executablePath = process.env.CHROMIUM_PATH || '/usr/bin/chromium';
const expectedModules = Number(process.env.MATHLAB_EXPECTED_MODULES || 148);
const reportPath = path.resolve(process.env.MATHLAB_TEST_REPORT || '/tmp/mathlab-verification-report.json');
const report = {startedAt: new Date().toISOString(), expectedModules, checks: [], errors: []};
let server, browser, artifacts;
let serverLog = '';

function record(name, details = {}) {
  report.checks.push({name, ...details});
  process.stdout.write(`PASS ${name}${details.count ? ` (${details.count})` : ''}\n`);
}

async function availablePort() {
  const reservation = net.createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const {port} = reservation.address();
  await new Promise((resolve, reject) => reservation.close(error => error ? reject(error) : resolve()));
  return port;
}

async function startServer() {
  const port = await availablePort();
  server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1', '--directory', root], {stdio: ['ignore', 'pipe', 'pipe']});
  server.on('error', error => {serverLog += error.message;});
  for (const stream of [server.stdout, server.stderr]) stream.on('data', data => {serverLog = (serverLog + data.toString()).slice(-20000);});
  const baseURL = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Static server exited: ${serverLog}`);
    try {
      const response = await fetch(`${baseURL}/index.html`, {signal: AbortSignal.timeout(1000)});
      if (response.ok) return baseURL;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 75));
  }
  throw new Error(`Static server did not become ready: ${serverLog}`);
}

async function stopServer() {
  if (!server || server.exitCode !== null) return;
  const stopped = once(server, 'exit').catch(() => {});
  server.kill('SIGTERM');
  let timer;
  await Promise.race([stopped, new Promise(resolve => {timer = setTimeout(() => {server.kill('SIGKILL'); resolve();}, 1000);})]);
  clearTimeout(timer);
}

async function settled(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function main() {
  artifacts = await fs.mkdtemp(path.join(os.tmpdir(), 'mathlab-verification-'));
  const baseURL = await startServer();
  browser = await chromium.launch({executablePath, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage']});
  const context = await browser.newContext({viewport: {width: 1440, height: 1000}, acceptDownloads: true});
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.setDefaultNavigationTimeout(15000);
  const pageErrors = [], consoleErrors = [], badResponses = [], externalRequests = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => {if (message.type() === 'error') consoleErrors.push(message.text());});
  page.on('response', response => {if (response.status() >= 400) badResponses.push({url: response.url(), status: response.status()});});
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === baseURL || url.protocol === 'data:' || url.protocol === 'blob:') return route.continue();
    externalRequests.push(route.request().url());
    return route.abort();
  });
  await page.goto(`${baseURL}/index.html`, {waitUntil: 'networkidle'});
  await page.waitForFunction(() => window.MathLab?.modules?.length && document.querySelector('#moduleList button[data-module-id]'));
  await settled(page);

  const catalog = await page.evaluate(() => MathLab.modules.map(module => ({id: module.id, controls: module.controls.map(control => ({key: control.key, type: control.type || 'range', min: control.min, max: control.max, options: control.options?.map(option => option.value)}))})));
  assert.equal(catalog.length, expectedModules, 'Complete module catalog must load');
  assert.equal(new Set(catalog.map(module => module.id)).size, catalog.length, 'Module IDs must be unique');
  record('complete module catalog', {count: catalog.length});

  // Every boundary starts from defaults, so one control's singularity cannot
  // hide a different control's failure. Changes use real input events.
  const sweep = await page.evaluate(async () => {
    const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const result = {defaults: 0, rangeBoundaries: 0, selectOptions: 0, failures: []};
    const check = label => {
      const formula = document.getElementById('formulaBox').textContent.trim();
      const status = document.getElementById('liveStatus').textContent.trim();
      if (!formula || !status) result.failures.push(`${label}: empty formula/status`);
      if (/NaN|undefined/.test(formula + status)) result.failures.push(`${label}: invalid numeric output`);
    };
    for (const module of MathLab.modules) {
      try {
        MathLab.selectModule(module.id);
        await frame();
        check(`${module.id}/default`);
        result.defaults++;
        for (const control of module.controls) {
          const values = control.type === 'select' ? control.options.map(option => option.value) : [control.min, control.max];
          for (const value of values) {
            MathLab.selectModule(module.id);
            const input = document.getElementById(`control-${control.key}`);
            input.value = String(value);
            input.dispatchEvent(new Event('input', {bubbles: true}));
            await frame();
            check(`${module.id}/${control.key}=${value}`);
            if (control.type === 'select') result.selectOptions++; else result.rangeBoundaries++;
          }
        }
      } catch (error) {result.failures.push(`${module.id}: ${error.message}`);}
    }
    return result;
  });
  report.sweep = sweep;
  assert.deepEqual(sweep.failures, [], 'Every default, slider boundary, and select option must render valid output');
  assert.equal(sweep.defaults, expectedModules);
  assert.deepEqual(pageErrors, [], 'Module sweep must not raise browser exceptions');
  record('module defaults and all individual control boundaries', {count: sweep.defaults + sweep.rangeBoundaries + sweep.selectOptions, ...sweep});

  const invariants = await page.evaluate(() => {
    const find = id => MathLab.modules.find(module => module.id === id);
    const results = [];
    const close = (name, actual, expected, tolerance = 1e-9) => {
      if (!Number.isFinite(actual) || Math.abs(actual - expected) > tolerance * Math.max(1, Math.abs(expected))) throw new Error(`${name}: ${actual}, expected ${expected}`);
      results.push({name, actual, expected});
    };
    close('annular sector area', find('polar-sector-sweep').compute({r: 4, ratio: .5, theta: 120}).area, 4 * Math.PI);
    close('projected population variance', find('data-projection-variance').compute({theta: 0, stretch: 2}).variance, 20 / 3);
    // compute() also accepts geometric examples beyond the slider range.
    const complex = find('complex-collinearity').compute({bx: 3, by: 1, cx: 6, cy: 2});
    close('complex collinearity', complex.cross, 0);
    close('complex scale ratio', complex.re, 2);
    const integral = find('riemann-error-bounds').compute({b: 3, n: 8, method: 'trapezoid'});
    close('integral exact value', integral.exact, 9);
    close('quadratic trapezoid error', integral.trapezoid, 9 + 27 / (6 * 64));
    const section = find('spatial-section-geometry').compute({t: 1.5, angle: 35});
    close('central cube section area', section.area, 3 * Math.sqrt(3) / 4);
    close('central cube section vertices', section.points.length, 6);
    close('degenerate cube section area', find('spatial-section-geometry').compute({t: 0, angle: 35}).area, 0);
    const count = find('constrained-counting').compute({pool: 3, length: 3, rule: 'distinct', leading: 'nonzero'});
    close('constrained enumeration count', count.total, 4);
    close('enumeration agrees with independent formula', count.expected, 4);
    close('adjacent repeat restriction count', find('constrained-counting').compute({pool: 3, length: 3, rule: 'noadjacent', leading: 'nonzero'}).total, 8);
    const floor = find('floor-function-lattice').compute({n: 3, a: .3, b: .1, x: -1.2});
    close('lattice count', floor.total, 1);
    close('negative floor value', floor.floorX, -2);
    const recurrence = find('matrix-power-recurrence').compute({a: 1, b: 1, c: 1, d: 0, u: 1, v: 0, n: 5});
    close('Fibonacci matrix recurrence first component', recurrence.final[0], 8);
    close('Fibonacci matrix recurrence second component', recurrence.final[1], 5);
    const cross = find('space-cross-product').compute({ux: 1, uy: 2, uz: 3, vx: 4, vy: -1, vz: 2});
    [7, 10, -9].forEach((expected, index) => close(`cross product component ${index}`, cross.cross[index], expected));
    close('spatial triangle area', cross.area, Math.sqrt(230) / 2);
    const zero = find('space-cross-product').compute({ux: 1, uy: 2, uz: 3, vx: 0, vy: 0, vz: 0});
    if (zero.projection !== null || zero.angle !== null) throw new Error('Zero vector must have undefined projection direction and angle');
    const locus = find('geometric-locus-ratio').compute({d: 2, k: 2});
    close('Apollonius circle center', locus.center.x, 5 / 3);
    close('Apollonius circle radius', locus.radius, 4 / 3);
    close('distance ratio residual', locus.residual, 0);
    for (const [d, k, kind] of [[0, 1, 'plane'], [0, 2, 'point'], [2, 1, 'line']]) {
      if (find('geometric-locus-ratio').compute({d, k}).kind !== kind) throw new Error(`Wrong degenerate locus for d=${d}, k=${k}`);
    }
    const corner = find('piecewise-continuity').compute({L: 0, R: 0, V: 0, ml: -1, mr: 1, q: 0, h: .2});
    if (!corner.continuous || corner.differentiable) throw new Error('Corner must be continuous and not differentiable');
    if (find('piecewise-continuity').compute({L: 0, R: 0, V: 1, ml: -1, mr: 1, q: 0, h: .2}).continuous) throw new Error('Changed function value must break continuity');
    const sine = find('trig-inequality-intervals').compute({a: 1, b: 0, c: 0});
    close('sine nonnegative first interval start', sine.intervals[0][0], 0);
    close('sine nonnegative first interval end', sine.intervals[0][1], Math.PI);
    close('sine nonnegative solution measure', sine.measure, Math.PI);
    const dice = find('discrete-convolution').compute({a: 2, b: 3, target: 3});
    [1, 2, 2, 1].forEach((expected, index) => close(`dice convolution count ${index}`, dice.counts[index], expected));
    close('dice selected outcome count', dice.selectedCount, 2);
    close('dice sample space size', dice.total, 6);
    close('degenerate dice variance', find('discrete-convolution').compute({a: 1, b: 1, target: 2}).variance, 0);
    return results;
  });
  record('new module mathematical invariants and singular cases', {count: invariants.length, values: invariants});
  await evidenceChecks(page);

  await page.evaluate(() => MathLab.selectModule('riemann-error-bounds', {b: 3.7, n: 23, method: 'trapezoid'}));
  const share = await page.evaluate(() => ({url: MathLab.createShareURL(), state: MathLab.getState()}));
  await page.goto(share.url, {waitUntil: 'networkidle'});
  await settled(page);
  assert.deepEqual(await page.evaluate(() => MathLab.getState()), share.state, 'Share URL must restore exact normalized parameters');
  const rejections = await page.evaluate(() => {
    const before = JSON.stringify(MathLab.getState());
    const allBefore = JSON.stringify(MathLab.modules.map(module => module.controls.map(control => control.value)));
    const reject = callback => {let rejected = false; try {callback();} catch {rejected = true;} if (!rejected) throw new Error('Invalid state accepted');};
    reject(() => MathLab.selectModule('does-not-exist'));
    reject(() => MathLab.selectModule('riemann-error-bounds', {b: 999, n: 23, method: 'left'}));
    reject(() => MathLab.selectModule('riemann-error-bounds', {b: 3, n: 23, method: 'unknown'}));
    reject(() => MathLab.selectModule('riemann-error-bounds', {b: NaN}));
    reject(() => MathLab.selectModule('riemann-error-bounds', {unknown: 1}));
    if (JSON.stringify(MathLab.getState()) !== before || JSON.stringify(MathLab.modules.map(module => module.controls.map(control => control.value))) !== allBefore) throw new Error('Rejected state partially changed modules');
    return 5;
  });
  for (const malformed of ['#riemann-error-bounds?b=3&b=4', '#riemann-error-bounds?b=', '#does-not-exist?x=1']) {
    await page.evaluate(hash => {location.hash = hash;}, malformed);
    await settled(page);
    assert.deepEqual(await page.evaluate(() => MathLab.getState()), share.state, 'Malformed hash must preserve active experiment');
  }
  await page.evaluate(() => history.replaceState(null, '', location.pathname));
  record('share round trip and atomic validation', {count: rejections + 4});

  const raf = await page.evaluate(async () => {
    MathLab.selectModule('riemann-error-bounds');
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const input = document.getElementById('control-n');
    const before = MathLab.metrics.draws;
    for (let i = 0; i < 100; i++) {
      input.value = String(1 + i % 80);
      input.dispatchEvent(new Event('input', {bubbles: true}));
    }
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return {events: 100, draws: MathLab.metrics.draws - before, state: MathLab.getState().parameters.n};
  });
  assert(raf.draws >= 1 && raf.draws <= 2, `100 input events scheduled ${raf.draws} draws`);
  assert.equal(raf.state, 20, 'Latest input must be retained');
  record('animation frame coalescing', raf);

  await learningChecks(page, context, baseURL);

  const pngEvent = page.waitForEvent('download');
  await page.locator('#exportBtn').click();
  const png = await pngEvent;
  const pngPath = path.join(artifacts, 'experiment.png');
  await png.saveAs(pngPath);
  const pngData = await fs.readFile(pngPath);
  assert.equal(pngData.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert(pngData.readUInt32BE(16) > 0 && pngData.readUInt32BE(20) > 0 && pngData.length > 1000, 'PNG must contain a drawn canvas');
  record('PNG export', {bytes: pngData.length, width: pngData.readUInt32BE(16), height: pngData.readUInt32BE(20)});

  await page.evaluate(() => scrollTo(0, 0));
  await settled(page);
  await page.screenshot({path: path.join(artifacts, 'desktop.png')});
  await fs.copyFile(path.join(artifacts, 'desktop.png'), '/tmp/mathlab-desktop.png');
  await page.setViewportSize({width: 390, height: 844});
  await settled(page);
  const mobile = await page.evaluate(() => ({width: innerWidth, documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth}));
  assert(mobile.documentWidth <= mobile.width + 1 && mobile.bodyWidth <= mobile.width + 1, `Phone layout overflows: ${JSON.stringify(mobile)}`);
  await page.screenshot({path: '/tmp/mathlab-mobile-viewport.png'});
  await page.screenshot({path: path.join(artifacts, 'phone.png'), fullPage: true});
  await fs.copyFile(path.join(artifacts, 'phone.png'), '/tmp/mathlab-mobile.png');
  await fs.copyFile(path.join(artifacts, 'phone.png'), '/tmp/mathlab-phone.png');
  record('390px phone layout without horizontal overflow', mobile);

  // External networking has been blocked for the entire run. Reload proves the
  // app and persisted work use only local files, without implying SW caching.
  await page.reload({waitUntil: 'networkidle'});
  await settled(page);
  assert.equal(await page.evaluate(() => MathLab.modules.length), expectedModules);
  assert.deepEqual(externalRequests, [], 'App must make no external network requests');
  assert.deepEqual(badResponses, [], 'All local static assets must return successful responses');
  assert.deepEqual(pageErrors, [], 'No browser runtime exceptions');
  assert.deepEqual(consoleErrors, [], 'No console errors');
  record('self-contained reload with external network blocked');
  report.artifacts = artifacts;
  report.passed = true;
}

async function evidenceChecks(page) {
  const data = await page.evaluate(() => {
    const ids = new Set(MathLab.modules.map(module => module.id));
    const evidence = MathLabEvidence;
    const missing = [];
    let questions = 0, documents = 0;
    for (const exam of evidence.exams) for (const document of exam.documents) {
      documents++;
      questions += document.questions.length;
      for (const question of document.questions) for (const id of [...(question.moduleIds || []), ...(question.proposedModuleIds || []), ...(question.extensionModuleIds || [])]) {
        if (!ids.has(id)) missing.push(`${exam.exam}/${document.year}/${question.number}: ${id}`);
      }
    }
    return {questions, documents, missing, sources: evidence.sources.length, researchSources: evidence.sources.filter(source => !source.type?.startsWith('official-')).length, officialSources: evidence.curriculum.sources.length, exams: evidence.exams.map(exam => ({id: exam.exam, documents: exam.documents.map(document => ({year: document.year, questions: document.questions.map(question => question.primaryTopic)}))}))};
  });
  assert.equal(data.documents, 10, 'All ten uploaded exam papers must be indexed');
  assert.equal(data.questions, 185, 'All numbered questions must be indexed');
  assert.deepEqual(data.missing, [], 'Every existing and proposed exam module link must resolve');
  assert.equal(await page.locator('#researchSources .source-card').count(), data.researchSources);
  assert.equal(await page.locator('#curriculumSources .source-card').count(), data.officialSources);
  assert.equal(data.sources, 8);
  assert.equal(data.researchSources + data.officialSources, 8);
  const filters = page.locator('#examExplorer select');
  for (const exam of data.exams) {
    await filters.nth(0).selectOption(exam.id);
    for (const document of exam.documents) {
      await filters.nth(1).selectOption(String(document.year));
      await filters.nth(2).selectOption('all');
      assert.equal(await page.locator('.exam-question').count(), Math.min(20, document.questions.length));
      if (document.questions.length > 20) {
        await page.locator('.exam-load-more').click();
        assert.equal(await page.locator('.exam-question').count(), document.questions.length);
      }
      const firstTopic = document.questions[0];
      await filters.nth(2).selectOption(firstTopic);
      assert.equal(await page.locator('.exam-question').count(), document.questions.filter(topic => topic === firstTopic).length);
    }
  }
  await filters.nth(1).selectOption('all');
  await filters.nth(2).selectOption('all');
  assert.equal(await page.locator('.exam-question').count(), 20, 'Question list initially renders one page');
  await page.locator('.exam-load-more').click();
  assert.equal(await page.locator('.exam-question').count(), 40, 'Load more renders the next twenty questions');
  const linked = page.locator('.exam-question .exam-links button').first();
  const title = await linked.textContent();
  await linked.click();
  assert.equal(await page.evaluate(() => `探索：${MathLab.getCurrentModule().short}`), title, 'Exam exploration button must select its module');
  record('exam index, valid module links and traceable sources', {count: data.questions, documents: data.documents, researchSources: data.researchSources, officialSources: data.officialSources});
}

async function learningChecks(page, context, baseURL) {
  await page.evaluate(() => MathLab.selectModule('polar-sector-sweep'));
  await page.locator('#moduleSearch').fill('極坐標');
  const matching = await page.locator('#moduleList button[data-module-id]').count();
  assert(matching > 0 && matching < expectedModules, 'Search must restrict the catalog');
  await page.locator('#moduleSearch').fill('no-module-matches-098123');
  assert.equal(await page.locator('#moduleList button[data-module-id]').count(), 0, 'Unmatched search must show no modules');
  await page.locator('#clearFilters').click();
  assert.equal(await page.locator('#moduleList button[data-module-id]').count(), expectedModules);
  record('search and clear filters', {count: 3});

  for (const course of ['common', 'A', 'advanced', 'enrichment']) {
    await page.locator('#courseFilter').selectOption(course);
    const actual = await page.locator('#moduleList button[data-module-id]').evaluateAll(buttons => buttons.map(button => button.dataset.moduleId).sort());
    const expected = await page.evaluate(course => MathLab.modules.filter(module => {
      if (course === 'A') return module.course === 'common' || module.course === 'A';
      if (course === 'advanced') return ['common', 'A', 'advanced'].includes(module.course);
      return module.course === course;
    }).map(module => module.id).sort(), course);
    assert.deepEqual(actual, expected, `Cumulative course filter ${course}`);
  }
  await page.locator('#clearFilters').click();
  record('cumulative course scope filters', {count: 4});

  await page.locator('#favoriteBtn').click();
  assert.equal(await page.locator('#favoriteBtn').getAttribute('aria-pressed'), 'true');
  await page.locator('#favoritesOnly').check();
  assert.equal(await page.locator('#moduleList button[data-module-id]').count(), 1);
  await page.locator('#favoritesOnly').uncheck();
  await page.locator('#practicedCheck').check();
  const note = '回歸測試：環帶面積 4π。<img src=x onerror="window.__noteExecuted=true">';
  await page.locator('#moduleNotes').fill(note);
  await page.waitForFunction(() => document.getElementById('noteStatus').textContent.startsWith('已儲存'));
  // A module switch flushes any pending note save before navigation.
  await page.evaluate(() => {MathLab.selectModule('riemann-error-bounds'); MathLab.selectModule('polar-sector-sweep');});
  await page.reload({waitUntil: 'networkidle'});
  await page.evaluate(() => MathLab.selectModule('polar-sector-sweep'));
  assert.equal(await page.locator('#favoriteBtn').getAttribute('aria-pressed'), 'true', 'Favorite persists');
  assert(await page.locator('#practicedCheck').isChecked(), 'Practice mark persists');
  assert.equal(await page.locator('#moduleNotes').inputValue(), note, 'Note persists as plain text');
  assert.equal(await page.evaluate(() => Boolean(window.__noteExecuted)), false, 'Notes must never execute HTML');
  record('favorite, practice and safe note persistence', {count: 4});

  await page.locator('#teacherMode').check();
  await settled(page);
  assert(await page.locator('#teacherMode').isChecked());
  assert(await page.locator('body').evaluate(body => body.classList.contains('teacher-mode')));
  assert.equal(await page.locator('#formulaToggle').getAttribute('aria-expanded'), 'false');
  assert(!(await page.locator('#formulaBox').isVisible()));
  await page.locator('#formulaToggle').click();
  assert.equal(await page.locator('#formulaToggle').getAttribute('aria-expanded'), 'true');
  assert(await page.locator('#formulaBox').isVisible());
  await page.locator('#formulaToggle').click();
  assert(!(await page.locator('#formulaBox').isVisible()));
  await page.locator('#teacherMode').uncheck();
  assert.equal(await page.locator('body').evaluate(body => body.classList.contains('teacher-mode')), false);
  record('projection mode and formula reveal', {count: 4});

  const downloadEvent = page.waitForEvent('download');
  await page.locator('#exportLearning').click();
  const download = await downloadEvent;
  const backupPath = path.join(artifacts, 'learning.json');
  await download.saveAs(backupPath);
  const raw = await fs.readFile(backupPath, 'utf8');
  const backup = JSON.parse(raw);
  assert.equal(backup.records['polar-sector-sweep'].note, note, 'Learning backup contains the exact plain text note');
  assert.equal(backup.version, 1);
  assert.equal(backup.moduleId, 'polar-sector-sweep');
  await page.locator('#favoriteBtn').click();
  await page.locator('#practicedCheck').uncheck();
  await page.locator('#moduleNotes').fill('暫時更改');
  await page.evaluate(() => {MathLab.selectModule('riemann-error-bounds'); MathLab.selectModule('polar-sector-sweep');});
  await page.locator('#learningFile').setInputFiles(backupPath);
  await page.waitForFunction(() => document.getElementById('moduleNotes').value.includes('環帶面積'));
  assert.equal(await page.locator('#moduleNotes').inputValue(), note);
  assert.equal(await page.locator('#favoriteBtn').getAttribute('aria-pressed'), 'true');
  assert(await page.locator('#practicedCheck').isChecked());
  record('learning JSON export and restore', {bytes: raw.length, schemaVersion: backup.version});

  const stateBefore = await page.evaluate(() => MathLab.getState());
  const storageBefore = await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]))));
  const invalidFiles = [
    {name: 'malformed.json', value: '{'},
    {name: 'wrong-schema.json', value: JSON.stringify({version: 999, favorites: ['does-not-exist'], notes: {'polar-sector-sweep': 'changed'}})},
    {name: 'prototype.json', value: JSON.stringify(backup).slice(0, -1) + ',"__proto__":{"polluted":true}}'},
    {name: 'invalid-parameters.json', value: JSON.stringify({...backup, parameters: {r: 999}})},
    {name: 'unknown-record.json', value: JSON.stringify({...backup, records: {'does-not-exist': backup.records['polar-sector-sweep']}})},
    {name: 'oversized-note.json', value: JSON.stringify({...backup, records: {'polar-sector-sweep': {...backup.records['polar-sector-sweep'], note: 'x'.repeat(10001)}}})}
  ];
  for (const file of invalidFiles) {
    await page.locator('#learningFile').setInputFiles({name: file.name, mimeType: 'application/json', buffer: Buffer.from(file.value)});
    await page.waitForFunction(() => !document.getElementById('learningFile').value && document.getElementById('appNotice').textContent.startsWith('匯入失敗'));
    await settled(page);
    assert.equal(await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])))), storageBefore, `${file.name} must not mutate persisted learning data`);
    assert.equal(await page.locator('#moduleNotes').inputValue(), note, `${file.name} must not mutate current note`);
    assert.deepEqual(await page.evaluate(() => MathLab.getState()), stateBefore, `${file.name} must not mutate experiment parameters`);
    assert.equal(await page.evaluate(() => ({}).polluted), undefined, 'Import must not pollute object prototypes');
  }
  record('invalid learning imports preserve data', {count: invalidFiles.length});
}

(async () => {
  let timeout;
  try {
    await Promise.race([main(), new Promise((resolve, reject) => {timeout = setTimeout(() => reject(new Error('Browser regression deadline exceeded (180 seconds)')), 180000);})]);
  }
  catch (error) {
    report.passed = false;
    report.errors.push(error.stack || error.message);
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  } finally {
    clearTimeout(timeout);
    if (browser) await browser.close().catch(() => {});
    await stopServer();
    report.finishedAt = new Date().toISOString();
    await fs.mkdir(path.dirname(reportPath), {recursive: true});
    await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    process.stdout.write(`Report: ${reportPath}\n`);
  }
})();
