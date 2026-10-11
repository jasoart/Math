/* Shared, bounded mathematical typography. Input is notation, never HTML or TeX. */
(function (root) {
  'use strict';
  const LIMIT = 4096, MATH_LIMIT = 480, CACHE_LIMIT = 256;
  const cache = new Map();
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const symbols = Object.freeze({
    α:'\\alpha',β:'\\beta',γ:'\\gamma',δ:'\\delta',ε:'\\varepsilon',ζ:'\\zeta',η:'\\eta',θ:'\\theta',ι:'\\iota',κ:'\\kappa',λ:'\\lambda',μ:'\\mu',ν:'\\nu',ξ:'\\xi',π:'\\pi',ρ:'\\rho',σ:'\\sigma',τ:'\\tau',υ:'\\upsilon',φ:'\\varphi',χ:'\\chi',ψ:'\\psi',ω:'\\omega',
    Γ:'\\Gamma',Δ:'\\Delta',Θ:'\\Theta',Λ:'\\Lambda',Ξ:'\\Xi',Π:'\\Pi',Σ:'\\Sigma',Φ:'\\Phi',Ψ:'\\Psi',Ω:'\\Omega',
    '−':'-','–':'-','×':'\\times','·':'\\cdot','÷':'\\div','≤':'\\leq','≥':'\\geq','≠':'\\neq','≈':'\\approx','≡':'\\equiv','∝':'\\propto','±':'\\pm','∓':'\\mp','∞':'\\infty','∫':'\\int','∬':'\\iint','∑':'\\sum','∏':'\\prod','∂':'\\partial','∇':'\\nabla','∈':'\\in','∉':'\\notin','⊂':'\\subset','⊆':'\\subseteq','∪':'\\cup','∩':'\\cap','∅':'\\varnothing','∀':'\\forall','∃':'\\exists','⇒':'\\Rightarrow','⇔':'\\Leftrightarrow','→':'\\to','←':'\\leftarrow','↔':'\\leftrightarrow','⊥':'\\perp','∥':'\\parallel','⋅':'\\cdot','…':'\\ldots','⋯':'\\cdots','°':'{}^{\\circ}','′':"'",'″':"''",'√':'\\surd','∛':'\\sqrt[3]{}','ℝ':'\\mathbb{R}','ℤ':'\\mathbb{Z}','ℕ':'\\mathbb{N}','ℚ':'\\mathbb{Q}','ℂ':'\\mathbb{C}'
  });
  const superscripts = '⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱᵃᵇᶜᵈᵉᶠᵍʰʲᵏˡᵐᵒᵖʳˢᵗᵘᵛʷˣʸᶻ';
  const supervalues = '0123456789+-=()niabcdefghjklmoprstuvwxyz';
  const subscripts = '₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜₓ';
  const subvalues = '0123456789+-=()aehijklmnoprstx';
  const relation = {'=':'=', '==':'=', '!=':'\\neq', '<':'<', '>':'>', '<=':'\\leq', '>=':'\\geq', '≤':'\\leq', '≥':'\\geq', '≠':'\\neq', '≈':'\\approx', '≡':'\\equiv', '∝':'\\propto'};
  const functions = new Set(['sin','cos','tan','asin','acos','atan','sinh','cosh','tanh','sec','csc','cot','sqrt','cbrt','abs','exp','ln','log','floor','ceil','round','sign','min','max','if']);
  const namedOperators = new Set(['Var','Cov','SD','E','P','C','det','rank','tr','gcd','lcm','Re','Im','Pr','arg']);

  function numberTeX(value) {
    if (!Number.isFinite(value)) throw Error('Nonfinite numeral');
    const [base, exponent] = String(value).split('e');
    return exponent === undefined ? base : `${base}\\times 10^{${Number(exponent)}}`;
  }
  function precedence(n) {return n.kind === 'comparison' ? 5 : n.kind === 'unary' ? 25 : n.kind === 'binary' ? ({'||':1,'&&':2,'+':10,'-':10,'*':20,'/':20,'^':30}[n.op] || 0) : 100;}
  const parens = tex => `\\left(${tex}\\right)`;
  function astTeX(tree, options = {}) {
    let count = 0;
    function emit(n, depth = 0) {
      if (!n || ++count > 700 || depth > 52) throw Error('Notation budget exceeded');
      const child = c => emit(c, depth + 1);
      if (n.kind === 'number') return numberTeX(n.value);
      if (n.kind === 'constant') return n.name === 'pi' ? '\\pi' : 'e';
      if (n.kind === 'variable') {
        if (!/^[a-z]$/.test(n.name)) throw Error('Unknown variable');
        return n.name === 't' && options.theta ? '\\theta' : n.name;
      }
      if (n.kind === 'degree') return `{${precedence(n.child) < 100 ? parens(child(n.child)) : child(n.child)}}^{\\circ}`;
      if (n.kind === 'unary') return n.op + (precedence(n.child) < 25 ? parens(child(n.child)) : child(n.child));
      if (n.kind === 'comparison') return n.args.map((a, i) => `${i ? ` ${relation[n.ops[i - 1]]} ` : ''}${precedence(a) <= 5 ? parens(child(a)) : child(a)}`).join('');
      if (n.kind === 'call') {
        const a = n.args.map(child), first = a[0];
        if (!functions.has(n.name)) throw Error('Unknown function');
        if (n.name === 'sqrt' || n.name === 'cbrt') return `\\sqrt${n.name === 'cbrt' ? '[3]' : ''}{${first}}`;
        if (n.name === 'abs') return `\\left|${first}\\right|`;
        if (n.name === 'floor') return `\\left\\lfloor ${first}\\right\\rfloor`;
        if (n.name === 'ceil') return `\\left\\lceil ${first}\\right\\rceil`;
        const operator = {asin:'\\arcsin',acos:'\\arccos',atan:'\\arctan'}[n.name] || (/^(?:sin|cos|tan|sinh|cosh|tanh|sec|csc|cot|exp|ln|log|min|max)$/.test(n.name) ? `\\${n.name}` : `\\operatorname{${n.name}}`);
        return operator + parens(a.join(',\\,'));
      }
      if (n.kind !== 'binary') throw Error('Unknown AST');
      const l = child(n.left), r = child(n.right), p = precedence(n);
      if (n.op === '/') return `\\frac{${l}}{${r}}`;
      if (n.op === '^') return `{${precedence(n.left) <= 30 ? parens(l) : l}}^{${r}}`;
      const left = precedence(n.left) < p ? parens(l) : l;
      const right = precedence(n.right) < p || (n.op === '-' && precedence(n.right) === p) ? parens(r) : r;
      const op = {'*':'\\cdot','&&':'\\land','||':'\\lor'}[n.op] || n.op;
      return `${left} ${op} ${right}`;
    }
    return emit(tree);
  }

  // Split only at top level, with a bounded stack; used for tuples and matrices.
  function splitTop(source, separator) {
    const out = []; let depth = 0, start = 0;
    for (let i = 0; i < source.length; i++) {
      if ('([{'.includes(source[i])) depth++;
      if (')]}'.includes(source[i])) depth--;
      if (depth < 0 || depth > 48) throw Error('Unbalanced grouping');
      if (!depth && source[i] === separator) {out.push(source.slice(start, i)); start = i + 1;}
    }
    if (depth) throw Error('Unbalanced grouping');
    out.push(source.slice(start)); return out;
  }
  function expressionTeX(source) {
    if (typeof source !== 'string' || !source.trim() || source.length > MATH_LIMIT || /[\\\u0000-\u001f]/.test(source)) return null;
    const math = root.GraphMath;
    if (!math?.compile || !math.normalize) return null;
    try {
      const theta = source.includes('θ') && !/\bt\b/.test(source);
      let s = math.normalize(source), restriction = '';
      const match = s.match(/\{([^{}]+)\}\s*$/);
      if (match) {restriction = `\\quad \\left\\{${astTeX(math.compile(match[1]).tree, {theta})}\\right\\}`; s = s.slice(0, match.index).trim();}
      // A surface assignment is display notation; its RHS uses the same safe interpreter.
      if (/^z\s*=/.test(s)) return `z = ${astTeX(math.compile(s.replace(/^z\s*=/, '')).tree, {theta})}${restriction}`;
      math.parse(source); // Preserve graph semantics and reject incomplete/unsupported input.
      if (s[0] === '(' && s.at(-1) === ')') {
        const pair = splitTop(s.slice(1, -1), ',');
        if (pair.length === 2) return parens(pair.map(p => astTeX(math.compile(p).tree, {theta})).join(',\\,')) + restriction;
      }
      if (/^r\s*=/.test(s)) return `r = ${astTeX(math.compile(s.replace(/^r\s*=/, '')).tree, {theta})}${restriction}`;
      return astTeX(math.compile(s).tree, {theta}) + restriction;
    } catch {return null;}
  }

  // A conservative symbolic grammar supplements the graph grammar for module notation.
  // It preserves symbol case, grouping and operators; unfamiliar syntax falls back intact.
  function symbolicTeX(source) {
    if (!source.trim() || source.length > MATH_LIMIT || /[\\<>\u0000-\u001f]/.test(source.replace(/<=|>=|</g, ''))) return null;
    let s = source.replace(/[−–]/g, '-').replace(/÷/g, '/').replace(/×|·/g, '*').replace(/√/g, 'sqrt').replace(/∛/g, 'cbrt');
    s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹ⁿⁱ]+/g, run => `^(${[...run].map(c => supervalues[superscripts.indexOf(c)]).join('')})`);
    s = s.replace(/[₀₁₂₃₄₅₆₇₈₉ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜₓ]+/g, run => `_(${[...run].map(c => subvalues[subscripts.indexOf(c)]).join('')})`);
    const tokens = []; let i = 0;
    const known = [...functions, ...namedOperators].sort((a,b) => b.length-a.length);
    while (i < s.length) {
      if (/\s/.test(s[i])) {i++;continue;}
      const number = s.slice(i).match(/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/);
      if (number) {const value=Number(number[0]);if(!Number.isFinite(value))return null;tokens.push({type:'atom', tex:numberTeX(value)});i+=number[0].length;continue;}
      const name = known.find(n => s.startsWith(n, i) && (s[i+n.length] === '(' || functions.has(n)));
      if (name) {tokens.push({type:'function',name});i+=name.length;continue;}
      const multi = s.slice(i).match(/^(?:<=|>=|!=|==)/);
      if (multi) {tokens.push({type:multi[0]});i+=multi[0].length;continue;}
      const c = s[i++];
      if (/^[A-Za-z]$/.test(c) || /^[α-ωΓΔΘΛΞΠΣΦΨΩ]$/.test(c)) tokens.push({type:'atom',tex:symbols[c] || c});
      else if ('+-*/^_=≈≡∝≤≥≠<>(),;[]|!°′'.includes(c)) tokens.push({type:c});
      else return null;
      if (tokens.length > 400) return null;
    }
    tokens.push({type:'end'});
    let position = 0, count = 0;
    const peek = () => tokens[position]?.type;
    const expect = type => {if (peek() !== type) throw Error('Incomplete notation'); position++;};
    const starts = type => ['atom','function','(','['].includes(type);
    const prec = {'=':5,'==':5,'!=':5,'<':5,'>':5,'<=':5,'>=':5,'≤':5,'≥':5,'≠':5,'≈':5,'≡':5,'∝':5,'+':10,'-':10,'*':20,'/':20,'^':30,'_':31};
    function parse(min = 0, depth = 0, stopSubscript = false) {
      if (++count > 500 || depth > 40) throw Error('Notation budget exceeded');
      const token = tokens[position++]; let tex, p = 100, scripts = null, groupContent;
      if (token.type === 'atom') tex = token.tex;
      else if (token.type === '+' || token.type === '-') {const inner = parse(25, depth + 1); tex = token.type + inner.tex; p = 25;}
      else if (token.type === '(') {
        const items = [parse(0, depth + 1).tex];
        while (peek() === ',') {position++;items.push(parse(0, depth + 1).tex);}
        expect(')'); groupContent=items.join(',\\,');tex = parens(groupContent);
      } else if (token.type === '[') {
        const rows = [[]]; rows[0].push(parse(0, depth+1).tex);
        while (peek() === ',' || peek() === ';') {const separator = tokens[position++].type; if(separator === ';') rows.push([]); rows.at(-1).push(parse(0,depth+1).tex);}
        expect(']');
        if(rows.length > 6 || rows.some(r=>r.length > 6) || rows.some(r=>r.length!==rows[0].length)) throw Error('Nonrectangular matrix');
        tex = rows.length > 1 ? `\\begin{bmatrix}${rows.map(r=>r.join(' & ')).join(' \\\\ ')}\\end{bmatrix}` : `\\left[${rows[0].join(',\\,')}\\right]`;
      } else if (token.type === '|') {tex = `\\left|${parse(0,depth+1).tex}\\right|`;expect('|');}
      else if (token.type === 'function') {
        const args=[];
        if (peek() === '(') {position++;args.push(parse(0,depth+1).tex);while(peek()===','){position++;args.push(parse(0,depth+1).tex);}expect(')');}
        else args.push(parse(31,depth+1).tex);
        if (['sqrt','cbrt','abs','floor','ceil'].includes(token.name) && args.length !== 1) throw Error('Invalid arity');
        if (token.name==='sqrt'||token.name==='cbrt') tex=`\\sqrt${token.name==='cbrt'?'[3]':''}{${args[0]}}`;
        else if(token.name==='abs') tex=`\\left|${args[0]}\\right|`;
        else if(token.name==='floor')tex=`\\left\\lfloor ${args[0]}\\right\\rfloor`;
        else if(token.name==='ceil')tex=`\\left\\lceil ${args[0]}\\right\\rceil`;
        else tex=`\\operatorname{${token.name}}${parens(args.join(',\\,'))}`;
      } else throw Error('Unsupported notation');
      while (true) {
        if (['!','°','′'].includes(peek())) {const op=tokens[position++].type;tex=`{${p < 100 ? parens(tex) : tex}}${op==='°'?'^{\\circ}':op==='′'?"'":'!'}`;p=100;scripts=null;groupContent=undefined;continue;}
        const implicit=starts(peek()), op=implicit?'*':peek(), priority=prec[op];
        if(stopSubscript&&op==='_')break;
        if(priority===undefined||priority<min)break;
        if(!implicit)position++;
        // A subscript next to an exponent belongs to the same base. Grouped
        // exponents may still contain their own subscripts, e.g. x^(a_1).
        const rhs=parse(op==='^'?priority:priority+1,depth+1,op==='^');
        if(op==='/')tex=`\\frac{${tex}}{${rhs.tex}}`;
        else if(op==='^'||op==='_') {
          if(!scripts)scripts={base:p<=priority?parens(tex):tex};
          if(Object.hasOwn(scripts,op))throw Error('Repeated script');
          scripts[op]=rhs.groupContent??rhs.tex;
          tex=`{${scripts.base}}${scripts['^']===undefined?'':`^{${scripts['^']}}`}${scripts['_']===undefined?'':`_{${scripts['_']}}`}`;
        }
        else tex=`${p<priority?parens(tex):tex}${implicit?'\\,':` ${relation[op]||({'*':'\\cdot'}[op])||op} `}${rhs.p<priority||(op==='-'&&rhs.p===priority)?parens(rhs.tex):rhs.tex}`;
        if(op!=='^'&&op!=='_')scripts=null;
        groupContent=undefined;
        p=op==='_'?30:priority;
      }
      return {tex,p,groupContent};
    }
    try {const result=parse();return peek()==='end'?result.tex:null;} catch {return null;}
  }

  function unicodeTeX(source) {
    if (source.length > MATH_LIMIT || /[\\\u0000-\u001f]/.test(source)) return null;
    let out = '';
    for (let i=0;i<source.length;i++) {
      const c=source[i];
      if(superscripts.includes(c)||subscripts.includes(c)) {
        const isSuper=superscripts.includes(c), chars=isSuper?superscripts:subscripts, values=isSuper?supervalues:subvalues;
        let run=''; while(i<source.length&&chars.includes(source[i]))run+=values[chars.indexOf(source[i++])]; i--;
        out+=`${isSuper?'^':'_'}{${run}}`;
      } else if(symbols[c])out+=`${symbols[c]} `;
      else if(/[A-Za-z0-9+\-=/<>()[\].,:;|!]/.test(c))out+=c;
      else if(/\s/.test(c))out+='\\, ';
      else if(c==='%')out+='\\%';
      else if(c==='^'||c==='_')return null; // Do not guess the extent of an unknown exponent.
      else if(c==='{'||c==='}')out+=`\\${c}`;
      else return null;
    }
    return out;
  }

  function render(tex, displayMode) {
    if (!tex || !root.katex?.renderToString || tex.length > 16000) return null;
    try {
      return root.katex.renderToString(tex, {
        displayMode:!!displayMode, output:'htmlAndMathml', throwOnError:true,
        strict:'error', trust:false, maxExpand:128, maxSize:20, macros:{}, globalGroup:false
      });
    } catch {return null;}
  }
  function cached(key, produce) {
    if(cache.has(key)){const value=cache.get(key);cache.delete(key);cache.set(key,value);return value;}
    const value=produce();cache.set(key,value);if(cache.size>CACHE_LIMIT)cache.delete(cache.keys().next().value);return value;
  }
  function expressionHTML(source, options = {}) {
    source=String(source??'');
    // Do not cache absence of the optional renderer during deferred script startup.
    const produce=()=>{
      const content=source.length<=MATH_LIMIT?render(expressionTeX(source),options.displayMode):null;
      return `<span class="math-expression${content?' is-typeset':' is-plain'}" data-math-source="${escape(source)}">${content||escape(source)}</span>`;
    };
    return source.length>LIMIT||!root.katex?produce():cached(`e:${!!options.displayMode}:${source}`,produce);
  }
  function lineHTML(source) {
    source=String(source??'');
    const produce=()=>{
      let content='',typeset=false;
      if(source.length<=LIMIT&&!/[\\\u0000-\u001f]|<\/?[A-Za-z][^>]*>/.test(source)) {
        // Keep prose as real text nodes. This also preserves every punctuation mark.
        const chunks=source.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}，；：、。！？「」『』（）【】]+|[^\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}，；：、。！？「」『』（）【】]+/gu)||[];
        content=chunks.map(chunk=>{
          if(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}，；：、。！？「」『』（）【】]/u.test(chunk))return `<span class="math-prose">${escape(chunk)}</span>`;
          const notation=chunk.trim();
          if(!notation)return escape(chunk);
          const tex=symbolicTeX(notation)||unicodeTeX(notation), html=render(tex,false);
          if(!html)return escape(chunk);
          typeset=true;
          return `${escape(chunk.match(/^\s*/)[0])}${html}${escape(chunk.match(/\s*$/)[0])}`;
        }).join('');
      }
      return `<code class="math-formula${typeset?' is-typeset':' is-plain'}" data-math-source="${escape(source)}">${content||escape(source)}</code>`;
    };
    return source.length>LIMIT||!root.katex?produce():cached(`l:${source}`,produce);
  }
  function linesHTML(lines) {return (Array.isArray(lines)?lines:[lines]).map(lineHTML).join('');}
  const api=Object.freeze({expressionHTML,linesHTML,expressionTeX,symbolicTeX,clearCache:()=>cache.clear(),cacheSize:()=>cache.size});
  root.MathTypeset=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
