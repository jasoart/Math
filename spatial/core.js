/* Bounded, deterministic surface sampling. Uses the shared mathematical interpreter. */
(function (root) {
  'use strict';
  const M = typeof module !== 'undefined' && module.exports ? require('../graph/math.js') : root.GraphMath;
  const DEFAULT = { expression: '(x^2-y^2)/4', domain: [-4, 4, -4, 4], height: 6, camera: { yaw: -.72, pitch: .58, zoom: 1 }, mode: 'surface' };
  const PRESETS = [
    { id: 'saddle', name: '馬鞍曲面', expression: '(x^2-y^2)/4', note: '同一個原點，兩個方向的曲率。', domain: [-4, 4, -4, 4], height: 6 },
    { id: 'ripple', name: '同心波紋', expression: 'cos(sqrt(x^2+y^2))*exp(-(x^2+y^2)/30)', note: '距離決定相位，振幅向外消散。', domain: [-8, 8, -8, 8], height: 3 },
    { id: 'gaussian', name: '高斯山丘', expression: '3exp(-(x^2+y^2)/3)', note: '從中心平滑下降的鐘形曲面。', domain: [-4, 4, -4, 4], height: 5 },
    { id: 'wave', name: '交錯波面', expression: 'sin(x)*cos(y)', note: '沿著兩條軸，交織週期與節點。', domain: [-5, 5, -5, 5], height: 3 },
    { id: 'bowl', name: '拋物曲面', expression: '(x^2+y^2)/6', note: '任意垂直剖面，都是一條拋物線。', domain: [-4, 4, -4, 4], height: 6 },
    { id: 'hemisphere', name: '半球曲面', expression: 'sqrt(9-x^2-y^2)', note: '定義域的邊界，描繪出半球輪廓。', domain: [-3.3, 3.3, -3.3, 3.3], height: 4 }
  ];
  const clone = value => JSON.parse(JSON.stringify(value));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function compile(source) {
    if (typeof source !== 'string' || source.length > 480) throw Error('請輸入 1–480 字的曲面算式。');
    const result = M.compile(source.trim().replace(/^z\s*=\s*/i, ''));
    if (result.variables.some(v => v !== 'x' && v !== 'y')) throw Error('曲面可使用 x、y 與常數；請移除其他變數。');
    return (x, y) => result.evaluate({ x, y });
  }
  function validate(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('曲面資料格式不正確。');
    const expression = input.expression;
    compile(expression);
    const domain = input.domain;
    if (!Array.isArray(domain) || domain.length !== 4 || !domain.every(v => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 100)) throw Error('座標範圍須在 −100 到 100 之間。');
    if (domain[1] - domain[0] < .1 || domain[3] - domain[2] < .1) throw Error('每條座標軸的上限須至少大於下限 0.1。');
    const height = input.height;
    if (typeof height !== 'number' || !Number.isFinite(height) || height < .1 || height > 100) throw Error('高度顯示範圍須在 0.1 到 100 之間。');
    const camera = input.camera;
    if (!camera || !['yaw', 'pitch', 'zoom'].every(k => typeof camera[k] === 'number' && Number.isFinite(camera[k]))) throw Error('視角資料不正確。');
    if (Math.abs(camera.yaw) > 1e6 || camera.pitch < -.1 || camera.pitch > Math.PI / 2 || camera.zoom < .35 || camera.zoom > 3) throw Error('視角超出可用範圍。');
    if (!['surface', 'wire'].includes(input.mode)) throw Error('顯示模式不正確。');
    return { expression, domain: domain.slice(), height, camera: { yaw: camera.yaw % (Math.PI * 2), pitch: camera.pitch, zoom: camera.zoom }, mode: input.mode };
  }
  function sample(input, resolution = 48) {
    const state = validate(input), fn = compile(state.expression), [xmin, xmax, ymin, ymax] = state.domain;
    const n = clamp(Math.floor(Number(resolution)) || 48, 8, 72), dx = (xmax - xmin) / n, dy = (ymax - ymin) / n;
    const points = [], faces = []; let evaluations = 0, skipped = 0;
    const value = (x, y) => { evaluations++; const z = fn(x, y); return Number.isFinite(z) && Math.abs(z) <= state.height ? z : null; };
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
      const x = xmin + i * dx, y = ymin + j * dy, z = value(x, y);
      points.push(z === null ? null : [x, y, z]);
    }
    // Probe each cell center and edge. Gaps remain gaps; poles are never clamped into walls.
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const a = j * (n + 1) + i, ids = [a, a + 1, a + n + 2, a + n + 1], corners = ids.map(id => points[id]);
      if (corners.some(p => !p)) { skipped++; continue; }
      const x = xmin + (i + .5) * dx, y = ymin + (j + .5) * dy, z = value(x, y);
      if (z === null) { skipped++; continue; }
      const spread = Math.max(...corners.map(p => p[2])) - Math.min(...corners.map(p => p[2]));
      const tolerance = Math.max(state.height * .025, spread * .65);
      if (Math.abs(z - corners.reduce((s, p) => s + p[2], 0) / 4) > tolerance) { skipped++; continue; }
      let continuous = true;
      for (let k = 0; k < 4; k++) {
        const p = corners[k], q = corners[(k + 1) % 4], mid = value((p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
        if (mid === null || Math.abs(mid - (p[2] + q[2]) / 2) > Math.max(state.height * .025, Math.abs(p[2] - q[2]) * .65)) { continuous = false; break; }
      }
      if (!continuous) { skipped++; continue; }
      const center = points.length; points.push([x, y, z]);
      for (let k = 0; k < 4; k++) faces.push([ids[k], ids[(k + 1) % 4], center]);
    }
    const used = new Set(faces.flat()), heights = [...used].map(i => points[i][2]);
    return { points, faces, resolution: n, evaluations, skipped, min: heights.length ? Math.min(...heights) : null, max: heights.length ? Math.max(...heights) : null, domain: state.domain, height: state.height };
  }
  function project(point, camera, domain, width, height) {
    const span = Math.max(domain[1] - domain[0], domain[3] - domain[2]), scale = Math.min(width, height) * .62 / span * camera.zoom;
    const x = point[0] - (domain[0] + domain[1]) / 2, y = point[1] - (domain[2] + domain[3]) / 2;
    const horizontal = x * Math.cos(camera.yaw) - y * Math.sin(camera.yaw), depth = x * Math.sin(camera.yaw) + y * Math.cos(camera.yaw);
    return [width / 2 + horizontal * scale, height * .52 - (point[2] * Math.cos(camera.pitch) - depth * Math.sin(camera.pitch)) * scale, depth * Math.cos(camera.pitch) + point[2] * Math.sin(camera.pitch)];
  }
  const api = { DEFAULT, PRESETS, compile, validate, sample, project, clamp, clone };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SpatialMath = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
