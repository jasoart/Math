/* MathScript 1.0: bounded, declarative mathematics. No JavaScript evaluation. */
(function (root, factory) {
  'use strict';
  const api = factory(typeof module === 'object' && module.exports ? require('../graph/math.js') : root.GraphMath,
    typeof module === 'object' && module.exports ? require('../graph/render.js') : root.GraphRender);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MathScript = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (math, render) {
  'use strict';
  const VERSION = '1.0.0';
  const LIMITS = Object.freeze({ source: 24000, tokens: 6000, statements: 160, depth: 48, steps: 1500000, plots: 12, rows: 200, parameters: 12 });
  const palette = ['#087f73', '#b7742a', '#6468b0', '#bd5368', '#367ca5', '#749447'];
  const aliases = { '標題': 'title', '參數': 'param', '設': 'let', '函數': 'fn', '視窗': 'view', '繪圖': 'plot', '曲線': 'curve', '點': 'point', '顯示': 'print', '表格': 'table', '積分': 'integral', '求根': 'roots', '從': 'from', '到': 'to', '每': 'step', '顏色': 'color', '標籤': 'label' };
  const keywords = new Set([...Object.values(aliases)]);
  const builtins = new Map([
    ['sin', [Math.sin, 1]], ['cos', [Math.cos, 1]], ['tan', [Math.tan, 1]],
    ['asin', [Math.asin, 1]], ['acos', [Math.acos, 1]], ['atan', [Math.atan, 1]],
    ['sqrt', [Math.sqrt, 1]], ['cbrt', [Math.cbrt, 1]], ['abs', [Math.abs, 1]],
    ['exp', [Math.exp, 1]], ['ln', [Math.log, 1]], ['log', [Math.log10, 1]],
    ['floor', [Math.floor, 1]], ['ceil', [Math.ceil, 1]], ['round', [Math.round, 1]],
    ['min', [Math.min, 2]], ['max', [Math.max, 2]], ['if', [null, 3]]
  ]);
  const constants = new Map([['pi', Math.PI], ['e', Math.E]]);
  const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
  class ScriptError extends Error {
    constructor(message, token = {}) { super(message); this.name = 'MathScriptError'; this.line = token.line || 1; this.column = token.column || 1; }
  }
  function fail(message, token) { throw new ScriptError(message, token); }
  function tokenize(source) {
    if (typeof source !== 'string' || source.length > LIMITS.source) fail(`程式不可超過 ${LIMITS.source} 字。`);
    const tokens = []; let i = 0, line = 1, column = 1;
    const push = (kind, value, start, l, c) => { tokens.push({ kind, value, start, end: i, line: l, column: c }); if (tokens.length > LIMITS.tokens) fail('程式太複雜，請拆成較小作品。', tokens.at(-1)); };
    while (i < source.length) {
      let ch = source[i], start = i, l = line, c = column;
      if (ch === '\r') { i++; continue; }
      if (ch === '\n' || ch === ';') { i++; push('endline', ch, start, l, c); if (ch === '\n') { line++; column = 1; } else column++; continue; }
      if (/\s/.test(ch)) { i++; column++; continue; }
      if (ch === '#' || source.slice(i, i + 2) === '//') { while (i < source.length && source[i] !== '\n') { i++; column++; } continue; }
      if (ch === '"') {
        let raw = '"'; i++; column++; let closed = false;
        while (i < source.length && source[i] !== '\n') {
          ch = source[i++]; column++; raw += ch;
          if (ch === '"') { closed = true; break; }
          if (ch === '\\' && i < source.length && source[i] !== '\n') { raw += source[i++]; column++; }
        }
        if (!closed) fail('文字缺少結尾雙引號。', { line: l, column: c });
        let value; try { value = JSON.parse(raw); } catch { fail('文字跳脫符號無效，請使用 JSON 雙引號格式。', { line: l, column: c }); }
        if (value.length > 240) fail('標題或標籤最多 240 字。', { line: l, column: c });
        push('string', value, start, l, c); continue;
      }
      const num = source.slice(i).match(/^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/);
      if (num) { i += num[0].length; column += num[0].length; const value = Number(num[0]); if (!Number.isFinite(value)) fail('數字超出可計算範圍。', { line: l, column: c }); push('number', value, start, l, c); continue; }
      const word = source.slice(i).match(/^[\p{L}_][\p{L}\p{N}_]*/u);
      if (word) { i += word[0].length; column += word[0].length; const value = word[0] === 'π' ? 'pi' : aliases[word[0]] || word[0]; push('name', value, start, l, c); continue; }
      const op = source.slice(i).match(/^(?:<=|>=|==|!=|&&|\|\||\*\*|[+\-*/^(),=<>−×÷≤≥])/);
      if (!op) fail(`不支援「${ch}」。`, { line: l, column: c });
      i += op[0].length; column += op[0].length;
      const value = ({ '−': '-', '×': '*', '÷': '/', '≤': '<=', '≥': '>=', '**': '^' })[op[0]] || op[0];
      push(value, value, start, l, c);
    }
    tokens.push({ kind: 'eof', line, column, start: i, end: i }); return tokens;
  }
  function compile(source) {
    const tokens = tokenize(source); let pos = 0, depth = 0;
    const peek = () => tokens[pos], take = () => tokens[pos++];
    const is = value => peek().value === value;
    function need(value) { if (!is(value)) fail(`這裡需要 ${value}。`, peek()); return take(); }
    function name() { const t = take(); if (t.kind !== 'name' || keywords.has(t.value) || builtins.has(t.value) || constants.has(t.value) || forbidden.has(t.value) || t.value.length > 32) fail('請使用不超過 32 字且不與指令、常數或內建函數重複的名稱。', t); return t.value; }
    function string() { const t = take(); if (t.kind !== 'string') fail('請用雙引號包住文字。', t); return t.value; }
    const precedence = { '||': 1, '&&': 2, '<': 3, '>': 3, '<=': 3, '>=': 3, '==': 3, '!=': 3, '+': 10, '-': 10, '*': 20, '/': 20, '^': 30 };
    function expr(min = 0) {
      if (++depth > LIMITS.depth) fail('算式巢狀過深。', peek());
      const t = take(); let node;
      if (t.kind === 'number') node = { type: 'number', value: t.value, token: t };
      else if (t.kind === '+' || t.kind === '-') node = { type: 'unary', op: t.kind, child: expr(25), token: t };
      else if (t.kind === '(') { node = expr(); need(')'); }
      else if (t.kind === 'name' && !keywords.has(t.value) && !forbidden.has(t.value)) {
        if (is('(')) {
          take(); const args = []; if (!is(')')) { args.push(expr()); while (is(',')) { take(); args.push(expr()); } }
          need(')'); if (args.length > 8) fail('函數最多 8 個引數。', t);
          node = { type: 'call', name: t.value, args, token: t };
        } else node = { type: 'variable', name: t.value, token: t };
      } else fail('需要數字、變數或完整算式。', t);
      node.height = node.height || 1 + Math.max(0, ...[node.child, ...(node.args || [])].filter(Boolean).map(n => n.height));
      if (node.height > LIMITS.depth) fail('算式結構過深，請拆成多個 let 或函數。', t);
      while (Object.hasOwn(precedence, peek().kind) && precedence[peek().kind] >= min) {
        const op = take(), p = precedence[op.kind], right = expr(op.kind === '^' ? p : p + 1);
        if (p === 3 && node.type === 'binary' && precedence[node.op] === 3) fail('連續比較請寫成 x > 0 && x < 2。', op);
        node = { type: 'binary', op: op.kind, left: node, right, token: op, height: 1 + Math.max(node.height, right.height) };
        if (node.height > LIMITS.depth) fail('算式結構過深，請拆成多個 let 或函數。', op);
      }
      depth--; return node;
    }
    function range(withStep) { need('from'); const from = expr(); need('to'); const to = expr(); let step = null; if (withStep && is('step')) { take(); step = expr(); } return { from, to, step }; }
    function style() { const result = {}; while (is('color') || is('label')) { const key = take().value; if (Object.hasOwn(result, key)) fail(`重複的 ${key}。`, peek()); result[key] = string(); if (key === 'color' && !/^#[0-9a-f]{6}$/i.test(result[key])) fail('顏色請使用 #RRGGBB。', tokens[pos - 1]); } return result; }
    const statements = [];
    while (peek().kind !== 'eof') {
      if (peek().kind === 'endline') { take(); continue; }
      const t = take(), s = { type: t.value, token: t };
      switch (s.type) {
        case 'title': s.value = string(); break;
        case 'param': case 'let':
          s.name = name(); if (['x', 't'].includes(s.name)) fail('x 與 t 保留給繪圖與取樣。', t);
          need('='); s.value = expr(); if (s.type === 'param') Object.assign(s, range(true)); break;
        case 'fn': {
          s.name = name(); if (['x', 't'].includes(s.name)) fail('x 與 t 保留給取樣。', t);
          need('('); s.args = [name()]; while (is(',')) { take(); s.args.push(name()); } need(')');
          if (s.args.length > 8 || new Set(s.args).size !== s.args.length) fail('函數需要 1–8 個不重複的引數。', t);
          need('='); s.value = expr(); break;
        }
        case 'view': s.values = [expr()]; for (let i = 0; i < 3; i++) { need(','); s.values.push(expr()); } break;
        case 'plot': case 'print': s.value = expr(); Object.assign(s, style()); break;
        case 'curve': case 'point': need('('); s.x = expr(); need(','); s.y = expr(); need(')'); if (s.type === 'curve') Object.assign(s, range(false)); Object.assign(s, style()); break;
        case 'table': case 'integral': case 'roots': s.value = expr(); Object.assign(s, range(s.type === 'table')); break;
        default: fail(`不認得指令「${t.value || ''}」。請參考語法速查。`, t);
      }
      if (!['endline', 'eof'].includes(peek().kind)) fail('每行寫一個指令；乘法請明確使用 *。', peek());
      statements.push(s); if (statements.length > LIMITS.statements) fail('指令過多，請拆成較小作品。', t);
    }
    return { version: VERSION, source, statements };
  }
  function run(program, options = {}) {
    if (typeof program === 'string') program = compile(program);
    let steps = 0; const overrides = options.parameters || {}, variables = new Map(constants), functions = new Map();
    const result = { version: VERSION, title: '未命名實驗', parameters: [], plots: [], points: [], outputs: [], warnings: [], view: { xmin: -6, xmax: 6, ymin: -4, ymax: 6 }, stats: {} };
    function tick(token) { if (++steps > LIMITS.steps) fail('已達計算上限，請簡化函數或縮小取樣範圍。', token); }
    function validate(node, scope, funcs) {
      if (node.type === 'variable' && !scope.has(node.name)) fail(`尚未定義「${node.name}」。`, node.token);
      if (node.type === 'call') {
        const fn = builtins.get(node.name) || funcs.get(node.name);
        if (!fn) fail(`尚未定義函數「${node.name}」。函數需先定義，且不支援遞迴。`, node.token);
        const count = Array.isArray(fn) ? fn[1] : fn.args.length;
        if (count !== node.args.length) fail(`${node.name} 需要 ${count} 個引數。`, node.token);
      }
      for (const child of [node.child, node.left, node.right, ...(node.args || [])].filter(Boolean)) validate(child, scope, funcs);
    }
    function evaluate(node, scope = variables, funcs = functions, depth = 0) {
      tick(node.token); if (depth > LIMITS.depth) fail('函數呼叫過深。', node.token);
      if (node.type === 'number') return node.value;
      if (node.type === 'variable') return scope.get(node.name);
      if (node.type === 'unary') return (node.op === '-' ? -1 : 1) * evaluate(node.child, scope, funcs, depth);
      if (node.type === 'call') {
        if (node.name === 'if') { const condition = evaluate(node.args[0], scope, funcs, depth); return Number.isFinite(condition) ? evaluate(node.args[condition ? 1 : 2], scope, funcs, depth) : NaN; }
        const args = node.args.map(a => evaluate(a, scope, funcs, depth));
        if (args.some(a => !Number.isFinite(a))) return NaN;
        if (builtins.has(node.name)) return builtins.get(node.name)[0](...args);
        const fn = funcs.get(node.name), local = new Map(fn.variables);
        fn.args.forEach((name, i) => local.set(name, args[i])); return evaluate(fn.value, local, fn.functions, depth + 1);
      }
      const l = evaluate(node.left, scope, funcs, depth);
      if (!Number.isFinite(l)) return NaN;
      if (node.op === '&&' && !l) return 0; if (node.op === '||' && l) return 1;
      const r = evaluate(node.right, scope, funcs, depth); if (!Number.isFinite(r)) return NaN;
      switch (node.op) {
        case '+': return l + r; case '-': return l - r; case '*': return l * r; case '/': return l / r; case '^': return l ** r;
        case '<': return Number(l < r); case '>': return Number(l > r); case '<=': return Number(l <= r); case '>=': return Number(l >= r);
        case '==': return Number(l === r); case '!=': return Number(l !== r); case '&&': case '||': return Number(!!r);
      }
    }
    function value(node) { validate(node, variables, functions); const v = evaluate(node); if (!Number.isFinite(v)) fail('此處需要有限實數，請檢查除以零或函數定義域。', node.token); return v; }
    function declare(s) { if (variables.has(s.name) || functions.has(s.name)) fail(`「${s.name}」已定義，請使用另一個名稱。`, s.token); }
    function sampler(node, variable) { const scope = new Map(variables), funcs = new Map(functions); scope.set(variable, 0); validate(node, scope, funcs); return n => { scope.set(variable, n); return evaluate(node, scope, funcs); }; }
    function bounds(s, ascending) { const a = value(s.from), b = value(s.to); if (Math.max(Math.abs(a), Math.abs(b)) > 1e6 || (ascending && a >= b)) fail('範圍需在 ±1000000 內，起點小於終點。', s.token); return [a, b]; }
    const plots = [];
    for (const s of program.statements) {
      switch (s.type) {
        case 'title': result.title = s.value; break;
        case 'let': declare(s); variables.set(s.name, value(s.value)); break;
        case 'param': {
          declare(s); const initial = value(s.value), [min, max] = bounds(s, true), step = s.step ? value(s.step) : (max - min) / 100;
          if (initial < min || initial > max || step <= 0 || step > max - min || (max - min) / step > 1e6) fail('參數初值需落在範圍內，步長需為合理的正數。', s.token);
          if (result.parameters.length >= LIMITS.parameters) fail('最多 12 個滑桿參數。', s.token);
          const current = Object.hasOwn(overrides, s.name) ? overrides[s.name] : initial;
          if (!Number.isFinite(current) || current < min || current > max) fail(`參數 ${s.name} 超出 ${min} 至 ${max}。`, s.token);
          variables.set(s.name, current); result.parameters.push({ name: s.name, value: current, initial, min, max, step }); break;
        }
        case 'fn': {
          declare(s); const captured = new Map(variables); s.args.forEach(a => captured.set(a, 0)); validate(s.value, captured, functions);
          functions.set(s.name, { args: s.args, value: s.value, variables: new Map(variables), functions: new Map(functions) }); break;
        }
        case 'view': {
          const v = s.values.map(value);
          if (v.some(n => Math.abs(n) > 1e6) || v[1] - v[0] < 1e-6 || v[3] - v[2] < 1e-6) fail('視窗需為遞增範圍，寬高至少 0.000001，座標在 ±1000000 內。', s.token);
          result.view = { xmin: v[0], xmax: v[1], ymin: v[2], ymax: v[3] }; break;
        }
        case 'plot': case 'curve': {
          if (plots.length >= LIMITS.plots) fail('最多同時繪製 12 條曲線。', s.token);
          const color = s.color || palette[plots.length % palette.length], label = s.label || `曲線 ${plots.length + 1}`;
          if (s.type === 'plot') plots.push({ type: s.type, fn: sampler(s.value, 'x'), color, label });
          else { const x = sampler(s.x, 't'), y = sampler(s.y, 't'); plots.push({ type: s.type, fn: t => [x(t), y(t)], range: bounds(s, true), color, label }); } break;
        }
        case 'point': result.points.push({ x: value(s.x), y: value(s.y), label: s.label || '', color: s.color || '#b7742a' }); break;
        case 'print': result.outputs.push({ type: 'value', label: s.label || '計算結果', value: value(s.value), line: s.token.line }); break;
        case 'table': {
          const fn = sampler(s.value, 'x'), [a, b] = bounds(s, true), step = s.step ? value(s.step) : 1;
          const ratio = (b - a) / step, count = Math.floor(ratio + 1e-9) + 1;
          if (step <= 0 || !Number.isFinite(count) || count > LIMITS.rows || count < 1) fail('表格最多 200 列，請增加正數步長。', s.token);
          const rows = Array.from({ length: count }, (_, i) => { const x = Math.min(b, a + i * step), y = fn(x); return [x, Number.isFinite(y) ? y : null]; });
          result.outputs.push({ type: 'table', rows, line: s.token.line }); break;
        }
        case 'integral': {
          const fn = sampler(s.value, 'x'), [a, b] = bounds(s, false), integral = math.integrate(fn, a, b);
          if (!integral.converged) fail('積分未收斂或區間有未定義值；不輸出不可靠的面積。', s.token);
          result.outputs.push({ type: 'integral', label: `定積分 [${a}, ${b}] ≈`, value: integral.value, error: integral.error, line: s.token.line }); break;
        }
        case 'roots': {
          const fn = sampler(s.value, 'x'), [a, b] = bounds(s, true);
          if (Array.from({ length: 37 }, (_, i) => fn(a + (b - a) * i / 36)).every(y => y === 0)) fail('取樣點皆為零，無法確認離散零點；請檢查是否為零函數。', s.token);
          const values = math.roots(fn, a, b);
          result.outputs.push({ type: 'roots', values, label: `數值求根 [${a}, ${b}]`, line: s.token.line });
          result.warnings.push('求根使用有限取樣，可能遺漏重根或密集零點；零函數不適用。'); break;
        }
      }
    }
    const width = Number.isFinite(options.width) ? Math.max(240, Math.min(1600, options.width)) : 900;
    const height = Number.isFinite(options.height) ? Math.max(200, Math.min(1200, options.height)) : 540;
    let evaluations = 0;
    for (const plot of plots) {
      const viewport = { ...result.view, width, height };
      const geometry = plot.type === 'plot' ? render.sampleFunction(plot.fn, viewport, { quality: 'balanced', maxEvaluations: 9000 }) : render.sampleParametric(plot.fn, ...plot.range, viewport, { quality: 'balanced', maxEvaluations: 9000 });
      // GraphRender catches sample exceptions to break paths. Surface a spent interpreter budget explicitly.
      if (steps > LIMITS.steps) fail('已達計算上限，請簡化函數或減少曲線。');
      result.plots.push({ type: plot.type, color: plot.color, label: plot.label, segments: geometry.segments });
      evaluations += geometry.stats.evaluations;
      if (geometry.stats.budgetExhausted) result.warnings.push(`「${plot.label}」達取樣上限；請縮小視窗檢查細節。`);
      if (!geometry.segments.length) result.warnings.push(`「${plot.label}」在目前視窗沒有可顯示的線段。`);
    }
    result.warnings = [...new Set(result.warnings)]; result.stats = { steps, evaluations, statements: program.statements.length };
    return result;
  }
  function validateDocument(input) {
    if (!input || input.kind !== 'mathscript' || input.version !== 1 || typeof input.source !== 'string' || input.source.length > LIMITS.source) fail('不是支援的 MathScript 作品（version 1）。');
    const parameters = Object.create(null);
    if (input.parameters !== undefined) {
      if (!input.parameters || typeof input.parameters !== 'object' || Array.isArray(input.parameters) || Object.keys(input.parameters).length > LIMITS.parameters) fail('參數資料格式無效。');
      for (const [key, v] of Object.entries(input.parameters)) {
        if (forbidden.has(key) || !/^[\p{L}_][\p{L}\p{N}_]{0,31}$/u.test(key) || !Number.isFinite(v) || Math.abs(v) > 1e6) fail('參數資料無效。');
        parameters[key] = v;
      }
    }
    return { kind: 'mathscript', version: 1, source: input.source, parameters };
  }
  return Object.freeze({ VERSION, LIMITS, compile, run, tokenize, validateDocument, ScriptError });
});
