'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');
const root = path.resolve(__dirname, '..'), errors = [], vc = new VirtualConsole(); vc.on('jsdomError', error => errors.push(error.message));
const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), { url: 'https://example.test/Math/index.html', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
const w = dom.window, d = w.document, $ = id => d.getElementById(id), wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const context = new Proxy({ measureText: text => ({ width: String(text).length * 7 }), createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) }, { get: (o, k) => o[k] || (() => {}), set: (o, k, v) => (o[k] = v, true) });
w.HTMLCanvasElement.prototype.getContext = () => context; w.HTMLCanvasElement.prototype.getBoundingClientRect = () => ({ width: 1100, height: 720, top: 0, left: 0 });
Object.defineProperty(w.HTMLCanvasElement.prototype, 'clientWidth', { get: () => 1100 }); Object.defineProperty(w.HTMLCanvasElement.prototype, 'clientHeight', { get: () => 720 });
w.CanvasRenderingContext2D = class {}; w.structuredClone = structuredClone; w.HTMLElement.prototype.scrollIntoView = () => {};
w.HTMLDialogElement.prototype.showModal = function () { this.open = true; }; w.HTMLDialogElement.prototype.close = function () { this.open = false; };
const saved = [{ id: 'quadratic-vertex', parameters: { a: 1.5, h: 2, k: -1, x: 3 } }]; w.localStorage.setItem('mathlab.recent.v1', JSON.stringify(saved));
(async () => {
  for (const element of d.querySelectorAll('script[src]')) { const file = element.getAttribute('src').replace(/^\.\//, ''); if (file === 'engine/pwa.js') continue; new (require('node:vm').Script)(fs.readFileSync(path.join(root, file), 'utf8'), { filename: file }).runInContext(dom.getInternalVMContext()); }
  const lab = w.MathLab; await wait(320); assert.equal(lab.modules.length, 196);
  assert.equal(d.querySelectorAll('.topic-card').length, 6); const counts = [...d.querySelectorAll('.topic-card small')].map(e => Number(e.textContent.match(/\/ (\d+)/)[1])); assert.equal(counts.reduce((a, b) => a + b), 196);
  assert.match($('resumeTitle').textContent, /二次函數/); assert.equal(JSON.parse(w.localStorage.getItem('mathlab.recent.v1'))[0].id, 'quadratic-vertex', 'initial paint does not overwrite resume history');
  $('resumeExperiment').click(); assert.equal(lab.getState().moduleId, 'quadratic-vertex'); assert.equal(lab.getState().parameters.a, 1.5); assert.equal(lab.getState().parameters.h, 2);
  d.querySelector('.topic-card button').click(); const shown = d.querySelectorAll('#moduleList button'); assert.equal(shown.length, counts[0]); assert.match($('filterCount').textContent, /代數與函數/);
  $('moduleSearch').value = 'SSA'; $('moduleSearch').dispatchEvent(new w.Event('input')); assert.equal(d.querySelectorAll('#moduleList button').length, 1, 'typing a new query exits category filter'); $('clearFilters').click(); assert.equal(d.querySelectorAll('#moduleList button').length, 196);
  $('practicedCheck').checked = true; $('practicedCheck').dispatchEvent(new w.Event('change')); assert.equal($('exploreProgress').value, 1); assert.match($('exploreSummary').textContent, /已探索 1/);
  const before = w.localStorage.getItem('mathlab.practice.v1'); d.querySelector('#dailyChoices button').click(); assert.notEqual(w.localStorage.getItem('mathlab.practice.v1'), before); const attempts = JSON.parse(w.localStorage.getItem('mathlab.practice.v1')).attempts; d.querySelector('#dailyChoices button').click(); assert.equal(JSON.parse(w.localStorage.getItem('mathlab.practice.v1')).attempts, attempts);
  assert.equal($('dashboardToday').textContent, '1'); assert.ok($('dailyResult').textContent.length > 10);
  d.querySelector('[data-open-search]').click(); $('globalSearch').value = 'SSA'; $('globalSearch').dispatchEvent(new w.Event('input')); d.querySelector('#searchResults a').click(); assert.equal(lab.getState().moduleId, 'sine-law-ssa'); assert.equal(d.querySelector('.search-dialog').open, false);
  $('focusWorkspace').click(); assert.ok(d.body.classList.contains('workspace-focused')); $('focusWorkspace').click();
  for (const file of ['index.html', 'graph.html', 'spatial.html', 'script.html', 'practice.html', 'academy.html']) {
    const parsed = new JSDOM(fs.readFileSync(path.join(root, file), 'utf8')), page = parsed.window.document, ids = [...page.querySelectorAll('[id]')].map(el => el.id); assert.equal(ids.length, new Set(ids).size, file + ': unique IDs');
    assert.equal(page.querySelectorAll('.product-nav a').length, 7); assert.ok(page.querySelector('[data-open-search]'));
    for (const element of page.querySelectorAll('[src], link[href], a[href]')) { const value = element.getAttribute('src') || element.getAttribute('href'); if (!value || value.includes(':') || value.startsWith('#')) continue; const target = value.split(/[?#]/)[0]; if (target) assert.ok(fs.existsSync(path.join(root, target)), file + ': local resource ' + target); }
    parsed.window.close();
  }
  assert.deepEqual(errors, []); console.log('PASS dashboard/navigation: all 196 modules, category filters, resume parameters, progress/daily quiz, search, focus mode, and six-page local assets/anchors.');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => w.close());
