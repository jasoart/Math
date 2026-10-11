'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const MathCanvas = require('../engine/canvas.js');
const modules = require('../studio-modules.js')();
function casesFor(module) {
  const defaults = Object.fromEntries(module.controls.map(control => [control.key, control.value]));
  const cases = [{name: 'default', state: defaults}];
  for (const control of module.controls) for (const side of ['min', 'max']) cases.push({name: `${control.key}:${side}`, state: {...defaults, [control.key]: control[side]}});
  for (const side of ['min', 'max']) cases.push({name: `all:${side}`, state: Object.fromEntries(module.controls.map(control => [control.key, control[side]]))});
  let seed = 1729;
  const random = () => ((seed = Math.imul(seed, 1664525) + 1013904223 >>> 0) / 2 ** 32);
  for (let index = 0; index < 5; index++) cases.push({name: `interior:${index}`, state: Object.fromEntries(module.controls.map(control => {
    const value = control.min + random() * (control.max - control.min);
    return [control.key, control.integer ? Math.round(value) : value];
  }))});
  return cases;
}
if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify({fixtures: modules.flatMap(module => casesFor(module).map(({name, state}) => {
    const computed = module.compute(state), scene = computed.scene;
    const samples = (scene.curves || []).length ? Array.from({length: 9}, (_, index) => {
      const x = scene.x[0] + (scene.x[1] - scene.x[0]) * (.037 + .113 * index);
      return {x, values: scene.curves.map(curve => curve.f(x))};
    }) : [];
    return {id: module.id, name, state, results: computed.results, samples};
  }))}));
} else {
  let checks = 0, scenes = 0, draws = 0, commands = 0;
  function check(value, message) {assert.ok(value, message); checks++;}
  function finiteData(value, label) {
    if (typeof value === 'number') check(Number.isFinite(value), `${label}: finite number`);
    else if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) finiteData(item, label + '.' + key);
  }
  const numericMethods = new Set(['moveTo', 'lineTo', 'rect', 'strokeRect', 'fillRect', 'roundRect', 'arc', 'ellipse']);
  const context = new Proxy({font: '', measureText: text => ({width: String(text).length * 7})}, {
    get(object, key) {return object[key] ?? ((...args) => {commands++; if (numericMethods.has(key)) for (const number of args) if (typeof number === 'number') check(Number.isFinite(number), `${key}: finite canvas command`); if (key === 'arc') check(args[2] >= 0, 'nonnegative circle radius');});},
    set(object, key, value) {object[key] = value; return true;}
  });
  let width = 360, height = 440;
  const sandbox = {window: {MathCanvas}, ctx: context, canvas: {getBoundingClientRect: () => ({width, height})}, activeCanvasFrame: null};
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../expansion-modules.js'), 'utf8'), sandbox);
  sandbox.window.createExpansionModules();
  global.MathScene = sandbox.window.MathScene;
  check(modules.length === 48, '48 distinct studio modules');
  check(modules.reduce((total, module) => total + module.controls.length, 0) === 123, '123 independently editable studio controls');
  check(new Set(modules.map(module => module.id)).size === 48, 'stable module IDs are unique');
  const legacyIDs = new Set(['circle-line', 'parabola', 'rational-sign-chart']);
  for (const module of modules) {
    check(!legacyIDs.has(module.id) && module.id.startsWith('studio-'), `${module.id}: independent catalog namespace`);
    for (const name of ['short', 'title', 'tag', 'examSignal', 'prompt', 'trap', 'challenge']) check(typeof module[name] === 'string' && module[name].length > 1, `${module.id}: ${name} present`);
    for (const control of module.controls) check(control.min <= control.value && control.value <= control.max && control.max > control.min && (!control.integer || Number.isInteger(control.value)), `${module.id}: valid default control`);
    for (const {name, state} of casesFor(module)) {
      const before = JSON.stringify(state), computed = module.compute(state), scene = computed.scene;
      check(JSON.stringify(state) === before, `${module.id}: compute preserves inputs`);
      finiteData(computed.results, `${module.id}/${name}/results`);
      finiteData(scene, `${module.id}/${name}/scene`);
      check(scene.x.length === 2 && scene.x[0] < scene.x[1] && scene.y.length === 2 && scene.y[0] < scene.y[1], `${module.id}: nonempty chart bounds`);
      check(module.formula(state, computed).every(line => typeof line === 'string' && !/NaN|undefined|Infinity/.test(line)), `${module.id}: readable formulas`);
      check(typeof module.status(state, computed) === 'string' && module.status(state, computed).length > 0, `${module.id}: readable live status`);
      for (const curve of scene.curves || []) {
        check(typeof curve.f === 'function', `${module.id}: curve evaluator`);
        let finiteSamples = 0;
        for (let i = 0; i <= 30; i++) {
          const value = curve.f(scene.x[0] + (scene.x[1] - scene.x[0]) * i / 30);
          check(typeof value === 'number' && (Number.isFinite(value) || Number.isNaN(value)), `${module.id}: finite curve or explicit undefined domain`);
          if (Number.isFinite(value)) finiteSamples++;
        }
        check(finiteSamples > 0, `${module.id}: visible curve domain`);
      }
      scenes++;
      if (name === 'default' || name === 'all:min' || name === 'all:max') for (const viewport of [360, 1100]) {
        width = viewport; height = viewport === 360 ? 440 : 700;
        sandbox.activeCanvasFrame = MathCanvas.createFrame(context, {width, height});
        module.draw(state, computed);
        const report = sandbox.activeCanvasFrame.flushLabels();
        check(report.grids > 0, `${module.id}: uses shared scene grid`);
        check(report.labels.every(label => label.x >= 0 && label.y >= 0 && label.x + label.width <= width && label.y + label.height <= height), `${module.id}: labels fit`);
        draws++;
      }
    }
  }
  delete global.MathScene;
  console.log(`Studio modules: ${modules.length} models, ${scenes} states, ${draws} scene renders, ${commands} canvas commands, ${checks} checks passed.`);
}
