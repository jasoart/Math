/* 高中動態幾何微型實驗室
 * 純前端 Canvas 版本：適合 GitHub Pages。
 * 擴充方式：在 modules 陣列新增物件，提供 controls、compute、draw 即可。
 */

const canvas = document.getElementById("plot");
const ctx = canvas.getContext("2d");
const moduleList = document.getElementById("moduleList");
const moduleSearch = document.getElementById("moduleSearch");
const controlsEl = document.getElementById("controls");
const moduleTitle = document.getElementById("moduleTitle");
const moduleTag = document.getElementById("moduleTag");
const examSignal = document.getElementById("examSignal");
const formulaBox = document.getElementById("formulaBox");
const promptBox = document.getElementById("promptBox");
const challengeBox = document.getElementById("challengeBox");
const liveStatus = document.getElementById("liveStatus");
const resetBtn = document.getElementById("resetBtn");
const exportBtn = document.getElementById("exportBtn");

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

const palette = {
  ink: "#182033",
  muted: "#657089",
  grid: "#e7ebf3",
  axis: "#8c97ad",
  blue: "#2f63ff",
  green: "#18a999",
  orange: "#f59e0b",
  red: "#ef4444",
  purple: "#7c3aed",
  fillBlue: "rgba(47, 99, 255, .12)",
  fillGreen: "rgba(24, 169, 153, .14)",
  fillOrange: "rgba(245, 158, 11, .14)",
  fillRed: "rgba(239, 68, 68, .12)"
};

function round(n, digits = 3) {
  const p = 10 ** digits;
  return Math.round((n + Number.EPSILON) * p) / p;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function norm(v) {
  return Math.hypot(v.x, v.y);
}

function dot(u, v) {
  return u.x * v.x + u.y * v.y;
}

function format(n, digits = 3) {
  if (!Number.isFinite(n)) return "—";
  const value = round(n, digits);
  return Object.is(value, -0) ? "0" : String(value);
}

function html(lines) {
  return lines.map(line => `<code>${line}</code>`).join("");
}

let canvasSize = {width: 1100, height: 720};
function setupCanvas() {
  const rect = canvas.getBoundingClientRect();
  // Bound backing-store memory while retaining crisp HiDPI rendering.
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvasSize = {width: rect.width, height: rect.height};
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function makePlane(options = {}) {
  const {width, height} = canvasSize;
  const scale = options.scale ?? Math.min(width, height) / 13;
  const origin = options.origin ?? { x: width / 2, y: height / 2 };
  return {
    width, height, scale, origin,
    sx: x => origin.x + x * scale,
    sy: y => origin.y - y * scale,
    px: p => origin.x + p.x * scale,
    py: p => origin.y - p.y * scale,
    point: p => ({ x: origin.x + p.x * scale, y: origin.y - p.y * scale }),
    vector: (p, q) => ({ x: (q.x - p.x) * scale, y: -(q.y - p.y) * scale })
  };
}

function clearCanvas() {
  const { width, height } = canvasSize;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
}

function drawGrid(plane, range = 8) {
  const { width, height, scale, origin } = plane;
  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = palette.grid;
  ctx.beginPath();

  const xStart = Math.floor(-origin.x / scale) - 1;
  const xEnd = Math.ceil((width - origin.x) / scale) + 1;
  for (let x = xStart; x <= xEnd; x++) {
    const sx = plane.sx(x);
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, height);
  }

  const yStart = Math.floor(-(height - origin.y) / scale) - 1;
  const yEnd = Math.ceil(origin.y / scale) + 1;
  for (let y = yStart; y <= yEnd; y++) {
    const sy = plane.sy(y);
    ctx.moveTo(0, sy);
    ctx.lineTo(width, sy);
  }
  ctx.stroke();

  ctx.strokeStyle = palette.axis;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, origin.y);
  ctx.lineTo(width, origin.y);
  ctx.moveTo(origin.x, 0);
  ctx.lineTo(origin.x, height);
  ctx.stroke();

  ctx.fillStyle = palette.muted;
  ctx.font = "12px ui-sans-serif, system-ui";
  ctx.fillText("x", width - 18, origin.y - 8);
  ctx.fillText("y", origin.x + 8, 16);
  ctx.restore();
}

function drawPoint(plane, p, label, color = palette.blue, radius = 5) {
  const sp = plane.point(p);
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(sp.x, sp.y, radius, 0, TAU);
  ctx.fill();
  if (label) {
    ctx.fillStyle = palette.ink;
    ctx.font = "700 13px ui-sans-serif, system-ui";
    ctx.fillText(label, sp.x + 8, sp.y - 8);
  }
  ctx.restore();
}

function drawSegment(plane, p, q, color = palette.blue, width = 3, dash = []) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(plane.sx(p.x), plane.sy(p.y));
  ctx.lineTo(plane.sx(q.x), plane.sy(q.y));
  ctx.stroke();
  ctx.restore();
}

function drawArrow(plane, p, q, color = palette.blue, width = 3, label = "") {
  const sp = plane.point(p);
  const sq = plane.point(q);
  const angle = Math.atan2(sq.y - sp.y, sq.x - sp.x);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(sp.x, sp.y);
  ctx.lineTo(sq.x, sq.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(sq.x, sq.y);
  ctx.lineTo(sq.x - 12 * Math.cos(angle - Math.PI / 7), sq.y - 12 * Math.sin(angle - Math.PI / 7));
  ctx.lineTo(sq.x - 12 * Math.cos(angle + Math.PI / 7), sq.y - 12 * Math.sin(angle + Math.PI / 7));
  ctx.closePath();
  ctx.fill();
  if (label) {
    ctx.fillStyle = palette.ink;
    ctx.font = "700 13px ui-sans-serif, system-ui";
    ctx.fillText(label, sq.x + 8, sq.y - 8);
  }
  ctx.restore();
}

function drawMathLabel(text, x, y, color = palette.ink) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,.86)";
  ctx.strokeStyle = "rgba(223,228,239,.9)";
  ctx.lineWidth = 1;
  const width = ctx.measureText(text).width + 18;
  ctx.beginPath();
  ctx.roundRect(x - 9, y - 18, width, 26, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = "700 13px ui-sans-serif, system-ui";
  ctx.fillText(text, x, y);
  ctx.restore();
}

function plotFunction(plane, f, xMin, xMax, color = palette.blue, width = 3, step = 0.02) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  let started = false;
  for (let x = xMin; x <= xMax; x += step) {
    const y = f(x);
    if (!Number.isFinite(y) || Math.abs(y) > 1e4) {
      started = false;
      continue;
    }
    const sx = plane.sx(x);
    const sy = plane.sy(y);
    if (!started) {
      ctx.moveTo(sx, sy);
      started = true;
    } else {
      ctx.lineTo(sx, sy);
    }
  }
  ctx.stroke();
  ctx.restore();
}

function drawCircle(plane, center, r, color = palette.blue, fill = "transparent", width = 3) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = fill;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(plane.sx(center.x), plane.sy(center.y), r * plane.scale, 0, TAU);
  if (fill !== "transparent") ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawInfiniteLine(plane, normal, c, color = palette.blue, width = 3, dash = []) {
  // n · x = c；方向向量為 (-ny, nx)
  const d = { x: -normal.y, y: normal.x };
  const p0 = { x: normal.x * c, y: normal.y * c };
  const far = 100;
  const p = { x: p0.x - d.x * far, y: p0.y - d.y * far };
  const q = { x: p0.x + d.x * far, y: p0.y + d.y * far };
  drawSegment(plane, p, q, color, width, dash);
}

function stateFromControls(module) {
  const state = {};
  for (const control of module.controls) {
    if (control.type === "select") {
      state[control.key] = String(control.value);
    } else {
      state[control.key] = Number(control.value);
    }
  }
  return state;
}

function setFormula(lines) {
  formulaBox.innerHTML = html(lines);
}

function dot3(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross3(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}

function norm3(v) {
  return Math.hypot(v.x, v.y, v.z);
}

function add3(a, b) {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function sub3(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function scale3(v, k) {
  return { x: v.x * k, y: v.y * k, z: v.z * k };
}

function unit2(v) {
  const length = Math.hypot(v.x, v.y);
  if (length < 1e-9) return { x: 0, y: 0 };
  return { x: v.x / length, y: v.y / length };
}

function getControlDisplay(control) {
  if (control.type === "select") {
    const selected = control.options.find(option => option.value === control.value);
    return selected ? selected.label : String(control.value);
  }
  return `${control.value}${control.unit ?? ""}`;
}

function drawContours(plane, f, levels, options = {}) {
  const xMin = options.xMin ?? -4;
  const xMax = options.xMax ?? 4;
  const yMin = options.yMin ?? -4;
  const yMax = options.yMax ?? 4;
  const step = options.step ?? 0.28;

  function edgePoint(a, b, level) {
    const denom = b.v - a.v;
    const t = Math.abs(denom) < 1e-9 ? 0.5 : (level - a.v) / denom;
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t
    };
  }

  ctx.save();
  ctx.lineWidth = options.width ?? 1.6;
  for (const level of levels) {
    ctx.strokeStyle = level === 0 ? "rgba(239, 68, 68, .62)" : "rgba(47, 99, 255, .22)";
    for (let x = xMin; x < xMax; x += step) {
      for (let y = yMin; y < yMax; y += step) {
        const p00 = { x, y, v: f(x, y) };
        const p10 = { x: x + step, y, v: f(x + step, y) };
        const p11 = { x: x + step, y: y + step, v: f(x + step, y + step) };
        const p01 = { x, y: y + step, v: f(x, y + step) };
        const pts = [];

        if ((p00.v - level) * (p10.v - level) <= 0 && p00.v !== p10.v) pts.push(edgePoint(p00, p10, level));
        if ((p10.v - level) * (p11.v - level) <= 0 && p10.v !== p11.v) pts.push(edgePoint(p10, p11, level));
        if ((p11.v - level) * (p01.v - level) <= 0 && p11.v !== p01.v) pts.push(edgePoint(p11, p01, level));
        if ((p01.v - level) * (p00.v - level) <= 0 && p01.v !== p00.v) pts.push(edgePoint(p01, p00, level));

        if (pts.length >= 2) {
          const a = pts[0];
          const b = pts[1];
          ctx.beginPath();
          ctx.moveTo(plane.sx(a.x), plane.sy(a.y));
          ctx.lineTo(plane.sx(b.x), plane.sy(b.y));
          ctx.stroke();
          if (pts.length === 4) {
            const c = pts[2];
            const d = pts[3];
            ctx.beginPath();
            ctx.moveTo(plane.sx(c.x), plane.sy(c.y));
            ctx.lineTo(plane.sx(d.x), plane.sy(d.y));
            ctx.stroke();
          }
        }
      }
    }
  }
  ctx.restore();
}

function drawArrowPixels(from, to, color = palette.blue, width = 3, label = "") {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - 12 * Math.cos(angle - Math.PI / 7), to.y - 12 * Math.sin(angle - Math.PI / 7));
  ctx.lineTo(to.x - 12 * Math.cos(angle + Math.PI / 7), to.y - 12 * Math.sin(angle + Math.PI / 7));
  ctx.closePath();
  ctx.fill();
  if (label) {
    ctx.fillStyle = palette.ink;
    ctx.font = "700 13px ui-sans-serif, system-ui";
    ctx.fillText(label, to.x + 8, to.y - 8);
  }
  ctx.restore();
}

function drawPointPixels(p, label, color = palette.blue, radius = 5) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, radius, 0, TAU);
  ctx.fill();
  if (label) {
    ctx.fillStyle = palette.ink;
    ctx.font = "700 13px ui-sans-serif, system-ui";
    ctx.fillText(label, p.x + 8, p.y - 8);
  }
  ctx.restore();
}

