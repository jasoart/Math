/* Mathematical geometry meshes; all evaluation uses the bounded shared interpreter. */
(function (root) {
  'use strict';
  const M = typeof module !== 'undefined' && module.exports ? require('../graph/math.js') : root.GraphMath;
  const COLORS = ['#67bfa8', '#dcb873', '#7ca8d2', '#bd95d0', '#e39485', '#97bd77'];
  const DEFAULT_BOUNDS = [-6, 6, -6, 6, -6, 6];
  const add = (a, b) => a.map((v, i) => v + b[i]);
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  const mul = (a, k) => a.map(v => v * k);
  const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = a => Math.hypot(...a);
  const finitePoint = p => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite);
  const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  function validBounds(bounds) {
    if (!Array.isArray(bounds) || bounds.length !== 6 || !bounds.every(v => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 200000) || [0, 2, 4].some(i => bounds[i + 1] - bounds[i] < 1e-5)) throw Error('3D 座標範圍不正確。');
    return bounds.slice();
  }
  function basis(normal) {
    const length = norm(normal); if (!(length > 1e-12)) throw Error('方向向量不可為零。');
    const n = mul(normal, 1 / length), helper = Math.abs(n[2]) < .8 ? [0, 0, 1] : [0, 1, 0];
    const first = cross(n, helper), u = mul(first, 1 / norm(first));
    return { n, u, v: cross(n, u) };
  }
  function clipSegment(a, b, bounds) {
    if (!finitePoint(a) || !finitePoint(b)) return null;
    let low = 0, high = 1;
    for (let k = 0; k < 3; k++) {
      const d = b[k] - a[k], lo = bounds[2 * k], hi = bounds[2 * k + 1];
      if (Math.abs(d) < 1e-14) { if (a[k] < lo || a[k] > hi) return null; }
      else { let t0 = (lo - a[k]) / d, t1 = (hi - a[k]) / d; if (t0 > t1) [t0, t1] = [t1, t0]; low = Math.max(low, t0); high = Math.min(high, t1); if (low > high) return null; }
    }
    return [lerp(a, b, low), lerp(a, b, high)];
  }
  function clipPolygon(points, bounds) {
    let polygon = points;
    for (let k = 0; k < 3; k++) for (const side of [0, 1]) {
      const edge = bounds[k * 2 + side], sign = side ? -1 : 1, next = [];
      for (let j = 0; j < polygon.length; j++) {
        const a = polygon[j], b = polygon[(j + 1) % polygon.length], da = sign * (a[k] - edge), db = sign * (b[k] - edge);
        if (da >= -1e-10) next.push(a);
        if ((da >= 0) !== (db >= 0)) next.push(lerp(a, b, da / (da - db)));
      }
      polygon = next; if (polygon.length < 3) return [];
    }
    return polygon;
  }
  function compile(source, allowed) {
    if (typeof source !== 'string' || !source.trim() || source.length > 480) throw Error('算式須為 1–480 字。');
    if (allowed.includes('z')) {
      // The 2D interpreter reserves t for a third independent coordinate. Check
      // the original variable set separately so an input t cannot alias z.
      const normalized = M.normalize(source), original = M.compile(normalized.replace(/z/g, '0'));
      if (original.variables.some(name => !allowed.includes(name))) throw Error('算式含有不支援的變數。');
      const compiled = M.compile(normalized.replace(/z/g, 't'));
      return { evaluate: scope => compiled.evaluate({ ...scope, t: scope.z }) };
    }
    const compiled = M.compile(source);
    if (compiled.variables.some(name => !allowed.includes(name))) throw Error('算式含有不支援的變數。');
    return compiled;
  }
  function residual(source) {
    const sourceString = String(source || '').trim(), equals = sourceString.match(/(?<![<>!=])=(?!=)/g);
    if (!equals) return sourceString;
    if (equals.length !== 1) throw Error('隱式方程須含一個等號。');
    const index = sourceString.indexOf('='); return '(' + sourceString.slice(0, index) + ')-(' + sourceString.slice(index + 1) + ')';
  }
  function compileUV(source) {
    if (typeof source !== 'string' || !source.trim() || source.length > 480) throw Error('算式須為 1–480 字。');
    const identifiers = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sqrt', 'cbrt', 'abs', 'exp', 'ln', 'log', 'floor', 'ceil', 'round', 'sign', 'min', 'max', 'sinh', 'cosh', 'tanh', 'sec', 'csc', 'cot', 'if', 'pi', 'e', 'u', 'v'].sort((a, b) => b.length - a.length);
    const mapped = M.normalize(source).replace(/[a-z]+/g, word => {
      let offset = 0, result = '';
      while (offset < word.length) {
        const token = identifiers.find(name => word.startsWith(name, offset));
        if (!token) throw Error('參數曲面算式只能使用 u、v 與數學函數。');
        result += token === 'u' ? 'x' : token === 'v' ? 'y' : token; offset += token.length;
      }
      return result;
    });
    const fn = compile(mapped, ['x', 'y']);
    return { evaluate: scope => fn.evaluate({ x: scope.u, y: scope.v }) };
  }
  function build(objects, options = {}) {
    if (!Array.isArray(objects) || objects.length > 64) throw Error('場景最多可建立 64 個幾何物件。');
    const bounds = validBounds(options.bounds || autoBounds(objects)), n = clamp(Math.floor(Number(options.resolution)) || 28, 8, 56);
    const triangles = [], segments = [], points = [], stats = { objects: objects.length, triangles: 0, segments: 0, points: 0, evaluations: 0, skipped: 0, warnings: [], budgetExhausted: false };
    const span = Math.max(bounds[1] - bounds[0], bounds[3] - bounds[2], bounds[5] - bounds[4]);
    const inside = p => finitePoint(p) && p.every((v, k) => v >= bounds[k * 2] - 1e-9 && v <= bounds[k * 2 + 1] + 1e-9);
    const budget = () => { if (triangles.length >= 85000 || segments.length >= 50000 || stats.evaluations >= 300000) { stats.budgetExhausted = true; return false; } return true; };
    objects.forEach((object, index) => {
      if (!object || typeof object !== 'object') { stats.warnings.push('物件資料不正確。'); return; }
      const objectId = object.id || object.label || 'object-' + index, color = typeof object.color === 'string' && /^#[0-9a-f]{6}$/i.test(object.color) ? object.color : COLORS[index % COLORS.length];
      const segment = (a, b, customColor = color) => { if (!budget()) return; const clipped = clipSegment(a, b, bounds); if (clipped && norm(sub(clipped[1], clipped[0])) > span * 1e-10) segments.push({ a: clipped[0], b: clipped[1], color: customColor, objectId }); };
      const triangle = (a, b, c) => {
        if (!budget() || ![a, b, c].every(finitePoint)) return;
        const polygon = clipPolygon([a, b, c], bounds);
        for (let k = 1; k < polygon.length - 1 && budget(); k++) if (norm(cross(sub(polygon[k], polygon[0]), sub(polygon[k + 1], polygon[0]))) > span * span * 1e-14) triangles.push({ points: [polygon[0], polygon[k], polygon[k + 1]], color, objectId });
      };
      const point = (p, label = object.label || '') => { if (inside(p)) points.push({ position: p.slice(), label: String(label).slice(0, 80), color, objectId }); };
      const arrow = (a, b) => {
        const direction = sub(b, a), length = norm(direction); if (!(length > 1e-10)) return;
        segment(a, b); if (!inside(b)) return;
        const { n: axis, u, v } = basis(direction), size = Math.min(length * .15, span * .035), base = sub(b, mul(axis, size));
        for (const side of [u, v]) for (const sign of [-1, 1]) segment(b, add(base, mul(side, size * .38 * sign)));
      };
      const ring = (center, normal, radius, count = n * 2) => {
        const { u, v } = basis(normal); return Array.from({ length: count }, (_, i) => add(center, add(mul(u, radius * Math.cos(i * 2 * Math.PI / count)), mul(v, radius * Math.sin(i * 2 * Math.PI / count)))));
      };
      const band = (a, b, close = true) => {
        for (let k = 0; k < a.length - (close ? 0 : 1); k++) { const next = (k + 1) % a.length; triangle(a[k], a[next], b[next]); triangle(a[k], b[next], b[k]); }
      };
      const polygon = (vertices, outline = true) => {
        if (!Array.isArray(vertices) || vertices.length < 3 || !vertices.every(finitePoint)) return;
        for (let k = 1; k < vertices.length - 1; k++) triangle(vertices[0], vertices[k], vertices[k + 1]);
        if (outline) for (let k = 0; k < vertices.length; k++) segment(vertices[k], vertices[(k + 1) % vertices.length]);
      };
      const evaluate = (fn, scope) => { if (!budget()) return NaN; stats.evaluations++; return fn.evaluate(scope); };
      try {
        if (object.type === 'point') { if (!finitePoint(object.position)) throw Error('點的座標不正確。'); point(object.position); }
        else if (object.type === 'segment') { segment(object.a, object.b); if (object.label) point(lerp(object.a, object.b, .5)); }
        else if (object.type === 'vector') {
          const origin = object.origin || [0, 0, 0]; if (![origin, object.direction].every(finitePoint)) throw Error('向量座標不正確。');
          const tip = add(origin, object.direction); arrow(origin, tip); point(tip);
        } else if (object.type === 'line') {
          const origin = object.point, direction = object.direction; if (![origin, direction].every(finitePoint) || norm(direction) < 1e-12) throw Error('直線方向不可為零。');
          let low = -Infinity, high = Infinity;
          for (let k = 0; k < 3; k++) {
            if (Math.abs(direction[k]) < 1e-14) { if (origin[k] < bounds[k * 2] || origin[k] > bounds[k * 2 + 1]) { low = 1; high = 0; break; } }
            else { let a = (bounds[k * 2] - origin[k]) / direction[k], b = (bounds[k * 2 + 1] - origin[k]) / direction[k]; if (a > b) [a, b] = [b, a]; low = Math.max(low, a); high = Math.min(high, b); }
          }
          if (low <= high && [low, high].every(Number.isFinite)) { const a = add(origin, mul(direction, low)), b = add(origin, mul(direction, high)); segment(a, b); point(lerp(a, b, .5)); }
        } else if (object.type === 'plane') {
          const normal = object.normal, constant = object.constant;
          if (!finitePoint(normal) || !Number.isFinite(constant)) throw Error('平面係數不正確。');
          const { n: unit, u, v } = basis(normal), corners = Array.from({ length: 8 }, (_, i) => [bounds[i & 1], bounds[2 + ((i >> 1) & 1)], bounds[4 + ((i >> 2) & 1)]]), intersections = [];
          const retain = p => { if (!intersections.some(q => norm(sub(p, q)) < span * 1e-9)) intersections.push(p); };
          for (let i = 0; i < 8; i++) for (let k = 0; k < 3; k++) { const j = i ^ (1 << k); if (j < i) continue; const a = corners[i], b = corners[j], fa = dot(normal, a) - constant, fb = dot(normal, b) - constant;
            if (Math.abs(fa) < norm(normal) * span * 1e-10) retain(a);
            if (Math.abs(fb) < norm(normal) * span * 1e-10) retain(b);
            if (fa * fb < 0) retain(lerp(a, b, fa / (fa - fb)));
          }
          if (intersections.length >= 3) {
            const center = mul(intersections.reduce((sum, p) => add(sum, p), [0, 0, 0]), 1 / intersections.length);
            intersections.sort((a, b) => Math.atan2(dot(sub(a, center), v), dot(sub(a, center), u)) - Math.atan2(dot(sub(b, center), v), dot(sub(b, center), u)));
            polygon(intersections); point(center); if (object.showNormal !== false) arrow(center, add(center, mul(unit, span * .15)));
          }
        } else if (object.type === 'sphere') {
          const center = object.center, radius = object.radius; if (!finitePoint(center) || !Number.isFinite(radius) || radius <= 0) throw Error('球半徑必須大於零。');
          const north = add(center, [0, 0, radius]), south = add(center, [0, 0, -radius]); let previous;
          for (let j = 1; j < n; j++) {
            const phi = Math.PI * j / n, current = ring(add(center, [0, 0, radius * Math.cos(phi)]), [0, 0, 1], radius * Math.sin(phi));
            if (previous) band(current, previous); else for (let i = 0; i < current.length; i++) triangle(north, current[i], current[(i + 1) % current.length]);
            previous = current;
          }
          for (let i = 0; i < previous.length; i++) triangle(south, previous[(i + 1) % previous.length], previous[i]);
          point(center); if (object.showRadius) segment(center, add(center, [radius, 0, 0]));
        } else if (object.type === 'circle') {
          if (!finitePoint(object.center) || !finitePoint(object.normal) || !Number.isFinite(object.radius) || object.radius < 0) throw Error('截圓資料不正確。');
          if (object.radius === 0) point(object.center); else { const vertices = ring(object.center, object.normal, object.radius); for (let i = 0; i < vertices.length; i++) segment(vertices[i], vertices[(i + 1) % vertices.length]); point(object.center); }
        } else if (object.type === 'cylinder' || object.type === 'cone') {
          const cone = object.type === 'cone', center = cone ? object.vertex : object.center;
          if (!finitePoint(center)) throw Error('曲面中心座標不正確。');
          const coefficient = cone ? object.slope : object.radius; if (!Number.isFinite(coefficient) || coefficient <= 0) throw Error('曲面尺度必須大於零。');
          const axis = ['x', 'y', 'z'].includes(object.axis) ? ['x', 'y', 'z'].indexOf(object.axis) : 2, normal = [0, 0, 0]; normal[axis] = 1;
          const low = Math.max(bounds[axis * 2], object.domain?.[0] ?? bounds[axis * 2]), high = Math.min(bounds[axis * 2 + 1], object.domain?.[1] ?? bounds[axis * 2 + 1]);
          if (high <= low) return;
          const zs = Array.from({ length: n + 1 }, (_, j) => low + (high - low) * j / n);
          if (cone && center[axis] > low && center[axis] < high) zs.push(center[axis]); zs.sort((a, b) => a - b);
          let previous; for (const z of zs) { const position = center.slice(); position[axis] = z; const current = ring(position, normal, cone ? coefficient * Math.abs(z - center[axis]) : coefficient); if (previous) band(previous, current); previous = current; }
        } else if (object.type === 'polyhedron' || object.type === 'polygon') {
          const vertices = object.points;
          if (!Array.isArray(vertices) || vertices.length > 128 || !vertices.every(finitePoint)) throw Error('多面體頂點不正確。');
          const faces = object.type === 'polygon' ? [vertices.map((_, i) => i)] : object.faces || (vertices.length === 4 ? [[0, 2, 1], [0, 1, 3], [1, 2, 3], [2, 0, 3]] : []);
          if (!Array.isArray(faces) || faces.length > 128) throw Error('多面體面數超出範圍。');
          for (const face of faces) { if (!Array.isArray(face) || face.length < 3 || face.length > 64 || face.some(i => !Number.isInteger(i) || !vertices[i])) throw Error('多面體面索引不正確。'); polygon(face.map(i => vertices[i])); }
          if (object.label) point(mul(vertices.reduce((sum, p) => add(sum, p), [0, 0, 0]), 1 / vertices.length));
        } else if (object.type === 'parametric') {
          const expressions = Array.isArray(object.expressions) ? object.expressions : ['x', 'y', 'z'].map(k => object.expressions?.[k]);
          if (expressions.length !== 3) throw Error('空間參數曲線須有三個算式。');
          const functions = expressions.map(source => compile(source, ['t'])), domain = object.domain || [0, 2 * Math.PI];
          if (!Array.isArray(domain) || domain.length !== 2 || !domain.every(Number.isFinite) || domain[1] <= domain[0] || domain[1] - domain[0] > 1000) throw Error('參數範圍不正確。');
          const count = n * 12, at = t => functions.map(fn => evaluate(fn, { t })); let previous = at(domain[0]);
          for (let i = 1; i <= count; i++) {
            const t = domain[0] + (domain[1] - domain[0]) * i / count, current = at(t), middle = at(t - (domain[1] - domain[0]) / (count * 2));
            if ([previous, current, middle].every(finitePoint) && norm(sub(middle, lerp(previous, current, .5))) <= span * .025) segment(previous, current); else stats.skipped++;
            previous = current;
          }
        } else if (object.type === 'parametricSurface') {
          const expressions = Array.isArray(object.expressions) ? object.expressions : ['x', 'y', 'z'].map(k => object.expressions?.[k]);
          if (expressions.length !== 3) throw Error('參數曲面須有三個算式。');
          const functions = expressions.map(compileUV), domains = object.domains || [[-2, 2], [0, 2 * Math.PI]], resolution = Math.min(n, 40);
          if (!Array.isArray(domains) || domains.length !== 2 || domains.some(d => !Array.isArray(d) || d.length !== 2 || !d.every(Number.isFinite) || d[1] <= d[0] || d[1] - d[0] > 1000)) throw Error('曲面參數範圍不正確。');
          const [du, dv] = domains, at = (u, v) => functions.map(fn => evaluate(fn, { u, v }));
          const nodes = Array.from({ length: (resolution + 1) ** 2 }, (_, i) => at(du[0] + (du[1] - du[0]) * (i % (resolution + 1)) / resolution, dv[0] + (dv[1] - dv[0]) * Math.floor(i / (resolution + 1)) / resolution));
          for (let j = 0; j < resolution; j++) for (let i = 0; i < resolution; i++) {
            const start = j * (resolution + 1) + i, corners = [nodes[start], nodes[start + 1], nodes[start + resolution + 2], nodes[start + resolution + 1]];
            if (!corners.every(finitePoint)) { stats.skipped++; continue; }
            const u0 = du[0] + (du[1] - du[0]) * i / resolution, u1 = du[0] + (du[1] - du[0]) * (i + 1) / resolution, v0 = dv[0] + (dv[1] - dv[0]) * j / resolution, v1 = dv[0] + (dv[1] - dv[0]) * (j + 1) / resolution;
            const middle = at((u0 + u1) / 2, (v0 + v1) / 2), average = mul(corners.reduce((sum, p) => add(sum, p), [0, 0, 0]), .25), spread = Math.max(...corners.map(p => norm(sub(p, average))));
            let continuous = finitePoint(middle) && norm(sub(middle, average)) <= Math.max(span * .025, spread * .65);
            const parameterEdges = [[u0, (v0 + v1) / 2], [(u0 + u1) / 2, v0], [u1, (v0 + v1) / 2], [(u0 + u1) / 2, v1]];
            const correspondingCorners = [[3, 0], [0, 1], [1, 2], [2, 3]];
            for (let k = 0; continuous && k < 4; k++) {
              const midpoint = at(...parameterEdges[k]), [a, b] = correspondingCorners[k].map(index => corners[index]);
              continuous = finitePoint(midpoint) && norm(sub(midpoint, lerp(a, b, .5))) <= Math.max(span * .025, norm(sub(a, b)) * .65);
            }
            if (!continuous) { stats.skipped++; continue; }
            for (let k = 0; k < 4; k++) triangle(corners[k], corners[(k + 1) % 4], middle);
          }
        } else if (object.type === 'surface') {
          const fn = compile(String(object.expression || '').replace(/^z\s*=\s*/i, ''), ['x', 'y']);
          const d = object.domain || bounds.slice(0, 4), lowX = Math.max(bounds[0], d[0]), highX = Math.min(bounds[1], d[1]), lowY = Math.max(bounds[2], d[2]), highY = Math.min(bounds[3], d[3]);
          if (![lowX, highX, lowY, highY].every(Number.isFinite) || highX <= lowX || highY <= lowY) throw Error('曲面定義域不正確。');
          const at = (x, y) => { const z = evaluate(fn, { x, y }); return Number.isFinite(z) ? [x, y, z] : null; };
          const nodes = Array.from({ length: (n + 1) ** 2 }, (_, i) => at(lowX + (highX - lowX) * (i % (n + 1)) / n, lowY + (highY - lowY) * Math.floor(i / (n + 1)) / n));
          for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
            const start = j * (n + 1) + i, corners = [nodes[start], nodes[start + 1], nodes[start + n + 2], nodes[start + n + 1]];
            if (corners.some(p => !p)) { stats.skipped++; continue; }
            const center = at((corners[0][0] + corners[2][0]) / 2, (corners[0][1] + corners[2][1]) / 2), spread = Math.max(...corners.map(p => p[2])) - Math.min(...corners.map(p => p[2])), tolerance = Math.max((bounds[5] - bounds[4]) * .025, spread * .65);
            let continuous = center && Math.abs(center[2] - corners.reduce((sum, p) => sum + p[2], 0) / 4) <= tolerance;
            for (let k = 0; continuous && k < 4; k++) { const a = corners[k], b = corners[(k + 1) % 4], mid = at((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); continuous = mid && Math.abs(mid[2] - (a[2] + b[2]) / 2) <= Math.max((bounds[5] - bounds[4]) * .025, Math.abs(a[2] - b[2]) * .65); }
            if (!continuous) { stats.skipped++; continue; }
            for (let k = 0; k < 4; k++) triangle(corners[k], corners[(k + 1) % 4], center);
          }
        } else if (object.type === 'revolution') {
          const axis = object.axis === 'y' ? 'y' : 'x', fn = compile(object.expression, [axis, 'x']), innerFn = object.innerExpression ? compile(object.innerExpression, [axis, 'x']) : null, domain = object.domain || [0, 3];
          if (!Array.isArray(domain) || domain.length !== 2 || !domain.every(Number.isFinite) || domain[1] <= domain[0] || domain[1] - domain[0] > 1000) throw Error('旋轉區間不正確。');
          const radiusAt = t => { const scope = { [axis]: t, x: t }, outer = evaluate(fn, scope), inner = innerFn ? evaluate(innerFn, scope) : 0; return Number.isFinite(outer) && Number.isFinite(inner) && outer >= 0 && inner >= 0 && inner <= outer ? { outer, inner } : null; };
          const makeRing = (t, radius) => ring(axis === 'x' ? [t, 0, 0] : [0, t, 0], axis === 'x' ? [1, 0, 0] : [0, 1, 0], radius);
          const samples = Array.from({ length: n + 1 }, (_, i) => { const t = domain[0] + (domain[1] - domain[0]) * i / n, r = radiusAt(t); return r && { t, ...r, outerRing: makeRing(t, r.outer), innerRing: makeRing(t, r.inner) }; });
          for (let i = 0; i < n; i++) {
            const a = samples[i], b = samples[i + 1], mid = radiusAt(domain[0] + (domain[1] - domain[0]) * (i + .5) / n);
            if (!a || !b || !mid || Math.abs(mid.outer - (a.outer + b.outer) / 2) > Math.max(span * .025, Math.abs(a.outer - b.outer) * .65)) { stats.skipped++; continue; }
            band(a.outerRing, b.outerRing); if (a.inner > 0 || b.inner > 0) band(b.innerRing, a.innerRing);
            if (i === 0 || !samples[i - 1]) band(a.innerRing, a.outerRing);
            if (i === n - 1 || !samples[i + 2]) band(b.outerRing, b.innerRing);
          }
        } else if (object.type === 'implicit') {
          const fn = compile(residual(object.expression), ['x', 'y', 'z']), resolution = Math.min(n, 24), d = object.domain?.length === 6 ? object.domain : bounds;
          const domain = bounds.map((v, i) => i % 2 ? Math.min(v, d[i]) : Math.max(v, d[i])); validBounds(domain);
          const count = resolution + 1, nodes = [], values = [], edgeCache = new Map();
          const cubeVertices = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], tetrahedra = [[0, 1, 2, 6], [0, 2, 3, 6], [0, 3, 7, 6], [0, 7, 4, 6], [0, 4, 5, 6], [0, 5, 1, 6]], tetraEdges = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]];
          const indexOf = (i, j, k) => (k * count + j) * count + i;
          const valueAt = p => evaluate(fn, { x: p[0], y: p[1], z: p[2] });
          for (let k = 0; k < count; k++) for (let j = 0; j < count; j++) for (let i = 0; i < count; i++) { const p = [domain[0] + (domain[1] - domain[0]) * i / resolution, domain[2] + (domain[3] - domain[2]) * j / resolution, domain[4] + (domain[5] - domain[4]) * k / resolution]; nodes.push(p); values.push(valueAt(p)); }
          const edgePoint = (a, b) => {
            const key = a < b ? a + ':' + b : b + ':' + a; if (edgeCache.has(key)) return edgeCache.get(key);
            let lo = nodes[a], hi = nodes[b], flo = values[a], fhi = values[b], best = null, error = Infinity;
            if (flo === 0) best = lo; else if (fhi === 0) best = hi;
            else {
              const tolerance = Math.max(Math.abs(flo), Math.abs(fhi)) * .02;
              for (let iteration = 0; iteration < 9; iteration++) {
                const t = iteration === 0 ? clamp(flo / (flo - fhi), .01, .99) : .5, p = lerp(lo, hi, t), f = valueAt(p);
                if (!Number.isFinite(f)) { best = null; break; }
                if (Math.abs(f) < error) { error = Math.abs(f); best = p; }
                if (error <= tolerance * .05) break;
                if ((flo > 0) === (f > 0)) { lo = p; flo = f; } else { hi = p; fhi = f; }
              }
              if (error > tolerance) best = null;
            }
            edgeCache.set(key, best); return best;
          };
          for (let k = 0; k < resolution && budget(); k++) for (let j = 0; j < resolution && budget(); j++) for (let i = 0; i < resolution && budget(); i++) {
            const ids = cubeVertices.map(([x, y, z]) => indexOf(i + x, j + y, k + z));
            for (const tetra of tetrahedra) {
              const vertexIds = tetra.map(t => ids[t]), val = vertexIds.map(id => values[id]);
              if (!val.every(Number.isFinite) || val.every(v => v > 0) || val.every(v => v < 0) || val.every(v => v === 0)) continue;
              const crossings = []; let invalid = false;
              for (const [a, b] of tetraEdges) if (val[a] === 0 || val[b] === 0 || (val[a] > 0) !== (val[b] > 0)) {
                const p = edgePoint(vertexIds[a], vertexIds[b]); if (!p) { invalid = true; break; }
                if (!crossings.some(q => norm(sub(p, q)) < span * 1e-9)) crossings.push(p);
              }
              if (invalid || crossings.length < 3) { if (invalid) stats.skipped++; continue; }
              if (crossings.length === 4) {
                const center = mul(crossings.reduce((sum, p) => add(sum, p), [0, 0, 0]), .25), normal = cross(sub(crossings[1], crossings[0]), sub(crossings[2], crossings[0]));
                if (norm(normal) < 1e-12) continue; const { u, v } = basis(normal);
                crossings.sort((a, b) => Math.atan2(dot(sub(a, center), v), dot(sub(a, center), u)) - Math.atan2(dot(sub(b, center), v), dot(sub(b, center), u)));
              }
              polygon(crossings, false);
            }
          }
        } else throw Error('尚未支援此幾何物件。');
      } catch (error) { stats.warnings.push((String(object.label || object.type || '物件') + '：' + error.message).slice(0, 180)); }
    });
    stats.triangles = triangles.length; stats.segments = segments.length; stats.points = points.length;
    if (stats.budgetExhausted) stats.warnings.push('場景已達細節預算；可降低解析度或減少物件。');
    return { triangles, segments, points, bounds, stats };
  }
  function autoBounds(objects) {
    const samples = [[0, 0, 0]];
    const retain = p => { if (finitePoint(p) && p.every(v => Math.abs(v) <= 100000)) samples.push(p); };
    for (const object of (Array.isArray(objects) ? objects : []).slice(0, 64)) {
      if (!object) continue;
      if (object.type === 'sphere' && finitePoint(object.center) && Number.isFinite(object.radius)) for (let k = 0; k < 3; k++) for (const sign of [-1, 1]) { const p = object.center.slice(); p[k] += Math.abs(object.radius) * sign; retain(p); }
      else if (object.type === 'point') retain(object.position);
      else if (object.type === 'vector') { retain(object.origin || [0, 0, 0]); if (finitePoint(object.direction)) retain(add(object.origin || [0, 0, 0], object.direction)); }
      else if (object.type === 'line') { retain(object.point); if (finitePoint(object.point) && finitePoint(object.direction)) for (const sign of [-1, 1]) retain(add(object.point, mul(object.direction, sign * 2))); }
      else if (object.type === 'plane' && finitePoint(object.normal) && Number.isFinite(object.constant) && dot(object.normal, object.normal) > 0) retain(mul(object.normal, object.constant / dot(object.normal, object.normal)));
      else if (object.type === 'polyhedron' || object.type === 'polygon') (object.points || []).slice(0, 128).forEach(retain);
      else if (object.type === 'segment') { retain(object.a); retain(object.b); }
      else if (object.type === 'circle' && finitePoint(object.center) && Number.isFinite(object.radius)) for (let k = 0; k < 3; k++) for (const sign of [-1, 1]) { const p = object.center.slice(); p[k] += object.radius * sign; retain(p); }
      else if (object.type === 'cylinder' && finitePoint(object.center)) { const axis = ['x', 'y', 'z'].indexOf(object.axis || 'z'), size = [object.radius, object.radius, object.radius]; size[axis] = 3; retain(sub(object.center, size)); retain(add(object.center, size)); }
      else if (object.type === 'cone' && finitePoint(object.vertex)) { const axis = ['x', 'y', 'z'].indexOf(object.axis || 'z'), size = [3 * object.slope, 3 * object.slope, 3 * object.slope]; size[axis] = 3; retain(sub(object.vertex, size)); retain(add(object.vertex, size)); }
      else if (object.type === 'parametric') {
        try { const sources = Array.isArray(object.expressions) ? object.expressions : ['x', 'y', 'z'].map(k => object.expressions?.[k]), functions = sources.map(source => compile(source, ['t'])), d = object.domain || [0, Math.PI * 2]; for (let i = 0; i <= 24; i++) retain(functions.map(fn => fn.evaluate({ t: d[0] + (d[1] - d[0]) * i / 24 }))); } catch { /* Build reports invalid input. */ }
      } else if (object.type === 'parametricSurface') {
        try { const sources = Array.isArray(object.expressions) ? object.expressions : ['x', 'y', 'z'].map(k => object.expressions?.[k]), functions = sources.map(compileUV), domains = object.domains || [[-2, 2], [0, 2 * Math.PI]]; for (let i = 0; i <= 12; i++) for (let j = 0; j <= 12; j++) retain(functions.map(fn => fn.evaluate({ u: domains[0][0] + (domains[0][1] - domains[0][0]) * i / 12, v: domains[1][0] + (domains[1][1] - domains[1][0]) * j / 12 }))); } catch { /* Build reports invalid input. */ }
      } else if (object.type === 'revolution') {
        try { const axis = object.axis === 'y' ? 'y' : 'x', fn = compile(object.expression, [axis, 'x']), d = object.domain || [0, 3]; for (let i = 0; i <= 24; i++) { const t = d[0] + (d[1] - d[0]) * i / 24, r = fn.evaluate({ [axis]: t, x: t }); if (r >= 0) for (const sign of [-1, 1]) retain(axis === 'x' ? [t, sign * r, sign * r] : [sign * r, t, sign * r]); } } catch { /* Build reports invalid input. */ }
      } else if (object.type === 'surface') {
        try { const fn = compile(String(object.expression || '').replace(/^z\s*=\s*/i, ''), ['x', 'y']), d = object.domain || [-4, 4, -4, 4]; for (let i = 0; i <= 8; i++) for (let j = 0; j <= 8; j++) { const x = d[0] + (d[1] - d[0]) * i / 8, y = d[2] + (d[3] - d[2]) * j / 8; retain([x, y, fn.evaluate({ x, y })]); } } catch { /* Build reports invalid input. */ }
      } else if (object.type === 'implicit') { const d = object.domain?.length === 6 ? object.domain : [-4, 4, -4, 4, -4, 4]; for (const x of d.slice(0, 2)) for (const y of d.slice(2, 4)) for (const z of d.slice(4, 6)) retain([x, y, z]); }
    }
    if (samples.length === 1) return DEFAULT_BOUNDS.slice();
    const bounds = [];
    for (let k = 0; k < 3; k++) { const low = Math.min(...samples.map(p => p[k])), high = Math.max(...samples.map(p => p[k])), span = Math.max(4, high - low), center = (low + high) / 2; bounds.push(clamp(center - span * .62, -200000, 200000), clamp(center + span * .62, -200000, 200000)); }
    return bounds;
  }
  function fit(objects) {
    const bounds = autoBounds(objects); return { bounds, domain: bounds.slice(0, 4), height: Math.max(Math.abs(bounds[4]), Math.abs(bounds[5])), centerZ: (bounds[4] + bounds[5]) / 2, extent: Math.hypot(bounds[1] - bounds[0], bounds[3] - bounds[2], bounds[5] - bounds[4]) };
  }
  const api = { build, fit, autoBounds, clipSegment, clipPolygon, DEFAULT_BOUNDS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SpatialGeometryRender = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
