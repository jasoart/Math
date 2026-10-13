'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const M = require('../language/mathscript.js'), D = require('../language/display.js');
const examples = require('../language/examples.js');
const output = source => M.run(source).outputs[0].value;
const near = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);
test('precedence, right-associative powers, scientific notation and lazy conditions', () => {
  assert.equal(output('print -2^2'), -4); assert.equal(output('print 2^3^2'), 512);
  assert.equal(output('print 2e-3 + 3E-3'), .005); near(output('print sin(pi/2)'), 1);
  assert.equal(output('print if(1, 7, 1/0)'), 7); assert.equal(output('print 0 && 1/0'), 0);
  assert.equal(output('print 1 || sqrt(-1)'), 1); assert.equal(output('print 2>1 && 4<=4'), 1);
  assert.throws(() => output('print 1 < 2 < 3'), /連續比較/); assert.equal(output('print 1 < 2 && 2 < 3'), 1);
});
test('Chinese commands, Unicode names, comments, whitespace and source positions', () => {
  assert.equal(output('設 半徑 = 3\r\n# 面積\n顯示 半徑^2 × π'), 9 * Math.PI);
  assert.equal(output('let a = 2; print a + 1 // comment'), 3);
  const r = M.run('title "字串 # // ; 不作註解"\nprint 2'); assert.equal(r.title, '字串 # // ; 不作註解');
  assert.throws(() => M.compile('\n\nprint @'), e => e.line === 3 && e.column === 7);
  assert.throws(() => M.run('print missing'), /尚未定義/);
});
test('custom multi-argument functions and lexical scope', () => {
  assert.equal(output('let offset = 2\nfn f(x) = x + offset\nfn g(offset) = f(offset)\nprint g(4)'), 6);
  assert.equal(output('fn add(a,b) = a+b\nprint add(4,7)'), 11);
  assert.throws(() => M.run('fn f(x) = f(x)\nprint f(1)'), /不支援遞迴/);
  assert.throws(() => M.run('fn f(x) = y\nplot f(x)'), /尚未定義/);
  assert.throws(() => M.run('fn f(x) = x\nprint f(1,2)'), /1 個引數/);
  assert.throws(() => M.run('let a=1\nlet a=2'), /已定義/);
});
test('sliders update dependent constants, custom functions and integrals', () => {
  const source = 'param scale=2 from -3 to 3 step 0.1\nlet offset=scale+1\nfn f(x)=scale*x+offset\nprint f(4)\nintegral f(x) from 0 to 2';
  assert.equal(M.run(source).outputs[0].value, 11);
  const updated = M.run(M.compile(source), { parameters: { scale: -1 } });
  assert.equal(updated.outputs[0].value, -4); near(updated.outputs[1].value, -2);
  assert.throws(() => M.run(source, { parameters: { scale: 4 } }), /超出/);
  assert.throws(() => M.run('param a=1 from 2 to 3'), /初值/);
  assert.throws(() => M.run('param a=1 from 0 to 2 step 0'), /步長/);
});
test('integration independently matches polynomial antiderivatives', () => {
  for (let i = 0; i < 30; i++) {
    const a = (i - 13) / 7, b = (i % 7 - 2) / 3, c = i / 10;
    const source = `integral (${a})*x^2+(${b})*x+(${c}) from -2 to 3`;
    near(output(source), a * 35 / 3 + b * 5 / 2 + c * 5);
  }
  near(output('integral x^2 from 2 to -1'), -3);
  assert.throws(() => M.run('integral 1/x from -1 to 1'), /未收斂/);
  assert.throws(() => M.run('print sqrt(-1)'), /有限實數/);
});
test('tables have stable endpoints and explicit undefined values', () => {
  const r = M.run('table 1/x from -1 to 1 step 0.1').outputs[0];
  assert.equal(r.rows.length, 21); assert.equal(r.rows[10][1], null); near(r.rows.at(-1)[0], 1);
  assert.throws(() => M.run('table x from 0 to 1000 step 0.01'), /200 列/);
  assert.throws(() => M.run('table x from 0 to 2 step -1'), /正數步長/);
});
test('root estimates, discontinuity rejection and zero function diagnostic', () => {
  const r = M.run('roots x^2-2 from -3 to 3').outputs[0]; assert.equal(r.values.length, 2);
  near(r.values[0], -Math.SQRT2); near(r.values[1], Math.SQRT2);
  assert.equal(M.run('roots 1/x from -1 to 1').outputs[0].values.length, 0);
  assert.throws(() => M.run('roots 0 from -1 to 1'), /取樣點皆為零/);
});
test('all shipped examples produce finite, serializable geometry and valid SVG', () => {
  for (const e of examples) {
    const result = M.run(e.source); assert.ok(result.stats.steps < M.LIMITS.steps);
    for (const plot of result.plots) { assert.ok(plot.segments.length); for (const segment of plot.segments) for (const point of segment) assert.ok(point.every(Number.isFinite)); }
    const svg = D.svg(result); assert.ok(svg.includes('<svg')); assert.doesNotMatch(svg, /NaN|Infinity|undefined/);
    assert.doesNotThrow(() => JSON.parse(JSON.stringify(result)));
  }
  const asymptote = M.run('view -2,2,-4,4\nplot 1/x');
  for (const segment of asymptote.plots[0].segments) assert.ok(segment.every(p => p[0] > 0) || segment.every(p => p[0] < 0));
});
test('language cannot access JavaScript, DOM, network or prototype properties', () => {
  for (const code of ['print window.alert(1)', 'print constructor(1)', 'print __proto__', 'print fetch(1)', 'let a = globalThis', 'print [1,2].map(1)', 'print eval(1)', 'print 2x', 'print 1e999']) assert.throws(() => M.run(code), M.ScriptError, code);
  const payload = 'title "<img src=x onerror=alert(1)>"\nplot x label "</script><script>alert(1)</script>"';
  const result = M.run(payload), html = D.publication(result, payload, 'https://example.test/Math/script.html');
  assert.doesNotMatch(html, /<script>|<img /); assert.ok(html.includes('&lt;script&gt;'));
  assert.throws(() => M.validateDocument(JSON.parse('{"kind":"mathscript","version":1,"source":"print 1","parameters":{"__proto__":1}}')), /參數資料無效/);
});
test('source, nesting, output, and instruction budgets are enforced', () => {
  assert.throws(() => M.compile(' '.repeat(M.LIMITS.source + 1)), /不可超過/);
  assert.throws(() => M.compile('print ' + '('.repeat(60) + '1' + ')'.repeat(60)), /過深/);
  assert.throws(() => M.compile('print ' + Array(70).fill('1').join('+')), /過深/);
  assert.throws(() => M.run(Array(13).fill('plot x').join('\n')), /12 條/);
  assert.throws(() => M.run('view 2,1,-1,1\nplot x'), /視窗/);
  const explosive = ['fn f0(x) = x', ...Array.from({ length: 22 }, (_, i) => `fn f${i + 1}(x) = f${i}(x) + f${i}(x)`), 'print f22(1)'].join('\n');
  assert.throws(() => M.run(explosive), /計算上限/);
});
test('documents validate version and allow invalid source to remain editable', () => {
  const d = M.validateDocument({ kind: 'mathscript', version: 1, source: 'incomplete code', parameters: { a: 1 }, unexpected: 'drop' });
  assert.equal(d.source, 'incomplete code'); assert.equal(d.unexpected, undefined);
  assert.throws(() => M.validateDocument({ ...d, version: 2 }), /version 1/);
  assert.throws(() => M.validateDocument({ ...d, parameters: { a: Infinity } }), /無效/);
});
test('actual worker script caches at most 8 programs, returns request IDs and structured errors', () => {
  const responses = [], context = vm.createContext({ performance, MathScript: M, importScripts() {}, self: { postMessage: r => responses.push(r) } });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../language/worker.js'), 'utf8'), context);
  const send = (id, source) => context.self.onmessage({ data: { id, source } });
  send(1, 'print 1'); send(2, 'print 1'); assert.equal(responses[1].result.stats.cached, true);
  for (let i = 2; i <= 10; i++) send(i + 1, `print ${i}`);
  send(20, 'print 1'); assert.equal(responses.at(-1).result.stats.cached, false);
  send(21, 'print missing'); assert.equal(responses.at(-1).id, 21); assert.equal(responses.at(-1).error.line, 1);
});
test('offline inventory includes editor, worker imports, and versioned publication assets', () => {
  const files = require('./build-pwa.cjs').inventory();
  for (const name of ['script.html', 'language/worker.js', 'language/mathscript.js', 'language/values.js', 'language/studio.js', 'language/display.js', 'language/studio.css', 'graph/math.js', 'graph/render.js']) assert.ok(files.includes(name), name);
});
