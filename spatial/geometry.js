/* Spatial objects and geometric calculations share the bounded math interpreter.
 * Coordinates, equations and scene data never execute JavaScript. */
(function (root) {
  'use strict';
  const M = typeof module !== 'undefined' && module.exports ? require('../graph/math.js') : root.GraphMath;
  const EPS = 1e-10, LIMIT = 10000;
  const finite = Number.isFinite;
  const add = (a,b) => a.map((x,i)=>x+b[i]);
  const sub = (a,b) => a.map((x,i)=>x-b[i]);
  const scale = (a,k) => a.map(x=>x*k);
  const dot = (a,b) => a.reduce((s,x,i)=>s+x*b[i],0);
  const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const norm = a => Math.hypot(...a);
  const unit = a => scale(a,1/norm(a));
  const clamp = x => Math.max(-1,Math.min(1,x));
  const text = v => Number.isInteger(v) ? String(v) : String(Number(v.toPrecision(10)));
  const tuple = p => `(${p.map(text).join(',')})`;
  function vector(v,name='坐標') {
    if (!Array.isArray(v)||v.length!==3||!v.every(x=>typeof x==='number'&&finite(x)&&Math.abs(x)<=LIMIT)) throw Error(`${name}須為三個介於 −10000 與 10000 的有限數值。`);
    return v.map(x=>x===0?0:x);
  }
  function number(v,name='數值',min=-LIMIT,max=LIMIT) {
    if(typeof v!=='number'||!finite(v)||v<min||v>max) throw Error(`${name}超出可用範圍。`);
    return v===0?0:v;
  }
  function label(v) { return typeof v==='string'&&v.length<=36&&!/[<>\x00-\x1f]/.test(v)?v:'物件'; }
  function source(v) {
    if(typeof v!=='string'||!v.trim()||v.length>480) throw Error('請輸入 1–480 字的算式。');
    return M.normalize(v);
  }
  function scalar(v) {
    const c=M.compile(source(v));
    if(c.variables.length) throw Error('坐標與係數請使用常數算式。');
    return number(c.evaluate({}));
  }
  function components(s) {
    let depth=0,start=0,parts=[];
    for(let i=0;i<s.length;i++) { if(s[i]==='(')depth++;if(s[i]===')')depth--;if(depth<0)throw Error('括號不完整。');if(s[i]===','&&depth===0){parts.push(s.slice(start,i));start=i+1;} }
    if(depth!==0)throw Error('括號不完整。');parts.push(s.slice(start));return parts;
  }
  function constantTuple(s) { const parts=components(s);if(parts.length!==3)throw Error('空間坐標須有三個分量。');return parts.map(scalar); }
  function expression(v,allowed) {
    const c=M.compile(source(v));
    if(c.variables.some(x=>!allowed.includes(x))) throw Error(`這個算式只能使用 ${allowed.join('、')}。`);
    return c;
  }
  function domain(v,fallback=[-Math.PI,Math.PI]) {
    const d=v===undefined?fallback:v;
    if(!Array.isArray(d)||d.length!==2||!d.every(x=>finite(x)&&Math.abs(x)<=100)||d[1]-d[0]<1e-5)throw Error('參數範圍須遞增，且介於 −100 與 100。');
    return d.slice();
  }
  function surfaceParameter(sourceText) {
    const normalized=source(sourceText),names=['sinh','cosh','tanh','asin','acos','atan','sqrt','cbrt','floor','round','sign','ceil','exp','abs','min','max','sin','cos','tan','sec','csc','cot','log','ln','if','pi','e','u','v'].sort((a,b)=>b.length-a.length),variables=new Set();
    const mapped=normalized.replace(/[a-z]+/g,segment=>{let out='',offset=0;while(offset<segment.length){const name=names.find(n=>segment.startsWith(n,offset));if(!name)throw Error('參數曲面只能使用 u、v 與已支援的數學函數。');offset+=name.length;if(name==='u'||name==='v')variables.add(name);out+=name==='u'?'x':name==='v'?'y':name;}return out;});
    const compiled=M.compile(mapped);if(compiled.variables.some(v=>!['x','y'].includes(v)))throw Error('參數曲面只能使用 u、v。');return {source:normalized,compiled,variables:[...variables]};
  }
  const boxFaces=[[0,2,3],[0,3,1],[4,5,7],[4,7,6],[0,1,5],[0,5,4],[2,6,7],[2,7,3],[0,4,6],[0,6,2],[1,3,7],[1,7,5]];
  const tetraFaces=[[0,2,1],[0,1,3],[1,2,3],[2,0,3]];
  function make(type,values={}) {
    if(!values||typeof values!=='object'||Array.isArray(values))throw Error('物件資料格式不正確。');
    let o={type,label:label(values.label||values.name||({point:'A',vector:'v',line:'L',plane:'E',sphere:'S'}[type]||'物件'))};
    if(typeof values.id==='string'&&/^[\w-]{1,64}$/.test(values.id))o.id=values.id;
    if(type==='point') { o.position=vector(values.position||values.point||[0,0,0]);o.source=`${o.label}=${tuple(o.position)}`; }
    else if(type==='vector') { o.origin=vector(values.origin||[0,0,0]);o.direction=vector(values.direction||[1,0,0],'向量');o.source=`${o.label}=${tuple(o.direction)}`; }
    else if(type==='line') {
      const endpoints=values.points;if(endpoints&&(!Array.isArray(endpoints)||endpoints.length!==2))throw Error('直線須由兩個點決定。');
      o.point=vector(values.point||(endpoints?endpoints[0]:[0,0,0]));o.direction=vector(values.direction||(endpoints?sub(vector(endpoints[1]),o.point):[1,0,0]),'方向向量');
      if(norm(o.direction)<1e-12)throw Error('直線的方向向量不能為零。');
      o.source=`(x,y,z)=${tuple(o.point)}+t${tuple(o.direction)}`;
    } else if(type==='plane') {
      const points=values.points;if(points&&(!Array.isArray(points)||points.length!==3))throw Error('平面須由三個點決定。');
      const vertices=points?points.map(p=>vector(p)):null;
      o.normal=vector(values.normal||(vertices?cross(sub(vertices[1],vertices[0]),sub(vertices[2],vertices[0])):[0,0,1]),'法向量');o.constant=number(values.constant??(vertices?dot(o.normal,vertices[0]):0),'平面常數');
      if(norm(o.normal)<1e-12)throw Error('平面法向量不能為零。');
      o.source=`${text(o.normal[0])}x+(${text(o.normal[1])})y+(${text(o.normal[2])})z=${text(o.constant)}`;
    } else if(type==='sphere') { o.center=vector(values.center||[0,0,0]);o.radius=number(values.radius??1,'半徑',1e-6,1000);o.source=`(x-(${text(o.center[0])}))^2+(y-(${text(o.center[1])}))^2+(z-(${text(o.center[2])}))^2=${text(o.radius**2)}`; }
    else if(type==='cylinder') { o.center=vector(values.center||[0,0,0]);o.radius=number(values.radius??1,'半徑',1e-6,1000);o.axis=['x','y','z'].includes(values.axis)?values.axis:'z';const axes=['x','y','z'].filter(x=>x!==o.axis);o.source=axes.map(x=>`(${x}-(${text(o.center['xyz'.indexOf(x)])}))^2`).join('+')+`=${text(o.radius**2)}`; }
    else if(type==='cone') { o.vertex=vector(values.vertex||[0,0,0]);o.slope=number(values.slope??1,'斜率',1e-6,1000);o.axis=['x','y','z'].includes(values.axis)?values.axis:'z';const axes=['x','y','z'].filter(x=>x!==o.axis);o.source=axes.map(x=>`(${x}-(${text(o.vertex['xyz'.indexOf(x)])}))^2`).join('+')+`=${text(o.slope**2)}(${o.axis}-(${text(o.vertex['xyz'.indexOf(o.axis)])}))^2`; }
    else if(type==='surface') { o.expression=source(values.expression||'x^2-y^2').replace(/^z\s*=\s*/,'');expression(o.expression,['x','y']);o.source='z='+o.expression; }
    else if(type==='parametric') {
      const ex=Array.isArray(values.expressions)?values.expressions:values.expressions&&['x','y','z'].map(k=>values.expressions[k]);
      if(!ex||ex.length!==3)throw Error('參數曲線須包含 x、y、z 三個算式。');
      o.expressions=ex.map(s=>{const t=source(s);expression(t,['t']);return t;});o.domain=domain(values.domain);o.source=o.expressions.map((s,i)=>`${'xyz'[i]}=${s}`).join(',');
    } else if(type==='parametricSurface') {
      const ex=Array.isArray(values.expressions)?values.expressions:values.expressions&&['x','y','z'].map(k=>values.expressions[k]);
      if(!ex||ex.length!==3)throw Error('參數曲面須包含 x(u,v)、y(u,v)、z(u,v) 三個算式。');o.expressions=ex.map(s=>surfaceParameter(s).source);
      const ranges=values.domains||[[-Math.PI,Math.PI],[-Math.PI/2,Math.PI/2]];if(!Array.isArray(ranges)||ranges.length!==2)throw Error('參數曲面須提供 u、v 的範圍。');o.domains=ranges.map(d=>domain(d));o.source=o.expressions.map((s,i)=>`${'xyz'[i]}=${s}`).join(',');
    } else if(type==='implicit') {
      o.expression=source(values.expression);const original=M.compile(o.expression.replace(/z/g,'0'));if(original.variables.some(x=>!['x','y'].includes(x)))throw Error('隱式曲面只能使用 x、y、z。');M.compile(o.expression.replace(/z/g,'t'));
      const d=values.domain||[-5,5,-5,5,-5,5];if(!Array.isArray(d)||d.length!==6||!d.every(x=>finite(x)&&Math.abs(x)<=100)||[0,2,4].some(i=>d[i+1]-d[i]<.1))throw Error('隱式曲面範圍不正確。');o.domain=d.slice();o.source=`${o.expression}=0`;
    } else if(['tetrahedron','box','parallelepiped','polyhedron'].includes(type)) {
      o.type='polyhedron';o.kind=type==='polyhedron'?(values.kind||'polyhedron'):type;
      if(values.points) {if(!Array.isArray(values.points)||values.points.length<4||values.points.length>64)throw Error('多面體須有 4–64 個頂點。');o.points=values.points.map(p=>vector(p));}
      else {
        const p=vector(values.origin||[0,0,0]);let u,v,w;
        if(o.kind==='box') {const size=vector(values.size||[2,2,2],'邊長');if(size.some(x=>x<=0))throw Error('長方體邊長須大於零。');u=[size[0],0,0];v=[0,size[1],0];w=[0,0,size[2]];}
        else {u=vector(values.u||[2,0,0]);v=vector(values.v||[0,2,0]);w=vector(values.w||[0,0,2]);}
        o.points=o.kind==='tetrahedron'?[p,add(p,u),add(p,v),add(p,w)]:Array.from({length:8},(_,i)=>add(add(add(p,scale(u,i&1?1:0)),scale(v,i&2?1:0)),scale(w,i&4?1:0)));
      }
      if(o.kind==='tetrahedron'&&o.points.length!==4)throw Error('三角錐須有四個頂點。');
      if(['box','parallelepiped'].includes(o.kind)&&o.points.length!==8)throw Error('此多面體須有八個頂點。');
      const faces=values.faces||(o.kind==='tetrahedron'?tetraFaces:['box','parallelepiped'].includes(o.kind)?boxFaces:null);
      if(!Array.isArray(faces)||faces.length<4||faces.length>128||faces.some(f=>!Array.isArray(f)||f.length!==3||f.some(i=>!Number.isInteger(i)||i<0||i>=o.points.length)))throw Error('多面體須提供有效的三角形面索引。');
      o.faces=faces.map(f=>f.slice());o.source=o.kind==='tetrahedron'?'V=abs(det(AB,AC,AD))/6':o.kind==='polyhedron'?'V=abs(sum(det(A,B,C)))/6':'V=abs(det(u,v,w))';
    } else if(type==='circle') {
      o.center=vector(values.center||[0,0,0]);o.normal=vector(values.normal||[0,0,1],'法向量');if(norm(o.normal)<1e-12)throw Error('截圓法向量不能為零。');o.radius=number(values.radius??1,'半徑',0,1000);o.source=`r=${text(o.radius)}; C=${tuple(o.center)}`;
    } else if(type==='segment') {
      o.a=vector(values.a);o.b=vector(values.b);o.source=`${tuple(o.a)}→${tuple(o.b)}`;
    } else if(type==='polygon') {
      if(!Array.isArray(values.points)||values.points.length<3||values.points.length>64)throw Error('多邊形須有 3–64 個頂點。');o.points=values.points.map(p=>vector(p));o.source=o.points.map(tuple).join('→');
    } else if(type==='revolution') {
      o.expression=source(values.expression||'sqrt(x)');o.innerExpression=source(values.innerExpression||'0');expression(o.expression,['x']);expression(o.innerExpression,['x']);o.domain=domain(values.domain,[0,4]);o.axis=values.axis==='y'?'y':'x';o.source=`V=pi∫[${o.domain.map(text).join(',')}] ((${o.expression})^2-(${o.innerExpression})^2) dx`;
    } else throw Error('尚未支援這種空間物件。');
    if(typeof values.source==='string'&&values.source.length<=480)o.source=values.source;
    return o;
  }
  function validate(o) {if(!o||typeof o!=='object'||Array.isArray(o)||typeof o.type!=='string')throw Error('物件資料格式不正確。');return make(o.type,o);}
  function validateScene(scene) {
    const objects=Array.isArray(scene)?scene:scene&&scene.objects;
    if(!Array.isArray(objects)||objects.length>32)throw Error('場景最多可包含 32 個物件。');return objects.map(validate);
  }
  // Polynomial extraction is structural: sampled values are never used to infer
  // a sphere or plane. Terms of degree above two and non-polynomial calls reject.
  function polynomial(tree) {
    const key=a=>a.join(','),degree=k=>k.split(',').reduce((s,v)=>s+Number(v),0);
    const plus=(a,b,k=1)=>{const o=new Map(a);for(const [n,v]of b)o.set(n,(o.get(n)||0)+k*v);return o;};
    const mult=(a,b)=>{const o=new Map();for(const [ka,va]of a)for(const [kb,vb]of b){const k=key(ka.split(',').map((v,i)=>Number(v)+Number(kb.split(',')[i])));if(degree(k)>2)throw Error('非二次多項式。');o.set(k,(o.get(k)||0)+va*vb);}return o;};
    function walk(n) {
      if(n.kind==='number'||n.kind==='constant')return new Map([['0,0,0',n.value]]);
      if(n.kind==='variable') {const i=['x','y','t'].indexOf(n.name);if(i<0)throw Error('非常數係數。');const a=[0,0,0];a[i]=1;return new Map([[key(a),1]]);}
      if(n.kind==='unary')return new Map([...walk(n.child)].map(([k,v])=>[k,n.op==='-'?-v:v]));
      if(n.kind==='degree')return new Map([...walk(n.child)].map(([k,v])=>[k,v*Math.PI/180]));
      if(n.kind==='binary') {
        const a=walk(n.left),b=walk(n.right);
        if(n.op==='+')return plus(a,b);if(n.op==='-')return plus(a,b,-1);if(n.op==='*')return mult(a,b);
        if(n.op==='/'&&[...b.keys()].every(k=>k==='0,0,0')&&b.get('0,0,0')!==0)return new Map([...a].map(([k,v])=>[k,v/b.get('0,0,0')]));
        if(n.op==='^'&&b.size===1&&b.has('0,0,0')) {const p=b.get('0,0,0');if(p===0)return new Map([['0,0,0',1]]);if(p===1)return a;if(p===2)return mult(a,a);}
      }
      throw Error('非二次多項式。');
    }
    const p=walk(tree);for(const [k,v]of p){if(!finite(v))throw Error('係數未定義。');if(v===0)p.delete(k);}return p;
  }
  function parse(input) {
    let s=source(input),name;
    const labeled=s.match(/^([a-z][a-z0-9_]{0,20}):(.+)$/);if(labeled){name=labeled[1];s=labeled[2];}
    const coordinates=s.match(/^([a-z][a-z0-9_]{0,20})\s*=\s*\((.*)\)$/);
    if(coordinates) {const n=coordinates[1];return make(['u','v','w'].includes(n)?'vector':'point',{label:name||input.trim().split('=')[0].trim(),position:constantTuple(coordinates[2]),direction:constantTuple(coordinates[2]),source:input});}
    const line=s.match(/^\(\s*x\s*,\s*y\s*,\s*z\s*\)\s*=\s*\((.*)\)\s*\+\s*t\s*\((.*)\)$/);
    if(line)return make('line',{point:constantTuple(line[1]),direction:constantTuple(line[2]),label:name||'L',source:input});
    const parts=components(s), assignments=parts.map(p=>p.match(/^\s*([xyz])\s*=\s*(.+)$/));
    if(parts.length===3&&assignments.every(Boolean)&&new Set(assignments.map(a=>a[1])).size===3) {
      const ex=['x','y','z'].map(x=>assignments.find(a=>a[1]===x)[2]);
      let surface;try{const c=ex.map(surfaceParameter);if(c.some(e=>e.variables.length))surface=c;}catch(_){}
      if(surface)return make('parametricSurface',{expressions:ex,label:name||'參數曲面',source:input});
      ex.forEach(e=>expression(e,['t']));
      try {const p=ex.map(e=>polynomial(M.compile(e).tree));if(p.every(a=>[...a.keys()].every(k=>['0,0,0','0,0,1'].includes(k))))return make('line',{point:p.map(a=>a.get('0,0,0')||0),direction:p.map(a=>a.get('0,0,1')||0),label:name||'L',source:input});}catch(_){}
      return make('parametric',{expressions:ex,label:name||'參數曲線',source:input});
    }
    const equation=s.split('=');
    if(equation.length===3) {
      const position=[0,0,0],direction=[0,0,0],seen=new Set();
      for(const component of equation){if(M.compile(component.replace(/z/g,'0')).variables.some(v=>!['x','y'].includes(v)))throw Error('比例式只能使用 x、y、z。');const p=polynomial(M.compile(component.replace(/z/g,'t')).tree),terms=[...p].filter(([k,v])=>k!=='0,0,0'&&v!==0);if(terms.length!==1)throw Error('比例式每一側須包含一個坐標。');const [key,a]=terms[0],i=['1,0,0','0,1,0','0,0,1'].indexOf(key);if(i<0||seen.has(i))throw Error('比例式須各包含 x、y、z。');seen.add(i);position[i]=-(p.get('0,0,0')||0)/a;direction[i]=1/a;}
      return make('line',{point:position,direction,label:name||'L',source:input});
    }
    if(equation.length!==2||equation.some(e=>!e.trim()))throw Error('請輸入點坐標、參數式，或含等號的空間方程式。');
    const residual=`(${equation[0]})-(${equation[1]})`,compiled=M.compile(residual.replace(/z/g,'t'));
    if(M.compile(residual.replace(/z/g,'0')).variables.some(x=>!['x','y'].includes(x)))throw Error('空間方程式只能使用 x、y、z。');
    let p;try{p=polynomial(compiled.tree);}catch(_){}
    if(p) {
      const coefficient=(i,power=1)=>{const k=[0,0,0];k[i]=power;return p.get(k.join(','))||0;},c=p.get('0,0,0')||0;
      const linear=[0,1,2].map(i=>coefficient(i)),diagonal=[0,1,2].map(i=>coefficient(i,2));
      const mixed=['1,1,0','1,0,1','0,1,1'].some(k=>p.get(k));
      const magnitude=Math.max(1,...[...p.values()].map(Math.abs)),close=(a,b)=>Math.abs(a-b)<=EPS*magnitude;
      if([...p.keys()].every(k=>k.split(',').reduce((s,v)=>s+Number(v),0)<=1))return make('plane',{normal:linear,constant:-c,label:name||'E',source:input});
      if(!mixed&&diagonal[0]!==0&&close(diagonal[0],diagonal[1])&&close(diagonal[0],diagonal[2])) {
        const q=diagonal[0],center=linear.map(v=>-v/(2*q)),r2=dot(center,center)-c/q;
        if(r2<=0)throw Error('球面半徑必須大於零。');return make('sphere',{center,radius:Math.sqrt(r2),label:name||'S',source:input});
      }
      if(!mixed)for(let axis=0;axis<3;axis++) {
        const axes=[0,1,2].filter(i=>i!==axis),q=diagonal[axes[0]];
        if(q===0||!close(q,diagonal[axes[1]]))continue;
        if(close(diagonal[axis],0)&&close(linear[axis],0)) {
          const center=[0,0,0];axes.forEach(i=>center[i]=-linear[i]/(2*q));const r2=dot(center,center)-c/q;
          if(r2>0)return make('cylinder',{center,radius:Math.sqrt(r2),axis:'xyz'[axis],label:name||'圓柱',source:input});
        }
        if(q*diagonal[axis]<0) {
          const vertex=linear.map((v,i)=>-v/(2*diagonal[i]));
          const remainder=c-dot(diagonal,vertex.map(x=>x*x));
          if(Math.abs(remainder)<=EPS*Math.max(1,Math.abs(c),...vertex.map(x=>x*x)))return make('cone',{vertex,slope:Math.sqrt(-diagonal[axis]/q),axis:'xyz'[axis],label:name||'圓錐',source:input});
        }
      }
    }
    if(/^z\s*$/.test(equation[0])&&!/z/.test(equation[1]))return make('surface',{expression:equation[1],label:name||'曲面',source:input});
    return make('implicit',{expression:residual,label:name||'隱式曲面',source:input});
  }
  // Exact rational arithmetic is reserved for reported values, not camera data.
  // A decimal input is interpreted as the decimal displayed by JavaScript.
  const gcd=(a,b)=>{a=a<0n?-a:a;b=b<0n?-b:b;while(b){const t=a%b;a=b;b=t;}return a;};
  function Q(n,d=1n){if(d===0n)throw Error('分母不能為零。');if(d<0n){n=-n;d=-d;}const g=gcd(n,d);return [n/g,d/g];}
  function rational(value) {
    const s=String(value),m=s.match(/^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i);if(!m)throw Error('數值不正確。');
    const digits=(m[2]+(m[3]||'')),exponent=Number(m[4]||0)-(m[3]||'').length;
    if(Math.abs(exponent)>18||digits.length>12)throw Error('精確值須來自有限位小數或分數。');
    return exponent>=0?Q(BigInt((m[1]||'')+digits)*10n**BigInt(exponent)):Q(BigInt((m[1]||'')+digits),10n**BigInt(-exponent));
  }
  const qadd=(a,b)=>Q(a[0]*b[1]+b[0]*a[1],a[1]*b[1]),qmul=(a,b)=>Q(a[0]*b[0],a[1]*b[1]),qdiv=(a,b)=>Q(a[0]*b[1],a[1]*b[0]);
  const qtext=a=>a[1]===1n?String(a[0]):`${a[0]}/${a[1]}`;
  function qconstant(n) {
    if(n.kind==='number')return rational(n.value);
    if(n.kind==='unary'){const q=qconstant(n.child);return n.op==='-'?Q(-q[0],q[1]):q;}
    if(n.kind==='binary') {const a=qconstant(n.left),b=qconstant(n.right);if(n.op==='+')return qadd(a,b);if(n.op==='-')return qadd(a,Q(-b[0],b[1]));if(n.op==='*')return qmul(a,b);if(n.op==='/')return qdiv(a,b);if(n.op==='^'&&b[1]===1n&&b[0]>=-8n&&b[0]<=8n)return b[0]>=0n?Q(a[0]**b[0],a[1]**b[0]):Q(a[1]**(-b[0]),a[0]**(-b[0]));}
    throw Error('包含非有理常數。');
  }
  function qpolynomial(n) {
    if(n.kind==='variable'){const i=['x','y','t'].indexOf(n.name);if(i<0)throw Error('非常數係數。');const k=[0,0,0];k[i]=1;return new Map([[k.join(','),Q(1n)]]);}
    if(n.kind==='number')return new Map([['0,0,0',rational(n.value)]]);
    if(n.kind==='unary')return new Map([...qpolynomial(n.child)].map(([k,v])=>[k,n.op==='-'?Q(-v[0],v[1]):v]));
    if(n.kind==='binary') {
      if(n.op==='^'){const e=qconstant(n.right);if(e[1]!==1n||e[0]<0n||e[0]>2n)throw Error('非二次多項式。');if(e[0]===0n)return new Map([['0,0,0',Q(1n)]]);if(e[0]===1n)return qpolynomial(n.left);return qpolynomial({kind:'binary',op:'*',left:n.left,right:n.left});}
      const a=qpolynomial(n.left),b=qpolynomial(n.right),out=new Map(a);
      if(n.op==='+'||n.op==='-'){for(const [k,v]of b)out.set(k,qadd(out.get(k)||Q(0n),n.op==='-'?Q(-v[0],v[1]):v));return out;}
      if(n.op==='/'){if([...b.keys()].some(k=>k!=='0,0,0'))throw Error('非常數分母。');return new Map([...a].map(([k,v])=>[k,qdiv(v,b.get('0,0,0'))]));}
      if(n.op==='*'){const out=new Map();for(const [ka,va]of a)for(const [kb,vb]of b){const powers=ka.split(',').map((v,i)=>Number(v)+Number(kb.split(',')[i]));if(powers.reduce((s,v)=>s+v,0)>2)throw Error('非二次多項式。');const k=powers.join(',');out.set(k,qadd(out.get(k)||Q(0n),qmul(va,vb)));}return out;}
    }
    throw Error('包含非有理係數。');
  }
  function exactPointPlane(position,normal,constant,pointObject,planeObject) {
    try {
      let p=position.map(x=>{try{return rational(x);}catch(_){return null;}}),n=normal.map(x=>{try{return rational(x);}catch(_){return null;}}),d;
      if(pointObject?.source) {const match=M.normalize(pointObject.source).match(/^[a-z][a-z0-9_]*\s*=\s*\((.*)\)$/);if(match){const values=components(match[1]).map(s=>qconstant(M.compile(s).tree));if(values.length===3&&values.every((q,i)=>Number(q[0])/Number(q[1])===position[i]))p=values;}}
      if(planeObject?.source) {const parts=M.normalize(planeObject.source).replace(/^[a-z][a-z0-9_]*:/,'').split('=');if(parts.length===2){const poly=qpolynomial(M.compile(`(${parts[0]})-(${parts[1]})`.replace(/z/g,'t')).tree),coeff=['1,0,0','0,1,0','0,0,1'].map(k=>poly.get(k)||Q(0n)),c=poly.get('0,0,0')||Q(0n),q=Q(-c[0],c[1]);if(coeff.every((v,i)=>Number(v[0])/Number(v[1])===normal[i])&&Number(q[0])/Number(q[1])===constant){n=coeff;d=q;}}}
      if(p.some(v=>!v)||n.some(v=>!v))return null;if(!d)d=rational(constant);
      let residual=Q(-d[0],d[1]),squared=Q(0n);
      for(let i=0;i<3;i++){residual=qadd(residual,qmul(n[i],p[i]));squared=qadd(squared,qmul(n[i],n[i]));}
      if(residual[0]===0n)return {distance:'0',squaredDistance:'0',foot:p.map(qtext)};
      const abs=Q(residual[0]<0n?-residual[0]:residual[0],residual[1]);
      const distSquared=qdiv(qmul(abs,abs),squared),factor=qdiv(residual,squared),foot=p.map((x,i)=>qtext(qadd(x,qmul(Q(-n[i][0],n[i][1]),factor))));
      return {distance:`${abs[1]===1n?qtext(abs):'('+qtext(abs)+')'}/sqrt(${qtext(squared)})`,squaredDistance:qtext(distSquared),foot};
    }catch(_){return null;}
  }
  function visual(type,fields) {
    // Derived intersections can lie beyond the editable coordinate range. Keep
    // the true coordinates; the scene renderer clips them to its view bounds.
    return {type,...fields,label:label(fields.label)};
  }
  function pointPlane(point,plane) {
    const p=Array.isArray(point)?vector(point):validate(point).position,e=validate(plane);if(!p||e.type!=='plane')throw Error('請選擇一個點與一個平面。');
    const n=unit(e.normal),constant=e.constant/norm(e.normal),signed=dot(n,p)-constant,foot=sub(p,scale(n,signed)),exact=exactPointPlane(p,e.normal,e.constant,Array.isArray(point)?null:point,e);
    return {status:Math.abs(signed)<=EPS*Math.max(1,norm(p),Math.abs(constant))?'on-plane':'regular',type:'point-plane',value:Math.abs(signed),distance:Math.abs(signed),signedDistance:signed,foot,projection:foot,normal:n,exact:exact?.distance||null,exactFoot:exact?.foot||null,squaredDistance:exact?.squaredDistance||null,formula:`d=abs(${text(dot(e.normal,p)-e.constant)})/sqrt(${text(dot(e.normal,e.normal))})`,auxiliary:[visual('point',{position:foot,label:'H'}),visual('vector',{origin:foot,direction:n,label:'法向量 n'}),visual('segment',{a:p,b:foot,label:'垂線段'})],segment:[p,foot]};
  }
  function pointLine(point,line) {
    const p=Array.isArray(point)?vector(point):validate(point).position,l=validate(line);if(!p||l.type!=='line')throw Error('請選擇一個點與一條直線。');
    const u=unit(l.direction),parameter=dot(sub(p,l.point),u)/norm(l.direction),foot=add(l.point,scale(l.direction,parameter)),distance=norm(sub(p,foot));
    return {status:distance<=EPS*Math.max(1,norm(p),norm(l.point))?'on-line':'regular',type:'point-line',value:distance,distance,foot,projection:foot,parameter,formula:`t=dot(P-A,u)/dot(u,u); H=A+tu; d=${text(distance)}`,segment:[p,foot],auxiliary:[visual('point',{position:foot,label:'H'}),visual('segment',{a:p,b:foot,label:'垂線段'})]};
  }
  function linePair(first,second) {
    const a=validate(first),b=validate(second);if(a.type!=='line'||b.type!=='line')throw Error('請選擇兩條直線。');
    const u=unit(a.direction),v=unit(b.direction),r=sub(b.point,a.point),c=clamp(dot(u,v)),n=cross(u,v),denominator=dot(n,n),angle=Math.atan2(norm(n),Math.abs(c))*180/Math.PI;
    if(denominator<=EPS*EPS) {
      const A=add(a.point,scale(u,dot(r,u))),B=b.point.slice(),distance=norm(sub(B,A)),coincident=distance<=EPS*Math.max(1,norm(a.point),norm(b.point));
      return {status:coincident?'coincident':'parallel',type:'line-line',value:distance,distance,angle,feet:[A,B],segment:[A,B],formula:coincident?'兩直線重合':'d=norm(cross(B-A,u))/norm(u)',auxiliary:coincident?[]:[visual('point',{position:A,label:'H₁'}),visual('point',{position:B,label:'H₂'}),visual('segment',{a:A,b:B,label:'公垂線段'})]};
    }
    const alpha=dot(cross(r,v),n)/denominator,beta=dot(cross(r,u),n)/denominator,A=add(a.point,scale(u,alpha)),B=add(b.point,scale(v,beta)),distance=norm(sub(B,A));
    const intersects=distance<=EPS*Math.max(1,norm(A),norm(B));
    return {status:intersects?'intersecting':'skew',type:'line-line',value:distance,distance,angle,feet:[A,B],segment:[A,B],parameters:[alpha/norm(a.direction),beta/norm(b.direction)],intersection:intersects?scale(add(A,B),.5):null,point:intersects?scale(add(A,B),.5):null,formula:'d=abs(dot(B-A,cross(u,v)))/norm(cross(u,v))',auxiliary:[visual('point',{position:A,label:'H₁'}),visual('point',{position:B,label:'H₂'}),visual('segment',{a:A,b:B,label:'公垂線段'})]};
  }
  function linePlane(line,plane) {
    const l=validate(line),p=validate(plane);if(l.type!=='line'||p.type!=='plane')throw Error('請選擇一條直線與一個平面。');
    const u=unit(l.direction),n=unit(p.normal),denominator=dot(n,u),residual=p.constant/norm(p.normal)-dot(n,l.point),angle=Math.atan2(Math.abs(denominator),norm(cross(n,u)))*180/Math.PI;
    if(Math.abs(denominator)<=EPS){const on=Math.abs(residual)<=EPS*Math.max(1,norm(l.point),Math.abs(p.constant/norm(p.normal))),projected=on?null:pointPlane(l.point,p);return {status:on?'contained':'parallel',type:'line-plane',value:Math.abs(residual),distance:Math.abs(residual),angle,formula:on?'直線位於平面內':'n·u=0; d=abs(n·A-d)/norm(n)',...(!on?{segment:projected.segment}:{}),auxiliary:projected?.auxiliary||[]};}
    const parameter=residual/denominator/norm(l.direction),intersection=add(l.point,scale(l.direction,parameter));return {status:'intersecting',type:'line-plane',value:0,distance:0,angle,parameter,intersection,point:intersection,formula:'t=(d-dot(n,A))/dot(n,u)',auxiliary:[visual('point',{position:intersection,label:'H'})]};
  }
  function planePair(first,second) {
    const a=validate(first),b=validate(second);if(a.type!=='plane'||b.type!=='plane')throw Error('請選擇兩個平面。');
    const u=unit(a.normal),v=unit(b.normal),ca=a.constant/norm(a.normal),cb=b.constant/norm(b.normal),n=cross(u,v),squared=dot(n,n),c=clamp(dot(u,v)),angle=Math.atan2(norm(n),Math.abs(c))*180/Math.PI;
    if(squared<=EPS*EPS){const distance=Math.abs(ca-(c>=0?cb:-cb)),same=distance<=EPS*Math.max(1,Math.abs(ca),Math.abs(cb));return {status:same?'coincident':'parallel',type:'plane-plane',value:distance,distance,angle,formula:same?'兩平面重合':'d=abs(d₁/norm(n₁)-d₂/norm(n₂))',auxiliary:[]};}
    const point=scale(cross(sub(scale(v,ca),scale(u,cb)),n),1/squared),line=visual('line',{point,direction:unit(n),label:'交線'});return {status:'intersecting',type:'plane-plane',value:0,distance:0,angle,line,formula:'u=cross(n₁,n₂); n₁·P=d₁, n₂·P=d₂',auxiliary:[line]};
  }
  function spherePlane(sphere,plane) {
    const s=validate(sphere),p=validate(plane);if(s.type!=='sphere'||p.type!=='plane')throw Error('請選擇一個球面與一個平面。');
    const measured=pointPlane(s.center,p),gap=s.radius-measured.distance,tolerance=EPS*Math.max(1,s.radius,measured.distance);
    if(gap< -tolerance)return {status:'disjoint',type:'sphere-plane',distance:measured.distance,radius:null,area:0,center:measured.foot,normal:unit(p.normal),formula:'d>R：沒有交線',auxiliary:[]};
    const radius=gap<=tolerance?0:Math.sqrt(Math.max(0,(s.radius-measured.distance)*(s.radius+measured.distance))),exactSquared=s.radius**2-measured.distance**2;
    return {status:radius===0?'tangent':'circle',type:'sphere-plane',distance:measured.distance,radius,value:radius,area:Math.PI*radius**2,center:measured.foot,normal:unit(p.normal),formula:`r=sqrt(${text(s.radius**2)}-(${text(measured.distance)})^2)`,exact:`sqrt(${text(exactSquared)})`,auxiliary:[visual('point',{position:measured.foot,label:'截圓心'}),visual('circle',{center:measured.foot,normal:p.normal,radius,label:'截圓'})]};
  }
  function threePlanes(planes) {
    if(!Array.isArray(planes)||planes.length!==3)throw Error('請選擇三個平面。');
    const p=planes.map(validate);if(p.some(e=>e.type!=='plane'))throw Error('三個物件都須為平面。');
    const rows=p.map(e=>{const len=norm(e.normal);return [...scale(e.normal,1/len),e.constant/len];}),pivots=[];let row=0;
    for(let col=0;col<3&&row<3;col++) {
      let best=row;for(let i=row+1;i<3;i++)if(Math.abs(rows[i][col])>Math.abs(rows[best][col]))best=i;
      if(Math.abs(rows[best][col])<=EPS)continue;[rows[row],rows[best]]=[rows[best],rows[row]];
      const pivot=rows[row][col];rows[row]=rows[row].map(x=>x/pivot);
      for(let i=0;i<3;i++)if(i!==row){const factor=rows[i][col];rows[i]=rows[i].map((x,j)=>x-factor*rows[row][j]);}
      pivots.push(col);row++;
    }
    const tolerance=EPS*Math.max(1,...p.map(e=>Math.abs(e.constant/norm(e.normal))));
    if(rows.some(r=>Math.max(...r.slice(0,3).map(Math.abs))<=EPS&&Math.abs(r[3])>tolerance))return {status:'inconsistent',rank:row,point:null,directions:[],formula:'係數秩小於增廣矩陣秩：無公共交點',auxiliary:[]};
    const point=[0,0,0];pivots.forEach((c,i)=>point[c]=rows[i][3]);const free=[0,1,2].filter(c=>!pivots.includes(c)),directions=free.map(c=>{const u=[0,0,0];u[c]=1;pivots.forEach((pc,i)=>u[pc]=-rows[i][c]);return u;});
    const status=row===3?'unique':'infinite',auxiliary=row===3?[visual('point',{position:point,label:'P'})]:row===2?[visual('line',{point,direction:directions[0],label:'公共交線'})]:[p[0]];
    return {status,rank:row,point,directions,formula:row===3?`P=${tuple(point)}`:`秩 ${row}：${3-row} 個自由參數`,auxiliary};
  }
  function polyhedronPlane(polyhedron,plane) {
    const o=validate(polyhedron),p=validate(plane);if(o.type!=='polyhedron'||p.type!=='plane')throw Error('請選擇多面體與截平面。');
    const n=unit(p.normal),d=p.constant/norm(p.normal),points=[],edges=new Set(),tolerance=EPS*Math.max(1,...o.points.map(norm));
    const save=q=>{if(!points.some(v=>norm(sub(v,q))<=tolerance))points.push(q);};
    for(const face of o.faces)for(let i=0;i<3;i++){const a=face[i],b=face[(i+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(',');if(edges.has(key))continue;edges.add(key);const A=o.points[a],B=o.points[b],da=dot(n,A)-d,db=dot(n,B)-d;if(Math.abs(da)<=tolerance)save(A.slice());if(Math.abs(db)<=tolerance)save(B.slice());if(da*db<0)save(add(A,scale(sub(B,A),da/(da-db))));}
    if(points.length<3)return {status:points.length?'tangent':'disjoint',type:'polyhedron-plane',points,area:0,value:0,formula:points.length?'截面退化為點或線段':'截平面未通過多面體',auxiliary:points.map((position,i)=>visual('point',{position,label:`H${i+1}`}))};
    const center=scale(points.reduce(add,[0,0,0]),1/points.length),reference=Math.abs(n[0])<.8?[1,0,0]:[0,1,0],u=unit(cross(n,reference)),v=cross(n,u);
    points.sort((a,b)=>Math.atan2(dot(sub(a,center),v),dot(sub(a,center),u))-Math.atan2(dot(sub(b,center),v),dot(sub(b,center),u)));
    const area=Math.abs(points.reduce((sum,a,i)=>sum+dot(n,cross(sub(a,center),sub(points[(i+1)%points.length],center))),0))/2;
    return {status:'polygon',type:'polyhedron-plane',points,center,normal:n,area,value:area,formula:`A=${text(area)}`,auxiliary:[visual('polygon',{points,label:'截面'})]};
  }
  function pointSphere(point,sphere) {
    const p=Array.isArray(point)?vector(point):validate(point).position,s=validate(sphere);if(!p||s.type!=='sphere')throw Error('請選擇點與球面。');const centerDistance=norm(sub(p,s.center)),difference=centerDistance-s.radius,tolerance=EPS*Math.max(1,s.radius,centerDistance);
    return {status:Math.abs(difference)<=tolerance?'on-sphere':difference<0?'inside':'outside',type:'point-sphere',distance:Math.abs(difference),value:Math.abs(difference),centerDistance,formula:`norm(P-C)=${text(centerDistance)}; R=${text(s.radius)}`,segment:[s.center,p],auxiliary:[]};
  }
  function vectorPair(first,second) {
    const a=Array.isArray(first)?vector(first):validate(first).direction,b=Array.isArray(second)?vector(second):validate(second).direction;if(!a||!b)throw Error('請選擇兩個向量。');
    const product=dot(a,b),productCross=cross(a,b),angle=norm(a)&&norm(b)?Math.atan2(norm(cross(unit(a),unit(b))),dot(unit(a),unit(b)))*180/Math.PI:null;
    return {status:angle===null?'zero-vector':'regular',type:'vector-vector',value:product,dot:product,cross:productCross,angle,projection:norm(b)?scale(unit(b),dot(a,unit(b))):null,formula:`dot(u,v)=${text(product)}; cross(u,v)=${tuple(productCross)}`,auxiliary:[]};
  }
  function volume(object) {
    const o=validate(object);if(o.type==='revolution')return revolutionVolume(o);
    if(o.type!=='polyhedron')throw Error('請選擇多面體或旋轉體。');
    let signed;
    if(o.kind==='tetrahedron')signed=dot(sub(o.points[1],o.points[0]),cross(sub(o.points[2],o.points[0]),sub(o.points[3],o.points[0])))/6;
    else if(['box','parallelepiped'].includes(o.kind))signed=dot(sub(o.points[1],o.points[0]),cross(sub(o.points[2],o.points[0]),sub(o.points[4],o.points[0])));
    else { const origin=o.points[0];signed=o.faces.reduce((s,[a,b,c])=>s+dot(sub(o.points[a],origin),cross(sub(o.points[b],origin),sub(o.points[c],origin))),0)/6; }
    const value=Math.abs(signed);return {status:value<=EPS?'degenerate':'regular',type:'volume',value,volume:value,signedVolume:signed,formula:o.source,auxiliary:[]};
  }
  function revolutionVolume(object) {
    const o=validate(object);if(o.type!=='revolution')throw Error('請選擇旋轉體。');
    const outer=expression(o.expression,['x']),inner=expression(o.innerExpression,['x']);let invalid=false;
    const area=x=>{const r=outer.evaluate({x}),s=inner.evaluate({x});if(!finite(r)||!finite(s)||s<0||r<s||r>LIMIT){invalid=true;return NaN;}return Math.PI*(r-s)*(r+s);};
    const result=M.integrate(area,...o.domain,{tolerance:1e-8});
    let exact=null;
    if(result.converged)try {
      const squared=tree=>{if(tree.kind==='call'&&tree.name==='sqrt')return qpolynomial(tree.args[0]);const p=qpolynomial(tree),out=new Map();for(const [ka,a]of p)for(const [kb,b]of p){const k=ka.split(',').map((v,i)=>Number(v)+Number(kb.split(',')[i])).join(',');out.set(k,qadd(out.get(k)||Q(0n),qmul(a,b)));}return out;};
      const f=squared(outer.tree),g=squared(inner.tree);for(const [k,v]of g)f.set(k,qadd(f.get(k)||Q(0n),Q(-v[0],v[1])));
      const low=rational(o.domain[0]),high=rational(o.domain[1]);let integral=Q(0n);
      for(const [key,c]of f){const powers=key.split(',').map(Number);if(powers[1]||powers[2])throw Error('非軸向多項式。');const power=BigInt(powers[0]+1),difference=qadd(Q(high[0]**power,high[1]**power),Q(-(low[0]**power),low[1]**power));integral=qadd(integral,qdiv(qmul(c,difference),Q(power)));}
      exact=integral[0]===0n?'0':`${integral[1]===1n?qtext(integral):'('+qtext(integral)+')'}pi`;
    }catch(_){}
    return {status:invalid?'invalid-radius':result.converged?'regular':'not-converged',type:'revolution-volume',value:result.converged?result.value:null,volume:result.converged?result.value:null,exact,error:result.converged?result.error:null,evaluations:result.evaluations||0,formula:o.source,condition:'在整個區間內須滿足 0 ≤ 內半徑 ≤ 外半徑。x 表示旋轉軸上的坐標；y 軸模式採用同樣的軸向參數。',auxiliary:[]};
  }
  function measure(first,second,operation='auto') {
    if(!['auto','distance','angle','intersection','projection','dot','cross','add','subtract','midpoint'].includes(operation))throw Error('尚未支援這種幾何操作。');
    const a=validate(first),b=second?validate(second):null;let result;
    if(!b){if(['polyhedron','revolution'].includes(a.type))return volume(a);throw Error('這個操作須選擇兩個物件。');}
    if(operation==='midpoint'){if(a.type!=='point'||b.type!=='point')throw Error('中點須選擇兩個點。');const point=scale(add(a.position,b.position),.5);return {status:'regular',type:'midpoint',point,formula:`M=(A+B)/2=${tuple(point)}`,auxiliary:[visual('point',{position:point,label:'M'})]};}
    if(operation==='add'||operation==='subtract'){if(a.type!=='vector'||b.type!=='vector')throw Error('向量運算須選擇兩個向量。');const direction=operation==='add'?add(a.direction,b.direction):sub(a.direction,b.direction);return {status:'regular',type:'vector-'+operation,direction,value:norm(direction),formula:`u${operation==='add'?'+':'-'}v=${tuple(direction)}`,auxiliary:[visual('vector',{origin:[0,0,0],direction,label:operation==='add'?'u+v':'u-v'})]};}
    if(a.type==='point'&&b.type==='point'){const distance=norm(sub(a.position,b.position));result={status:distance<=EPS?'coincident':'regular',type:'point-point',value:distance,distance,formula:`d=sqrt(${text(dot(sub(a.position,b.position),sub(a.position,b.position)))})`,segment:[a.position,b.position],auxiliary:[]};}
    else if(a.type==='point'&&b.type==='plane')result=pointPlane(a,b);else if(b.type==='point'&&a.type==='plane')result=pointPlane(b,a);
    else if(a.type==='point'&&b.type==='line')result=pointLine(a,b);else if(b.type==='point'&&a.type==='line')result=pointLine(b,a);
    else if(a.type==='line'&&b.type==='line')result=linePair(a,b);
    else if(a.type==='line'&&b.type==='plane')result=linePlane(a,b);else if(b.type==='line'&&a.type==='plane')result=linePlane(b,a);
    else if(a.type==='plane'&&b.type==='plane')result=planePair(a,b);
    else if(a.type==='sphere'&&b.type==='plane')result=spherePlane(a,b);else if(b.type==='sphere'&&a.type==='plane')result=spherePlane(b,a);
    else if(a.type==='point'&&b.type==='sphere')result=pointSphere(a,b);else if(b.type==='point'&&a.type==='sphere')result=pointSphere(b,a);
    else if(a.type==='polyhedron'&&b.type==='plane')result=polyhedronPlane(a,b);else if(b.type==='polyhedron'&&a.type==='plane')result=polyhedronPlane(b,a);
    else if(a.type==='vector'&&b.type==='vector')result=vectorPair(a,b);
    else throw Error('目前可計算點、向量、直線、平面及球面的幾何關係。');
    if(['dot','cross'].includes(operation)&&result.type!=='vector-vector')throw Error('內積與外積須選擇兩個向量。');
    if(operation==='cross')return {...result,value:result.cross,formula:`cross(u,v)=${tuple(result.cross)}`,auxiliary:[visual('vector',{direction:result.cross,label:'u×v'})]};
    if(operation==='dot')return {...result,value:result.dot,formula:`dot(u,v)=${text(result.dot)}`};
    if(operation==='distance'&&result.distance===undefined)throw Error('這兩個物件未定義此距離操作。');
    if(operation==='distance'&&result.type==='sphere-plane'){const radius=a.type==='sphere'?a.radius:b.radius,distance=Math.max(0,result.distance-radius);return {...result,centerDistance:result.distance,distance,value:distance,formula:'d(S,E)=max(0,d(C,E)-R)'};}
    if(operation==='intersection'&&result.type==='vector-vector')throw Error('向量的交集請改以直線或點建立幾何物件。');
    if(operation==='intersection'&&result.type.startsWith('point-')){const on=['on-plane','on-line','on-sphere','coincident'].includes(result.status),point=a.type==='point'?a.position:b.position;return {...result,status:on?'intersection':'disjoint',point:on?point:null,formula:on?`交集=${tuple(point)}`:'交集為空',auxiliary:on?[visual('point',{position:point,label:'交點'})]:[]};}
    if(operation==='projection'&&!Array.isArray(result.projection))throw Error('投影請選擇點與直線、點與平面，或兩個非零向量。');
    if(operation==='projection'&&result.type==='vector-vector')return {...result,value:norm(result.projection),formula:`proj_v(u)=${tuple(result.projection)}`,auxiliary:[visual('vector',{direction:result.projection,label:'投影'})]};
    if(operation==='angle'&&result.angle===undefined)throw Error('這兩個物件沒有定義夾角。');
    if(operation==='angle')return {...result,value:result.angle,formula:result.type==='line-plane'?'θ=asin(abs(dot(u,n))/(norm(u)norm(n)))':result.type==='vector-vector'?'θ=acos(dot(u,v)/(norm(u)norm(v)))':'θ=acos(abs(dot(u,v))/(norm(u)norm(v)))'};
    return result;
  }
  function evaluate(object,parameters={}) {
    const o=validate(object);
    if(o.type==='parametricSurface')return o.expressions.map(s=>surfaceParameter(s).compiled.evaluate({x:parameters.u,y:parameters.v}));
    if(o.type==='parametric')return o.expressions.map(s=>expression(s,['t']).evaluate({t:parameters.t}));
    if(o.type==='surface')return [parameters.x,parameters.y,expression(o.expression,['x','y']).evaluate({x:parameters.x,y:parameters.y})];
    throw Error('此物件沒有參數座標算式。');
  }
  const api={parse,make,validate,validateScene,measure,evaluate,pointPlane,pointLine,linePair,linePlane,planePair,spherePlane,polyhedronPlane,pointSphere,threePlanes,vectorPair,volume,revolutionVolume,add,sub,scale,dot,cross,norm};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SpatialGeometry=Object.freeze(api);
})(typeof globalThis!=='undefined'?globalThis:this);
