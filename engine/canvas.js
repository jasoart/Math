/* Shared, bounded canvas geometry and annotation layout. No DOM dependency. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../graph/render.js'));
  else root.MathCanvas = factory(root.GraphRender);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (geometry) {
  'use strict';
  const finite = Number.isFinite;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const FONT = '600 12px "STIX Two Text", "Noto Sans TC", ui-sans-serif, system-ui';
  const COLORS = Object.freeze({ink: '#172d3a', muted: '#6a7e84', grid: '#e5edea', minor: '#f0f4f2', axis: '#9aafad', paper: 'rgba(255,255,253,.96)', border: '#dbe5e0', accent: '#087f73'});

  function niceTicks(min, max, pixels = 600, spacing = 68) {
    if (![min, max, pixels, spacing].every(finite) || !(max > min) || pixels <= 0 || spacing <= 0 || !finite(max - min)) return {step: 0, values: []};
    const count = clamp(Math.floor(pixels / spacing), 2, 100);
    const raw = (max - min) / count, power = 10 ** Math.floor(Math.log10(raw));
    if (!power || !finite(power)) return {step: 0, values: []};
    const step = [1, 2, 2.5, 5, 10].find(n => n * power >= raw) * power;
    const first = Math.ceil(min / step), last = Math.floor(max / step), values = [];
    for (let index = 0; index <= Math.min(100, last - first); index++) {
      const value = (first + index) * step;
      // The index loop is bounded even when adjacent floating point values coincide.
      if (finite(value) && (!values.length || value > values[values.length - 1])) values.push(Math.abs(value) < step * 1e-10 ? 0 : Number(value.toPrecision(12)));
    }
    return {step, values};
  }
  function formatTick(value, step = 1) {
    if (!finite(value)) return '';
    if (value === 0) return '0';
    if (Math.abs(value) >= 1e5 || Math.abs(value) < .0001) return value.toExponential(1).replace('.0e', 'e').replace('e+', 'e');
    return String(Number(value.toFixed(clamp(Math.ceil(-Math.log10(step)) + 1, 0, 10))));
  }
  function planeView(plane) {
    const scaleX = plane.scaleX ?? plane.scale, scaleY = plane.scaleY ?? plane.scale;
    return {xmin: -plane.origin.x / scaleX, xmax: (plane.width - plane.origin.x) / scaleX, ymin: -(plane.height - plane.origin.y) / scaleY, ymax: plane.origin.y / scaleY, width: plane.width, height: plane.height};
  }

  function sampleCurve(fn, view, range, holes = [], options = {}) {
    if (!geometry) throw new Error('MathCanvas requires GraphRender before it is loaded.');
    if (typeof fn !== 'function') throw new TypeError('A curve evaluator is required.');
    const min = Math.max(view.xmin, range?.[0] ?? view.xmin), max = Math.min(view.xmax, range?.[1] ?? view.xmax);
    const result = {segments: [], stats: {evaluations: 0, subdivisions: 0, rejected: 0, segmentCount: 0, budgetExhausted: false}};
    if (!(max > min)) return result;
    const budget = clamp(Math.floor(options.maxEvaluations ?? 14000), 32, 36000);
    const cuts = [...new Set(holes.filter(h => finite(h) && h > min && h < max))].sort((a, b) => a - b).slice(0, 64);
    const intervals = [min, ...cuts, max];
    for (let index = 1; index < intervals.length; index++) {
      const remaining = budget - result.stats.evaluations;
      if (remaining < 32) {result.stats.budgetExhausted = true; break;}
      const epsilon = Math.max((max - min) * 1e-10, Number.EPSILON * Math.max(1, Math.abs(intervals[index]), Math.abs(intervals[index - 1])) * 4);
      const start = intervals[index - 1] + (index > 1 ? epsilon : 0), end = intervals[index] - (index < intervals.length - 1 ? epsilon : 0);
      if (!(end > start)) continue;
      // A cropped viewport keeps the original scale in screen pixels.
      const cropped = {...view, xmin: start, xmax: end, width: view.width * (end - start) / (view.xmax - view.xmin)};
      let evaluatorError;
      const sampled = geometry.sampleFunction(x => {
        try {return fn(x);} catch (error) {evaluatorError = error; return NaN;}
      }, cropped, {...options, maxEvaluations: remaining});
      if (evaluatorError) throw evaluatorError;
      result.segments.push(...sampled.segments);
      for (const key of ['evaluations', 'subdivisions', 'rejected', 'segmentCount']) result.stats[key] += sampled.stats[key];
      result.stats.budgetExhausted ||= sampled.stats.budgetExhausted;
    }
    return result;
  }

  function wrapText(context, text, maxWidth) {
    const lines = [];
    for (const paragraph of String(text).split('\n')) {
      let line = '';
      for (const character of paragraph) {
        if (line && context.measureText(line + character).width > maxWidth) {lines.push(line); line = '';}
        line += character;
      }
      lines.push(line);
    }
    return lines;
  }

  function createFrame(context, options) {
    if (!geometry) throw new Error('MathCanvas requires GraphRender before it is loaded.');
    const width = Math.max(1, options.width), height = Math.max(1, options.height), colors = {...COLORS, ...options.colors};
    const labels = [], obstacles = [];
    const report = {engine: 'adaptive-canvas', width, height, grids: 0, curves: 0, contours: 0, evaluations: 0, subdivisions: 0, rejected: 0, segments: 0, budgetExhausted: false, labelsRequested: 0, labels: [], labelsSuppressed: 0};
    function reserve(obstacle) {
      if (obstacles.length < 2400) obstacles.push(obstacle);
    }
    function reserveSegment(from, to, radius = 1.5) {
      if (![from.x, from.y, to.x, to.y].every(finite)) return;
      reserve({x1: from.x, y1: from.y, x2: to.x, y2: to.y, radius});
    }
    function queueLabel(text, x, y, settings = {}) {
      if (!text || !finite(x) || !finite(y) || labels.length >= 240) return;
      const isPoint = settings.kind === 'point';
      // Off-screen points should not acquire labels pinned to a different location.
      if (isPoint && (x < 0 || x > width || y < 0 || y > height)) return;
      context.save(); context.font = settings.font || FONT;
      const maxWidth = Math.max(12, Math.min(settings.maxWidth ?? 290, width - 34));
      const lines = wrapText(context, text, maxWidth);
      const measured = Math.max(...lines.map(line => context.measureText(line).width), 0);
      context.restore();
      labels.push({id: String(labels.length).padStart(4, '0'), text: String(text), lines, font: settings.font || FONT, width: measured + 18, height: lines.length * 17 + 12, anchor: [clamp(x, 6, width - 6), clamp(y, 6, height - 6)], color: settings.color || colors.ink, kind: isPoint ? 'point' : 'math', leader: settings.leader ?? (isPoint ? undefined : false), preferred: isPoint ? ['ne', 'nw', 'se', 'sw'] : ['se', 'ne', 'sw', 'nw'], priority: isPoint ? 20 : 10});
    }
    function drawGrid(plane, settings = {}) {
      const view = planeView(plane), sx = x => plane.sx(x), sy = y => plane.sy(y);
      const xTicks = niceTicks(view.xmin, view.xmax, plane.width, settings.spacing ?? 68), yTicks = niceTicks(view.ymin, view.ymax, plane.height, settings.spacing ?? 62);
      report.grids++;
      context.save(); context.lineWidth = 1;
      for (const [ticks, horizontal] of [[xTicks, false], [yTicks, true]]) {
        const min = horizontal ? view.ymin : view.xmin, max = horizontal ? view.ymax : view.xmax;
        const scale = horizontal ? (plane.scaleY ?? plane.scale) : (plane.scaleX ?? plane.scale);
        if (ticks.step * scale >= 60) {
          const minorStep = ticks.step / 5, first = Math.ceil(min / minorStep), count = Math.min(500, Math.floor((max - min) / minorStep) + 2);
          context.strokeStyle = colors.minor; context.beginPath();
          for (let index = 0; index < count; index++) {
            const value = (first + index) * minorStep; if (value > max) break;
            const position = horizontal ? sy(value) : sx(value);
            if (horizontal) {context.moveTo(0, position); context.lineTo(plane.width, position);} else {context.moveTo(position, 0); context.lineTo(position, plane.height);}
          }
          context.stroke();
        }
        context.strokeStyle = colors.grid; context.beginPath();
        for (const value of ticks.values) {
          const position = horizontal ? sy(value) : sx(value);
          if (horizontal) {context.moveTo(0, position); context.lineTo(plane.width, position);} else {context.moveTo(position, 0); context.lineTo(position, plane.height);}
        }
        context.stroke();
      }
      const axisX = clamp(plane.origin.x, 28, plane.width - 28), axisY = clamp(plane.origin.y, 24, plane.height - 24);
      context.strokeStyle = colors.axis; context.lineWidth = 1.4; context.beginPath();
      if (plane.origin.y >= 0 && plane.origin.y <= plane.height) {context.moveTo(0, plane.origin.y); context.lineTo(plane.width, plane.origin.y);}
      if (plane.origin.x >= 0 && plane.origin.x <= plane.width) {context.moveTo(plane.origin.x, 0); context.lineTo(plane.origin.x, plane.height);}
      context.stroke(); context.fillStyle = colors.muted; context.font = '500 10px ui-sans-serif, system-ui'; context.textBaseline = 'middle';
      function tickLabel(text, x, y, align) {
        const tw = context.measureText(text).width;
        const left = align === 'center' ? x - tw / 2 : align === 'right' ? x - tw : x;
        if (left < 4 || left + tw > plane.width - 4 || y < 6 || y > plane.height - 6) return;
        context.textAlign = align;
        context.fillStyle = 'rgba(255,255,253,.85)'; context.fillRect(left - 2, y - 7, tw + 4, 14);
        context.fillStyle = colors.muted; context.fillText(text, x, y);
        reserve({x: left - 2, y: y - 7, width: tw + 4, height: 14});
      }
      for (const value of xTicks.values) if (value !== 0 && Math.abs(sx(value) - axisX) > 22) tickLabel(formatTick(value, xTicks.step), sx(value), axisY + 15, 'center');
      for (const value of yTicks.values) if (value !== 0 && Math.abs(sy(value) - axisY) > 20) tickLabel(formatTick(value, yTicks.step), axisX - 9, sy(value), 'right');
      if (plane.origin.x >= 0 && plane.origin.x <= plane.width && plane.origin.y >= 0 && plane.origin.y <= plane.height) tickLabel('0', axisX - 9, axisY + 15, 'right');
      context.font = 'italic 600 13px Georgia, serif'; tickLabel(settings.xLabel || 'x', plane.width - 12, axisY - 12, 'center'); tickLabel(settings.yLabel || 'y', axisX + 13, 14, 'center');
      context.restore();
      return {x: xTicks, y: yTicks};
    }
    function drawCurve(plane, fn, min, max, color, lineWidth = 2.6, holes = []) {
      const view = planeView(plane), sampled = sampleCurve(fn, view, [min, max], holes);
      context.save(); context.lineCap = 'round'; context.lineJoin = 'round'; context.strokeStyle = color; context.lineWidth = lineWidth; context.beginPath();
      for (const path of sampled.segments) {
        path.forEach(([x, y], index) => index ? context.lineTo(plane.sx(x), plane.sy(y)) : context.moveTo(plane.sx(x), plane.sy(y)));
        // Sparse geometry reserves preserve bounded annotation work on dense curves.
        const stride = Math.max(1, Math.ceil(path.length / 260));
        for (let i = 1; i < path.length; i += stride) reserveSegment({x: plane.sx(path[i - 1][0]), y: plane.sy(path[i - 1][1])}, {x: plane.sx(path[Math.min(path.length - 1, i + stride - 1)][0]), y: plane.sy(path[Math.min(path.length - 1, i + stride - 1)][1])}, lineWidth / 2);
      }
      context.stroke(); context.restore(); report.curves++;
      report.evaluations += sampled.stats.evaluations; report.subdivisions += sampled.stats.subdivisions; report.rejected += sampled.stats.rejected; report.segments += sampled.stats.segmentCount; report.budgetExhausted ||= sampled.stats.budgetExhausted;
      return sampled;
    }
    function drawContours(plane, fn, levels, settings = {}) {
      const view = planeView(plane);
      const xmin = Math.max(view.xmin, settings.xMin ?? view.xmin), xmax = Math.min(view.xmax, settings.xMax ?? view.xmax), ymin = Math.max(view.ymin, settings.yMin ?? view.ymin), ymax = Math.min(view.ymax, settings.yMax ?? view.ymax);
      if (!(xmax > xmin && ymax > ymin)) return;
      const cropped = {xmin, xmax, ymin, ymax, width: view.width * (xmax - xmin) / (view.xmax - view.xmin), height: view.height * (ymax - ymin) / (view.ymax - view.ymin)};
      context.save(); context.lineWidth = settings.width ?? 1.5; context.lineCap = 'round';
      for (const level of levels) {
        let evaluatorError;
        const contour = geometry.contourImplicit((x, y) => {try {return fn(x, y) - level;} catch (error) {evaluatorError = error; return NaN;}}, cropped, {cellPixels: 12, maxEvaluations: 16000});
        if (evaluatorError) {context.restore(); throw evaluatorError;}
        context.strokeStyle = level === 0 ? 'rgba(214,83,83,.64)' : 'rgba(49,106,197,.3)'; context.beginPath();
        for (const [a, b] of contour.segments) {context.moveTo(plane.sx(a[0]), plane.sy(a[1])); context.lineTo(plane.sx(b[0]), plane.sy(b[1]));}
        context.stroke(); report.contours++; report.evaluations += contour.stats.evaluations; report.rejected += contour.stats.rejected; report.segments += contour.stats.segmentCount; report.budgetExhausted ||= contour.stats.budgetExhausted;
      }
      context.restore();
    }
    function flushLabels() {
      const layout = geometry.placeLabels(labels, {width, height}, {gap: 0, padding: 6, clearance: 3, labelGap: 4, clampToViewport: true, searchOffsets: [0, 14, 30, 50, 80, 120, 180, 260, 360], obstacles});
      context.save(); context.lineWidth = 1;
      for (const label of layout.labels) {
        if (label.leader) {context.strokeStyle = colors.axis; context.setLineDash([2, 3]); context.beginPath(); context.moveTo(...label.leader[0]); context.lineTo(...label.leader[1]); context.stroke(); context.setLineDash([]);}
        context.fillStyle = colors.paper; context.strokeStyle = colors.border; context.beginPath(); context.roundRect(label.x, label.y, label.width, label.height, 8); context.fill(); context.stroke();
        if (label.kind === 'point') {context.fillStyle = label.color; context.beginPath(); context.arc(label.x + 4, label.y + label.height / 2, 1.7, 0, Math.PI * 2); context.fill();}
        context.font = label.font; context.textAlign = 'left'; context.textBaseline = 'alphabetic'; context.fillStyle = label.color;
        label.lines.forEach((line, index) => context.fillText(line, label.x + 9, label.y + 18 + index * 17));
      }
      context.restore();
      report.labelsRequested = labels.length; report.labelsSuppressed = layout.stats.suppressed;
      report.labels = layout.labels.map(({text, x, y, width, height, kind, leader}) => ({text, x, y, width, height, kind, leader}));
      return report;
    }
    return {drawGrid, drawCurve, drawContours, queueLabel, reserve, reserveSegment, flushLabels, report};
  }
  return Object.freeze({COLORS, niceTicks, formatTick, planeView, sampleCurve, wrapText, createFrame});
});
