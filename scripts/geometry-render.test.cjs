'use strict';
const assert = require('node:assert/strict');
const R = require('../spatial/geometry-render.js');
let checks = 0;
const check = (ok, message) => { assert.ok(ok, message); checks++; };
const near = (a, b, message, epsilon = 1e-8) => check(Math.abs(a - b) <= epsilon, message);
const allPoints = scene => scene.triangles.flatMap(face => face.points);
const checkedScene = (objects, options) => {
  const scene = R.build(objects, options);
  check(scene.stats.warnings.length === 0, 'Valid objects produce no warnings: ' + JSON.stringify(scene.stats.warnings));
  for (const p of [...allPoints(scene), ...scene.segments.flatMap(s => [s.a, s.b]), ...scene.points.map(p => p.position)]) {
    check(p.length === 3 && p.every(Number.isFinite), 'All display coordinates are finite');
    check(p.every((v, k) => v >= scene.bounds[k * 2] - 1e-8 && v <= scene.bounds[k * 2 + 1] + 1e-8), 'All displayed geometry respects the box');
  }
  check(scene.stats.evaluations <= 300000, 'Mathematical evaluation budget is bounded');
  return scene;
};
const bounds = [-8, 8, -8, 8, -8, 10];
const sphere = checkedScene([{ type: 'sphere', id: 'S', label: 'S', center: [1, -2, 3], radius: 5 }], { bounds, resolution: 16 });
check(sphere.triangles.length === 2 * 32 * 15, 'Sphere triangulation includes both pole fans and every latitude band');
for (const p of allPoints(sphere)) near((p[0] - 1) ** 2 + (p[1] + 2) ** 2 + (p[2] - 3) ** 2, 25, 'Every sphere vertex is on the original equation');
const octants = new Set(allPoints(sphere).filter(p => p.every((v, k) => Math.abs(v - [1, -2, 3][k]) > 1e-8)).map(p => p.map((v, k) => v > [1, -2, 3][k] ? '+' : '-').join('')));
check(octants.size === 8, 'The complete sphere covers all eight octants');
check(allPoints(sphere).some(p => p[2] === -2) && allPoints(sphere).some(p => p[2] === 8), 'Both exact poles are present');
const vertexKey = p => p.map(v => v.toFixed(8)).join(',');
const edgeUse = new Map();
for (const { points } of sphere.triangles) for (let i = 0; i < 3; i++) { const edge = [vertexKey(points[i]), vertexKey(points[(i + 1) % 3])].sort().join('|'); edgeUse.set(edge, (edgeUse.get(edge) || 0) + 1); }
check([...edgeUse.values()].every(count => count === 2), 'Sphere mesh is closed without missing seams or pole holes');
for (const { points: [a, b, c] } of sphere.triangles) {
  const u = b.map((v, i) => v - a[i]), v = c.map((value, i) => value - a[i]), normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  check(normal.reduce((sum, value, i) => sum + value * (a[i] - [1, -2, 3][i]), 0) > 0, 'Every sphere triangle has consistent outward winding');
}
const vertical = checkedScene([{ type: 'plane', normal: [1, 0, 0], constant: 2, showNormal: false }], { bounds: [-4, 4, -3, 3, -2, 2] });
check(vertical.triangles.length === 2, 'Vertical plane spans a complete rectangle');
allPoints(vertical).forEach(p => near(p[0], 2, 'Vertical plane satisfies x=2'));
const oblique = checkedScene([{ type: 'plane', normal: [2, -1, 3], constant: 4, showNormal: false }], { bounds: [-4, 4, -4, 4, -4, 4] });
check(oblique.triangles.length >= 2, 'Oblique plane generates a polygon');
allPoints(oblique).forEach(([x, y, z]) => near(2 * x - y + 3 * z, 4, 'Clipped plane remains on its original equation'));
const tangentPlane = checkedScene([{ type: 'plane', normal: [1, 0, 0], constant: 4 }], { bounds: [-4, 4, -4, 4, -4, 4] });
check(tangentPlane.triangles.length === 2, 'A plane on a box face remains visible');
const line = checkedScene([{ type: 'line', point: [1, 2, 3], direction: [2, -1, 3] }], { bounds: [-5, 5, -5, 5, -5, 5] });
check(line.segments.length === 1, 'Infinite line is clipped to one finite segment');
for (const p of [line.segments[0].a, line.segments[0].b]) { near((p[0] - 1) / 2, -(p[1] - 2), 'Clipped point has a common line parameter'); near((p[0] - 1) / 2, (p[2] - 3) / 3, 'Clipped line z agrees with parameter'); }
check(R.build([{ type: 'line', point: [6, 0, 0], direction: [0, 1, 0] }], { bounds: [-5, 5, -5, 5, -5, 5] }).segments.length === 0, 'An outside parallel line stays outside');
const vector = checkedScene([{ type: 'vector', origin: [0, 0, 0], direction: [1, 2, 3], label: 'v' }], { bounds });
check(vector.segments.length === 5 && vector.points[0].position.join(',') === '1,2,3', 'Vector has its true endpoint and four arrow wings');
const circle = checkedScene([{ type: 'circle', center: [1, -2, 4], radius: Math.sqrt(24), normal: [0, 0, 1] }], { bounds });
check(circle.segments.length === 56, 'Sphere section produces a complete loop');
for (const { a, b } of circle.segments) for (const p of [a, b]) { near(p[2], 4, 'Section lies in horizontal plane'); near((p[0] - 1) ** 2 + (p[1] + 2) ** 2 + (p[2] - 3) ** 2, 25, 'Section endpoints remain on sphere'); }
const tiltedCircle = checkedScene([{ type: 'circle', center: [1, 0, -1], radius: 2, normal: [1, 2, 3] }], { bounds });
for (const { a } of tiltedCircle.segments) { near((a[0] - 1) + 2 * a[1] + 3 * (a[2] + 1), 0, 'Tilted circle lies in its plane'); near(Math.hypot(a[0] - 1, a[1], a[2] + 1), 2, 'Tilted circle preserves its radius'); }
const cylinder = checkedScene([{ type: 'cylinder', center: [1, -1, 0], radius: 2 }], { bounds: [-4, 4, -4, 4, -3, 3], resolution: 12 });
allPoints(cylinder).forEach(([x, y]) => near((x - 1) ** 2 + (y + 1) ** 2, 4, 'Cylinder vertices satisfy its implicit equation'));
const cone = checkedScene([{ type: 'cone', vertex: [0, 0, 0], slope: 1 }], { bounds: [-4, 4, -4, 4, -3, 3], resolution: 12 });
allPoints(cone).forEach(([x, y, z]) => near(x * x + y * y, z * z, 'Cone vertices satisfy both branches'));
check(allPoints(cone).some(p => p[2] < 0) && allPoints(cone).some(p => p[2] > 0), 'Double cone includes both nappes');
const sideCylinder = checkedScene([{ type: 'cylinder', center: [0, 1, -1], radius: 2, axis: 'x' }], { bounds: [-3, 3, -4, 4, -4, 4], resolution: 8 });
allPoints(sideCylinder).forEach(([, y, z]) => near((y - 1) ** 2 + (z + 1) ** 2, 4, 'Horizontal cylinder honors its x axis'));
const helix = checkedScene([{ type: 'parametric', expressions: ['cos(t)', 'sin(t)', 't'], domain: [0, Math.PI * 2] }], { bounds });
check(helix.segments.length > 200, 'Parametric helix has a continuous 3D path');
for (const { a } of helix.segments) { near(a[0] ** 2 + a[1] ** 2, 1, 'Helix vertices stay on the cylinder'); near(a[0], Math.cos(a[2]), 'Helix parameter is linked to height'); }
const parametricCone = checkedScene([{ type: 'parametricSurface', expressions: ['u cos(v)', 'u sin(v)', 'u'], domains: [[-2, 2], [0, 2 * Math.PI]] }], { bounds: [-3, 3, -3, 3, -3, 3], resolution: 20 });
check(parametricCone.triangles.length > 1000, 'Two independent parameters create a complete surface mesh');
for (const [x, y, z] of allPoints(parametricCone)) near(x * x + y * y, z * z, 'Parametric cone vertices satisfy the original geometric equation');
check(allPoints(parametricCone).some(p => p[2] < 0) && allPoints(parametricCone).some(p => p[2] > 0), 'Signed u covers both cone nappes');
const parametricHole = checkedScene([{ type: 'parametricSurface', expressions: ['u', 'v', 'sqrt(u)'], domains: [[-2, 2], [-2, 2]] }], { bounds: [-3, 3, -3, 3, -3, 3], resolution: 20 });
check(parametricHole.stats.skipped > 0 && parametricHole.triangles.length > 0, 'Parametric real-domain holes retain valid patches');
check(allPoints(parametricHole).every(p => p[0] >= 0), 'No parametric patch crosses an undefined domain');
const parametricPole = R.build([{ type: 'parametricSurface', expressions: ['u', 'v', '1/(u-.137)'], domains: [[-2, 2], [-2, 2]] }], { bounds: [-2, 2, -2, 2, -8, 8], resolution: 40 });
check(parametricPole.stats.skipped > 0 && parametricPole.triangles.every(face => { const xs = face.points.map(p => p[0]); return Math.max(...xs) < .137 || Math.min(...xs) > .137; }), 'Parametric poles retain gaps without invented sheets');
const uvProduct = checkedScene([{ type: 'parametricSurface', expressions: ['u', 'v', 'uv'], domains: [[-1, 1], [-1, 1]] }], { bounds: [-2, 2, -2, 2, -2, 2], resolution: 8 });
allPoints(uvProduct).forEach(([x, y, z]) => near(z, x * y, 'Implicit parameter multiplication is preserved'));
const functionsUV = checkedScene([{ type: 'parametricSurface', expressions: ['u', 'v', 'sqrt(u)+round(v)'], domains: [[1, 2], [0, .2]] }], { bounds: [-3, 3, -3, 3, -3, 3], resolution: 8 });
allPoints(functionsUV).forEach(([x, y, z]) => near(z, Math.sqrt(x) + Math.round(y), 'Function names containing u survive parameter mapping'));
for (const expression of ['x', 'y', 't', 'globalThis.alert(1)', 'u.constructor', 'sqrt(']) check(R.build([{ type: 'parametricSurface', expressions: ['u', 'v', expression], domains: [[-1, 1], [-1, 1]] }], { bounds }).stats.warnings.length === 1, 'Parametric surfaces reject unsupported identifiers and unsafe input');
const cappedParameters = R.build([{ type: 'parametricSurface', expressions: ['u', 'v', '0'], domains: [[-1, 1], [-1, 1]] }], { bounds, resolution: 100000 });
check(cappedParameters.triangles.length === 40 * 40 * 4 && cappedParameters.stats.evaluations < 30000, 'Parametric surface resolution and computation remain bounded');
const surface = checkedScene([{ type: 'surface', expression: 'x^2-y^2' }], { bounds: [-2, 2, -2, 2, -5, 5], resolution: 12 });
allPoints(surface).forEach(([x, y, z]) => near(z, x * x - y * y, 'Explicit surface stays on its original formula'));
const hole = checkedScene([{ type: 'surface', expression: 'sqrt(x)' }], { bounds: [-2, 2, -2, 2, -4, 4], resolution: 12 });
check(hole.stats.skipped > 0 && hole.triangles.length > 0, 'Partial real domain keeps visible patches and gaps');
check(allPoints(hole).every(p => p[0] >= 0), 'No surface enters an undefined square root domain');
const pole = R.build([{ type: 'surface', expression: '1/(x-.137)' }], { bounds: [-2, 2, -2, 2, -8, 8], resolution: 48 });
check(pole.stats.skipped > 0 && pole.triangles.every(face => { const xs = face.points.map(p => p[0]); return Math.max(...xs) < .137 || Math.min(...xs) > .137; }), 'Explicit poles never become a vertical sheet');
const tetra = checkedScene([{ type: 'polyhedron', points: [[0, 0, 0], [2, 0, 0], [0, 3, 0], [0, 0, 4]] }], { bounds });
check(tetra.triangles.length === 4 && tetra.segments.length === 12, 'Tetrahedron includes all four faces and their edges');
const revolution = checkedScene([{ type: 'revolution', expression: 'sqrt(x)', domain: [0, 4], axis: 'x' }], { bounds: [-1, 5, -3, 3, -3, 3], resolution: 16 });
check(revolution.triangles.length > 900, 'Rotation generates sides and end disks');
for (const [x, y, z] of allPoints(revolution)) if (x > 1e-10 && x < 4 - 1e-10) near(y * y + z * z, x, 'Revolution exterior is the original radius curve');
const washer = checkedScene([{ type: 'revolution', expression: '2', innerExpression: '1', domain: [0, 3], axis: 'y' }], { bounds: [-3, 3, -1, 4, -3, 3], resolution: 12 });
check(allPoints(washer).every(([x, y, z]) => y === 0 || y === 3 || Math.abs(x * x + z * z - 1) < 1e-8 || Math.abs(x * x + z * z - 4) < 1e-8), 'Washer sides preserve both inner and outer radii');
const invalidRadii = R.build([{ type: 'revolution', expression: '1', innerExpression: '2', domain: [0, 3] }], { bounds });
check(invalidRadii.triangles.length === 0 && invalidRadii.stats.skipped > 0, 'Invalid inner radius never fabricates a solid');
const ellipsoid = checkedScene([{ type: 'implicit', expression: 'x^2+2y^2+3z^2=4' }], { bounds: [-3, 3, -3, 3, -3, 3], resolution: 18 });
check(ellipsoid.triangles.length > 600, 'Generic implicit extraction finds a complete 3D level set');
for (const [x, y, z] of allPoints(ellipsoid)) near(x * x + 2 * y * y + 3 * z * z, 4, 'Implicit vertices approximate the true level set', .008);
const implicitPole = R.build([{ type: 'implicit', expression: '1/(x-.137)=0' }], { bounds: [-2, 2, -2, 2, -2, 2], resolution: 12 });
check(implicitPole.triangles.length === 0 && implicitPole.stats.skipped > 0, 'Implicit pole with no zero never becomes a fake isosurface');
for (const expression of ['globalThis.process.exit()', 'x.constructor', 'x[0]', '<script>', 'sin(', 'a+x']) check(R.build([{ type: 'implicit', expression }], { bounds }).stats.warnings.length === 1, 'Unsafe or unknown formulas produce one controlled warning');
const fit = R.fit([{ type: 'sphere', center: [1, -2, 3], radius: 5 }]);
for (const p of [[-4, -2, 3], [6, -2, 3], [1, -7, 3], [1, 3, 3], [1, -2, -2], [1, -2, 8]]) check(p.every((v, k) => v > fit.bounds[k * 2] && v < fit.bounds[k * 2 + 1]), 'Auto fit contains all sphere extrema with margin');
check(fit.extent > 0 && fit.domain.length === 4 && Number.isFinite(fit.centerZ), 'Fit works with isotropic existing projection');
const largeFit = R.fit([{ type: 'point', position: [10000, -10000, 10000] }]);
check([10000, -10000, 10000].every((v, k) => v >= largeFit.bounds[k * 2] && v <= largeFit.bounds[k * 2 + 1]), 'Fit retains the full coordinate range accepted by geometry validation');
const restrictedFit = R.fit([{ type: 'implicit', expression: 'x^2+y^2+(z-80)^2-4', domain: [-3, 3, -3, 3, 76, 84] }]);
check(restrictedFit.bounds[5] > 84, 'Implicit fit honors the declared sampling domain');
assert.throws(() => R.build([], { bounds: [0, 0, -1, 1, -1, 1] })); checks++;
assert.throws(() => R.build(Array(65).fill({ type: 'point', position: [0, 0, 0] }))); checks++;
console.log(`Spatial geometry rendering: ${checks} checks passed.`);
