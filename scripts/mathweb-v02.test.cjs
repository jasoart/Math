'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const C = require('../compiler/compiler.js');
const seed = require('../compiler/seed.cjs');
const runtime = require('../compiler/runtime.js');
function load(source) {
  const code = C.compile(source);
  assert.equal(code, seed.compile(source), 'bootstrap and self-hosted generators agree');
  const module = { exports: {} };
  vm.runInNewContext(code, { module, require: p => { assert.equal(p, '../compiler/runtime.js'); return runtime; } }, { timeout: 3000 });
  return module.exports;
}
const result = expr => load(`(module T (export (record ("value" ${expr}))))`).value;
const plain = value => JSON.parse(JSON.stringify(value));

test('finite sums and products agree with closed forms, including empty ranges', () => {
  const m = load(`(module Sequences
    (fn squares (n) (return (sum-range (k 1 n) (* k k))))
    (fn fact (n) (return (product-range (k 1 n) k)))
    (export (record ("squares" squares) ("fact" fact))))`);
  for (const n of [0, 1, 2, 10, 100, 1000, 9999]) assert.equal(m.squares(n), n*(n+1)*(2*n+1)/6);
  let factorial = 1;
  for (let n = 0; n <= 12; n++) { if (n) factorial *= n; assert.equal(m.fact(n), factorial); }
  assert.deepEqual(plain(result('(collect-range (i 1 0) (fail "unreachable"))')), []);
  assert.equal(result('(sum-range (i 0 2) (choose (= i 0) 1e16 (choose (= i 1) 1 -1e16)))'), 1);
});

test('range binding is lexical; bounds evaluate once in the outer scope', () => {
  const m = load(`(module Scope
    (let i 7) (let calls 0)
    (fn bound (x) (set calls (+ calls 1)) (return x))
    (let answer (sum-range (i (bound i) (bound (+ i 2)) (bound 1)) i))
    (let nested (sum-range (i 1 3) (sum-range (j 1 4) (* i j))))
    (let callbacks (collect-range (i 1 3) (lambda () i)))
    (fn sum (a b) (return (+ a b)))
    (export (record ("answer" answer) ("i" i) ("calls" calls) ("nested" nested)
      ("callbacks" callbacks) ("legacy" (sum 2 3)))))`);
  assert.equal(m.answer, 24); assert.equal(m.i, 7); assert.equal(m.calls, 3);
  assert.equal(m.nested, 60); assert.equal(m.legacy, 5);
  assert.deepEqual(plain(m.callbacks.map(f => f())), [1,2,3]);
  for (const source of ['(sum-range (k k 3) k)', '(+ (sum-range (k 1 3) k) k)'])
    assert.throws(() => result(source), /尚未宣告/);
});

test('sampling honors positive/negative steps and endpoints without cumulative drift', () => {
  assert.deepEqual(plain(result('(collect-range (t 0 0.3 0.1) t)')), [0,0.1,0.2,0.3]);
  assert.deepEqual(plain(result('(collect-range (t 3 0 -1) (array t (* t t)))')), [[3,9],[2,4],[1,1],[0,0]]);
  assert.deepEqual(plain(result('(collect-range (t 0 1 0.3) t)')), [0,0.3,0.6,0.8999999999999999]);
  assert.deepEqual(plain(result('(collect-range (t 2 2 -1) t)')), [2]);
  assert.deepEqual(plain(result('(collect-range (t 0 1 1e308) t)')), [0]);
  assert.deepEqual(plain(result('(collect-range (t 5e-324 0 1e308) t)')), []);
  assert.equal(result('(sum-range (k 10000 1 -1) k)'), 50005000);
});

test('invalid syntax, unknown names and numerical failures carry source locations', () => {
  for (const expr of ['(sum-range (k 1) k)', '(sum-range (2 1 3) 1)', '(sum-range (k 1 3) k 4)', '(assert-math true)'])
    assert.throws(() => result(expr), /第 1 行，第 \d+ 欄/);
  for (const [expr, pattern] of [
    ['(sum-range (k 0 1 0) k)', /步長/],
    ['(sum-range (k 0 10001) k)', /10000/],
    ['(collect-range (k 0 2048) k)', /2048/],
    ['(sum-range (k 0 1000001) k)', /端點/],
    ['(sum-range (k 0 1) (/ 1 k))', /有限實數/],
    ['(sum-range (k 0 1) "2")', /有限實數/],
    ['(sum-range (k 0 1) 1e308)', /溢位/],
    ['(product-range (k 1 4) 1e200)', /溢位/],
    ['(sum-range (k 1 1.0000000000000002 1e-17) k)', /浮點解析度/],
    ['(assert-math false "平方和")', /驗證失敗：平方和/],
    ['(assert-math (sqrt -1) "domain")', /有限實數/],
    ['(assert-math "yes" "type")', /布林/],
    ['(assert-math true 1)', /標籤/]
  ]) assert.throws(() => result(expr), e => /第 1 行，第 \d+ 欄：/.test(e.message) && pattern.test(e.message));
  assert.equal(result('(assert-math 1 "ok")'), true);
});

test('nested ranges share fuel, and a rejected computation does not poison the next call', () => {
  const m = load(`(module Fuel
    (fn expensive () (return (sum-range (i 1 10000) (sum-range (j 1 10000) j))))
    (fn small () (return (sum-range (i 1 10) i)))
    (export (record ("expensive" expensive) ("small" small))))`);
  assert.throws(() => m.expensive(), /步數/);
  assert.equal(m.small(), 55);
});

test('shipped examples execute and satisfy independent mathematical identities', () => {
  const read = name => fs.readFileSync(path.join(__dirname, '../compiler/examples', name+'.msw'), 'utf8');
  const series = load(read('series'));
  assert.equal(series.squares, 338350); assert.equal(series.nested, 60); assert.equal(series.grid.length, 9);
  const probability = load(read('probability'));
  assert.ok(Math.abs(probability.total-1) < 1e-12);
  assert.ok(Math.abs(probability.expected-4.8) < 1e-12);
  assert.ok(Math.abs(probability.distribution[0][1]-0.6**12) < 1e-12);
  const midpoint = load(read('integration'));
  for (const n of [1,2,10,100]) assert.ok(Math.abs(midpoint.estimate(n)-(1/3-1/(12*n*n))) < 1e-12);
});
