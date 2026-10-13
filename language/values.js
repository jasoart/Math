/* Bounded, immutable vector/matrix values and numerical linear algebra. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.MathScriptValues = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const LIMITS = Object.freeze({ vector: 256, matrix: 8 });
  const bad = text => { throw Error(text); };
  function shape(value) {
    if (typeof value === 'number') return [];
    if (!Array.isArray(value) || !value.length) bad('資料需為實數、非空向量或矩形矩陣。');
    if (value.every(v => typeof v === 'number')) { if (value.length > LIMITS.vector) bad('向量最多 256 個分量。'); return [value.length]; }
    if (value.length <= LIMITS.matrix && value.every(row => Array.isArray(row) && row.length === value[0].length && row.length > 0 && row.length <= LIMITS.matrix && row.every(v => typeof v === 'number'))) return [value.length, value[0].length];
    bad('矩陣需為 1～8 列、1～8 欄的矩形實數陣列；不支援混合或三層資料。');
  }
  function entries(value) { const s = shape(value); return s.length === 0 ? [value] : s.length === 1 ? value : value.flat(); }
  function checked(value) { if (!entries(value).every(Number.isFinite)) bad('向量、矩陣與資料結果必須全部為有限實數。'); return value; }
  function vector(value) { if (shape(value).length !== 1) bad('這個運算需要一維向量。'); return checked(value); }
  function matrix(value) { if (shape(value).length !== 2) bad('這個運算需要二維矩陣。'); return checked(value); }
  function square(value) { const a = matrix(value); if (a.length !== a[0].length) bad('這個運算需要方陣。'); return a; }
  function scalar(value) { if (!Number.isFinite(value)) bad('這個引數需要有限實數。'); return value; }
  function index(value, size) { if (!Number.isInteger(value) || value < 1 || value > size) bad(`索引需為 1～${size} 的整數。`); return value - 1; }
  function map(value, fn) { const s = shape(value); return s.length === 0 ? fn(value) : s.length === 1 ? value.map(fn) : value.map(row => row.map(fn)); }
  function same(a, b) { if (JSON.stringify(shape(a)) !== JSON.stringify(shape(b))) bad('向量／矩陣的尺寸不相符。'); }
  function binary(op, a, b) {
    const sa = shape(a), sb = shape(b);
    if (op === '==' || op === '!=') { const right = entries(b), equal = JSON.stringify(sa) === JSON.stringify(sb) && entries(a).every((v, i) => v === right[i]); return Number(op === '==' ? equal : !equal); }
    if (op === '+' || op === '-') {
      same(a, b); const f = op === '+' ? (x, y) => x + y : (x, y) => x - y;
      return checked(sa.length === 1 ? a.map((v, i) => f(v, b[i])) : a.map((row, i) => row.map((v, j) => f(v, b[i][j]))));
    }
    if (op === '*' && sa.length !== sb.length && (!sa.length || !sb.length)) return checked(!sa.length ? map(b, n => a * n) : map(a, n => n * b));
    if (op === '/' && sa.length && !sb.length) { if (b === 0) bad('向量／矩陣不可除以零。'); return checked(map(a, n => n / b)); }
    bad('資料運算支援同尺寸 +、− 與純量倍乘／除法；內積用 dot，矩陣乘法用 matmul。');
  }
  function total(data) { const a = vector(data); let sum = 0, c = 0; for (const v of a) { const next = sum + v; c += Math.abs(sum) >= Math.abs(v) ? (sum - next) + v : (v - next) + sum; sum = next; } return scalar(sum + c); }
  function mean(data) {
    const a = vector(data);
    try { return total(a) / a.length; }
    catch { const scale = Math.max(...a.map(Math.abs)); return scalar(total(a.map(v => v / scale)) / a.length * scale); }
  }
  function deviation(data, sample = false) {
    const a = vector(data), n = a.length;
    if (sample && n < 2) bad('樣本變異數至少需要兩筆資料。');
    // Center before scaling when possible to retain small deviations from a
    // large common offset. Normalize first if subtraction itself overflows.
    const center = mean(a), differences = a.map(v => v - center), finite = differences.every(Number.isFinite);
    const scale = Math.max(...(finite ? differences : a).map(Math.abs));
    if (!scale) return 0;
    const normalized = finite ? differences.map(v => v / scale) : a.map(v => v / scale - center / scale);
    return scalar(Math.hypot(...normalized) / Math.sqrt(n - Number(sample)) * scale);
  }
  function variance(data, sample = false) { return scalar(deviation(data, sample) ** 2); }
  function dot(a, b) { vector(a); vector(b); same(a, b); return total(a.map((v, i) => v * b[i])); }
  function transpose(data) { const a = matrix(data); return a[0].map((_, c) => a.map(row => row[c])); }
  function matmul(left, right) {
    const a = matrix(left), sr = shape(right);
    if (sr.length === 1) { vector(right); if (a[0].length !== right.length) bad('矩陣欄數需等於向量長度。'); return a.map(row => dot(row, right)); }
    const b = matrix(right); if (a[0].length !== b.length) bad('矩陣乘法需要左欄數等於右列數。');
    const columns = transpose(b); return a.map(row => columns.map(col => dot(row, col)));
  }
  // Partial pivoting with row scaling. Determinant permits exact singularity;
  // solve/inverse also reject numerically near-singular pivots and check residuals.
  function eliminate(data, rhs, strict) {
    const original = square(data), n = original.length, a = original.map(row => [...row]);
    const b = rhs ? rhs.map(row => [...row]) : null, scales = a.map(row => Math.max(...row.map(Math.abs))); let sign = 1, mantissa = 1, exponent = 0;
    for (let k = 0; k < n; k++) {
      let pivot = k, score = -1;
      for (let i = k; i < n; i++) { const ratio = scales[i] ? Math.abs(a[i][k]) / scales[i] : 0; if (ratio > score) { score = ratio; pivot = i; } }
      if (a[pivot][k] === 0) { if (strict) bad('矩陣奇異，無法求唯一解或反矩陣。'); return { determinant: 0 }; }
      if (strict && score <= 1e-12) bad('矩陣接近奇異，無法可靠求解；請調整係數或尺度。');
      if (pivot !== k) { [a[pivot], a[k]] = [a[k], a[pivot]]; [scales[pivot], scales[k]] = [scales[k], scales[pivot]]; if (b) [b[pivot], b[k]] = [b[k], b[pivot]]; sign *= -1; }
      const diagonal = scalar(a[k][k]), power = Math.min(1023, Math.floor(Math.log2(Math.abs(diagonal))));
      sign *= Math.sign(diagonal); exponent += power; mantissa *= Math.abs(diagonal) / 2 ** power;
      if (mantissa >= 2) { mantissa /= 2; exponent++; }
      for (let i = k + 1; i < n; i++) { const factor = a[i][k] / diagonal; a[i][k] = 0;
        for (let j = k + 1; j < n; j++) a[i][j] -= factor * a[k][j];
        if (b) for (let j = 0; j < b[i].length; j++) b[i][j] -= factor * b[k][j];
      }
    }
    if (!b) {
      const value = exponent < -1074 ? mantissa * 2 ** (exponent + 1074) * Number.MIN_VALUE : mantissa * 2 ** exponent;
      if (value === 0) bad('行列式小於浮點數可表示範圍，無法可靠區分零；請調整尺度。');
      return { determinant: scalar(sign * value) };
    }
    const solution = Array.from({ length: n }, () => Array(b[0].length).fill(0));
    for (let i = n - 1; i >= 0; i--) for (let c = 0; c < b[0].length; c++) { let v = b[i][c]; for (let j = i + 1; j < n; j++) v -= a[i][j] * solution[j][c]; solution[i][c] = v / a[i][i]; }
    checked(solution);
    const reconstructed = matmul(original, solution), sizeA = Math.max(...original.map(row => total(row.map(Math.abs)))), sizeX = Math.max(...solution.map(row => total(row.map(Math.abs)))), sizeB = Math.max(...rhs.map(row => total(row.map(Math.abs))));
    const residual = Math.max(...reconstructed.map((row, i) => total(row.map((v, j) => Math.abs(v - rhs[i][j])))));
    const scale = Math.max(Number.MIN_VALUE, sizeA * sizeX + sizeB);
    if (!Number.isFinite(scale) || !Number.isFinite(residual) || residual / scale > 1e-10) bad('線性系統殘差或尺度無法可靠核對，請調整係數後再求解。');
    return { solution };
  }
  const identity = n => { if (!Number.isInteger(n) || n < 1 || n > LIMITS.matrix) bad('單位矩陣大小需為 1～8 的整數。'); return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => Number(i === j))); };
  const builtins = new Map([
    ['dot', [dot, 2]],
    ['cross', [(a, b) => { vector(a); vector(b); if (a.length !== 3 || b.length !== 3) bad('外積需要兩個三維向量。'); return checked([a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]); }, 2]],
    ['norm', [v => scalar(Math.hypot(...entries(checked(v)))), 1]],
    ['unit', [v => { const a = vector(v), scale = Math.max(...a.map(Math.abs)); if (!scale) bad('零向量沒有單位方向。'); const scaled = a.map(x => x / scale), n = Math.hypot(...scaled); return checked(scaled.map(x => x / n)); }, 1]],
    ['component', [(v, i) => { const a = vector(v); return a[index(i, a.length)]; }, 2]],
    ['length', [v => vector(v).length, 1]],
    ['row', [(v, i) => { const a = matrix(v); return [...a[index(i, a.length)]]; }, 2]],
    ['column', [(v, j) => { const a = matrix(v), i = index(j, a[0].length); return a.map(row => row[i]); }, 2]],
    ['entry', [(v, i, j) => { const a = matrix(v); return a[index(i, a.length)][index(j, a[0].length)]; }, 3]],
    ['transpose', [transpose, 1]], ['matmul', [matmul, 2]], ['identity', [identity, 1]],
    ['det', [v => eliminate(v, null, false).determinant, 1]],
    ['trace', [v => { const a = square(v); return total(a.map((row, i) => row[i])); }, 1]],
    ['inverse', [v => { const a = square(v); return eliminate(a, identity(a.length), true).solution; }, 1]],
    ['solve', [(v, rhs) => { const a = square(v); vector(rhs); if (a.length !== rhs.length) bad('右端向量長度需等於矩陣列數。'); return eliminate(a, rhs.map(x => [x]), true).solution.map(row => row[0]); }, 2]],
    ['total', [total, 1]], ['mean', [mean, 1]],
    ['median', [v => { const a = [...vector(v)].sort((a, b) => a - b), i = Math.floor(a.length / 2); return a.length % 2 ? a[i] : a[i-1]/2 + a[i]/2; }, 1]],
    ['variance', [v => variance(v), 1]], ['samplevar', [v => variance(v, true), 1]], ['stdev', [v => deviation(v), 1]],
    ['linspace', [(a, b, n) => { scalar(a); scalar(b); if (!Number.isInteger(n) || n < 2 || n > LIMITS.vector) bad('linspace 的筆數需為 2～256 的整數。'); return checked(Array.from({ length: n }, (_, i) => i === n - 1 ? b : a * (1 - i / (n - 1)) + b * (i / (n - 1)))); }, 3]]
  ]);
  function cost(name, args) { const cells = args.reduce((n, value) => n + entries(value).length, 0); return cells + (['det', 'inverse', 'solve', 'matmul'].includes(name) ? 4 * LIMITS.matrix ** 3 : 0); }
  return Object.freeze({ LIMITS, shape, entries, checked, vector, matrix, map, binary, builtins, cost });
});
