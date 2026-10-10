/* A small, bounded expression interpreter. User input is never executable JS. */
(function (root) {
  'use strict';
  const functions = Object.assign(Object.create(null), {
    sin: [Math.sin, 1], cos: [Math.cos, 1], tan: [Math.tan, 1],
    asin: [Math.asin, 1], acos: [Math.acos, 1], atan: [Math.atan, 1],
    sqrt: [Math.sqrt, 1], abs: [Math.abs, 1], exp: [Math.exp, 1],
    ln: [Math.log, 1], log: [Math.log10, 1], floor: [Math.floor, 1],
    ceil: [Math.ceil, 1], round: [Math.round, 1], sign: [Math.sign, 1],
    min: [Math.min, 2], max: [Math.max, 2]
  });
  function normalize(source) {
    return source.trim().toLowerCase().replace(/[−–]/g, '-').replace(/[×·]/g, '*')
      .replace(/÷/g, '/').replace(/π/g, 'pi').replace(/θ/g, 't')
      .replace(/²/g, '^2').replace(/³/g, '^3').replace(/（/g, '(').replace(/）/g, ')')
      .replace(/，/g, ',').replace(/＝/g, '=').replace(/\*\*/g, '^');
  }
  function compile(source) {
    const s = normalize(source);
    if (!s || s.length > 240) throw new Error('請輸入 1–240 字的算式。');
    const raw = []; let i = 0;
    while (i < s.length) {
      if (/\s/.test(s[i])) { i++; continue; }
      const number = s.slice(i).match(/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/);
      if (number) { raw.push({type:'number', value:Number(number[0])}); i += number[0].length; continue; }
      const name = s.slice(i).match(/^[a-z]+/);
      if (name) {
        const n = name[0];
        if (functions[n] || ['pi', 'e'].includes(n)) raw.push({type:'name', value:n});
        else if (/^[xytabc]+$/.test(n)) for (const v of n) raw.push({type:'name', value:v});
        else throw new Error(`不認得「${n}」；可用 x、y、t、a、b、c 與常用函數。`);
        i += n.length; continue;
      }
      if ('+-*/^(),'.includes(s[i])) { raw.push({type:s[i], value:s[i++]}); continue; }
      throw new Error(`無法解析「${s[i]}」；請參考輸入說明。`);
    }
    const tokens = [];
    const ends = t => t && (t.type === 'number' || t.type === ')' || (t.type === 'name' && !functions[t.value]));
    const starts = t => t && ['number', 'name', '('].includes(t.type);
    for (const token of raw) { if (ends(tokens.at(-1)) && starts(token)) tokens.push({type:'*'}); tokens.push(token); }
    tokens.push({type:'end'});
    let pos = 0, depth = 0; const variables = new Set();
    const expect = type => { if (tokens[pos].type !== type) throw new Error(`缺少 ${type === ')' ? '右括號 )' : type}。`); pos++; };
    function expression(min = 0) {
      if (++depth > 48) throw new Error('算式巢狀過深，請拆成較短算式。');
      let node; const token = tokens[pos++];
      if (token.type === 'number') node = {kind:'number', value:token.value};
      else if (token.type === '+' || token.type === '-') node = {kind:'unary', op:token.type, child:expression(25)};
      else if (token.type === '(') { node = expression(); expect(')'); }
      else if (token.type === 'name') {
        if (functions[token.value]) {
          expect('('); const args = [expression()];
          while (tokens[pos].type === ',') { pos++; args.push(expression()); }
          expect(')');
          if (args.length !== functions[token.value][1]) throw new Error(`${token.value} 需要 ${functions[token.value][1]} 個引數。`);
          node = {kind:'call', name:token.value, args};
        } else if (token.value === 'pi' || token.value === 'e') node = {kind:'number', value:token.value === 'pi' ? Math.PI : Math.E};
        else { variables.add(token.value); node = {kind:'variable', name:token.value}; }
      } else throw new Error('算式不完整，請檢查運算子與括號。');
      const precedence = {'+':10, '-':10, '*':20, '/':20, '^':30};
      while (precedence[tokens[pos].type] >= min) {
        const op = tokens[pos++].type, p = precedence[op];
        node = {kind:'binary', op, left:node, right:expression(op === '^' ? p : p + 1)};
      }
      depth--; return node;
    }
    const tree = expression();
    if (tokens[pos].type !== 'end') throw new Error('多餘的括號或符號。');
    function evaluate(n, scope) {
      if (n.kind === 'number') return n.value;
      if (n.kind === 'variable') return scope[n.name] ?? NaN;
      if (n.kind === 'unary') return (n.op === '-' ? -1 : 1) * evaluate(n.child, scope);
      if (n.kind === 'call') return functions[n.name][0](...n.args.map(a => evaluate(a, scope)));
      const l = evaluate(n.left, scope), r = evaluate(n.right, scope);
      return n.op === '+' ? l+r : n.op === '-' ? l-r : n.op === '*' ? l*r : n.op === '/' ? l/r : l**r;
    }
    return {variables:[...variables], evaluate:scope => evaluate(tree, scope)};
  }
  function pair(source) {
    if (!source.startsWith('(') || !source.endsWith(')')) return null;
    let level = 0;
    for (let i=1; i<source.length-1; i++) {
      if (source[i] === '(') level++; if (source[i] === ')') level--;
      if (source[i] === ',' && level === 0) return [source.slice(1,i), source.slice(i+1,-1)];
    }
    return null;
  }
  function parse(source) {
    const s = normalize(source); let kind, parts;
    const p = pair(s), eq = s.split('=');
    if (p) { parts = p.map(compile); kind = parts.some(p => p.variables.includes('t')) ? 'parametric' : 'point'; }
    else if (eq.length === 1) { kind = 'function'; parts = [compile(s)]; }
    else if (eq.length === 2 && eq.every(p => p.trim())) {
      const rhs = compile(eq[1]);
      if (eq[0].trim() === 'y' && !rhs.variables.includes('y')) { kind = 'function'; parts = [rhs]; }
      else if (eq[0].trim() === 'r') { kind = 'polar'; parts = [rhs]; }
      else { kind = 'implicit'; parts = [compile(eq[0]), rhs]; }
    } else throw new Error('每列請輸入一條等式或一個座標。');
    const variables = [...new Set(parts.flatMap(p => p.variables))];
    const allowed = kind === 'function' ? 'xabc' : kind === 'implicit' ? 'xyabc' : kind === 'point' ? 'abc' : 'tabc';
    if (variables.some(v => !allowed.includes(v))) throw new Error(`這類圖形可使用的變數為 ${allowed.split('').join('、')}。`);
    const at = (x, y, params={}) => {
      const scope = {...params, x, y, t:x};
      const v = parts[0].evaluate(scope);
      if (kind === 'implicit') return v - parts[1].evaluate(scope);
      if (kind === 'point' || kind === 'parametric') return [v, parts[1].evaluate(scope)];
      if (kind === 'polar') return [v*Math.cos(x), v*Math.sin(x)];
      return v;
    };
    return {kind, variables, at};
  }
  function derivative(f, x) { const h=1e-5*Math.max(1,Math.abs(x)); return (f(x+h)-f(x-h))/(2*h); }
  function roots(f, min, max, count=1000) {
    if (!(Number.isFinite(min) && Number.isFinite(max) && max > min)) return [];
    const found = [], step = (max-min)/count;
    const add = x => { if (Number.isFinite(f(x)) && Math.abs(f(x)) < 1e-6 && !found.some(v=>Math.abs(v-x)<step*.2)) found.push(x); };
    let x0=min, y0=f(x0);
    for (let i=1;i<=count;i++) {
      const x1=min+i*step, y1=f(x1);
      if (Number.isFinite(y0) && Number.isFinite(y1)) {
        if (Math.abs(y0)<1e-10) add(x0);
        if (y0*y1<0) {
          let l=x0,r=x1,fl=y0;
          for(let j=0;j<45;j++) { const m=(l+r)/2,fm=f(m); if(!Number.isFinite(fm)) break; if(fl*fm<=0) r=m; else {l=m;fl=fm;} }
          add((l+r)/2);
        }
      }
      x0=x1;y0=y1;
    }
    add(max); return found.slice(0,80);
  }
  function analyze(f, min, max) {
    const extrema = roots(x=>derivative(f,x),min,max).filter(x=>{
      const h=(max-min)*1e-4;
      return Number.isFinite(f(x)) && derivative(f,x-h)*derivative(f,x+h)<0;
    });
    const zeros=roots(f,min,max);
    for (const x of extrema) if(Math.abs(f(x))<1e-7 && !zeros.some(v=>Math.abs(v-x)<1e-5)) zeros.push(x);
    // An identically zero interval has infinitely many roots, not isolated dots.
    const allZero=Array.from({length:37},(_,i)=>f(min+(max-min)*i/36)).every(y=>Number.isFinite(y)&&Math.abs(y)<1e-10);
    return {zeros:allZero?[]:zeros.sort((a,b)=>a-b), extrema, allZero};
  }
  const api = {compile, parse, normalize, roots, analyze, derivative};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GraphMath = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
