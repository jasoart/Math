'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
let drawCommands = 0, width = 1100, height = 720;
const numericMethods = new Set(['moveTo', 'lineTo', 'rect', 'strokeRect', 'fillRect', 'arc', 'ellipse']);
const context = new Proxy({measureText: s => ({width: String(s).length * 7})}, {
  get(object, key) {
    return object[key] ?? ((...args) => {
      drawCommands++;
      if (numericMethods.has(key)) for (const value of args) {
        if (typeof value === 'number') assert.ok(Number.isFinite(value), `${key} received ${value}`);
      }
      if (key === 'arc') assert.ok(args[2] >= 0, 'negative radius');
      if (key === 'ellipse') assert.ok(args[2] >= 0 && args[3] >= 0, 'negative ellipse radius');
    });
  },
  set(object, key, value) {object[key] = value; return true;}
});
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(root, 'expansion-modules.js'), 'utf8'), {window, ctx: context, canvas: {getBoundingClientRect: () => ({width, height})}});
const modules = window.createExpansionModules(), byId = new Map(modules.map(m => [m.id, m]));
assert.equal(modules.length, 50);
assert.equal(byId.size, 50);
const plain = object => JSON.parse(JSON.stringify(object));
const defaults = m => Object.fromEntries(m.controls.map(c => [c.key, c.value]));
let comparisons = 0;
function compare(actual, expected, label) {
  if (typeof expected === 'number') {
    assert.ok(Number.isFinite(actual), `${label} is not finite`);
    assert.ok(Math.abs(actual - expected) <= 1e-9 * Math.max(1, Math.abs(expected)), `${label}: ${actual} != ${expected}`);
    comparisons++;
  } else if (expected && typeof expected === 'object') {
    if (Array.isArray(expected)) assert.equal(actual.length, expected.length, label + ' length');
    for (const key of Object.keys(expected)) compare(actual[key], expected[key], label + '.' + key);
  } else {assert.equal(actual, expected, label); comparisons++;}
}
const reference = JSON.parse(execFileSync('python3', [path.join(__dirname, 'check-expansion-math.py'), '--json'], {encoding: 'utf8', maxBuffer: 4 * 1024 * 1024}));
for (const fixture of reference.fixtures) {
  const m = byId.get(fixture.id);
  const result = m.compute({...defaults(m), ...fixture.state});
  compare(result, fixture.expected, fixture.id);
}
let seed = 23050;
const random = () => ((seed = Math.imul(seed, 1664525) + 1013904223 >>> 0) / 2**32);
let renders = 0;
function finiteData(value, label) {
  if (typeof value === 'number') assert.ok(Number.isFinite(value), label + ' contains nonfinite data');
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) finiteData(v, label + '.' + k);
}
for (const m of modules) {
  for (const field of ['examSignal', 'prompt', 'trap', 'challenge', 'challengeAnswer']) assert.ok(m[field]?.length > 10, `${m.id}/${field}`);
  assert.ok(['common', 'A', 'advanced', 'enrichment'].includes(m.course));
  const d = defaults(m), cases = [d];
  for (const c of m.controls) for (const value of c.type === 'select' ? c.options.map(o => o.value) : [c.min, c.max]) cases.push({...d, [c.key]: value});
  for (let i = 0; i < 16; i++) cases.push(Object.fromEntries(m.controls.map(c => [c.key, c.type === 'select' ? c.options[Math.floor(random() * c.options.length)].value : c.integer ? c.min + Math.floor(random() * (c.max - c.min + 1)) : c.min + random() * (c.max - c.min)])));
  for (const state of cases) {
    const result = m.compute(state);
    finiteData(result, m.id);
    const formulas = m.formula(state, result), status = m.status(state, result);
    assert.ok(formulas.length && status.length);
    assert.ok(!/NaN|undefined|Infinity/.test(formulas.join(' ') + status), m.id);
    assert.ok(result.scene.x[1] > result.scene.x[0] && result.scene.y[1] > result.scene.y[0], m.id + ' invalid plot bounds');
    m.draw(state, result);
    renders++;
  }
  // Narrow-canvas drawing checks numeric commands; these are not browser layout tests.
  width = 360; height = 420;
  const result = m.compute(d); m.draw(d, result); renders++;
  width = 1100; height = 720;
}
// Source expressions must not be rounded to the slider's display step.
const exact = require('../graph/exact.js');
compare(byId.get('triangle-included-area').compute({a: exact.scalar('√2').value, b: exact.scalar('π').value, C: 90}), {area: Math.PI / Math.sqrt(2)}, 'symbolic triangle');
process.stdout.write(`PASS expansion: ${reference.fixtures.length} Python fixtures, ${comparisons} reference comparisons, ${renders} boundary/random/narrow-canvas renders (${drawCommands} canvas commands)\n`);
