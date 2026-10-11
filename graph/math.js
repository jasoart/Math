/* Bounded math interpreter and numerical tools. Never evaluates JavaScript. */
(function (root) {
  'use strict';
  const PARAMETERS = ['a', 'b', 'c', 'd', 'h', 'k'];
  const functions = Object.assign(Object.create(null), {
    sin:[Math.sin,1], cos:[Math.cos,1], tan:[Math.tan,1],
    asin:[Math.asin,1], acos:[Math.acos,1], atan:[Math.atan,1],
    sqrt:[Math.sqrt,1], cbrt:[Math.cbrt,1], abs:[Math.abs,1], exp:[Math.exp,1],
    ln:[Math.log,1], log:[Math.log10,1], floor:[Math.floor,1], ceil:[Math.ceil,1],
    round:[Math.round,1], sign:[Math.sign,1], min:[Math.min,2], max:[Math.max,2],
    sinh:[Math.sinh,1], cosh:[Math.cosh,1], tanh:[Math.tanh,1],
    sec:[x=>1/Math.cos(x),1], csc:[x=>1/Math.sin(x),1], cot:[x=>1/Math.tan(x),1],
    if:[null,3]
  });
  const finite = Number.isFinite;
  function normalize(source) {
    return source.trim().toLowerCase().replace(/√\s*(\d+(?:\.\d+)?|π|[a-z])/g,'sqrt($1)').replace(/∛\s*(\d+(?:\.\d+)?|π|[a-z])/g,'cbrt($1)').replace(/∛/g,'cbrt').replace(/[−–]/g,'-').replace(/[×·]/g,'*')
      .replace(/÷/g,'/').replace(/π/g,'pi').replace(/θ/g,'t').replace(/√/g,'sqrt')
      .replace(/²/g,'^2').replace(/³/g,'^3').replace(/（/g,'(').replace(/）/g,')')
      .replace(/，/g,',').replace(/＝/g,'=').replace(/≤/g,'<=').replace(/≥/g,'>=')
      .replace(/≠/g,'!=').replace(/\*\*/g,'^');
  }
  function compare(op,l,r) {
    if(!finite(l)||!finite(r)) return NaN;
    return Number(op==='<'?l<r:op==='>'?l>r:op==='<='?l<=r:op==='>='?l>=r:op==='!='?l!==r:l===r);
  }
  function compile(source) {
    const s=normalize(source);
    if(!s||s.length>480) throw Error('請輸入 1–480 字的算式。');
    const raw=[]; let i=0;
    while(i<s.length) {
      if(/\s/.test(s[i])) {i++;continue;}
      const number=s.slice(i).match(/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/);
      if(number) {raw.push({type:'number',value:Number(number[0])});i+=number[0].length;continue;}
      const name=s.slice(i).match(/^[a-z]+/);
      if(name) {
        const n=name[0];
        const known=[...Object.keys(functions),'pi','e','x','y','t',...PARAMETERS].sort((a,b)=>b.length-a.length);
        let offset=0;
        while(offset<n.length){const part=known.find(k=>n.startsWith(k,offset));if(!part)throw Error(`不認得「${n}」；請使用說明列出的變數與函數。`);raw.push({type:'name',value:part});offset+=part.length;}
        i+=n.length;continue;
      }
      const op=s.slice(i).match(/^(?:<=|>=|==|!=|&&|\|\||[+*/^(),<>=°-])/);
      if(op) {raw.push({type:op[0],value:op[0]});i+=op[0].length;continue;}
      throw Error(`無法解析「${s[i]}」；請參考輸入說明。`);
    }
    const tokens=[];
    const ends=t=>t&&(t.type==='number'||t.type===')'||t.type==='°'||(t.type==='name'&&!functions[t.value]));
    const starts=t=>t&&['number','name','('].includes(t.type);
    for(const token of raw) {if(ends(tokens.at(-1))&&starts(token)) tokens.push({type:'*'});tokens.push(token);}
    tokens.push({type:'end'});
    let pos=0,depth=0;const variables=new Set(),grouped=new WeakSet();
    const expect=type=>{if(tokens[pos]?.type!==type) throw Error(`缺少 ${type===')'?'右括號 )':type}。`);pos++;};
    const precedence={'||':1,'&&':2,'<':5,'>':5,'<=':5,'>=':5,'=':5,'==':5,'!=':5,'+':10,'-':10,'*':20,'/':20,'^':30};
    function expression(min=0) {
      if(++depth>48) throw Error('算式巢狀過深，請拆成較短算式。');
      let node;const token=tokens[pos++];
      if(!token) throw Error('算式不完整。');
      if(token.type==='number') node={kind:'number',value:token.value};
      else if(token.type==='+'||token.type==='-') node={kind:'unary',op:token.type,child:expression(25)};
      else if(token.type==='(') {node=expression();expect(')');grouped.add(node);}
      else if(token.type==='name') {
        if(functions[token.value]) {
          expect('(');const args=[expression()];
          while(tokens[pos]?.type===',') {pos++;args.push(expression());}
          expect(')');
          if(args.length!==functions[token.value][1]) throw Error(`${token.value} 需要 ${functions[token.value][1]} 個引數。`);
          node={kind:'call',name:token.value,args};
        } else if(token.value==='pi'||token.value==='e') node={kind:'constant',name:token.value,value:token.value==='pi'?Math.PI:Math.E};
        else {variables.add(token.value);node={kind:'variable',name:token.value};}
      } else throw Error('算式不完整，請檢查運算子與括號。');
      while(tokens[pos]?.type==='°'){pos++;node={kind:'degree',child:node};}
      while(precedence[tokens[pos]?.type]>=min) {
        const op=tokens[pos++].type,p=precedence[op],right=expression(op==='^'?p:p+1);
        if(p===5) {
          if(node.kind==='comparison'&&!grouped.has(node)) {node.ops.push(op);node.args.push(right);}
          else node={kind:'comparison',ops:[op],args:[node,right]};
        } else node={kind:'binary',op,left:node,right};
      }
      depth--;return node;
    }
    const tree=expression();
    if(tokens[pos]?.type!=='end') throw Error('多餘的括號或符號。');
    function evaluate(n,scope) {
      if(n.kind==='number'||n.kind==='constant') return n.value;
      if(n.kind==='variable') return scope[n.name]??NaN;
      if(n.kind==='degree')return evaluate(n.child,scope)*Math.PI/180;
      if(n.kind==='unary') return (n.op==='-'?-1:1)*evaluate(n.child,scope);
      if(n.kind==='comparison') {
        let left=evaluate(n.args[0],scope);
        for(let i=0;i<n.ops.length;i++) {const right=evaluate(n.args[i+1],scope),v=compare(n.ops[i],left,right);if(v!==1)return v;left=right;}
        return 1;
      }
      if(n.kind==='call') {
        if(n.name==='if') {const c=evaluate(n.args[0],scope);return finite(c)?evaluate(n.args[c?1:2],scope):NaN;}
        return functions[n.name][0](...n.args.map(a=>evaluate(a,scope)));
      }
      const l=evaluate(n.left,scope);
      if(n.op==='&&'||n.op==='||') {
        if(!finite(l))return NaN;
        if(n.op==='&&'&&!l)return 0;if(n.op==='||'&&l)return 1;
        const r=evaluate(n.right,scope);return finite(r)?Number(!!r):NaN;
      }
      const r=evaluate(n.right,scope);
      return n.op==='+'?l+r:n.op==='-'?l-r:n.op==='*'?l*r:n.op==='/'?l/r:l**r;
    }
    // Forward-mode automatic differentiation on the same bounded syntax tree.
    // Track continuity separately from differentiability: abs(x) has a cusp at
    // zero, but abs(x) < 1 is still a stable condition there. No finite differences
    // are used here, and a non-finite/undefined derivative is always reported as NaN.
    function differential(scope, names) {
      const zeros=()=>names.map(()=>0), flags=value=>names.map(()=>value);
      function dual(value,d,depends,continuous,truth) {
        if(!finite(value))return {value,d:flags(NaN),depends,continuous:flags(false),truth:flags(false)};
        d=d.map(v=>finite(v)?v:NaN);
        continuous=continuous||d.map(finite);
        return {value,d,depends,continuous,truth:truth||continuous.map((ok,i)=>ok&&(value!==0||!depends[i]))};
      }
      const merged=(a,b)=>a.depends.map((v,i)=>v||b.depends[i]);
      function walk(n) {
        if(n.kind==='number'||n.kind==='constant')return dual(n.value,zeros(),flags(false));
        if(n.kind==='variable') {
          const depends=names.map(name=>name===n.name);
          const value=scope[n.name];
          return dual(finite(value)?value:NaN,depends.map(v=>Number(v)),depends);
        }
        if(n.kind==='degree'||n.kind==='unary') {
          const a=walk(n.child),factor=n.kind==='degree'?Math.PI/180:n.op==='-'?-1:1;
          return dual(a.value*factor,a.d.map(v=>v*factor),a.depends,a.continuous,a.truth);
        }
        if(n.kind==='comparison') {
          let left=walk(n.args[0]),depends=left.depends.slice(),stable=flags(true),value=1;
          for(let j=0;j<n.ops.length;j++) {
            const right=walk(n.args[j+1]);
            stable=stable.map((ok,i)=>ok&&left.continuous[i]&&right.continuous[i]&&
              (left.value!==right.value||(!left.depends[i]&&!right.depends[i])));
            depends=depends.map((v,i)=>v||right.depends[i]);
            value=compare(n.ops[j],left.value,right.value);
            if(value!==1)break;
            left=right;
          }
          return dual(value,stable.map(ok=>ok?0:NaN),depends,stable,stable);
        }
        if(n.kind==='call'&&n.name==='if') {
          const condition=walk(n.args[0]);
          if(!finite(condition.value))return dual(NaN,zeros(),condition.depends);
          // Evaluate only the selected branch, just like the scalar interpreter.
          const a=walk(n.args[condition.value?1:2]);
          return dual(a.value,a.d.map((v,i)=>condition.truth[i]?v:NaN),merged(condition,a),
            a.continuous.map((ok,i)=>ok&&condition.truth[i]),a.truth.map((ok,i)=>ok&&condition.truth[i]));
        }
        if(n.kind==='call') {
          const args=n.args.map(walk),a=args[0],x=a.value,name=n.name;
          const value=functions[name][0](...args.map(arg=>arg.value));
          if(args.some(arg=>!finite(arg.value)))return dual(value,flags(NaN),
            args.reduce((depends,arg)=>depends.map((v,i)=>v||arg.depends[i]),flags(false)),flags(false));
          if(name==='min'||name==='max') {
            const b=args[1],selected=name==='min'?(x<b.value?a:b):(x>b.value?a:b),tie=x===b.value;
            const continuous=a.continuous.map((ok,i)=>ok&&b.continuous[i]);
            return dual(value,a.d.map((v,i)=>!continuous[i]?NaN:tie?(v===b.d[i]?v:NaN):selected.d[i]),merged(a,b),continuous,
              continuous.map((ok,i)=>ok&&(tie?a.truth[i]&&b.truth[i]:selected.truth[i])));
          }
          const d=a.d.map((v,i)=>{
            if(!a.depends[i])return 0;
            if(!finite(v))return NaN;
            switch(name) {
              case 'sin':return Math.cos(x)*v;
              case 'cos':return -Math.sin(x)*v;
              case 'tan': {const c=Math.cos(x);return Math.abs(c)>4*Number.EPSILON?v/c/c:NaN;}
              case 'asin':return Math.abs(x)<1?v/Math.sqrt((1-x)*(1+x)):NaN;
              case 'acos':return Math.abs(x)<1?-v/Math.sqrt((1-x)*(1+x)):NaN;
              case 'atan':return Math.abs(x)<=1?v/(1+x*x):(v/x)/(x+1/x);
              case 'sqrt':return x>0?v/value/2:NaN;
              case 'cbrt':return x!==0?(v/value)/value/3:NaN;
              case 'abs':return x!==0?Math.sign(x)*v:NaN;
              case 'exp':return value*v;
              case 'ln':return x>0?v/x:NaN;
              case 'log':return x>0?(v/x)/Math.LN10:NaN;
              case 'floor':case 'ceil':return Number.isInteger(x)?NaN:0;
              case 'round':return x-Math.floor(x)===.5?NaN:0;
              case 'sign':return x===0?NaN:0;
              case 'sinh':return Math.cosh(x)*v;
              case 'cosh':return Math.sinh(x)*v;
              case 'tanh': {const e=Math.exp(-2*Math.abs(x));return 4*e/(1+e)**2*v;}
              case 'sec': {const c=Math.cos(x);return Math.abs(c)>4*Number.EPSILON?Math.sin(x)/c/c*v:NaN;}
              case 'csc': {const s=Math.sin(x);return Math.abs(s)>4*Number.EPSILON?-Math.cos(x)/s/s*v:NaN;}
              case 'cot': {const s=Math.sin(x);return Math.abs(s)>4*Number.EPSILON?-v/s/s:NaN;}
              default:return NaN;
            }
          });
          // These two functions remain continuous at a cusp or vertical tangent.
          const continuous=name==='abs'||name==='cbrt'?a.continuous:undefined;
          const step=['floor','ceil','round','sign'].includes(name);
          return dual(value,d,a.depends,continuous,step?d.map(finite):undefined);
        }
        const a=walk(n.left);
        if(n.op==='&&'||n.op==='||') {
          if(!finite(a.value))return dual(NaN,zeros(),a.depends);
          if((n.op==='&&'&&!a.value)||(n.op==='||'&&a.value)) {
            return dual(Number(!!a.value),a.truth.map(ok=>ok?0:NaN),a.depends,a.truth,a.truth);
          }
          const b=walk(n.right),stable=a.truth.map((ok,i)=>ok&&b.truth[i]);
          return dual(finite(b.value)?Number(!!b.value):NaN,stable.map(ok=>ok?0:NaN),merged(a,b),stable,stable);
        }
        const b=walk(n.right),l=a.value,r=b.value,depends=merged(a,b);
        const value=n.op==='+'?l+r:n.op==='-'?l-r:n.op==='*'?l*r:n.op==='/'?l/r:l**r;
        const d=a.d.map((dl,i)=>{
          const dr=b.d[i];
          if(!finite(dl)||!finite(dr))return NaN;
          if(n.op==='+')return dl+dr;
          if(n.op==='-')return dl-dr;
          if(n.op==='*')return dl*r+l*dr;
          // Avoid squaring the denominator, which can overflow for large values.
          if(n.op==='/')return dl/r-(l/r)*(dr/r);
          if(!depends[i])return 0;
          if(!b.depends[i]) {
            // Integer powers extend smoothly through negative bases and zero.
            if(l<=0&&!Number.isInteger(r))return NaN;
            if(l===0&&r<0)return NaN;
            return r===0||dl===0?0:r*l**(r-1)*dl;
          }
          // An identically zero base is constant for every positive exponent.
          // A base varying on another gradient axis is still a domain boundary.
          if(l===0&&r>0&&!a.depends.some(Boolean))return 0;
          // Otherwise a variable real exponent needs a positive base nearby.
          if(l<=0)return NaN;
          return (dl===0?0:r*l**(r-1)*dl)+(dr===0?0:value*Math.log(l)*dr);
        });
        const continuous=a.continuous.map((ok,i)=>ok&&b.continuous[i]&&
          (n.op!=='/'||r!==0)&&(n.op!=='^'||l>0||(l===0&&r>0&&!a.depends.some(Boolean))||
          (!b.depends[i]&&Number.isInteger(r)&&!(l===0&&r<0))));
        return dual(value,d,depends,continuous);
      }
      return walk(tree);
    }
    function gradient(scope={},names=['x','y']) {
      if(!Array.isArray(names)||names.some(name=>!['x','y','t',...PARAMETERS].includes(name)))throw Error('微分變數必須是 x、y、t 或參數名稱。');
      const result=differential(scope||{},names);
      return Object.fromEntries(names.map((name,i)=>[name,result.d[i]]));
    }
    return {tree,variables:[...variables],evaluate:scope=>evaluate(tree,scope),gradient,
      derivative:(scope={},variable='x')=>gradient(scope,[variable])[variable],
      // Used by domain-restricted functions to reject their boundary itself.
      conditionStable:(scope={},variable='x')=>differential(scope||{},[variable]).truth[0]};
  }
  function pair(s) {
    if(!s.startsWith('(')||!s.endsWith(')'))return null;
    let level=0;
    for(let i=1;i<s.length-1;i++) {if(s[i]==='(')level++;if(s[i]===')')level--;if(s[i]===','&&level===0)return [s.slice(1,i),s.slice(i+1,-1)];}
    return null;
  }
  function parse(source) {
    if(typeof source!=='string'||source.length>480)throw Error('算式最多 480 字。');
    let s=normalize(source),condition=null;
    const restriction=s.match(/\{([^{}]+)\}\s*$/);
    if(restriction) {condition=compile(restriction[1]);s=s.slice(0,restriction.index).trim();}
    let level=0,relations=[];
    for(let i=0;i<s.length;i++) {
      if(s[i]==='(')level++;if(s[i]===')')level--;
      if(level===0&&/[=<>!]/.test(s[i])) {const op=s.slice(i).match(/^(<=|>=|!=|==|[=<>])/);if(!op)throw Error('關係符號無效。');relations.push({index:i,op:op[0]});i+=op[0].length-1;}
    }
    let kind,parts,relation=null;const p=pair(s);
    if(p) {parts=p.map(compile);kind=parts.some(p=>p.variables.includes('t'))?'parametric':'point';}
    else if(!relations.length) {kind='function';parts=[compile(s)];}
    else if(relations.length===1) {
      const r=relations[0],lhs=s.slice(0,r.index).trim(),rhs=compile(s.slice(r.index+r.op.length));relation=r.op;
      if(relation==='='&&lhs==='y'&&!rhs.variables.includes('y')) {kind='function';parts=[rhs];}
      else if(relation==='='&&lhs==='r') {kind='polar';parts=[rhs];}
      else {if(!['=','<','<=','>','>='].includes(relation))throw Error('圖形請使用 =、<、≤、> 或 ≥。');kind=relation==='='?'implicit':'inequality';parts=[compile(lhs),rhs];}
    } else throw Error('每列一條等式或不等式；範圍請放在 { } 內。');
    const variables=[...new Set([...parts,...(condition?[condition]:[])].flatMap(p=>p.variables))];
    const allowed=(kind==='function'?'x':kind==='implicit'||kind==='inequality'?'xy':kind==='point'?'':'t')+PARAMETERS.join('');
    if(variables.some(v=>!allowed.includes(v)))throw Error(`這類圖形可使用的變數為 ${allowed.split('').join('、')}。`);
    const at=(x,y,params={})=>{
      const scope={...params,x,y,t:x};
      if(condition) {const valid=condition.evaluate(scope);if(!finite(valid)||!valid)return ['point','parametric','polar'].includes(kind)?[NaN,NaN]:NaN;}
      const v=parts[0].evaluate(scope);
      if(kind==='implicit'||kind==='inequality')return v-parts[1].evaluate(scope);
      if(kind==='point'||kind==='parametric')return [v,parts[1].evaluate(scope)];
      if(kind==='polar')return [v*Math.cos(x),v*Math.sin(x)];
      return v;
    };
    const differentiate=(x,params={})=>{
      if(kind!=='function'||!finite(x))return NaN;
      const scope={...params,x,y:0,t:x};
      if(condition) {
        const valid=condition.evaluate(scope);
        if(!finite(valid)||!valid||!condition.conditionStable(scope,'x'))return NaN;
      }
      return parts[0].derivative(scope,'x');
    };
    return {kind,source,trees:parts.map(part=>part.tree),variables,at,relation,restricted:!!condition,derivative:differentiate,contains:v=>finite(v)&&compare(relation,v,0)===1};
  }
  function derivative(f,x) {
    // Parsed callers can attach their AD slope; existing function callers keep
    // the numerical fallback. An undefined AD result must never fall back across
    // a cusp or a domain boundary.
    if(typeof f.derivative==='function') {const d=f.derivative(x);return finite(d)?d:NaN;}
    const h=1e-5*Math.max(1,Math.abs(x));return (f(x+h)-f(x-h))/(2*h);
  }
  // Reject cusps, holes and divergent finite differences before drawing a tangent.
  function slope(f,x) {
    const y=f(x);if(!finite(y))return NaN;
    if(typeof f.derivative==='function')return derivative(f,x);
    const h=1e-4*Math.max(1,Math.abs(x));
    const l=(y-f(x-h))/h,r=(f(x+h)-y)/h,d=derivative(f,x);
    return [l,r,d].every(finite)&&Math.abs(l-r)<.002*Math.max(1,Math.abs(d))?d:NaN;
  }
  function roots(f,min,max,count=1000) {
    if(!finite(min)||!finite(max)||max<=min)return [];
    count=Math.max(16,Math.min(4000,Math.floor(count)||1000));
    const found=[],step=(max-min)/count,vals=[];
    const add=(x,scale)=>{
      const y=f(x);
      if(finite(y)&&Math.abs(y)<=Math.max(Number.MIN_VALUE,scale*1e-9)&&!found.some(v=>Math.abs(v-x)<step*1e-4))found.push(x);
    };
    for(let i=0;i<=count;i++)vals.push(f(min+i*step));
    for(let i=0;i<count;i++) {
      const a=min+i*step,b=a+step,fa=vals[i],fb=vals[i+1];
      if(!finite(fa)||!finite(fb))continue;
      if(fa===0)add(a,1);
      if((fa<0&&fb>0)||(fa>0&&fb<0)) {
        let l=a,r=b,fl=fa;
        for(let j=0;j<50;j++) {const m=(l+r)/2,fm=f(m);if(!finite(fm))break;if(fm===0){l=r=m;break;}if((fl>0)===(fm>0)){l=m;fl=fm;}else r=m;}
        add((l+r)/2,Math.max(Math.abs(fa),Math.abs(fb)));
      }
      // Even-multiplicity roots: minimize |f| only at a sampled local valley.
      if(i>0&&finite(vals[i-1])&&Math.abs(fa)<Math.abs(vals[i-1])&&Math.abs(fa)<Math.abs(fb)) {
        let l=a-step,r=b;
        for(let j=0;j<65;j++){const p=l+(r-l)/3,q=r-(r-l)/3;if(Math.abs(f(p))<Math.abs(f(q)))r=q;else l=p;}
        add((l+r)/2,Math.min(Math.abs(vals[i-1]),Math.abs(fb)));
      }
    }
    if(vals[count]===0)add(max,1);
    return found.sort((a,b)=>a-b).slice(0,80);
  }
  function analyze(f,min,max) {
    const extrema=roots(x=>derivative(f,x),min,max).filter(x=>{
      const h=(max-min)*1e-4,y=f(x);
      if(typeof f.derivative==='function') {
        const left=derivative(f,x-h),right=derivative(f,x+h);
        return [y,left,right].every(finite)&&((left<0&&right>0)||(left>0&&right<0));
      }
      const left=f(x-h),right=f(x+h);
      return [y,left,right].every(finite)&&((y<left&&y<right)||(y>left&&y>right));
    });
    const allZero=Array.from({length:37},(_,i)=>f(min+(max-min)*i/36)).every(y=>y===0);
    return {zeros:allZero?[]:roots(f,min,max),extrema:allZero?[]:extrema,allZero};
  }
  // Adaptive Simpson with multiple seed intervals and an explicit convergence result.
  // This is a finite-interval numerical estimate, never a Cauchy principal value.
  function integrate(f,a,b,{absolute=false,tolerance=1e-7}={}) {
    if(!finite(a)||!finite(b)||Math.max(Math.abs(a),Math.abs(b))>1e8)return {converged:false,value:NaN,error:Infinity};
    if(a===b)return {converged:true,value:0,error:0};
    let sign=1;if(a>b){[a,b]=[b,a];sign=absolute?1:-1;}
    let evaluations=0,ok=true,error=0;
    const at=x=>{if(++evaluations>40000){ok=false;return NaN;}const v=f(x);if(!finite(v))ok=false;return absolute?Math.abs(v):v;};
    const simpson=(l,r,fl,fm,fr)=>(r-l)*(fl+4*fm+fr)/6;
    function adapt(l,r,fl,fm,fr,whole,tol,depth) {
      if(!ok)return NaN;
      const m=(l+r)/2,pl=at((l+m)/2),pr=at((m+r)/2);
      const left=simpson(l,m,fl,pl,fm),right=simpson(m,r,fm,pr,fr),delta=left+right-whole;
      if(!ok)return NaN;
      if(Math.abs(delta)<=15*Math.max(tol,tolerance/4096)){error+=Math.abs(delta)/15;return left+right+delta/15;}
      if(depth===0){ok=false;return NaN;}
      return adapt(l,m,fl,pl,fm,left,tol/2,depth-1)+adapt(m,r,fm,pr,fr,right,tol/2,depth-1);
    }
    let sum=0;
    for(let i=0;i<64&&ok;i++) {
      const l=a+(b-a)*i/64,r=a+(b-a)*(i+1)/64,fl=at(l),fm=at((l+r)/2),fr=at(r),s=simpson(l,r,fl,fm,fr);
      sum+=adapt(l,r,fl,fm,fr,s,tolerance/64,24);
    }
    return {converged:ok&&finite(sum),value:ok?sign*sum:NaN,error:ok?error:Infinity,evaluations};
  }
  const api={PARAMETERS,compile,parse,normalize,roots,analyze,derivative,slope,integrate};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GraphMath=api;
})(typeof globalThis!=='undefined'?globalThis:this);
