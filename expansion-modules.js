/* v2.3: 50 independent teaching experiments. No network or runtime dependency. */
window.createExpansionModules = function () {
  'use strict';
  const PI = Math.PI, D = PI / 180, EPS = 1e-10;
  const C = ['#2f63ff', '#e28b18', '#18a999', '#b24fc4', '#df4654'];
  const F = n => Number.isFinite(n) ? String(Number(n.toPrecision(7))) : '不適用';
  const num = (key, label, min, max, value, step = .1) => ({key, label, min, max, value, step, integer: false});
  const int = (key, label, min, max, value) => ({...num(key, label, min, max, value, 1), integer: true});
  const angle = (key, label, min, max, value) => ({...num(key, label, min, max, value, 1), unit: '°'});
  const choose = (key, label, options, value = options[0][0]) => ({key, label, type: 'select', value, options: options.map(([value, label]) => ({value, label}))});
  const P = (x, y, label = '', color = C[0], open = false) => ({x, y, label, color, open});
  const L = (a, b, color = C[0], dash = false) => ({a, b, color, dash});
  const curve = (f, color = C[0], x, holes = []) => ({f, color, x, holes});
  const fact = n => {let v = 1; for (let k = 2; k <= n; k++) v *= k; return v;};
  const binom = (n, k) => {if (n < 0 || k < 0 || k > n) return 0; let v = 1; for (let i = 1; i <= Math.min(k, n - k); i++) v = v * (n - i + 1) / i; return Math.round(v);};
  const sum = a => a.reduce((x, y) => x + y, 0);
  const sq = x => x * x;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const project = v => P(v[0] + .48 * v[1], v[2] + .32 * v[1]);
  const dot = (a, b) => sum(a.map((x, i) => x * b[i]));
  const length = a => Math.hypot(...a);
  const vec = a => '(' + a.map(F).join(', ') + ')';
  const graph = (curves, x, y, extra = {}) => ({curves, x, y, ...extra});
  function geometry(points, extra = {}) {
    const finite = points.filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
    const xs = finite.map(p => p.x), ys = finite.map(p => p.y);
    for (const c of extra.circles || []) {xs.push(c.x - c.r, c.x + c.r); ys.push(c.y - c.r, c.y + c.r);}
    const x = [Math.min(0, ...xs), Math.max(1, ...xs)], y = [Math.min(0, ...ys), Math.max(1, ...ys)];
    const pad = Math.max(x[1] - x[0], y[1] - y[0], 1) * .16;
    return {x: [x[0] - pad, x[1] + pad], y: [y[0] - pad, y[1] + pad], equal: true, points, ...extra};
  }
  const bars = (values, labels, extra = {}) => ({x: [-.6, values.length - .4], y: [Math.min(0, ...values) * 1.2, Math.max(1e-6, ...values) * 1.25], bars: values.map((value, x) => ({x, value, label: labels?.[x] ?? String(x), color: C[x % C.length]})), ...extra});
  const series = (values, start = 1, extra = {}) => {
    const ps = values.map((v, i) => P(i + start, v));
    const lo = Math.min(0, ...values), hi = Math.max(1, ...values), pad = Math.max(1, hi - lo) * .15;
    return {x: [start - .5, start + values.length - .5], y: [lo - pad, hi + pad], points: ps.length <= 35 ? ps : [], lines: ps.slice(1).map((p, i) => L(ps[i], p)), ...extra};
  };
  const model = (data, lines, scene, summary = lines[0]) => ({...data, lines, scene, summary});
  const errorModel = message => model({valid: false}, [message], graph([], [-1, 1], [-1, 1], {note: message}), message);

  // A bounded renderer with independent chart axes and equal-scale geometry.
  // All paths are clipped; poles and explicit holes break the curve.
  function drawScene(scene, title) {
    const {width, height} = canvas.getBoundingClientRect();
    const box = {left: 58, right: Math.max(100, width - 24), top: 68, bottom: Math.max(140, height - 62)};
    const w = box.right - box.left, h = box.bottom - box.top;
    let [xmin, xmax] = scene.x, [ymin, ymax] = scene.y;
    if (scene.equal) {
      const unit = Math.min(w / (xmax - xmin), h / (ymax - ymin));
      const mx = (xmin + xmax) / 2, my = (ymin + ymax) / 2;
      xmin = mx - w / unit / 2; xmax = mx + w / unit / 2; ymin = my - h / unit / 2; ymax = my + h / unit / 2;
    }
    const sx = x => box.left + (x - xmin) * w / (xmax - xmin), sy = y => box.bottom - (y - ymin) * h / (ymax - ymin);
    const text = (s, x, y, color = '#3a4f69') => {ctx.fillStyle = color; ctx.fillText(s, x, y);};
    const ticks = (lo, hi) => {const raw = (hi - lo) / 7, p = 10 ** Math.floor(Math.log10(raw)); const step = [1, 2, 5, 10].find(v => v * p >= raw) * p; const a = []; for (let k = Math.ceil(lo / step); k * step <= hi && a.length < 15; k++) a.push(k * step); return a;};
    ctx.save(); ctx.font = '12px system-ui'; ctx.lineWidth = 1;
    for (const x of ticks(xmin, xmax)) {ctx.beginPath(); ctx.strokeStyle = '#e7edf5'; ctx.moveTo(sx(x), box.top); ctx.lineTo(sx(x), box.bottom); ctx.stroke(); if (!scene.bars) text(F(x), sx(x) - 8, box.bottom + 20);}
    for (const y of ticks(ymin, ymax)) {ctx.beginPath(); ctx.strokeStyle = '#e7edf5'; ctx.moveTo(box.left, sy(y)); ctx.lineTo(box.right, sy(y)); ctx.stroke(); text(F(y), 5, sy(y) + 4);}
    ctx.strokeStyle = '#9aaac0'; ctx.strokeRect(box.left, box.top, w, h);
    ctx.save(); ctx.beginPath(); ctx.rect(box.left, box.top, w, h); ctx.clip();
    const line = (a, b, color, dash) => {ctx.strokeStyle = color || C[0]; ctx.lineWidth = 2.2; ctx.setLineDash(dash ? [6, 5] : []); ctx.beginPath(); ctx.moveTo(sx(a.x), sy(a.y)); ctx.lineTo(sx(b.x), sy(b.y)); ctx.stroke(); ctx.setLineDash([]);};
    if (xmin <= 0 && xmax >= 0) line(P(0, ymin), P(0, ymax), '#bac5d5');
    if (ymin <= 0 && ymax >= 0) line(P(xmin, 0), P(xmax, 0), '#bac5d5');
    for (const poly of scene.polygons || []) {ctx.beginPath(); poly.points.forEach((p, i) => i ? ctx.lineTo(sx(p.x), sy(p.y)) : ctx.moveTo(sx(p.x), sy(p.y))); ctx.closePath(); ctx.fillStyle = poly.fill || '#2f63ff20'; ctx.fill(); ctx.strokeStyle = poly.color || C[0]; ctx.lineWidth = 2; ctx.stroke();}
    for (const c of scene.circles || []) {ctx.beginPath(); ctx.ellipse(sx(c.x), sy(c.y), c.r * w / (xmax - xmin), c.r * h / (ymax - ymin), 0, 0, 2 * PI); ctx.fillStyle = c.fill || 'transparent'; ctx.fill(); ctx.strokeStyle = c.color || C[0]; ctx.lineWidth = 2; ctx.stroke();}
    for (const b of scene.bars || []) {ctx.fillStyle = b.color || C[0]; ctx.fillRect(sx(b.x - .33), Math.min(sy(b.value), sy(0)), .66 * w / (xmax - xmin), Math.abs(sy(b.value) - sy(0)));}
    for (const l of scene.lines || []) line(l.a, l.b, l.color, l.dash);
    for (const c of scene.curves || []) {
      const a = Math.max(xmin, c.x?.[0] ?? xmin), b = Math.min(xmax, c.x?.[1] ?? xmax); if (!(b > a)) continue;
      ctx.beginPath(); ctx.strokeStyle = c.color || C[0]; ctx.lineWidth = 2.4; let previous = null;
      for (let i = 0; i <= 420; i++) {const x = a + (b - a) * i / 420, y = c.f(x); const broken = !Number.isFinite(y) || y < ymin - (ymax - ymin) || y > ymax + (ymax - ymin); const gap = previous && (Math.abs(sy(y) - sy(previous.y)) > h * .7 || c.holes.some(t => t >= previous.x && t <= x)); if (broken) {previous = null; continue;} if (!previous || gap) ctx.moveTo(sx(x), sy(y)); else ctx.lineTo(sx(x), sy(y)); previous = {x, y};} ctx.stroke();
    }
    for (const p of scene.points || []) {if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue; ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), 4.5, 0, 2 * PI); ctx.fillStyle = p.open ? '#fff' : p.color || C[0]; ctx.fill(); ctx.strokeStyle = p.color || C[0]; ctx.lineWidth = 2; ctx.stroke(); if (p.label) text(p.label, sx(p.x) + 7, sy(p.y) - 9, p.color);}
    for (const label of scene.labels || []) text(label.text, sx(label.x), sy(label.y), label.color);
    ctx.restore();
    if (scene.bars) for (const b of scene.bars) {ctx.textAlign = 'center'; if (scene.bars.length <= 20 || b.x % 2 === 0) text(b.label, sx(b.x), box.bottom + 20);}
    ctx.textAlign = 'left'; ctx.font = '600 14px system-ui'; text(title, 20, 25);
    ctx.font = '12px system-ui';
    const note = scene.note || (scene.equal ? '幾何圖保持等比例；投影圖請搭配公式判讀。' : '調整參數，比較曲線、特殊點與即時公式。');
    // Wrap the annotation rather than letting long Chinese strings overflow phones.
    let row = '', y = 45; for (const ch of note) {if (ctx.measureText(row + ch).width > width - 36 && row) {text(row, 20, y); row = ''; y += 15;} row += ch;} if (row) text(row, 20, y);
    ctx.restore();
  }

  const modules = [];
  function add(config) {
    modules.push({...config, release: '2.3', formula: (s, m) => m.lines, status: (s, m) => m.summary, draw: (s, m) => drawScene(m.scene, config.short)});
  }

  // 01–08: algebra, inequalities and exponential models.
  add({id: 'quadratic-root-location', short: '二次實根的位置', title: '二次方程：判別式與實根位置', tag: '代數與不等式', course: 'common',
    examSignal: '問實根在哪一側，先判斷判別式，再比較根與指定分界；重根只算一個相異實根。', prompt: '移動直線 x=q，觀察實根在左側、右側或分界上。', trap: '判別式為負時沒有實根，不能只用根和、根積推論位置。', challenge: 'x²−3x+2=0 的根中，有幾個嚴格大於 1？', challengeAnswer: '根為 1、2，只有 2 嚴格大於 1，因此是 1 個。',
    controls: [num('b', '一次項係數 b', -6, 6, -3), num('c', '常數項 c', -6, 6, 2), num('q', '分界 q', -5, 5, 1)],
    compute(s) {const delta = s.b ** 2 - 4 * s.c, roots = delta < -EPS ? [] : Math.abs(delta) <= EPS ? [-s.b / 2] : [(-s.b - Math.sqrt(delta)) / 2, (-s.b + Math.sqrt(delta)) / 2]; const left = roots.filter(x => x < s.q - EPS).length, right = roots.filter(x => x > s.q + EPS).length; return model({delta, roots, left, right}, [`Δ=b²−4c ≈ ${F(delta)}；相異實根 ${roots.length} 個`, `根 ≈ ${roots.map(F).join('、') || '無'}；q 左側 ${left}、右側 ${right}、分界上 ${roots.length - left - right}`, '判讀順序：實根存在性 → 分界 → 嚴格／含等號'], graph([curve(x => x * x + s.b * x + s.c)], [-8, 8], [-12, 18], {points: roots.map(x => P(x, 0, F(x))), lines: [L(P(s.q, -12), P(s.q, 18), C[1], true)]}));}
  });
  add({id: 'vieta-product-locus', short: '根和固定與根積', title: '韋達定理：固定根和時的根積上界', tag: '代數與不等式', course: 'common',
    examSignal: '已知兩根和，將根寫成 S/2±t；根積立刻變成 S²/4−t²。', prompt: '移動兩根的半距離 t，觀察乘積何時最大。', trap: '兩根相等是最大根積的等號條件；根積下界在未限制根時不存在。', challenge: '兩實數和為 6，乘積最大多少？何時取到？', challengeAnswer: 'αβ=9−t²≤9，α=β=3 時取到 9。',
    controls: [num('S', '兩根和 S', -8, 8, 6), num('t', '半距離 t', 0, 6, 2)],
    compute(s) {const a = s.S / 2 - s.t, b = s.S / 2 + s.t, product = a * b, maximum = s.S * s.S / 4; return model({a, b, product, maximum}, ['α=S/2−t，β=S/2+t；α+β=S', `αβ=S²/4−t² ≈ ${F(product)}，上界 S²/4 ≈ ${F(maximum)}`, `對應方程 x²−Sx+αβ=0；根 ≈ ${F(a)}、${F(b)}`], graph([curve(t => maximum - t * t)], [-6, 6], [-40, 20], {points: [P(s.t, product, '目前根積'), P(0, maximum, '最大值', C[1])], note: '橫軸為半距離 t，縱軸為根積；t=0 對應重根。'}));}
  });
  add({id: 'quadratic-sign-intervals', short: '二次不等式符號', title: '二次不等式：根、開口與正負區間', tag: '代數與不等式', course: 'common',
    examSignal: '先排列實根，再由最高次係數決定最右區間正負；重根不變號。', prompt: '切換開口方向與兩根位置，觀察測試點 q 的函數符號。', trap: '兩根重合時只有接觸，不能畫成正負交替。嚴格不等式要排除零點。', challenge: '求 (x−1)(x−3)≤0 的解集。', challengeAnswer: '兩根為 1、3，開口向上，解集為閉區間 [1,3]。',
    controls: [num('a', '係數 a', -3, 3, 1), num('r', '第一根 r', -4, 4, -1), num('t', '第二根 t', -4, 4, 2), num('q', '測試點 q', -5, 5, 0)],
    compute(s) {const roots = [...new Set([s.r, s.t])].sort((a, b) => a - b), value = s.a * (s.q - s.r) * (s.q - s.t), sign = Math.abs(value) < EPS ? '零' : value > 0 ? '正' : '負'; return model({roots, value, sign}, ['f(x)=a(x−r)(x−t)', `f(q) ≈ ${F(value)}，符號為${sign}`, s.a === 0 ? 'a=0：恆等於 0，已退化成零函數。' : s.r === s.t ? '重根兩側不變號；除根以外符號與 a 相同。' : `兩相異根 ≈ ${roots.map(F).join('、')}；根外與 a 同號，根內反號。`], graph([curve(x => s.a * (x - s.r) * (x - s.t))], [-6, 6], [-15, 15], {points: [P(s.q, value, 'q', C[1]), ...roots.map(x => P(x, 0, F(x)))]}));}
  });
  add({id: 'rational-sign-chart', short: '分式不等式與禁點', title: '分式不等式：零點、分母零點與約分禁點', tag: '代數與不等式', course: 'common',
    examSignal: '把分子與分母的零點放到同一條數線；即使約分，原分母的禁點仍須保留。', prompt: '令分子根與分母根相同，觀察漸近線變成可去不連續點。', trap: '不可在不知道分母正負時直接交叉相乘；分母為零永不屬於解集。', challenge: '(x−1)(x−3)/(x−1)≥0 的解集？', challengeAnswer: '定義域 x≠1；約分後 x−3≥0，解集 [3,∞)。原式在 x=1 仍無定義。',
    controls: [num('a', '分子根 a', -4, 4, -2), num('b', '分子根 b', -4, 4, 2), num('c', '分母零點 c', -4, 4, 1), num('q', '測試點 q', -5, 5, 0)],
    compute(s) {const f = x => x === s.c ? NaN : (x - s.a) * (x - s.b) / (x - s.c), value = f(s.q), removable = s.a === s.c || s.b === s.c, limit = removable ? s.c - (s.a === s.c ? s.b : s.a) : null; return model({value: Number.isFinite(value) ? value : null, removable, limit}, ['f(x)=(x−a)(x−b)/(x−c)，定義域 x≠c', Number.isFinite(value) ? `f(q) ≈ ${F(value)}；${Math.abs(value) < EPS ? '零點' : value > 0 ? '正區間' : '負區間'}` : 'q=c：原式無定義。', removable ? `可去不連續點；極限 ≈ ${F(limit)}，但不能補回定義域。` : 'c 為垂直漸近線；跨越禁點須另判正負。'], graph([curve(f, C[0], undefined, [s.c])], [-6, 6], [-12, 12], {lines: removable ? [] : [L(P(s.c, -12), P(s.c, 12), C[4], true)], points: removable ? [P(s.c, limit, '禁點', C[4], true)] : []}));}
  });
  add({id: 'absolute-distance-sum', short: '兩點距離和與平台', title: '絕對值方程：數線上兩點的距離和', tag: '代數與不等式', course: 'common',
    examSignal: '把 |x−a|+|x−b| 解讀為距離和。a、b 之間形成平台，最小值為 |a−b|。', prompt: '上下移動 y=k，觀察無解、整段解或兩個解。', trap: '最小值對應的可能是一整段，不一定只有一個頂點。a=b 時平台退化為一點。', challenge: '|x−1|+|x−5|=4 有哪些解？', challengeAnswer: '1≤x≤5 的每一點都符合，解集為 [1,5]。',
    controls: [num('a', '定點 a', -4, 4, -2), num('b', '定點 b', -4, 4, 2), num('k', '距離和 k', 0, 12, 4)],
    compute(s) {const lo = Math.min(s.a, s.b), hi = Math.max(s.a, s.b), minimum = hi - lo; const kind = s.k < minimum - EPS ? 'none' : Math.abs(s.k - minimum) <= EPS ? lo === hi ? 'point' : 'interval' : 'two'; const solutions = kind === 'two' ? [(lo + hi - s.k) / 2, (lo + hi + s.k) / 2] : kind === 'none' ? [] : [lo, hi]; const answer = kind === 'none' ? '無解' : kind === 'interval' ? `整段 [${F(lo)},${F(hi)}]` : kind === 'point' ? `唯一解 ${F(lo)}` : `兩解 ≈ ${solutions.map(F).join('、')}`; return model({minimum, kind, solutions}, [`最小距離和 |a−b| ≈ ${F(minimum)}`, `方程解：${answer}`, '區間內：距離和固定；區間外：移動 1 單位，距離和改變 2。'], graph([curve(x => Math.abs(x - s.a) + Math.abs(x - s.b)), curve(() => s.k, C[1])], [-9, 9], [-1, 18], {points: solutions.map(x => P(x, s.k, F(x), C[2]))}));}
  });
  add({id: 'reciprocal-minimum', short: 'x+k/x 的最小值', title: '算幾不等式：正數與倒數的平衡', tag: '代數與不等式', course: 'common',
    examSignal: '正項乘積固定，先看算幾不等式；等號要求 x=k/x。', prompt: '調整 k，再移動 x 比較兩項大小與總和。', trap: 'x>0、k>0 是套用算幾的前提；漏寫等號條件不能完整說明最小值。', challenge: 'x>0 時，x+8/x 的最小值與等號條件？', challengeAnswer: '最小值 2√8=4√2；x=√8=2√2 時取到。',
    controls: [num('k', '常數 k', .1, 16, 8), num('x', '正數 x', .1, 10, 2)],
    compute(s) {const optimum = Math.sqrt(s.k), minimum = 2 * optimum, value = s.x + s.k / s.x; return model({optimum, minimum, value}, ['x+k/x ≥ 2√k（x>0，k>0）', `等號 x=√k ≈ ${F(optimum)}；下界 2√k ≈ ${F(minimum)}`, `目前總和 ≈ ${F(value)}；兩項 ≈ ${F(s.x)}、${F(s.k / s.x)}`], graph([curve(x => x + s.k / x, C[0], [.05, 11]), curve(() => minimum, C[2])], [0, 11], [0, 25], {points: [P(s.x, value, '目前'), P(optimum, minimum, '最小值', C[1])]}));}
  });
  add({id: 'logarithmic-equation-domain', short: '對數方程與定義域', title: '對數方程：底數、平移與指數還原', tag: '指數與對數', course: 'common',
    examSignal: 'log_b(x−h)=k 可還原成 x−h=b^k，同時檢查底數與真數。', prompt: '比較底數大於 1 與介於 0、1 時的單調方向。', trap: 'b 必須大於 0 且不等於 1，真數 x−h 必須為正。', challenge: 'log₂(x−1)=3，求 x。', challengeAnswer: 'x−1=2³=8，所以 x=9；9>1 符合定義域。',
    controls: [num('b', '底數 b', .2, 4, 2), num('h', '水平位移 h', -3, 3, 1), num('k', '目標 k', -2, 3, 2)],
    compute(s) {if (s.b === 1) return errorModel('b=1 不可作為對數底數，請改變底數。'); const root = s.h + s.b ** s.k, span = Math.max(8, 1.3 * (root - s.h)); return model({valid: true, root}, ['log_b(x−h)=k ⇔ x=h+b^k', `解 x ≈ ${F(root)}；定義域 x>h`, s.b > 1 ? 'b>1，對數函數嚴格遞增。' : '0<b<1，對數函數嚴格遞減。'], graph([curve(x => x > s.h ? Math.log(x - s.h) / Math.log(s.b) : NaN), curve(() => s.k, C[1])], [s.h - .5, s.h + span], [-5, 5], {points: [P(root, s.k, '交點', C[2])]}));}
  });
  add({id: 'exponential-half-life', short: '半衰期與指數衰減', title: '指數模型：半衰期與剩餘比例', tag: '指數與對數', course: 'common',
    examSignal: '每經過同一段時間就乘上固定比例，是指數變化。半衰期是指數中的時間尺度。', prompt: '比較不同半衰期，觀察同一時間的剩餘量。', trap: '每次減少一半指剩餘量的一半，不是每次減去初始量的一半。', challenge: '初始 80 單位、半衰期 3 小時，9 小時後剩多少？', challengeAnswer: '經過 3 個半衰期，80×(1/2)³=10 單位。',
    controls: [num('N', '初始量 N₀', 1, 100, 80), num('H', '半衰期 H', .5, 10, 3), num('t', '經過時間 t', 0, 30, 9)],
    compute(s) {const ratio = 2 ** (-s.t / s.H), remaining = s.N * ratio; return model({ratio, remaining, halfLives: s.t / s.H}, ['N(t)=N₀·2^(−t/H)', `半衰期數 t/H ≈ ${F(s.t / s.H)}；剩餘量 ≈ ${F(remaining)}`, `剩餘比例 ≈ ${F(ratio)}；經過 H 時必減為原來的一半。`], graph([curve(t => s.N * 2 ** (-t / s.H))], [0, 30], [0, s.N * 1.15], {points: [P(s.t, remaining, '目前', C[1])], note: '橫軸時間，縱軸剩餘量；本實驗只討論數學模型。'}));}
  });

  // 09–14: trigonometry, the ambiguous SSA case and measurement.
  add({id: 'sine-law-ssa', short: 'SSA 的零、一、兩解', title: '正弦定理：SSA 三角形的多解情形', tag: '三角函數與測量', course: 'common',
    examSignal: '已知兩邊與非夾角，先畫圓與射線，交點數就是三角形數；不能只取 arcsin 的主值。', prompt: 'C 固定在 AC=b 的射線上，以 C 為圓心、a 為半徑，找正 x 軸上的 B。', trap: 'B 必須在正射線，且三角形不可退化；鈍角題不會有兩個有效解。', challenge: 'A=30°、a=5、b=8，有幾個三角形？第三邊 c？', challengeAnswer: '高 b sin A=4<a=5<b=8，有兩解；c=8 cos30°±√(25−16)=4√3±3。',
    controls: [num('a', '對邊 a=BC', .5, 10, 5), num('b', '鄰邊 b=AC', .5, 10, 8), angle('A', '角 A', 5, 175, 30)],
    compute(s) {const x = s.b * Math.cos(s.A * D), h = s.b * Math.sin(s.A * D), delta = s.a * s.a - h * h; const roots = delta < -EPS ? [] : [...new Set([x - Math.sqrt(Math.abs(delta) <= EPS ? 0 : delta), x + Math.sqrt(Math.abs(delta) <= EPS ? 0 : delta)])].filter(c => c > EPS); const A = P(0, 0, 'A'), Q = P(x, h, 'C'), ps = roots.map((c, i) => P(c, 0, 'B' + (i + 1), C[i])); return model({count: roots.length, sides: roots, altitude: h}, [`高 b sin A ≈ ${F(h)}；有效三角形 ${roots.length} 個`, 'c=b cos A ± √(a²−b²sin²A)，只保留 c>0', roots.length ? `第三邊 c ≈ ${roots.map(F).join('、')}` : '圓與正射線無有效交點。'], geometry([A, Q, ...ps], {circles: [{x, y: h, r: s.a, color: '#18a99970'}], lines: [L(A, Q), ...ps.flatMap((p, i) => [L(A, p, C[i]), L(p, Q, C[i])])]}));}
  });
  add({id: 'triangle-included-area', short: '夾角與三角形面積', title: '三角形面積：固定兩邊時的最大值', tag: '三角函數與測量', course: 'common',
    examSignal: '兩邊與夾角用 K=ab sin C/2；固定兩邊時，正弦的上界決定面積上界。', prompt: '旋轉一邊，觀察銳角與鈍角能否產生同樣面積。', trap: 'sin C=sin(180°−C)，相同面積不代表同一個三角形。', challenge: '兩邊長為 3、4，最大面積是多少？', challengeAnswer: 'K≤3×4/2=6，夾角為 90° 時達到最大值。',
    controls: [num('a', '第一邊 a', .5, 8, 3), num('b', '第二邊 b', .5, 8, 4), angle('C', '夾角 C', 0, 180, 60)],
    compute(s) {const points = [P(0, 0, 'O'), P(s.a, 0, 'A'), P(s.b * Math.cos(s.C * D), s.b * Math.sin(s.C * D), 'B')], area = s.C === 0 || s.C === 180 ? 0 : s.a * s.b * Math.sin(s.C * D) / 2, maximum = s.a * s.b / 2; return model({area, maximum}, ['K=(1/2)ab sin C ≤ ab/2', `面積 ≈ ${F(area)}；最大值 ≈ ${F(maximum)}`, 'C=90° 達最大；C=0° 或 180° 時退化、面積為 0。'], geometry(points, {polygons: [{points}]}));}
  });
  add({id: 'trig-double-angle', short: '二倍角與單位圓', title: '二倍角公式：一個角轉成兩倍角', tag: '三角函數與測量', course: 'common',
    examSignal: '看到 sin2θ 或 cos2θ，將角度加倍轉成單位圓上的新點，再比較坐標恆等式。', prompt: '藍點對應 θ，橘點對應 2θ；觀察轉速與符號變化。', trap: 'sin2θ 不是 2sinθ；cos2θ 的三種形式須依已知條件選擇。', challenge: 'θ=30° 時，求 sin2θ 與 cos2θ。', challengeAnswer: 'sin60°=√3/2；cos60°=1/2。',
    controls: [angle('theta', '角 θ', -180, 360, 30)],
    compute(s) {const t = s.theta * D, sin = Math.sin(2 * t), cos = Math.cos(2 * t), points = [P(0, 0, 'O'), P(Math.cos(t), Math.sin(t), 'θ'), P(cos, sin, '2θ', C[1])]; return model({sin, cos, sinIdentity: 2 * Math.sin(t) * Math.cos(t), cosIdentity: 1 - 2 * sq(Math.sin(t))}, [`sin2θ=2sinθ cosθ ≈ ${F(sin)}`, `cos2θ=cos²θ−sin²θ=1−2sin²θ ≈ ${F(cos)}`, 'θ 轉一圈時，2θ 轉兩圈。'], geometry(points, {circles: [{x: 0, y: 0, r: 1}], lines: [L(points[0], points[1]), L(points[0], points[2], C[1])]}));}
  });
  add({id: 'trig-half-angle-sign', short: '半角公式與正負號', title: '半角公式：根號前的符號從哪裡來', tag: '三角函數與測量', course: 'common',
    examSignal: '半角平方可由二倍角推出；開根號後的正負，必須由 θ/2 的象限決定。', prompt: '把 θ 拉過 360°，比較半角正弦是否仍為正。', trap: '√((1−cosθ)/2) 等於 |sin(θ/2)|，不一定等於 sin(θ/2)。', challenge: 'θ=450° 時，sin(θ/2) 等於多少？', challengeAnswer: 'θ/2=225° 在第三象限，sin225°=−√2/2。',
    controls: [angle('theta', '原角 θ', 0, 720, 450)],
    compute(s) {const t = s.theta * D / 2, sin = Math.sin(t), cos = Math.cos(t), magnitude = Math.sqrt(Math.max(0, (1 - Math.cos(2 * t)) / 2)); const points = [P(0, 0, 'O'), P(cos, sin, 'θ/2', C[1])]; return model({sin, cos, magnitude}, [`半角 θ/2 ≈ ${F(s.theta / 2)}°`, `sin²(θ/2)=(1−cosθ)/2；根號值 ≈ ${F(magnitude)}`, `sin(θ/2) ≈ ${F(sin)}；cos(θ/2) ≈ ${F(cos)}`], geometry(points, {circles: [{x: 0, y: 0, r: 1}], lines: [L(points[0], points[1], C[1])]}));}
  });
  add({id: 'trig-addition-rotation', short: '和差角與旋轉', title: '和差角公式：坐標旋轉的乘加結構', tag: '三角函數與測量', course: 'common',
    examSignal: '把 α+β 視為再旋轉 β；正弦混合 sin、cos，餘弦則出現同類乘積相減。', prompt: '切換加角與減角，比較單位圓上終點。', trap: 'cos(α+β) 的中間是減號；sin(α+β) 不能拆成兩個正弦相加。', challenge: '利用和角公式求 sin75°。', challengeAnswer: 'sin(45°+30°)=(√6+√2)/4。',
    controls: [angle('a', '角 α', -180, 180, 45), angle('b', '角 β', -180, 180, 30), choose('op', '和／差', [['plus', 'α+β'], ['minus', 'α−β']])],
    compute(s) {const sign = s.op === 'plus' ? 1 : -1, a = s.a * D, b = s.b * D * sign, total = a + b, sin = Math.sin(total), cos = Math.cos(total), points = [P(0, 0, 'O'), P(Math.cos(a), Math.sin(a), 'α'), P(cos, sin, 'α±β', C[1])]; return model({sin, cos, sinExpanded: Math.sin(a) * Math.cos(b) + Math.cos(a) * Math.sin(b)}, [`合角 ≈ ${F(s.a + sign * s.b)}°`, `sin(α±β)=sinα cosβ ± cosα sinβ ≈ ${F(sin)}`, `cos(α±β)=cosα cosβ ∓ sinα sinβ ≈ ${F(cos)}`], geometry(points, {circles: [{x: 0, y: 0, r: 1}], lines: [L(points[0], points[1]), L(points[0], points[2], C[1])]}));}
  });
  add({id: 'two-station-height', short: '兩測站求高度', title: '三角測量：同側兩測站與建物高度', tag: '三角函數與測量', course: 'common',
    examSignal: '同側遠近兩站看到同一頂點，先把未知水平距離設為 x；兩個正切式共用高度。', prompt: '兩站相距 d，遠站仰角 α、近站仰角 β。假設地面水平且視線起點同高。', trap: '此配置必須 0<α<β<90°；反過來的角度不能硬套同一張圖。', challenge: 'd=10、α=30°、β=60°，求高度。', challengeAnswer: 'H=d tanα tanβ/(tanβ−tanα)=5√3。近站到塔底距離為 5。',
    controls: [num('d', '兩站距離 d', 1, 30, 10), angle('a', '遠站仰角 α', 5, 80, 30), angle('b', '近站仰角 β', 5, 80, 60)],
    compute(s) {if (s.b <= s.a) return errorModel('同側遠近站模型要求 β>α，請讓近站仰角更大。'); const ta = Math.tan(s.a * D), tb = Math.tan(s.b * D), x = s.d * ta / (tb - ta), height = x * tb, points = [P(-s.d, 0, '遠站'), P(0, 0, '近站'), P(x, 0, '塔底'), P(x, height, '塔頂')]; return model({valid: true, x, height}, ['H=(x+d)tanα=x tanβ', `x=d tanα/(tanβ−tanα) ≈ ${F(x)}`, `H=d tanα tanβ/(tanβ−tanα) ≈ ${F(height)}`], geometry(points, {lines: [L(points[0], points[3]), L(points[1], points[3], C[1]), L(points[2], points[3], C[2])]}));}
  });

  // 15–22: plane geometry and equality cases.
  const triangleControls = () => [num('b', '左底長 b', .5, 6, 3), num('c', '右底長 c', .5, 6, 4), num('h', '高度 h', .5, 6, 3)];
  const triangle = s => [P(0, s.h, 'A'), P(-s.b, 0, 'B'), P(s.c, 0, 'C')];
  add({id: 'triangle-angle-bisector', short: '角平分線分邊比', title: '角平分線定理：把角度條件轉成邊長比例', tag: '平面幾何', course: 'common',
    examSignal: '角平分線落在對邊，立刻寫出 BD/DC=AB/AC，再用內分點公式求落點。', prompt: '調整兩側底長和高度，觀察 D 何時與中點重合。', trap: '角平分線通常不是中線，也不一定垂直於底邊。', challenge: 'AB=3、AC=6、BC=6，角平分線交 BC 於 D，求 BD。', challengeAnswer: 'BD:DC=AB:AC=1:2，而 BD+DC=6，所以 BD=2。',
    controls: triangleControls(),
    compute(s) {const points = triangle(s), ab = dist(points[0], points[1]), ac = dist(points[0], points[2]), bd = (s.b + s.c) * ab / (ab + ac), dc = s.b + s.c - bd, Q = P(-s.b + bd, 0, 'D', C[1]); return model({ab, ac, bd, dc, ratio: ab / ac}, [`BD/DC=AB/AC ≈ ${F(ab / ac)}`, `BD ≈ ${F(bd)}；DC ≈ ${F(dc)}`, 'D=(AC·B+AB·C)/(AB+AC)，相鄰邊決定分點權重。'], geometry([...points, Q], {polygons: [{points}], lines: [L(points[0], Q, C[1])]}));}
  });
  add({id: 'triangle-median-identity', short: '中線定理', title: '中線定理：兩邊平方和與中線長', tag: '平面幾何', course: 'common',
    examSignal: '對邊中點出現時，優先看 AB²+AC²=2(AM²+BM²)，避免多次餘弦定理。', prompt: '移動三角形形狀，比較恆等式左右兩側。', trap: 'BM 是半個底邊；若直接代 BC，係數會錯四倍。', challenge: 'AB=5、AC=7、BC=8，求中線 AM。', challengeAnswer: 'AM²=(2×25+2×49−64)/4=21，所以 AM=√21。',
    controls: triangleControls(),
    compute(s) {const points = triangle(s), M = P((s.c - s.b) / 2, 0, 'M', C[1]), median = dist(points[0], M), lhs = sq(dist(points[0], points[1])) + sq(dist(points[0], points[2])), rhs = 2 * (median * median + sq((s.b + s.c) / 2)); return model({median, lhs, rhs}, ['AB²+AC²=2(AM²+BM²)', `左側 ≈ ${F(lhs)}；右側 ≈ ${F(rhs)}`, `AM=(1/2)√(2AB²+2AC²−BC²) ≈ ${F(median)}`], geometry([...points, M], {polygons: [{points}], lines: [L(points[0], M, C[1])]}));}
  });
  add({id: 'triangle-three-centers', short: '重心、內心與外心', title: '三角形的三個中心：平均、等距與加權', tag: '平面幾何', course: 'common',
    examSignal: '重心是坐標平均；內心到三邊等距；外心到三頂點等距。先辨識哪一種等距。', prompt: '觀察鈍角三角形的外心可在外部，而內心與重心仍在內部。', trap: '三種中心只有在正三角形時全重合；不可把三者的坐標公式混用。', challenge: 'A=(0,3)、B=(−3,0)、C=(3,0)，重心與外心各在哪裡？', challengeAnswer: '重心 G=(0,1)；因 ∠A 為直角，外心是斜邊中點 O=(0,0)。',
    controls: triangleControls(),
    compute(s) {const points = triangle(s), a = s.b + s.c, b = dist(points[0], points[2]), c = dist(points[0], points[1]), G = P((s.c - s.b) / 3, s.h / 3, 'G', C[0]), I = P((-b * s.b + c * s.c) / (a + b + c), a * s.h / (a + b + c), 'I', C[2]), O = P((s.c - s.b) / 2, (s.h * s.h - s.b * s.c) / (2 * s.h), 'O', C[1]), radius = dist(O, points[0]); return model({centroid: G, incenter: I, circumcenter: O, radius, inradius: I.y}, [`重心 G ≈ (${F(G.x)},${F(G.y)})`, `內心 I ≈ (${F(I.x)},${F(I.y)})；內切圓半徑 ≈ ${F(I.y)}`, `外心 O ≈ (${F(O.x)},${F(O.y)})；外接圓半徑 ≈ ${F(radius)}`], geometry([...points, G, I, O], {polygons: [{points}], circles: [{x: O.x, y: O.y, r: radius, color: C[1]}, {x: I.x, y: I.y, r: I.y, color: C[2]}]}));}
  });
  add({id: 'circle-point-power', short: '圓冪與切割線', title: '圓冪定理：割線乘積與切線長', tag: '平面幾何', course: 'common',
    examSignal: '從同一點向圓引割線，兩個有向交距的乘積固定為 OP²−r²。', prompt: '旋轉割線，檢查交距乘積是否保持不變；圓內點的圓冪為負。', trap: '圓內點的兩交距方向相反，不能把有向乘積與正長度乘積混淆。', challenge: 'OP=5、r=3，圓外點 P 到圓的切線長？', challengeAnswer: 'PT²=OP²−r²=25−9=16，因此 PT=4。',
    controls: [num('r', '圓半徑 r', .5, 5, 3), num('p', 'P 的 x 坐標', -8, 8, 5), angle('theta', '割線方向 θ', 0, 180, 20)],
    compute(s) {const u = Math.cos(s.theta * D), v = Math.sin(s.theta * D), power = s.p * s.p - s.r * s.r, discriminant = s.r * s.r - s.p * s.p * v * v, ts = discriminant < -EPS ? [] : [-s.p * u - Math.sqrt(Math.max(0, discriminant)), -s.p * u + Math.sqrt(Math.max(0, discriminant))], Q = P(s.p, 0, 'P', C[1]), hits = ts.map((t, i) => P(s.p + t * u, t * v, i ? 'B' : 'A')); return model({power, distances: ts, product: ts.length ? ts[0] * ts[1] : null, tangent: power >= 0 ? Math.sqrt(power) : null}, [`圓冪 OP²−r² ≈ ${F(power)}`, ts.length ? `有向 PA·PB ≈ ${F(ts[0] * ts[1])}；PA、PB ≈ ${ts.map(F).join('、')}` : '目前方向沒有割到圓；圓冪仍由 OP²−r² 定義。', power >= 0 ? `切線長 √(OP²−r²) ≈ ${F(Math.sqrt(power))}` : 'P 在圓內，沒有實切線。'], geometry([Q, ...hits], {circles: [{x: 0, y: 0, r: s.r}], lines: hits.map(p => L(Q, p, C[1]))}));}
  });
  add({id: 'circle-common-tangents', short: '兩圓公切線', title: '兩圓公切線：位置關係、條數與線段長', tag: '平面幾何', course: 'common',
    examSignal: '圓心距與 R+r、|R−r| 比較，先決定位置關係，再用直角三角形求公切線段長。', prompt: '移動兩圓距離，觀察 4、3、2、1、0 條公切線的轉換。', trap: '外公切線用半徑差，內公切線用半徑和；重合圓有無限多條。', challenge: '兩圓半徑 3、1，圓心距 5，外公切線段長為何？', challengeAnswer: '√(5²−(3−1)²)=√21；內公切線段長則為 √(25−16)=3。',
    controls: [num('R', '半徑 R', .5, 5, 3), num('r', '半徑 r', .5, 5, 1), num('d', '圓心距 d', 0, 12, 5)],
    compute(s) {const diff = Math.abs(s.R - s.r), total = s.R + s.r, coincident = s.d < EPS && diff < EPS; const count = coincident ? null : s.d < diff - EPS ? 0 : Math.abs(s.d - diff) < EPS ? 1 : s.d < total - EPS ? 2 : Math.abs(s.d - total) < EPS ? 3 : 4; const external = s.d >= diff - EPS && !coincident ? Math.sqrt(Math.max(0, s.d ** 2 - diff ** 2)) : null, internal = s.d >= total - EPS ? Math.sqrt(Math.max(0, s.d ** 2 - total ** 2)) : null, lines = [];
      if (s.d > EPS) for (const mode of [1, -1]) {const nx = (s.R - mode * s.r) / s.d; if (Math.abs(nx) > 1 + EPS) continue; const ny = Math.sqrt(Math.max(0, 1 - nx * nx)); for (const sign of ny < EPS ? [1] : [-1, 1]) lines.push(L(P(s.R * nx, s.R * ny * sign), P(s.d + mode * s.r * nx, mode * s.r * ny * sign), mode === 1 ? C[1] : C[2]));}
      return model({count, external, internal, coincident}, [`公切線：${coincident ? '重合圓，無限多條' : count + ' 條'}`, external === null ? '外公切線段長不適用。' : `外公切線段 √(d²−(R−r)²) ≈ ${F(external)}`, internal === null ? '沒有內公切線。' : `內公切線段 √(d²−(R+r)²) ≈ ${F(internal)}`], geometry([P(0, 0, 'O₁'), P(s.d, 0, 'O₂')], {circles: [{x: 0, y: 0, r: s.R}, {x: s.d, y: 0, r: s.r, color: C[3]}], lines, note: '橘色：外公切線段；綠色：內公切線段。相切時線段可能退化為點。'}));}
  });
  add({id: 'circle-inscribed-angle', short: '圓周角與所對弧', title: '圓周角定理：同弦兩側的補角', tag: '平面幾何', course: 'common',
    examSignal: '圓周角對的是不含角頂點的弧；移過弦的另一側時，所對弧改成優弧。', prompt: '移動圓周上的 A，比較 ∠BAC 與固定小弧 BC 的關係。', trap: '不能永遠把小弧角除以 2；角頂點落在小弧上時應使用優弧。', challenge: '小弧 BC 為 100°，A 在另一側優弧上，∠BAC 為何？', challengeAnswer: '角所對弧為 100°，所以 ∠BAC=50°。若 A 在小弧內則是 130°。',
    controls: [angle('theta', '小弧 BC 的角度', 20, 160, 100), angle('phi', 'A 的位置角', 0, 360, 180)],
    compute(s) {const A = P(3 * Math.cos(s.phi * D), 3 * Math.sin(s.phi * D), 'A', C[1]), B = P(3 * Math.cos(-s.theta * D / 2), 3 * Math.sin(-s.theta * D / 2), 'B'), Q = P(B.x, -B.y, 'C'), valid = dist(A, B) > EPS && dist(A, Q) > EPS, phi = s.phi % 360, onMinor = phi < s.theta / 2 || phi > 360 - s.theta / 2, value = valid ? (onMinor ? (360 - s.theta) / 2 : s.theta / 2) : null; return model({valid, value, onMinor}, [valid ? `圓周角 ∠BAC=${F(value)}°` : 'A 與弦端點重合，圓周角未定義。', onMinor ? 'A 在小弧內，角所對的是優弧 BC。' : 'A 在優弧內，角所對的是小弧 BC。', '同弦同側的圓周角相等；同弦異側的圓周角互補。'], geometry([A, B, Q], {circles: [{x: 0, y: 0, r: 3}], lines: [L(A, B, C[1]), L(A, Q, C[1]), L(B, Q)]}));}
  });
  add({id: 'reflection-shortest-path', short: '反射與最短折線', title: '最短路徑：把折線反射成直線', tag: '平面幾何', course: 'common',
    examSignal: '路徑要碰到一直線再去另一點，將一點對該直線反射；折線長變成直線長的下界。', prompt: 'P 可在 x 軸移動。比較 AP+PB 與反射所得的最短距離。', trap: '最短點通常不是水平中點，兩點高度不同時會偏向較低的一側。', challenge: 'A=(−3,2)、B=(3,4)，經 x 軸的最短折線長？', challengeAnswer: '反射 A′=(−3,−2)，A′B=√(6²+6²)=6√2；交 x 軸於 P=(−1,0)。',
    controls: [num('a', 'A 高度', .5, 6, 2), num('b', 'B 高度', .5, 6, 4), num('q', '落點 P 的 x', -6, 6, 0)],
    compute(s) {const A = P(-3, s.a, 'A'), B = P(3, s.b, 'B'), R = P(-3, -s.a, 'A′', C[2]), Q = P(s.q, 0, 'P', C[1]), optimum = -3 + 6 * s.a / (s.a + s.b), shortest = Math.hypot(6, s.a + s.b), current = dist(A, Q) + dist(Q, B); return model({optimum, shortest, current}, ['AP+PB=A′P+PB ≥ A′B', `最短長 √(36+(hA+hB)²) ≈ ${F(shortest)}`, `最短點 x ≈ ${F(optimum)}；目前路徑 ≈ ${F(current)}`], geometry([A, B, R, Q, P(optimum, 0, '最短點', C[2])], {lines: [L(A, Q, C[1]), L(Q, B, C[1]), L(R, B, C[2], true)]}));}
  });
  add({id: 'similarity-length-area', short: '相似比、周長比、面積比', title: '相似形縮放：長度一次方、面積平方', tag: '平面幾何', course: 'common',
    examSignal: '相似比 k 是長度比；每個方向都縮放 k，面積因此乘上 k²。', prompt: '同時比較原三角形與縮放三角形的周長、面積。', trap: '面積比不能直接當成邊長比，需先開平方根。', challenge: '兩相似三角形面積比 9:25，周長比為何？', challengeAnswer: '周長比等於長度比 √(9/25)=3/5，因此為 3:5。',
    controls: [num('b', '底 b', 1, 5, 3), num('h', '高 h', 1, 5, 4), num('k', '相似比 k', .2, 3, 1.5)],
    compute(s) {const original = [P(0, 0), P(s.b, 0), P(0, s.h)], scaled = original.map(p => P(p.x * s.k, p.y * s.k)), perimeter = s.b + s.h + Math.hypot(s.b, s.h), area = s.b * s.h / 2; return model({perimeter, area, scaledPerimeter: perimeter * s.k, scaledArea: area * s.k * s.k}, [`周長比 = k ≈ ${F(s.k)}；面積比 = k² ≈ ${F(s.k * s.k)}`, `周長 ≈ ${F(perimeter)} → ${F(perimeter * s.k)}`, `面積 ≈ ${F(area)} → ${F(area * s.k * s.k)}`], geometry([...original, ...scaled], {polygons: [{points: scaled, color: C[1], fill: '#e28b1820'}, {points: original}], note: '藍色為原圖，橘色為按相似比 k 縮放的圖形。'}));}
  });

  // 23–26: three-dimensional geometry (oblique views are explicitly labeled).
  add({id: 'space-point-line-projection', short: '空間點到直線', title: '空間點到直線：投影足與垂直距離', tag: '空間向量', course: 'A',
    examSignal: '點到直線的距離，就是去掉沿方向向量投影後的垂直分量長。', prompt: '直線通過原點，方向 u=(1,a,b)。移動空間點 P，觀察投影足 H。', trap: '投影係數要除以 u·u，不能只除以 |u|。斜投影畫面不能直接量角度。', challenge: 'P=(1,2,3)，直線方向 (1,0,0)，求投影足與距離。', challengeAnswer: 'H=(1,0,0)；PH=√(2²+3²)=√13。',
    controls: [num('x', 'P 的 x', -4, 4, 1), num('y', 'P 的 y', -4, 4, 2), num('z', 'P 的 z', -4, 4, 3), num('a', '方向分量 a', -3, 3, 0), num('b', '方向分量 b', -3, 3, 0)],
    compute(s) {const p = [s.x, s.y, s.z], u = [1, s.a, s.b], t = dot(p, u) / dot(u, u), foot = u.map(x => t * x), residual = p.map((x, i) => x - foot[i]), distance = length(residual), O = project([0, 0, 0]), Q = {...project(p), label: 'P', color: C[1]}, H = {...project(foot), label: 'H', color: C[2]}, lo = project(u.map(x => -3 * x)), hi = project(u.map(x => 3 * x)); return model({foot, distance, perpendicular: dot(residual, u)}, ['t=(P·u)/(u·u)，H=t u', `H ≈ ${vec(foot)}；PH ≈ ${F(distance)}`, `(P−H)·u ≈ ${F(dot(residual, u))}（垂直核對）`], geometry([O, Q, H, lo, hi], {lines: [L(lo, hi), L(Q, H, C[1]), L(O, Q, C[2], true)], note: '空間斜投影示意；直角與長度以三維坐標公式判讀。'}));}
  });
  add({id: 'sphere-plane-section-radius', short: '球的平面截圓', title: '球與平面：截圓半徑與相切條件', tag: '空間幾何', course: 'A',
    examSignal: '球心、截圓圓心與截圓上一點構成直角三角形，ρ²=R²−d²。', prompt: '把水平截面由球心移向外側，比較截面面積。', trap: '|d|>R 時是空集合，不可把負數根號當成截圓半徑。', challenge: '球半徑 5，平面離球心 3，截面面積為何？', challengeAnswer: '截圓半徑 √(25−9)=4，截面面積為 16π。',
    controls: [num('R', '球半徑 R', .5, 5, 5), num('d', '平面有向距離 d', -6, 6, 3)],
    compute(s) {const delta = s.R * s.R - s.d * s.d, kind = delta < -EPS ? 'empty' : Math.abs(delta) < EPS ? 'point' : 'circle', radius = kind === 'empty' ? null : Math.sqrt(Math.max(0, delta)), area = radius === null ? 0 : PI * radius * radius, points = [P(0, 0, 'O'), P(0, s.d, '截面中心', C[1])]; return model({kind, radius, area}, [`|d| 與 R：${kind === 'empty' ? '不相交' : kind === 'point' ? '相切於一點' : '交於圓'}`, radius === null ? '沒有實截圓。' : `ρ=√(R²−d²) ≈ ${F(radius)}`, `截面面積 ${kind === 'empty' ? '=0（空集合）' : 'π(R²−d²) ≈ ' + F(area)}`], geometry(points, {circles: [{x: 0, y: 0, r: s.R}], lines: [L(P(-s.R * 1.2, s.d), P(s.R * 1.2, s.d), C[1]), ...(radius === null ? [] : [L(P(-radius, s.d), P(radius, s.d), C[2])])], note: '畫面為通過球心的縱截面；綠色線段是截圓直徑。'}));}
  });
  add({id: 'tetrahedron-intercept-volume', short: '三軸截距四面體', title: '四面體體積：三軸截距與 1/6 因子', tag: '空間幾何', course: 'A',
    examSignal: '沿三個互相垂直軸截出的四面體，可直接用底面積乘高再除以 3。', prompt: '改變三個截距，觀察體積如何隨每一個長度成正比。', trap: '平行六面體是 abc，四面體是 abc/6，不能只除以 3。', challenge: '平面 x/2+y/3+z/4=1 與三坐標面圍成體積？', challengeAnswer: 'V=(1/3)×(2×3/2)×4=4。',
    controls: [num('a', 'x 軸截距 a', 0, 6, 2), num('b', 'y 軸截距 b', 0, 6, 3), num('c', 'z 軸截距 c', 0, 6, 4)],
    compute(s) {const vertices = [[0, 0, 0], [s.a, 0, 0], [0, s.b, 0], [0, 0, s.c]], points = vertices.map((v, i) => ({...project(v), label: ['O', 'A', 'B', 'C'][i]})), volume = s.a * s.b * s.c / 6; return model({volume, baseArea: s.a * s.b / 2}, ['底面積 ab/2；高 c', `V=(1/3)(ab/2)c=abc/6 ≈ ${F(volume)}`, volume === 0 ? '有截距為 0，四面體退化；截距式不可除以該零值。' : '斜面方程 x/a+y/b+z/c=1。'], geometry(points, {polygons: [{points: [points[0], points[1], points[2]]}, {points: [points[1], points[2], points[3]], fill: '#18a99920', color: C[2]}], lines: points.slice(0, 3).map(p => L(p, points[3], C[1])), note: '空間斜投影；三軸在原空間互相垂直。'}));}
  });
  add({id: 'space-vector-coplanarity', short: '三向量共面判斷', title: '向量共面：線性組合與三重積為零', tag: '空間向量', course: 'A',
    examSignal: '三向量共面可檢查行列式為 0；已知前兩向量不平行時，也可檢查第三向量能否線性組合。', prompt: '固定 u=(1,1,0)、v=(0,1,1)，移動 w 並比較到其張成平面的距離。', trap: '三重積為零表示共面，並不表示其中任兩向量平行。', challenge: 'w=(2,k,3) 與 u、v 共面，求 k。', challengeAnswer: '法向量 u×v=(1,−1,1)，2−k+3=0，所以 k=5，且 w=2u+3v。',
    controls: [num('x', 'w 的 x', -4, 4, 2), num('y', 'w 的 y', -6, 6, 5), num('z', 'w 的 z', -4, 4, 3)],
    compute(s) {const triple = s.x - s.y + s.z, distance = Math.abs(triple) / Math.sqrt(3), coplanar = Math.abs(triple) < EPS, points = [[0, 0, 0], [1, 1, 0], [1, 2, 1], [0, 1, 1]].map(project), W = {...project([s.x, s.y, s.z]), label: 'w', color: C[1]}; return model({triple, distance, coplanar}, ['u×v=(1,−1,1)，共面條件 x−y+z=0', `三重積 ≈ ${F(triple)}；${coplanar ? '共面' : '不共面'}`, `w 端點到平面距離 |x−y+z|/√3 ≈ ${F(distance)}`], geometry([...points, W], {polygons: [{points}], lines: [L(points[0], W, C[1])], note: '藍色平行四邊形只是張成平面的一部分；圖為斜投影。'}));}
  });

  // 27–30: sequences with exact identities and explicit convergence criteria.
  add({id: 'telescoping-fraction-series', short: '裂項相消級數', title: '裂項相消：有限和與極限尾項', tag: '數列與級數', course: 'common',
    examSignal: '分母是相鄰整數乘積，拆成 1/k−1/(k+1)，中間項大量相消。', prompt: '增加項數，觀察部分和距離 1 還差多少。', trap: '有限和永遠小於 1；寫出頭尾項才能避免漏掉最後的 −1/(n+1)。', challenge: '求 Σ[k=1..9] 1/(k(k+1))。', challengeAnswer: '裂項後只剩 1−1/10=9/10。',
    controls: [int('n', '項數 n', 1, 40, 9)],
    compute(s) {const values = Array.from({length: s.n}, (_, i) => (i + 1) / (i + 2)), exact = s.n + '/' + (s.n + 1), value = s.n / (s.n + 1); return model({value, exact, remainder: 1 / (s.n + 1)}, ['1/[k(k+1)]=1/k−1/(k+1)', `Sₙ=1−1/(n+1)=${exact} ≈ ${F(value)}`, `距離極限的差 1/(n+1)=1/${s.n + 1}`], series(values, 1, {curves: [curve(() => 1, C[1])], note: '橫軸項數，縱軸部分和；橘線是極限 1。'}));}
  });
  add({id: 'arithmetic-geometric-weighted-sum', short: '等差乘等比的和', title: '錯位相減：Σ k r^(k−1)', tag: '數列與級數', course: 'common',
    examSignal: '每項同時有 k 與 r 的次方，用乘 r 後錯位相減，降成等比級數。', prompt: '比較 r=1、|r|<1 與 r<0 的部分和變化。', trap: '通式分母 (1−r)² 在 r=1 不能用，須另算 n(n+1)/2。', challenge: '求 1+2/2+3/4+4/8。', challengeAnswer: '四項相加為 1+1+3/4+1/2=13/4。',
    controls: [num('r', '公比 r', -1.2, 1.2, .5, .05), int('n', '項數 n', 1, 25, 4)],
    compute(s) {let total = 0; const partial = Array.from({length: s.n}, (_, i) => (total += (i + 1) * s.r ** i)); return model({total, partial}, ['Sₙ=Σ[k=1..n] k r^(k−1)', 'r≠1：Sₙ=[1−(n+1)rⁿ+n r^(n+1)]/(1−r)²', `r=1 時改用 n(n+1)/2；目前有限和 ≈ ${F(total)}`], series(partial, 1, {note: '以有限項直接加總，避免 r 接近 1 時相減造成精度流失。'}));}
  });
  add({id: 'geometric-sequence-convergence', short: 'rⁿ 的收斂分類', title: '等比數列極限：收斂、振盪與無界', tag: '數列與級數', course: 'advanced',
    examSignal: '先比較 |r| 與 1，再看 r 的正負；負公比會造成奇偶項交替。', prompt: '切換 r=−1、1 及附近數值，分辨有限圖形與真正極限。', trap: '看到前幾項變小不能直接斷言收斂；r=−1 與 r=1 的結論不同。', challenge: '比較 r=−1/2、−1、−2 時 aₙ=rⁿ 的極限。', challengeAnswer: 'r=−1/2 時極限為 0；r=−1 在 ±1 間振盪；r=−2 奇偶項無界反向，後兩者均無極限。',
    controls: [num('r', '公比 r', -1.5, 1.5, -.5, .05), int('n', '觀察項數 n', 5, 50, 15)],
    compute(s) {const values = Array.from({length: s.n + 1}, (_, i) => s.r ** i), kind = Math.abs(s.r) < 1 ? 'zero' : s.r === 1 ? 'one' : s.r === -1 ? 'oscillating' : s.r > 1 ? 'positive-infinity' : 'unbounded-oscillation', description = {zero: '收斂到 0', one: '恆為 1，收斂到 1', oscillating: '±1 振盪，不收斂', 'positive-infinity': '趨向正無窮，無有限極限', 'unbounded-oscillation': '正負交替且絕對值無界，無極限'}[kind]; return model({values, kind}, ['定義 a₀=1，aₙ₊₁=r aₙ', `目前分類：${description}`, `第 ${s.n} 項 ≈ ${F(values.at(-1))}；判斷依公比條件，非只看畫面。`], series(values, 0));}
  });
  add({id: 'quadratic-sequence-differences', short: '差分與二次數列', title: '數列差分：二次式的二階差固定', tag: '數列與級數', course: 'common',
    examSignal: '一階差是等差數列，表示原數列可能由二次式生成；二階差等於二次係數的兩倍。', prompt: '調整 a、b、c，看哪個係數會改變二階差。', trap: '二階差為 2a，不是 a；常數 c 不影響任何一階差。', challenge: '數列 3、8、15、24 的一階與二階差為何？一般項？', challengeAnswer: '一階差 5、7、9，二階差皆 2，所以 a=1；一般項 uₙ=n²+2n。',
    controls: [num('a', '二次係數 a', -3, 3, 1), num('b', '一次係數 b', -5, 5, 2), num('c', '常數 c', -5, 5, 0), int('n', '項數 n', 3, 12, 6)],
    compute(s) {const values = Array.from({length: s.n}, (_, i) => s.a * (i + 1) ** 2 + s.b * (i + 1) + s.c), first = values.slice(1).map((v, i) => v - values[i]), second = first.slice(1).map((v, i) => v - first[i]); return model({values, first, second}, ['uₙ=an²+bn+c；Δuₙ=a(2n+1)+b；Δ²uₙ=2a', `一階差：${first.map(F).join('、')}`, `二階差：${second.map(F).join('、')}；固定值 ≈ ${F(2 * s.a)}`], series(values));}
  });

  // 31–36: finite combinatorics; counts stay below the safe-integer limit.
  add({id: 'circular-permutation-rotation', short: '圓排列與座位編號', title: '圓排列：旋轉視為相同時為何除以 n', tag: '排列組合', course: 'common',
    examSignal: '座位沒有編號，旋轉後相同，可固定一人消去 n 個重複表示。', prompt: '切換座位有無編號，比較同一組人數的排列數。', trap: '一般圓排列仍把順時針與逆時針視為不同，不能再任意除以 2。', challenge: '6 位不同的人圍圓桌而坐，旋轉視為相同，有幾種？', challengeAnswer: '固定一人，其餘 5 人排列，共 5!=120 種。',
    controls: [int('n', '人數 n', 3, 10, 6), choose('seats', '座位設定', [['free', '無編號：旋轉相同'], ['labeled', '有編號：位置不同']])],
    compute(s) {const circular = fact(s.n - 1), labeled = fact(s.n), count = s.seats === 'free' ? circular : labeled, points = Array.from({length: s.n}, (_, i) => P(3 * Math.cos(2 * PI * i / s.n), 3 * Math.sin(2 * PI * i / s.n), String(i + 1), i ? C[0] : C[1])); return model({count, circular, labeled}, [`有編號座位 n! = ${labeled}`, `無編號圓桌 n!/n=(n−1)! = ${circular}`, `目前規則：${count} 種；畫面只是一種示例排列。`], geometry(points, {circles: [{x: 0, y: 0, r: 3}], note: '橘色是可固定的第一人；鏡射排列仍算不同。'}));}
  });
  add({id: 'nonadjacent-position-selection', short: '不相鄰選位', title: '不相鄰組合：直線與環狀位置', tag: '排列組合', course: 'common',
    examSignal: '直線上選 k 個不相鄰位置，可把必要空格壓縮；環狀要額外處理首尾相鄰。', prompt: '比較同樣 n、k 在直線和環上有多少選法。', trap: '環上的第一格與最後一格相鄰；不能直接沿用直線公式。', challenge: '7 個直線位置選 3 個且互不相鄰，有幾種？', challengeAnswer: 'C(7−3+1,3)=C(5,3)=10 種；7 個環狀位置則有 7 種。',
    controls: [int('n', '位置總數 n', 3, 16, 7), int('k', '選取數 k', 0, 8, 3), choose('shape', '排列形狀', [['line', '直線'], ['circle', '環狀']])],
    compute(s) {const lineCount = binom(s.n - s.k + 1, s.k), circleCount = s.k === 0 ? 1 : s.n - s.k >= s.k && s.n > s.k ? Math.round(s.n * binom(s.n - s.k, s.k) / (s.n - s.k)) : 0, count = s.shape === 'line' ? lineCount : circleCount, selected = count ? new Set(Array.from({length: s.k}, (_, i) => 2 * i)) : new Set(), points = Array.from({length: s.n}, (_, i) => s.shape === 'line' ? P(i, 0, String(i + 1), selected.has(i) ? C[1] : C[0]) : P(3 * Math.cos(2 * PI * i / s.n), 3 * Math.sin(2 * PI * i / s.n), String(i + 1), selected.has(i) ? C[1] : C[0])); return model({count, lineCount, circleCount}, [`直線：C(n−k+1,k) = ${lineCount}`, `環狀：k=0 為 1；k>0 時 n·C(n−k,k)/(n−k) = ${circleCount}`, count === 0 ? '沒有合法選法。' : s.k === 0 ? '選 0 個位置，只有空集合這一種。' : `目前 ${count} 種；橘點只示範其中一組，非列出全部。`], geometry(points, {circles: s.shape === 'circle' ? [{x: 0, y: 0, r: 3}] : []}));}
  });
  const derangements = n => {const d = [1, 0]; for (let k = 2; k <= n; k++) d[k] = (k - 1) * (d[k - 1] + d[k - 2]); return d;};
  add({id: 'derangements-fixed-points', short: '錯排與固定點分布', title: '錯排：每個人都拿錯與恰好 k 人拿對', tag: '排列組合', course: 'enrichment',
    examSignal: '全部都錯不能用簡單的 (n−1)ⁿ，因為物品只能分配一次；用錯排遞迴或容斥。', prompt: '長條顯示所有排列中，恰好 k 個位置正確的排列數。', trap: '恰好 n−1 人拿對是不可能的，最後一人也會拿對。此模組屬延伸探索。', challenge: '4 人各拿一封不同信，全部拿錯有幾種？', challengeAnswer: 'D₂=1、D₃=2，D₄=3(D₃+D₂)=9 種。',
    controls: [int('n', '人數 n', 1, 10, 4)],
    compute(s) {const d = derangements(s.n), counts = Array.from({length: s.n + 1}, (_, k) => binom(s.n, k) * d[s.n - k]), total = fact(s.n); return model({derangement: d[s.n], counts, total}, ['D₀=1、D₁=0；Dₙ=(n−1)(Dₙ₋₁+Dₙ₋₂)', `全部拿錯 Dₙ=${d[s.n]}；機率 ${d[s.n]}/${total}`, '恰有 k 個正確位置：C(n,k)Dₙ₋ₖ；各長條總和等於 n!。'], bars(counts, counts.map((_, i) => String(i)), {note: '橫軸為正確位置數 k，縱軸為排列數。'}));}
  });
  add({id: 'three-set-inclusion-exclusion', short: '三集合容斥', title: '三集合容斥：交集為何要加回一次', tag: '排列組合', course: 'common',
    examSignal: '三集合聯集先加三個集合、減三個兩兩交集、最後加回三重交集。', prompt: '直接設定七個互斥區域的人數，觀察集合大小與聯集公式。', trap: '|A∩B| 包含三重交集，不能把「僅在 A、B」的區域數直接當成完整交集。', challenge: '|A|=10、|B|=12、|C|=9，兩兩交集皆 3、三重交集 1，聯集多少？', challengeAnswer: '10+12+9−3−3−3+1=23。',
    controls: [int('a', '只在 A', 0, 10, 4), int('b', '只在 B', 0, 10, 3), int('c', '只在 C', 0, 10, 2), int('ab', '只在 A、B', 0, 10, 2), int('ac', '只在 A、C', 0, 10, 1), int('bc', '只在 B、C', 0, 10, 3), int('abc', '三重交集', 0, 10, 1)],
    compute(s) {const A = s.a + s.ab + s.ac + s.abc, B = s.b + s.ab + s.bc + s.abc, Q = s.c + s.ac + s.bc + s.abc, pairSum = s.ab + s.ac + s.bc + 3 * s.abc, union = A + B + Q - pairSum + s.abc; const locations = [[-1.6, 1, s.a], [1.6, 1, s.b], [0, -2.1, s.c], [0, 1.3, s.ab], [-.95, -.7, s.ac], [.95, -.7, s.bc], [0, -.05, s.abc]]; return model({A, B, C: Q, pairSum, union}, [`|A|=${A}、|B|=${B}、|C|=${Q}`, `聯集=${A}+${B}+${Q}−${pairSum}+${s.abc}=${union}`, '圖中七格互斥，直接相加也應等於聯集。'], geometry([], {circles: [{x: -1, y: .7, r: 1.8, color: C[0]}, {x: 1, y: .7, r: 1.8, color: C[1]}, {x: 0, y: -.9, r: 1.8, color: C[2]}], labels: [...locations.map(([x, y, value]) => ({x, y, text: String(value)})), {x: -2, y: 2.5, text: 'A'}, {x: 2, y: 2.5, text: 'B'}, {x: 0, y: -2.55, text: 'C'}], note: '圓的面積不代表人數；數字才是各互斥區域的數量。'}));}
  });
  const boundedCount = (n, k, cap) => {if (n < 0) return 0; let dp = Array(n + 1).fill(0); dp[0] = 1; for (let box = 0; box < k; box++) {const next = Array(n + 1).fill(0); for (let total = 0; total <= n; total++) for (let x = 0; x <= cap && x <= total; x++) next[total] += dp[total - x]; dp = next;} return dp[n];};
  add({id: 'bounded-stars-bars', short: '有容量上限的隔板法', title: '隔板法加容斥：每盒最多放 m 個', tag: '排列組合', course: 'common',
    examSignal: '相同物品放不同盒子是非負整數解；有上限時，先算全部再排除超量盒子。', prompt: '觀察第一盒各種數量對總解數的貢獻。物品相同、盒子有別。', trap: '基本隔板法只處理下限；盒子容量限制不能直接忽略。', challenge: 'x+y+z=5，0≤x,y,z≤2，有幾組整數解？', challengeAnswer: '只能是 (1,2,2) 的三種排列，因此共 3 組；也可用容斥驗算。',
    controls: [int('n', '相同物品數 n', 0, 20, 5), int('k', '盒子數 k', 2, 5, 3), int('m', '每盒容量 m', 0, 10, 2)],
    compute(s) {const total = boundedCount(s.n, s.k, s.m), terms = Array.from({length: s.k + 1}, (_, j) => (-1) ** j * binom(s.k, j) * binom(s.n - j * (s.m + 1) + s.k - 1, s.k - 1)), counts = Array.from({length: s.m + 1}, (_, x) => boundedCount(s.n - x, s.k - 1, s.m)); return model({total, inclusionExclusion: sum(terms), counts}, [`x₁+…+xₖ=n，0≤xᵢ≤m；解數 ${total}`, '容斥：Σ[j=0..k] (−1)ʲ C(k,j) C(n−j(m+1)+k−1,k−1)', `各項 ${terms.join(' + ')}；第一盒分布加總 ${sum(counts)}`], bars(counts, counts.map((_, x) => String(x)), {note: '橫軸為第一盒物品數，縱軸為其餘盒的合法分配數。'}));}
  });
  add({id: 'lattice-path-forbidden-point', short: '格線路徑避開一點', title: '最短格線路徑：扣掉經過障礙點的走法', tag: '排列組合', course: 'common',
    examSignal: '只向右、向上走，用組合數選步序；經過某點的路徑可拆成前後兩段相乘。', prompt: '移動障礙點 Q，觀察端點、內部與矩形外的差異。', trap: '障礙點在矩形外不影響走法；若它就是起點或終點，合法路徑為零。', challenge: '從 (0,0) 到 (3,2)，避開 (1,1)，有幾條最短路徑？', challengeAnswer: '全部 C(5,2)=10；經過障礙點 C(2,1)C(3,1)=6；剩 4 條。',
    controls: [int('m', '向右步數 m', 0, 10, 3), int('n', '向上步數 n', 0, 10, 2), int('a', '障礙點 x', 0, 10, 1), int('b', '障礙點 y', 0, 10, 1)],
    compute(s) {const total = binom(s.m + s.n, s.m), inside = s.a <= s.m && s.b <= s.n, blocked = inside ? binom(s.a + s.b, s.a) * binom(s.m + s.n - s.a - s.b, s.m - s.a) : 0, count = total - blocked, points = [P(0, 0, 'S'), P(s.m, s.n, 'T', C[2]), P(s.a, s.b, 'Q', C[4])], lines = []; for (let x = 0; x <= s.m; x++) lines.push(L(P(x, 0), P(x, s.n), '#b8c9e4')); for (let y = 0; y <= s.n; y++) lines.push(L(P(0, y), P(s.m, y), '#b8c9e4')); return model({total, blocked, count, inside}, [`全部路徑 C(m+n,m)=${total}`, inside ? `經 Q：C(a+b,a)C(m+n−a−b,m−a)=${blocked}` : 'Q 在矩形外，不會阻擋最短路徑。', `合法路徑 ${total}−${blocked}=${count}`], geometry(points, {lines, note: '僅允許向右與向上；格線展示可行範圍，非所有路徑的列舉。'}));}
  });

  // 37–42: probability assumptions and population-statistics identities.
  add({id: 'birthday-collision-probability', short: '生日碰撞與補事件', title: '生日問題：至少一對相同的機率', tag: '機率與統計', course: 'A',
    examSignal: '「至少一對相同」有重疊事件，改算「全部不同」再用 1 減去。', prompt: '假設每個人的生日獨立、均勻分布在 D 天，觀察人數增加的效果。', trap: '這不是「有人跟你同一天」的機率；本模型忽略閏年與實際生日分布。', challenge: 'D=365，23 人中至少兩人同生日，機率約多少？', challengeAnswer: '1−∏[k=0..22](365−k)/365 ≈ 0.5073，約 50.73%。',
    controls: [int('n', '人數 n', 1, 80, 23), int('days', '等可能日期數 D', 2, 365, 365)],
    compute(s) {let distinct = 1; const values = Array.from({length: s.n}, (_, i) => {distinct *= Math.max(0, (s.days - i) / s.days); return 1 - distinct;}); const probability = values.at(-1); return model({distinct, probability}, ['P(至少一對相同)=1−P(全部不同)', `=1−∏[k=0..n−1](D−k)/D ≈ ${F(probability)}`, s.n > s.days ? '人數超過日期數，鴿籠原理保證碰撞，機率為 1。' : `全部不同機率 ≈ ${F(distinct)}`], series(values, 1, {y: [0, 1.05], note: '橫軸人數，縱軸至少一對生日相同的機率。'}));}
  });
  add({id: 'monty-hall-generalized', short: '換門策略與資訊', title: '換門問題：主持人的規則決定機率', tag: '機率與統計', course: 'enrichment',
    examSignal: '先看最初選對的機率；主持人知道獎品位置，且保證留下唯一未選的可換門。', prompt: 'n 扇門有一個獎品。主持人從未選門中開掉 n−2 扇空門，比較兩種策略。', trap: '主持人不能隨機開出獎品；若開門規則不同，下列結論不一定成立。此為延伸探索。', challenge: '5 扇門，依指定規則開掉 3 扇空門後，換門成功率？', challengeAnswer: '原本選錯的機率是 4/5，換門恰在原本選錯時成功，因此為 4/5。',
    controls: [int('n', '門數 n', 3, 12, 5)],
    compute(s) {const stay = 1 / s.n, change = (s.n - 1) / s.n; return model({stay, change}, [`不換門成功率=1/n=1/${s.n} ≈ ${F(stay)}`, `換門成功率=(n−1)/n=${s.n - 1}/${s.n} ≈ ${F(change)}`, '假設：獎品等可能，初選不知位置，主持人知情且必留一扇未選門。'], bars([stay, change], ['不換門', '換門'], {y: [0, 1.05], note: '長條是理論成功率，並非隨機模擬次數。'}));}
  });
  add({id: 'replacement-vs-no-replacement', short: '放回與不放回比較', title: '抽球分布：二項與超幾何的差異', tag: '機率與統計', course: 'A',
    examSignal: '放回使成功率固定且各次獨立；不放回則要用組合數，同時檢查可抽取範圍。', prompt: '同一袋紅藍球，切換放回規則，比較紅球數 X 的分布與變異數。', trap: '不放回的抽取數不能超過球數；均值相同不代表分布或變異數相同。', challenge: '3 紅、2 藍抽 2 球，恰好 1 紅：放回與不放回各為何？', challengeAnswer: '放回：C(2,1)(3/5)(2/5)=12/25。不放回：C(3,1)C(2,1)/C(5,2)=3/5。',
    controls: [int('R', '紅球數 R', 0, 20, 3), int('B', '藍球數 B', 0, 20, 2), int('n', '抽取數 n', 0, 10, 2), choose('mode', '抽取規則', [['replace', '每次放回'], ['without', '不放回']])],
    compute(s) {const N = s.R + s.B; if (N === 0) return errorModel('袋中沒有球，請至少放入一顆球。'); if (s.mode === 'without' && s.n > N) return errorModel('不放回時，抽取數 n 不可超過球數 R+B。'); const p = s.R / N, values = Array.from({length: s.n + 1}, (_, k) => s.mode === 'replace' ? binom(s.n, k) * p ** k * (1 - p) ** (s.n - k) : binom(s.R, k) * binom(s.B, s.n - k) / binom(N, s.n)), mean = s.n * p, variance = s.n * p * (1 - p) * (s.mode === 'replace' ? 1 : N === 1 ? 0 : (N - s.n) / (N - 1)); return model({valid: true, values, mean, variance, probabilitySum: sum(values)}, [s.mode === 'replace' ? 'P(X=k)=C(n,k)pᵏ(1−p)^(n−k)' : 'P(X=k)=C(R,k)C(B,n−k)/C(R+B,n)', `E(X)=nR/(R+B) ≈ ${F(mean)}；Var(X) ≈ ${F(variance)}`, `機率總和 ≈ ${F(sum(values))}；不可能的紅球數以 0 表示。`], bars(values, values.map((_, k) => String(k)), {note: '橫軸抽到的紅球數 k，縱軸機率。'}));}
  });
  add({id: 'conditional-expected-successes', short: '條件期望與重新分配', title: '條件期望：已知至少一次成功', tag: '機率與統計', course: 'enrichment',
    examSignal: '條件改變樣本空間，先除以條件事件機率，再計算條件分布的加權平均。', prompt: '兩次獨立試驗的成功率為 p、q。已知至少一次成功，成功次數平均多少？', trap: 'E(X|X≥1) 不等於 E(X)；條件事件機率為 0 時，條件期望未定義。', challenge: '兩次獨立公平擲幣，已知至少一次正面，正面次數的期望？', challengeAnswer: '條件樣本 HH、HT、TH 等可能；期望 (2+1+1)/3=4/3。',
    controls: [num('p', '第一次成功率 p', 0, 1, .5, .05), num('q', '第二次成功率 q', 0, 1, .5, .05)],
    compute(s) {const original = [(1 - s.p) * (1 - s.q), s.p * (1 - s.q) + (1 - s.p) * s.q, s.p * s.q], event = original[1] + original[2], values = event === 0 ? [0, 0] : [original[1] / event, original[2] / event], mean = event === 0 ? null : (s.p + s.q) / event; return model({event, values, mean, original}, [`P(X≥1)=p+q−pq ≈ ${F(event)}`, event === 0 ? '條件事件機率為 0，條件分布與條件期望未定義。' : `E(X|X≥1)=(p+q)/(p+q−pq) ≈ ${F(mean)}`, '獨立假設是乘法公式的前提；本模組為延伸探索。'], bars(values, ['1 次成功', '2 次成功'], {y: [0, 1.05], note: event === 0 ? '條件事件不可能，長條不代表有效機率分布。' : '只顯示條件成立後重新正規化的分布。'}));}
  });
  add({id: 'least-squares-residual-cost', short: '最小平方法的代價', title: '迴歸最佳化：殘差平方和如何最小', tag: '機率與統計', course: 'A',
    examSignal: '迴歸最小化的是鉛直殘差平方和，先讓直線通過平均點，再調整斜率。', prompt: '手動調整斜率 m、截距 b，與綠色最佳迴歸線比較。', trap: '這裡不是最短垂直於直線的距離和；離群值在平方後會有較大影響。', challenge: '資料 (−1,0)、(0,1)、(1,2) 的最佳迴歸直線？殘差平方和？', challengeAnswer: '三點恰在 y=x+1 上，斜率 1、截距 1，殘差平方和為 0。',
    controls: [num('m', '候選斜率 m', -4, 4, .5), num('b', '候選截距 b', -5, 5, 1), num('outlier', '最後一點 y', -8, 10, 3)],
    compute(s) {const xs = [-2, -1, 0, 1, 2], ys = [-1, 0, 1, 2, s.outlier], intercept = sum(ys) / 5, slope = sum(xs.map((x, i) => x * ys[i])) / sum(xs.map(sq)), cost = sum(xs.map((x, i) => sq(ys[i] - (s.m * x + s.b)))), minimum = sum(xs.map((x, i) => sq(ys[i] - (slope * x + intercept)))), points = xs.map((x, i) => P(x, ys[i], '')); return model({slope, intercept, cost, minimum}, ['SSE=Σ(yᵢ−(mxᵢ+b))²', `目前 SSE ≈ ${F(cost)}；最小 SSE ≈ ${F(minimum)}`, `最佳直線 y ≈ (${F(slope)})x+(${F(intercept)})`], graph([curve(x => s.m * x + s.b, C[1]), curve(x => slope * x + intercept, C[2])], [-3, 3], [-12, 14], {points, lines: points.map(p => L(p, P(p.x, s.m * p.x + s.b), C[4], true)), note: '橘線為候選線，綠線為最小平方法，紅虛線為鉛直殘差。'}));}
  });
  add({id: 'variance-sum-covariance', short: '和的變異數與共變異', title: '變異數相加：相關性多出哪一項', tag: '機率與統計', course: 'A',
    examSignal: 'Var(X+Y)=VarX+VarY+2Cov(X,Y)；只有共變異為 0 時才可直接相加。', prompt: '五筆等權資料 X=(−2,−1,0,1,2)，Z=(1,−2,2,−2,1)，設定 Y=aX+bZ。', trap: '負共變異可以降低和的變異數；變異數本身仍不能為負。此處使用母體分母 5。', challenge: 'VarX=4、VarY=9、Cov(X,Y)=−3，求 Var(X+Y)。', challengeAnswer: '4+9+2(−3)=7，不能漏掉共變異項。',
    controls: [num('a', '共同分量係數 a', -3, 3, -1), num('b', '另一分量係數 b', 0, 3, 1)],
    compute(s) {const varX = 2, varY = 2 * s.a * s.a + 2.8 * s.b * s.b, covariance = 2 * s.a, varianceSum = 2 * sq(1 + s.a) + 2.8 * s.b * s.b; return model({varX, varY, covariance, varianceSum}, [`VarX=2；VarY=2a²+(14/5)b² ≈ ${F(varY)}`, `Cov(X,Y)=2a ≈ ${F(covariance)}`, `Var(X+Y)=VarX+VarY+2Cov ≈ ${F(varianceSum)}`], bars([varX, varY, 2 * covariance, varianceSum], ['Var X', 'Var Y', '2Cov', 'Var(X+Y)'], {note: '2Cov 可為負；其他三根長條都是非負變異數。'}));}
  });

  // 43–50: limits, derivatives and integrals with analytic reference values.
  add({id: 'rationalization-difference-quotient', short: '根式極限與有理化', title: '根式極限：消去 0/0 而不消掉定義域', tag: '極限與微積分', course: 'advanced',
    examSignal: '根號相減出現 0/0 時乘共軛式，將差商改寫為分母的根號和。', prompt: '讓 h 由正負兩側接近 0，觀察有理化後的穩定表達式。', trap: 'h=0 時原差商仍無定義；有理化提供極限與連續延伸，不是直接替原式定義。', challenge: '求 h→0 時 (√(4+h)−2)/h 的極限。', challengeAnswer: '有理化為 1/(√(4+h)+2)，極限為 1/4。',
    controls: [num('a', '根號內基準 a', 1, 8, 4), num('h', '增量 h', -1, 1, .1, .01)],
    compute(s) {const value = 1 / (Math.sqrt(s.a + s.h) + Math.sqrt(s.a)), limit = 1 / (2 * Math.sqrt(s.a)), direct = s.h === 0 ? null : (Math.sqrt(s.a + s.h) - Math.sqrt(s.a)) / s.h; return model({value, limit, direct}, ['h≠0：(√(a+h)−√a)/h=1/(√(a+h)+√a)', `極限 =1/(2√a) ≈ ${F(limit)}`, s.h === 0 ? 'h=0：原分式未定義；圖中空心點表示極限。' : `穩定差商 ≈ ${F(value)}；h ≈ ${F(s.h)}`], graph([curve(h => 1 / (Math.sqrt(s.a + h) + Math.sqrt(s.a)), C[0], [-1, 1], [0]), curve(() => limit, C[2])], [-1.1, 1.1], [0, 1.1], {points: [P(0, limit, '極限', C[2], true), ...(s.h === 0 ? [] : [P(s.h, value, '目前', C[1])])]}));}
  });
  add({id: 'removable-hole-function-value', short: '可去點與函數值', title: '極限不等於函數值：補點能否連續', tag: '極限與微積分', course: 'advanced',
    examSignal: '約分只在 x≠a 時成立；極限看附近走勢，函數值則由另外指定的點決定。', prompt: 'x≠a 時 f(x)=(x²−a²)/(x−a)，另設 f(a)=v，觀察補點位置。', trap: '不能因 x−a 可約分就說原分式在 a 有值；連續還要檢查 f(a) 等於極限。', challenge: 'a=2、f(2)=7，x→2 的極限與連續性為何？', challengeAnswer: 'x≠2 時 f(x)=x+2，所以極限為 4；f(2)=7≠4，因此不連續。改為 f(2)=4 才連續。',
    controls: [num('a', '可去點 a', -3, 3, 2), num('v', '另外指定 f(a)=v', -8, 8, 7)],
    compute(s) {const limit = 2 * s.a, continuous = s.v === limit; return model({limit, value: s.v, continuous}, ['x≠a 時 f(x)=x+a；lim[x→a] f(x)=2a', `極限 ≈ ${F(limit)}；指定 f(a) ≈ ${F(s.v)}`, continuous ? '函數值等於極限，在 a 連續。' : '函數值與極限不同，在 a 不連續。'], graph([curve(x => x + s.a, C[0], undefined, [s.a])], [-5, 5], [-10, 10], {points: [P(s.a, limit, '極限', C[0], true), P(s.a, s.v, 'f(a)', C[1])]}));}
  });
  add({id: 'mean-value-parallel-tangent', short: '均值定理與平行切線', title: '微分均值定理：平均斜率在哪裡取到', tag: '極限與微積分', course: 'advanced',
    examSignal: '閉區間連續、開區間可微，保證某個內點的切線斜率等於端點割線斜率。', prompt: '對 f(x)=x³−3x 改變區間，觀察滿足均值定理的內點可能不只一個。', trap: 'c 必須嚴格位於 (a,b)；均值定理保證至少一個，沒有保證唯一。', challenge: 'f(x)=x³−3x 在 [0,2] 的均值定理內點 c？', challengeAnswer: '割線斜率 (f(2)−f(0))/2=1；3c²−3=1，區間內解 c=2/√3。',
    controls: [num('a', '左端點 a', -3, 2, 0), num('width', '區間長 b−a', .5, 4, 2)],
    compute(s) {const a = s.a, b = a + s.width, f = x => x ** 3 - 3 * x, slope = a * a + a * b + b * b - 3, root = Math.sqrt(Math.max(0, (slope + 3) / 3)), candidates = [...new Set([-root, root])].filter(c => c > a && c < b), samples = [f(a), f(b), ...[-1, 1].filter(x => x > a && x < b).map(f)], lo = Math.min(...samples), hi = Math.max(...samples), pad = Math.max(1, (hi - lo) * .2); return model({a, b, slope, candidates}, [`割線斜率 (f(b)−f(a))/(b−a) ≈ ${F(slope)}`, 'f′(c)=3c²−3；解 c=±√((割線斜率+3)/3)，只留 a<c<b', `有效內點 c ≈ ${candidates.map(F).join('、')}`], graph([curve(f), curve(x => f(a) + slope * (x - a), C[1]), ...candidates.map(c => curve(x => f(c) + slope * (x - c), C[2]))], [a - .4, b + .4], [lo - pad, hi + pad], {points: [P(a, f(a), 'a'), P(b, f(b), 'b'), ...candidates.map(c => P(c, f(c), 'c', C[2]))], note: '橘色割線與綠色切線平行；藍線是三次函數。'}));}
  });
  add({id: 'power-cusp-differentiability', short: '尖點與可微門檻', title: '|x|ᵖ 在原點：連續不代表可微', tag: '極限與微積分', course: 'advanced',
    examSignal: '看原點可微性應比較左右差商；圖形看起來尖或平都不能取代極限判定。', prompt: '調整 p 與差商步長 h，觀察左右斜率在 p=1 前後的差異。', trap: '所有 p>0 都在原點連續，但只有 p>1 在原點可微；無窮斜率不算有限導數。', challenge: 'f(x)=|x|^(3/2) 在 0 是否可微？導數為何？', challengeAnswer: '可微。左右差商為 ±√h，h→0⁺ 時都趨近 0，所以 f′(0)=0。',
    controls: [num('p', '指數 p', .2, 3, 1, .05), num('h', '差商步長 h', .001, 1, .1, .001)],
    compute(s) {const right = s.h ** (s.p - 1), left = -right, differentiable = s.p > 1, kind = differentiable ? '左右斜率均趨 0，可微且導數為 0' : s.p === 1 ? '左右導數為 −1、1，不可微' : '左右差商絕對值無界，不可微'; return model({right, left, differentiable, derivative: differentiable ? 0 : null}, ['右差商=h^(p−1)；左差商=−h^(p−1)', `目前左 ≈ ${F(left)}；右 ≈ ${F(right)}`, `原點判定：${kind}`], graph([curve(x => Math.abs(x) ** s.p)], [-1.2, 1.2], [-.2, 1.5], {lines: [L(P(0, 0), P(s.h, s.h ** s.p), C[1]), L(P(0, 0), P(-s.h, s.h ** s.p), C[2])], points: [P(0, 0, 'O')]}));}
  });
  add({id: 'velocity-signed-distance', short: '位移與路程的差別', title: 'v–t 面積：位移、路程與轉向時刻', tag: '極限與微積分', course: 'advanced',
    examSignal: '速度圖在時間軸上方給正位移、下方給負位移；路程則累加面積的絕對值。', prompt: '速度 v(t)=v₀+at。讓圖形穿過時間軸，觀察位移抵消而路程累加。', trap: '速度與加速度反向代表先減速；跨過 v=0 後可能反向加速。路程不能直接取總位移絕對值。', challenge: 'v(t)=2−t，0≤t≤4，位移與路程各多少？', challengeAnswer: 't=2 轉向。正負三角形面積各 2，位移 2−2=0，路程 2+2=4。',
    controls: [num('v', '初速 v₀', -10, 10, 2), num('a', '加速度 a', -5, 5, -1), num('T', '觀察時間 T', 0, 10, 4)],
    compute(s) {const primitive = t => s.v * t + s.a * t * t / 2, displacement = primitive(s.T), crossing = s.a === 0 ? null : -s.v / s.a, turn = crossing !== null && crossing > 0 && crossing < s.T ? crossing : null, distance = turn === null ? Math.abs(displacement) : Math.abs(primitive(turn)) + Math.abs(displacement - primitive(turn)), cuts = turn === null ? [0, s.T] : [0, turn, s.T], polygons = cuts.slice(1).map((b, i) => {const a = cuts[i], positive = s.v + s.a * (a + b) / 2 >= 0; return {points: [P(a, 0), P(a, s.v + s.a * a), P(b, s.v + s.a * b), P(b, 0)], color: positive ? C[2] : C[1], fill: positive ? '#18a99925' : '#e28b1825'};}); const end = s.v + s.a * s.T; return model({displacement, distance, turn, endVelocity: end}, [`位移 ∫v dt=v₀T+aT²/2 ≈ ${F(displacement)}`, `路程 ∫|v|dt ≈ ${F(distance)}`, turn === null ? '開區間 (0,T) 沒有轉向。' : `轉向時刻 t=−v₀/a ≈ ${F(turn)}`], graph([curve(t => s.v + s.a * t, C[0], [0, s.T])], [-.2, Math.max(1, s.T) + .3], [Math.min(0, s.v, end) - 2, Math.max(0, s.v, end) + 2], {polygons, note: '橫軸時間 t、縱軸速度 v；綠色為正位移、橘色為負位移。'}));}
  });
  add({id: 'integral-average-height', short: '函數平均值', title: '積分平均值：等面積長方形的高度', tag: '極限與微積分', course: 'advanced',
    examSignal: '函數平均值等於積分除以區間長，幾何上是同底、等面積長方形的高度。', prompt: '對 f(x)=x²+c 改變區間，觀察平均高度不一定是端點高度的平均。', trap: '一般曲線不能把 (f(a)+f(b))/2 當成函數平均值，那只是梯形的平均高度。', challenge: 'f(x)=x² 在 [0,3] 的平均值？', challengeAnswer: '平均值=(1/3)∫₀³x²dx=(1/3)×9=3，端點平均 9/2 並不相等。',
    controls: [num('a', '左端點 a', -3, 3, 0), num('width', '區間長 b−a', .5, 6, 3), num('c', '常數 c', 0, 5, 0)],
    compute(s) {const a = s.a, b = a + s.width, integral = (b ** 3 - a ** 3) / 3 + s.c * s.width, average = (a * a + a * b + b * b) / 3 + s.c, rectangleArea = average * s.width, f = x => x * x + s.c; const points = [P(a, 0), ...Array.from({length: 101}, (_, i) => {const x = a + s.width * i / 100; return P(x, f(x));}), P(b, 0)]; return model({a, b, integral, average, rectangleArea}, ['平均值=(1/(b−a))∫[a,b]f(x)dx', `x²+c 的平均值=(a²+ab+b²)/3+c ≈ ${F(average)}`, `積分 ≈ ${F(integral)}；平均高×底長 ≈ ${F(rectangleArea)}`], graph([curve(f), curve(() => average, C[1])], [a - .5, b + .5], [-.5, Math.max(f(a), f(b)) * 1.15 + 1], {polygons: [{points}, {points: [P(a, 0), P(a, average), P(b, average), P(b, 0)], color: C[1], fill: '#e28b1815'}], note: '藍色為曲線下面積；橘色長方形與它等面積。'}));}
  });
  add({id: 'washer-conical-volume', short: '圓環法與中空旋轉體', title: '旋轉體圓環法：外半徑平方減內半徑平方', tag: '極限與微積分', course: 'advanced',
    examSignal: '垂直旋轉軸切開，截面是圓環，面積為 π(R²−r²)，再沿軸積分。', prompt: '將 0≤x≤b、kax≤y≤ax 的區域繞 x 軸旋轉，觀察挖空比例。', trap: 'π(R−r)² 不是圓環面積；必須先各自平方再相減。', challenge: '0≤x≤2、x/2≤y≤x 繞 x 軸旋轉，體積多少？', challengeAnswer: 'V=π∫₀²(x²−x²/4)dx=(3π/4)×8/3=2π。',
    controls: [num('a', '外半徑斜率 a', .2, 3, 1), num('k', '內外半徑比 k', 0, 1, .5, .05), num('b', '軸向長度 b', .2, 5, 2), num('u', '觀察截面位置 x/b', 0, 1, .6, .05)],
    compute(s) {const coefficient = s.a * s.a * (1 - s.k * s.k) * s.b ** 3 / 3, volume = PI * coefficient, x = s.b * s.u, outer = s.a * x, inner = s.k * outer, crossSection = PI * (outer * outer - inner * inner), upper = [P(0, 0), P(s.b, s.a * s.b), P(s.b, s.k * s.a * s.b)], lower = upper.map(p => P(p.x, -p.y)); return model({coefficient, volume, outer, inner, crossSection}, ['截面 A(x)=π[(ax)²−(kax)²]=πa²(1−k²)x²', `V=πa²(1−k²)b³/3 ≈ ${F(volume)}`, `目前截面外半徑 ≈ ${F(outer)}；內半徑 ≈ ${F(inner)}；面積 ≈ ${F(crossSection)}`], geometry([...upper, ...lower], {polygons: [{points: upper}, {points: lower}], lines: [L(P(x, inner), P(x, outer), C[2]), L(P(x, -inner), P(x, -outer), C[2])], note: '畫面為通過旋轉軸的剖面，綠線標示圓環厚度；不是體積本身。'}));}
  });
  add({id: 'parabola-tangent-normal', short: '切線與法線', title: '拋物線切線、法線與頂點特例', tag: '極限與微積分', course: 'advanced',
    examSignal: '切線方向由導數給出；法線垂直於切線，斜率通常互為負倒數。', prompt: '沿 y=x² 移動切點，觀察頂點處的法線變成垂直線。', trap: '切線斜率為 0 時，法線沒有有限斜率，應寫 x=常數，不能除以零。', challenge: 'y=x² 在 (1,1) 的切線與法線方程？', challengeAnswer: 'f′(1)=2；切線 y−1=2(x−1)，法線 y−1=−(x−1)/2。',
    controls: [num('t', '切點 x=t', -3, 3, 1)],
    compute(s) {const slope = 2 * s.t, normal = s.t === 0 ? null : -1 / slope, y = s.t * s.t; return model({slope, normal, point: [s.t, y]}, [`切線：y−t²=2t(x−t)，斜率 ≈ ${F(slope)}`, normal === null ? 't=0：切線 y=0，法線 x=0。' : `法線：y−t²=−(x−t)/(2t)，斜率 ≈ ${F(normal)}`, '切線與法線都通過同一個切點。'], graph([curve(x => x * x), curve(x => y + slope * (x - s.t), C[1]), ...(normal === null ? [] : [curve(x => y + normal * (x - s.t), C[2])])], [-4, 4], [-5, 13], {points: [P(s.t, y, '切點')], lines: normal === null ? [L(P(0, -5), P(0, 13), C[2])] : [], note: '藍色拋物線、橘色切線、綠色法線。'}));}
  });

  return modules;
};
