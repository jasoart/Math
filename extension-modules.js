/* 歷屆題型延伸實驗：有限列舉與解析解，無外部套件。 */
window.createExtensionModules = function createExtensionModules() {
  const EPS = 1e-10;
  const tau = 2 * Math.PI;
  const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const bounded = (value, min, max, fallback = min) => Math.max(min, Math.min(max, number(value, fallback)));
  const integer = (value, min, max, fallback = min) => Math.round(bounded(value, min, max, fallback));
  const vectorText = v => `(${v.map(x => format(x)).join(', ')})`;
  const label = (text, x = 24, y = 30, color = palette.ink) => {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = '600 13px ui-sans-serif, system-ui';
    ctx.fillText(text, x, y);
    ctx.restore();
  };
  const openPoint = (plane, point, color) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(plane.sx(point.x), plane.sy(point.y), 5, 0, tau);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.restore();
  };
  const chart = () => {
    const { width, height } = canvas.getBoundingClientRect();
    return { width, height, left: 58, right: width - 30, top: 58, bottom: height - 58 };
  };
  const plotSeries = (points, color, width = 3) => {
    if (!points.length) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.stroke();
    points.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, tau);
      ctx.fillStyle = color;
      ctx.fill();
    });
    ctx.restore();
  };

  return [
    {
      id: 'constrained-counting',
      title: '有限列舉：不重複、相鄰限制與遞增字串',
      short: '限制排列列舉',
      tag: '排列組合・精確計數',
      course: 'common',
      examSignal: '先分清「不能重複」與「只有相鄰不能相同」。把開頭不能為 0 的限制先處理，再確認乘法原理是否仍適用。',
      prompt: '使用數字 0 到 p−1 組成長度 L 的字串。切換限制，觀察末位分布與實際列舉樣本。',
      challenge: '令 p=5、L=3、開頭不能為 0。比較三種限制的數量，並各自寫出不需要列舉的公式。',
      controls: [
        { key: 'pool', label: '數字種類 p（0 至 p−1）', min: 2, max: 7, step: 1, value: 5 },
        { key: 'length', label: '字串長度 L', min: 1, max: 5, step: 1, value: 3 },
        { key: 'rule', label: '限制', type: 'select', value: 'distinct', options: [
          { value: 'distinct', label: '所有位置的數字都不同' },
          { value: 'noadjacent', label: '相鄰位置的數字不能相同' },
          { value: 'increasing', label: '數字嚴格遞增' }
        ] },
        { key: 'leading', label: '開頭規則', type: 'select', value: 'nonzero', options: [
          { value: 'nonzero', label: '開頭不能為 0' },
          { value: 'allow', label: '允許開頭為 0（字串）' }
        ] }
      ],
      compute(s) {
        const pool = integer(s.pool, 2, 7, 5);
        const length = integer(s.length, 1, 5, 3);
        const rule = ['distinct', 'noadjacent', 'increasing'].includes(s.rule) ? s.rule : 'distinct';
        const nonzero = s.leading !== 'allow';
        const counts = Array(pool).fill(0);
        const examples = [];
        let total = 0;
        function visit(prefix) {
          if (prefix.length === length) {
            total++;
            counts[prefix[prefix.length - 1]]++;
            if (examples.length < 8) examples.push(prefix.join(''));
            return;
          }
          for (let digit = 0; digit < pool; digit++) {
            if (!prefix.length && nonzero && digit === 0) continue;
            if (rule === 'distinct' && prefix.includes(digit)) continue;
            if (rule === 'noadjacent' && prefix.length && prefix[prefix.length - 1] === digit) continue;
            if (rule === 'increasing' && prefix.length && prefix[prefix.length - 1] >= digit) continue;
            visit([...prefix, digit]);
          }
        }
        visit([]);
        const falling = (n, r) => r > n ? 0 : Array.from({ length: r }, (_, i) => n - i).reduce((a, b) => a * b, 1);
        let expected;
        let expression;
        if (rule === 'distinct') {
          expected = nonzero ? (pool - 1) * falling(pool - 1, length - 1) : falling(pool, length);
          expression = nonzero ? '(p−1) × P(p−1,L−1)' : 'P(p,L)';
        } else if (rule === 'noadjacent') {
          expected = nonzero ? (pool - 1) ** length : pool * (pool - 1) ** (length - 1);
          expression = nonzero ? '(p−1)^L' : 'p × (p−1)^(L−1)';
        } else {
          expected = length > pool - (nonzero ? 1 : 0) ? 0 : comb(pool - (nonzero ? 1 : 0), length);
          expression = nonzero ? 'C(p−1,L)' : 'C(p,L)';
        }
        return { pool, length, rule, nonzero, counts, examples, total, expected, expression };
      },
      formula(s, m) {
        return [
          `數字集合：{${Array.from({ length: m.pool }, (_, i) => i).join(',')}}；長度 ${m.length}`,
          `精確列舉結果 = ${m.total}；公式 ${m.expression} = ${m.expected}`,
          'P(n,r) 在 r>n 時為 0；嚴格遞增的字串對應選取數字的組合',
          `樣本（至多 8 筆）：${m.examples.join('、') || '無合法字串'}`
        ];
      },
      draw(s, m) {
        drawSimpleBarChart(m.counts, m.counts.map((_, i) => `末位 ${i}`), -1, { pad: 62 });
        label(`末位數字分布：共 ${m.total} 個合法字串`);
      },
      status(s, m) { return `${m.total} 個合法字串；列舉與公式${m.total === m.expected ? '一致' : '不一致，請檢查條件'}。`; }
    },
    {
      id: 'floor-function-lattice',
      title: '取整函數與直線下的整數格點',
      short: '取整與格點',
      tag: '取整函數・有限加總',
      course: 'common',
      examSignal: '固定一個整數橫座標後，先數該直欄允許的整數縱座標。負數取整是向下取整，並非去掉小數。',
      prompt: '計算 1≤x≤n、1≤y≤ax+b 的整數格點。每欄的點數是 max(0,⌊ax+b⌋)。',
      challenge: '把 a 設成負數，說明為什麼不能直接把負的 ⌊ax+b⌋ 累加當成格點數；再比較 ⌊−1.2⌋ 與 −1。',
      controls: [
        { key: 'n', label: '整數橫座標上限 n', min: 1, max: 20, step: 1, value: 8 },
        { key: 'a', label: '直線斜率 a', min: -1, max: 2, step: 0.1, value: 0.7 },
        { key: 'b', label: '直線截距 b', min: -4, max: 4, step: 0.1, value: 1.2 },
        { key: 'x', label: '取整觀察值 t', min: -3, max: 3.5, step: 0.1, value: -1.2 }
      ],
      compute(s) {
        const n = integer(s.n, 1, 20, 8);
        // 滑桿以 0.1 為單位：先用整數分子計算，避免 0.3×3+0.1 的浮點取整誤差。
        const a10 = Math.round(bounded(s.a, -1, 2, 0.7) * 10);
        const b10 = Math.round(bounded(s.b, -4, 4, 1.2) * 10);
        const a = a10 / 10, b = b10 / 10;
        const x = Math.round(bounded(s.x, -3, 3.5, -1.2) * 10) / 10;
        const heights = Array.from({ length: n }, (_, i) => Math.max(0, Math.floor((a10 * (i + 1) + b10) / 10)));
        const points = [];
        heights.forEach((count, index) => { for (let y = 1; y <= count; y++) points.push({ x: index + 1, y }); });
        return { n, a, b, x, floorX: Math.floor(x), heights, points, total: heights.reduce((sum, v) => sum + v, 0) };
      },
      formula(s, m) {
        return [
          `格點區域：x∈{1,…,${m.n}}，y∈正整數，y≤${format(m.a)}x+${format(m.b)}`,
          `第 x 欄點數 = max(0,⌊ax+b⌋)；各欄：${m.heights.join(', ')}`,
          `總點數 = Σ[x=1..n] max(0,⌊ax+b⌋) = ${m.total}`,
          `⌊${format(m.x)}⌋ = ${m.floorX}；${m.floorX} ≤ ${format(m.x)} < ${m.floorX + 1}`
        ];
      },
      draw(s, m) {
        const g = chart();
        const maxY = Math.max(2, ...m.heights, m.a + m.b, m.a * m.n + m.b);
        const plane = makePlane({ origin: { x: g.left, y: g.bottom }, scale: Math.min((g.right - g.left) / (m.n + 1), (g.bottom - g.top) / (maxY + 1)) });
        drawGrid(plane);
        plotFunction(plane, x => m.a * x + m.b, 0, m.n + 0.5, palette.orange, 2);
        m.points.forEach(p => drawPoint(plane, p, '', palette.blue, 2.7));
        label(`藍點共 ${m.total} 個；橘線 y=ax+b；只計 x≥1、y≥1`);
        label(`⌊${format(m.x)}⌋=${m.floorX}（另列的取整觀察值）`, 24, g.height - 18, palette.muted);
      },
      status(s, m) { return `${m.n} 欄共 ${m.total} 個整數格點；向下取整 ⌊${format(m.x)}⌋=${m.floorX}。`; }
    },
    {
      id: 'matrix-power-recurrence',
      title: '矩陣冪與雙數列遞迴',
      short: '矩陣遞迴',
      tag: '矩陣・數列',
      course: 'A',
      examSignal: '把兩個相互依賴的遞迴式寫成二維狀態向量。Mⁿ 的意義是同一個轉換連續作用 n 次，n=0 時是單位矩陣。',
      prompt: '調整 2×2 矩陣 M，觀察 (uₙ,vₙ) 如何由初始向量逐步產生。這個實驗使用有限次乘法，奇異矩陣也能計算。',
      challenge: '令 M=[[1,1],[1,0]]、(u₀,v₀)=(1,0)，找出與費氏數列的關係。再令 M 為零矩陣，比較 n=0 與 n=1。',
      controls: [
        { key: 'a', label: '矩陣 a（左上）', min: -2, max: 2, step: 1, value: 1 },
        { key: 'b', label: '矩陣 b（右上）', min: -2, max: 2, step: 1, value: 1 },
        { key: 'c', label: '矩陣 c（左下）', min: -2, max: 2, step: 1, value: 1 },
        { key: 'd', label: '矩陣 d（右下）', min: -2, max: 2, step: 1, value: 0 },
        { key: 'u', label: '初值 u₀', min: -3, max: 3, step: 1, value: 1 },
        { key: 'v', label: '初值 v₀', min: -3, max: 3, step: 1, value: 0 },
        { key: 'n', label: '作用次數 n', min: 0, max: 10, step: 1, value: 6 }
      ],
      compute(s) {
        const a = integer(s.a, -2, 2, 1), b = integer(s.b, -2, 2, 1);
        const c = integer(s.c, -2, 2, 1), d = integer(s.d, -2, 2, 0);
        const n = integer(s.n, 0, 10, 6);
        const initial = [integer(s.u, -3, 3, 1), integer(s.v, -3, 3, 0)];
        let power = [[1, 0], [0, 1]];
        const sequence = [initial];
        for (let i = 0; i < n; i++) {
          const p = power;
          power = [[a * p[0][0] + b * p[1][0], a * p[0][1] + b * p[1][1]], [c * p[0][0] + d * p[1][0], c * p[0][1] + d * p[1][1]]].map(row => row.map(value => value === 0 ? 0 : value));
          const [u, v] = sequence[sequence.length - 1];
          sequence.push([a * u + b * v, c * u + d * v].map(value => value === 0 ? 0 : value));
        }
        return { a, b, c, d, n, initial, power, sequence, final: sequence[n], det: a * d - b * c };
      },
      formula(s, m) {
        return [
          `M=[[${m.a},${m.b}],[${m.c},${m.d}]]；uₙ₊₁=${m.a}uₙ+${m.b}vₙ；vₙ₊₁=${m.c}uₙ+${m.d}vₙ`,
          `M^${m.n}=[[${m.power[0].join(',')}],[${m.power[1].join(',')}]]`,
          `(u₀,v₀)=${vectorText(m.initial)} ⇒ (u${m.n},v${m.n})=${vectorText(m.final)}`,
          `det(M)=${m.det}；${m.det === 0 ? '不可逆仍可求非負整數次冪' : 'M 可逆'}；M⁰=I`
        ];
      },
      draw(s, m) {
        const g = chart();
        const extent = Math.max(1, ...m.sequence.flat().map(Math.abs));
        const mapX = n => g.left + n / Math.max(1, m.n) * (g.right - g.left);
        const mapY = value => (g.top + g.bottom) / 2 - value / extent * (g.bottom - g.top) * 0.44;
        ctx.save();
        ctx.strokeStyle = palette.axis;
        ctx.beginPath(); ctx.moveTo(g.left, g.top); ctx.lineTo(g.left, g.bottom); ctx.moveTo(g.left, mapY(0)); ctx.lineTo(g.right, mapY(0)); ctx.stroke();
        ctx.restore();
        plotSeries(m.sequence.map((v, i) => ({ x: mapX(i), y: mapY(v[0]) })), palette.blue);
        plotSeries(m.sequence.map((v, i) => ({ x: mapX(i), y: mapY(v[1]) })), palette.orange);
        for (let i = 0; i <= m.n; i++) label(String(i), mapX(i) - 4, g.bottom + 24, palette.muted);
        label(`uₙ（藍）與 vₙ（橘）；縱軸範圍 ±${extent}，n=${m.n}`);
        label(`${extent}`, 8, mapY(extent) + 5, palette.muted);
        label('0', 30, mapY(0) - 8, palette.muted);
        label(`−${extent}`, 8, mapY(-extent) + 5, palette.muted);
      },
      status(s, m) { return `作用 ${m.n} 次後得到 ${vectorText(m.final)}；det(M)=${m.det}。`; }
    },
    {
      id: 'space-cross-product',
      title: '空間向量：外積、三角形面積與正射影',
      short: '外積與空間面積',
      tag: '空間向量・正射影',
      course: 'advanced',
      examSignal: '兩向量張成三角形的面積是外積長度的一半。投影之前先確認投影方向不是零向量；零向量沒有方向。',
      prompt: '改變 u、v 的三個分量，觀察三角形、法向方向與 u 在 v 上的投影。畫面為正交投影，面積以三維運算計算。',
      challenge: '令 u、v 平行或其中一個為零，說明面積為何變成 0。再比較 u 在 v 上的投影與兩向量內積。',
      controls: [
        { key: 'ux', label: 'uₓ', min: -4, max: 4, step: 0.5, value: 3 },
        { key: 'uy', label: 'uᵧ', min: -4, max: 4, step: 0.5, value: 1 },
        { key: 'uz', label: 'u_z', min: -4, max: 4, step: 0.5, value: 1 },
        { key: 'vx', label: 'vₓ', min: -4, max: 4, step: 0.5, value: 0 },
        { key: 'vy', label: 'vᵧ', min: -4, max: 4, step: 0.5, value: 3 },
        { key: 'vz', label: 'v_z', min: -4, max: 4, step: 0.5, value: 2 },
        { key: 'view', label: '視角方位角', min: 0, max: 360, step: 1, value: 35, unit: '°' }
      ],
      compute(s) {
        const u = ['ux', 'uy', 'uz'].map(k => bounded(s[k], -4, 4));
        const v = ['vx', 'vy', 'vz'].map(k => bounded(s[k], -4, 4));
        const cross = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
        const magnitude = Math.hypot(...cross);
        const dotValue = u.reduce((sum, value, i) => sum + value * v[i], 0);
        const vSquared = v.reduce((sum, value) => sum + value * value, 0);
        const projection = vSquared > EPS ? v.map(value => value * dotValue / vSquared) : null;
        const uLength = Math.hypot(...u), vLength = Math.hypot(...v);
        const angle = uLength > EPS && vLength > EPS ? Math.acos(Math.max(-1, Math.min(1, dotValue / (uLength * vLength)))) / DEG : null;
        return { u, v, cross, magnitude, area: magnitude / 2, dotValue, vSquared, projection, angle, view: bounded(s.view, 0, 360, 35) };
      },
      formula(s, m) {
        return [
          `u=${vectorText(m.u)}；v=${vectorText(m.v)}；u×v=${vectorText(m.cross)}`,
          `三角形面積 = |u×v|/2 = ${format(m.area)}；u·v=${format(m.dotValue)}`,
          m.projection ? `projᵥu=(u·v)/(v·v) × v = ${vectorText(m.projection)}` : 'v=0：投影方向不存在，projᵥu 不定義',
          m.angle === null ? '有零向量：夾角不定義' : `夾角 θ≈${format(m.angle)}°；畫面縮放法向箭線，運算使用原向量`
        ];
      },
      draw(s, m) {
        const angle = m.view * DEG;
        const elevation = 32 * DEG;
        const project = v => ({ x: Math.cos(angle) * v[0] - Math.sin(angle) * v[1], y: Math.sin(elevation) * (Math.sin(angle) * v[0] + Math.cos(angle) * v[1]) + Math.cos(elevation) * v[2] });
        const normDirection = m.magnitude > EPS ? m.cross.map(value => value / m.magnitude * Math.max(2, Math.hypot(...m.u), Math.hypot(...m.v)) * 0.7) : null;
        const projected = [m.u, m.v, m.projection, normDirection].filter(Boolean).map(project);
        const extent = Math.max(4, ...projected.flatMap(p => [Math.abs(p.x), Math.abs(p.y)]));
        const plane = makePlane({ scale: Math.min(canvas.clientWidth, canvas.clientHeight) / (extent * 2.7) });
        const origin = { x: 0, y: 0 };
        [[4, 0, 0], [0, 4, 0], [0, 0, 4]].forEach((axis, i) => {
          const p = project(axis);
          drawSegment(plane, origin, p, palette.axis, 1.5, [5, 4]);
          drawPoint(plane, p, ['x', 'y', 'z'][i], palette.axis, 2);
        });
        const pu = project(m.u), pv = project(m.v);
        drawFilledPolygon(plane, [origin, pu, pv], palette.fillBlue, palette.blue, 2);
        drawSegment(plane, origin, pu, palette.blue, 3);
        drawSegment(plane, origin, pv, palette.green, 3);
        drawPoint(plane, pu, 'u', palette.blue);
        drawPoint(plane, pv, 'v', palette.green);
        drawPoint(plane, origin, 'O', palette.ink, 3);
        if (m.projection) {
          const p = project(m.projection);
          drawSegment(plane, pu, p, palette.orange, 2, [6, 4]);
          drawPoint(plane, p, '投影', palette.orange, 4);
        }
        if (normDirection) {
          const p = project(normDirection);
          drawSegment(plane, origin, p, palette.purple, 2.5);
          drawPoint(plane, p, '法向方向（縮放）', palette.purple, 3);
        }
        label(`三維三角形面積=${format(m.area)}；投影畫面不能直接量測面積`);
      },
      status(s, m) { return `面積 ${format(m.area)}；${m.magnitude < EPS ? '向量共線或有零向量' : '外積與 u、v 都垂直'}；${m.projection ? '投影有定義' : '零投影方向，投影不定義'}。`; }
    },
    {
      id: 'geometric-locus-ratio',
      title: '距離比軌跡：阿波羅尼斯圓與垂直平分線',
      short: '距離比軌跡',
      tag: '平面幾何・軌跡',
      course: 'A',
      examSignal: '距離比 |PA|=k|PB| 平方後整理成二次式。k=1 必須分開處理，不能代入含 1−k² 的分母。',
      prompt: 'A、B 固定在 x 軸兩側。改變比例 k，觀察距離比軌跡如何在 k=1 時變成直線。',
      challenge: '先找出 k=1 的軌跡，再令 A=B。說明重合焦點時，k=1 與 k≠1 為何分別得到整個平面與單點。',
      controls: [
        { key: 'd', label: '兩定點距離 d', min: 0, max: 6, step: 0.2, value: 4 },
        { key: 'k', label: '距離比 k', min: 0.2, max: 3, step: 0.1, value: 0.6 },
        { key: 'theta', label: '圓上參數角（平面時控制 x）', min: 0, max: 360, step: 1, value: 65, unit: '°' },
        { key: 'y', label: '直線／平面上的 P 縱座標', min: -4, max: 4, step: 0.1, value: 1.5 }
      ],
      compute(s) {
        const d = bounded(s.d, 0, 6, 4), k = bounded(s.k, 0.2, 3, 0.6);
        const A = { x: -d / 2, y: 0 }, B = { x: d / 2, y: 0 };
        const sameRatio = Math.abs(k - 1) < EPS;
        let kind, center = null, radius = null, P;
        if (d < EPS) {
          kind = sameRatio ? 'plane' : 'point';
          P = sameRatio ? { x: 2 * Math.cos(bounded(s.theta, 0, 360, 65) * DEG), y: bounded(s.y, -4, 4, 1.5) } : { x: 0, y: 0 };
        } else if (sameRatio) {
          kind = 'line';
          P = { x: 0, y: bounded(s.y, -4, 4, 1.5) };
        } else {
          kind = 'circle';
          center = { x: -d * (1 + k * k) / (2 * (1 - k * k)), y: 0 };
          radius = k * d / Math.abs(1 - k * k);
          const angle = bounded(s.theta, 0, 360, 65) * DEG;
          P = { x: center.x + radius * Math.cos(angle), y: radius * Math.sin(angle) };
        }
        const PA = Math.hypot(P.x - A.x, P.y - A.y), PB = Math.hypot(P.x - B.x, P.y - B.y);
        return { d, k, A, B, kind, center, radius, P, PA, PB, residual: PA - k * PB, ratio: PB > EPS ? PA / PB : null };
      },
      formula(s, m) {
        const names = { circle: '圓', line: '垂直平分線 x=0', plane: '整個平面', point: '單點 A=B=(0,0)' };
        return [
          `A=(${format(m.A.x)},0)，B=(${format(m.B.x)},0)；軌跡：|PA|=${format(m.k)}|PB|`,
          `整理式：(1−k²)(x²+y²)+d(1+k²)x+(1−k²)d²/4=0`,
          m.kind === 'circle' ? `圓心=(${format(m.center.x)},0)，半徑=kd/|1−k²|=${format(m.radius)}` : `退化情況：${names[m.kind]}；不使用含 1−k² 的分母`,
          `PA=${format(m.PA)}；k·PB=${format(m.k * m.PB)}；${m.ratio === null ? 'PA/PB 不定義（PB=0），距離等式仍成立' : `PA/PB≈${format(m.ratio)}`}`
        ];
      },
      draw(s, m) {
        const extent = Math.max(4, m.d / 2 + 1, Math.abs(m.P.x) + 1, Math.abs(m.P.y) + 1, m.center ? Math.abs(m.center.x) + m.radius + 1 : 0);
        const plane = makePlane({ scale: Math.min(canvas.clientWidth, canvas.clientHeight) / (2.4 * extent) });
        drawGrid(plane);
        if (m.kind === 'circle') {
          ctx.save(); ctx.beginPath(); ctx.arc(plane.sx(m.center.x), plane.sy(0), m.radius * plane.scale, 0, tau); ctx.strokeStyle = palette.green; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
          drawPoint(plane, m.center, 'C', palette.green, 3);
        } else if (m.kind === 'line') {
          drawSegment(plane, { x: 0, y: -extent }, { x: 0, y: extent }, palette.green, 3);
        } else if (m.kind === 'plane') {
          ctx.save(); ctx.fillStyle = palette.fillGreen; ctx.fillRect(0, 0, plane.width, plane.height); ctx.restore();
        }
        drawSegment(plane, m.P, m.A, palette.blue, 2, [6, 4]);
        drawSegment(plane, m.P, m.B, palette.orange, 2, [6, 4]);
        drawPoint(plane, m.A, m.d < EPS ? 'A=B' : 'A', palette.blue);
        if (m.d >= EPS) drawPoint(plane, m.B, 'B', palette.orange);
        drawPoint(plane, m.P, 'P', palette.purple);
        label(`距離等式殘差 PA−k·PB≈${format(m.residual, 8)}；畫面自動縮放`);
      },
      status(s, m) { return `k=${format(m.k)}；軌跡為${{ circle: '圓', line: '垂直平分線', plane: '整個平面', point: '單點' }[m.kind]}。`; }
    },
    {
      id: 'piecewise-continuity',
      title: '分段函數：單側極限、連續與可微',
      short: '分段連續與可微',
      tag: '極限・微分',
      course: 'advanced',
      examSignal: '連續需要左極限、右極限與函數值三者相等。討論導數時，差商必須扣掉真正的 f(0)，不能直接比較兩段公式的斜率。',
      prompt: '左段為 L+mₗx，右段為 R+mᵣx+qx²，另指定 f(0)=V。比較空心端點、實心點與單側差商。',
      challenge: '先製造左右極限相等但 f(0) 不同的例子，再製造連續但不可微的例子；用 h→0 的差商解釋。',
      controls: [
        { key: 'L', label: '左極限 L', min: -3, max: 3, step: 0.1, value: 1 },
        { key: 'R', label: '右極限 R', min: -3, max: 3, step: 0.1, value: 1 },
        { key: 'V', label: '函數值 f(0)=V', min: -3, max: 3, step: 0.1, value: 1 },
        { key: 'ml', label: '左段斜率 mₗ', min: -3, max: 3, step: 0.1, value: -1 },
        { key: 'mr', label: '右段一次係數 mᵣ', min: -3, max: 3, step: 0.1, value: 1 },
        { key: 'q', label: '右段二次係數 q', min: -1, max: 1, step: 0.1, value: 0.3 },
        { key: 'h', label: '差商距離 h（正值）', min: 0.02, max: 1, step: 0.02, value: 0.2 }
      ],
      compute(s) {
        const L = bounded(s.L, -3, 3, 1), R = bounded(s.R, -3, 3, 1), V = bounded(s.V, -3, 3, 1);
        const ml = bounded(s.ml, -3, 3, -1), mr = bounded(s.mr, -3, 3, 1), q = bounded(s.q, -1, 1, 0.3), h = bounded(s.h, 0.02, 1, 0.2);
        const leftMatches = Math.abs(L - V) < EPS, rightMatches = Math.abs(R - V) < EPS;
        const limitExists = Math.abs(L - R) < EPS;
        const continuous = leftMatches && rightMatches;
        const differentiable = continuous && Math.abs(ml - mr) < EPS;
        const leftDerivative = leftMatches ? ml : L > V ? -Infinity : Infinity;
        const rightDerivative = rightMatches ? mr : R > V ? Infinity : -Infinity;
        const leftPoint = { x: -h, y: L - ml * h }, rightPoint = { x: h, y: R + mr * h + q * h * h };
        return { L, R, V, ml, mr, q, h, limitExists, continuous, differentiable, leftDerivative, rightDerivative, leftPoint, rightPoint, leftQuotient: (leftPoint.y - V) / -h, rightQuotient: (rightPoint.y - V) / h };
      },
      formula(s, m) {
        const derivativeText = value => Number.isFinite(value) ? format(value) : `${value < 0 ? '−' : '+'}∞（無有限單側導數）`;
        return [
          `f(x)=${format(m.L)}+${format(m.ml)}x（x<0）；f(0)=${format(m.V)}；f(x)=${format(m.R)}+${format(m.mr)}x+${format(m.q)}x²（x>0）`,
          `左極限=${format(m.L)}；右極限=${format(m.R)}；雙側極限${m.limitExists ? `=${format(m.L)}` : '不存在'}`,
          `連續：${m.continuous ? '是' : '否'}；可微：${m.differentiable ? `是，f′(0)=${format(m.ml)}` : '否'}`,
          `h=${format(m.h)}：左差商=${format(m.leftQuotient)}；右差商=${format(m.rightQuotient)}`,
          `h→0⁺：左差商→${derivativeText(m.leftDerivative)}；右差商→${derivativeText(m.rightDerivative)}`
        ];
      },
      draw(s, m) {
        const extent = Math.max(5, Math.abs(m.L - 3 * m.ml) + 1, Math.abs(m.R + 3 * m.mr + 9 * m.q) + 1, Math.abs(m.V) + 1);
        const plane = makePlane({ scale: Math.min(canvas.clientWidth / 9, canvas.clientHeight / (2.5 * extent)) });
        drawGrid(plane);
        plotFunction(plane, x => m.L + m.ml * x, -3, -0.001, palette.blue, 3);
        plotFunction(plane, x => m.R + m.mr * x + m.q * x * x, 0.001, 3, palette.green, 3);
        drawSegment(plane, { x: 0, y: m.V }, m.leftPoint, palette.orange, 2, [5, 4]);
        drawSegment(plane, { x: 0, y: m.V }, m.rightPoint, palette.purple, 2, [5, 4]);
        openPoint(plane, { x: 0, y: m.L }, palette.blue);
        openPoint(plane, { x: 0, y: m.R }, palette.green);
        drawPoint(plane, { x: 0, y: m.V }, 'f(0)', palette.red, 5);
        drawPoint(plane, m.leftPoint, '−h', palette.orange, 3);
        drawPoint(plane, m.rightPoint, '+h', palette.purple, 3);
        label(`連續：${m.continuous ? '是' : '否'}；可微：${m.differentiable ? '是' : '否'}；虛線是以 f(0) 為基準的割線`);
      },
      status(s, m) { return `左／右極限 ${format(m.L)}／${format(m.R)}，f(0)=${format(m.V)}；${m.continuous ? '連續' : '不連續'}，${m.differentiable ? '可微' : '不可微'}。`; }
    },
    {
      id: 'trig-inequality-intervals',
      title: '三角不等式：合成相位與完整解區間',
      short: '三角不等式區間',
      tag: '三角函數・解析區間',
      course: 'A',
      examSignal: 'a sin x+b cos x 可合成 R sin(x+φ)。解不等式時先比較 c 與 ±R，再把所有週期區間與題目指定範圍取交集。',
      prompt: '在閉區間 [0,2π] 解 a sin x+b cos x≥c。綠色區段含邊界，尖峰等於 c 時仍可能留下單點解。',
      challenge: '令 a=1、b=0，分別測試 c=1、0、−1。再令 a=b=0，說明為什麼不能除以 R。',
      controls: [
        { key: 'a', label: 'sin x 係數 a', min: -3, max: 3, step: 0.1, value: 1.5 },
        { key: 'b', label: 'cos x 係數 b', min: -3, max: 3, step: 0.1, value: 1 },
        { key: 'c', label: '下界 c', min: -4, max: 4, step: 0.1, value: 0.8 },
        { key: 'theta', label: '觀察角 x', min: 0, max: 360, step: 1, value: 60, unit: '°' }
      ],
      compute(s) {
        const a = bounded(s.a, -3, 3, 1.5), b = bounded(s.b, -3, 3, 1), c = bounded(s.c, -4, 4, 0.8);
        const R = Math.hypot(a, b), phase = R > EPS ? Math.atan2(b, a) : 0;
        let intervals = [], alpha = null, kind;
        if (R < EPS) {
          kind = c <= 0 ? 'all' : 'none';
          if (kind === 'all') intervals = [[0, tau]];
        } else if (c > R + EPS) kind = 'none';
        else if (c <= -R + EPS) { kind = 'all'; intervals = [[0, tau]]; }
        else {
          kind = 'partial';
          alpha = Math.asin(Math.max(-1, Math.min(1, c / R)));
          const candidates = [];
          for (let period = -2; period <= 2; period++) {
            const start = alpha - phase + tau * period;
            const end = Math.PI - alpha - phase + tau * period;
            if (end < -EPS || start > tau + EPS) continue;
            const lo = Math.max(0, Math.min(tau, start)), hi = Math.max(0, Math.min(tau, end));
            if (lo <= hi + EPS) candidates.push([lo, Math.max(lo, hi)]);
          }
          candidates.sort((u, v) => u[0] - v[0]);
          for (const interval of candidates) {
            const previous = intervals[intervals.length - 1];
            if (previous && interval[0] <= previous[1] + EPS) previous[1] = Math.max(previous[1], interval[1]);
            else intervals.push(interval);
          }
        }
        const x = bounded(s.theta, 0, 360, 60) * DEG;
        const value = a * Math.sin(x) + b * Math.cos(x);
        const measure = intervals.reduce((sum, [lo, hi]) => sum + hi - lo, 0);
        return { a, b, c, R, phase, alpha, kind, intervals, x, value, measure, satisfies: value >= c - EPS };
      },
      formula(s, m) {
        const solution = m.intervals.map(([lo, hi]) => Math.abs(hi - lo) < EPS ? `{${format(lo / DEG, 4)}°}` : `[${format(lo / DEG, 4)}°,${format(hi / DEG, 4)}°]`).join(' ∪ ') || '∅';
        return [
          `R=√(a²+b²)=${format(m.R)}；${m.R < EPS ? 'R=0，左式恆為 0，直接比較 0 與 c' : `φ=atan2(b,a)≈${format(m.phase / DEG)}°；a sin x+b cos x=R sin(x+φ)`}`,
          m.alpha === null ? (m.kind === 'all' ? '所有 x∈[0,2π] 都成立' : '在 [0,2π] 沒有解') : `α=arcsin(c/R)；解析區間 [α−φ+2jπ,π−α−φ+2jπ] ∩ [0,2π]`,
          `解集（角度端點為近似值；閉端點）：${solution}`,
          `解集總長≈${format(m.measure / DEG)}°；單點解長度為 0，但仍屬於解集`,
          `x≈${format(m.x / DEG)}°，左式=${format(m.value)}：${m.satisfies ? '滿足' : '不滿足'}不等式`
        ];
      },
      draw(s, m) {
        const g = chart();
        const extent = Math.max(1, m.R, Math.abs(m.c)) * 1.2;
        const mapX = x => g.left + x / tau * (g.right - g.left);
        const mapY = y => (g.top + g.bottom) / 2 - y / extent * (g.bottom - g.top) / 2;
        ctx.save();
        for (const [lo, hi] of m.intervals) {
          ctx.fillStyle = palette.fillGreen;
          ctx.fillRect(mapX(lo), g.top, Math.max(2, mapX(hi) - mapX(lo)), g.bottom - g.top);
          ctx.strokeStyle = palette.green;
          ctx.lineWidth = 5;
          ctx.beginPath(); ctx.moveTo(mapX(lo), g.bottom); ctx.lineTo(mapX(hi), g.bottom); ctx.stroke();
          [lo, hi].forEach(x => { ctx.beginPath(); ctx.arc(mapX(x), g.bottom, 4, 0, tau); ctx.fillStyle = palette.green; ctx.fill(); });
        }
        ctx.strokeStyle = palette.axis; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(g.left, mapY(0)); ctx.lineTo(g.right, mapY(0)); ctx.stroke();
        ctx.strokeStyle = palette.orange; ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.moveTo(g.left, mapY(m.c)); ctx.lineTo(g.right, mapY(m.c)); ctx.stroke();
        ctx.setLineDash([]); ctx.strokeStyle = palette.blue; ctx.lineWidth = 3; ctx.beginPath();
        for (let i = 0; i <= 360; i++) {
          const x = i / 360 * tau, y = m.a * Math.sin(x) + m.b * Math.cos(x);
          if (i === 0) ctx.moveTo(mapX(x), mapY(y)); else ctx.lineTo(mapX(x), mapY(y));
        }
        ctx.stroke();
        ctx.beginPath(); ctx.arc(mapX(m.x), mapY(m.value), 6, 0, tau); ctx.fillStyle = m.satisfies ? palette.green : palette.red; ctx.fill();
        ctx.restore();
        ['0', 'π/2', 'π', '3π/2', '2π'].forEach((text, i) => label(text, mapX(i * Math.PI / 2) - 9, g.bottom + 25, palette.muted));
        label(`綠色：解集；橘色：c=${format(m.c)}；藍色：a sin x+b cos x`);
      },
      status(s, m) { return `${m.intervals.length ? '有解' : '無解'}；解集總長≈${format(m.measure / DEG)}°；觀察點${m.satisfies ? '符合' : '不符合'}條件。`; }
    },
    {
      id: 'discrete-convolution',
      title: '獨立骰子和：精確分布與離散卷積',
      short: '骰子和的分布',
      tag: '機率・隨機變數',
      course: 'A',
      examSignal: '兩個獨立公平骰子的每個有序結果等可能，但點數和不等可能。先列舉 (X,Y)，再把相同總和的結果合併。',
      prompt: 'X 均勻取 1 到 a、Y 均勻取 1 到 b，且兩者獨立。柱高為 P(X+Y=s)，橘柱對應選定的總和。',
      challenge: '比較兩個六面骰與一個四面、一個八面骰的和分布。驗證所有柱子的機率總和為 1，並測試一面骰的退化情況。',
      controls: [
        { key: 'a', label: '第一個骰子面數 a', min: 1, max: 12, step: 1, value: 6 },
        { key: 'b', label: '第二個骰子面數 b', min: 1, max: 12, step: 1, value: 6 },
        { key: 'target', label: '指定總和 s', min: 2, max: 24, step: 1, value: 7 }
      ],
      compute(s) {
        const a = integer(s.a, 1, 12, 6), b = integer(s.b, 1, 12, 6), target = integer(s.target, 2, 24, 7);
        const counts = Array(a + b - 1).fill(0), examples = [];
        for (let x = 1; x <= a; x++) for (let y = 1; y <= b; y++) {
          counts[x + y - 2]++;
          if (x + y === target && examples.length < 8) examples.push(`(${x},${y})`);
        }
        const total = a * b;
        const selectedCount = counts[target - 2] || 0;
        const cdfCount = counts.reduce((sum, count, i) => sum + (i + 2 <= target ? count : 0), 0);
        return { a, b, target, counts, probabilities: counts.map(count => count / total), total, selectedCount, cdfCount, examples, probability: selectedCount / total, cdf: cdfCount / total, mean: (a + b + 2) / 2, variance: (a * a + b * b - 2) / 12 };
      },
      formula(s, m) {
        return [
          `獨立且公平：每個有序結果 (X,Y) 的機率為 1/(${m.a}×${m.b})=1/${m.total}`,
          `N(s)=max(0,min(a,s−1)−max(1,s−b)+1)；P(S=${m.target})=${m.selectedCount}/${m.total}≈${format(m.probability, 5)}`,
          `P(S≤${m.target})=${m.cdfCount}/${m.total}≈${format(m.cdf, 5)}；ΣₛP(S=s)=1`,
          `E[S]=(a+b+2)/2=${format(m.mean)}；Var(S)=(a²+b²−2)/12=${format(m.variance)}`,
          `指定總和的樣本（至多 8 筆）：${m.examples.join('、') || '總和超出可達範圍'}`
        ];
      },
      draw(s, m) {
        drawSimpleBarChart(m.probabilities, m.counts.map((_, i) => String(i + 2)), m.target <= m.a + m.b ? m.target - 2 : -1, { pad: 62 });
        label(`P(S=${m.target})=${m.selectedCount}/${m.total}；柱高為機率，總和範圍 2 至 ${m.a + m.b}`);
        label(`最高柱=${format(Math.max(...m.probabilities), 4)}；E[S]=${format(m.mean)}`, 24, canvas.clientHeight - 15, palette.muted);
      },
      status(s, m) { return `指定總和 ${m.target} 有 ${m.selectedCount}/${m.total} 個等可能結果；機率 ${format(m.probability * 100, 2)}%。`; }
    }
  ];
};
