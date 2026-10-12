'use strict';
// DOM integration with the real worker message handler in an isolated VM.
// This does not replace real-device layout and browser Worker/PWA verification.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { JSDOM, VirtualConsole } = require('jsdom');
const root = path.resolve(__dirname, '..'), M = require('../language/mathscript.js');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const errors = [], downloads = [], workers = [], workerMessages = [];
const consoleCapture = new VirtualConsole(); consoleCapture.on('jsdomError', e => errors.push(e.message));
let workerDelay = 5, terminated = 0;
const dom = new JSDOM(read('script.html'), { url: 'https://example.test/Math/script.html', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: consoleCapture });
const w = dom.window, d = w.document, $ = id => d.getElementById(id);
w.addEventListener('error', e => errors.push(e.message));
w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
const blobs = new Map(); w.URL.createObjectURL = blob => { const url = 'blob:test-' + blobs.size; blobs.set(url, blob); return url; }; w.URL.revokeObjectURL = () => {};
w.Blob = Blob;
w.HTMLAnchorElement.prototype.click = function () { downloads.push({ name: this.download, blob: blobs.get(this.href) }); };
class FakeWorker {
  constructor(url) {
    assert.equal(String(url), 'https://example.test/Math/language/worker.js');
    this.dead = false; workers.push(this);
    const self = { postMessage: data => { workerMessages.push(data); if (!this.dead) this.onmessage?.({ data: structuredClone(data) }); } };
    this.context = vm.createContext({ performance, MathScript: M, self, importScripts() {} });
    vm.runInContext(read('language/worker.js'), this.context);
  }
  postMessage(data) { const copy = structuredClone(data); this.timer = setTimeout(() => { if (!this.dead) this.context.self.onmessage({ data: copy }); }, workerDelay); }
  terminate() { this.dead = true; clearTimeout(this.timer); terminated++; }
}
w.Worker = FakeWorker;
const edit = text => { $('source').value = text; $('source').dispatchEvent(new w.Event('input', { bubbles: true })); };
const change = (element, value) => { element.value = value; element.dispatchEvent(new w.Event('change', { bubbles: true })); };
async function execute(text) { if (text !== undefined) edit(text); $('runScript').click(); await pause(35); }
async function importFile(name, text, size = text.length) {
  Object.defineProperty($('projectFile'), 'files', { configurable: true, value: [{ name, size, text: async () => text }] });
  await $('projectFile').onchange({ target: $('projectFile') }); await pause(35);
}
(async () => {
  for (const file of ['graph/math.js', 'graph/render.js', 'language/mathscript.js', 'language/examples.js', 'language/display.js', 'language/editor-tools.js', 'language/studio.js']) w.eval(read(file));
  await pause(40);
  assert.equal($('runStatus').textContent, '已更新'); assert.ok($('plotStage').querySelector('svg path'));
  assert.equal(d.querySelectorAll('.parameter-row').length, 3); assert.equal($('shareProject').disabled, false);
  $('autoRun').checked = false;
  assert.ok($('sourceHighlight').querySelector('.syntax-keyword'));
  $('syntaxColor').checked = false; $('syntaxColor').dispatchEvent(new w.Event('change')); assert.ok(!d.body.classList.contains('syntax-active'));
  $('syntaxColor').checked = true; $('syntaxColor').dispatchEvent(new w.Event('change'));
  $('focusScript').click(); assert.ok(d.body.classList.contains('script-focused')); d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); assert.ok(!d.body.classList.contains('script-focused'));
  const initialSource = $('source').value;
  $('source').setSelectionRange($('source').value.length, $('source').value.length); change($('snippetSelect'), 'table'); assert.match($('source').value, /step 0.5/);
  $('undoEdit').click(); await pause(35); assert.equal($('source').value, initialSource);
  change($('exampleSelect'), 'motion'); await pause(35);
  $('undoEdit').click(); await pause(35); assert.equal($('source').value, initialSource);
  $('redoEdit').click(); await pause(35); assert.match($('source').value, /速度圖/);
  for (const example of require('../language/examples.js')) { change($('exampleSelect'), example.id); await pause(45); assert.equal($('runStatus').textContent, '已更新', example.id); }
  await execute('title "測試"\nparam a = 2 from -3 to 3 step 0.1\nfn f(x)=a*x^2\nplot f(x)\nprint f(2)');
  assert.match($('outputs').textContent, /8/);
  const slider = d.querySelector('input[type=range]'); slider.value = '3'; slider.dispatchEvent(new w.Event('input', { bubbles: true })); await pause(140);
  assert.match($('outputs').textContent, /12/); assert.equal(workerMessages.at(-1).result.stats.cached, true);
  $('shareProject').click(); const link = $('shareURL').value;
  const shared = JSON.parse(decodeURIComponent(new URL(link).hash.slice(4))); assert.equal(shared.parameters.a, 3); assert.match(shared.source, /fn f/);
  assert.ok($('shareDialog').open);
  $('exportHTML').click(); assert.equal(downloads.at(-1).name, 'mathscript-publication.html'); const published = await downloads.at(-1).blob.text(); assert.ok(published.includes('<svg')); assert.ok(published.includes('靜態快照'));
  $('exportSVG').click(); const svg = await downloads.at(-1).blob.text(); const svgDOM = new JSDOM(svg, { contentType: 'image/svg+xml' }); assert.equal(svgDOM.window.document.documentElement.tagName, 'svg'); svgDOM.window.close();
  $('exportProject').click(); const exported = JSON.parse(await downloads.at(-1).blob.text()); assert.equal(exported.parameters.a, 3);
  await execute('table x^2 from -1 to 1 step .5'); assert.equal($('exportCSV').disabled, false); $('exportCSV').click(); assert.equal(downloads.at(-1).name, 'mathscript-values.csv'); assert.ok((await downloads.at(-1).blob.text()).includes('0.5,0.25'));
  await execute(exported.source); assert.equal($('exportCSV').disabled, true);
  const restoredSlider = d.querySelector('input[type=range]'); restoredSlider.value = '3'; restoredSlider.dispatchEvent(new w.Event('input', { bubbles: true })); await pause(140);
  $('saveProject').click(); assert.equal(JSON.parse(w.localStorage.getItem('mathlab-mathscript-projects-v1')).length, 1);
  const projectId = $('projectSelect').value; assert.ok(projectId);
  await execute('print 99'); change($('projectSelect'), projectId); await pause(35); assert.equal($('source').value, exported.source); assert.match($('outputs').textContent, /12/);
  const priorSVG = $('plotStage').innerHTML;
  await execute('title "錯誤測試"\nprint nope'); assert.equal($('source').getAttribute('aria-invalid'), 'true'); assert.match($('diagnostics').textContent, /第 2 行/); assert.equal($('plotStage').innerHTML, priorSVG); assert.equal($('shareProject').disabled, true);
  $('jumpError').click(); assert.equal($('source').selectionStart, $('source').value.indexOf('nope'));
  $('undoEdit').click(); await pause(35); assert.equal($('source').value, exported.source); $('redoEdit').click(); await pause(35); assert.match($('source').value, /nope/);
  await importFile('broken.json', '{broken'); assert.match($('source').value, /nope/); assert.match($('studioNotice').textContent, /無法匯入/);
  await importFile('saved.json', JSON.stringify(exported)); assert.equal($('runStatus').textContent, '已更新'); assert.match($('outputs').textContent, /12/);
  await importFile('plain.mathscript', 'print 42'); assert.match($('outputs').textContent, /42/);
  $('undoEdit').click(); await pause(35); assert.equal($('source').value, exported.source);
  await importFile('oversize.mathscript', 'print 1', 200001); assert.equal($('source').value, exported.source);
  await execute('title "<img src=x onerror=alert(1)>"\nplot x label "<script>evil</script>"\nprint 1');
  assert.equal(d.querySelector('#previewTitle img'), null); assert.equal(d.querySelector('#plotLegend script'), null);
  workerDelay = 200; edit('print 123'); $('runScript').click(); assert.equal($('stopRun').disabled, false); const oldWorker = workers.at(-1), oldRequest = workerMessages.at(-1).id;
  $('stopRun').click(); assert.ok(terminated > 0); assert.equal($('shareProject').disabled, true); assert.match($('runStatus').textContent, /已停止/);
  workerDelay = 5; await execute('print 456'); const newOutput = $('outputs').textContent;
  oldWorker.onmessage?.({ data: { id: oldRequest, result: M.run('print 999') } }); assert.equal($('outputs').textContent, newOutput, 'stale response cannot replace latest result');
  edit('print 777'); await pause(350); const storedDraft = w.localStorage.getItem('mathlab-mathscript-draft-v1'); assert.match(storedDraft, /777/);
  w.location.hash = new URL(link).hash; await pause(80); assert.equal($('source').value, exported.source); assert.equal(w.localStorage.getItem('mathlab-mathscript-draft-v1'), storedDraft, 'opening a share preserves local draft');
  // Also flush a pending draft before a hash change instead of overwriting it with shared content.
  edit('print 888'); w.location.hash = '#ms=' + encodeURIComponent(JSON.stringify({ kind: 'mathscript', version: 1, source: 'print 555', parameters: {} })); await pause(380);
  assert.match(w.localStorage.getItem('mathlab-mathscript-draft-v1'), /888/); assert.match($('outputs').textContent, /555/);
  const oldSource = $('source').value; w.location.hash = '#ms=%ZZ'; await pause(35); assert.equal($('source').value, oldSource); assert.match($('studioNotice').textContent, /無法開啟分享/);
  const beforeStorage = w.Storage.prototype.setItem; w.Storage.prototype.setItem = () => { throw Error('QuotaExceededError'); };
  edit('print 222'); await pause(350); assert.match($('saveStatus').textContent, /無法儲存/); $('saveProject').click(); assert.match($('studioNotice').textContent, /儲存空間/); w.Storage.prototype.setItem = beforeStorage;
  // Real worker error and unsupported browser both produce actionable failures.
  workerDelay = 200; $('runScript').click();
  workers.at(-1).onerror({ preventDefault() {} }); assert.match($('diagnostics').textContent, /載入失敗/);
  workerDelay = 6000; $('runScript').click(); await pause(5100); assert.match($('diagnostics').textContent, /超過 5 秒/); assert.equal($('stopRun').disabled, true);
  w.Worker = undefined; await execute('print 1'); assert.match($('diagnostics').textContent, /不支援背景運算/);
  assert.deepEqual(errors, []);
  console.log('PASS MathScript DOM: all examples, worker/cache, sliders, errors, undo/redo, save/load, import, escaped SVG/HTML, share, cancellation, stale responses, draft isolation, storage failures and unsupported browser.');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { w.dispatchEvent(new w.Event('pagehide')); w.close(); });
