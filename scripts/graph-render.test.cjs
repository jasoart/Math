'use strict';
const assert = require('node:assert/strict');
const R = require('../graph/render.js');
let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const close = (actual, expected, tolerance = 1e-7) => check(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const view = { xmin: -5, xmax: 5, ymin: -3, ymax: 3, width: 800, height: 480 };
function bounded(result, viewport = view) {
  check(result.segments.flat().every(([x, y]) => Number.isFinite(x) && Number.isFinite(y) && x >= viewport.xmin - 1e-8 && x <= viewport.xmax + 1e-8 && y >= viewport.ymin - 1e-8 && y <= viewport.ymax + 1e-8), 'All emitted vertices are finite and clipped to the viewport.');
}
function noPoleBridge(result, poles) {
  for (const points of result.segments) for (let i = 1; i < points.length; i++) for (const pole of poles) check(!((points[i - 1][0] < pole && points[i][0] > pole) || (points[i - 1][0] > pole && points[i][0] < pole)), 'A line must not bridge an asymptote.');
}
close(R.worldToScreen([0, 0], view)[0], 400);
close(R.worldToScreen([0, 0], view)[1], 240);
assert.deepEqual(R.screenToWorld(R.worldToScreen([2, -1], view), view), [2, -1]); checks++;
assert.throws(() => R.sampleFunction(x => x, { ...view, xmax: view.xmin }), RangeError); checks++;

const line = R.sampleFunction(x => x, view);
check(line.segments.length === 1 && !line.stats.budgetExhausted, 'A straight line has one continuous path.'); bounded(line);
for (const [x, y] of line.segments[0]) close(y, x);
const pole = .1234567;
for (const fn of [x => 1 / (x - pole), x => 1 + 1 / (x - pole), x => x < pole ? 1 : 1.1]) {
  const result = R.sampleFunction(fn, view);
  check(result.segments.length >= 2, 'A reciprocal curve is split into separate branches.');
  check(result.stats.rejected > 0, 'Unresolved pole intervals are rejected.'); bounded(result); noPoleBridge(result, [pole]);
}
const tan = R.sampleFunction(Math.tan, view, { quality: 'precise' });
noPoleBridge(tan, [-Math.PI * 1.5, -Math.PI / 2, Math.PI / 2, Math.PI * 1.5]); bounded(tan);
const nonfinite = R.sampleFunction(x => x < 0 ? NaN : Math.sqrt(x), view);
check(nonfinite.segments.flat().every(([x]) => x >= 0), 'A partially undefined curve does not emit invalid branches.'); bounded(nonfinite);
const throwing = R.sampleFunction(() => { throw new Error('outside domain'); }, view);
check(throwing.segments.length === 0, 'Evaluator exceptions are treated as undefined samples.');
for (const [fn, origin] of [[x => x ** 3, [0, 0]], [Math.cbrt, [0, 0]], [Math.sqrt, [0, 0]], [Math.exp, [0, 1]], [Math.sin, [0, 0]], [x => x ** 12, [0, 0]]]) {
  const smooth = R.sampleFunction(fn, view);
  check(smooth.segments.length === 1, 'Smooth functions retain a continuous visible path through limiting endpoints and extrema.');
  check(smooth.segments[0].some(([x, y]) => Math.abs(x - origin[0]) < 1e-8 && Math.abs(y - origin[1]) < 1e-8), 'Continuous sample vertices at the origin are retained.');
  bounded(smooth);
}

const circle = R.sampleParametric(t => [2 * Math.cos(t), 2 * Math.sin(t)], 0, Math.PI * 2, view);
check(circle.segments.length === 1, 'The parametric circle is continuous.'); bounded(circle);
for (const [x, y] of circle.segments[0]) close(x * x + y * y, 4);
close(circle.segments[0][0][0], circle.segments[0].at(-1)[0]);
close(circle.segments[0][0][1], circle.segments[0].at(-1)[1]);
const polar = R.samplePolar(() => 2, 0, Math.PI * 2, view);
assert.deepEqual(polar.segments, circle.segments); checks++;
const aliasView = { xmin: 0, xmax: 1, ymin: -1.2, ymax: 1.2, width: 100, height: 100 };
// The whole interval and each half have zero endpoints, midpoint and quarters.
const oscillation = R.sampleFunction(x => Math.sin(16 * Math.PI * x), aliasView, { seedPixelStep: 100, maxDepth: 12 });
check(Math.max(...oscillation.segments.flat().map(p => p[1])) > .95 && Math.min(...oscillation.segments.flat().map(p => p[1])) < -.95, 'Interior probes recover oscillations hidden by regular endpoint/midpoint samples.');
check(oscillation.stats.subdivisions > 0, 'Oscillation discovery triggers adaptive refinement.'); bounded(oscillation, aliasView);
let evaluations = 0;
const limited = R.sampleFunction(x => { evaluations++; return Math.sin(1e5 * x); }, view, { maxEvaluations: 37 });
check(evaluations <= 37 && limited.stats.evaluations === evaluations && limited.stats.budgetExhausted, 'Sampling respects the strict evaluation budget.'); bounded(limited);

const implicitCircle = R.contourImplicit((x, y) => x * x + y * y - 4, view);
check(implicitCircle.segments.length > 40, 'An implicit circle has a visible contour.'); bounded(implicitCircle);
for (const [x, y] of implicitCircle.segments.flat()) close(x * x + y * y, 4, 1e-4);
const zero = R.contourImplicit(() => 0, view);
check(zero.stats.allZero && zero.segments.length === 0, 'The identically zero field is not rendered as a grid.');
check(R.contourImplicit(() => 3, view).segments.length === 0, 'A nonzero constant has no contour.');
for (const fn of [x => x * x, x => Math.abs(x)]) {
  const exactZeros = R.contourImplicit(fn, view);
  check(exactZeros.segments.length === 48 && exactZeros.stats.zeroEdges === 48, 'An exact zero grid column remains a contour in a nonnegative field.');
  check(exactZeros.segments.flat().every(([x]) => x === 0), 'Exact zero contours remain at their sampled zero locus.');
}
const alignedAxes = R.contourImplicit((x, y) => x * y, view);
check(alignedAxes.segments.length === 128, 'Each grid-aligned saddle axis is emitted exactly once.');
check(alignedAxes.segments.every(segment => segment.every(([x]) => x === 0) || segment.every(([, y]) => y === 0)), 'Exact zero edge chains do not introduce diagonal saddle shortcuts.');
for (const fn of [(x, y) => 1 / (x - pole), (x, y) => 1e-15 / (x - pole), (x, y) => x < pole ? -1 : 1]) {
  const result = R.contourImplicit(fn, view);
  check(result.segments.length === 0 && result.stats.rejected > 0, 'Sign flips at poles and jumps are not mistaken for zeros.');
}
const oneCell = { xmin: 0, xmax: 1, ymin: 0, ymax: 1, width: 100, height: 100 };
const isolatedEndpoints = R.contourImplicit((x, y) => (x * (x - 1)) ** 2 + y * y, oneCell, { cellPixels: 200 });
check(isolatedEndpoints.segments.length === 0 && isolatedEndpoints.stats.rejected > 0, 'Two zero vertices do not invent a zero edge when interior probes have nonzero residuals.');
const saddle = R.contourImplicit((x, y) => (x - .5) * (y - .5), oneCell, { cellPixels: 200 });
check(saddle.stats.ambiguous === 1 && saddle.segments.length === 4, 'A true bilinear saddle connects four rays at its zero saddle point.');
check(saddle.segments.every(segment => segment.some(([x, y]) => Math.abs(x - .5) < 1e-8 && Math.abs(y - .5) < 1e-8)), 'All saddle rays meet at the saddle.');
// Corner mean is positive but determinant is negative: center-only lookup is wrong.
const field = (x, y) => (1 - x) * y * 10 - x * y * 5 + x * (1 - y) - (1 - x) * (1 - y) * 5;
const ambiguity = R.contourImplicit(field, oneCell, { cellPixels: 200 });
check(ambiguity.stats.ambiguous === 1 && ambiguity.segments.length === 2, 'The ambiguous cell has two refined contour segments.');
check(ambiguity.segments.some(segment => segment.some(p => p[1] === 1) && segment.some(p => p[0] === 0)), 'Asymptotic determinant pairs the top and left edges.');
let implicitCalls = 0;
const boundedContour = R.contourImplicit((x, y) => { implicitCalls++; return Math.sin(500 * x) + Math.cos(500 * y); }, { ...view, width: 1e6, height: 1e6 }, { maxEvaluations: 300 });
check(implicitCalls <= 300 && implicitCalls === boundedContour.stats.evaluations, 'Implicit grid and refinement share a strict evaluation budget.');
check((boundedContour.stats.columns + 1) * (boundedContour.stats.rows + 1) <= 150, 'Large viewports cannot cause unbounded grid allocation.');

const labelView = { width: 320, height: 200 };
const labelItems = [
  { id: 'important', text: '(0,0)', anchor: [160, 100], width: 64, height: 22, priority: 10 },
  { id: 'b', text: 'B', anchor: [162, 101], width: 64, height: 22, priority: 1 },
  { id: 'c', text: 'C', anchor: [164, 102], width: 64, height: 22, priority: 1 },
  { id: 'edge', text: 'edge', anchor: [3, 3], width: 64, height: 22, priority: 3 },
  { id: 'outside', anchor: [-100, 40], width: 64, height: 22 },
  { id: 'too-wide', anchor: [100, 80], width: 400, height: 22 }
];
const obstacles = [{ x: 120, y: 65, width: 80, height: 16 }, { x: 160, y: 100, radius: 5 }, { x1: 0, y1: 140, x2: 320, y2: 140, radius: 1 }];
const layout = R.placeLabels(labelItems, labelView, { obstacles });
assert.deepEqual(layout, R.placeLabels(labelItems, labelView, { obstacles })); checks++;
check(layout.labels[0].id === 'important', 'Higher priority labels are placed first.');
check(layout.stats.suppressed >= 2, 'Offscreen and oversized labels are suppressed.');
check(layout.labels.every(box => box.x >= 5 && box.y >= 5 && box.x + box.width <= 315 && box.y + box.height <= 195), 'Every label box remains inside viewport padding.');
for (let i = 0; i < layout.labels.length; i++) for (let j = i + 1; j < layout.labels.length; j++) {
  const a = layout.labels[i], b = layout.labels[j];
  check(a.x + a.width + 4 <= b.x || b.x + b.width + 4 <= a.x || a.y + a.height + 4 <= b.y || b.y + b.height + 4 <= a.y, 'Label boxes do not collide.');
}
check(layout.labels.every(box => box.y + box.height <= 136 || box.y >= 144), 'Curve segment obstacles reserve clearance.');
const leaders = R.placeLabels([{ id: 'leader', anchor: [160, 100], width: 80, height: 20 }], labelView, { obstacles: [{ x: 150, y: 55, width: 165, height: 40 }, { x: 5, y: 55, width: 145, height: 40 }, { x: 150, y: 105, width: 165, height: 40 }, { x: 5, y: 105, width: 145, height: 40 }] });
check(leaders.labels.length === 1 && leaders.labels[0].leader && leaders.labels[0].leader[0][0] === 160, 'A label moved away from nearby obstacles receives an anchor leader.');
const leaderCollision = R.placeLabels([
  { id: 'A', anchor: [200, 150], width: 100, height: 25, priority: 10 },
  { id: 'B', anchor: [125, 155], width: 70, height: 25, priority: 5 }
], { width: 400, height: 300 }, { gap: 4, padding: 8, obstacles: [{ x: 194, y: 144, width: 12, height: 12 }, { x: 119, y: 149, width: 12, height: 12 }] });
check(leaderCollision.labels.length === 2 && leaderCollision.labels[0].leader, 'The leader collision regression retains both labels.');
const firstLeader = leaderCollision.labels[0].leader, laterBox = leaderCollision.labels[1];
// Reserve the leader stroke too: test interior samples against a one-pixel inset.
check(Array.from({ length: 101 }, (_, i) => firstLeader[0].map((value, axis) => value + (firstLeader[1][axis] - value) * i / 100)).every(([x, y]) => x < laterBox.x - 1 || x > laterBox.x + laterBox.width + 1 || y < laterBox.y - 1 || y > laterBox.y + laterBox.height + 1), 'A later label box cannot cover an earlier anchor leader or its stroke.');
const crowded = R.placeLabels(Array.from({ length: 50 }, (_, i) => ({ id: String(i), anchor: [70, 40], width: 70, height: 20, priority: i === 49 ? 100 : 0 })), { width: 140, height: 80 });
check(crowded.labels[0].id === '49' && crowded.stats.suppressed > 40, 'Crowded layouts retain important labels and suppress lower priority overflow.');
check(crowded.stats.candidates <= 50 * 32, 'Candidate placement work is bounded per label.');
const distantObstacle = R.placeLabels([{ id: 'finite', anchor: [100, 100], width: 50, height: 20 }], labelView, { obstacles: [{ x: 1e308, y: 1e308, width: 0, height: 0 }] });
check(distantObstacle.labels.length === 1 && distantObstacle.stats.obstacleChecks === 0, 'Huge finite offscreen obstacle coordinates do not cause unbounded bucket loops.');
console.log(`PASS ${checks} renderer, contour, budget and label-layout checks`);
