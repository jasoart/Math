'use strict';
const assert = require('node:assert/strict');
const Canvas = require('../engine/canvas.js');
let assertions = 0;
function check(value, message) {assert.ok(value, message); assertions++;}
const view = {xmin: -5, xmax: 5, ymin: -4, ymax: 4, width: 640, height: 480};

for (const [min, max, pixels] of [[-5, 5, 640], [0, .00003, 320], [-3e8, 2e8, 900], [-1e-200, 1e-200, 320], [1e100, 1.1e100, 400], [0, 100000, 10000000]]) {
  const ticks = Canvas.niceTicks(min, max, pixels);
  check(ticks.step > 0 && Number.isFinite(ticks.step), 'nice ticks have a finite positive interval');
  check(ticks.values.length <= 101 && ticks.values.length >= 2, 'tick count remains bounded across scales');
  check(ticks.values.every((n, i, values) => Number.isFinite(n) && n >= min - ticks.step * 1e-8 && n <= max + ticks.step * 1e-8 && (!i || n > values[i - 1])), 'ticks increase within the visible range');
}
check(Canvas.niceTicks(2, 2).values.length === 0, 'degenerate domains have no ticks');
check(Canvas.niceTicks(-1e308, 1e308).values.length === 0, 'overflowing ranges do not loop');
check(Canvas.formatTick(-0) === '0', 'negative zero is normalized');
check(Canvas.formatTick(2.5e-7, 1e-7) === '2.5e-7', 'tiny ticks remain readable');

const pole = .137;
const sampled = Canvas.sampleCurve(x => 1 / (x - pole), view);
check(sampled.segments.length >= 2, 'a pole separates the visible curve');
for (const path of sampled.segments) {
  check(path.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y) && x >= view.xmin - 1e-8 && x <= view.xmax + 1e-8 && y >= view.ymin - 1e-8 && y <= view.ymax + 1e-8), 'curve coordinates are finite and clipped');
  check(!(path[0][0] < pole && path[path.length - 1][0] > pole), 'no segment bridges a pole');
}
const hole = Canvas.sampleCurve(x => x, view, [-2, 3], [pole]);
check(hole.segments.length === 2, 'an explicit removable hole splits a continuous formula');
check(hole.segments.every(path => path.every(([x]) => x >= -2 && x <= 3)), 'requested curve range is preserved');
check(hole.segments.every(path => !(path[0][0] < pole && path[path.length - 1][0] > pole)), 'no path bridges a removable hole');
const narrow = Canvas.sampleCurve(x => Math.sqrt(x), view, [-2, 2]);
check(narrow.segments.length && narrow.segments.every(path => path.every(([x]) => x >= 0)), 'undefined domains stay disconnected');
const dense = Canvas.sampleCurve(x => Math.sin(1e5 * x), view, undefined, [], {maxEvaluations: 400});
check(dense.stats.evaluations <= 400 && dense.stats.budgetExhausted, 'oscillatory functions honor the evaluation budget');
assert.throws(() => Canvas.sampleCurve(() => {throw new Error('evaluator failure');}, view), /evaluator failure/); assertions++;

function mockContext() {
  const stack = [], calls = [];
  const context = {font: '30px test', textAlign: 'left', textBaseline: 'alphabetic', calls,
    save() {stack.push({font: this.font, textAlign: this.textAlign, textBaseline: this.textBaseline});},
    restore() {Object.assign(this, stack.pop());},
    measureText(text) {calls.push({type: 'measure', text, font: this.font}); return {width: String(text).length * (this.font.includes('12px') ? 8 : 7)};},
    fillText(text, x, y) {calls.push({type: 'text', text, x, y, font: this.font});}
  };
  for (const name of ['beginPath', 'moveTo', 'lineTo', 'stroke', 'fill', 'fillRect', 'roundRect', 'arc', 'setLineDash']) context[name] = (...args) => {for (const value of args) if (typeof value === 'number') assert.ok(Number.isFinite(value), `${name} receives finite values`); calls.push({type: name, args});};
  return context;
}
const context = mockContext(), frame = Canvas.createFrame(context, {width: 360, height: 320});
frame.reserve({x: 170, y: 160, radius: 8});
frame.reserveSegment({x: 10, y: 185}, {x: 340, y: 185}, 2);
for (const text of ['A', 'B', 'f(x) = x²', '面積 = 12']) frame.queueLabel(text, 170, 160, {kind: 'point'});
frame.queueLabel('長公式包含完整數學關係 = 123456789 + abcdefghijklmnop + π', 22, 30);
const report = frame.flushLabels();
check(report.labels.length >= 4, 'nearby annotations receive alternate placements');
check(context.calls.filter(call => call.type === 'measure').every(call => call.font.includes('12px')), 'label font is selected before measuring');
for (const a of report.labels) {
  check(a.x >= 6 && a.y >= 6 && a.x + a.width <= 354 && a.y + a.height <= 314, 'placed labels fit the canvas');
  for (const b of report.labels) if (a !== b) check(!(a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y), 'label boxes never overlap');
}
check(report.labels.some(label => label.text.includes('完整數學關係') && label.height > 29), 'long formulas wrap without truncating text');
check(context.calls.some(call => call.type === 'text' && call.text.includes('π')), 'wrapped label preserves the final glyph');

const plane = {width: 360, height: 320, scale: 32, origin: {x: 180, y: 160}, sx: x => 180 + x * 32, sy: y => 160 - y * 32};
const gridContext = mockContext(), gridFrame = Canvas.createFrame(gridContext, {width: 360, height: 320});
gridFrame.drawGrid(plane); gridFrame.drawCurve(plane, Math.sin, -5, 5, '#087f73');
const result = gridFrame.flushLabels();
check(result.grids === 1 && result.curves === 1 && result.evaluations > 0 && result.segments > 0, 'frame reports actual adaptive geometry work');
check(gridContext.calls.some(call => call.type === 'text' && /^-?\d/.test(call.text)), 'coordinate grid includes numerical axes');
const offscreenContext = mockContext(), offscreenFrame = Canvas.createFrame(offscreenContext, {width: 360, height: 320});
offscreenFrame.drawGrid({...plane, origin: {x: -200, y: -100}, sx: x => -200 + x * 32, sy: y => -100 - y * 32});
check(!offscreenContext.calls.some(call => call.type === 'text' && call.text === '0'), 'offscreen origin is never falsely labeled at a canvas edge');
const contourContext = mockContext(), contourFrame = Canvas.createFrame(contourContext, {width: 360, height: 320});
contourFrame.drawContours(plane, (x, y) => x * x + y * y, [1, 4], {xMin: -3, xMax: 3, yMin: -3, yMax: 3});
const contourReport = contourFrame.flushLabels();
check(contourReport.contours === 2 && contourReport.segments > 0, 'contour levels use validated marching squares');
check(contourReport.evaluations <= 32000, 'each implicit contour has a bounded evaluation budget');
const edgeContext = mockContext(), edgeFrame = Canvas.createFrame(edgeContext, {width: 200, height: 120});
edgeFrame.queueLabel('edge formula', 195, 4);
const edgeLabel = edgeFrame.flushLabels().labels[0];
check(edgeLabel && edgeLabel.x + edgeLabel.width <= 194, 'edge annotations shift inside the canvas');
check(edgeLabel.leader === null, 'a summary chip does not imply a false geometry anchor');
console.log(`Canvas engine: ${assertions} checks passed.`);
