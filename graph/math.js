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
    let pos=0,depth=0;const variables=new Set();
    const expect=type=>{if(tokens[pos]?.type!==type) throw Error(`缺少 ${type===')'?'右括號 )':type}。`);pos++;};
    const precedence={'||':1,'&&':2,'<':5,'>':5,'<=':5,'>=':5,'=':5,'==':5,'!=':5,'+':10,'-':10,'*':20,'/':20,'^':30};
    function expression(min=0) {
      if(++depth>48) throw Error('算式巢狀過深，請拆成較短算式。');
      let node;const token=tokens[pos++];
      if(!token) throw Error('算式不完整。');
      if(token.type==='number') node={kind:'number',value:token.value};
      else if(token.type==='+'||token.type==='-') node={kind:'unary',op:token.type,child:expression(25)};
      else if(token.type==='(') {node=expression();expect(')');}
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
          if(node.kind==='comparison') {node.ops.push(op);node.args.push(right);}
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
    return {tree,variables:[...variables],evaluate:scope=>evaluate(tree,scope)};
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
    return {kind,variables,at,relation,restricted:!!condition,contains:v=>finite(v)&&compare(relation,v,0)===1};
  }
  function derivative(f,x) {const h=1e-5*Math.max(1,Math.abs(x));return (f(x+h)-f(x-h))/(2*h);}
  // Reject cusps, holes and divergent finite differences before drawing a tangent.
  function slope(f,x) {
    const y=f(x);if(!finite(y))return NaN;
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
      const h=(max-min)*1e-4,y=f(x),left=f(x-h),right=f(x+h);
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
