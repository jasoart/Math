/* Pure drawing geometry shared by the interactive canvas and SVG export. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GraphRender = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const QUALITY = Object.freeze({
    interactive: Object.freeze({ tolerancePixels: 1.35, seedPixelStep: 28, seedCount: 24, maxSegmentPixels: 48, maxDepth: 10, maxEvaluations: 6500, cellPixels: 20, contourEvaluations: 18000, rootIterations: 15 }),
    balanced: Object.freeze({ tolerancePixels: .65, seedPixelStep: 16, seedCount: 48, maxSegmentPixels: 28, maxDepth: 13, maxEvaluations: 18000, cellPixels: 10, contourEvaluations: 60000, rootIterations: 19 }),
    precise: Object.freeze({ tolerancePixels: .25, seedPixelStep: 10, seedCount: 72, maxSegmentPixels: 18, maxDepth: 15, maxEvaluations: 36000, cellPixels: 6, contourEvaluations: 120000, rootIterations: 23 })
  });
  const finite = Number.isFinite;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const number = (value, fallback, min, max) => finite(value) ? clamp(value, min, max) : fallback;
  function viewport(view) {
    if (!view || !['xmin', 'xmax', 'ymin', 'ymax', 'width', 'height'].every(k => finite(view[k])) || !finite(view.xmax - view.xmin) || !finite(view.ymax - view.ymin) || view.xmin >= view.xmax || view.ymin >= view.ymax || view.width <= 0 || view.height <= 0) throw new RangeError('A finite, nonempty viewport is required.');
    return view;
  }
  function worldToScreen(point, view) {
    return [(point[0] - view.xmin) / (view.xmax - view.xmin) * view.width, (view.ymax - point[1]) / (view.ymax - view.ymin) * view.height];
  }
  function screenToWorld(point, view) {
    return [view.xmin + point[0] / view.width * (view.xmax - view.xmin), view.ymax - point[1] / view.height * (view.ymax - view.ymin)];
  }
  function optionsFor(options, implicit) {
    const supplied = options || {}, preset = QUALITY[supplied.quality] || QUALITY.balanced;
    return {
      tolerancePixels: number(supplied.tolerancePixels, preset.tolerancePixels, .05, 10),
      seedPixelStep: number(supplied.seedPixelStep, preset.seedPixelStep, 2, 100),
      seedCount: Math.floor(number(supplied.seedCount, preset.seedCount, 1, 2048)),
      maxSegmentPixels: number(supplied.maxSegmentPixels, preset.maxSegmentPixels, 2, 1000),
      maxDepth: Math.floor(number(supplied.maxDepth, preset.maxDepth, 0, 20)),
      maxEvaluations: Math.floor(number(supplied.maxEvaluations, implicit ? preset.contourEvaluations : preset.maxEvaluations, 1, 1000000)),
      cellPixels: number(supplied.cellPixels, preset.cellPixels, 2, 1000000),
      rootIterations: Math.floor(number(supplied.rootIterations, preset.rootIterations, 4, 32))
    };
  }
  // Liang–Barsky clipping is performed in screen coordinates, with no canvas dependency.
  function clipScreen(a, b, width, height) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    let lo = 0, hi = 1;
    const p = [-dx, dx, -dy, dy], q = [a[0], width - a[0], a[1], height - a[1]];
    for (let i = 0; i < 4; i++) {
      if (p[i] === 0) { if (q[i] < 0) return null; }
      else {
        const t = q[i] / p[i];
        if (p[i] < 0) lo = Math.max(lo, t); else hi = Math.min(hi, t);
        if (lo > hi) return null;
      }
    }
    return [[a[0] + lo * dx, a[1] + lo * dy], [a[0] + hi * dx, a[1] + hi * dy]];
  }
  function distanceToSegment(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], d = dx * dx + dy * dy;
    const t = d ? clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / d, 0, 1) : 0;
    return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t);
  }
  function adaptive(fn, start, end, view, options, explicit) {
    viewport(view);
    if (typeof fn !== 'function' || !finite(start) || !finite(end) || !finite(end - start) || start >= end) throw new RangeError('A function and increasing finite parameter range are required.');
    const settings = optionsFor(options), segments = [];
    const stats = { evaluations: 0, subdivisions: 0, rejected: 0, clipped: 0, culled: 0, segmentCount: 0, budgetExhausted: false };
    let path = null, lastScreen = null;
    function at(t) {
      if (stats.evaluations >= settings.maxEvaluations) { stats.budgetExhausted = true; return null; }
      stats.evaluations++;
      let p;
      try { const value = fn(t); p = explicit ? [t, value] : value; } catch { return null; }
      if (!p || !finite(p[0]) || !finite(p[1])) return null;
      const screen = worldToScreen(p, view);
      if (!screen.every(finite) || Math.max(Math.abs(screen[0]), Math.abs(screen[1])) > 1e12) return null;
      return { world: [p[0], p[1]], screen };
    }
    function disconnect() { path = null; lastScreen = null; }
    function append(a, b) {
      const clipped = clipScreen(a.screen, b.screen, view.width, view.height);
      if (!clipped) { disconnect(); return; }
      const [p, q] = clipped;
      if (Math.hypot(q[0] - p[0], q[1] - p[1]) < 1e-9) return;
      if (p[0] !== a.screen[0] || p[1] !== a.screen[1] || q[0] !== b.screen[0] || q[1] !== b.screen[1]) stats.clipped++;
      if (!path || !lastScreen || Math.hypot(lastScreen[0] - p[0], lastScreen[1] - p[1]) > 1e-6) {
        path = [screenToWorld(p, view)]; segments.push(path);
      }
      path.push(screenToWorld(q, view)); lastScreen = q; stats.segmentCount++;
    }
    function visit(t0, p0, t1, p1, depth, knownMiddle, probeAliases, parentVariation) {
      if (stats.budgetExhausted) { disconnect(); return; }
      const tm = t0 + (t1 - t0) * .5;
      const middle = knownMiddle === undefined ? at(tm) : knownMiddle;
      const quarter = at(t0 + (t1 - t0) * .25), threeQuarter = at(t0 + (t1 - t0) * .75);
      // An irrational probe avoids the common endpoint/midpoint alias in periodic
      // curves, including after subdivision. Regular interior samples are shared.
      const extra = probeAliases ? at(t0 + (t1 - t0) * .3819660112501051) : null;
      if (stats.budgetExhausted) { disconnect(); return; }
      const samples = [p0, quarter, middle, threeQuarter, p1];
      if (!samples.every(Boolean) || (probeAliases && !extra)) {
        if (depth < settings.maxDepth && samples.some(Boolean)) {
          stats.subdivisions++; visit(t0, p0, tm, middle, depth + 1, quarter, true); visit(tm, middle, t1, p1, depth + 1, threeQuarter, true);
        } else { stats.rejected++; disconnect(); }
        return;
      }
      const error = Math.max(...[quarter, middle, threeQuarter, extra].filter(Boolean).map(p => distanceToSegment(p.screen, p0.screen, p1.screen)));
      const longest = Math.max(...samples.slice(1).map((p, i) => Math.hypot(p.screen[0] - samples[i].screen[0], p.screen[1] - samples[i].screen[1])));
      // A visible step keeps its ordinate variation under subdivision, while
      // continuous limiting cases (x³, cube root, etc.) shrink it. Combine that
      // evidence with pixel error instead of rejecting scale-relative curvature.
      const ordinates = explicit ? samples.map(p => p.screen[1]) : [];
      const variation = explicit ? Math.max(...ordinates) - Math.min(...ordinates) : 0;
      const profileError = explicit ? Math.max(...samples.slice(1, 4).map((p, i) => Math.abs(p.screen[1] - p0.screen[1] - (p1.screen[1] - p0.screen[1]) * (i + 1) * .25))) : 0;
      const persistentJump = explicit && profileError > settings.tolerancePixels && (!finite(parentVariation) || variation >= parentVariation * .95);
      const allSamples = extra ? samples.concat(extra) : samples;
      if (error <= settings.tolerancePixels && !persistentJump && (allSamples.every(p => p.screen[0] < 0) || allSamples.every(p => p.screen[0] > view.width) || allSamples.every(p => p.screen[1] < 0) || allSamples.every(p => p.screen[1] > view.height))) {
        stats.culled++; disconnect(); return;
      }
      if (error > settings.tolerancePixels || longest > settings.maxSegmentPixels || persistentJump) {
        if (depth < settings.maxDepth && tm !== t0 && tm !== t1) {
          stats.subdivisions++; visit(t0, p0, tm, middle, depth + 1, quarter, true, variation); visit(tm, middle, t1, p1, depth + 1, threeQuarter, true, variation);
        } else { stats.rejected++; disconnect(); }
        return;
      }
      for (let i = 1; i < samples.length; i++) append(samples[i - 1], samples[i]);
    }
    const desired = explicit ? Math.ceil(view.width / settings.seedPixelStep) : settings.seedCount;
    const count = Math.max(1, Math.min(2048, desired, Math.floor(settings.maxEvaluations / 6) || 1));
    let previous = at(start);
    for (let i = 1; i <= count && !stats.budgetExhausted; i++) {
      const t0 = start + (end - start) * ((i - 1) / count), t1 = i === count ? end : start + (end - start) * (i / count);
      const next = at(t1); visit(t0, previous, t1, next, 0, undefined, true); previous = next;
    }
    return { segments, stats };
  }
  function sampleFunction(fn, view, options) { viewport(view); return adaptive(fn, view.xmin, view.xmax, view, options, true); }
  function sampleParametric(fn, start, end, view, options) { return adaptive(fn, start, end, view, options, false); }
  function samplePolar(fn, start, end, view, options) { return adaptive(t => { const r = fn(t); return [r * Math.cos(t), r * Math.sin(t)]; }, start, end, view, options, false); }

  function contourImplicit(fn, view, options) {
    viewport(view);
    if (typeof fn !== 'function') throw new TypeError('An implicit evaluator is required.');
    const settings = optionsFor(options, true), segments = [];
    const stats = { evaluations: 0, cells: 0, rejected: 0, ambiguous: 0, zeroEdges: 0, segmentCount: 0, budgetExhausted: false, allZero: false };
    let nx = Math.max(1, Math.min(60000, Math.ceil(view.width / settings.cellPixels))), ny = Math.max(1, Math.min(60000, Math.ceil(view.height / settings.cellPixels)));
    // Reserve at least half the budget for root refinement; grid storage is bounded.
    const vertexLimit = Math.max(4, Math.min(60000, Math.floor(settings.maxEvaluations * .5)));
    if ((nx + 1) * (ny + 1) > vertexLimit) {
      const factor = Math.sqrt(vertexLimit / ((nx + 1) * (ny + 1)));
      nx = Math.max(1, Math.floor(nx * factor)); ny = Math.max(1, Math.floor(ny * factor));
      while ((nx + 1) * (ny + 1) > vertexLimit && (nx > 1 || ny > 1)) { if (nx >= ny) nx--; else ny--; }
    }
    stats.columns = nx; stats.rows = ny;
    const values = new Float64Array((nx + 1) * (ny + 1)), edges = new Map(), emittedZeroEdges = new Set(), zeroEdgeStatus = new Map();
    const xAt = i => view.xmin + i / nx * (view.xmax - view.xmin), yAt = j => view.ymax - j / ny * (view.ymax - view.ymin);
    function at(x, y) {
      if (stats.evaluations >= settings.maxEvaluations) { stats.budgetExhausted = true; return NaN; }
      stats.evaluations++;
      try { const value = fn(x, y); return finite(value) ? value : NaN; } catch { return NaN; }
    }
    let allZero = true;
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
      const value = at(xAt(i), yAt(j)); values[j * (nx + 1) + i] = value;
      if (value !== 0) allZero = false;
    }
    if (allZero) { stats.allZero = true; return { segments, stats }; }
    function crossing(a, b, fa, fb, key) {
      if (edges.has(key)) return edges.get(key);
      let result = null;
      if (fa === 0) result = a;
      else if (fb === 0) result = b;
      else if (finite(fa) && finite(fb) && (fa > 0) !== (fb > 0)) {
        const scale = Math.min(Math.abs(fa), Math.abs(fb));
        let lo = 0, hi = 1, fl = fa, fr = fb, best = Math.abs(fa) < Math.abs(fb) ? a : b, residual = scale;
        for (let k = 0; k < settings.rootIterations && !stats.budgetExhausted; k++) {
          // Start with a scale-safe secant estimate; bracketed bisection follows.
          const magnitude = Math.max(Math.abs(fl), Math.abs(fr));
          const fraction = k === 0 ? (Math.abs(fl) / magnitude) / (Math.abs(fl) / magnitude + Math.abs(fr) / magnitude) : .5;
          const t = lo + (hi - lo) * fraction, point = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], value = at(point[0], point[1]);
          if (!finite(value)) break;
          if (Math.abs(value) < residual) { best = point; residual = Math.abs(value); }
          if (value === 0) break;
          if ((value > 0) === (fl > 0)) { lo = t; fl = value; } else { hi = t; fr = value; }
        }
        // A shrinking sign bracket alone also converges on poles and step jumps.
        // Require an actual reduction in residual before drawing a zero contour.
        if (residual <= scale * 1e-4) result = best; else stats.rejected++;
      }
      edges.set(key, result); return result;
    }
    function emit(a, b) {
      if (!a || !b || Math.hypot((a[0] - b[0]) / (view.xmax - view.xmin) * view.width, (a[1] - b[1]) / (view.ymax - view.ymin) * view.height) < 1e-8) return;
      segments.push([a, b]); stats.segmentCount++;
    }
    function validatedZeroEdge(a, b, key) {
      if (zeroEdgeStatus.has(key)) return zeroEdgeStatus.get(key);
      let valid = true;
      for (const t of [.25, .5, .75]) {
        if (at(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t) !== 0) { valid = false; break; }
      }
      zeroEdgeStatus.set(key, valid);
      if (!valid) stats.rejected++;
      return valid;
    }
    const verticalOffset = nx * (ny + 1);
    for (let j = 0; j < ny && !stats.budgetExhausted; j++) for (let i = 0; i < nx && !stats.budgetExhausted; i++) {
      stats.cells++;
      const k = j * (nx + 1) + i, v = [values[k], values[k + 1], values[k + nx + 2], values[k + nx + 1]];
      if (!v.every(finite)) { stats.rejected++; continue; }
      const mask = v.reduce((m, value, bit) => m | (value >= 0 ? 1 << bit : 0), 0);
      if (mask === 0 || (mask === 15 && !v.some(value => value === 0)) || v.every(value => value === 0)) continue;
      const p = [[xAt(i), yAt(j)], [xAt(i + 1), yAt(j)], [xAt(i + 1), yAt(j + 1)], [xAt(i), yAt(j + 1)]];
      const keys = [j * nx + i, verticalOffset + j * (nx + 1) + i + 1, (j + 1) * nx + i, verticalOffset + j * (nx + 1) + i];
      const zeroLinks = [];
      for (let edge = 0; edge < 4; edge++) if (v[edge] === 0 && v[(edge + 1) % 4] === 0 && validatedZeroEdge(p[edge], p[(edge + 1) % 4], keys[edge])) {
        zeroLinks.push([edge, (edge + 1) % 4]);
        if (!emittedZeroEdges.has(keys[edge])) { emit(p[edge], p[(edge + 1) % 4]); emittedZeroEdges.add(keys[edge]); stats.zeroEdges++; }
      }
      if (mask === 15) continue;
      // Exact zero edges are real contours of fields such as x²=0. When zero
      // edges form a corner path (xy=0), do not shortcut that path diagonally.
      function connectedByZeroEdges(a, b) {
        if (!a || !b || !zeroLinks.length) return false;
        const first = p.findIndex(point => point[0] === a[0] && point[1] === a[1]), last = p.findIndex(point => point[0] === b[0] && point[1] === b[1]);
        if (first < 0 || last < 0) return false;
        const visited = new Set([first]);
        for (let pass = 0; pass < 4; pass++) for (const [u, w] of zeroLinks) { if (visited.has(u)) visited.add(w); if (visited.has(w)) visited.add(u); }
        return visited.has(last);
      }
      const hits = [];
      for (let edge = 0; edge < 4; edge++) if ((v[edge] >= 0) !== (v[(edge + 1) % 4] >= 0)) hits.push({ edge, point: crossing(p[edge], p[(edge + 1) % 4], v[edge], v[(edge + 1) % 4], keys[edge]) });
      if (hits.length === 2 && !connectedByZeroEdges(hits[0].point, hits[1].point)) emit(hits[0].point, hits[1].point);
      else if (hits.length === 4) {
        stats.ambiguous++;
        const scale = Math.max(...v.map(Math.abs)), n = v.map(value => value / scale), determinant = n[0] * n[2] - n[1] * n[3];
        const d = n[2] - n[1] - n[3] + n[0], u = d ? (n[0] - n[3]) / d : NaN, w = d ? (n[0] - n[1]) / d : NaN;
        if (Math.abs(determinant) <= 1e-14 && u > 0 && u < 1 && w > 0 && w < 1) {
          const saddle = [p[0][0] + u * (p[1][0] - p[0][0]), p[0][1] + w * (p[3][1] - p[0][1])];
          for (const hit of hits) emit(hit.point, saddle);
        } else {
          // The bilinear determinant (asymptotic decider) chooses connectivity;
          // a center-value test can choose the wrong topology in a saddle cell.
          const pairs = determinant >= 0 ? [[0, 1], [2, 3]] : [[0, 3], [1, 2]];
          for (const [a, b] of pairs) emit(hits[a].point, hits[b].point);
        }
      }
    }
    return { segments, stats };
  }

  const boxesOverlap = (a, b, gap) => a.x < b.x + b.width + gap && a.x + a.width + gap > b.x && a.y < b.y + b.height + gap && a.y + a.height + gap > b.y;
  function segmentHitsBox(a, b, box, margin) {
    return !!clipScreen([a[0] - box.x + margin, a[1] - box.y + margin], [b[0] - box.x + margin, b[1] - box.y + margin], box.width + margin * 2, box.height + margin * 2);
  }
  function placeLabels(items, view, options) {
    if (!view || !finite(view.width) || !finite(view.height) || view.width <= 0 || view.height <= 0) throw new RangeError('A finite label viewport is required.');
    const supplied = options || {}, padding = number(supplied.padding, 5, 0, 100), gap = number(supplied.gap, 10, 0, 100), clearance = number(supplied.clearance, 3, 0, 40), labelGap = number(supplied.labelGap, 4, 0, 40);
    const labels = [], stats = { placed: 0, suppressed: 0, candidates: 0, obstacleChecks: 0 }, buckets = new Map(), broad = [], cell = Math.max(64, view.width / 256, view.height / 256);
    const obstacles = Array.isArray(supplied.obstacles) ? supplied.obstacles : [];
    const obstacleBounds = o => finite(o.x1) && finite(o.y1) && finite(o.x2) && finite(o.y2) ? { x: Math.min(o.x1, o.x2) - (o.radius || 0), y: Math.min(o.y1, o.y2) - (o.radius || 0), width: Math.abs(o.x2 - o.x1) + 2 * (o.radius || 0), height: Math.abs(o.y2 - o.y1) + 2 * (o.radius || 0) } : finite(o.radius) ? { x: o.x - o.radius, y: o.y - o.radius, width: o.radius * 2, height: o.radius * 2 } : o;
    for (let i = 0; i < obstacles.length; i++) {
      const bounds = obstacleBounds(obstacles[i]);
      if (![bounds.x, bounds.y, bounds.width, bounds.height].every(finite) || bounds.width < 0 || bounds.height < 0 || bounds.x > view.width + clearance || bounds.y > view.height + clearance || bounds.x + bounds.width < -clearance || bounds.y + bounds.height < -clearance) continue;
      const left = Math.floor(clamp(bounds.x - clearance, -cell, view.width + cell) / cell), right = Math.floor(clamp(bounds.x + bounds.width + clearance, -cell, view.width + cell) / cell), top = Math.floor(clamp(bounds.y - clearance, -cell, view.height + cell) / cell), bottom = Math.floor(clamp(bounds.y + bounds.height + clearance, -cell, view.height + cell) / cell);
      if ((right - left + 1) * (bottom - top + 1) > 256) { broad.push(i); continue; }
      for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) { const key = x + ':' + y; if (!buckets.has(key)) buckets.set(key, []); buckets.get(key).push(i); }
    }
    function blocked(box) {
      if (labels.some(label => boxesOverlap(box, label, labelGap) || (label.leader && segmentHitsBox(label.leader[0], label.leader[1], box, 1)))) return true;
      const indices = new Set(broad);
      for (let y = Math.floor(box.y / cell); y <= Math.floor((box.y + box.height) / cell); y++) for (let x = Math.floor(box.x / cell); x <= Math.floor((box.x + box.width) / cell); x++) for (const index of buckets.get(x + ':' + y) || []) indices.add(index);
      for (const index of indices) {
        stats.obstacleChecks++;
        const o = obstacles[index];
        if (finite(o.x1) && finite(o.y1) && finite(o.x2) && finite(o.y2)) { if (segmentHitsBox([o.x1, o.y1], [o.x2, o.y2], box, clearance + number(o.radius, 0, 0, 100))) return true; }
        else if (finite(o.radius)) {
          const dx = o.x - clamp(o.x, box.x, box.x + box.width), dy = o.y - clamp(o.y, box.y, box.y + box.height);
          if (Math.hypot(dx, dy) < o.radius + clearance) return true;
        } else if (boxesOverlap(box, o, clearance)) return true;
      }
      return false;
    }
    const directions = ['ne', 'nw', 'se', 'sw', 'e', 'w', 'n', 's'];
    const entries = (Array.isArray(items) ? items : []).map((item, index) => ({ item, index, priority: finite(item.priority) ? item.priority : 0, key: String(item.id === undefined ? index : item.id) }));
    entries.sort((a, b) => b.priority - a.priority || (a.key < b.key ? -1 : a.key > b.key ? 1 : a.index - b.index));
    for (const { item } of entries) {
      const anchor = item.anchor || [item.anchorX, item.anchorY], width = item.width, height = item.height;
      if (!anchor || !anchor.every(finite) || !finite(width) || !finite(height) || width <= 0 || height <= 0 || anchor[0] < 0 || anchor[0] > view.width || anchor[1] < 0 || anchor[1] > view.height) { stats.suppressed++; continue; }
      const preferred = typeof item.preferred === 'string' ? [item.preferred] : Array.isArray(item.preferred) ? item.preferred : [];
      const order = [...new Set(preferred.concat(directions))].filter(direction => directions.includes(direction));
      let chosen = null;
      for (const offset of [gap, gap + 14, gap + 30, gap + 50]) {
        for (const direction of order) {
          const horizontal = direction.includes('e') ? offset : direction.includes('w') ? -offset - width : -width / 2;
          const vertical = direction.includes('s') ? offset : direction.includes('n') ? -offset - height : -height / 2;
          const box = { x: anchor[0] + horizontal, y: anchor[1] + vertical, width, height };
          stats.candidates++;
          if (box.x < padding || box.y < padding || box.x + width > view.width - padding || box.y + height > view.height - padding || blocked(box)) continue;
          const endpoint = [clamp(anchor[0], box.x, box.x + width), clamp(anchor[1], box.y, box.y + height)];
          const leader = Math.hypot(endpoint[0] - anchor[0], endpoint[1] - anchor[1]) > number(supplied.leaderThreshold, 18, 0, 100) || item.leader === true ? [[anchor[0], anchor[1]], endpoint] : null;
          if (leader && labels.some(label => segmentHitsBox(leader[0], leader[1], label, 1))) continue;
          chosen = { ...item, ...box, anchorX: anchor[0], anchorY: anchor[1], leader, placement: direction }; break;
        }
        if (chosen) break;
      }
      if (chosen) { labels.push(chosen); stats.placed++; } else stats.suppressed++;
    }
    return { labels, stats };
  }
  return Object.freeze({ QUALITY, worldToScreen, screenToWorld, sampleFunction, sampleParametric, samplePolar, contourImplicit, placeLabels });
});
