'use strict';
const assert = require('node:assert/strict');
const S = require('../spatial/core.js');
let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const near = (a, b, message) => check(Math.abs(a - b) < 1e-9, message);
const rejects = (fn, message) => { assert.throws(fn, undefined, message); checks++; };
const base = S.clone(S.DEFAULT);
near(S.compile('(x^2-y^2)/4')(3, 1), 2, 'Saddle value is analytical');
near(S.compile('z = sin(x)*cos(y)')(Math.PI / 2, 0), 1, 'Optional z prefix and both variables');
near(S.compile('3exp(-(x^2+y^2)/3)')(0, 0), 3, 'Implicit multiplication and Gaussian peak');
for (const input of ['a+x', 't+y', 'window.alert(1)', 'x.constructor', 'x[0]', 'sqrt(', '', 'x'.repeat(481)]) rejects(() => S.compile(input), 'Reject unsafe or invalid expression');
for (const patch of [
  { domain: [0, 0, -1, 1] }, { domain: [0, .01, 0, 1] }, { domain: [-101, 1, 0, 1] }, { domain: [0, Infinity, 0, 1] }, { domain: ['0', 1, 0, 1] },
  { height: 0 }, { height: Infinity }, { height: 101 }, { camera: { yaw: 0, pitch: 2, zoom: 1 } }, { camera: { yaw: 0, pitch: 0, zoom: 4 } },
  { camera: { yaw: NaN, pitch: 0, zoom: 1 } }, { mode: 'arbitrary' }, { expression: '<script>' }
]) rejects(() => S.validate({ ...base, ...patch }), 'Reject invalid shared or stored state');
rejects(() => S.validate(null), 'Null state rejected');
const isolated = S.validate({ ...base, arbitrary: true }); isolated.domain[0] = -20;
check(base.domain[0] === -4 && !('arbitrary' in isolated), 'Validated state is a whitelisted independent object');
const plane = S.sample({ ...base, expression: 'x+2y', height: 30 }, 12);
check(plane.faces.length === 12 * 12 * 4 && plane.skipped === 0, 'Linear plane has complete triangulation');
plane.points.filter(Boolean).forEach(p => near(p[2], p[0] + 2 * p[1], 'Every generated point lies on analytical plane'));
for (const preset of S.PRESETS) {
  const state = { ...base, ...preset }, mesh = S.sample(state, 24);
  check(mesh.faces.length > 300, `${preset.name} has renderable surface`);
  check(mesh.evaluations <= (25 ** 2 + 24 ** 2 * 5), `${preset.name} has bounded evaluation cost`);
  for (const face of mesh.faces) for (const index of face) {
    const point = mesh.points[index]; check(point && point.every(Number.isFinite) && Math.abs(point[2]) <= state.height, 'Every triangle has finite in-range points');
  }
}
const hole = S.sample({ ...base, expression: 'sqrt(x)', height: 5 }, 16);
check(hole.skipped > 0 && hole.faces.length > 0, 'Partial real domain keeps gaps and valid surface');
check(hole.faces.every(face => face.every(i => hole.points[i][0] >= 0)), 'No face crosses into undefined sqrt domain');
const pole = .137, discontinuous = S.sample({ ...base, expression: `1/(x-${pole})`, height: 8 }, 48);
check(discontinuous.skipped > 0 && discontinuous.faces.length > 0, 'Off-grid pole omits discontinuous cells');
check(discontinuous.faces.every(face => { const xs = face.map(i => discontinuous.points[i][0]); return Math.max(...xs) < pole || Math.min(...xs) > pole; }), 'No triangle joins opposite sides of an off-grid pole');
const empty = S.sample({ ...base, expression: 'sqrt(-1)' }, 16);
check(empty.faces.length === 0 && empty.min === null && empty.max === null, 'Entirely undefined surface stays empty');
const upper = S.sample(base, 100000), lower = S.sample(base, -10);
check(upper.resolution === 72 && lower.resolution === 8, 'Resolution is bounded');
const origin = S.project([0, 0, 0], base.camera, base.domain, 800, 600);
near(origin[0], 400, 'Origin horizontally centered'); near(origin[1], 312, 'Origin vertically located');
const topCamera = { yaw: 0, pitch: Math.PI / 2, zoom: 1 };
const topLow = S.project([1, 2, 0], topCamera, base.domain, 800, 600), topHigh = S.project([1, 2, 5], topCamera, base.domain, 800, 600);
near(topLow[0], topHigh[0], 'Top view x independent of height'); near(topLow[1], topHigh[1], 'Top view y independent of height');
check(topHigh[2] > topLow[2], 'Top view retains depth for painter ordering');
const normal = S.project([1, 0, 0], base.camera, base.domain, 800, 600), zoomed = S.project([1, 0, 0], { ...base.camera, zoom: 2 }, base.domain, 800, 600);
near(zoomed[0] - 400, 2 * (normal[0] - 400), 'Orthographic zoom scales displacement');
console.log(`Spatial mathematics: ${checks} checks passed.`);