const modules = [
  {
    id: "circle-line",
    title: "圓與直線：距離、相切、最大最小",
    short: "圓心到直線距離",
    tag: "直線與圓",
    examSignal: "看到「圓上動點到直線距離的最大／最小」時，不要硬代點；先把問題轉成圓心到直線距離 d，再做 d ± r。",
    prompt: "拖曳直線與圓半徑，觀察何時相交、相切、相離。請判斷：當 d < r 時，圓上點到直線的最小距離為多少？",
    controls: [
      { key: "h", label: "圓心 h", min: -4, max: 4, step: 0.1, value: 1.2 },
      { key: "k", label: "圓心 k", min: -3, max: 3, step: 0.1, value: 0.8 },
      { key: "r", label: "半徑 r", min: 0.4, max: 3.8, step: 0.1, value: 1.8 },
      { key: "theta", label: "法向角 θ", min: 0, max: 180, step: 1, value: 35, unit: "°" },
      { key: "c", label: "直線常數 c", min: -5, max: 5, step: 0.1, value: 1.1 }
    ],
    compute(s) {
      const n = { x: Math.cos(s.theta * DEG), y: Math.sin(s.theta * DEG) };
      const signed = dot({ x: s.h, y: s.k }, n) - s.c;
      const d = Math.abs(signed);
      const foot = { x: s.h - signed * n.x, y: s.k - signed * n.y };
      const min = Math.max(0, d - s.r);
      const max = d + s.r;
      const relation = Math.abs(d - s.r) < 1e-3 ? "相切" : d < s.r ? "相交" : "相離";
      return { n, signed, d, foot, min, max, relation };
    },
    formula(s, m) {
      return [
        `直線：x cosθ + y sinθ = c`,
        `d = |h cosθ + k sinθ - c| = ${format(m.d)}`,
        `圓與直線關係：${m.relation}`,
        `圓上點到直線距離範圍：[${format(m.min)}, ${format(m.max)}]`
      ];
    },
    draw(s, m) {
      const plane = makePlane({ scale: Math.min(canvas.clientWidth, canvas.clientHeight) / 11 });
      drawGrid(plane);
      drawInfiniteLine(plane, m.n, s.c, palette.blue, 3);
      drawCircle(plane, { x: s.h, y: s.k }, s.r, palette.green, palette.fillGreen, 3);
      drawSegment(plane, { x: s.h, y: s.k }, m.foot, palette.orange, 3, [8, 7]);
      drawPoint(plane, { x: s.h, y: s.k }, "C", palette.green);
      drawPoint(plane, m.foot, "H", palette.orange);
      drawMathLabel(`d=${format(m.d)}，${m.relation}`, plane.sx(m.foot.x) + 10, plane.sy(m.foot.y) + 28);
    },
    status(s, m) {
      return `d=${format(m.d)}，r=${format(s.r)}，目前為「${m.relation}」。最大距離 ${format(m.max)}。`;
    }
  },
  {
    id: "parabola",
    title: "拋物線：焦點—準線定義",
    short: "拋物線的定義",
    tag: "二次曲線",
    examSignal: "看到「到定點與定直線距離相等」就是拋物線定義；先找焦點 F、準線，再建立標準式。",
    prompt: "移動點 P，驗證 PF 與 P 到準線距離永遠相等。請說明為什麼標準式會是 x² = 4py。",
    controls: [
      { key: "p", label: "焦距參數 p", min: 0.35, max: 3.2, step: 0.05, value: 1.2 },
      { key: "t", label: "動點 x=t", min: -5, max: 5, step: 0.05, value: 2.2 }
    ],
    compute(s) {
      const P = { x: s.t, y: (s.t ** 2) / (4 * s.p) };
      const F = { x: 0, y: s.p };
      const foot = { x: P.x, y: -s.p };
      const pf = norm({ x: P.x - F.x, y: P.y - F.y });
      const pd = Math.abs(P.y + s.p);
      return { P, F, foot, pf, pd };
    },
    formula(s, m) {
      return [
        `焦點 F=(0,p)=(${format(0)}, ${format(s.p)})，準線 y=-p=${format(-s.p)}`,
        `拋物線：x² = 4py，亦即 y = x²/(4p)`,
        `PF=${format(m.pf)}，P 到準線距離=${format(m.pd)}`,
        `誤差 |PF-PD|=${format(Math.abs(m.pf-m.pd), 6)}`
      ];
    },
    draw(s, m) {
      const plane = makePlane({ scale: Math.min(canvas.clientWidth, canvas.clientHeight) / 12 });
      drawGrid(plane);
      plotFunction(plane, x => x * x / (4 * s.p), -6, 6, palette.blue, 3);
      drawInfiniteLine(plane, { x: 0, y: 1 }, -s.p, palette.red, 2.5, [9, 7]);
      drawPoint(plane, m.F, "F", palette.red);
      drawPoint(plane, m.P, "P", palette.blue);
      drawSegment(plane, m.P, m.F, palette.orange, 3);
      drawSegment(plane, m.P, m.foot, palette.green, 3, [8, 7]);
      drawPoint(plane, m.foot, "D", palette.green);
      drawMathLabel(`PF = PD = ${format(m.pf)}`, plane.sx(m.P.x) + 12, plane.sy(m.P.y) - 18);
    },
    status(s, m) {
      return `PF=${format(m.pf)}，到準線距離=${format(m.pd)}，兩者相等形成拋物線。`;
    }
  },
  {
    id: "ellipse",
    title: "橢圓：雙焦點距離和",
    short: "橢圓定義",
    tag: "二次曲線",
    examSignal: "看到「到兩定點距離和為定值」就是橢圓；先找 a、b、c 的關係 c²=a²-b²。",
    prompt: "拖曳橢圓上的點 P，觀察 PF₁+PF₂ 是否固定。請用圖形解釋為什麼長軸長是 2a。",
    controls: [
      { key: "a", label: "半長軸 a", min: 1.8, max: 4.5, step: 0.05, value: 3.4 },
      { key: "b", label: "半短軸 b", min: 0.8, max: 3.2, step: 0.05, value: 1.8 },
      { key: "t", label: "參數角 t", min: 0, max: 360, step: 1, value: 45, unit: "°" }
    ],
    compute(s) {
      const a = Math.max(s.a, s.b + 0.05);
      const b = Math.min(s.b, a - 0.05);
      const c = Math.sqrt(Math.max(0, a * a - b * b));
      const P = { x: a * Math.cos(s.t * DEG), y: b * Math.sin(s.t * DEG) };
      const F1 = { x: -c, y: 0 };
      const F2 = { x: c, y: 0 };
      const d1 = norm({ x: P.x - F1.x, y: P.y - F1.y });
      const d2 = norm({ x: P.x - F2.x, y: P.y - F2.y });
      return { a, b, c, P, F1, F2, d1, d2, sum: d1 + d2 };
    },
    formula(s, m) {
      return [
        `橢圓：x²/a² + y²/b² = 1`,
        `c² = a² - b²，所以 c=${format(m.c)}`,
        `PF₁ + PF₂ = ${format(m.d1)} + ${format(m.d2)} = ${format(m.sum)}`,
        `理論定值 2a = ${format(2*m.a)}`
      ];
    },
    draw(s, m) {
      const plane = makePlane({ scale: Math.min(canvas.clientWidth, canvas.clientHeight) / 12 });
      drawGrid(plane);
      ctx.save();
      ctx.strokeStyle = palette.blue;
      ctx.fillStyle = palette.fillBlue;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(plane.sx(0), plane.sy(0), m.a * plane.scale, m.b * plane.scale, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      drawSegment(plane, m.P, m.F1, palette.orange, 3);
      drawSegment(plane, m.P, m.F2, palette.orange, 3);
      drawPoint(plane, m.F1, "F₁", palette.red);
      drawPoint(plane, m.F2, "F₂", palette.red);
      drawPoint(plane, m.P, "P", palette.blue);
      drawMathLabel(`PF₁+PF₂=${format(m.sum)}`, plane.sx(m.P.x) + 12, plane.sy(m.P.y) - 18);
    },
    status(s, m) {
      return `PF₁+PF₂=${format(m.sum)}，固定為 2a=${format(2*m.a)}。`;
    }
  },
  {
    id: "projection",
    title: "向量投影：內積的幾何意義",
    short: "內積與投影",
    tag: "平面向量",
    examSignal: "看到「投影量、夾角、垂直」就先想內積；投影不是硬畫斜線，而是把向量分解到目標方向上。",
    prompt: "改變向量 a 與 b 的方向，觀察 a 在 b 上的投影何時變成負向。請判斷 a·b 的正負與夾角的關係。",
    controls: [
      { key: "ax", label: "aₓ", min: -4, max: 4, step: 0.1, value: 3.2 },
      { key: "ay", label: "aᵧ", min: -4, max: 4, step: 0.1, value: 2.1 },
      { key: "bx", label: "bₓ", min: -4, max: 4, step: 0.1, value: 2.0 },
      { key: "by", label: "bᵧ", min: -4, max: 4, step: 0.1, value: -1.2 }
    ],
    compute(s) {
      const a = { x: s.ax, y: s.ay };
      let b = { x: s.bx, y: s.by };
      if (norm(b) < 0.15) b = { x: 0.15, y: 0 };
      const dp = dot(a, b);
      const b2 = dot(b, b);
      const scalar = dp / b2;
      const proj = { x: scalar * b.x, y: scalar * b.y };
      const cos = dp / (norm(a) * norm(b));
      const theta = Math.acos(clamp(cos, -1, 1)) / DEG;
      return { a, b, dp, scalar, proj, theta };
    },
    formula(s, m) {
      return [
        `a·b = ax bx + ay by = ${format(m.dp)}`,
        `proj_b(a) = ((a·b)/|b|²)b = (${format(m.proj.x)}, ${format(m.proj.y)})`,
        `投影係數 = ${format(m.scalar)}；夾角 θ ≈ ${format(m.theta)}°`,
        `a·b ${m.dp >= 0 ? "≥ 0，夾角為銳角或直角" : "< 0，夾角為鈍角"}`
      ];
    },
    draw(s, m) {
      const plane = makePlane({ scale: Math.min(canvas.clientWidth, canvas.clientHeight) / 11 });
      drawGrid(plane);
      drawArrow(plane, { x: 0, y: 0 }, m.a, palette.blue, 4, "a");
      drawArrow(plane, { x: 0, y: 0 }, m.b, palette.green, 4, "b");
      drawArrow(plane, { x: 0, y: 0 }, m.proj, palette.orange, 4, "proj");
      drawSegment(plane, m.a, m.proj, palette.orange, 2.5, [8, 7]);
      drawPoint(plane, m.proj, "H", palette.orange);
      drawMathLabel(`a·b=${format(m.dp)}`, plane.sx(-5.1), plane.sy(4.6));
    },
    status(s, m) {
      return `a·b=${format(m.dp)}，夾角約 ${format(m.theta)}°，投影係數 ${format(m.scalar)}。`;
    }
  },
  {
    id: "trig",
    title: "單位圓：正弦、餘弦與週期",
    short: "三角函數圖像",
    tag: "三角函數",
    examSignal: "看到 sin、cos 週期與相位，先回到單位圓；角度增加時，x 座標是 cosθ，y 座標是 sinθ。",
    prompt: "拖曳角度，觀察單位圓上的點如何對應右側波形。請找出 sinθ = cosθ 的角度位置。",
    controls: [
      { key: "theta", label: "角度 θ", min: 0, max: 720, step: 1, value: 45, unit: "°" }
    ],
    compute(s) {
      const rad = s.theta * DEG;
      const x = Math.cos(rad);
      const y = Math.sin(rad);
      return { rad, point: { x, y }, sin: y, cos: x };
    },
    formula(s, m) {
      return [
        `單位圓點 P=(cosθ, sinθ)=(${format(m.cos)}, ${format(m.sin)})`,
        `sin(${format(s.theta)}°)=${format(m.sin)}，cos(${format(s.theta)}°)=${format(m.cos)}`,
        `週期：sin(θ+360°)=sinθ，cos(θ+360°)=cosθ`
      ];
    },
    draw(s, m) {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const leftPlane = {
        width, height,
        scale: Math.min(width, height) / 5,
        origin: { x: width * 0.28, y: height * 0.52 },
        sx(x) { return this.origin.x + x * this.scale; },
        sy(y) { return this.origin.y - y * this.scale; },
        point(p) { return { x: this.sx(p.x), y: this.sy(p.y) }; }
      };
      drawGrid(leftPlane, 2);
      drawCircle(leftPlane, { x: 0, y: 0 }, 1, palette.blue, palette.fillBlue, 3);
      drawArrow(leftPlane, { x: 0, y: 0 }, m.point, palette.red, 4, "P");
      drawSegment(leftPlane, m.point, { x: m.point.x, y: 0 }, palette.orange, 2.5, [7, 7]);
      drawSegment(leftPlane, m.point, { x: 0, y: m.point.y }, palette.green, 2.5, [7, 7]);
      drawMathLabel(`cosθ=${format(m.cos)}`, leftPlane.sx(m.point.x / 2) - 38, leftPlane.sy(-0.15));
      drawMathLabel(`sinθ=${format(m.sin)}`, leftPlane.sx(0.1), leftPlane.sy(m.point.y / 2));

      // Right-side wave graph
      const graph = {
        x0: width * 0.52,
        y0: height * 0.52,
        w: width * 0.42,
        h: height * 0.48
      };
      ctx.save();
      ctx.strokeStyle = palette.grid;
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const x = graph.x0 + i * graph.w / 4;
        ctx.beginPath(); ctx.moveTo(x, graph.y0 - graph.h/2); ctx.lineTo(x, graph.y0 + graph.h/2); ctx.stroke();
      }
      for (let j = -1; j <= 1; j++) {
        const y = graph.y0 - j * graph.h/2;
        ctx.beginPath(); ctx.moveTo(graph.x0, y); ctx.lineTo(graph.x0 + graph.w, y); ctx.stroke();
      }
      ctx.strokeStyle = palette.axis;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(graph.x0, graph.y0);
      ctx.lineTo(graph.x0 + graph.w, graph.y0);
      ctx.stroke();

      function gx(deg) { return graph.x0 + (deg / 720) * graph.w; }
      function gy(v) { return graph.y0 - v * graph.h/2; }

      ctx.lineWidth = 3;
      ctx.strokeStyle = palette.orange;
      ctx.beginPath();
      for (let deg = 0; deg <= 720; deg++) {
        const x = gx(deg);
        const y = gy(Math.sin(deg * DEG));
        if (deg === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.strokeStyle = palette.green;
      ctx.beginPath();
      for (let deg = 0; deg <= 720; deg++) {
        const x = gx(deg);
        const y = gy(Math.cos(deg * DEG));
        if (deg === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      const px = gx(s.theta);
      ctx.strokeStyle = palette.red;
      ctx.setLineDash([7, 7]);
      ctx.beginPath();
      ctx.moveTo(px, graph.y0 - graph.h/2 - 8);
      ctx.lineTo(px, graph.y0 + graph.h/2 + 8);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = palette.orange;
      ctx.beginPath(); ctx.arc(px, gy(m.sin), 5, 0, TAU); ctx.fill();
      ctx.fillStyle = palette.green;
      ctx.beginPath(); ctx.arc(px, gy(m.cos), 5, 0, TAU); ctx.fill();
      ctx.fillStyle = palette.ink;
      ctx.font = "700 13px ui-sans-serif, system-ui";
      ctx.fillText("sinθ", graph.x0 + 12, gy(1) - 10);
      ctx.fillText("cosθ", graph.x0 + 62, gy(1) - 10);
      ctx.fillText("0°", graph.x0, graph.y0 + 24);
      ctx.fillText("360°", gx(360) - 18, graph.y0 + 24);
      ctx.fillText("720°", gx(720) - 34, graph.y0 + 24);
      ctx.restore();
    },
    status(s, m) {
      return `θ=${format(s.theta)}°，sinθ=${format(m.sin)}，cosθ=${format(m.cos)}。`;
    }
  },
  {
    id: "matrix",
    title: "矩陣線性變換：伸縮、旋轉、鏡射",
    short: "2×2 線性變換",
    tag: "矩陣",
    examSignal: "看到 2×2 矩陣，不只做乘法；先看它把基底向量 e₁、e₂ 送去哪裡，圖形就會跟著變形。",
    prompt: "調整矩陣元素，觀察單位正方形面積如何變成 |det A|。請找出 det A < 0 時圖形方向發生什麼變化。",
    controls: [
      { key: "a", label: "a", min: -2, max: 2, step: 0.1, value: 1.1 },
      { key: "b", label: "b", min: -2, max: 2, step: 0.1, value: -0.4 },
      { key: "c", label: "c", min: -2, max: 2, step: 0.1, value: 0.6 },
      { key: "d", label: "d", min: -2, max: 2, step: 0.1, value: 1.2 }
    ],
    compute(s) {
      const det = s.a * s.d - s.b * s.c;
      const transform = p => ({ x: s.a * p.x + s.b * p.y, y: s.c * p.x + s.d * p.y });
      const e1 = transform({ x: 1, y: 0 });
      const e2 = transform({ x: 0, y: 1 });
      return { det, transform, e1, e2, orientation: det >= 0 ? "方向保持" : "方向反轉" };
    },
    formula(s, m) {
      return [
        `A = [[${format(s.a)}, ${format(s.b)}], [${format(s.c)}, ${format(s.d)}]]`,
        `A e₁ = (${format(m.e1.x)}, ${format(m.e1.y)})，A e₂ = (${format(m.e2.x)}, ${format(m.e2.y)})`,
        `det(A)=ad-bc=${format(m.det)}，面積倍率 |det A|=${format(Math.abs(m.det))}`,
        `${m.orientation}${Math.abs(m.det) < 0.05 ? "；幾乎壓扁到一直線" : ""}`
      ];
    },
    draw(s, m) {
      const plane = makePlane({ scale: Math.min(canvas.clientWidth, canvas.clientHeight) / 12 });
      drawGrid(plane);

      // 原單位正方形
      const square = [{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}];
      ctx.save();
      ctx.fillStyle = "rgba(101, 112, 137, .10)";
      ctx.strokeStyle = "rgba(101, 112, 137, .65)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      square.forEach((p, i) => {
        const sp = plane.point(p);
        if (i === 0) ctx.moveTo(sp.x, sp.y); else ctx.lineTo(sp.x, sp.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // transformed grid
      ctx.save();
      ctx.strokeStyle = "rgba(47, 99, 255, .18)";
      ctx.lineWidth = 1.2;
      for (let x = -5; x <= 5; x++) {
        const p = m.transform({ x, y: -5 });
        const q = m.transform({ x, y: 5 });
        drawSegment(plane, p, q, "rgba(47, 99, 255, .20)", 1.2);
      }
      for (let y = -5; y <= 5; y++) {
        const p = m.transform({ x: -5, y });
        const q = m.transform({ x: 5, y });
        drawSegment(plane, p, q, "rgba(24, 169, 153, .20)", 1.2);
      }
      ctx.restore();

      const tsq = square.map(m.transform);
      ctx.save();
      ctx.fillStyle = palette.fillBlue;
      ctx.strokeStyle = palette.blue;
      ctx.lineWidth = 3;
      ctx.beginPath();
      tsq.forEach((p, i) => {
        const sp = plane.point(p);
        if (i === 0) ctx.moveTo(sp.x, sp.y); else ctx.lineTo(sp.x, sp.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      drawArrow(plane, {x:0,y:0}, m.e1, palette.orange, 4, "Ae₁");
      drawArrow(plane, {x:0,y:0}, m.e2, palette.green, 4, "Ae₂");
      drawMathLabel(`det=${format(m.det)}`, plane.sx(-5.2), plane.sy(4.8));
    },
    status(s, m) {
      return `det(A)=${format(m.det)}，面積倍率 ${format(Math.abs(m.det))}，${m.orientation}。`;
    }
  },
  {
    id: "riemann",
    title: "黎曼和：面積與極限視覺化",
    short: "微積分面積",
    tag: "微積分",
    examSignal: "看到「分割、長方形面積和、n 趨近無限大」就是黎曼和；重點是把總和視為曲線下面積的近似。",
    prompt: "增加分割數 n，觀察長方形面積和如何逼近曲線下面積。請判斷左端點與右端點近似何時會高估或低估。",
    controls: [
      { key: "func", label: "函數", type: "select", value: "quad", options: [
        { value: "quad", label: "f(x)=0.35x²+0.5" },
        { value: "sin", label: "f(x)=sin(x)+1.4" }
      ]},
      { key: "n", label: "分割數 n", min: 2, max: 60, step: 1, value: 12 },
      { key: "mode", label: "取樣點", type: "select", value: "mid", options: [
        { value: "left", label: "左端點" },
        { value: "mid", label: "中點" },
        { value: "right", label: "右端點" }
      ]}
    ],
    f(s, x) {
      if (s.func === "sin") return Math.sin(x) + 1.4;
      return 0.35 * x * x + 0.5;
    },
    exact(s, a=-2, b=3) {
      if (s.func === "sin") return (-Math.cos(b) + 1.4*b) - (-Math.cos(a) + 1.4*a);
      return (0.35/3) * (b**3 - a**3) + 0.5*(b-a);
    },
    compute(s) {
      const a = -2, b = 3;
      const dx = (b-a) / s.n;
      let sum = 0;
      const rects = [];
      for (let i = 0; i < s.n; i++) {
        const x0 = a + i * dx;
        const x1 = x0 + dx;
        const sample = s.mode === "left" ? x0 : s.mode === "right" ? x1 : (x0+x1)/2;
        const height = this.f(s, sample);
        sum += height * dx;
        rects.push({ x0, x1, height, sample });
      }
      const exact = this.exact(s, a, b);
      return { a, b, dx, rects, sum, exact, error: sum-exact };
    },
    formula(s, m) {
      return [
        `Δx = (b-a)/n = ${format(m.dx)}`,
        `Sₙ = Σ f(xᵢ*)Δx = ${format(m.sum)}`,
        `精確面積 ≈ ${format(m.exact)}；誤差 Sₙ-面積 = ${format(m.error)}`,
        `n 越大，長方形總面積越接近定積分`
      ];
    },
    draw(s, m) {
      const plane = makePlane({ scale: Math.min(canvas.clientWidth, canvas.clientHeight) / 9.2, origin: { x: canvas.clientWidth*0.46, y: canvas.clientHeight*0.78 } });
      drawGrid(plane);
      ctx.save();
      ctx.fillStyle = palette.fillOrange;
      ctx.strokeStyle = "rgba(245, 158, 11, .65)";
      ctx.lineWidth = 1;
      for (const r of m.rects) {
        const x = plane.sx(r.x0);
        const y = plane.sy(r.height);
        const w = (r.x1-r.x0) * plane.scale;
        const h = plane.sy(0) - y;
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
      plotFunction(plane, x => this.f(s, x), -2.4, 3.4, palette.blue, 3, 0.01);
      drawMathLabel(`Sₙ=${format(m.sum)}，面積≈${format(m.exact)}`, plane.sx(-2.4), plane.sy(4.1));
    },
    status(s, m) {
      return `n=${s.n}，近似面積 ${format(m.sum)}，誤差 ${format(m.error)}。`;
    }
  },

  {
    id: "hyperbola",
    title: "雙曲線：雙焦點距離差",
    short: "雙曲線焦點定義",
    tag: "二次曲線",
    examSignal: "看到「到兩定點距離差為定值」就是雙曲線；標準式先抓 a、b，再用 c²=a²+b² 找焦點。",
    prompt: "拖曳參數點，觀察 |PF₁−PF₂| 是否固定。再對照漸近線 y=±(b/a)x，理解為什麼圖形會越來越貼近直線。",
    controls: [
      { key: "a", label: "半實軸 a", min: 0.8, max: 3.2, step: 0.05, value: 1.45 },
      { key: "b", label: "半虛軸 b", min: 0.6, max: 3.2, step: 0.05, value: 1.1 },
      { key: "u", label: "參數 u", min: -2.2, max: 2.2, step: 0.02, value: 0.95 },
      { key: "branch", label: "分支", type: "select", value: "right", options: [
        { value: "right", label: "右支" },
        { value: "left", label: "左支" }
      ]}
    ],
    compute(s) {
      const sign = s.branch === "left" ? -1 : 1;
      const c = Math.sqrt(s.a * s.a + s.b * s.b);
      const P = { x: sign * s.a * Math.cosh(s.u), y: s.b * Math.sinh(s.u) };
      const F1 = { x: -c, y: 0 };
      const F2 = { x: c, y: 0 };
      const d1 = norm({ x: P.x - F1.x, y: P.y - F1.y });
      const d2 = norm({ x: P.x - F2.x, y: P.y - F2.y });
      return { c, P, F1, F2, d1, d2, diff: Math.abs(d1 - d2), sign };
    },
    formula(s, m) {
      return [
        `雙曲線：x²/a² − y²/b² = 1`,
        `c²=a²+b²，所以焦點 F₁=(-c,0), F₂=(c,0)，c=${format(m.c)}`,
        `|PF₁−PF₂| = |${format(m.d1)}−${format(m.d2)}| = ${format(m.diff)}`,
        `理論定值 2a = ${format(2*s.a)}；漸近線 y=±(${format(s.b/s.a)})x`
      ];
    },
    draw(s, m) {
      const plane = makePlane({ scale: Math.min(canvas.clientWidth, canvas.clientHeight) / 12 });
      drawGrid(plane);
      drawSegment(plane, { x: -7, y: -7*s.b/s.a }, { x: 7, y: 7*s.b/s.a }, palette.red, 2, [8, 8]);
      drawSegment(plane, { x: -7, y: 7*s.b/s.a }, { x: 7, y: -7*s.b/s.a }, palette.red, 2, [8, 8]);

      function drawBranch(sign) {
        ctx.save();
        ctx.strokeStyle = palette.blue;
        ctx.lineWidth = 3;
        ctx.beginPath();
        let first = true;
        for (let t = -2.4; t <= 2.4; t += 0.025) {
          const p = { x: sign * s.a * Math.cosh(t), y: s.b * Math.sinh(t) };
          if (first) { ctx.moveTo(plane.sx(p.x), plane.sy(p.y)); first = false; }
          else ctx.lineTo(plane.sx(p.x), plane.sy(p.y));
        }
        ctx.stroke();
        ctx.restore();
      }
      drawBranch(1);
      drawBranch(-1);

      drawSegment(plane, m.P, m.F1, palette.orange, 3);
      drawSegment(plane, m.P, m.F2, palette.orange, 3);
      drawPoint(plane, m.F1, "F₁", palette.red);
      drawPoint(plane, m.F2, "F₂", palette.red);
      drawPoint(plane, m.P, "P", palette.blue);
      drawMathLabel(`|PF₁−PF₂|=${format(m.diff)}`, plane.sx(m.P.x) + 12, plane.sy(m.P.y) - 18);
    },
    status(s, m) {
      return `|PF₁−PF₂|=${format(m.diff)}，理論值 2a=${format(2*s.a)}。`;
    }
  },
  {
    id: "complex",
    title: "複數平面：乘法的旋轉與伸縮",
    short: "複數極式",
    tag: "複數平面",
    examSignal: "看到複數乘法，不要只展開；用極式看成「模長相乘、幅角相加」，考場會快很多。",
    prompt: "調整乘數 w 的模長與角度，觀察 z 乘上 w 後如何旋轉、伸縮。請用圖形說明 arg(zw)=arg z+arg w。",
    controls: [
      { key: "zr", label: "|z|", min: 0.4, max: 3.5, step: 0.05, value: 2.1 },
      { key: "za", label: "arg z", min: 0, max: 360, step: 1, value: 35, unit: "°" },
      { key: "wr", label: "|w|", min: 0.2, max: 2.5, step: 0.05, value: 1.35 },
      { key: "wa", label: "arg w", min: -180, max: 180, step: 1, value: 70, unit: "°" }
    ],
    compute(s) {
      const z = { x: s.zr * Math.cos(s.za * DEG), y: s.zr * Math.sin(s.za * DEG) };
      const w = { x: s.wr * Math.cos(s.wa * DEG), y: s.wr * Math.sin(s.wa * DEG) };
      const arg = s.za + s.wa;
      const zw = { x: s.zr * s.wr * Math.cos(arg * DEG), y: s.zr * s.wr * Math.sin(arg * DEG) };
      return { z, w, zw, arg, productR: s.zr * s.wr };
    },
    formula(s, m) {
      return [
        `z=${format(m.z.x)}+${format(m.z.y)}i，w=${format(m.w.x)}+${format(m.w.y)}i`,
        `|zw|=|z||w|=${format(s.zr)}×${format(s.wr)}=${format(m.productR)}`,
        `arg(zw)=arg z + arg w = ${format(s.za)}° + ${format(s.wa)}° = ${format(m.arg)}°`,
        `乘法視覺：先伸縮 |w| 倍，再逆時針旋轉 arg(w)`
      ];
    },
    draw(s, m) {
      const plane = makePlane({ scale: Math.min(canvas.clientWidth, canvas.clientHeight) / 10 });
      drawGrid(plane);
      drawCircle(plane, { x: 0, y: 0 }, s.zr, "rgba(47,99,255,.32)", "transparent", 2);
      drawCircle(plane, { x: 0, y: 0 }, m.productR, "rgba(245,158,11,.32)", "transparent", 2);
      drawArrow(plane, { x: 0, y: 0 }, m.z, palette.blue, 4, "z");
      drawArrow(plane, { x: 0, y: 0 }, m.w, palette.green, 4, "w");
      drawArrow(plane, { x: 0, y: 0 }, m.zw, palette.orange, 4, "zw");
      drawPoint(plane, m.z, "z", palette.blue);
      drawPoint(plane, m.w, "w", palette.green);
      drawPoint(plane, m.zw, "zw", palette.orange);
      drawMathLabel(`旋轉 ${format(s.wa)}°，伸縮 ${format(s.wr)} 倍`, plane.sx(-4.6), plane.sy(4.4));
    },
    status(s, m) {
      return `|zw|=${format(m.productR)}，arg(zw)=${format(m.arg)}°。`;
    }
  },
  {
    id: "space-skew-lines",
    title: "空間向量：兩歪斜線的公垂距離",
    short: "歪斜線距離",
    tag: "空間向量",
    examSignal: "看到「兩歪斜線距離」先找方向向量外積 u×v；距離是三重積絕對值除以 |u×v|。",
    prompt: "改變第二條直線的位置與視角，觀察最短連線永遠同時垂直兩條直線。請檢查公垂段與兩方向向量的內積是否為 0。",
    controls: [
      { key: "qx", label: "第二線通過點 Qx", min: -1.4, max: 2.6, step: 0.05, value: 0.75 },
      { key: "qy", label: "第二線通過點 Qy", min: -2.4, max: 1.4, step: 0.05, value: -1.15 },
      { key: "qz", label: "第二線通過點 Qz", min: 0.2, max: 3.0, step: 0.05, value: 1.65 },
      { key: "view", label: "視角", min: 15, max: 155, step: 1, value: 48, unit: "°" }
    ],
    compute(s) {
      const P = { x: -2.0, y: -0.75, z: -0.25 };
      const u = { x: 1.35, y: 0.65, z: 0.25 };
      const Q = { x: s.qx, y: s.qy, z: s.qz };
      const v = { x: 0.55, y: -0.38, z: 1.22 };
      const w = sub3(P, Q);
      const uu = dot3(u, u);
      const vv = dot3(v, v);
      const uv = dot3(u, v);
      const uw = dot3(u, w);
      const vw = dot3(v, w);
      const denom = uu * vv - uv * uv;
      const t = (uv * vw - vv * uw) / denom;
      const r = (uu * vw - uv * uw) / denom;
      const A = add3(P, scale3(u, t));
      const B = add3(Q, scale3(v, r));
      const AB = sub3(A, B);
      const n = cross3(u, v);
      const tripleDistance = Math.abs(dot3(sub3(Q, P), n)) / norm3(n);
      return { P, Q, u, v, A, B, AB, n, t, r, distance: norm3(AB), tripleDistance, dotU: dot3(AB, u), dotV: dot3(AB, v) };
    },
    formula(s, m) {
      return [
        `L₁: P+tu，L₂: Q+sv`,
        `公垂向量方向 n=u×v=(${format(m.n.x)}, ${format(m.n.y)}, ${format(m.n.z)})`,
        `距離 d=|(Q−P)·(u×v)|/|u×v|=${format(m.tripleDistance)}`,
        `檢查：AB·u=${format(m.dotU, 5)}，AB·v=${format(m.dotV, 5)}`
      ];
    },
    draw(s, m) {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const origin = { x: width * 0.50, y: height * 0.56 };
      const scale = Math.min(width, height) / 8.5;
      const angle = s.view * DEG;
      function project(p) {
        const xr = Math.cos(angle) * p.x - Math.sin(angle) * p.y;
        const yr = Math.sin(angle) * p.x + Math.cos(angle) * p.y;
        return { x: origin.x + scale * xr, y: origin.y + scale * (0.42 * yr - p.z) };
      }
      function seg3(a, b, color, lineWidth = 3, dash = []) {
        const pa = project(a);
        const pb = project(b);
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.setLineDash(dash);
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
        ctx.restore();
      }
      function point3(p, label, color) {
        drawPointPixels(project(p), label, color);
      }
      clearCanvas();
      drawArrowPixels(project({x:0,y:0,z:0}), project({x:3.4,y:0,z:0}), "rgba(239,68,68,.55)", 2.5, "x");
      drawArrowPixels(project({x:0,y:0,z:0}), project({x:0,y:3.4,z:0}), "rgba(24,169,153,.55)", 2.5, "y");
      drawArrowPixels(project({x:0,y:0,z:0}), project({x:0,y:0,z:3.4}), "rgba(47,99,255,.55)", 2.5, "z");
      seg3(add3(m.P, scale3(m.u, -3.0)), add3(m.P, scale3(m.u, 3.2)), palette.blue, 4);
      seg3(add3(m.Q, scale3(m.v, -2.6)), add3(m.Q, scale3(m.v, 2.8)), palette.green, 4);
      seg3(m.A, m.B, palette.orange, 5);
      point3(m.P, "P", palette.blue);
      point3(m.Q, "Q", palette.green);
      point3(m.A, "A", palette.orange);
      point3(m.B, "B", palette.orange);
      drawMathLabel(`d=${format(m.distance)}`, width * 0.07, height * 0.12);
    },
    status(s, m) {
      return `兩歪斜線距離 d=${format(m.distance)}；AB·u=${format(m.dotU, 4)}，AB·v=${format(m.dotV, 4)}。`;
    }
  },
  {
    id: "taylor",
    title: "泰勒近似：局部線性與二次近似",
    short: "局部近似",
    tag: "微積分",
    examSignal: "看到「在某點附近、近似、切線」就想到局部線性；數甲再進一步用二次項看曲率。",
    prompt: "拖曳基準點 c 與觀察點 x，比較原函數、切線近似與二次近似。請觀察 x 越靠近 c，近似誤差如何改變。",
    controls: [
      { key: "func", label: "函數", type: "select", value: "sin", options: [
        { value: "sin", label: "f(x)=sin x" },
        { value: "exp", label: "f(x)=e^x" },
        { value: "ln", label: "f(x)=ln(1+x)" }
      ]},
      { key: "c", label: "基準點 c", min: -1.5, max: 1.5, step: 0.05, value: 0.4 },
      { key: "x", label: "觀察點 x", min: -1.8, max: 1.8, step: 0.05, value: 1.15 }
    ],
    model(s) {
      if (s.func === "exp") return {
        label: "e^x",
        xMin: -2, xMax: 2,
        f: x => Math.exp(x),
        f1: x => Math.exp(x),
        f2: x => Math.exp(x)
      };
      if (s.func === "ln") return {
        label: "ln(1+x)",
        xMin: -0.92, xMax: 2.3,
        f: x => x > -1 ? Math.log1p(x) : NaN,
        f1: x => 1 / (1 + x),
        f2: x => -1 / ((1 + x) * (1 + x))
      };
      return {
        label: "sin x",
        xMin: -2.4, xMax: 2.4,
        f: x => Math.sin(x),
        f1: x => Math.cos(x),
        f2: x => -Math.sin(x)
      };
    },
    compute(s) {
      const model = this.model(s);
      const c = s.func === "ln" ? Math.max(s.c, -0.88) : s.c;
      const x = s.func === "ln" ? Math.max(s.x, -0.88) : s.x;
      const fc = model.f(c);
      const f1c = model.f1(c);
      const f2c = model.f2(c);
      const dx = x - c;
      const exact = model.f(x);
      const linear = fc + f1c * dx;
      const quadratic = linear + 0.5 * f2c * dx * dx;
      return { model, c, x, fc, f1c, f2c, exact, linear, quadratic, err1: linear - exact, err2: quadratic - exact };
    },
    formula(s, m) {
      return [
        `f(x)=${m.model.label}，基準點 c=${format(m.c)}`,
        `一次近似 L(x)=f(c)+f′(c)(x−c)`,
        `二次近似 Q(x)=L(x)+f″(c)(x−c)²/2`,
        `在 x=${format(m.x)}：f=${format(m.exact)}，L=${format(m.linear)}，Q=${format(m.quadratic)}`
      ];
    },
    draw(s, m) {
      const plane = makePlane({ scale: Math.min(canvas.clientWidth, canvas.clientHeight) / 7.3, origin: { x: canvas.clientWidth*0.47, y: canvas.clientHeight*0.63 } });
      drawGrid(plane);
      plotFunction(plane, x => m.model.f(x), m.model.xMin, m.model.xMax, palette.blue, 3, 0.01);
      plotFunction(plane, x => m.fc + m.f1c * (x - m.c), m.model.xMin, m.model.xMax, palette.orange, 2.5, 0.02);
      plotFunction(plane, x => m.fc + m.f1c * (x - m.c) + 0.5 * m.f2c * (x - m.c) * (x - m.c), m.model.xMin, m.model.xMax, palette.green, 2.5, 0.02);
      drawPoint(plane, { x: m.c, y: m.fc }, "c", palette.red);
      drawPoint(plane, { x: m.x, y: m.exact }, "f(x)", palette.blue);
      drawPoint(plane, { x: m.x, y: m.linear }, "L", palette.orange);
      drawPoint(plane, { x: m.x, y: m.quadratic }, "Q", palette.green);
      drawSegment(plane, {x: m.x, y: m.linear}, {x: m.x, y: m.exact}, palette.orange, 2, [5,5]);
      drawSegment(plane, {x: m.x + 0.08, y: m.quadratic}, {x: m.x + 0.08, y: m.exact}, palette.green, 2, [5,5]);
      drawMathLabel(`一次誤差=${format(m.err1)}；二次誤差=${format(m.err2)}`, plane.sx(-2.1), plane.sy(3.3));
    },
    status(s, m) {
      return `x=${format(m.x)}，一次誤差 ${format(m.err1)}，二次誤差 ${format(m.err2)}。`;
    }
  },
  {
    id: "regression",
    title: "統計視覺化：迴歸線、相關係數與殘差",
    short: "迴歸與殘差",
    tag: "數據分析",
    examSignal: "看到散佈圖、相關係數、預測值，要分清楚：相關係數描述線性方向與強度，迴歸線一定通過平均點。",
    prompt: "增加雜訊，觀察相關係數 r 如何下降。開啟殘差後，檢查每個點到迴歸線的垂直差距如何正負抵銷。",
    controls: [
      { key: "slope", label: "真實斜率", min: -2.0, max: 2.0, step: 0.05, value: 0.85 },
      { key: "intercept", label: "截距", min: -2.0, max: 2.0, step: 0.05, value: 0.3 },
      { key: "noise", label: "雜訊量", min: 0.0, max: 2.2, step: 0.05, value: 0.7 },
      { key: "n", label: "資料筆數", min: 8, max: 30, step: 1, value: 18 },
      { key: "residual", label: "顯示殘差", type: "select", value: "yes", options: [
        { value: "yes", label: "顯示" },
        { value: "no", label: "隱藏" }
      ]}
    ],
    compute(s) {
      const pts = [];
      const n = Math.round(s.n);
      for (let i = 0; i < n; i++) {
        const x = -4 + (8 * i) / Math.max(1, n - 1);
        const wiggle = 0.62 * Math.sin(i * 2.17 + 0.4) + 0.38 * Math.sin(i * 5.91);
        const y = s.slope * x + s.intercept + s.noise * wiggle;
        pts.push({ x, y });
      }
      const mx = pts.reduce((sum, p) => sum + p.x, 0) / n;
      const my = pts.reduce((sum, p) => sum + p.y, 0) / n;
      const sxx = pts.reduce((sum, p) => sum + (p.x - mx) ** 2, 0) / n;
      const syy = pts.reduce((sum, p) => sum + (p.y - my) ** 2, 0) / n;
      const sxy = pts.reduce((sum, p) => sum + (p.x - mx) * (p.y - my), 0) / n;
      const b1 = sxy / sxx;
      const b0 = my - b1 * mx;
      const r = sxy / Math.sqrt(sxx * syy);
      return { pts, mx, my, b1, b0, r, sx: Math.sqrt(sxx), sy: Math.sqrt(syy) };
    },
    formula(s, m) {
      return [
        `平均點 (x̄,ȳ)=(${format(m.mx)}, ${format(m.my)})，迴歸線必通過此點`,
        `迴歸線：ŷ=${format(m.b1)}x+${format(m.b0)}`,
        `相關係數 r=${format(m.r)}，標準差 sx=${format(m.sx)}，sy=${format(m.sy)}`,
        `雜訊越大，點雲越散，|r| 通常越小`
      ];
    },
    draw(s, m) {
      const plane = makePlane({ scale: Math.min(canvas.clientWidth, canvas.clientHeight) / 11 });
      drawGrid(plane);
      if (s.residual === "yes") {
        for (const p of m.pts) {
          const yhat = m.b1 * p.x + m.b0;
          drawSegment(plane, p, { x: p.x, y: yhat }, "rgba(245,158,11,.45)", 2);
        }
      }
      plotFunction(plane, x => m.b1 * x + m.b0, -4.8, 4.8, palette.red, 3);
      for (const p of m.pts) drawPoint(plane, p, "", palette.blue, 4.5);
      drawPoint(plane, { x: m.mx, y: m.my }, "(x̄,ȳ)", palette.orange, 6);
      drawMathLabel(`r=${format(m.r)}，ŷ=${format(m.b1)}x+${format(m.b0)}`, plane.sx(-4.8), plane.sy(4.7));
    },
    status(s, m) {
      return `r=${format(m.r)}，迴歸線 ŷ=${format(m.b1)}x+${format(m.b0)}。`;
    }
  },
  {
    id: "bayes",
    title: "機率模擬：貝氏定理與快篩陽性率",
    short: "貝氏定理",
    tag: "機率統計",
    examSignal: "看到「已知檢驗陽性，實際患病機率」就是條件機率；分母一定是所有陽性來源，不可只看敏感度。",
    prompt: "調整盛行率、敏感度與特異度，觀察陽性預測值如何變化。請特別比較低盛行率時，偽陽性對答案的影響。",
    controls: [
      { key: "prev", label: "盛行率 P(D)", min: 1, max: 60, step: 1, value: 12, unit: "%" },
      { key: "sens", label: "敏感度 P(+|D)", min: 50, max: 99, step: 1, value: 88, unit: "%" },
      { key: "spec", label: "特異度 P(-|Dᶜ)", min: 50, max: 99, step: 1, value: 92, unit: "%" }
    ],
    compute(s) {
      const pD = s.prev / 100;
      const sens = s.sens / 100;
      const spec = s.spec / 100;
      const pH = 1 - pD;
      const falsePos = 1 - spec;
      const pPos = pD * sens + pH * falsePos;
      const ppv = (pD * sens) / pPos;
      const pNeg = pD * (1 - sens) + pH * spec;
      const diseaseGivenNeg = (pD * (1 - sens)) / pNeg;
      return { pD, pH, sens, spec, falsePos, pPos, ppv, pNeg, diseaseGivenNeg };
    },
    formula(s, m) {
      return [
        `P(D|+) = P(D)P(+|D) / P(+)`,
        `P(+)=P(D)P(+|D)+P(Dᶜ)P(+|Dᶜ)=${format(m.pPos)}`,
        `P(D|+)=${format(m.ppv)}，約 ${format(100*m.ppv, 1)}%`,
        `P(D|−)=${format(m.diseaseGivenNeg)}，約 ${format(100*m.diseaseGivenNeg, 1)}%`
      ];
    },
    draw(s, m) {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      clearCanvas();
      const root = { x: width * 0.12, y: height * 0.50 };
      const sick = { x: width * 0.36, y: height * 0.28 };
      const healthy = { x: width * 0.36, y: height * 0.72 };
      const posSick = { x: width * 0.65, y: height * 0.18 };
      const negSick = { x: width * 0.65, y: height * 0.38 };
      const posHealthy = { x: width * 0.65, y: height * 0.62 };
      const negHealthy = { x: width * 0.65, y: height * 0.82 };

      function node(p, title, detail, color) {
        ctx.save();
        ctx.fillStyle = "rgba(255,255,255,.94)";
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(p.x - 68, p.y - 28, 136, 56, 16);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = palette.ink;
        ctx.font = "800 14px ui-sans-serif, system-ui";
        ctx.textAlign = "center";
        ctx.fillText(title, p.x, p.y - 4);
        ctx.fillStyle = palette.muted;
        ctx.font = "700 12px ui-sans-serif, system-ui";
        ctx.fillText(detail, p.x, p.y + 16);
        ctx.restore();
      }
      function branch(a, b, label, color) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(a.x + 68, a.y);
        ctx.lineTo(b.x - 68, b.y);
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.font = "700 13px ui-sans-serif, system-ui";
        ctx.fillText(label, (a.x+b.x)/2 - 10, (a.y+b.y)/2 - 8);
        ctx.restore();
      }

      branch(root, sick, `P(D)=${format(m.pD)}`, palette.red);
      branch(root, healthy, `P(Dᶜ)=${format(m.pH)}`, palette.green);
      branch(sick, posSick, `P(+|D)=${format(m.sens)}`, palette.red);
      branch(sick, negSick, `P(-|D)=${format(1-m.sens)}`, palette.orange);
      branch(healthy, posHealthy, `P(+|Dᶜ)=${format(m.falsePos)}`, palette.orange);
      branch(healthy, negHealthy, `P(-|Dᶜ)=${format(m.spec)}`, palette.green);

      node(root, "1000 人", "母群體", palette.blue);
      node(sick, "患病 D", `${format(1000*m.pD, 0)} 人`, palette.red);
      node(healthy, "未患病 Dᶜ", `${format(1000*m.pH, 0)} 人`, palette.green);
      node(posSick, "真陽性", `${format(1000*m.pD*m.sens, 1)} 人`, palette.red);
      node(negSick, "偽陰性", `${format(1000*m.pD*(1-m.sens), 1)} 人`, palette.orange);
      node(posHealthy, "偽陽性", `${format(1000*m.pH*m.falsePos, 1)} 人`, palette.orange);
      node(negHealthy, "真陰性", `${format(1000*m.pH*m.spec, 1)} 人`, palette.green);

      const barX = width * 0.79;
      const barY = height * 0.20;
      const barW = width * 0.12;
      const barH = height * 0.62;
      const truePos = m.pD * m.sens;
      const falsePos = m.pH * m.falsePos;
      ctx.save();
      ctx.fillStyle = "rgba(223,228,239,.85)";
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = palette.red;
      ctx.fillRect(barX, barY + barH * (1 - truePos / m.pPos), barW, barH * truePos / m.pPos);
      ctx.fillStyle = palette.orange;
      ctx.fillRect(barX, barY, barW, barH * falsePos / m.pPos);
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, barY, barW, barH);
      ctx.fillStyle = palette.ink;
      ctx.font = "800 14px ui-sans-serif, system-ui";
      ctx.fillText("所有陽性中", barX - 4, barY - 14);
      ctx.fillText(`真陽性 ${format(100*m.ppv, 1)}%`, barX - 10, barY + barH + 28);
      ctx.restore();
    },
    status(s, m) {
      return `陽性後實際患病機率 P(D|+)≈${format(100*m.ppv, 1)}%。`;
    }
  },
  {
    id: "contour-gradient",
    title: "科學視覺化：等高線與梯度方向",
    short: "等高線與梯度",
    tag: "科學視覺化",
    examSignal: "看到等高線、最陡上升方向，梯度向量垂直等高線；這是多變量模型與物理場視覺化的核心直覺。",
    prompt: "拖曳點 P，觀察梯度箭頭如何永遠垂直穿過等高線。請判斷在山丘模型中，梯度為何指向中心或遠離中心。",
    controls: [
      { key: "func", label: "場函數", type: "select", value: "bowl", options: [
        { value: "bowl", label: "碗形 f=(x²+y²)/2" },
        { value: "saddle", label: "鞍形 f=x²−y²" },
        { value: "hill", label: "山丘 f=e^{-(x²+y²)/4}" }
      ]},
      { key: "x", label: "P 的 x", min: -3.2, max: 3.2, step: 0.05, value: 1.4 },
      { key: "y", label: "P 的 y", min: -3.2, max: 3.2, step: 0.05, value: 1.0 }
    ],
    field(s) {
      if (s.func === "saddle") {
        return {
          label: "x²−y²",
          f: (x, y) => x*x - y*y,
          grad: (x, y) => ({ x: 2*x, y: -2*y }),
          levels: [-8, -5, -3, -1, 0, 1, 3, 5, 8]
        };
      }
      if (s.func === "hill") {
        return {
          label: "e^{-(x²+y²)/4}",
          f: (x, y) => Math.exp(-(x*x + y*y) / 4),
          grad: (x, y) => {
            const z = Math.exp(-(x*x + y*y) / 4);
            return { x: -0.5 * x * z, y: -0.5 * y * z };
          },
          levels: [0.05, 0.12, 0.22, 0.35, 0.50, 0.68, 0.82]
        };
      }
      return {
        label: "(x²+y²)/2",
        f: (x, y) => 0.5 * (x*x + y*y),
        grad: (x, y) => ({ x, y }),
        levels: [0.4, 0.9, 1.6, 2.5, 3.6, 4.9, 6.4, 8.1]
      };
    },
    compute(s) {
      const field = this.field(s);
      const P = { x: s.x, y: s.y };
      const g = field.grad(P.x, P.y);
      const value = field.f(P.x, P.y);
      const ug = unit2(g);
      return { field, P, g, value, ug, gradLength: Math.hypot(g.x, g.y) };
    },
    formula(s, m) {
      return [
        `f(x,y)=${m.field.label}`,
        `P=(${format(m.P.x)}, ${format(m.P.y)})，f(P)=${format(m.value)}`,
        `∇f(P)=(${format(m.g.x)}, ${format(m.g.y)})，|∇f|=${format(m.gradLength)}`,
        `梯度方向是最陡上升方向，且垂直通過 P 的等高線`
      ];
    },
    draw(s, m) {
      const plane = makePlane({ scale: Math.min(canvas.clientWidth, canvas.clientHeight) / 9.5 });
      drawGrid(plane, 4);
      drawContours(plane, m.field.f, m.field.levels, { xMin: -4.2, xMax: 4.2, yMin: -4.2, yMax: 4.2, step: 0.22 });
      const arrowEnd = { x: m.P.x + m.ug.x * 1.15, y: m.P.y + m.ug.y * 1.15 };
      drawPoint(plane, m.P, "P", palette.red, 6);
      drawArrow(plane, m.P, arrowEnd, palette.orange, 4, "∇f");
      drawMathLabel(`f(P)=${format(m.value)}，|∇f|=${format(m.gradLength)}`, plane.sx(-4.35), plane.sy(4.55));
    },
    status(s, m) {
      return `f(P)=${format(m.value)}，∇f=(${format(m.g.x)}, ${format(m.g.y)})。`;
    }
  }

];


/* v1.0 完整高中核心單元擴充：代數函數、幾何向量、微積分、機率統計 */
function comb(n, k) {
  n = Math.round(n);
  k = Math.round(k);
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let result = 1;
  for (let i = 1; i <= k; i++) result = result * (n - k + i) / i;
  return result;
}

function perm(n, k) {
  n = Math.round(n);
  k = Math.round(k);
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let i = 0; i < k; i++) result *= (n - i);
  return result;
}

function sumArray(values) {
  return values.reduce((a, b) => a + b, 0);
}

function mean(values) {
  return values.length ? sumArray(values) / values.length : 0;
}

function variance(values) {
  const mu = mean(values);
  return values.length ? sumArray(values.map(v => (v - mu) ** 2)) / values.length : 0;
}

function drawFilledPolygon(plane, pts, fill = palette.fillBlue, stroke = palette.blue, width = 2) {
  if (!pts.length) return;
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(plane.sx(pts[0].x), plane.sy(pts[0].y));
  for (let i = 1; i < pts.length; i++) ctx.lineTo(plane.sx(pts[i].x), plane.sy(pts[i].y));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawSimpleBarChart(values, labels, highlightIndex = -1, options = {}) {
  const { width, height } = canvas.getBoundingClientRect();
  const pad = options.pad ?? 52;
  const chartW = width - pad * 2;
  const chartH = height - pad * 2;
  const maxV = Math.max(...values, 1e-9);
  const barW = chartW / values.length;
  ctx.save();
  ctx.strokeStyle = palette.axis;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(pad, pad);
  ctx.lineTo(pad, height - pad);
  ctx.lineTo(width - pad, height - pad);
  ctx.stroke();
  for (let i = 0; i < values.length; i++) {
    const h = values[i] / maxV * chartH;
    const x = pad + i * barW + barW * 0.16;
    const y = height - pad - h;
    ctx.fillStyle = i === highlightIndex ? palette.orange : "rgba(47,99,255,.55)";
    ctx.fillRect(x, y, barW * 0.68, h);
    ctx.fillStyle = palette.muted;
    ctx.font = "11px ui-sans-serif, system-ui";
    ctx.textAlign = "center";
    if (values.length <= 20 || i % 2 === 0) ctx.fillText(labels[i], x + barW * 0.34, height - pad + 18);
  }
  ctx.restore();
}

function drawNumberLine(minX, maxX, marks, title = "") {
  const { width, height } = canvas.getBoundingClientRect();
  const y = height * 0.55;
  const left = 70;
  const right = width - 70;
  const map = x => left + (x - minX) / (maxX - minX) * (right - left);
  ctx.save();
  ctx.strokeStyle = palette.axis;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left, y);
  ctx.lineTo(right, y);
  ctx.stroke();
  ctx.fillStyle = palette.muted;
  ctx.font = "12px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  for (let x = Math.ceil(minX); x <= Math.floor(maxX); x++) {
    const sx = map(x);
    ctx.beginPath();
    ctx.moveTo(sx, y - 6);
    ctx.lineTo(sx, y + 6);
    ctx.stroke();
    ctx.fillText(String(x), sx, y + 24);
  }
  for (const mark of marks) {
    const sx = map(mark.x);
    ctx.fillStyle = mark.color ?? palette.blue;
    ctx.beginPath();
    ctx.arc(sx, y, mark.r ?? 7, 0, TAU);
    ctx.fill();
    ctx.fillStyle = palette.ink;
    ctx.font = "800 13px ui-sans-serif, system-ui";
    ctx.fillText(mark.label, sx, y - 14);
  }
  if (title) drawMathLabel(title, left, height * 0.18);
  ctx.restore();
}

function normalPdf(x, mu = 0, sigma = 1) {
  return Math.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * Math.sqrt(TAU));
}

const curriculumModules = [
  {
    id: "number-line-absolute",
    title: "實數與絕對值：距離模型",
    short: "絕對值距離",
    tag: "代數與數線",
    examSignal: "看到 |x-a|、|x-a|+|x-b|，先翻譯成數線上的距離；求最小值時優先想中位數或區間，而不是硬拆絕對值。",
    prompt: "拖曳 x，觀察 |x-a|+|x-b| 在 a 與 b 之間是否保持不變。",
    challenge: "把 a、b 固定後，找出讓 |x-a|+|x-b| 最小的所有 x，並用數線距離解釋。",
    controls: [
      { key: "a", label: "端點 a", min: -5, max: 2, step: 0.1, value: -2.2 },
      { key: "b", label: "端點 b", min: -1, max: 6, step: 0.1, value: 3.4 },
      { key: "x", label: "動點 x", min: -6, max: 6, step: 0.1, value: 0.8 }
    ],
    compute(s) {
      const left = Math.min(s.a, s.b);
      const right = Math.max(s.a, s.b);
      const d1 = Math.abs(s.x - s.a);
      const d2 = Math.abs(s.x - s.b);
      const total = d1 + d2;
      const minValue = right - left;
      const region = s.x >= left && s.x <= right ? "最小值區間內" : "區間外";
      return { left, right, d1, d2, total, minValue, region };
    },
    formula(s, m) {
      return [
        `|x-a| = ${format(m.d1)}，|x-b| = ${format(m.d2)}`,
        `|x-a| + |x-b| = ${format(m.total)}`,
        `最小可能值 = |b-a| = ${format(m.minValue)}`,
        `目前 x 位於：${m.region}`
      ];
    },
    draw(s, m) {
      clearCanvas();
      drawNumberLine(-6, 6, [
        { x: s.a, label: "a", color: palette.blue },
        { x: s.b, label: "b", color: palette.green },
        { x: s.x, label: "x", color: palette.orange, r: 8 }
      ], `距離和=${format(m.total)}，最小值=${format(m.minValue)}`);
      const { width, height } = canvas.getBoundingClientRect();
      const left = 70;
      const right = width - 70;
      const map = x => left + (x + 6) / 12 * (right - left);
      ctx.save();
      ctx.strokeStyle = "rgba(245,158,11,.45)";
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(map(m.left), height * 0.55);
      ctx.lineTo(map(m.right), height * 0.55);
      ctx.stroke();
      ctx.restore();
    },
    status(s, m) {
      return `距離和=${format(m.total)}；${m.region}。`;
    }
  },
  {
    id: "quadratic-vertex",
    title: "二次函數：配方法、頂點與判別式",
    short: "二次函數頂點",
    tag: "函數圖形",
    examSignal: "看到二次函數最值，先配成 y=a(x-h)²+k；看到交點個數，才轉向判別式 Δ。",
    prompt: "調整 a、h、k，觀察開口方向、頂點與 x 軸交點如何改變。",
    challenge: "令 k 逐漸上升，判斷何時有兩個、一個、零個實根。",
    controls: [
      { key: "a", label: "開口係數 a", min: -2.5, max: 2.5, step: 0.1, value: 0.8 },
      { key: "h", label: "頂點 h", min: -4, max: 4, step: 0.1, value: 1.0 },
      { key: "k", label: "頂點 k", min: -4, max: 4, step: 0.1, value: -1.2 },
      { key: "x", label: "觀察 x", min: -5, max: 5, step: 0.1, value: 2.4 }
    ],
    compute(s) {
      const y = s.a * (s.x - s.h) ** 2 + s.k;
      const disc = -4 * s.a * s.k;
      const roots = Math.abs(s.a) < 1e-9 ? 0 : disc > 1e-9 ? 2 : Math.abs(disc) <= 1e-9 ? 1 : 0;
      const minmax = s.a > 0 ? "最小值" : s.a < 0 ? "最大值" : "常數/一次退化";
      return { y, disc, roots, minmax };
    },
    formula(s, m) {
      return [
        `y = ${format(s.a)}(x-${format(s.h)})² + ${format(s.k)}`,
        `頂點 V=(${format(s.h)}, ${format(s.k)})，${m.minmax}為 ${format(s.k)}`,
        `代入 x=${format(s.x)} 時 y=${format(m.y)}`,
        `與 x 軸交點個數：${m.roots}（Δ = -4ak = ${format(m.disc)}）`
      ];
    },
    draw(s, m) {
      const plane = makePlane({ scale: Math.min(canvas.clientWidth, canvas.clientHeight) / 11 });
      drawGrid(plane);
      plotFunction(plane, x => s.a * (x - s.h) ** 2 + s.k, -6, 6, palette.blue, 3, 0.025);
      drawPoint(plane, {x:s.h,y:s.k}, "V", palette.orange, 6);
      drawPoint(plane, {x:s.x,y:m.y}, "P", palette.green, 6);
      drawSegment(plane, {x:s.x,y:0}, {x:s.x,y:m.y}, palette.green, 2, [5, 5]);
      drawMathLabel(`交點數=${m.roots}`, plane.sx(-5.4), plane.sy(4.4));
    },
    status(s, m) {
      return `頂點 (${format(s.h)}, ${format(s.k)})；x 軸交點 ${m.roots} 個。`;
    }
  },
  {
    id: "polynomial-remainder",
    title: "多項式：餘式定理與局部圖形",
    short: "餘式定理",
    tag: "多項式",
    examSignal: "看到「除以 x-c 的餘式」，直接想到 f(c)；看到除以二次式，餘式要設一次式。",
    prompt: "移動 c，觀察除以 x-c 的餘式就是曲線在 x=c 的高度。",
    challenge: "讓 c 靠近一個根，說明餘式為 0 時為何 x-c 是因式。",
    controls: [
      { key: "p", label: "x² 係數 p", min: -3, max: 3, step: 0.1, value: -0.6 },
      { key: "q", label: "x 係數 q", min: -5, max: 5, step: 0.1, value: -2.2 },
      { key: "r", label: "常數 r", min: -4, max: 4, step: 0.1, value: 1.4 },
      { key: "c", label: "除式 x-c", min: -3, max: 3, step: 0.1, value: 1.2 }
    ],
    compute(s) {
      const f = x => x ** 3 + s.p * x ** 2 + s.q * x + s.r;
      const rem = f(s.c);
      const slope = 3 * s.c ** 2 + 2 * s.p * s.c + s.q;
      return { f, rem, slope };
    },
    formula(s, m) {
      return [
        `f(x)=x³+${format(s.p)}x²+${format(s.q)}x+${format(s.r)}`,
        `f(x)=(x-c)Q(x)+f(c)`,
        `c=${format(s.c)}，餘式 f(c)=${format(m.rem)}`,
        `局部切線斜率 f′(c)=${format(m.slope)}（數甲連結）`
      ];
    },
    draw(s, m) {
      const plane = makePlane({ scale: Math.min(canvas.clientWidth, canvas.clientHeight) / 12 });
      drawGrid(plane);
      plotFunction(plane, m.f, -4.3, 4.3, palette.blue, 3, 0.015);
      drawPoint(plane, {x:s.c,y:m.rem}, "f(c)", palette.orange, 6);
      drawSegment(plane, {x:s.c,y:0}, {x:s.c,y:m.rem}, palette.orange, 2, [6, 6]);
      plotFunction(plane, x => m.rem + m.slope * (x - s.c), s.c - 1.2, s.c + 1.2, palette.green, 2, 0.03);
      drawMathLabel(`餘式=${format(m.rem)}`, plane.sx(s.c)+10, plane.sy(m.rem)-12);
    },
    status(s, m) {
      return `除以 x-${format(s.c)} 的餘式為 ${format(m.rem)}。`;
    }
  },
  {
    id: "amgm-rectangle",
    title: "不等式：算幾與固定周長最大面積",
    short: "算幾不等式",
    tag: "代數不等式",
    examSignal: "看到正數、和固定求乘積最大，優先想算幾不等式，並檢查等號成立條件。",
    prompt: "固定 a+b，拖曳 a，觀察面積 ab 何時最大。",
    challenge: "說明為什麼等號條件 a=b 是閱卷時一定要寫的關鍵句。",
    controls: [
      { key: "sum", label: "固定和 a+b", min: 2, max: 10, step: 0.1, value: 6 },
      { key: "a", label: "a", min: 0.2, max: 9.8, step: 0.1, value: 2.1 }
    ],
    compute(s) {
      const a = clamp(s.a, 0.05, s.sum - 0.05);
      const b = s.sum - a;
      const area = a * b;
      const maxArea = (s.sum / 2) ** 2;
      return { a, b, area, maxArea };
    },
    formula(s, m) {
      return [
        `a+b=${format(s.sum)}，ab=${format(m.area)}`,
        `(a+b)/2 ≥ √(ab)`,
        `ab ≤ ((a+b)/2)² = ${format(m.maxArea)}`,
        `等號成立條件：a=b=${format(s.sum/2)}`
      ];
    },
    draw(s, m) {
      clearCanvas();
      const { width, height } = canvas.getBoundingClientRect();
      const scale = Math.min((width*0.55)/s.sum, (height*0.45)/s.sum);
      const x0 = width*0.23;
      const y0 = height*0.72;
      ctx.save();
      ctx.fillStyle = palette.fillGreen;
      ctx.strokeStyle = palette.green;
      ctx.lineWidth = 4;
      ctx.fillRect(x0, y0 - m.b*scale, m.a*scale, m.b*scale);
      ctx.strokeRect(x0, y0 - m.b*scale, m.a*scale, m.b*scale);
      ctx.fillStyle = palette.ink;
      ctx.font = "800 16px ui-sans-serif, system-ui";
      ctx.fillText(`a=${format(m.a)}`, x0 + m.a*scale/2 - 25, y0 + 24);
      ctx.fillText(`b=${format(m.b)}`, x0 - 55, y0 - m.b*scale/2);
      ctx.restore();
      const plane = makePlane({ origin:{x: width*0.72, y: height*0.72}, scale: Math.min(width,height)/16 });
      drawGrid(plane);
      plotFunction(plane, x => x*(s.sum-x), 0, s.sum, palette.blue, 3, 0.02);
      drawPoint(plane, {x:m.a,y:m.area}, "ab", palette.orange, 6);
      drawPoint(plane, {x:s.sum/2,y:m.maxArea}, "max", palette.red, 6);
    },
    status(s, m) {
      return `ab=${format(m.area)}；最大可達 ${format(m.maxArea)}。`;
    }
  },
  {
    id: "exponential-log",
    title: "指數與對數：互為反函數",
    short: "指數對數反函數",
    tag: "指數與對數",
    examSignal: "看到 log_a b 與 a^x=b，要在指數式與對數式間切換；底數限制 a>0 且 a≠1 永遠先檢查。",
    prompt: "調整底數 a，觀察 y=a^x 與 y=log_a x 關於 y=x 對稱。",
    challenge: "選一個點 P 在指數函數上，指出對應到對數函數上的鏡射點。",
    controls: [
      { key: "a", label: "底數 a", min: 0.2, max: 4, step: 0.05, value: 2 },
      { key: "x", label: "指數 x", min: -3, max: 3, step: 0.1, value: 1.5 }
    ],
    compute(s) {
      const a = Math.abs(s.a - 1) < 0.06 ? 1.06 : s.a;
      const y = a ** s.x;
      const logy = Math.log(y) / Math.log(a);
      return { a, y, logy };
    },
    formula(s, m) {
      return [
        `底數限制：a>0 且 a≠1，目前 a=${format(m.a)}`,
        `若 y=aˣ，則 x=log_a y`,
        `a^${format(s.x)} = ${format(m.y)}`,
        `log_a(${format(m.y)}) = ${format(m.logy)}`
      ];
    },
    draw(s, m) {
      const plane = makePlane({ scale: Math.min(canvas.clientWidth, canvas.clientHeight)/11 });
      drawGrid(plane);
      plotFunction(plane, x => m.a ** x, -4, 4, palette.blue, 3, 0.02);
      plotFunction(plane, x => x > 0 ? Math.log(x) / Math.log(m.a) : NaN, 0.05, 6, palette.green, 3, 0.02);
      plotFunction(plane, x => x, -4, 6, palette.axis, 1.8, 0.03);
      drawPoint(plane, {x:s.x,y:m.y}, "P", palette.blue, 6);
      drawPoint(plane, {x:m.y,y:s.x}, "P′", palette.green, 6);
      drawSegment(plane, {x:s.x,y:m.y}, {x:m.y,y:s.x}, palette.orange, 2, [6, 6]);
    },
    status(s, m) {
      return `a^x=${format(m.y)}；鏡射後為 (${format(m.y)}, ${format(s.x)})。`;
    }
  },
  {
    id: "sequence-series",
    title: "數列與級數：等差、等比與部分和",
    short: "數列級數",
    tag: "數列與級數",
    examSignal: "看到固定差想到等差；固定比想到等比。問總和時不要逐項加，先判斷是等差和或等比和。",
    prompt: "切換等差/等比，觀察第 n 項與部分和的成長速度差異。",
    challenge: "選擇等比模式，讓公比 r>1，說明為什麼後面幾項主導總和。",
    controls: [
      { key: "type", label: "類型", type: "select", value: "arith", options: [
        { value: "arith", label: "等差" },
        { value: "geom", label: "等比" }
      ]},
      { key: "a1", label: "首項 a₁", min: -3, max: 5, step: 0.1, value: 1.2 },
      { key: "step", label: "公差 d / 公比 r", min: -2, max: 3, step: 0.1, value: 1.3 },
      { key: "n", label: "項數 n", min: 2, max: 18, step: 1, value: 8 }
    ],
    compute(s) {
      const n = Math.round(s.n);
      const terms = [];
      for (let i = 1; i <= n; i++) {
        terms.push(s.type === "arith" ? s.a1 + (i - 1) * s.step : s.a1 * (s.step ** (i - 1)));
      }
      const sn = sumArray(terms);
      return { n, terms, sn, an: terms[terms.length - 1] };
    },
    formula(s, m) {
      if (s.type === "arith") {
        return [
          `a_n = a₁ + (n-1)d = ${format(m.an)}`,
          `S_n = n(a₁+a_n)/2 = ${format(m.sn)}`,
          `目前 n=${m.n}，公差 d=${format(s.step)}`
        ];
      }
      return [
        `a_n = a₁ r^(n-1) = ${format(m.an)}`,
        `S_n = a₁(1-r^n)/(1-r) = ${format(m.sn)}`,
        `目前 n=${m.n}，公比 r=${format(s.step)}`
      ];
    },
    draw(s, m) {
      clearCanvas();
      const values = m.terms;
      const labels = values.map((_, i) => String(i+1));
      drawSimpleBarChart(values.map(v => Math.max(0, v - Math.min(0, ...values) + 0.2)), labels, m.n-1);
      drawMathLabel(`S_n=${format(m.sn)}`, 65, 42);
    },
    status(s, m) {
      return `a_n=${format(m.an)}，S_n=${format(m.sn)}。`;
    }
  },
  {
    id: "trig-composition",
    title: "三角疊合：a sin x + b cos x",
    short: "正餘弦疊合",
    tag: "三角函數",
    examSignal: "看到 a sin x + b cos x 求最大最小，不必先求相位；先抓振幅 R=√(a²+b²)。",
    prompt: "調整 a、b，觀察疊合波形的振幅如何改變。",
    challenge: "在不求 φ 的情況下，直接寫出最大值與最小值。",
    controls: [
      { key: "a", label: "sin 係數 a", min: -4, max: 4, step: 0.1, value: 2.2 },
      { key: "b", label: "cos 係數 b", min: -4, max: 4, step: 0.1, value: 1.6 },
      { key: "x", label: "角度 x", min: 0, max: 360, step: 1, value: 48, unit: "°" }
    ],
    compute(s) {
      const R = Math.hypot(s.a, s.b);
      const rad = s.x * DEG;
      const y = s.a * Math.sin(rad) + s.b * Math.cos(rad);
      const phi = Math.atan2(s.b, s.a) / DEG;
      return { R, y, phi };
    },
    formula(s, m) {
      return [
        `a sin x + b cos x = R sin(x+φ)`,
        `R=√(a²+b²)=${format(m.R)}`,
        `值域：[${format(-m.R)}, ${format(m.R)}]`,
        `目前 x=${format(s.x,0)}°，函數值=${format(m.y)}`
      ];
    },
    draw(s, m) {
      const plane = makePlane({ origin:{x:canvas.clientWidth/2, y:canvas.clientHeight/2}, scale:Math.min(canvas.clientWidth, canvas.clientHeight)/9 });
      drawGrid(plane);
      plotFunction(plane, x => s.a*Math.sin(x) + s.b*Math.cos(x), -TAU, TAU, palette.blue, 3, 0.015);
      plotFunction(plane, x => m.R, -TAU, TAU, palette.orange, 1.8, 0.1);
      plotFunction(plane, x => -m.R, -TAU, TAU, palette.orange, 1.8, 0.1);
      const rad = s.x * DEG;
      drawPoint(plane, {x:rad, y:m.y}, "P", palette.red, 6);
      drawMathLabel(`R=${format(m.R)}`, plane.sx(-6.1), plane.sy(m.R)-8);
    },
    status(s, m) {
      return `值域 [${format(-m.R)}, ${format(m.R)}]；目前值 ${format(m.y)}。`;
    }
  },
  {
    id: "triangle-laws",
    title: "三角測量：正弦定理、餘弦定理與面積",
    short: "三角測量",
    tag: "三角比",
    examSignal: "看到兩邊夾角，先想到餘弦定理與面積 1/2 ab sin C；看到外接圓，再想到正弦定理。",
    prompt: "調整兩邊與夾角，觀察第三邊、面積與外接圓半徑。",
    challenge: "固定 a、b 時，說明面積何時最大。",
    controls: [
      { key: "a", label: "邊 b=CA", min: 1, max: 5, step: 0.1, value: 3.2 },
      { key: "b", label: "邊 a=CB", min: 1, max: 5, step: 0.1, value: 4.1 },
      { key: "C", label: "夾角 C", min: 20, max: 150, step: 1, value: 62, unit: "°" }
    ],
    compute(s) {
      const C = s.C * DEG;
      const A = {x:s.a, y:0};
      const B = {x:s.b*Math.cos(C), y:s.b*Math.sin(C)};
      const c = Math.hypot(A.x-B.x, A.y-B.y);
      const area = 0.5*s.a*s.b*Math.sin(C);
      const R = c / (2*Math.sin(C));
      return { A, B, c, area, R };
    },
    formula(s, m) {
      return [
        `c² = a²+b²-2ab cos C，c=${format(m.c)}`,
        `面積 K = 1/2 ab sin C = ${format(m.area)}`,
        `正弦定理：c/sin C = 2R，R=${format(m.R)}`,
        `固定兩邊時，C=90° 面積最大`
      ];
    },
    draw(s, m) {
      const plane = makePlane({ scale:Math.min(canvas.clientWidth, canvas.clientHeight)/8, origin:{x:canvas.clientWidth*0.36,y:canvas.clientHeight*0.74} });
      drawGrid(plane);
      drawFilledPolygon(plane, [{x:0,y:0}, m.A, m.B], palette.fillBlue, palette.blue, 3);
      drawPoint(plane, {x:0,y:0}, "C", palette.orange, 6);
      drawPoint(plane, m.A, "A", palette.green, 6);
      drawPoint(plane, m.B, "B", palette.red, 6);
      drawMathLabel(`面積=${format(m.area)}`, plane.sx(0.4), plane.sy(0.8));
    },
    status(s, m) {
      return `第三邊 c=${format(m.c)}；面積=${format(m.area)}。`;
    }
  },
  {
    id: "vector-linear-combination",
    title: "平面向量：線性組合與平行四邊形",
    short: "向量線性組合",
    tag: "平面向量",
    examSignal: "看到點在線段、重心、分點或參數軌跡，把位置寫成向量線性組合。",
    prompt: "拖曳 α、β，觀察 αu+βv 如何在平面上移動。",
    challenge: "讓 α+β=1，觀察點是否落在 u、v 兩端點連線上。",
    controls: [
      { key: "ux", label: "u_x", min: -4, max: 4, step: 0.1, value: 3.0 },
      { key: "uy", label: "u_y", min: -4, max: 4, step: 0.1, value: 1.0 },
      { key: "vx", label: "v_x", min: -4, max: 4, step: 0.1, value: -1.2 },
      { key: "vy", label: "v_y", min: -4, max: 4, step: 0.1, value: 2.6 },
      { key: "alpha", label: "α", min: -1.5, max: 2.5, step: 0.1, value: 0.8 },
      { key: "beta", label: "β", min: -1.5, max: 2.5, step: 0.1, value: 0.6 }
    ],
    compute(s) {
      const u = {x:s.ux,y:s.uy};
      const v = {x:s.vx,y:s.vy};
      const p = {x:s.alpha*u.x + s.beta*v.x, y:s.alpha*u.y + s.beta*v.y};
      return { u, v, p };
    },
    formula(s, m) {
      return [
        `P = αu + βv`,
        `P=(${format(m.p.x)}, ${format(m.p.y)})`,
        `α+β=${format(s.alpha+s.beta)}`,
        `若 α+β=1，P 為仿射組合，可描述分點`
      ];
    },
    draw(s, m) {
      const plane = makePlane({ scale:Math.min(canvas.clientWidth, canvas.clientHeight)/12 });
      drawGrid(plane);
      drawArrow(plane, {x:0,y:0}, m.u, palette.blue, 4, "u");
      drawArrow(plane, {x:0,y:0}, m.v, palette.green, 4, "v");
      drawArrow(plane, {x:0,y:0}, m.p, palette.orange, 4, "P");
      drawSegment(plane, {x:s.alpha*m.u.x,y:s.alpha*m.u.y}, m.p, palette.green, 2, [5,5]);
      drawSegment(plane, {x:s.beta*m.v.x,y:s.beta*m.v.y}, m.p, palette.blue, 2, [5,5]);
      drawPoint(plane, m.p, "αu+βv", palette.orange, 6);
    },
    status(s, m) {
      return `αu+βv=(${format(m.p.x)}, ${format(m.p.y)})。`;
    }
  },
  {
    id: "cauchy-bound",
    title: "柯西不等式：內積上界與等號條件",
    short: "柯西不等式",
    tag: "向量與不等式",
    examSignal: "看到 ax+by 在 x²+y² 固定下求最大，優先轉向內積與柯西不等式。",
    prompt: "拖曳向量 x，觀察 a·x 不會超過 |a||x|。",
    challenge: "把 x 調到與 a 同方向，驗證等號成立。",
    controls: [
      { key: "ax", label: "a_x", min: -4, max: 4, step: 0.1, value: 2.4 },
      { key: "ay", label: "a_y", min: -4, max: 4, step: 0.1, value: 1.6 },
      { key: "theta", label: "x 方向 θ", min: 0, max: 360, step: 1, value: 40, unit: "°" },
      { key: "r", label: "|x|", min: 0.5, max: 4.5, step: 0.1, value: 3.0 }
    ],
    compute(s) {
      const a = {x:s.ax, y:s.ay};
      const x = {x:s.r*Math.cos(s.theta*DEG), y:s.r*Math.sin(s.theta*DEG)};
      const inner = dot(a, x);
      const bound = norm(a)*norm(x);
      const cos = bound < 1e-9 ? 0 : inner/bound;
      return { a, x, inner, bound, cos };
    },
    formula(s, m) {
      return [
        `a·x = ${format(m.inner)}`,
        `|a||x| = ${format(m.bound)}`,
        `|a·x| ≤ |a||x|`,
        `cosθ = ${format(m.cos)}；等號在兩向量平行時成立`
      ];
    },
    draw(s, m) {
      const plane = makePlane({ scale:Math.min(canvas.clientWidth, canvas.clientHeight)/10 });
      drawGrid(plane);
      drawCircle(plane, {x:0,y:0}, s.r, "rgba(47,99,255,.25)", "transparent", 2);
      drawArrow(plane, {x:0,y:0}, m.a, palette.blue, 4, "a");
      drawArrow(plane, {x:0,y:0}, m.x, palette.orange, 4, "x");
      const au = unit2(m.a);
      const projLen = dot(m.x, au);
      const foot = {x:au.x*projLen, y:au.y*projLen};
      drawSegment(plane, m.x, foot, palette.green, 2, [5,5]);
      drawPoint(plane, foot, "投影", palette.green, 5);
    },
    status(s, m) {
      return `a·x=${format(m.inner)}，上界=${format(m.bound)}。`;
    }
  },
  {
    id: "determinant-system",
    title: "二元一次方程組：行列式、面積與唯一解",
    short: "二階行列式",
    tag: "矩陣與線性系統",
    examSignal: "看到二元一次方程組解的個數，先看兩直線是否平行；矩陣法中就是看 det 是否為 0。",
    prompt: "調整係數，觀察 det 接近 0 時兩直線趨近平行、解不穩定。",
    challenge: "讓 det=0，說明方程組為何可能無解或無限多解。",
    controls: [
      { key: "a", label: "a", min: -4, max: 4, step: 0.1, value: 2 },
      { key: "b", label: "b", min: -4, max: 4, step: 0.1, value: -1 },
      { key: "c", label: "c", min: -4, max: 4, step: 0.1, value: 1 },
      { key: "d", label: "d", min: -4, max: 4, step: 0.1, value: 1.8 },
      { key: "e", label: "右式 e", min: -6, max: 6, step: 0.1, value: 2 },
      { key: "f", label: "右式 f", min: -6, max: 6, step: 0.1, value: 1 }
    ],
    compute(s) {
      const det = s.a*s.d - s.b*s.c;
      let sol = null;
      if (Math.abs(det) > 1e-6) sol = {x:(s.e*s.d - s.b*s.f)/det, y:(s.a*s.f - s.e*s.c)/det};
      return { det, sol };
    },
    formula(s, m) {
      return [
        `A=[[a,b],[c,d]]，det(A)=ad-bc=${format(m.det)}`,
        Math.abs(m.det)>1e-6 ? `唯一解：(${format(m.sol.x)}, ${format(m.sol.y)})` : `det=0：兩直線平行或重合，需另判斷`,
        `幾何意義：det 是單位方形變換後的有向面積倍率`
      ];
    },
    draw(s, m) {
      const plane = makePlane({ scale:Math.min(canvas.clientWidth, canvas.clientHeight)/12 });
      drawGrid(plane);
      if (Math.abs(s.b)>1e-6) plotFunction(plane, x => (s.e-s.a*x)/s.b, -7, 7, palette.blue, 3, 0.02);
      else if (Math.abs(s.a)>1e-6) drawInfiniteLine(plane, {x:1,y:0}, s.e/s.a, palette.blue, 3);
      if (Math.abs(s.d)>1e-6) plotFunction(plane, x => (s.f-s.c*x)/s.d, -7, 7, palette.green, 3, 0.02);
      else if (Math.abs(s.c)>1e-6) drawInfiniteLine(plane, {x:1,y:0}, s.f/s.c, palette.green, 3);
      if (m.sol) drawPoint(plane, m.sol, "解", palette.orange, 7);
      const u = {x:s.a,y:s.c}, v={x:s.b,y:s.d};
      drawArrow(plane, {x:0,y:0}, u, palette.red, 2.5, "col1");
      drawArrow(plane, {x:0,y:0}, v, palette.purple, 2.5, "col2");
    },
    status(s, m) {
      return Math.abs(m.det)>1e-6 ? `det=${format(m.det)}，唯一解存在。` : `det≈0，需判斷平行或重合。`;
    }
  },
  {
    id: "markov-chain",
    title: "轉移矩陣：長期穩定狀態",
    short: "轉移矩陣",
    tag: "矩陣應用",
    examSignal: "看到每期比例流動，寫成 Xₙ₊₁=AXₙ；問長期穩定，解 AX=X 並檢查是否收斂。",
    prompt: "調整兩狀態互轉機率，觀察比例是否往固定態靠近。",
    challenge: "比較固定態 x:y=b:a 與實際迭代結果是否一致。",
    controls: [
      { key: "a", label: "A→B 機率 a", min: 0, max: 1, step: 0.01, value: 0.18 },
      { key: "b", label: "B→A 機率 b", min: 0, max: 1, step: 0.01, value: 0.32 },
      { key: "x0", label: "初始 A 比例", min: 0, max: 1, step: 0.01, value: 0.85 },
      { key: "n", label: "迭代期數 n", min: 0, max: 30, step: 1, value: 10 }
    ],
    compute(s) {
      let x = s.x0, y = 1-s.x0;
      const hist = [{x,y}];
      for (let i=0;i<Math.round(s.n);i++) {
        const nx = (1-s.a)*x + s.b*y;
        const ny = s.a*x + (1-s.b)*y;
        x=nx; y=ny; hist.push({x,y});
      }
      const denom = s.a+s.b;
      const stable = denom>1e-9 ? {x:s.b/denom, y:s.a/denom} : null;
      const converge = Math.abs(1-s.a-s.b)<1;
      return { hist, x, y, stable, converge };
    },
    formula(s, m) {
      return [
        `Xₙ₊₁ = [[1-a,b],[a,1-b]] Xₙ`,
        m.stable ? `固定態 A:B = b:a = ${format(m.stable.x)}:${format(m.stable.y)}` : `a=b=0：固定態不唯一`,
        `目前第 n 期：A=${format(m.x)}，B=${format(m.y)}`,
        `收斂條件提示：|1-a-b|<1，目前 ${m.converge ? "通常收斂" : "可能不收斂"}`
      ];
    },
    draw(s, m) {
      clearCanvas();
      const values = m.hist.map(p => p.x);
      drawSimpleBarChart(values, values.map((_,i)=>String(i)), Math.round(s.n), {pad:55});
      const { width } = canvas.getBoundingClientRect();
      if (m.stable) drawMathLabel(`穩定 A=${format(m.stable.x)}`, width*0.06, 42);
    },
    status(s, m) {
      return `第 ${Math.round(s.n)} 期 A=${format(m.x)}，B=${format(m.y)}。`;
    }
  },
  {
    id: "counting-principle",
    title: "排列組合：順序與重複的四象限",
    short: "排列組合分類",
    tag: "排列組合",
    examSignal: "先判斷「是否重複」與「是否考慮順序」：不重複有順序是排列；不重複無順序是組合。",
    prompt: "切換是否重複、是否有順序，觀察公式完全不同。",
    challenge: "自行造一個情境，判斷它落在哪個象限。",
    controls: [
      { key: "n", label: "物件數 n", min: 2, max: 12, step: 1, value: 6 },
      { key: "k", label: "選取數 k", min: 1, max: 8, step: 1, value: 3 },
      { key: "repeat", label: "可重複", type: "select", value: "no", options: [
        { value: "no", label: "不可重複" },
        { value: "yes", label: "可重複" }
      ]},
      { key: "order", label: "考慮順序", type: "select", value: "yes", options: [
        { value: "yes", label: "有順序" },
        { value: "no", label: "無順序" }
      ]}
    ],
    compute(s) {
      const n = Math.round(s.n), k = Math.round(s.k);
      let method, count, formula;
      if (s.repeat==="no" && s.order==="yes") { method="排列"; count=perm(n,k); formula=`P(n,k)=n!/(n-k)!`; }
      else if (s.repeat==="no" && s.order==="no") { method="組合"; count=comb(n,k); formula=`C(n,k)=n!/(k!(n-k)!)`; }
      else if (s.repeat==="yes" && s.order==="yes") { method="重複排列"; count=n**k; formula=`n^k`; }
      else { method="重複組合"; count=comb(n+k-1,k); formula=`H(n,k)=C(n+k-1,k)`; }
      return { n, k, method, count, formula };
    },
    formula(s, m) {
      return [
        `分類：${m.method}`,
        `公式：${m.formula}`,
        `結果：${format(m.count,0)}`,
        `考場第一步：先判斷「重複」與「順序」`
      ];
    },
    draw(s, m) {
      clearCanvas();
      const { width, height } = canvas.getBoundingClientRect();
      const cells = [
        ["不可重複 × 有順序", "排列 P(n,k)"],
        ["不可重複 × 無順序", "組合 C(n,k)"],
        ["可重複 × 有順序", "n^k"],
        ["可重複 × 無順序", "H(n,k)"]
      ];
      ctx.save();
      for (let i=0;i<4;i++) {
        const col=i%2, row=Math.floor(i/2);
        const x=width*(0.12+0.42*col), y=height*(0.18+0.32*row);
        const active = cells[i][1].includes(m.formula.split("=")[0]) || cells[i][0].startsWith(s.repeat==="no"?"不可":"可") && cells[i][0].includes(s.order==="yes"?"有順序":"無順序");
        ctx.fillStyle = active ? palette.fillOrange : "rgba(47,99,255,.08)";
        ctx.strokeStyle = active ? palette.orange : "rgba(47,99,255,.25)";
        ctx.lineWidth=3;
        ctx.beginPath();
        ctx.roundRect(x,y,width*0.34,height*0.22,20);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle=palette.ink; ctx.font="800 18px ui-sans-serif, system-ui"; ctx.fillText(cells[i][0], x+24, y+48);
        ctx.fillStyle=palette.muted; ctx.font="700 16px ui-sans-serif, system-ui"; ctx.fillText(cells[i][1], x+24, y+82);
      }
      ctx.restore();
      drawMathLabel(`${m.method}：${format(m.count,0)} 種`, width*0.12, height*0.08);
    },
    status(s, m) {
      return `${m.method}，共有 ${format(m.count,0)} 種。`;
    }
  },
  {
    id: "binomial-distribution",
    title: "二項分布：重複獨立試驗",
    short: "二項分布",
    tag: "機率分布",
    examSignal: "看到固定次數 n、每次成功率 p、問成功 k 次，立刻辨認二項分布。",
    prompt: "調整 n、p、k，觀察機率分布中心如何移動。",
    challenge: "比較期望值 np 與最高柱的位置是否接近。",
    controls: [
      { key: "n", label: "試驗次數 n", min: 1, max: 30, step: 1, value: 12 },
      { key: "p", label: "成功率 p", min: 0.02, max: 0.98, step: 0.01, value: 0.35 },
      { key: "k", label: "成功次數 k", min: 0, max: 30, step: 1, value: 4 }
    ],
    compute(s) {
      const n = Math.round(s.n);
      const k = clamp(Math.round(s.k), 0, n);
      const probs = Array.from({length:n+1}, (_,i)=>comb(n,i)*(s.p**i)*((1-s.p)**(n-i)));
      const mu = n*s.p;
      const variance = n*s.p*(1-s.p);
      return { n, k, probs, prob:probs[k], mu, variance };
    },
    formula(s, m) {
      return [
        `X~B(n,p)，P(X=k)=C(n,k)p^k(1-p)^(n-k)`,
        `P(X=${m.k})=${format(m.prob,5)}`,
        `E(X)=np=${format(m.mu)}`,
        `Var(X)=np(1-p)=${format(m.variance)}`
      ];
    },
    draw(s, m) {
      clearCanvas();
      drawSimpleBarChart(m.probs, m.probs.map((_,i)=>String(i)), m.k, {pad:55});
      drawMathLabel(`P(X=${m.k})=${format(m.prob,4)}`, 65, 42);
    },
    status(s, m) {
      return `P(X=${m.k})=${format(m.prob,5)}，期望值 ${format(m.mu)}。`;
    }
  },
  {
    id: "geometric-distribution",
    title: "幾何分布：第一次成功在第 k 次",
    short: "幾何分布",
    tag: "機率分布",
    examSignal: "看到「第一次成功」或「直到成功為止」，辨認幾何分布；期望值是 1/p。",
    prompt: "調整成功率 p，觀察等待時間分布如何改變。",
    challenge: "p 越小時，說明為什麼尾巴變長、期望等待次數變大。",
    controls: [
      { key: "p", label: "成功率 p", min: 0.05, max: 0.9, step: 0.01, value: 0.25 },
      { key: "k", label: "第一次成功 k", min: 1, max: 24, step: 1, value: 5 }
    ],
    compute(s) {
      const k = Math.round(s.k);
      const values = Array.from({length:24}, (_,i)=>(1-s.p)**i*s.p);
      const prob = (1-s.p)**(k-1)*s.p;
      const exp = 1/s.p;
      const varx = (1-s.p)/(s.p**2);
      return { k, values, prob, exp, varx };
    },
    formula(s, m) {
      return [
        `P(X=k)=(1-p)^(k-1)p`,
        `P(X=${m.k})=${format(m.prob,5)}`,
        `E(X)=1/p=${format(m.exp)}`,
        `Var(X)=(1-p)/p²=${format(m.varx)}`
      ];
    },
    draw(s, m) {
      clearCanvas();
      drawSimpleBarChart(m.values, m.values.map((_,i)=>String(i+1)), m.k-1, {pad:55});
      drawMathLabel(`E(X)=${format(m.exp)}`, 65, 42);
    },
    status(s, m) {
      return `第一次成功在第 ${m.k} 次機率 ${format(m.prob,5)}。`;
    }
  },
  {
    id: "standardization-transform",
    title: "數據標準化：z 分數與線性轉換",
    short: "標準化",
    tag: "數據分析",
    examSignal: "看到標準化，寫 z=(x-μ)/σ；線性轉換 Y=aX+b 時，平均數跟著轉，標準差乘 |a|。",
    prompt: "調整 x、μ、σ 與線性轉換，觀察相對位置如何保持。",
    challenge: "讓 a 為負，判斷資料大小順序是否反轉。",
    controls: [
      { key: "mu", label: "平均 μ", min: 0, max: 100, step: 0.5, value: 50 },
      { key: "sigma", label: "標準差 σ", min: 0.5, max: 30, step: 0.5, value: 10 },
      { key: "x", label: "資料 x", min: -20, max: 120, step: 0.5, value: 68 },
      { key: "a", label: "線性係數 a", min: -3, max: 3, step: 0.1, value: 1.5 },
      { key: "b", label: "平移 b", min: -30, max: 30, step: 1, value: 5 }
    ],
    compute(s) {
      const sigma = Math.max(0.1, s.sigma);
      const z = (s.x-s.mu)/sigma;
      const y = s.a*s.x+s.b;
      const muy = s.a*s.mu+s.b;
      const sigmay = Math.abs(s.a)*sigma;
      return { sigma, z, y, muy, sigmay };
    },
    formula(s, m) {
      return [
        `z=(x-μ)/σ=${format(m.z)}`,
        `Y=aX+b，目前 y=${format(m.y)}`,
        `μ_Y=aμ+b=${format(m.muy)}`,
        `σ_Y=|a|σ=${format(m.sigmay)}`
      ];
    },
    draw(s, m) {
      clearCanvas();
      drawNumberLine(s.mu-4*m.sigma, s.mu+4*m.sigma, [
        {x:s.mu, label:"μ", color:palette.blue},
        {x:s.x, label:"x", color:palette.orange}
      ], `z=${format(m.z)}`);
      const { width, height } = canvas.getBoundingClientRect();
      ctx.save();
      ctx.fillStyle=palette.muted; ctx.font="800 16px ui-sans-serif, system-ui"; ctx.fillText(`轉換後：y=${format(m.y)}，μ_Y=${format(m.muy)}，σ_Y=${format(m.sigmay)}`, width*0.08, height*0.78);
      ctx.restore();
    },
    status(s, m) {
      return `z=${format(m.z)}；轉換後標準差 ${format(m.sigmay)}。`;
    }
  },
  {
    id: "normal-curve",
    title: "常態分布：平均、標準差與機率區間",
    short: "常態曲線",
    tag: "數據分析",
    examSignal: "看到鐘形曲線、平均與標準差，要把區間換成 z 值，觀察離平均幾個標準差。",
    prompt: "調整 μ、σ 與觀察點 x，視覺化 z 值位置。",
    challenge: "把 x 調到 μ±σ，觀察曲線高度與區間寬度。",
    controls: [
      { key: "mu", label: "平均 μ", min: -3, max: 3, step: 0.1, value: 0 },
      { key: "sigma", label: "標準差 σ", min: 0.4, max: 2.5, step: 0.1, value: 1 },
      { key: "x", label: "觀察 x", min: -5, max: 5, step: 0.1, value: 1.2 }
    ],
    compute(s) {
      const sigma = Math.max(0.1, s.sigma);
      const z = (s.x-s.mu)/sigma;
      const y = normalPdf(s.x, s.mu, sigma);
      return { sigma, z, y };
    },
    formula(s, m) {
      return [
        `z=(x-μ)/σ=${format(m.z)}`,
        `曲線最高點在 x=μ=${format(s.mu)}`,
        `σ 越大，曲線越寬、越扁`,
        `目前密度高度 f(x)=${format(m.y,4)}`
      ];
    },
    draw(s, m) {
      const plane = makePlane({ scale:Math.min(canvas.clientWidth, canvas.clientHeight)/10, origin:{x:canvas.clientWidth/2,y:canvas.clientHeight*0.78} });
      drawGrid(plane);
      plotFunction(plane, x => normalPdf(x, s.mu, m.sigma)*5, -6, 6, palette.blue, 3, 0.02);
      drawPoint(plane, {x:s.x,y:m.y*5}, "x", palette.orange, 6);
      drawSegment(plane, {x:s.x,y:0}, {x:s.x,y:m.y*5}, palette.orange, 2, [5,5]);
      drawMathLabel(`z=${format(m.z)}`, plane.sx(s.x)+12, plane.sy(m.y*5)-12);
    },
    status(s, m) {
      return `x 距平均 ${format(m.z)} 個標準差。`;
    }
  },
  {
    id: "derivative-tangent",
    title: "導數：割線逼近切線",
    short: "導數切線",
    tag: "微分",
    examSignal: "看到瞬時變化率、切線斜率，就想到導數；用割線斜率的極限理解。",
    prompt: "讓 h 越接近 0，觀察割線如何逼近切線。",
    challenge: "比較 h=1、0.5、0.1 時割線斜率與切線斜率的差距。",
    controls: [
      { key: "func", label: "函數", type: "select", value: "cubic", options: [
        { value: "cubic", label: "x³-2x" },
        { value: "sin", label: "sin x" },
        { value: "exp", label: "e^(0.6x)" }
      ]},
      { key: "c", label: "切點 c", min: -3, max: 3, step: 0.1, value: 0.8 },
      { key: "h", label: "割線間距 h", min: -2, max: 2, step: 0.05, value: 0.8 }
    ],
    compute(s) {
      const f = s.func==="sin" ? (x=>Math.sin(x)) : s.func==="exp" ? (x=>Math.exp(0.6*x)) : (x=>x**3-2*x);
      const fp = s.func==="sin" ? (x=>Math.cos(x)) : s.func==="exp" ? (x=>0.6*Math.exp(0.6*x)) : (x=>3*x*x-2);
      const h = Math.abs(s.h)<0.02 ? 0.02 : s.h;
      const secant = (f(s.c+h)-f(s.c))/h;
      const tangent = fp(s.c);
      return { f, fp, h, secant, tangent, yc:f(s.c), yh:f(s.c+h) };
    },
    formula(s, m) {
      return [
        `割線斜率 = [f(c+h)-f(c)]/h = ${format(m.secant)}`,
        `切線斜率 f′(c) = ${format(m.tangent)}`,
        `導數是 h→0 時割線斜率的極限`,
        `誤差 = ${format(Math.abs(m.secant-m.tangent))}`
      ];
    },
    draw(s, m) {
      const plane = makePlane({ scale:Math.min(canvas.clientWidth, canvas.clientHeight)/11 });
      drawGrid(plane);
      plotFunction(plane, m.f, -4, 4, palette.blue, 3, 0.015);
      plotFunction(plane, x=>m.yc+m.tangent*(x-s.c), s.c-1.7, s.c+1.7, palette.orange, 3, 0.02);
      plotFunction(plane, x=>m.yc+m.secant*(x-s.c), Math.min(s.c,s.c+m.h)-0.4, Math.max(s.c,s.c+m.h)+0.4, palette.green, 2.5, 0.02);
      drawPoint(plane, {x:s.c,y:m.yc}, "P", palette.orange, 6);
      drawPoint(plane, {x:s.c+m.h,y:m.yh}, "Q", palette.green, 6);
    },
    status(s, m) {
      return `割線斜率 ${format(m.secant)}；切線斜率 ${format(m.tangent)}。`;
    }
  },
  {
    id: "derivative-optimization",
    title: "微分應用：極值與臨界點",
    short: "導數極值",
    tag: "微分",
    examSignal: "看到可微函數最大最小，先找臨界點與端點；不是只令 f′=0 就結束。",
    prompt: "調整參數 p，觀察三次函數的轉折與極值點。",
    challenge: "判斷什麼情況下局部極大、局部極小會消失。",
    controls: [
      { key: "p", label: "參數 p", min: -4, max: 4, step: 0.1, value: 2 },
      { key: "x", label: "觀察 x", min: -3, max: 3, step: 0.1, value: 0.6 }
    ],
    compute(s) {
      const f = x => x**3 - 3*s.p*x;
      const fp = x => 3*x*x - 3*s.p;
      const crit = s.p>0 ? [-Math.sqrt(s.p), Math.sqrt(s.p)] : [];
      return { f, fp, y:f(s.x), slope:fp(s.x), crit };
    },
    formula(s, m) {
      return [
        `f(x)=x³-3px，f′(x)=3x²-3p`,
        `目前 f′(${format(s.x)})=${format(m.slope)}`,
        m.crit.length ? `臨界點 x=±√p=±${format(Math.sqrt(s.p))}` : `p≤0：沒有兩個不同臨界點`,
        `極值判斷還要看單調性或二階導數`
      ];
    },
    draw(s, m) {
      const plane = makePlane({ scale:Math.min(canvas.clientWidth, canvas.clientHeight)/12 });
      drawGrid(plane);
      plotFunction(plane, m.f, -4, 4, palette.blue, 3, 0.015);
      drawPoint(plane, {x:s.x,y:m.y}, "P", palette.orange, 6);
      plotFunction(plane, x=>m.y+m.slope*(x-s.x), s.x-1.1, s.x+1.1, palette.green, 2, 0.02);
      for (const c of m.crit) drawPoint(plane, {x:c,y:m.f(c)}, "臨界", palette.red, 5);
    },
    status(s, m) {
      return `目前斜率 f′=${format(m.slope)}；臨界點數 ${m.crit.length}。`;
    }
  },
  {
    id: "limit-continuity",
    title: "極限與連續：左右逼近",
    short: "極限連續",
    tag: "極限",
    examSignal: "看到 x→a，要看左右逼近值；連續還要函數值等於極限。",
    prompt: "調整 x 靠近 1，觀察可去間斷的函數值與極限。",
    challenge: "說明為什麼 x=1 沒定義，不影響極限存在。",
    controls: [
      { key: "x", label: "x", min: -2, max: 4, step: 0.01, value: 1.6 },
      { key: "hole", label: "補點高度", min: -2, max: 4, step: 0.1, value: 1.5 }
    ],
    compute(s) {
      const f = x => Math.abs(x-1)<1e-6 ? NaN : (x*x-1)/(x-1);
      const y = f(s.x);
      const limit = 2;
      const continuous = Math.abs(s.hole-limit)<1e-6;
      return { f, y, limit, continuous };
    },
    formula(s, m) {
      return [
        `f(x)=(x²-1)/(x-1)=x+1（x≠1）`,
        `lim x→1 f(x)=2`,
        `補點 f(1)=${format(s.hole)}，${m.continuous ? "連續" : "不連續"}`,
        `連續條件：函數值 = 極限值`
      ];
    },
    draw(s, m) {
      const plane = makePlane({ scale:Math.min(canvas.clientWidth, canvas.clientHeight)/10 });
      drawGrid(plane);
      plotFunction(plane, x => x+1, -3, 5, palette.blue, 3, 0.02);
      drawPoint(plane, {x:1,y:2}, "洞", palette.red, 7);
      ctx.save();
      ctx.fillStyle="#fff";
      ctx.beginPath(); ctx.arc(plane.sx(1), plane.sy(2), 5, 0, TAU); ctx.fill();
      ctx.strokeStyle=palette.red; ctx.lineWidth=3; ctx.stroke();
      ctx.restore();
      drawPoint(plane, {x:1,y:s.hole}, "f(1)", palette.orange, 6);
      if (Number.isFinite(m.y)) drawPoint(plane, {x:s.x,y:m.y}, "x", palette.green, 5);
    },
    status(s, m) {
      return `極限值 2；目前補點 ${m.continuous ? "使函數連續" : "仍不連續"}。`;
    }
  },
  {
    id: "ftc-accumulation",
    title: "微積分基本定理：累積面積函數",
    short: "累積面積",
    tag: "積分",
    examSignal: "看到 F(x)=∫_a^x f(t)dt，立刻想到 F′(x)=f(x)，面積累積的瞬時變化率就是原函數。",
    prompt: "移動上限 x，觀察面積函數如何累積。",
    challenge: "當 f(x)<0 時，說明累積面積函數為什麼會下降。",
    controls: [
      { key: "func", label: "f(t)", type: "select", value: "line", options: [
        { value: "line", label: "t-1" },
        { value: "sin", label: "sin t" },
        { value: "quad", label: "2-t²" }
      ]},
      { key: "x", label: "上限 x", min: -3, max: 4, step: 0.05, value: 2.2 }
    ],
    compute(s) {
      const f = s.func==="sin" ? (t=>Math.sin(t)) : s.func==="quad" ? (t=>2-t*t) : (t=>t-1);
      let area = 0;
      const a = 0, b = s.x, n = 320;
      const lo = Math.min(a,b), hi=Math.max(a,b), dx=(hi-lo)/n;
      for (let i=0;i<n;i++) {
        const mid=lo+(i+0.5)*dx;
        area += f(mid)*dx;
      }
      if (b<a) area *= -1;
      return { f, area, fx:f(s.x) };
    },
    formula(s, m) {
      return [
        `F(x)=∫₀ˣ f(t)dt`,
        `F(${format(s.x)})≈${format(m.area)}`,
        `F′(x)=f(x)=${format(m.fx)}`,
        `上限移動時，累積函數的斜率等於當下高度`
      ];
    },
    draw(s, m) {
      const plane = makePlane({ scale:Math.min(canvas.clientWidth, canvas.clientHeight)/11 });
      drawGrid(plane);
      const start=0, end=s.x, lo=Math.min(start,end), hi=Math.max(start,end);
      ctx.save();
      ctx.fillStyle="rgba(245,158,11,.18)";
      ctx.beginPath();
      ctx.moveTo(plane.sx(lo), plane.sy(0));
      for (let t=lo;t<=hi;t+=0.025) ctx.lineTo(plane.sx(t), plane.sy(m.f(t)));
      ctx.lineTo(plane.sx(hi), plane.sy(0));
      ctx.closePath(); ctx.fill();
      ctx.restore();
      plotFunction(plane, m.f, -4, 4.5, palette.blue, 3, 0.015);
      drawPoint(plane, {x:s.x,y:m.fx}, "f(x)", palette.orange, 6);
      drawMathLabel(`F(x)≈${format(m.area)}`, plane.sx(-3.6), plane.sy(4.1));
    },
    status(s, m) {
      return `累積量 F(x)≈${format(m.area)}，當下斜率 f(x)=${format(m.fx)}。`;
    }
  },
  {
    id: "area-between-curves",
    title: "定積分：兩曲線所夾面積",
    short: "兩曲線面積",
    tag: "積分",
    examSignal: "看到兩曲線面積，先找交點，再判斷上函數減下函數，不能直接亂積。",
    prompt: "調整參數 k，觀察交點與夾面積如何變化。",
    challenge: "說明為什麼面積要用上減下，而不是單純相減後不管正負。",
    controls: [
      { key: "k", label: "直線高度 k", min: -2, max: 4, step: 0.1, value: 1.2 }
    ],
    compute(s) {
      const f = x => 4 - x*x;
      const g = x => s.k;
      const a = -Math.sqrt(Math.max(0,4-s.k));
      const b = Math.sqrt(Math.max(0,4-s.k));
      const area = s.k <= 4 ? ( (4-s.k)*(b-a) - (b**3-a**3)/3 ) : 0;
      return { f, g, a, b, area };
    },
    formula(s, m) {
      return [
        `上函數：4-x²，下函數：${format(s.k)}`,
        `交點 x=±√(4-k)：${format(m.a)}, ${format(m.b)}`,
        `面積 = ∫[上-下]dx = ${format(m.area)}`,
        `先找交點，再決定積分區間`
      ];
    },
    draw(s, m) {
      const plane = makePlane({ scale:Math.min(canvas.clientWidth, canvas.clientHeight)/11 });
      drawGrid(plane);
      if (s.k <= 4) {
        ctx.save();
        ctx.fillStyle="rgba(24,169,153,.18)";
        ctx.beginPath();
        ctx.moveTo(plane.sx(m.a), plane.sy(s.k));
        for (let x=m.a; x<=m.b; x+=0.025) ctx.lineTo(plane.sx(x), plane.sy(m.f(x)));
        ctx.lineTo(plane.sx(m.b), plane.sy(s.k));
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      plotFunction(plane, m.f, -3, 3, palette.blue, 3, 0.015);
      plotFunction(plane, m.g, -4, 4, palette.green, 3, 0.05);
      drawMathLabel(`A=${format(m.area)}`, plane.sx(-3.8), plane.sy(4.5));
    },
    status(s, m) {
      return `夾面積 ${format(m.area)}。`;
    }
  },
  {
    id: "complex-demoivre",
    title: "複數：棣美弗定理與 n 次方軌跡",
    short: "棣美弗定理",
    tag: "複數平面",
    examSignal: "看到複數乘方，轉極式：模長取 n 次方，幅角乘 n。",
    prompt: "調整 r、θ、n，觀察 zⁿ 如何旋轉並伸縮。",
    challenge: "令 r=1，觀察所有 zⁿ 是否仍在單位圓上。",
    controls: [
      { key: "r", label: "模長 r", min: 0.2, max: 2.2, step: 0.05, value: 1.1 },
      { key: "theta", label: "幅角 θ", min: -180, max: 180, step: 1, value: 35, unit: "°" },
      { key: "n", label: "次方 n", min: 1, max: 8, step: 1, value: 3 }
    ],
    compute(s) {
      const n = Math.round(s.n);
      const rN = s.r ** n;
      const ang = s.theta * n * DEG;
      const z = {x:s.r*Math.cos(s.theta*DEG), y:s.r*Math.sin(s.theta*DEG)};
      const zn = {x:rN*Math.cos(ang), y:rN*Math.sin(ang)};
      return { n, rN, angDeg:s.theta*n, z, zn };
    },
    formula(s, m) {
      return [
        `z=r(cosθ+i sinθ)`,
        `z^n = r^n[cos(nθ)+i sin(nθ)]`,
        `r^n=${format(m.rN)}，nθ=${format(m.angDeg)}°`,
        `z^n=(${format(m.zn.x)}, ${format(m.zn.y)})`
      ];
    },
    draw(s, m) {
      const plane = makePlane({ scale:Math.min(canvas.clientWidth, canvas.clientHeight)/9 });
      drawGrid(plane);
      drawCircle(plane, {x:0,y:0}, 1, "rgba(101,112,137,.35)", "transparent", 2);
      drawArrow(plane, {x:0,y:0}, m.z, palette.blue, 4, "z");
      drawArrow(plane, {x:0,y:0}, m.zn, palette.orange, 4, "zⁿ");
      drawPoint(plane, m.z, "z", palette.blue, 6);
      drawPoint(plane, m.zn, "zⁿ", palette.orange, 6);
    },
    status(s, m) {
      return `z^${m.n}=(${format(m.zn.x)}, ${format(m.zn.y)})。`;
    }
  },
  {
    id: "conic-tangent",
    title: "圓錐曲線切線：橢圓上的切線",
    short: "橢圓切線",
    tag: "二次曲線",
    examSignal: "看到橢圓上一點切線，可用標準式切線 xx₀/a² + yy₀/b² = 1；先確認點在橢圓上。",
    prompt: "移動橢圓參數點，觀察切線方向與半徑向量不一定垂直。",
    challenge: "比較圓的切線與橢圓切線，找出公式上的差異。",
    controls: [
      { key: "a", label: "半長軸 a", min: 1.5, max: 4.5, step: 0.1, value: 3.4 },
      { key: "b", label: "半短軸 b", min: 0.8, max: 3.5, step: 0.1, value: 1.8 },
      { key: "t", label: "參數 t", min: 0, max: 360, step: 1, value: 45, unit: "°" }
    ],
    compute(s) {
      const t = s.t*DEG;
      const P = {x:s.a*Math.cos(t), y:s.b*Math.sin(t)};
      const normal = {x:P.x/(s.a*s.a), y:P.y/(s.b*s.b)};
      return { P, normal };
    },
    formula(s, m) {
      return [
        `橢圓：x²/a² + y²/b² = 1`,
        `P=(${format(m.P.x)}, ${format(m.P.y)})`,
        `切線：xx₀/a² + yy₀/b² = 1`,
        `法向量 n=(x₀/a², y₀/b²)`
      ];
    },
    draw(s, m) {
      const plane = makePlane({ scale:Math.min(canvas.clientWidth, canvas.clientHeight)/10 });
      drawGrid(plane);
      ctx.save();
      ctx.strokeStyle=palette.blue; ctx.lineWidth=3;
      ctx.beginPath();
      for (let t=0;t<=TAU+0.02;t+=0.02) {
        const x=s.a*Math.cos(t), y=s.b*Math.sin(t);
        if (t===0) ctx.moveTo(plane.sx(x), plane.sy(y)); else ctx.lineTo(plane.sx(x), plane.sy(y));
      }
      ctx.stroke(); ctx.restore();
      drawInfiniteLine(plane, m.normal, 1, palette.orange, 3);
      drawPoint(plane, m.P, "P", palette.red, 6);
      drawArrow(plane, m.P, {x:m.P.x+m.normal.x*2, y:m.P.y+m.normal.y*2}, palette.green, 3, "n");
    },
    status(s, m) {
      return `切點 P=(${format(m.P.x)}, ${format(m.P.y)})。`;
    }
  },
  {
    id: "sampling-clt",
    title: "抽樣分布：樣本平均與中心極限定理直覺",
    short: "抽樣平均",
    tag: "統計模擬",
    examSignal: "看到樣本平均，平均仍為 μ，標準差縮為 σ/√n；樣本數越大，分布越集中。",
    prompt: "調整樣本數 n，觀察樣本平均的標準差如何變小。",
    challenge: "把 n 放大 4 倍，標準誤會變成幾倍？",
    controls: [
      { key: "mu", label: "母體平均 μ", min: -2, max: 2, step: 0.1, value: 0 },
      { key: "sigma", label: "母體標準差 σ", min: 0.5, max: 3, step: 0.1, value: 1.8 },
      { key: "n", label: "樣本數 n", min: 1, max: 64, step: 1, value: 16 }
    ],
    compute(s) {
      const se = s.sigma / Math.sqrt(Math.round(s.n));
      return { se };
    },
    formula(s, m) {
      return [
        `E(X̄)=μ=${format(s.mu)}`,
        `SD(X̄)=σ/√n=${format(m.se)}`,
        `n 越大，樣本平均越集中`,
        `這是估計與信賴區間的直覺基礎`
      ];
    },
    draw(s, m) {
      const plane = makePlane({ scale:Math.min(canvas.clientWidth, canvas.clientHeight)/10, origin:{x:canvas.clientWidth/2,y:canvas.clientHeight*0.76} });
      drawGrid(plane);
      plotFunction(plane, x => normalPdf(x, s.mu, s.sigma)*4, -6, 6, "rgba(101,112,137,.55)", 2, 0.02);
      plotFunction(plane, x => normalPdf(x, s.mu, m.se)*4, -6, 6, palette.blue, 3, 0.02);
      drawMathLabel(`母體 σ=${format(s.sigma)}；平均標準誤=${format(m.se)}`, plane.sx(-5.7), plane.sy(4.2));
    },
    status(s, m) {
      return `樣本平均標準差 σ/√n=${format(m.se)}。`;
    }
  },
  {
    id: "boxplot-spread",
    title: "資料分布：五數概括、盒狀圖與離群值",
    short: "盒狀圖",
    tag: "數據分析",
    examSignal: "看到中位數、四分位距、離群值，先畫盒狀圖；平均數容易受極端值影響，中位數較穩健。",
    prompt: "調整偏態與離群值，觀察平均數與中位數的差距。",
    challenge: "讓離群值變大，說明哪個統計量改變最多。",
    controls: [
      { key: "skew", label: "偏態程度", min: -3, max: 3, step: 0.1, value: 1.0 },
      { key: "outlier", label: "離群值大小", min: 0, max: 8, step: 0.1, value: 3.0 }
    ],
    compute(s) {
      const base = [-2.1,-1.4,-0.9,-0.5,-0.2,0.1,0.4,0.8,1.1,1.5].map((v,i)=>v + s.skew*(i/9)**2);
      const data = [...base, 1.8+s.outlier].sort((a,b)=>a-b);
      const q = p => {
        const pos = (data.length-1)*p;
        const lo = Math.floor(pos), hi = Math.ceil(pos);
        return data[lo] + (data[hi]-data[lo])*(pos-lo);
      };
      const q1=q(0.25), med=q(0.5), q3=q(0.75), avg=mean(data), iqr=q3-q1;
      return { data, q1, med, q3, avg, min:data[0], max:data[data.length-1], iqr };
    },
    formula(s, m) {
      return [
        `Q1=${format(m.q1)}，Median=${format(m.med)}，Q3=${format(m.q3)}`,
        `IQR=Q3-Q1=${format(m.iqr)}`,
        `平均數=${format(m.avg)}`,
        `離群判斷常用界線：Q1-1.5IQR、Q3+1.5IQR`
      ];
    },
    draw(s, m) {
      clearCanvas();
      const { width, height } = canvas.getBoundingClientRect();
      const minX=-4, maxX=10, y=height*0.55, left=70, right=width-70;
      const map=x=>left+(x-minX)/(maxX-minX)*(right-left);
      ctx.save();
      ctx.strokeStyle=palette.axis; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(left,y); ctx.lineTo(right,y); ctx.stroke();
      for (const v of m.data) {
        ctx.fillStyle=palette.blue; ctx.beginPath(); ctx.arc(map(v), y+55, 4, 0, TAU); ctx.fill();
      }
      ctx.strokeStyle=palette.orange; ctx.lineWidth=3;
      ctx.strokeRect(map(m.q1), y-35, map(m.q3)-map(m.q1), 70);
      ctx.beginPath(); ctx.moveTo(map(m.med), y-35); ctx.lineTo(map(m.med), y+35); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(map(m.min), y); ctx.lineTo(map(m.q1), y); ctx.moveTo(map(m.q3), y); ctx.lineTo(map(m.max), y); ctx.stroke();
      ctx.fillStyle=palette.red; ctx.beginPath(); ctx.arc(map(m.avg), y-62, 6, 0, TAU); ctx.fill();
      ctx.fillStyle=palette.ink; ctx.font="800 13px ui-sans-serif, system-ui"; ctx.fillText("平均", map(m.avg)+8, y-58);
      ctx.restore();
      drawMathLabel(`中位數=${format(m.med)}，平均=${format(m.avg)}`, 70, 42);
    },
    status(s, m) {
      return `中位數 ${format(m.med)}；平均數 ${format(m.avg)}。`;
    }
  },
  {
    id: "space-plane-distance",
    title: "空間向量：點到平面距離",
    short: "點到平面距離",
    tag: "空間向量",
    examSignal: "看到點到平面距離，抓平面法向量 n，套 |n·P-c|/|n|；不要把三維問題硬畫成二維直角三角形。",
    prompt: "調整點 P 與平面常數，觀察有號距離與投影點。",
    challenge: "讓 P 落在平面上，驗證分子 n·P-c 變為 0。",
    controls: [
      { key: "px", label: "P_x", min: -3, max: 3, step: 0.1, value: 1.6 },
      { key: "py", label: "P_y", min: -3, max: 3, step: 0.1, value: 1.0 },
      { key: "pz", label: "P_z", min: -1, max: 4, step: 0.1, value: 2.4 },
      { key: "c", label: "平面 x+y+z=c", min: -2, max: 5, step: 0.1, value: 2.2 },
      { key: "view", label: "視角", min: 0, max: 360, step: 1, value: 38, unit: "°" }
    ],
    compute(s) {
      const P={x:s.px,y:s.py,z:s.pz};
      const n={x:1,y:1,z:1};
      const signed=(dot3(P,n)-s.c)/norm3(n);
      const foot=sub3(P, scale3(n, (dot3(P,n)-s.c)/dot3(n,n)));
      return { P, n, signed, distance:Math.abs(signed), foot };
    },
    formula(s, m) {
      return [
        `平面：x+y+z=c`,
        `d=|n·P-c|/|n|=${format(m.distance)}`,
        `投影點 H=(${format(m.foot.x)}, ${format(m.foot.y)}, ${format(m.foot.z)})`,
        `PH 方向平行法向量 n`
      ];
    },
    draw(s, m) {
      clearCanvas();
      const { width, height } = canvas.getBoundingClientRect();
      const scale=Math.min(width,height)/9;
      const angle=s.view*DEG;
      const origin={x:width*0.52,y:height*0.58};
      const project=p=>{
        const xr=Math.cos(angle)*p.x-Math.sin(angle)*p.y;
        const yr=Math.sin(angle)*p.x+Math.cos(angle)*p.y;
        return {x:origin.x+scale*xr, y:origin.y+scale*(0.45*yr-p.z)};
      };
      const seg=(a,b,color,w=3,dash=[])=>{
        const pa=project(a), pb=project(b);
        ctx.save(); ctx.strokeStyle=color; ctx.lineWidth=w; ctx.setLineDash(dash);
        ctx.beginPath(); ctx.moveTo(pa.x,pa.y); ctx.lineTo(pb.x,pb.y); ctx.stroke(); ctx.restore();
      };
      drawArrowPixels(project({x:0,y:0,z:0}), project({x:3,y:0,z:0}), "rgba(239,68,68,.55)", 2.5, "x");
      drawArrowPixels(project({x:0,y:0,z:0}), project({x:0,y:3,z:0}), "rgba(24,169,153,.55)", 2.5, "y");
      drawArrowPixels(project({x:0,y:0,z:0}), project({x:0,y:0,z:3}), "rgba(47,99,255,.55)", 2.5, "z");
      const A={x:s.c,y:0,z:0}, B={x:0,y:s.c,z:0}, C={x:0,y:0,z:s.c};
      ctx.save(); ctx.fillStyle="rgba(47,99,255,.12)"; ctx.strokeStyle=palette.blue; ctx.lineWidth=2.5;
      ctx.beginPath(); let pA=project(A), pB=project(B), pC=project(C); ctx.moveTo(pA.x,pA.y); ctx.lineTo(pB.x,pB.y); ctx.lineTo(pC.x,pC.y); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      seg(m.P,m.foot,palette.orange,4,[6,6]);
      drawPointPixels(project(m.P), "P", palette.red, 7);
      drawPointPixels(project(m.foot), "H", palette.orange, 6);
      drawMathLabel(`d=${format(m.distance)}`, width*0.07, height*0.12);
    },
    status(s, m) {
      return `點到平面距離 ${format(m.distance)}。`;
    }
  }
];

modules.push(...curriculumModules);

const masteryModules = [
  {
    id: "set-logic-venn",
    title: "集合與邏輯：文氏圖與命題運算",
    short: "集合與邏輯",
    tag: "數與式／邏輯",
    examSignal: "看到「且、或、非、至少一個」時，先轉成集合運算：交集、聯集、補集；再用容斥或反面事件。",
    prompt: "調整兩事件比例與重疊比例，觀察 P(A∪B)=P(A)+P(B)-P(A∩B) 的扣重意義。",
    challenge: "說明為什麼「至少一個發生」常用反面事件比較快。",
    controls: [
      { key: "pa", label: "P(A) 百分比", min: 10, max: 80, step: 1, value: 55, unit: "%" },
      { key: "pb", label: "P(B) 百分比", min: 10, max: 80, step: 1, value: 45, unit: "%" },
      { key: "pi", label: "P(A∩B) 百分比", min: 0, max: 40, step: 1, value: 20, unit: "%" }
    ],
    compute(s) {
      const A = s.pa / 100, B = s.pb / 100;
      const I = Math.min(s.pi / 100, A, B);
      const U = A + B - I;
      return { A, B, I, U, comp: 1 - U };
    },
    formula(s, m) {
      return [
        `P(A∪B)=P(A)+P(B)-P(A∩B)=${format(m.U)}`,
        `P(A^c∩B^c)=1-P(A∪B)=${format(m.comp)}`,
        `A only=${format(m.A-m.I)}，B only=${format(m.B-m.I)}`
      ];
    },
    draw(s, m) {
      const { width, height } = canvas.getBoundingClientRect();
      ctx.save();
      ctx.fillStyle = "rgba(47,99,255,.22)";
      ctx.beginPath(); ctx.arc(width*0.43, height*0.52, 120, 0, TAU); ctx.fill();
      ctx.fillStyle = "rgba(245,158,11,.24)";
      ctx.beginPath(); ctx.arc(width*0.57, height*0.52, 120, 0, TAU); ctx.fill();
      ctx.strokeStyle = palette.blue; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(width*0.43, height*0.52, 120, 0, TAU); ctx.stroke();
      ctx.strokeStyle = palette.orange;
      ctx.beginPath(); ctx.arc(width*0.57, height*0.52, 120, 0, TAU); ctx.stroke();
      ctx.fillStyle = palette.ink; ctx.font = "800 18px ui-sans-serif, system-ui"; ctx.textAlign = "center";
      ctx.fillText("A", width*0.35, height*0.52);
      ctx.fillText("A∩B", width*0.50, height*0.52);
      ctx.fillText("B", width*0.65, height*0.52);
      drawMathLabel(`P(A∪B)=${format(m.U)}`, width*0.08, height*0.16);
      drawMathLabel(`補集=${format(m.comp)}`, width*0.08, height*0.24);
      ctx.restore();
    },
    status(s, m) {
      return `聯集機率 ${format(m.U)}；反面機率 ${format(m.comp)}。`;
    }
  },
  {
    id: "line-slope-intercept",
    title: "直線：斜率、截距、平行與垂直",
    short: "直線方程",
    tag: "解析幾何",
    examSignal: "看到「平行、垂直、斜率」先轉成 m；垂直時斜率乘積為 -1，點斜式比截距式更穩。",
    prompt: "調整斜率與截距，觀察平行線、垂線與交點位置。",
    challenge: "給定一點與斜率時，請寫出點斜式並轉成一般式。",
    controls: [
      { key: "m", label: "斜率 m", min: -3, max: 3, step: 0.1, value: 1.2 },
      { key: "b", label: "截距 b", min: -4, max: 4, step: 0.1, value: -0.5 },
      { key: "x0", label: "過點 x₀", min: -4, max: 4, step: 0.1, value: 1.5 }
    ],
    compute(s) {
      const y0 = s.m * s.x0 + s.b;
      const mp = Math.abs(s.m) < 1e-9 ? Infinity : -1 / s.m;
      return { P: {x:s.x0, y:y0}, mp };
    },
    formula(s, m) {
      return [
        `L: y=${format(s.m)}x+${format(s.b)}`,
        `過 P(${format(m.P.x)},${format(m.P.y)}) 的垂線斜率 m⊥=${Number.isFinite(m.mp)?format(m.mp):"不存在"}`,
        `平行線斜率相同；垂直線斜率乘積 -1`
      ];
    },
    draw(s, m) {
      const plane = makePlane({ scale: Math.min(canvas.clientWidth, canvas.clientHeight)/12 });
      drawGrid(plane);
      plotFunction(plane, x => s.m*x+s.b, -8, 8, palette.blue, 3);
      if (Number.isFinite(m.mp)) plotFunction(plane, x => m.mp*(x-m.P.x)+m.P.y, -8, 8, palette.orange, 3);
      else drawInfiniteLine(plane, {x:1,y:0}, m.P.x, palette.orange, 3);
      drawPoint(plane, m.P, "P", palette.red);
      drawMathLabel(`m=${format(s.m)}`, plane.sx(-5.5), plane.sy(s.m*(-5.5)+s.b)-16);
    },
    status(s, m) {
      return `點 P=(${format(m.P.x)}, ${format(m.P.y)})；垂線斜率 ${Number.isFinite(m.mp)?format(m.mp):"不存在"}。`;
    }
  },
  {
    id: "linear-programming",
    title: "線性規劃：半平面交集與目標函數",
    short: "線性規劃",
    tag: "不等式／解析幾何",
    examSignal: "看到「最大利潤、最小成本、限制條件」先畫可行域；線性目標函數的極值通常在頂點。",
    prompt: "拖曳目標函數方向，觀察等值線掃過可行域時，最大值出現在某個頂點。",
    challenge: "找出可行域所有頂點，逐點代入目標函數比較。",
    controls: [
      { key: "c", label: "限制 x+y≤c", min: 2, max: 8, step: 0.2, value: 5.5 },
      { key: "u", label: "限制 2x+y≤u", min: 2, max: 10, step: 0.2, value: 7 },
      { key: "a", label: "目標係數 a", min: 0.2, max: 4, step: 0.1, value: 2 },
      { key: "b", label: "目標係數 b", min: 0.2, max: 4, step: 0.1, value: 1 }
    ],
    compute(s) {
      const pts = [{x:0,y:0}, {x:0,y:Math.min(s.c, s.u)}, {x:Math.min(s.c, s.u/2),y:0}];
      const inter = {x:s.u-s.c, y:2*s.c-s.u};
      if (inter.x >= 0 && inter.y >= 0 && inter.y <= s.c+1e-9) pts.push(inter);
      const values = pts.map(p => s.a*p.x + s.b*p.y);
      let maxIndex = 0;
      for (let i=1;i<values.length;i++) if (values[i]>values[maxIndex]) maxIndex=i;
      return { pts, values, best: pts[maxIndex], maxValue: values[maxIndex] };
    },
    formula(s, m) {
      return [
        `限制：x≥0, y≥0, x+y≤${format(s.c)}, 2x+y≤${format(s.u)}`,
        `目標：Z=${format(s.a)}x+${format(s.b)}y`,
        `目前最大頂點 (${format(m.best.x)}, ${format(m.best.y)})，Zmax=${format(m.maxValue)}`
      ];
    },
    draw(s, m) {
      const plane = makePlane({ scale: Math.min(canvas.clientWidth, canvas.clientHeight)/10, origin:{x:70,y:canvas.clientHeight-70} });
      drawGrid(plane);
      const poly = m.pts.slice().sort((p,q)=>Math.atan2(p.y-1,p.x-1)-Math.atan2(q.y-1,q.x-1));
      drawFilledPolygon(plane, poly, palette.fillGreen, palette.green, 2);
      plotFunction(plane, x=>s.c-x, 0, 8, palette.blue, 2);
      plotFunction(plane, x=>s.u-2*x, 0, 8, palette.purple, 2);
      for (const p of m.pts) drawPoint(plane, p, "", palette.blue, 4);
      drawPoint(plane, m.best, "max", palette.red, 6);
    },
    status(s, m) {
      return `線性目標最大值目前在 (${format(m.best.x)}, ${format(m.best.y)})。`;
    }
  },
  {
    id: "circle-standard-equation",
    title: "圓方程：標準式、一般式與切線半徑",
    short: "圓方程",
    tag: "直線與圓",
    examSignal: "看到 x²+y²+Dx+Ey+F=0，先配方成圓心與半徑；切線一定垂直半徑。",
    prompt: "移動圓心與切點，觀察切線與半徑垂直。",
    challenge: "把標準式展開成一般式，並檢查半徑是否為實數。",
    controls: [
      { key: "h", label: "圓心 h", min: -3, max: 3, step: 0.1, value: -1 },
      { key: "k", label: "圓心 k", min: -3, max: 3, step: 0.1, value: 1 },
      { key: "r", label: "半徑 r", min: 0.5, max: 4, step: 0.1, value: 2 },
      { key: "theta", label: "切點角 θ", min: 0, max: 360, step: 1, value: 35, unit: "°" }
    ],
    compute(s) {
      const t = s.theta*DEG;
      const T = {x:s.h+s.r*Math.cos(t), y:s.k+s.r*Math.sin(t)};
      const normal = {x:Math.cos(t), y:Math.sin(t)};
      const c = normal.x*T.x + normal.y*T.y;
      return { T, normal, c, D:-2*s.h, E:-2*s.k, F:s.h*s.h+s.k*s.k-s.r*s.r };
    },
    formula(s,m) {
      return [
        `(x-${format(s.h)})²+(y-${format(s.k)})²=${format(s.r*s.r)}`,
        `一般式：x²+y²+(${format(m.D)})x+(${format(m.E)})y+(${format(m.F)})=0`,
        `切線：${format(m.normal.x)}x+${format(m.normal.y)}y=${format(m.c)}`
      ];
    },
    draw(s,m) {
      const plane = makePlane({ scale: Math.min(canvas.clientWidth, canvas.clientHeight)/12 });
      drawGrid(plane);
      drawCircle(plane, {x:s.h,y:s.k}, s.r, palette.blue, palette.fillBlue, 3);
      drawPoint(plane, {x:s.h,y:s.k}, "O", palette.green);
      drawPoint(plane, m.T, "T", palette.red);
      drawSegment(plane, {x:s.h,y:s.k}, m.T, palette.green, 3);
      drawInfiniteLine(plane, m.normal, m.c, palette.orange, 3);
    },
    status(s,m) {
      return `切點 T=(${format(m.T.x)}, ${format(m.T.y)})；半徑與切線垂直。`;
    }
  },
  {
    id: "function-transformations",
    title: "函數圖形變換：平移、伸縮與鏡射",
    short: "函數變換",
    tag: "函數",
    examSignal: "看到 f(x-h)+k、af(bx) 時，先判斷水平與垂直變換；水平變換最容易方向相反。",
    prompt: "調整 a,b,h,k，觀察基準函數經過伸縮、鏡射、平移後的圖形。",
    challenge: "說明為什麼 f(x-h) 是向右平移 h，而不是向左。",
    controls: [
      { key: "a", label: "垂直倍率 a", min: -3, max: 3, step: 0.1, value: 1.2 },
      { key: "b", label: "水平倍率 b", min: 0.3, max: 3, step: 0.1, value: 1 },
      { key: "h", label: "水平平移 h", min: -4, max: 4, step: 0.1, value: 1 },
      { key: "k", label: "垂直平移 k", min: -4, max: 4, step: 0.1, value: -0.5 }
    ],
    compute(s) {
      return {};
    },
    formula(s) {
      return [
        `基準：f(x)=x²-1`,
        `變換：y=${format(s.a)} f(${format(s.b)}(x-${format(s.h)}))+${format(s.k)}`,
        `水平壓縮倍率約為 1/${format(s.b)}；垂直伸縮倍率 ${format(s.a)}`
      ];
    },
    draw(s) {
      const plane = makePlane({ scale: Math.min(canvas.clientWidth, canvas.clientHeight)/12 });
      drawGrid(plane);
      plotFunction(plane, x=>x*x-1, -5, 5, palette.axis, 2);
      plotFunction(plane, x=>s.a*((s.b*(x-s.h))**2-1)+s.k, -6, 6, palette.blue, 3);
      drawMathLabel("灰：f(x)，藍：變換後", 30, 42);
    },
    status(s) {
      return `圖形已套用 a=${format(s.a)}, b=${format(s.b)}, h=${format(s.h)}, k=${format(s.k)}。`;
    }
  },
  {
    id: "inverse-composition",
    title: "反函數與合成函數：關於 y=x 對稱",
    short: "反函數與合成",
    tag: "函數",
    examSignal: "看到反函數先檢查一對一與定義域；圖形上 f 與 f⁻¹ 關於 y=x 對稱。",
    prompt: "改變斜率與截距，觀察一次函數與反函數的對稱。",
    challenge: "計算 f(f⁻¹(x)) 與 f⁻¹(f(x))，並說明定義域限制。",
    controls: [
      { key: "a", label: "斜率 a", min: 0.3, max: 3, step: 0.1, value: 1.6 },
      { key: "b", label: "截距 b", min: -3, max: 3, step: 0.1, value: -1.2 },
      { key: "x", label: "輸入 x", min: -4, max: 4, step: 0.1, value: 2 }
    ],
    compute(s) {
      const y = s.a*s.x+s.b;
      const inv = (s.x - s.b)/s.a;
      return { P:{x:s.x,y}, Q:{x:y,y:s.x}, inv };
    },
    formula(s,m) {
      return [
        `f(x)=${format(s.a)}x+${format(s.b)}`,
        `f⁻¹(x)=(x-${format(s.b)})/${format(s.a)}`,
        `f(${format(s.x)})=${format(m.P.y)}，對稱點 (${format(m.Q.x)}, ${format(m.Q.y)})`
      ];
    },
    draw(s,m) {
      const plane = makePlane({ scale: Math.min(canvas.clientWidth, canvas.clientHeight)/12 });
      drawGrid(plane);
      plotFunction(plane, x=>x, -6, 6, palette.axis, 2);
      plotFunction(plane, x=>s.a*x+s.b, -6, 6, palette.blue, 3);
      plotFunction(plane, x=>(x-s.b)/s.a, -6, 6, palette.orange, 3);
      drawPoint(plane, m.P, "P", palette.blue);
      drawPoint(plane, m.Q, "P'", palette.orange);
      drawSegment(plane, m.P, m.Q, palette.red, 2, [6,6]);
    },
    status(s,m) {
      return `f 與 f⁻¹ 的圖形互為 y=x 對稱。`;
    }
  },
  {
    id: "cubic-symmetry-center",
    title: "三次函數：對稱中心與局部線性",
    short: "三次函數中心",
    tag: "多項式函數",
    examSignal: "看到三次函數圖形與中心，優先平移成 a(x-h)³+p(x-h)+k；中心是 (h,k)。",
    prompt: "調整三次函數的中心與一次項，觀察圖形繞中心旋轉 180° 後重合。",
    challenge: "把一般式展開後，找出 x² 項消失的平移量。",
    controls: [
      { key: "a", label: "三次係數 a", min: -1.5, max: 1.5, step: 0.05, value: 0.25 },
      { key: "p", label: "一次項 p", min: -3, max: 3, step: 0.1, value: -1.2 },
      { key: "h", label: "中心 h", min: -3, max: 3, step: 0.1, value: 0.8 },
      { key: "k", label: "中心 k", min: -3, max: 3, step: 0.1, value: 0.5 }
    ],
    compute(s) {
      return { C:{x:s.h,y:s.k} };
    },
    formula(s) {
      return [
        `f(x)=a(x-h)³+p(x-h)+k`,
        `中心 C=(${format(s.h)}, ${format(s.k)})`,
        `中心附近一次近似：y≈${format(s.p)}(x-${format(s.h)})+${format(s.k)}`
      ];
    },
    draw(s,m) {
      const plane = makePlane({ scale: Math.min(canvas.clientWidth, canvas.clientHeight)/12 });
      drawGrid(plane);
      plotFunction(plane, x=>s.a*((x-s.h)**3)+s.p*(x-s.h)+s.k, -6, 6, palette.blue, 3);
      plotFunction(plane, x=>s.p*(x-s.h)+s.k, -6, 6, palette.orange, 2);
      drawPoint(plane, m.C, "C", palette.red, 6);
    },
    status(s,m) {
      return `對稱中心 (${format(s.h)}, ${format(s.k)})；局部斜率約 ${format(s.p)}。`;
    }
  },
  {
    id: "root-multiplicity",
    title: "多項式根的重數：奇穿偶彈",
    short: "根與重數",
    tag: "多項式函數",
    examSignal: "已因式分解時，看根的重數判斷過 x 軸方式：奇重根穿越，偶重根反彈。",
    prompt: "調整兩個根的重數，觀察曲線在根附近是穿越或反彈。",
    challenge: "先用最高次項係數判斷右端，再由根的重數依序判斷符號。",
    controls: [
      { key: "m1", label: "根 -1 的重數", min: 1, max: 4, step: 1, value: 1 },
      { key: "m2", label: "根 2 的重數", min: 1, max: 4, step: 1, value: 2 },
      { key: "a", label: "首項倍率 a", min: -1, max: 1, step: 0.1, value: 0.2 }
    ],
    compute(s) {
      return {};
    },
    formula(s) {
      return [
        `f(x)=${format(s.a)}(x+1)^${s.m1}(x-2)^${s.m2}`,
        `根 -1：${s.m1%2?"奇重根，穿越":"偶重根，反彈"}`,
        `根 2：${s.m2%2?"奇重根，穿越":"偶重根，反彈"}`
      ];
    },
    draw(s) {
      const plane = makePlane({ scale: Math.min(canvas.clientWidth, canvas.clientHeight)/12 });
      drawGrid(plane);
      plotFunction(plane, x=>s.a*((x+1)**s.m1)*((x-2)**s.m2), -5, 5, palette.blue, 3, 0.01);
      drawPoint(plane,{x:-1,y:0},"-1",palette.red);
      drawPoint(plane,{x:2,y:0},"2",palette.red);
    },
    status(s) {
      return `-1 為 ${s.m1} 重根，2 為 ${s.m2} 重根。`;
    }
  },
  {
    id: "exponential-compound-interest",
    title: "指數成長與連續複利：離散到連續",
    short: "複利與指數",
    tag: "指數函數",
    examSignal: "看到「按比例成長、衰退、複利」就建模為 P(t)=P₀a^t 或 P₀e^{rt}。",
    prompt: "比較一年複利 n 次與連續複利，觀察 n 越大越接近 e^{rt}。",
    challenge: "把年利率 r 的複利公式改寫成指數函數，並判斷倍增時間。",
    controls: [
      { key: "P", label: "本金 P₀", min: 100, max: 1000, step: 50, value: 500 },
      { key: "r", label: "年利率 r", min: 0, max: 0.3, step: 0.01, value: 0.08 },
      { key: "n", label: "每年複利次數 n", min: 1, max: 24, step: 1, value: 4 },
      { key: "t", label: "年數 t", min: 1, max: 20, step: 1, value: 10 }
    ],
    compute(s) {
      const discrete = s.P * (1 + s.r/s.n) ** (s.n*s.t);
      const continuous = s.P * Math.exp(s.r*s.t);
      return { discrete, continuous };
    },
    formula(s,m) {
      return [
        `離散複利：P=P₀(1+r/n)^(nt)=${format(m.discrete,2)}`,
        `連續複利：P=P₀e^(rt)=${format(m.continuous,2)}`,
        `差距=${format(m.continuous-m.discrete,2)}`
      ];
    },
    draw(s,m) {
      const plane = makePlane({ scale: Math.min(canvas.clientWidth, canvas.clientHeight)/12, origin:{x:70,y:canvas.clientHeight-80} });
      drawGrid(plane);
      const maxY = s.P*Math.exp(s.r*20);
      const scaleY = 8/maxY;
      plotFunction(plane, x=>s.P*((1+s.r/s.n)**(s.n*x))*scaleY, 0, 20, palette.blue, 3, 0.05);
      plotFunction(plane, x=>s.P*Math.exp(s.r*x)*scaleY, 0, 20, palette.orange, 3, 0.05);
      drawPoint(plane, {x:s.t,y:m.discrete*scaleY}, "離散", palette.blue);
      drawPoint(plane, {x:s.t,y:m.continuous*scaleY}, "連續", palette.orange);
      drawMathLabel("縱軸已縮放", 30, 42);
    },
    status(s,m) {
      return `t=${s.t} 年後，離散複利 ${format(m.discrete,2)}，連續複利 ${format(m.continuous,2)}。`;
    }
  },
  {
    id: "logarithm-domain-scale",
    title: "對數函數：定義域、換底與尺度",
    short: "對數尺度",
    tag: "指數與對數",
    examSignal: "對數題第一步寫底數與真數限制；看到尺度壓縮、pH、分貝，常是對數模型。",
    prompt: "改變底數，觀察對數圖形皆通過 (1,0)，且真數必須大於 0。",
    challenge: "說明底數大於 1 與介於 0、1 之間時，圖形單調性如何改變。",
    controls: [
      { key: "base", label: "底數 a", min: 0.2, max: 5, step: 0.1, value: 2 },
      { key: "x", label: "真數 x", min: 0.1, max: 8, step: 0.1, value: 3 }
    ],
    compute(s) {
      const a = Math.abs(s.base-1)<0.05 ? 1.05 : s.base;
      const y = Math.log(s.x)/Math.log(a);
      return { a, y };
    },
    formula(s,m) {
      return [
        `條件：a>0, a≠1, x>0`,
        `log_a x = ln x / ln a`,
        `log_${format(m.a)}(${format(s.x)})=${format(m.y)}`
      ];
    },
    draw(s,m) {
      const plane = makePlane({ scale: Math.min(canvas.clientWidth, canvas.clientHeight)/12 });
      drawGrid(plane);
      plotFunction(plane, x=> x>0 ? Math.log(x)/Math.log(m.a) : NaN, 0.05, 8, palette.blue, 3);
      drawPoint(plane, {x:1,y:0}, "(1,0)", palette.green);
      drawPoint(plane, {x:s.x,y:m.y}, "P", palette.red);
      drawInfiniteLine(plane, {x:1,y:0}, 0, palette.red, 2, [5,5]);
    },
    status(s,m) {
      return `目前 log 值 ${format(m.y)}；定義域 x>0。`;
    }
  },
  {
    id: "sigma-sum-formulas",
    title: "Σ 符號與級數和：線性、平方、立方和",
    short: "Σ與級數和",
    tag: "數列級數",
    examSignal: "看到 Σ 不要逐項硬加；先辨認等差、等比、一次／二次／三次多項式和。",
    prompt: "調整 n，觀察柱狀圖總和與公式值一致。",
    challenge: "用圖形說明為何平方和的成長階數比一次和快。",
    controls: [
      { key: "n", label: "項數 n", min: 1, max: 20, step: 1, value: 8 },
      { key: "power", label: "次方 p", min: 1, max: 3, step: 1, value: 2 }
    ],
    compute(s) {
      const values = Array.from({length:s.n}, (_,i)=>(i+1)**s.power);
      const total = values.reduce((a,b)=>a+b,0);
      return { values, total, labels: values.map((_,i)=>String(i+1)) };
    },
    formula(s,m) {
      const formula = s.power===1 ? `n(n+1)/2` : s.power===2 ? `n(n+1)(2n+1)/6` : `[n(n+1)/2]^2`;
      return [
        `Σ k^${s.power}，k=1 到 ${s.n}`,
        `公式：${formula}`,
        `總和=${format(m.total)}`
      ];
    },
    draw(s,m) {
      drawSimpleBarChart(m.values, m.labels, -1);
      drawMathLabel(`總和 = ${format(m.total)}`, 40, 42);
    },
    status(s,m) {
      return `目前共有 ${s.n} 項，總和 ${format(m.total)}。`;
    }
  },
  {
    id: "recurrence-sequence",
    title: "遞迴數列：由規則生成長期行為",
    short: "遞迴數列",
    tag: "數列級數",
    examSignal: "看到 a_{n+1}=ra_n+b 時，先找固定點 L，觀察是否收斂到 L。",
    prompt: "調整 r 與 b，觀察數列是收斂、震盪或發散。",
    challenge: "解方程 L=rL+b，並討論 |r|<1 時為何會收斂。",
    controls: [
      { key: "a0", label: "初值 a₀", min: -5, max: 5, step: 0.1, value: 4 },
      { key: "r", label: "倍率 r", min: -1.5, max: 1.5, step: 0.05, value: 0.6 },
      { key: "b", label: "常數 b", min: -3, max: 3, step: 0.1, value: 1 }
    ],
    compute(s) {
      const values = [s.a0];
      for (let i=0;i<19;i++) values.push(s.r*values.at(-1)+s.b);
      const L = Math.abs(1-s.r)<1e-9 ? NaN : s.b/(1-s.r);
      return { values, L };
    },
    formula(s,m) {
      return [
        `a_{n+1}=${format(s.r)}a_n+${format(s.b)}`,
        `固定點 L=b/(1-r)=${format(m.L)}`,
        `|r|<1 時通常收斂；|r|>1 時多半發散`
      ];
    },
    draw(s,m) {
      const labels = m.values.map((_,i)=>String(i));
      drawSimpleBarChart(m.values.map(v=>Math.abs(v)), labels, -1);
      drawMathLabel(`L=${format(m.L)}`, 40, 42);
    },
    status(s,m) {
      return `第 20 項約 ${format(m.values.at(-1))}；固定點 ${format(m.L)}。`;
    }
  },
  {
    id: "infinite-geometric-series",
    title: "無窮等比級數：收斂與循環小數",
    short: "無窮等比級數",
    tag: "數列極限",
    examSignal: "看到無窮等比和，先檢查 |r|<1；不收斂時不能套 S=a/(1-r)。",
    prompt: "調整公比 r，觀察部分和是否靠近極限。",
    challenge: "用部分和公式說明為何 |r|≥1 不收斂。",
    controls: [
      { key: "a", label: "首項 a", min: -5, max: 5, step: 0.1, value: 3 },
      { key: "r", label: "公比 r", min: -1.2, max: 1.2, step: 0.05, value: 0.5 },
      { key: "n", label: "部分和項數 n", min: 1, max: 30, step: 1, value: 10 }
    ],
    compute(s) {
      const terms = Array.from({length:s.n}, (_,i)=>s.a*(s.r**i));
      const partial = terms.reduce((u,v)=>u+v,0);
      const limit = Math.abs(s.r)<1 ? s.a/(1-s.r) : NaN;
      return { terms, partial, limit };
    },
    formula(s,m) {
      return [
        `S_n=a(1-r^n)/(1-r)=${format(m.partial)}`,
        `|r|<1 時 S∞=a/(1-r)=${format(m.limit)}`,
        `目前 ${Math.abs(s.r)<1?"收斂條件成立":"收斂條件不成立"}`
      ];
    },
    draw(s,m) {
      const vals = [];
      let acc=0;
      for (const t of m.terms) { acc+=t; vals.push(Math.abs(acc)); }
      drawSimpleBarChart(vals, vals.map((_,i)=>String(i+1)), s.n-1);
      drawMathLabel(`部分和=${format(m.partial)}，極限=${format(m.limit)}`, 40, 42);
    },
    status(s,m) {
      return `部分和 ${format(m.partial)}；極限 ${format(m.limit)}。`;
    }
  },
  {
    id: "trig-graph-transform",
    title: "三角函數圖形：振幅、週期、相位",
    short: "三角圖形變換",
    tag: "三角函數",
    examSignal: "看到 y=A sin(B(x-C))+D，直接讀振幅 |A|、週期 2π/|B|、相位 C、上下平移 D。",
    prompt: "調整 A,B,C,D，觀察波形如何伸縮與平移。",
    challenge: "由圖形反推週期與振幅，再寫出一個可能的函數式。",
    controls: [
      { key: "A", label: "振幅係數 A", min: -3, max: 3, step: 0.1, value: 1.5 },
      { key: "B", label: "角頻率 B", min: 0.2, max: 3, step: 0.1, value: 1 },
      { key: "C", label: "相位 C", min: -3.14, max: 3.14, step: 0.01, value: 0.6 },
      { key: "D", label: "垂直平移 D", min: -3, max: 3, step: 0.1, value: 0.2 }
    ],
    compute(s) {
      return { period: TAU/Math.abs(s.B), amp: Math.abs(s.A) };
    },
    formula(s,m) {
      return [
        `y=${format(s.A)}sin(${format(s.B)}(x-${format(s.C)}))+${format(s.D)}`,
        `振幅=${format(m.amp)}，週期=${format(m.period)}`,
        `中線：y=${format(s.D)}`
      ];
    },
    draw(s,m) {
      const plane = makePlane({ scale: Math.min(canvas.clientWidth, canvas.clientHeight)/12 });
      drawGrid(plane);
      plotFunction(plane, x=>s.A*Math.sin(s.B*(x-s.C))+s.D, -8, 8, palette.blue, 3, 0.01);
      plotFunction(plane, x=>s.D, -8, 8, palette.orange, 2);
    },
    status(s,m) {
      return `振幅 ${format(m.amp)}，週期 ${format(m.period)}。`;
    }
  },
  {
    id: "trig-equation-solutions",
    title: "三角方程：單位圓與週期解",
    short: "三角方程",
    tag: "三角函數",
    examSignal: "解 sin x=c 或 cos x=c 時，先在單位圓找基本角，再加上週期。",
    prompt: "調整 c，觀察 y=c 與 sin x 的交點如何對應到單位圓上的兩個角。",
    challenge: "寫出 0≤x<2π 的所有解，再推廣為通解。",
    controls: [
      { key: "c", label: "常數 c", min: -1, max: 1, step: 0.01, value: 0.5 }
    ],
    compute(s) {
      const a = Math.asin(s.c);
      const x1 = a >= 0 ? a : TAU + a;
      const x2 = Math.PI - a;
      return { a, x1, x2 };
    },
    formula(s,m) {
      return [
        `sin x=${format(s.c)}`,
        `0≤x<2π：x≈${format(m.x1)} 或 ${format(m.x2)}`,
        `通解可由基本解加 2kπ`
      ];
    },
    draw(s,m) {
      const plane = makePlane({ scale: Math.min(canvas.clientWidth, canvas.clientHeight)/12 });
      drawGrid(plane);
      plotFunction(plane, x=>Math.sin(x), -TAU, TAU, palette.blue, 3, 0.01);
      plotFunction(plane, x=>s.c, -TAU, TAU, palette.orange, 2);
      drawPoint(plane,{x:m.x1,y:s.c},"x₁",palette.red);
      drawPoint(plane,{x:m.x2,y:s.c},"x₂",palette.red);
    },
    status(s,m) {
      return `一週期內有兩個解：${format(m.x1)}、${format(m.x2)}。`;
    }
  },
  {
    id: "plane-intersection-line",
    title: "空間平面：兩平面交線方向",
    short: "兩平面交線",
    tag: "空間向量",
    examSignal: "兩平面交線方向向量等於兩法向量外積；先求方向，再找一點。",
    prompt: "調整兩平面法向量，觀察交線方向 n₁×n₂。",
    challenge: "當兩法向量平行時，判斷兩平面平行或重合。",
    controls: [
      { key: "a", label: "n₂ 的 x 分量", min: -3, max: 3, step: 0.1, value: 2 },
      { key: "b", label: "n₂ 的 y 分量", min: -3, max: 3, step: 0.1, value: -1 },
      { key: "c", label: "n₂ 的 z 分量", min: -3, max: 3, step: 0.1, value: 1 }
    ],
    compute(s) {
      const n1 = {x:1,y:1,z:2};
      const n2 = {x:s.a,y:s.b,z:s.c};
      const d = cross3(n1,n2);
      return { n1, n2, d, len:norm3(d) };
    },
    formula(s,m) {
      return [
        `E₁ 法向量 n₁=(1,1,2)`,
        `E₂ 法向量 n₂=(${format(s.a)},${format(s.b)},${format(s.c)})`,
        `交線方向 d=n₁×n₂=(${format(m.d.x)},${format(m.d.y)},${format(m.d.z)})`
      ];
    },
    draw(s,m) {
      const { width, height } = canvas.getBoundingClientRect();
      const O = {x:width*0.5, y:height*0.55};
      ctx.save();
      ctx.strokeStyle = palette.axis; ctx.lineWidth = 1.5;
      ctx.strokeRect(width*0.20,height*0.30,width*0.42,height*0.22);
      ctx.strokeStyle = palette.blue; ctx.beginPath(); ctx.moveTo(width*0.30,height*0.70); ctx.lineTo(width*0.74,height*0.28); ctx.stroke();
      ctx.strokeStyle = palette.orange; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(width*0.25,height*0.62); ctx.lineTo(width*0.76,height*0.38); ctx.stroke();
      drawMathLabel(`d=(${format(m.d.x)},${format(m.d.y)},${format(m.d.z)})`, 40, 42);
      drawMathLabel(`|d|=${format(m.len)}`, 40, 82);
      ctx.restore();
    },
    status(s,m) {
      return m.len < 1e-6 ? "兩法向量平行，需另判斷平行或重合。" : `交線方向向量長度 ${format(m.len)}。`;
    }
  },
  {
    id: "line-plane-angle",
    title: "空間角度：直線與平面、兩平面夾角",
    short: "線面角與面面角",
    tag: "空間向量",
    examSignal: "線面角用直線方向與平面法向量：sinθ=|v·n|/(|v||n|)；面面角用兩法向量夾角。",
    prompt: "調整直線方向，觀察線面角由投影決定。",
    challenge: "區分線與法向量夾角、線與平面夾角，兩者互餘。",
    controls: [
      { key: "vx", label: "方向 vx", min: -4, max: 4, step: 0.1, value: 2 },
      { key: "vy", label: "方向 vy", min: -4, max: 4, step: 0.1, value: 1 },
      { key: "vz", label: "方向 vz", min: -4, max: 4, step: 0.1, value: 2 }
    ],
    compute(s) {
      const v = {x:s.vx,y:s.vy,z:s.vz};
      const n = {x:1,y:-1,z:2};
      const ratio = Math.abs(dot3(v,n))/(norm3(v)*norm3(n));
      const theta = Math.asin(clamp(ratio,0,1))/DEG;
      return { v, n, theta };
    },
    formula(s,m) {
      return [
        `平面法向量 n=(1,-1,2)`,
        `sinθ=|v·n|/(|v||n|)`,
        `線面角 θ≈${format(m.theta)}°`
      ];
    },
    draw(s,m) {
      const { width, height } = canvas.getBoundingClientRect();
      ctx.save();
      ctx.fillStyle = "rgba(47,99,255,.10)";
      ctx.strokeStyle = palette.blue; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(width*.22,height*.65); ctx.lineTo(width*.62,height*.50); ctx.lineTo(width*.78,height*.62); ctx.lineTo(width*.38,height*.78); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = palette.red; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(width*.45,height*.65); ctx.lineTo(width*.65,height*.35); ctx.stroke();
      drawMathLabel(`θ≈${format(m.theta)}°`, 40, 42);
      ctx.restore();
    },
    status(s,m) {
      return `線面角約 ${format(m.theta)}°。`;
    }
  },
  {
    id: "matrix-inverse-system",
    title: "二階矩陣：乘法、反方陣與方程組",
    short: "反方陣",
    tag: "矩陣",
    examSignal: "二階反方陣先看 det A 是否為 0；det 不為 0 才有唯一解與反矩陣。",
    prompt: "調整矩陣元素，觀察行列式接近 0 時，面積倍率與可逆性如何變化。",
    challenge: "用 A^{-1}b 解二元一次方程組，並檢查代回原方程。",
    controls: [
      { key: "a", label: "a", min: -3, max: 3, step: 0.1, value: 2 },
      { key: "b", label: "b", min: -3, max: 3, step: 0.1, value: 1 },
      { key: "c", label: "c", min: -3, max: 3, step: 0.1, value: 1 },
      { key: "d", label: "d", min: -3, max: 3, step: 0.1, value: 2 }
    ],
    compute(s) {
      const det = s.a*s.d-s.b*s.c;
      const inv = Math.abs(det)<1e-9 ? null : [[s.d/det,-s.b/det],[-s.c/det,s.a/det]];
      const e1 = {x:s.a,y:s.c}, e2 = {x:s.b,y:s.d};
      return { det, inv, e1, e2 };
    },
    formula(s,m) {
      return [
        `A=[[${format(s.a)},${format(s.b)}],[${format(s.c)},${format(s.d)}]]`,
        `det A=ad-bc=${format(m.det)}`,
        `${Math.abs(m.det)<1e-6?"不可逆；方程可能無解或無窮多解":"可逆；A^{-1}=1/det [[d,-b],[-c,a]]"}`
      ];
    },
    draw(s,m) {
      const plane = makePlane({ scale: Math.min(canvas.clientWidth, canvas.clientHeight)/10 });
      drawGrid(plane);
      drawArrow(plane,{x:0,y:0},m.e1,palette.blue,3,"Ae₁");
      drawArrow(plane,{x:0,y:0},m.e2,palette.orange,3,"Ae₂");
      drawFilledPolygon(plane,[{x:0,y:0},m.e1,{x:m.e1.x+m.e2.x,y:m.e1.y+m.e2.y},m.e2],palette.fillBlue,palette.blue,2);
    },
    status(s,m) {
      return `面積倍率 det=${format(m.det)}；${Math.abs(m.det)<1e-6?"不可逆":"可逆"}。`;
    }
  },
  {
    id: "gaussian-elimination-visual",
    title: "高斯消去法：增廣矩陣與列運算",
    short: "高斯消去",
    tag: "矩陣／方程組",
    examSignal: "聯立方程組先看消去目標：把未知數逐層消掉；非選題要寫清楚列運算。",
    prompt: "調整係數，觀察兩直線交點與消去法結果一致。",
    challenge: "把二元一次方程組寫成增廣矩陣，再做列運算到階梯形。",
    controls: [
      { key: "a", label: "第一式 x 係數", min: -4, max: 4, step: 0.1, value: 2 },
      { key: "b", label: "第一式 y 係數", min: -4, max: 4, step: 0.1, value: 1 },
      { key: "c", label: "第一式常數", min: -6, max: 6, step: 0.1, value: 5 },
      { key: "d", label: "第二式 x 係數", min: -4, max: 4, step: 0.1, value: 1 }
    ],
    compute(s) {
      const e = 2, f = 4;
      const det = s.a*e - s.b*s.d;
      const x = Math.abs(det)<1e-9 ? NaN : (s.c*e-s.b*f)/det;
      const y = Math.abs(det)<1e-9 ? NaN : (s.a*f-s.c*s.d)/det;
      return { e, f, det, sol:{x,y} };
    },
    formula(s,m) {
      return [
        `${format(s.a)}x+${format(s.b)}y=${format(s.c)}`,
        `${format(s.d)}x+2y=4`,
        `det=${format(m.det)}，解=(${format(m.sol.x)},${format(m.sol.y)})`
      ];
    },
    draw(s,m) {
      const plane = makePlane({ scale: Math.min(canvas.clientWidth, canvas.clientHeight)/12 });
      drawGrid(plane);
      if (Math.abs(s.b)>1e-9) plotFunction(plane,x=>(s.c-s.a*x)/s.b,-8,8,palette.blue,3); else drawInfiniteLine(plane,{x:1,y:0},s.c/s.a,palette.blue,3);
      plotFunction(plane,x=>(m.f-s.d*x)/m.e,-8,8,palette.orange,3);
      if (Number.isFinite(m.sol.x)) drawPoint(plane,m.sol,"解",palette.red);
    },
    status(s,m) {
      return Math.abs(m.det)<1e-6 ? "det=0，可能無唯一解。" : `唯一解 (${format(m.sol.x)}, ${format(m.sol.y)})。`;
    }
  },
  {
    id: "shoelace-determinant-area",
    title: "行列式面積：三角形、平行四邊形與鞋帶",
    short: "行列式面積",
    tag: "向量／行列式",
    examSignal: "三角形面積可用 1/2 |det(u,v)|；多邊形面積可拆成多個行列式。",
    prompt: "拖曳三個點，觀察有向面積正負與頂點順序有關。",
    challenge: "把四邊形拆成兩個三角形，用行列式求面積。",
    controls: [
      { key: "x1", label: "B 點 x", min: -4, max: 4, step: 0.1, value: 3 },
      { key: "y1", label: "B 點 y", min: -4, max: 4, step: 0.1, value: 1 },
      { key: "x2", label: "C 點 x", min: -4, max: 4, step: 0.1, value: 1 },
      { key: "y2", label: "C 點 y", min: -4, max: 4, step: 0.1, value: 3 }
    ],
    compute(s) {
      const A={x:0,y:0}, B={x:s.x1,y:s.y1}, C={x:s.x2,y:s.y2};
      const det = B.x*C.y-B.y*C.x;
      return { A,B,C,det,area:Math.abs(det)/2 };
    },
    formula(s,m) {
      return [
        `det(B,C)=x_B y_C-y_B x_C=${format(m.det)}`,
        `△ABC 面積=1/2 |det|=${format(m.area)}`,
        `det 正負代表方向，不代表面積負值`
      ];
    },
    draw(s,m) {
      const plane = makePlane({ scale: Math.min(canvas.clientWidth, canvas.clientHeight)/12 });
      drawGrid(plane);
      drawFilledPolygon(plane,[m.A,m.B,m.C],palette.fillOrange,palette.orange,3);
      drawPoint(plane,m.A,"A",palette.green); drawPoint(plane,m.B,"B",palette.blue); drawPoint(plane,m.C,"C",palette.red);
    },
    status(s,m) {
      return `有向行列式 ${format(m.det)}；面積 ${format(m.area)}。`;
    }
  },
  {
    id: "stars-and-bars",
    title: "重複組合：隔板法與非負整數解",
    short: "隔板法",
    tag: "排列組合",
    examSignal: "看到「同類物分給不同盒」或 x₁+⋯+x_k=n 的非負整數解，優先想到隔板法。",
    prompt: "調整物品數與盒數，觀察星星與隔板數量對應公式。",
    challenge: "把每盒至少一個轉成非負整數解問題。",
    controls: [
      { key: "n", label: "物品數 n", min: 1, max: 20, step: 1, value: 8 },
      { key: "k", label: "盒數 k", min: 2, max: 8, step: 1, value: 4 }
    ],
    compute(s) {
      const ways = comb(s.n+s.k-1, s.k-1);
      return { ways };
    },
    formula(s,m) {
      return [
        `x₁+⋯+x_${s.k}=${s.n}，x_i≥0`,
        `解數=C(n+k-1,k-1)=C(${s.n+s.k-1},${s.k-1})`,
        `共有 ${format(m.ways)} 種`
      ];
    },
    draw(s,m) {
      const { width, height } = canvas.getBoundingClientRect();
      ctx.save(); ctx.font="28px ui-sans-serif, system-ui"; ctx.textAlign="center";
      const symbols=[];
      for(let i=0;i<s.n;i++) symbols.push("★");
      for(let j=0;j<s.k-1;j++) symbols.splice(Math.floor((j+1)*symbols.length/s.k),0,"|");
      ctx.fillStyle=palette.ink; ctx.fillText(symbols.join(" "), width/2, height*.45);
      drawMathLabel(`C(${s.n+s.k-1},${s.k-1})=${format(m.ways)}`, 40, 42);
      ctx.restore();
    },
    status(s,m) {
      return `非負整數解共有 ${format(m.ways)} 種。`;
    }
  },
  {
    id: "binomial-theorem-pascal",
    title: "二項式定理：帕斯卡三角形與係數",
    short: "二項式定理",
    tag: "排列組合",
    examSignal: "看到 (a+b)^n 展開係數，直接連到 C(n,k) 與帕斯卡三角形。",
    prompt: "調整 n 與 k，觀察第 k 項係數 C(n,k)。",
    challenge: "說明 C(n,k)=C(n,n-k) 的對稱意義。",
    controls: [
      { key: "n", label: "次方 n", min: 0, max: 12, step: 1, value: 6 },
      { key: "k", label: "項次 k", min: 0, max: 12, step: 1, value: 2 }
    ],
    compute(s) {
      const kk = Math.min(s.k, s.n);
      return { coeff: comb(s.n, kk), k: kk };
    },
    formula(s,m) {
      return [
        `(a+b)^n = Σ C(n,k)a^(n-k)b^k`,
        `C(${s.n},${m.k})=${format(m.coeff)}`,
        `第 k 項係數與二項分布機率共用同一組合數`
      ];
    },
    draw(s,m) {
      const { width, height } = canvas.getBoundingClientRect();
      ctx.save(); ctx.textAlign="center"; ctx.font="13px ui-sans-serif, system-ui";
      const top = 50, gapY=34, gapX=48;
      for(let r=0;r<=s.n;r++){
        for(let k=0;k<=r;k++){
          const x=width/2+(k-r/2)*gapX, y=top+r*gapY;
          ctx.fillStyle=(r===s.n && k===m.k)?palette.orange:palette.ink;
          ctx.fillText(String(comb(r,k)), x, y);
        }
      }
      ctx.restore();
    },
    status(s,m) {
      return `C(${s.n},${m.k})=${format(m.coeff)}。`;
    }
  },
  {
    id: "probability-tree-independence",
    title: "機率樹：條件機率與獨立事件",
    short: "機率樹與獨立",
    tag: "機率",
    examSignal: "看到「已知發生」就是縮小樣本空間；看到獨立要檢查 P(A∩B)=P(A)P(B)。",
    prompt: "調整 P(A) 與 P(B|A)、P(B|A^c)，觀察 A 與 B 是否獨立。",
    challenge: "由機率樹推回 P(A|B)，並比較與 P(A) 是否相同。",
    controls: [
      { key: "pa", label: "P(A)", min: 0.05, max: 0.95, step: 0.01, value: 0.4 },
      { key: "bA", label: "P(B|A)", min: 0.05, max: 0.95, step: 0.01, value: 0.7 },
      { key: "bN", label: "P(B|A^c)", min: 0.05, max: 0.95, step: 0.01, value: 0.3 }
    ],
    compute(s) {
      const pAB = s.pa*s.bA;
      const pB = pAB+(1-s.pa)*s.bN;
      const pAgB = pAB/pB;
      const independent = Math.abs(s.bA-pB)<0.015;
      return { pAB,pB,pAgB,independent };
    },
    formula(s,m) {
      return [
        `P(A∩B)=P(A)P(B|A)=${format(m.pAB)}`,
        `P(B)=${format(m.pB)}`,
        `P(A|B)=P(A∩B)/P(B)=${format(m.pAgB)}`,
        `${m.independent?"近似獨立":"不獨立"}`
      ];
    },
    draw(s,m) {
      const { width, height } = canvas.getBoundingClientRect();
      ctx.save(); ctx.strokeStyle=palette.axis; ctx.lineWidth=2; ctx.fillStyle=palette.ink; ctx.font="14px ui-sans-serif";
      const O={x:width*.18,y:height*.50}, A={x:width*.42,y:height*.35}, N={x:width*.42,y:height*.65}, AB={x:width*.72,y:height*.27}, AnB={x:width*.72,y:height*.43}, NB={x:width*.72,y:height*.58}, NnB={x:width*.72,y:height*.75};
      const line=(p,q,label)=>{ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();ctx.fillText(label,(p.x+q.x)/2,(p.y+q.y)/2-8);};
      line(O,A,`A ${format(s.pa)}`); line(O,N,`Aᶜ ${format(1-s.pa)}`); line(A,AB,`B ${format(s.bA)}`); line(A,AnB,`Bᶜ`); line(N,NB,`B ${format(s.bN)}`); line(N,NnB,`Bᶜ`);
      drawMathLabel(`P(A|B)=${format(m.pAgB)}`, 40, 42);
      ctx.restore();
    },
    status(s,m) {
      return `P(A|B)=${format(m.pAgB)}；${m.independent?"近似獨立":"不獨立"}。`;
    }
  },
  {
    id: "discrete-random-variable",
    title: "離散隨機變數：期望值與變異數",
    short: "期望值變異數",
    tag: "機率統計",
    examSignal: "看到獎金、分數、遊戲報酬，先列隨機變數表，再算 E(X)=Σxp。",
    prompt: "調整三個結果的數值與機率，觀察期望值與離散程度。",
    challenge: "說明期望值不是最可能出現的值，而是長期平均。",
    controls: [
      { key: "x1", label: "結果 x1", min: -10, max: 50, step: 1, value: 0 },
      { key: "x2", label: "結果 x2", min: -10, max: 100, step: 1, value: 30 },
      { key: "x3", label: "結果 x3", min: -10, max: 200, step: 1, value: 90 },
      { key: "p1", label: "P(x1)", min: 0.05, max: 0.9, step: 0.01, value: 0.5 }
    ],
    compute(s) {
      const p2=(1-s.p1)*0.6, p3=(1-s.p1)*0.4;
      const xs=[s.x1,s.x2,s.x3], ps=[s.p1,p2,p3];
      const ex=xs.reduce((a,x,i)=>a+x*ps[i],0);
      const varx=xs.reduce((a,x,i)=>a+((x-ex)**2)*ps[i],0);
      return { xs, ps, ex, varx };
    },
    formula(s,m) {
      return [
        `E(X)=Σxp=${format(m.ex)}`,
        `Var(X)=Σ(x-μ)²p=${format(m.varx)}`,
        `σ=${format(Math.sqrt(m.varx))}`
      ];
    },
    draw(s,m) {
      drawSimpleBarChart(m.ps, m.xs.map(x=>String(x)), -1);
      drawMathLabel(`E(X)=${format(m.ex)}，σ=${format(Math.sqrt(m.varx))}`, 40, 42);
    },
    status(s,m) {
      return `期望值 ${format(m.ex)}；標準差 ${format(Math.sqrt(m.varx))}。`;
    }
  },
  {
    id: "subjective-objective-probability",
    title: "主觀機率與客觀機率：校準與資料更新",
    short: "主客觀機率",
    tag: "機率",
    examSignal: "主觀機率要符合機率性質；客觀機率由資料比例估計，資料越多越穩定。",
    prompt: "調整先驗估計與觀察次數，觀察資料如何修正機率判斷。",
    challenge: "判斷一組主觀機率是否加總為 1 且每項介於 0 與 1。",
    controls: [
      { key: "prior", label: "主觀估計 p", min: 0.01, max: 0.99, step: 0.01, value: 0.6 },
      { key: "success", label: "觀察成功次數", min: 0, max: 100, step: 1, value: 36 },
      { key: "total", label: "觀察總次數", min: 1, max: 120, step: 1, value: 60 }
    ],
    compute(s) {
      const total = Math.max(s.total, s.success);
      const obj = s.success/total;
      const blended = (s.prior*4 + s.success)/(4+total);
      return { total, obj, blended };
    },
    formula(s,m) {
      return [
        `客觀機率估計 = 成功次數 / 總次數 = ${format(m.obj)}`,
        `簡化更新估計 ≈ ${format(m.blended)}`,
        `資料量越大，客觀比例通常越穩定`
      ];
    },
    draw(s,m) {
      drawSimpleBarChart([s.prior,m.obj,m.blended],["主觀","客觀","更新"],2);
      drawMathLabel(`客觀=${format(m.obj)}，更新=${format(m.blended)}`,40,42);
    },
    status(s,m) {
      return `主觀 ${format(s.prior)}；客觀 ${format(m.obj)}；更新估計 ${format(m.blended)}。`;
    }
  },
  {
    id: "two-way-table-bayes",
    title: "列聯表：條件機率、比例與貝氏反推",
    short: "列聯表機率",
    tag: "機率統計",
    examSignal: "看到性別、檢定、錄取等雙分類資料，先畫 2×2 表，再算條件機率。",
    prompt: "調整母群比例與條件比例，自動生成 1000 人列聯表。",
    challenge: "由表格同時計算 P(A|B) 與 P(B|A)，避免把兩者混淆。",
    controls: [
      { key: "pa", label: "P(A)", min: 0.05, max: 0.95, step: 0.01, value: 0.3 },
      { key: "bA", label: "P(B|A)", min: 0.05, max: 0.95, step: 0.01, value: 0.8 },
      { key: "bN", label: "P(B|A^c)", min: 0.05, max: 0.95, step: 0.01, value: 0.4 }
    ],
    compute(s) {
      const n=1000;
      const AB=s.pa*s.bA*n, AN=s.pa*(1-s.bA)*n, NB=(1-s.pa)*s.bN*n, NN=(1-s.pa)*(1-s.bN)*n;
      const BgA = AB/(AB+NB);
      return { AB,AN,NB,NN,BgA };
    },
    formula(s,m) {
      return [
        `A∩B 約 ${format(m.AB,0)} 人，A^c∩B 約 ${format(m.NB,0)} 人`,
        `P(A|B)=AB/(AB+A^cB)=${format(m.BgA)}`,
        `列聯表能避免條件方向看反`
      ];
    },
    draw(s,m) {
      const values=[m.AB,m.AN,m.NB,m.NN];
      drawSimpleBarChart(values,["AB","ABᶜ","AᶜB","AᶜBᶜ"],0);
      drawMathLabel(`P(A|B)=${format(m.BgA)}`,40,42);
    },
    status(s,m) {
      return `由列聯表反推 P(A|B)=${format(m.BgA)}。`;
    }
  },
  {
    id: "mean-variance-transform",
    title: "一維數據：平均、標準差與線性轉換",
    short: "平均標準差",
    tag: "統計",
    examSignal: "資料做 Y=aX+b 時，平均變成 aμ+b，標準差只乘 |a|。",
    prompt: "調整伸縮與平移，觀察所有資料點變動後，平均與標準差如何改變。",
    challenge: "說明為什麼加上 b 不改變標準差。",
    controls: [
      { key: "a", label: "伸縮 a", min: -3, max: 3, step: 0.1, value: 1.5 },
      { key: "b", label: "平移 b", min: -10, max: 10, step: 0.5, value: 2 }
    ],
    compute(s) {
      const xs=[50,58,60,64,68,75,82];
      const ys=xs.map(x=>s.a*x+s.b);
      const mux=mean(xs), sigx=Math.sqrt(variance(xs));
      const muy=mean(ys), sigy=Math.sqrt(variance(ys));
      return { xs, ys, mux, sigx, muy, sigy };
    },
    formula(s,m) {
      return [
        `Y=${format(s.a)}X+${format(s.b)}`,
        `μY=aμX+b=${format(m.muy)}`,
        `σY=|a|σX=${format(m.sigy)}`
      ];
    },
    draw(s,m) {
      drawSimpleBarChart(m.ys, m.xs.map(x=>String(x)), -1);
      drawMathLabel(`μX=${format(m.mux)} σX=${format(m.sigx)} → μY=${format(m.muy)} σY=${format(m.sigy)}`,40,42);
    },
    status(s,m) {
      return `平均 ${format(m.muy)}；標準差 ${format(m.sigy)}。`;
    }
  },
  {
    id: "histogram-cumulative",
    title: "直方圖與累積分布：百分位數視覺化",
    short: "直方圖與百分位",
    tag: "統計",
    examSignal: "看到百分位與累積比例，先轉成從左到右的累積面積或累積人數。",
    prompt: "調整門檻，觀察小於等於門檻的累積比例。",
    challenge: "由累積比例反推第 75 百分位大約在哪個區間。",
    controls: [
      { key: "threshold", label: "門檻", min: 40, max: 100, step: 1, value: 72 }
    ],
    compute(s) {
      const bins=[45,55,65,75,85,95], counts=[2,5,12,18,9,4];
      const total=counts.reduce((a,b)=>a+b,0);
      const cum=counts.reduce((a,c,i)=>a+(bins[i]<=s.threshold?c:0),0);
      return { bins, counts, total, cum, prop:cum/total };
    },
    formula(s,m) {
      return [
        `累積比例 = 門檻以下人數 / 總人數`,
        `目前 ${format(m.cum,0)} / ${format(m.total,0)} = ${format(m.prop)}`,
        `直方圖面積可表示頻率或相對頻率`
      ];
    },
    draw(s,m) {
      const highlight=m.bins.findIndex(x=>x>s.threshold)-1;
      drawSimpleBarChart(m.counts,m.bins.map(x=>String(x)),Math.max(0,highlight));
      drawMathLabel(`≤${s.threshold} 的比例 ${format(m.prop)}`,40,42);
    },
    status(s,m) {
      return `門檻以下比例 ${format(m.prop)}。`;
    }
  },
  {
    id: "covariance-correlation-sign",
    title: "共變異與相關係數：方向與標準化",
    short: "共變異與相關",
    tag: "統計",
    examSignal: "相關係數只看線性方向與標準化後的強度；單位改變不會改變 r 的大小。",
    prompt: "調整斜率與雜訊，觀察散布圖與相關係數。",
    challenge: "說明斜率大不代表相關係數一定大。",
    controls: [
      { key: "slope", label: "趨勢斜率", min: -2, max: 2, step: 0.1, value: 0.9 },
      { key: "noise", label: "雜訊幅度", min: 0, max: 3, step: 0.1, value: 0.8 }
    ],
    compute(s) {
      const xs=[], ys=[];
      for(let i=-8;i<=8;i++){ xs.push(i); ys.push(s.slope*i + s.noise*Math.sin(i*1.7)); }
      const mx=mean(xs), my=mean(ys), sx=Math.sqrt(variance(xs)), sy=Math.sqrt(variance(ys));
      const cov=xs.reduce((a,x,i)=>a+(x-mx)*(ys[i]-my),0)/xs.length;
      const r=cov/(sx*sy);
      return { xs,ys,r,cov };
    },
    formula(s,m) {
      return [
        `cov(X,Y)=${format(m.cov)}`,
        `r=cov/(σXσY)=${format(m.r)}`,
        `r 介於 -1 與 1`
      ];
    },
    draw(s,m) {
      const plane = makePlane({ scale: Math.min(canvas.clientWidth, canvas.clientHeight)/14 });
      drawGrid(plane);
      for(let i=0;i<m.xs.length;i++) drawPoint(plane,{x:m.xs[i],y:m.ys[i]},"",palette.blue,4);
      plotFunction(plane,x=>s.slope*x,-8,8,palette.orange,2);
      drawMathLabel(`r=${format(m.r)}`,40,42);
    },
    status(s,m) {
      return `相關係數 r=${format(m.r)}。`;
    }
  },
  {
    id: "newton-method",
    title: "牛頓求根法：切線逼近根",
    short: "牛頓求根法",
    tag: "數列極限／微分",
    examSignal: "牛頓法是用切線 x_{n+1}=x_n-f(x_n)/f'(x_n)；初值要接近根才穩定。",
    prompt: "調整初值與迭代次數，觀察切線法如何逼近根。",
    challenge: "說明為何 f'(x_n)=0 附近不適合直接使用牛頓法。",
    controls: [
      { key: "x0", label: "初值 x₀", min: -3, max: 3, step: 0.1, value: 2 },
      { key: "iter", label: "迭代次數", min: 0, max: 8, step: 1, value: 4 }
    ],
    compute(s) {
      const f=x=>x*x*x-x-1, fp=x=>3*x*x-1;
      let x=s.x0; const pts=[x];
      for(let i=0;i<s.iter;i++){ const den=fp(x); if(Math.abs(den)<1e-6) break; x=x-f(x)/den; pts.push(x); }
      return { pts, root:x, f, fp };
    },
    formula(s,m) {
      return [
        `x_{n+1}=x_n-f(x_n)/f'(x_n)`,
        `f(x)=x³-x-1`,
        `目前 x≈${format(m.root)}，f(x)≈${format(m.f(m.root))}`
      ];
    },
    draw(s,m) {
      const plane=makePlane({scale:Math.min(canvas.clientWidth,canvas.clientHeight)/12});
      drawGrid(plane);
      plotFunction(plane,m.f,-4,4,palette.blue,3,0.01);
      for(const x of m.pts) drawPoint(plane,{x,y:m.f(x)},"",palette.red,4);
      drawPoint(plane,{x:m.root,y:0},"root",palette.orange,6);
    },
    status(s,m) {
      return `第 ${s.iter} 次後 x≈${format(m.root)}。`;
    }
  },
  {
    id: "derivative-rules",
    title: "導函數公式：乘法、除法與連鎖律",
    short: "微分公式",
    tag: "微積分",
    examSignal: "看到合成函數先連鎖律；看到乘積或商式不要把導數硬分配錯。",
    prompt: "用 (x-a)^n 觀察冪次微分與連鎖律。",
    challenge: "指出常見錯誤：把 (fg)' 寫成 f'g'。",
    controls: [
      { key: "a", label: "平移 a", min: -3, max: 3, step: 0.1, value: 1 },
      { key: "n", label: "次方 n", min: 1, max: 5, step: 1, value: 3 },
      { key: "x0", label: "觀察點 x₀", min: -3, max: 5, step: 0.1, value: 2.2 }
    ],
    compute(s) {
      const y=(s.x0-s.a)**s.n;
      const dy=s.n*((s.x0-s.a)**(s.n-1));
      return { P:{x:s.x0,y}, dy };
    },
    formula(s,m) {
      return [
        `f(x)=(x-${format(s.a)})^${s.n}`,
        `f'(x)=${s.n}(x-${format(s.a)})^${s.n-1}`,
        `f'(${format(s.x0)})=${format(m.dy)}`
      ];
    },
    draw(s,m) {
      const plane=makePlane({scale:Math.min(canvas.clientWidth,canvas.clientHeight)/12});
      drawGrid(plane);
      plotFunction(plane,x=>(x-s.a)**s.n,-5,6,palette.blue,3,0.01);
      plotFunction(plane,x=>m.dy*(x-m.P.x)+m.P.y,-5,6,palette.orange,2);
      drawPoint(plane,m.P,"P",palette.red);
    },
    status(s,m) {
      return `觀察點導數 ${format(m.dy)}。`;
    }
  },
  {
    id: "concavity-inflection",
    title: "凹凸性與反曲點：一階、二階導數判讀",
    short: "凹凸與反曲",
    tag: "微分應用",
    examSignal: "遞增遞減看 f'，凹凸與反曲看 f''；反曲點需要凹凸改變。",
    prompt: "調整三次函數參數，觀察 f' 的正負與 f'' 的變號。",
    challenge: "用 f''=0 找候選點，再檢查左右凹凸是否改變。",
    controls: [
      { key: "a", label: "三次係數 a", min: -1, max: 1, step: 0.05, value: 0.2 },
      { key: "b", label: "二次係數 b", min: -2, max: 2, step: 0.1, value: -0.6 },
      { key: "c", label: "一次係數 c", min: -3, max: 3, step: 0.1, value: -1 }
    ],
    compute(s) {
      const xi = Math.abs(s.a)<1e-9 ? NaN : -s.b/(3*s.a);
      const f=x=>s.a*x**3+s.b*x**2+s.c*x;
      return { xi, yi:Number.isFinite(xi)?f(xi):NaN, f };
    },
    formula(s,m) {
      return [
        `f(x)=ax³+bx²+cx`,
        `f''(x)=6ax+2b`,
        `反曲候選 x=-b/(3a)=${format(m.xi)}`
      ];
    },
    draw(s,m) {
      const plane=makePlane({scale:Math.min(canvas.clientWidth,canvas.clientHeight)/12});
      drawGrid(plane);
      plotFunction(plane,m.f,-5,5,palette.blue,3,0.01);
      if(Number.isFinite(m.xi)) drawPoint(plane,{x:m.xi,y:m.yi},"I",palette.red);
    },
    status(s,m) {
      return `反曲候選點 x=${format(m.xi)}。`;
    }
  },
  {
    id: "optimization-box",
    title: "最佳化：表面積固定的長方體體積",
    short: "微分最佳化",
    tag: "微分應用",
    examSignal: "最佳化先設變數與範圍，再把目標函數化成一個變數，最後檢查端點與臨界點。",
    prompt: "調整底邊 x 與表面積限制，觀察體積函數何時最大。",
    challenge: "完整寫出變數範圍，避免只解導數方程漏掉端點。",
    controls: [
      { key: "S", label: "開口盒材料面積 S", min: 20, max: 100, step: 1, value: 60 },
      { key: "x", label: "底邊 x", min: 0.5, max: 8, step: 0.1, value: 3 }
    ],
    compute(s) {
      const h=(s.S-s.x*s.x)/(4*s.x);
      const V=s.x*s.x*h;
      const xOpt=Math.sqrt(s.S/3);
      const hOpt=(s.S-xOpt*xOpt)/(4*xOpt);
      return { h,V,xOpt,hOpt,Vmax:xOpt*xOpt*hOpt };
    },
    formula(s,m) {
      return [
        `開口盒：S=x²+4xh`,
        `h=(S-x²)/(4x)，V=x²h=x(S-x²)/4`,
        `最佳 x≈${format(m.xOpt)}，Vmax≈${format(m.Vmax)}`
      ];
    },
    draw(s,m) {
      const plane=makePlane({scale:Math.min(canvas.clientWidth,canvas.clientHeight)/12, origin:{x:70,y:canvas.clientHeight-80}});
      drawGrid(plane);
      plotFunction(plane,x=> x>0 && x*x<s.S ? x*(s.S-x*x)/4/10 : NaN,0.1,Math.sqrt(s.S),palette.blue,3,0.02);
      drawPoint(plane,{x:s.x,y:m.V/10},"目前",palette.red);
      drawPoint(plane,{x:m.xOpt,y:m.Vmax/10},"max",palette.orange);
      drawMathLabel("縱軸體積已縮放 /10",40,42);
    },
    status(s,m) {
      return `目前 h=${format(m.h)}，V=${format(m.V)}；最大約 ${format(m.Vmax)}。`;
    }
  },
  {
    id: "piecewise-continuity-ivt",
    title: "分段函數、連續性與介值定理",
    short: "連續與介值",
    tag: "極限與連續",
    examSignal: "連續要同時檢查左極限、右極限、函數值；介值定理需要閉區間連續。",
    prompt: "調整跳躍量，觀察左右極限是否相等。",
    challenge: "判斷何時能保證存在 f(x)=0 的解。",
    controls: [
      { key: "jump", label: "右段跳躍量", min: -3, max: 3, step: 0.1, value: 1 },
      { key: "a", label: "觀察點 a", min: -3, max: 3, step: 0.1, value: 0 }
    ],
    compute(s) {
      const left = s.a <= 0 ? s.a+1 : s.a*s.a+s.jump;
      const f0left = 1, f0right = s.jump;
      return { left, f0left, f0right, continuous: Math.abs(f0left-f0right)<1e-6 };
    },
    formula(s,m) {
      return [
        `f(x)=x+1 (x≤0)，x²+${format(s.jump)} (x>0)`,
        `lim x→0- f(x)=1，lim x→0+ f(x)=${format(s.jump)}`,
        `${m.continuous?"在 0 連續":"在 0 不連續"}`
      ];
    },
    draw(s,m) {
      const plane=makePlane({scale:Math.min(canvas.clientWidth,canvas.clientHeight)/12});
      drawGrid(plane);
      plotFunction(plane,x=>x<=0?x+1:NaN,-5,0,palette.blue,3);
      plotFunction(plane,x=>x>0?x*x+s.jump:NaN,0.02,5,palette.orange,3);
      drawPoint(plane,{x:0,y:1},"",palette.blue,5);
      drawPoint(plane,{x:0,y:s.jump},"",palette.orange,5);
    },
    status(s,m) {
      return m.continuous ? "左右極限與函數值相符，連續。" : "左右極限不相等，不連續。";
    }
  },
  {
    id: "squeeze-theorem",
    title: "夾擠定理：上下界共同逼近",
    short: "夾擠定理",
    tag: "極限",
    examSignal: "看到一個函數被兩個同極限函數夾住，就不必硬算原式；直接用夾擠定理。",
    prompt: "觀察 -x² ≤ x² sin(1/x) ≤ x² 且上下界同趨近 0。",
    challenge: "說明為什麼 sin(1/x) 不收斂，但 x²sin(1/x) 收斂。",
    controls: [
      { key: "power", label: "外乘 x^p 的 p", min: 1, max: 4, step: 1, value: 2 }
    ],
    compute(s) {
      return {};
    },
    formula(s) {
      return [
        `-|x|^${s.power} ≤ x^${s.power} sin(1/x) ≤ |x|^${s.power}`,
        `上下界 x→0 時皆趨近 0`,
        `故原函數極限為 0`
      ];
    },
    draw(s) {
      const plane=makePlane({scale:Math.min(canvas.clientWidth,canvas.clientHeight)/12});
      drawGrid(plane);
      plotFunction(plane,x=>Math.abs(x)<0.02?NaN:(x**s.power)*Math.sin(1/x),-2,2,palette.blue,2,0.004);
      plotFunction(plane,x=>Math.abs(x)**s.power,-2,2,palette.orange,2);
      plotFunction(plane,x=>-(Math.abs(x)**s.power),-2,2,palette.orange,2);
    },
    status(s) {
      return `原函數被 ±|x|^${s.power} 夾住。`;
    }
  },
  {
    id: "cross-section-volume",
    title: "切片積分與旋轉體：由截面面積累積體積",
    short: "切片與旋轉體",
    tag: "積分應用",
    examSignal: "體積題先畫垂直於積分變數的截面，寫 V=∫A(x)dx；旋轉體用圓盤或圓環面積。",
    prompt: "調整上方函數高度，觀察旋轉體截面半徑與體積。",
    challenge: "先決定用 dx 還是 dy，再寫出截面面積 A。",
    controls: [
      { key: "a", label: "函數係數 a", min: 0.2, max: 2, step: 0.1, value: 1 },
      { key: "x", label: "觀察切片 x", min: 0, max: 3, step: 0.05, value: 1.5 }
    ],
    compute(s) {
      const f=x=>s.a*Math.sqrt(Math.max(0,x));
      const volume = Math.PI * s.a*s.a * (3*3/2);
      return { f, radius:f(s.x), volume };
    },
    formula(s,m) {
      return [
        `繞 x 軸：A(x)=π[f(x)]²`,
        `f(x)=${format(s.a)}√x，0≤x≤3`,
        `V=∫₀³πa²x dx=${format(m.volume)}`
      ];
    },
    draw(s,m) {
      const plane=makePlane({scale:Math.min(canvas.clientWidth,canvas.clientHeight)/11, origin:{x:70,y:canvas.clientHeight*.70}});
      drawGrid(plane);
      plotFunction(plane,m.f,0,3.5,palette.blue,3);
      drawSegment(plane,{x:s.x,y:0},{x:s.x,y:m.radius},palette.red,4);
      drawMathLabel(`切片半徑=${format(m.radius)}`,40,42);
    },
    status(s,m) {
      return `目前切片半徑 ${format(m.radius)}；體積 ${format(m.volume)}。`;
    }
  },
  {
    id: "complex-nth-roots",
    title: "複數 n 次方根：單位圓上的正多邊形",
    short: "n 次方根",
    tag: "複數",
    examSignal: "解 z^n=w 時，半徑開 n 次方，角度分成 n 等份；根在複數平面形成正多邊形。",
    prompt: "調整 n 與目標角度，觀察 n 個根如何平均分布在圓上。",
    challenge: "寫出所有根的極式，並標出主輻角。",
    controls: [
      { key: "n", label: "次方 n", min: 2, max: 12, step: 1, value: 5 },
      { key: "theta", label: "w 的角度 θ", min: 0, max: 360, step: 1, value: 60, unit: "°" },
      { key: "r", label: "w 的模 r", min: 0.2, max: 8, step: 0.1, value: 1 }
    ],
    compute(s) {
      const R=s.r**(1/s.n);
      const pts=[];
      for(let k=0;k<s.n;k++){ const a=(s.theta*DEG+TAU*k)/s.n; pts.push({x:R*Math.cos(a),y:R*Math.sin(a),a}); }
      return { R, pts };
    },
    formula(s,m) {
      return [
        `若 w=r(cosθ+i sinθ)`,
        `z_k=r^(1/n)[cos((θ+2kπ)/n)+i sin((θ+2kπ)/n)]`,
        `根的模=${format(m.R)}，共有 ${s.n} 個`
      ];
    },
    draw(s,m) {
      const plane=makePlane({scale:Math.min(canvas.clientWidth,canvas.clientHeight)/8});
      drawGrid(plane);
      drawCircle(plane,{x:0,y:0},m.R,palette.axis,"transparent",2);
      for(let i=0;i<m.pts.length;i++){ drawPoint(plane,m.pts[i],String(i),palette.blue,5); if(i>0) drawSegment(plane,m.pts[i-1],m.pts[i],palette.orange,2); }
      drawSegment(plane,m.pts.at(-1),m.pts[0],palette.orange,2);
    },
    status(s,m) {
      return `${s.n} 個根均勻分布在半徑 ${format(m.R)} 的圓上。`;
    }
  },
  {
    id: "conic-rotation-xy",
    title: "旋轉橢圓：含 xy 項的二次曲線",
    short: "旋轉橢圓",
    tag: "二次曲線",
    examSignal: "含 xy 項常代表坐標軸旋轉；108 課綱重點是由旋轉橢圓認識，不要求直接解一般二次式。",
    prompt: "調整旋轉角，觀察標準橢圓旋轉後出現斜向長短軸。",
    challenge: "說明為什麼旋轉不改變橢圓的長短軸長，只改變方向。",
    controls: [
      { key: "a", label: "半長軸 a", min: 1, max: 5, step: 0.1, value: 3 },
      { key: "b", label: "半短軸 b", min: 0.5, max: 4, step: 0.1, value: 1.5 },
      { key: "theta", label: "旋轉角 θ", min: 0, max: 90, step: 1, value: 28, unit: "°" }
    ],
    compute(s) {
      return { th:s.theta*DEG };
    },
    formula(s,m) {
      return [
        `標準式：X²/a²+Y²/b²=1`,
        `旋轉：X=x cosθ+y sinθ，Y=-x sinθ+y cosθ`,
        `θ=${format(s.theta)}° 時一般會出現 xy 項`
      ];
    },
    draw(s,m) {
      const plane=makePlane({scale:Math.min(canvas.clientWidth,canvas.clientHeight)/10});
      drawGrid(plane);
      ctx.save(); ctx.strokeStyle=palette.blue; ctx.lineWidth=3; ctx.beginPath();
      for(let t=0;t<=TAU+0.02;t+=0.02){
        const X=s.a*Math.cos(t), Y=s.b*Math.sin(t);
        const x=X*Math.cos(m.th)-Y*Math.sin(m.th);
        const y=X*Math.sin(m.th)+Y*Math.cos(m.th);
        if(t===0) ctx.moveTo(plane.sx(x),plane.sy(y)); else ctx.lineTo(plane.sx(x),plane.sy(y));
      }
      ctx.stroke(); ctx.restore();
      drawMathLabel(`旋轉 ${format(s.theta)}°`,40,42);
    },
    status(s,m) {
      return `橢圓已旋轉 ${format(s.theta)}°。`;
    }
  },
  {
    id: "ellipse-parametric",
    title: "橢圓參數式：x=a cosθ, y=b sinθ",
    short: "橢圓參數式",
    tag: "二次曲線",
    examSignal: "橢圓上動點若用參數式，可把限制 x²/a²+y²/b²=1 自動滿足。",
    prompt: "拖曳 θ，觀察參數角與幾何角不一定相同。",
    challenge: "代入 x=a cosθ, y=b sinθ 驗證標準式恆成立。",
    controls: [
      { key: "a", label: "a", min: 1, max: 5, step: 0.1, value: 3 },
      { key: "b", label: "b", min: 0.5, max: 4, step: 0.1, value: 2 },
      { key: "theta", label: "參數 θ", min: 0, max: 360, step: 1, value: 45, unit: "°" }
    ],
    compute(s) {
      const t=s.theta*DEG;
      return { P:{x:s.a*Math.cos(t),y:s.b*Math.sin(t)} };
    },
    formula(s,m) {
      return [
        `x=${format(s.a)}cosθ，y=${format(s.b)}sinθ`,
        `x²/a²+y²/b²=cos²θ+sin²θ=1`,
        `P=(${format(m.P.x)},${format(m.P.y)})`
      ];
    },
    draw(s,m) {
      const plane=makePlane({scale:Math.min(canvas.clientWidth,canvas.clientHeight)/10});
      drawGrid(plane);
      ctx.save(); ctx.strokeStyle=palette.blue; ctx.lineWidth=3; ctx.beginPath();
      for(let t=0;t<=TAU+0.02;t+=0.02){ const x=s.a*Math.cos(t), y=s.b*Math.sin(t); if(t===0) ctx.moveTo(plane.sx(x),plane.sy(y)); else ctx.lineTo(plane.sx(x),plane.sy(y)); }
      ctx.stroke(); ctx.restore();
      drawPoint(plane,m.P,"P",palette.red);
      drawSegment(plane,{x:0,y:0},m.P,palette.orange,2);
    },
    status(s,m) {
      return `P=(${format(m.P.x)}, ${format(m.P.y)})，自動在橢圓上。`;
    }
  },
  {
    id: "complex-conjugate-roots",
    title: "實係數多項式：共軛虛根成對",
    short: "共軛虛根",
    tag: "複數與方程式",
    examSignal: "實係數多項式若有根 a+bi，必有共軛根 a-bi；可成對構造二次因式。",
    prompt: "調整 a,b，觀察共軛根相乘得到實係數二次式。",
    challenge: "由根 2+3i 直接寫出對應二次因式。",
    controls: [
      { key: "a", label: "實部 a", min: -4, max: 4, step: 0.1, value: 1 },
      { key: "b", label: "虛部 b", min: 0.2, max: 4, step: 0.1, value: 2 }
    ],
    compute(s) {
      return { B:-2*s.a, C:s.a*s.a+s.b*s.b };
    },
    formula(s,m) {
      return [
        `根：${format(s.a)}±${format(s.b)}i`,
        `(x-(a+bi))(x-(a-bi))=(x-a)²+b²`,
        `二次因式：x²+(${format(m.B)})x+${format(m.C)}`
      ];
    },
    draw(s,m) {
      const plane=makePlane({scale:Math.min(canvas.clientWidth,canvas.clientHeight)/10});
      drawGrid(plane);
      drawPoint(plane,{x:s.a,y:s.b},"z",palette.blue);
      drawPoint(plane,{x:s.a,y:-s.b},"conj",palette.orange);
      drawSegment(plane,{x:s.a,y:s.b},{x:s.a,y:-s.b},palette.red,2,[6,6]);
    },
    status(s,m) {
      return `共軛根形成實係數二次因式 x²${m.B>=0?"+":""}${format(m.B)}x+${format(m.C)}。`;
    }
  },
  {
    id: "scalar-triple-product",
    title: "三階行列式：純量三重積與平行六面體體積",
    short: "三重積體積",
    tag: "空間向量",
    examSignal: "平行六面體體積是 |a·(b×c)|；方向可能正負，體積取絕對值。",
    prompt: "調整第三向量高度，觀察體積隨垂直分量改變。",
    challenge: "解題時先求底面外積，再與第三向量內積。",
    controls: [
      { key: "cx", label: "第三向量 cx", min: -3, max: 3, step: 0.1, value: 1 },
      { key: "cy", label: "第三向量 cy", min: -3, max: 3, step: 0.1, value: 1 },
      { key: "cz", label: "第三向量 cz", min: -1, max: 5, step: 0.1, value: 2 }
    ],
    compute(s) {
      const a={x:2,y:0,z:0}, b={x:0,y:2,z:0}, c={x:s.cx,y:s.cy,z:s.cz};
      const n=cross3(a,b);
      const triple=dot3(c,n);
      return { a,b,c,n,triple,volume:Math.abs(triple) };
    },
    formula(s,m) {
      return [
        `a=(2,0,0), b=(0,2,0), c=(${format(s.cx)},${format(s.cy)},${format(s.cz)})`,
        `a×b=(${format(m.n.x)},${format(m.n.y)},${format(m.n.z)})`,
        `V=|c·(a×b)|=${format(m.volume)}`
      ];
    },
    draw(s,m) {
      const {width,height}=canvas.getBoundingClientRect();
      ctx.save();
      const ox=width*.34, oy=height*.66, sx=52, sy=32, sz=52;
      const proj=p=>({x:ox+p.x*sx+p.y*28, y:oy-p.y*sy-p.z*sz});
      const O=proj({x:0,y:0,z:0}), A=proj(m.a), B=proj(m.b), C=proj(m.c);
      ctx.strokeStyle=palette.blue; ctx.lineWidth=3;
      const line=(P,Q)=>{ctx.beginPath();ctx.moveTo(P.x,P.y);ctx.lineTo(Q.x,Q.y);ctx.stroke();};
      line(O,A); line(O,B); line(O,C); line(A,proj(add3(m.a,m.b))); line(B,proj(add3(m.a,m.b)));
      line(C,proj(add3(m.c,m.a))); line(C,proj(add3(m.c,m.b)));
      drawMathLabel(`V=${format(m.volume)}`,40,42);
      ctx.restore();
    },
    status(s,m) {
      return `平行六面體體積 ${format(m.volume)}。`;
    }
  },
  {
    id: "sphere-space-coordinate",
    title: "空間坐標與球面：距離公式的三維版",
    short: "空間距離與球",
    tag: "空間坐標",
    examSignal: "空間距離直接把平方差延伸到三個坐標；球面是到定點距離固定。",
    prompt: "調整點 P，觀察 OP 是否在半徑 R 的球內、球上或球外。",
    challenge: "由球心與半徑寫出球面方程式。",
    controls: [
      { key: "x", label: "x", min: -4, max: 4, step: 0.1, value: 1 },
      { key: "y", label: "y", min: -4, max: 4, step: 0.1, value: 2 },
      { key: "z", label: "z", min: -4, max: 4, step: 0.1, value: 1.5 },
      { key: "R", label: "球半徑 R", min: 1, max: 5, step: 0.1, value: 3 }
    ],
    compute(s) {
      const d=Math.hypot(s.x,s.y,s.z);
      const relation=Math.abs(d-s.R)<0.03?"球上":d<s.R?"球內":"球外";
      return { d, relation };
    },
    formula(s,m) {
      return [
        `OP=√(x²+y²+z²)=${format(m.d)}`,
        `球面：x²+y²+z²=${format(s.R*s.R)}`,
        `P 在${m.relation}`
      ];
    },
    draw(s,m) {
      const {width,height}=canvas.getBoundingClientRect();
      ctx.save();
      ctx.strokeStyle=palette.blue; ctx.lineWidth=3;
      ctx.beginPath(); ctx.ellipse(width*.5,height*.55,s.R*45,s.R*26,0,0,TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(width*.5,height*.55,s.R*45,0,TAU); ctx.strokeStyle="rgba(47,99,255,.25)"; ctx.stroke();
      const px=width*.5+s.x*45+s.y*16, py=height*.55-s.y*18-s.z*45;
      ctx.fillStyle=palette.red; ctx.beginPath(); ctx.arc(px,py,6,0,TAU); ctx.fill();
      drawMathLabel(`OP=${format(m.d)}，${m.relation}`,40,42);
      ctx.restore();
    },
    status(s,m) {
      return `OP=${format(m.d)}，點在${m.relation}。`;
    }
  },
  {
    id: "normal-approx-binomial",
    title: "二項分布與常態近似：機率模型連結",
    short: "二項常態近似",
    tag: "機率統計",
    examSignal: "二項分布 n 大且 p 不太極端時，可用常態曲線理解集中位置與擴散程度。",
    prompt: "調整 n,p，觀察二項長條如何逐漸像常態曲線。",
    challenge: "先算 μ=np、σ=√np(1-p)，再判斷合理區間。",
    controls: [
      { key: "n", label: "試驗次數 n", min: 5, max: 80, step: 1, value: 30 },
      { key: "p", label: "成功率 p", min: 0.05, max: 0.95, step: 0.01, value: 0.4 }
    ],
    compute(s) {
      const values=[], labels=[];
      for(let k=0;k<=s.n;k++){ values.push(comb(s.n,k)*(s.p**k)*((1-s.p)**(s.n-k))); labels.push(String(k)); }
      const mu=s.n*s.p, sigma=Math.sqrt(s.n*s.p*(1-s.p));
      return { values, labels, mu, sigma };
    },
    formula(s,m) {
      return [
        `X~B(${s.n}, ${format(s.p)})`,
        `E(X)=np=${format(m.mu)}，Var=np(1-p)=${format(m.sigma*m.sigma)}`,
        `σ=${format(m.sigma)}`
      ];
    },
    draw(s,m) {
      drawSimpleBarChart(m.values,m.labels,Math.round(m.mu));
      drawMathLabel(`μ=${format(m.mu)}，σ=${format(m.sigma)}`,40,42);
    },
    status(s,m) {
      return `平均 ${format(m.mu)}，標準差 ${format(m.sigma)}。`;
    }
  },
  {
    id: "hypergeometric-sampling",
    title: "不放回抽樣：超幾何分布直覺",
    short: "不放回抽樣",
    tag: "機率統計",
    examSignal: "抽樣若不放回，各次不獨立；不能直接套二項分布，需用組合數比例。",
    prompt: "調整母體成功數與抽樣數，觀察抽到 k 個成功的機率。",
    challenge: "比較放回與不放回在獨立性上的差異。",
    controls: [
      { key: "N", label: "母體總數 N", min: 10, max: 80, step: 1, value: 40 },
      { key: "K", label: "成功數 K", min: 1, max: 40, step: 1, value: 12 },
      { key: "n", label: "抽樣數 n", min: 1, max: 20, step: 1, value: 6 }
    ],
    compute(s) {
      const K=Math.min(s.K,s.N), n=Math.min(s.n,s.N);
      const minK=Math.max(0,n-(s.N-K)), maxK=Math.min(K,n);
      const values=[], labels=[];
      for(let k=minK;k<=maxK;k++){ values.push(comb(K,k)*comb(s.N-K,n-k)/comb(s.N,n)); labels.push(String(k)); }
      const mean=n*K/s.N;
      return { K,n,values,labels,mean };
    },
    formula(s,m) {
      return [
        `P(X=k)=C(K,k)C(N-K,n-k)/C(N,n)`,
        `E(X)=nK/N=${format(m.mean)}`,
        `不放回抽樣：各次抽取通常不獨立`
      ];
    },
    draw(s,m) {
      drawSimpleBarChart(m.values,m.labels,Math.round(m.mean));
      drawMathLabel(`E(X)=${format(m.mean)}`,40,42);
    },
    status(s,m) {
      return `不放回抽樣的平均成功數 ${format(m.mean)}。`;
    }
  }
];

modules.push(...masteryModules);
modules.push(...(window.createExtensionModules?.() ?? []), ...(window.createExamModules?.() ?? []));

const advancedIds = new Set(["parabola", "ellipse", "hyperbola", "complex", "space-skew-lines", "riemann", "derivative-tangent", "derivative-optimization", "limit-continuity", "ftc-accumulation", "area-between-curves", "complex-demoivre", "conic-tangent", "infinite-geometric-series", "newton-method", "derivative-rules", "concavity-inflection", "optimization-box", "piecewise-continuity-ivt", "squeeze-theorem", "cross-section-volume", "complex-nth-roots", "conic-rotation-xy", "ellipse-parametric", "complex-conjugate-roots", "normal-approx-binomial"]);
const enrichmentIds = new Set(["taylor", "contour-gradient", "sampling-clt"]);
const mathAIds = new Set(["projection", "matrix", "regression", "bayes", "vector-linear-combination", "cauchy-bound", "determinant-system", "markov-chain", "binomial-distribution", "geometric-distribution", "normal-curve", "space-plane-distance", "plane-intersection-line", "line-plane-angle", "matrix-inverse-system", "gaussian-elimination-visual", "discrete-random-variable", "scalar-triple-product", "sphere-space-coordinate", "hypergeometric-sampling"]);


for (const module of modules) {
  // Navigation groups are editorial labels, not a certification of exam scope.
  module.course ??= enrichmentIds.has(module.id) ? "enrichment" : advancedIds.has(module.id) ? "advanced" : mathAIds.has(module.id) ? "A" : "common";
  module.courses ??= module.course === "common" ? ["common", "A", "advanced"] : module.course === "A" ? ["A", "advanced"] : [module.course];
  module.searchText = `${module.title} ${module.short} ${module.tag} ${module.examSignal} ${module.prompt} ${module.challenge ?? ""}`.toLowerCase();
  for (const control of module.controls) {
    control.defaultValue = control.value;
  }
}

let currentId = modules[0].id;

function getCurrentModule() {
  return modules.find(m => m.id === currentId) ?? modules[0];
}

function renderModuleList() {
  if (window.MathLab?.renderNavigation) return window.MathLab.renderNavigation();
  moduleList.innerHTML = "";
  const query = (moduleSearch?.value ?? "").trim().toLowerCase();
  const visibleModules = query
    ? modules.filter(module => module.searchText.includes(query))
    : modules;

  if (visibleModules.length === 0) {
    const empty = document.createElement("div");
    empty.className = "module-empty";
    empty.textContent = "找不到符合的模組。";
    moduleList.appendChild(empty);
    return;
  }

  for (const module of visibleModules) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `module-button ${module.id === currentId ? "active" : ""}`;
    button.innerHTML = `<strong>${module.short}</strong><span>${module.tag}</span>`;
    button.addEventListener("click", () => {
      currentId = module.id;
      render();
    });
    moduleList.appendChild(button);
  }
}

function renderControls(module) {
  controlsEl.innerHTML = "";
  for (const control of module.controls) {
    const wrap = document.createElement("div");
    wrap.className = "control";

    const label = document.createElement("label");
    label.htmlFor = `control-${control.key}`;
    label.innerHTML = `<span>${control.label}</span>`;
    const output = document.createElement("output");
    output.textContent = getControlDisplay(control);
    label.appendChild(output);
    wrap.appendChild(label);

    let input;
    if (control.type === "select") {
      input = document.createElement("select");
      for (const opt of control.options) {
        const option = document.createElement("option");
        option.value = opt.value;
        option.textContent = opt.label;
        if (opt.value === control.value) option.selected = true;
        input.appendChild(option);
      }
    } else {
      input = document.createElement("input");
      input.type = "range";
      input.min = control.min;
      input.max = control.max;
      input.step = control.step;
      input.value = control.value;
    }
    input.id = `control-${control.key}`;
    input.addEventListener("input", () => {
      control.value = control.type === "select" ? input.value : Number(input.value);
      output.textContent = getControlDisplay(control);
      scheduleDraw();
    });
    wrap.appendChild(input);
    controlsEl.appendChild(wrap);
  }
}

let pendingDraw = 0;
const renderMetrics = {draws: 0, lastDuration: 0};
function scheduleDraw() {
  if (!pendingDraw) pendingDraw = requestAnimationFrame(() => { pendingDraw = 0; drawCurrent(); });
}

function drawCurrent() {
  if (pendingDraw) { cancelAnimationFrame(pendingDraw); pendingDraw = 0; }
  const started = performance.now();
  const module = getCurrentModule();
  clearCanvas();
  const state = stateFromControls(module);
  const computed = module.compute(state);
  module.draw(state, computed);
  setFormula(module.formula(state, computed));
  liveStatus.textContent = module.status(state, computed);
  canvas.setAttribute("aria-label", `${module.title}。${module.status(state, computed)}。圖形數值可於即時公式閱讀。`);
  renderMetrics.draws++;
  renderMetrics.lastDuration = performance.now() - started;
  document.dispatchEvent(new CustomEvent("mathlab:statechange", {detail: {module}}));
}

function render() {
  const module = getCurrentModule();
  moduleTitle.textContent = module.title;
  moduleTag.textContent = module.tag;
  examSignal.textContent = module.examSignal;
  promptBox.textContent = module.prompt;
  challengeBox.textContent = module.challenge ?? "調整參數，觀察不變量，並用公式說明圖形現象。";
  renderModuleList();
  renderControls(module);
  drawCurrent();
  document.dispatchEvent(new CustomEvent("mathlab:modulechange", {detail: {module}}));
}

function resetCurrent() {
  const module = getCurrentModule();
  for (const control of module.controls) {
    if (Object.prototype.hasOwnProperty.call(control, "defaultValue")) {
      control.value = control.defaultValue;
    }
  }
  render();
}

moduleSearch?.addEventListener("input", renderModuleList);

resetBtn.addEventListener("click", resetCurrent);

exportBtn.addEventListener("click", () => {
  drawCurrent();
  const link = document.createElement("a");
  const module = getCurrentModule();
  link.download = `${module.id}-visualization.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
});

window.addEventListener("resize", () => {
  setupCanvas();
  scheduleDraw();
});

function validateParameters(module, parameters = {}) {
  if (!parameters || typeof parameters !== "object" || Array.isArray(parameters)) throw new Error("參數格式錯誤");
  for (const key of Object.keys(parameters)) if (!module.controls.some(c => c.key === key)) throw new Error(`未知參數：${key}`);
  const validated = {};
  for (const c of module.controls) {
    const value = Object.hasOwn(parameters, c.key) ? parameters[c.key] : c.defaultValue;
    if (c.type === "select") {
      if (!c.options.some(o => o.value === value)) throw new Error(`選項無效：${c.label}`);
      validated[c.key] = value;
    } else {
      if (typeof value !== "number" || !Number.isFinite(value) || value < c.min || value > c.max) throw new Error(`參數超出範圍：${c.label}`);
      const normalized = c.min + Math.round((value - c.min) / c.step) * c.step;
      validated[c.key] = Number(clamp(normalized, c.min, c.max).toFixed(10));
    }
  }
  return validated;
}

function selectModule(id, parameters) {
  const module = modules.find(m => m.id === id);
  if (!module) throw new Error("找不到此模組");
  const values = validateParameters(module, parameters ?? stateFromControls(module));
  for (const c of module.controls) c.value = values[c.key];
  currentId = id;
  render();
}

function createShareURL() {
  const url = new URL(location.href);
  const params = new URLSearchParams(stateFromControls(getCurrentModule()));
  url.hash = `${currentId}?${params.toString()}`;
  return url.href;
}

function restoreHash() {
  if (!location.hash) return;
  try {
    const [rawId, query = ""] = location.hash.slice(1).split("?");
    if (!query && ["experiment", "notebook", "examSection", "research", "main"].includes(rawId)) return;
    const id = decodeURIComponent(rawId), module = modules.find(m => m.id === id);
    if (!module) throw new Error("分享連結的模組不存在");
    const parameters = Object.create(null), params = new URLSearchParams(query);
    for (const [key, raw] of params) {
      const c = module.controls.find(c => c.key === key);
      if (!c || Object.hasOwn(parameters, key)) throw new Error("分享連結含有未知或重複參數");
      if (c.type !== "select" && !raw.trim()) throw new Error("分享連結含有空白數值");
      parameters[key] = c.type === "select" ? raw : Number(raw);
    }
    selectModule(id, parameters);
  } catch (error) {
    liveStatus.textContent = `${error.message}；已保留目前模組。`;
    document.dispatchEvent(new CustomEvent("mathlab:error", {detail: {message: error.message}}));
  }
}

window.MathLab = {modules, getCurrentModule, selectModule, validateParameters, createShareURL, getState: () => ({moduleId: currentId, parameters: stateFromControls(getCurrentModule())}), refreshList: renderModuleList, scheduleDraw, metrics: renderMetrics};
window.addEventListener("hashchange", restoreHash);

if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    const radius = Math.min(r, Math.abs(w)/2, Math.abs(h)/2);
    this.moveTo(x + radius, y);
    this.arcTo(x + w, y, x + w, y + h, radius);
    this.arcTo(x + w, y + h, x, y + h, radius);
    this.arcTo(x, y + h, x, y, radius);
    this.arcTo(x, y, x + w, y, radius);
    return this;
  };
}

setupCanvas();
render();
restoreHash();
if (typeof ResizeObserver !== "undefined") new ResizeObserver(() => {setupCanvas(); scheduleDraw();}).observe(canvas);
