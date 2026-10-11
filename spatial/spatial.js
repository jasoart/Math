(function () {
  'use strict';
  const S = window.SpatialMath, $ = id => document.getElementById(id), canvas = $('spatialCanvas'), ctx = canvas.getContext('2d');
  const STORAGE = 'mathlab-spatial', pointers = new Map();
  let state = S.clone(S.DEFAULT), mesh, frame = 0, width = 0, height = 0, report = {}, saveTimer, noticeTimer, previousDistance = 0;
  function notice(text) { $('spatialNotice').textContent = text; $('spatialNotice').hidden = false; clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { $('spatialNotice').hidden = true; }, 5000); }
  function save() { try { localStorage.setItem(STORAGE, JSON.stringify(state)); } catch { /* The scene remains usable when browser storage is unavailable. */ } }
  function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(save, 250); }
  function readInitial() {
    if (location.hash.startsWith('#scene=')) {
      try { if (location.hash.length > 5000) throw Error(); return S.validate(JSON.parse(decodeURIComponent(location.hash.slice(7)))); }
      catch { notice('分享連結的曲面資料無法讀取，已開啟起始曲面。'); return S.clone(S.DEFAULT); }
    }
    try { const stored = localStorage.getItem(STORAGE); if (stored && stored.length < 5000) return S.validate(JSON.parse(stored)); } catch { /* Invalid stored data cannot replace safe defaults. */ }
    return S.clone(S.DEFAULT);
  }
  function preset() { return S.PRESETS.find(p => p.expression === state.expression && p.domain.every((v, i) => state.domain[i] === v)); }
  function updateFields() {
    $('surfaceExpression').value = state.expression;
    ['xMin', 'xMax', 'yMin', 'yMax'].forEach((id, i) => { $(id).value = state.domain[i]; });
    $('heightLimit').value = state.height;
    $('surfaceMode').setAttribute('aria-pressed', String(state.mode === 'surface'));
    $('wireMode').setAttribute('aria-pressed', String(state.mode === 'wire'));
    const selected = preset();
    $('surfaceName').textContent = selected?.name || '自訂曲面';
    $('presetDescription').textContent = selected?.note || '每一次調整，都可以發現不同的空間關係。';
    document.querySelectorAll('[data-preset]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.preset === selected?.id)));
  }
  function error(message) { $('surfaceError').hidden = !message; $('surfaceError').textContent = message || ''; $('surfaceExpression').setAttribute('aria-invalid', String(!!message)); }
  function rebuild() {
    mesh = S.sample(state, 48);
    mesh.faceData = mesh.faces.map(ids => {
      const [a, b, c] = ids.map(i => mesh.points[i]), u = b.map((v, i) => v - a[i]), v = c.map((q, i) => q - a[i]);
      const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], magnitude = Math.hypot(...normal) || 1;
      const illumination = .35 + .65 * Math.abs((-normal[0] * .36 - normal[1] * .44 + normal[2] * .82) / magnitude);
      const t = mesh.max === mesh.min ? .5 : ((a[2] + b[2] + c[2]) / 3 - mesh.min) / (mesh.max - mesh.min);
      const color = [58 + 95 * t, 145 + 65 * t, 127 + 29 * t].map(value => Math.round(value * illumination + 14));
      return { ids, fill: `rgb(${color.join(',')})` };
    });
    $('surfaceCaption').textContent = mesh.faces.length ? `z ≈ ${format(mesh.min)} 至 ${format(mesh.max)} · ${mesh.faces.length.toLocaleString()} 個曲面片段${mesh.skipped ? ' · 留白處不顯示' : ''}` : '此範圍沒有可顯示的實數曲面。請調整算式或高度範圍。';
    canvas.setAttribute('aria-label', `${preset()?.name || '自訂曲面'}，z = ${state.expression}。方向鍵旋轉，加減鍵縮放，Home 重設視角。`);
    requestDraw();
  }
  function format(value) { return Number(value.toPrecision(4)).toString().replace('-', '−'); }
  function applyForm(event) {
    event?.preventDefault();
    try {
      const candidate = S.validate({ ...state, expression: $('surfaceExpression').value.trim(), domain: ['xMin', 'xMax', 'yMin', 'yMax'].map(id => $(id).value.trim() === '' ? NaN : Number($(id).value)), height: $('heightLimit').value.trim() === '' ? NaN : Number($('heightLimit').value) });
      state = candidate; error(''); window.MathKeyboard?.close(); updateFields(); rebuild(); save();
    } catch (e) { error(e.message); }
  }
  function requestDraw() { if (!frame) frame = requestAnimationFrame(draw); }
  function project(point) { return S.project(point, state.camera, state.domain, width, height); }
  function path(points, close = false) { ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); if (close) ctx.closePath(); }
  function line(a, b, color, lineWidth = 1) { path([project(a), project(b)]); ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.stroke(); }
  function label(text, point, color, offset = [0, 0]) {
    const p = project(point); ctx.font = '11px ui-monospace, SFMono-Regular, Consolas, monospace'; ctx.fillStyle = color;
    const w = ctx.measureText(text).width, x = S.clamp(p[0] + offset[0], 10, width - w - 10), y = S.clamp(p[1] + offset[1], 18, height - 19);
    ctx.fillText(text, x, y);
  }
  function ticks(min, max) {
    const raw = (max - min) / 6, power = 10 ** Math.floor(Math.log10(raw)), step = [1, 2, 5, 10].find(v => v * power >= raw) * power;
    const result = []; for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-8 && result.length < 20; v += step) result.push(Math.abs(v) < step * 1e-8 ? 0 : v); return result;
  }
  function draw() {
    frame = 0; if (!mesh || !width || !height) return;
    const dpr = Math.min(devicePixelRatio || 1, 2); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const background = ctx.createRadialGradient(width * .5, height * .43, 0, width * .5, height * .5, Math.max(width, height) * .7);
    background.addColorStop(0, '#1d3b34'); background.addColorStop(1, '#0d2428'); ctx.fillStyle = background; ctx.fillRect(0, 0, width, height);
    const [xmin, xmax, ymin, ymax] = state.domain, span = Math.max(xmax - xmin, ymax - ymin), xorigin = S.clamp(0, xmin, xmax), yorigin = S.clamp(0, ymin, ymax);
    path([[xmin, ymin, 0], [xmax, ymin, 0], [xmax, ymax, 0], [xmin, ymax, 0]].map(project), true); ctx.fillStyle = '#253e3430'; ctx.fill(); ctx.strokeStyle = '#5f897033'; ctx.lineWidth = 1; ctx.stroke();
    const xticks = ticks(xmin, xmax), yticks = ticks(ymin, ymax);
    xticks.forEach(x => line([x, ymin, 0], [x, ymax, 0], '#63856a33', .7));
    yticks.forEach(y => line([xmin, y, 0], [xmax, y, 0], '#63856a33', .7));
    line([xmin, yorigin, 0], [xmax, yorigin, 0], '#bba57685'); line([xorigin, ymin, 0], [xorigin, ymax, 0], '#80b6a695');
    const projected = mesh.points.map(p => p ? project(p) : null);
    const faces = mesh.faceData.map(face => ({ ...face, depth: face.ids.reduce((sum, i) => sum + projected[i][2], 0) / 3 }));
    faces.sort((a, b) => a.depth - b.depth);
    for (const face of faces) {
      path(face.ids.map(i => projected[i]), true);
      if (state.mode === 'surface') { ctx.fillStyle = face.fill; ctx.fill(); ctx.strokeStyle = face.fill; ctx.lineWidth = .45; ctx.stroke(); }
      else { ctx.strokeStyle = '#9bd4b463'; ctx.lineWidth = .6; ctx.stroke(); }
    }
    // Sparse lattice brings out curvature without hiding the smooth lighting.
    if (state.mode === 'surface') {
      ctx.lineWidth = .45; ctx.strokeStyle = '#254f423d';
      for (const face of faces) if (face.ids[0] % 4 === 0) { path(face.ids.slice(0, 2).map(i => projected[i])); ctx.stroke(); }
    }
    const zextent = Math.min(state.height, span * .38);
    line([xmin, ymin, 0], [xmin, ymin, zextent], '#c6d7b978', .8);
    label('x', [xmax, yorigin, 0], '#ddc798', [12, 4]); label('y', [xorigin, ymax, 0], '#a5d6c1', [9, 4]); label('z', [xmin, ymin, zextent], '#d7e5c7', [-4, -10]);
    xticks.filter((v, i) => i % 2 === 0).forEach(v => label(format(v), [v, ymin, 0], '#8ca493', [-4, 20]));
    yticks.filter((v, i) => i % 2 === 0).forEach(v => label(format(v), [xmax, v, 0], '#8ca493', [11, 9]));
    if (!mesh.faces.length) { ctx.textAlign = 'center'; ctx.fillStyle = '#bdd1be'; ctx.font = '14px sans-serif'; ctx.fillText('這裡還沒有可顯示的曲面', width / 2, height * .44); ctx.textAlign = 'left'; }
    report = { faces: mesh.faces.length, evaluations: mesh.evaluations, skipped: mesh.skipped, resolution: mesh.resolution, width, height, camera: { ...state.camera }, mode: state.mode, expression: state.expression, min: mesh.min, max: mesh.max };
    canvas.dataset.faces = String(mesh.faces.length);
  }
  function resize() { const rect = canvas.getBoundingClientRect(); width = rect.width; height = rect.height; const dpr = Math.min(devicePixelRatio || 1, 2); canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); requestDraw(); }
  function zoom(factor) { state.camera.zoom = S.clamp(state.camera.zoom * factor, .35, 3); requestDraw(); scheduleSave(); }
  function view(name) { state.camera = name === 'top' ? { yaw: 0, pitch: Math.PI / 2, zoom: state.camera.zoom } : name === 'front' ? { yaw: 0, pitch: 0, zoom: state.camera.zoom } : S.clone(S.DEFAULT.camera); requestDraw(); save(); }
  function pointerDistance() { const [a, b] = [...pointers.values()]; return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0; }
  canvas.addEventListener('pointerdown', event => { if (event.pointerType === 'mouse' && event.button !== 0) return; window.MathKeyboard?.close(); canvas.focus({ preventScroll: true }); canvas.setPointerCapture(event.pointerId); pointers.set(event.pointerId, { x: event.clientX, y: event.clientY }); previousDistance = pointerDistance(); });
  canvas.addEventListener('pointermove', event => {
    const previous = pointers.get(event.pointerId); if (!previous) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size > 1) { const distance = pointerDistance(); if (previousDistance > 0 && distance > 0) zoom(distance / previousDistance); previousDistance = distance; }
    else { state.camera.yaw = (state.camera.yaw + (event.clientX - previous.x) * .008) % (Math.PI * 2); state.camera.pitch = S.clamp(state.camera.pitch + (event.clientY - previous.y) * .008, -.1, Math.PI / 2); requestDraw(); scheduleSave(); }
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(type, event => { pointers.delete(event.pointerId); previousDistance = pointerDistance(); scheduleSave(); });
  canvas.addEventListener('wheel', event => { event.preventDefault(); zoom(Math.exp(-S.clamp(event.deltaY, -200, 200) * .0015)); }, { passive: false });
  canvas.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const rotations = { ArrowLeft: [-.12, 0], ArrowRight: [.12, 0], ArrowUp: [0, .1], ArrowDown: [0, -.1] };
    if (rotations[event.key]) { event.preventDefault(); const [yaw, pitch] = rotations[event.key]; state.camera.yaw = (state.camera.yaw + yaw) % (Math.PI * 2); state.camera.pitch = S.clamp(state.camera.pitch + pitch, -.1, Math.PI / 2); requestDraw(); scheduleSave(); }
    else if (['+', '=', '-', '_', 'Home'].includes(event.key)) { event.preventDefault(); if (event.key === 'Home') view('home'); else zoom(['+', '='].includes(event.key) ? 1.15 : 1 / 1.15); }
  });
  const presetPaths = ['M2 5Q13 22 26 5M2 19Q13 2 26 19M7 3Q13 15 21 21', 'M1 12Q7 1 13 12T27 12M3 16Q13 4 25 16M6 20Q13 12 20 20', 'M1 21Q6 21 9 8Q13-3 17 8Q21 21 27 21M5 21Q13 0 23 21', 'M1 7Q7-3 13 7T27 7M1 14Q7 4 13 14T27 14M1 21Q7 11 13 21T27 21', 'M2 4Q13 33 26 4M6 3Q13 29 22 3M3 11Q13 24 25 11', 'M2 20A12 16 0 0 1 26 20M7 20A7 16 0 0 1 21 20M2 20Q13 27 26 20'];
  S.PRESETS.forEach((item, i) => {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.preset = item.id;
    button.innerHTML = `<svg viewBox="0 0 28 28" aria-hidden="true"><path d="${presetPaths[i]}" fill="none" stroke="currentColor" stroke-width="1.1"/></svg><span></span>`; button.querySelector('span').textContent = item.name;
    button.addEventListener('click', () => { state = S.validate({ ...state, expression: item.expression, domain: item.domain, height: item.height }); error(''); window.MathKeyboard?.close(); updateFields(); rebuild(); save(); });
    $('surfacePresets').append(button);
  });
  $('surfaceForm').addEventListener('submit', applyForm);
  $('surfaceExpression').addEventListener('change', applyForm);
  ['surface', 'wire'].forEach(mode => { $(mode + 'Mode').addEventListener('click', () => { state.mode = mode; $(mode + 'Mode').setAttribute('aria-pressed', 'true'); $(mode === 'surface' ? 'wireMode' : 'surfaceMode').setAttribute('aria-pressed', 'false'); requestDraw(); save(); }); });
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => view(button.dataset.view)));
  $('zoomIn').addEventListener('click', () => zoom(1.2)); $('zoomOut').addEventListener('click', () => zoom(1 / 1.2));
  $('shareSurface').addEventListener('click', () => {
    window.MathKeyboard?.close(); const url = new URL(location.href); url.hash = 'scene=' + encodeURIComponent(JSON.stringify(state));
    $('spatialShareURL').value = url.href; $('spatialShareStatus').textContent = ''; $('spatialShareDialog').showModal(); $('spatialShareURL').focus(); $('spatialShareURL').select();
  });
  $('copySpatialShare').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('spatialShareURL').value); $('spatialShareStatus').textContent = '連結已複製。'; }
    catch { $('spatialShareURL').focus(); $('spatialShareURL').select(); $('spatialShareStatus').textContent = '請按 Ctrl / ⌘ + C 複製選取的連結。'; }
  });
  $('exportSurface').addEventListener('click', () => {
    window.MathKeyboard?.close(); if (frame) { cancelAnimationFrame(frame); draw(); }
    const output = document.createElement('canvas'), scale = canvas.width / width, exportWidth = canvas.width;
    const text = 'z = ' + state.expression, lines = [];
    let current = ''; const temp = output.getContext('2d'); temp.font = `${12 * scale}px ui-monospace, monospace`;
    for (const ch of text) { if (temp.measureText(current + ch).width > exportWidth - 56 * scale) { lines.push(current); current = ''; } current += ch; } if (current) lines.push(current);
    const footerHeight = (76 + lines.length * 19) * scale;
    output.width = exportWidth; output.height = canvas.height + footerHeight;
    const out = output.getContext('2d'); out.fillStyle = '#102829'; out.fillRect(0, 0, output.width, output.height); out.drawImage(canvas, 0, 0);
    out.fillStyle = '#cfe5cc'; out.font = `${11 * scale}px sans-serif`; out.fillText('MATH LAB / 數學工作室 · 立體繪圖', 28 * scale, canvas.height + 28 * scale);
    out.font = `${12 * scale}px ui-monospace, monospace`; out.fillStyle = '#9cbbab'; lines.forEach((line, i) => out.fillText(line, 28 * scale, canvas.height + (51 + i * 19) * scale));
    out.font = `${10 * scale}px sans-serif`; out.fillStyle = '#789789'; out.fillText(`x ∈ [${state.domain[0]}, ${state.domain[1]}]    y ∈ [${state.domain[2]}, ${state.domain[3]}]    |z| ≤ ${state.height}`, 28 * scale, output.height - 16 * scale);
    output.toBlob(blob => { if (!blob) return notice('圖片無法產生，請稍後再試。'); const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = 'mathlab-surface.png'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000); notice('曲面圖片已準備下載。'); }, 'image/png');
  });
  window.addEventListener('hashchange', () => { if (!location.hash.startsWith('#scene=')) return; state = readInitial(); error(''); updateFields(); rebuild(); });
  window.addEventListener('pagehide', save);
  window.SpatialStudio = { getState: () => S.clone(state), getRenderReport: () => S.clone(report) };
  state = readInitial(); updateFields(); window.MathKeyboard?.enhance($('surfaceExpression')); rebuild(); new ResizeObserver(resize).observe(canvas); resize();
})();
