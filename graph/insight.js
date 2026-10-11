/* Formula information is derived from the bounded AST, never fitted to samples. */
(function(root){
  'use strict';
  const M=typeof module!=='undefined'&&module.exports?require('./math.js'):root.GraphMath;
  const finite=Number.isFinite,MAX_DEGREE=6,MAX_NODES=160;
  const fmt=value=>Object.is(value,-0)?'0':String(value);
  const count=tree=>!tree?Infinity:1+(tree.args?tree.args.reduce((n,a)=>n+count(a),0):tree.child?count(tree.child):tree.left?count(tree.left)+count(tree.right):0);
  const mono=(i,j,value)=>new Map(value===0?[]:[[`${i},${j}`,value]]);
  function sum(a,b,scale=1){
    if(!a||!b)return null;const result=new Map(a);
    for(const [key,value] of b){const v=(result.get(key)||0)+scale*value;if(!finite(v))return null;if(v===0)result.delete(key);else result.set(key,v);}
    return result;
  }
  function scaled(a,scale){if(!a||!finite(scale))return null;const out=new Map();for(const[k,v]of a){const n=v*scale;if(!finite(n))return null;if(n!==0)out.set(k,n);}return out;}
  function product(a,b){
    if(!a||!b)return null;const out=new Map();
    for(const [ak,av]of a)for(const[bk,bv]of b){const[i,j]=ak.split(',').map(Number),[k,l]=bk.split(',').map(Number);if(i+j+k+l>MAX_DEGREE)return null;const key=`${i+k},${j+l}`,value=(out.get(key)||0)+av*bv;if(!finite(value))return null;if(value===0)out.delete(key);else out.set(key,value);}
    return out;
  }
  const scalar=p=>p&&[...p.keys()].every(k=>k==='0,0')?(p.get('0,0')||0):null;
  function polynomial(n,params){
    if(!n)return null;
    if(n.kind==='number'||n.kind==='constant')return finite(n.value)?mono(0,0,n.value):null;
    if(n.kind==='variable')return n.name==='x'?mono(1,0,1):n.name==='y'?mono(0,1,1):finite(params[n.name])?mono(0,0,params[n.name]):null;
    if(n.kind==='unary'||n.kind==='degree')return scaled(polynomial(n.child,params),n.kind==='degree'?Math.PI/180:n.op==='-'?-1:1);
    if(n.kind!=='binary')return null;
    const a=polynomial(n.left,params),b=polynomial(n.right,params);
    if(n.op==='+')return sum(a,b);if(n.op==='-')return sum(a,b,-1);if(n.op==='*')return product(a,b);
    if(n.op==='/'){const divisor=scalar(b);return divisor!==null&&divisor!==0?scaled(a,1/divisor):null;}
    if(n.op==='^'){const exponent=scalar(b);if(!a||!Number.isInteger(exponent)||exponent<0||exponent>MAX_DEGREE)return null;let out=mono(0,0,1);for(let i=0;i<exponent;i++)out=product(out,a);return out;}
    return null;
  }
  const coefficient=(p,i,j=0)=>p.get(`${i},${j}`)||0;
  const degree=p=>Math.max(0,...[...p.keys()].map(k=>k.split(',').map(Number).reduce((a,b)=>a+b,0)));
  const univariate=p=>p&&[...p.keys()].every(k=>k.endsWith(',0'));
  function textPolynomial(p){
    const terms=[...p].sort((a,b)=>{const[ai,aj]=a[0].split(',').map(Number),[bi,bj]=b[0].split(',').map(Number);return bi+bj-ai-aj||bi-ai;});
    return terms.map(([key,value],index)=>{const[i,j]=key.split(',').map(Number),variables=[i?'x'+(i>1?`^${i}`:''):'',j?'y'+(j>1?`^${j}`:''):''].filter(Boolean).join('*'),magnitude=Math.abs(value),body=variables?(magnitude===1?'':fmt(magnitude)+'*')+variables:fmt(magnitude);return(value<0?'-':index?'+':'')+body;}).join('')||'0';
  }
  function solvePolynomial(p){
    if(!univariate(p)||degree(p)>2)return null;
    let a=coefficient(p,2),b=coefficient(p,1),c=coefficient(p,0);
    if(a===0)return b===0?[]:finite(-c/b)?[-c/b]:null;
    const scale=Math.max(Math.abs(a),Math.abs(b),Math.abs(c));a/=scale;b/=scale;c/=scale;
    const discriminant=b*b-4*a*c;if(!finite(discriminant))return null;if(discriminant<0)return [];
    if(discriminant===0)return[-b/(2*a)];
    const q=-.5*(b+Math.sign(b||1)*Math.sqrt(discriminant)),values=[q/a,c/q].sort((x,y)=>x-y);
    return values.every(finite)?values:null;
  }
  function orderAt(p,x){
    let q=new Map(p);
    for(let order=0;order<=MAX_DEGREE;order++){
      let value=0,scale=0;for(let i=degree(q);i>=0;i--){value=value*x+coefficient(q,i);scale=scale*Math.abs(x)+Math.abs(coefficient(q,i));}
      if(!finite(value)||!finite(scale))return null;
      if(value!==0)return Math.abs(value)>64*Number.EPSILON*Math.max(1,scale)?order:null;
      if(!q.size)return Infinity;
      const next=new Map();for(const[key,v]of q){const[i]=key.split(',').map(Number);if(i)next.set(`${i-1},0`,i*v);}q=next;
    }
    return null;
  }
  function rational(n,params){
    const p=polynomial(n,params);if(p)return {p,q:mono(0,0,1),constraints:[]};
    if(n.kind==='unary'||n.kind==='degree'){const r=rational(n.child,params);if(!r)return null;r.p=scaled(r.p,n.kind==='degree'?Math.PI/180:n.op==='-'?-1:1);return r;}
    if(n.kind!=='binary')return null;
    if(n.op==='^'){
      const exponent=scalar(polynomial(n.right,params)),r=rational(n.left,params);
      if(!r||!Number.isInteger(exponent)||Math.abs(exponent)>MAX_DEGREE)return null;
      let p=mono(0,0,1),q=mono(0,0,1);for(let i=0;i<Math.abs(exponent);i++){p=product(p,exponent<0?r.q:r.p);q=product(q,exponent<0?r.p:r.q);if(!p||!q)return null;}
      return{p,q,constraints:[...r.constraints,...(exponent<0?[r.p]:[])]};
    }
    const a=rational(n.left,params),b=rational(n.right,params);if(!a||!b)return null;let out;
    if(n.op==='+'||n.op==='-')out={p:sum(product(a.p,b.q),product(b.p,a.q),n.op==='-'?-1:1),q:product(a.q,b.q)};
    else if(n.op==='*')out={p:product(a.p,b.p),q:product(a.q,b.q)};
    else if(n.op==='/')out={p:product(a.p,b.q),q:product(a.q,b.p)};
    else return null;
    if(!out.p||!out.q)return null;
    out.constraints=[...a.constraints,...b.constraints,...(n.op==='/'?[b.p]:[])];return out;
  }
  function stringify(n){
    if(n.kind==='number')return String(n.value);if(n.kind==='constant')return n.name;if(n.kind==='variable')return n.name;
    if(n.kind==='unary')return`${n.op}(${stringify(n.child)})`;if(n.kind==='degree')return`(${stringify(n.child)})*pi/180`;
    if(n.kind==='call')return`${n.name}(${n.args.map(stringify).join(',')})`;
    if(n.kind==='binary'&&!['&&','||'].includes(n.op))return`(${stringify(n.left)})${n.op}(${stringify(n.right)})`;
    return null;
  }
  function symbolicDerivative(tree,params={}){
    if(count(tree)>64)return null;
    const mul=(a,b)=>a==='0'||b==='0'?'0':a==='1'?b:b==='1'?a:`(${a})*(${b})`;
    const add=(a,b,minus=false)=>b==='0'?a:a==='0'?(minus?`-(${b})`:b):`(${a})${minus?'-':'+'}(${b})`;
    function d(n){
      if(n.kind==='number'||n.kind==='constant')return'0';if(n.kind==='variable')return n.name==='x'?'1':'0';
      if(n.kind==='unary'){const v=d(n.child);return v===null?null:n.op==='-'&&v!=='0'?`-(${v})`:v;}
      if(n.kind==='degree'){const v=d(n.child);return v===null?null:mul(v,'pi/180');}
      if(n.kind==='call'){
        if(n.args.length!==1)return null;const u=stringify(n.args[0]),v=d(n.args[0]);if(v===null)return null;
        const factors={sin:`cos(${u})`,cos:`-sin(${u})`,tan:`1/(cos(${u}))^2`,exp:`exp(${u})`,ln:`1/(${u})`,log:`1/((${u})*ln(10))`,sqrt:`1/(2*sqrt(${u}))`,cbrt:`1/(3*cbrt(${u})^2)`,atan:`1/(1+(${u})^2)`,sinh:`cosh(${u})`,cosh:`sinh(${u})`,tanh:`1/(cosh(${u}))^2`,abs:`sign(${u})`};
        return factors[n.name]?mul(factors[n.name],v):null;
      }
      if(n.kind!=='binary')return null;const a=d(n.left),b=d(n.right),u=stringify(n.left),v=stringify(n.right);if(a===null||b===null)return null;
      if(n.op==='+')return add(a,b);if(n.op==='-')return add(a,b,true);if(n.op==='*')return add(mul(a,v),mul(u,b));
      if(n.op==='/')return`(${add(mul(a,v),mul(u,b),true)})/((${v})^2)`;
      if(n.op==='^'&&b==='0')return mul(mul(v,`(${u})^((${v})-1)`),a);
      if(n.op==='^'&&a==='0'&&scalar(polynomial(n.left,params))>0)return mul(mul(`(${u})^(${v})`,`ln(${u})`),b);
      return null;
    }
    const result=d(tree);return result&&result.length<=1400?result:null;
  }
  function affineFamily(n,params){
    function constant(node){const p=polynomial(node,params);return scalar(p);}
    if(n.kind==='call'&&n.args.length===1&&['sin','cos','tan','exp','ln','log','sqrt','abs','sinh','cosh','tanh'].includes(n.name))return{amplitude:1,offset:0,name:n.name,arg:n.args[0]};
    if(n.kind==='binary'&&n.op==='^'){const base=constant(n.left);if(base!==null&&base>0&&base!==1)return{amplitude:1,offset:0,name:'power-exp',base,arg:n.right};}
    if(n.kind==='unary'){const f=affineFamily(n.child,params);if(!f)return null;if(n.op==='-'){f.amplitude*=-1;f.offset*=-1;}return f;}
    if(n.kind!=='binary')return null;
    let f=affineFamily(n.left,params),c=constant(n.right),right=false;
    if(!f||c===null){f=affineFamily(n.right,params);c=constant(n.left);right=true;}
    if(!f||c===null)return null;
    if(n.op==='+')f.offset+=c;
    else if(n.op==='-'){if(right){f.amplitude*=-1;f.offset=c-f.offset;}else f.offset-=c;}
    else if(n.op==='*'){f.amplitude*=c;f.offset*=c;}
    else if(n.op==='/'&&!right&&c!==0){f.amplitude/=c;f.offset/=c;}
    else return null;
    return finite(f.amplitude)&&finite(f.offset)?f:null;
  }
  function describe(parsed,params={}){
    if(typeof parsed==='string'){try{parsed=M.parse(parsed);}catch{return{type:'invalid',title:'尚未解析',lines:[],notes:['請先修正算式。'],domain:null,properties:{}};}}
    const result={type:parsed?.kind||'unknown',title:'數學圖形',lines:[],notes:[],domain:null,properties:{}};
    if(!parsed||typeof parsed!=='object')return result;
    let trees=parsed.trees;
    if(!trees&&typeof parsed.source==='string'){try{trees=M.parse(parsed.source).trees;}catch{}}
    if(!Array.isArray(trees)||trees.some(t=>count(t)>MAX_NODES)){result.notes.push('此算式保留原圖形；結構資訊超出分析範圍。');return result;}
    const scope=Object.create(null);for(const name of M.PARAMETERS)if(finite(params[name]))scope[name]=params[name];
    if(parsed.restricted)result.notes.push('以下特徵仍須套用輸入的範圍條件；範圍外不屬於此圖形。');
    function finish(){if(parsed.restricted&&result.domain)result.domain+='，並滿足輸入的範圍條件';return result;}
    if(parsed.kind==='point'){const values=trees.map(t=>scalar(polynomial(t,scope)));result.title='平面坐標點';result.type='point';if(values.every(v=>v!==null&&finite(v))){result.properties.point=values;result.lines.push(`P=(${values.map(fmt).join(',')})`);}return finish();}
    if(parsed.kind==='parametric'){result.title='參數曲線';result.lines.push(`x(t)=${stringify(trees[0])}`,`y(t)=${stringify(trees[1])}`);result.notes.push('同一個 t 決定一組坐標；曲線方向依 t 遞增。');return finish();}
    if(parsed.kind==='polar'){result.title='極坐標曲線';result.lines.push(`r(t)=${stringify(trees[0])}`,'x=r*cos(t), y=r*sin(t)');result.notes.push('角度 t 以弧度計算；負半徑會落在相反方向。');return finish();}
    if(parsed.kind==='implicit'||parsed.kind==='inequality'){
      const p=sum(polynomial(trees[0],scope),polynomial(trees[1],scope),-1);
      if(!p||degree(p)>2){result.title=parsed.kind==='inequality'?'隱式不等式區域':'隱式曲線';result.notes.push('無法套用二次曲線的標準分類；繪圖仍依原始關係式進行。');return finish();}
      result.properties.coefficients=Object.fromEntries(p);result.lines.push(`${textPolynomial(p)}${parsed.relation||'='}0`);
      if(parsed.kind==='inequality'){result.title='多項式不等式區域';result.type='inequality';result.notes.push(['<=','>='].includes(parsed.relation)?'等號包含邊界曲線。':'嚴格不等式不包含邊界曲線。');return finish();}
      const A=coefficient(p,2),B=coefficient(p,1,1),C=coefficient(p,0,2),D=coefficient(p,1),E=coefficient(p,0,1),F=coefficient(p,0);
      if(degree(p)<2){if(D===0&&E===0){result.type=F===0?'identity':'empty';result.title=F===0?'整個平面':'無實數圖形';}else{result.type='line';result.title='平面直線';result.properties.normal=[D,E];result.lines.push(`n=(${fmt(D)},${fmt(E)})`);}return finish();}
      const discriminant=B*B-4*A*C,det=A*C-B*B/4;result.properties.discriminant=discriminant;result.lines.push(`B^2-4*A*C=${fmt(discriminant)}`);
      if(A===C&&B===0&&A!==0){
        const center=[-D/(2*A),-E/(2*A)],radiusSquared=center[0]**2+center[1]**2-F/A;
        if(!center.every(finite)||!finite(radiusSquared)){result.notes.push('係數超出有限精度分析範圍。');return finish();}
        result.properties.center=center;result.properties.radiusSquared=radiusSquared;result.type=radiusSquared<0?'empty':radiusSquared===0?'point-conic':'circle';result.title=radiusSquared<0?'無實數圓':radiusSquared===0?'退化成單點的圓':'圓';
        result.lines.push(`C=(${center.map(fmt).join(',')})`,`r^2=${fmt(radiusSquared)}`);if(radiusSquared>=0)result.lines.push(`r=sqrt(${fmt(radiusSquared)})`);return finish();
      }
      const determinant=A*C*F+B*D*E/4-A*E*E/4-C*D*D/4-B*B*F/4;result.properties.determinant=determinant;
      if(![discriminant,det,determinant].every(finite)){result.notes.push('係數超出有限精度分析範圍。');return finish();}
      if(determinant===0){result.type='degenerate-conic';result.title='退化二次曲線';result.notes.push('三階係數行列式為零，須區分交叉直線、重合直線、單點與空集合。');}
      else{result.type=discriminant<0?'ellipse':discriminant>0?'hyperbola':'parabola';result.title=discriminant<0?'橢圓':discriminant>0?'雙曲線':'拋物線';}
      if(det!==0){const center=[(B*E/2-C*D)/(2*det),(B*D/2-A*E)/(2*det)],rhs=-(F+(D*center[0]+E*center[1])/2),gap=Math.hypot(A-C,B),large=(A+C+Math.sign(A+C||1)*gap)/2,eigenvalues=[large,det/large];
        if(center.every(finite)&&finite(rhs)&&eigenvalues.every(finite)){result.properties.center=center;result.properties.principalValue=rhs;result.properties.eigenvalues=eigenvalues;result.lines.push(`C=(${center.map(fmt).join(',')})`);
          if(discriminant<0&&rhs===0){result.type='point-conic';result.title='退化成單點的二次曲線';}
          else if(discriminant<0&&rhs/eigenvalues[0]<0){result.type='empty';result.title='無實數橢圓';result.notes.push('平移後的平方項與右側符號相反。');}
        }
      }
      result.notes.push(B!==0?'存在 xy 項，可旋轉坐標軸理解主方向。':'主方向與坐標軸平行。');return finish();
    }
    if(parsed.kind!=='function')return finish();
    const tree=trees[0],p=polynomial(tree,scope);
    if(p&&univariate(p)){
      const n=degree(p);result.type=n===0?'constant':n===1?'line':n===2?'quadratic':'polynomial';result.title=n===0?'常數函數':n===1?'一次函數':n===2?'二次函數':`${n} 次多項式`;result.domain='所有實數';result.properties.degree=n;result.properties.coefficients=Array.from({length:n+1},(_,i)=>coefficient(p,i));result.lines.push(`y=${textPolynomial(p)}`);
      const derivative=new Map();for(const[key,value]of p){const[i]=key.split(',').map(Number);if(i)derivative.set(`${i-1},0`,value*i);}if([...derivative.values()].every(finite)){result.derivative=textPolynomial(derivative);result.lines.push(`f′(x)=${result.derivative}`);}else result.notes.push('導數係數超出有限精度分析範圍。');
      if(n===0){result.properties.value=coefficient(p,0);result.lines.push(`y=${fmt(coefficient(p,0))}`);}
      if(n===1){result.properties.slope=coefficient(p,1);result.properties.intercept=coefficient(p,0);result.lines.push(`斜率=${fmt(result.properties.slope)}`,`y 軸截距=${fmt(result.properties.intercept)}`);}
      if(n===2){const a=coefficient(p,2),b=coefficient(p,1),c=coefficient(p,0),scale=Math.max(Math.abs(a),Math.abs(b),Math.abs(c)),as=a/scale,bs=b/scale,cs=c/scale,vertex=[-bs/(2*as),(cs-bs*bs/(4*as))*scale],discriminant=b*b-4*a*c,normalized=bs*bs-4*as*cs;
        if(!vertex.every(finite)||!finite(normalized)){result.notes.push('頂點或判別式超出有限精度分析範圍。');return finish();}
        const stable=finite(discriminant)&&(discriminant!==0||normalized===0),rootA=stable?a:as,rootB=stable?b:bs,rootD=stable?discriminant:normalized;
        result.properties.vertex=vertex;result.properties.discriminant=stable?discriminant:null;result.properties.discriminantSign=Math.sign(normalized);result.properties.roots=solvePolynomial(p);result.lines.push(`頂點=(${vertex.map(fmt).join(',')})`,`對稱軸 x=${fmt(vertex[0])}`,`Δ${stable?'':'（係數同比縮放）'}=${fmt(rootD)}`);result.notes.push(a>0?'開口向上；頂點為最小值。':'開口向下；頂點為最大值。');if(!stable)result.notes.push('原判別式超出浮點表示範圍，零點改以同比縮放的係數計算。');if(result.properties.roots?.length){result.lines.push(`x=(-(${fmt(rootB)})+sqrt(${fmt(rootD)}))/(2*(${fmt(rootA)}))`,`x=(-(${fmt(rootB)})-sqrt(${fmt(rootD)}))/(2*(${fmt(rootA)}))`);}else if(normalized<0)result.notes.push('判別式小於零，沒有實數零點。');}
      return finish();
    }
    const r=rational(tree,scope);
    if(r&&univariate(r.p)&&univariate(r.q)&&r.constraints.length){
      result.type='rational';result.title='有理函數';result.lines.push(`y=(${textPolynomial(r.p)})/(${textPolynomial(r.q)})`);result.domain=[...new Set(r.constraints.map(q=>`(${textPolynomial(q)}) != 0`))].join(' 且 ');result.properties.denominator=textPolynomial(r.q);
      if(r.constraints.some(q=>scalar(q)===0)){result.type='empty';result.title='原式分母恆為零';result.notes.push('沒有可代入的實數 x；不可先約分後忽略原分母。');return finish();}
      const roots=[...new Set(r.constraints.flatMap(q=>solvePolynomial(q)||[]))].sort((a,b)=>a-b);result.properties.excluded=roots;
      if(roots.length)result.lines.push(`排除 x=${roots.map(fmt).join(',')}`);
      result.properties.poles=[];result.properties.holes=[];
      for(const x of roots){const numeratorOrder=orderAt(r.p,x),denominatorOrder=orderAt(r.q,x);if(numeratorOrder===null||denominatorOrder===null)continue;if(denominatorOrder>numeratorOrder)result.properties.poles.push(x);else result.properties.holes.push(x);}
      if(result.properties.poles.length)result.lines.push(`垂直漸近線 x=${result.properties.poles.map(fmt).join(',')}`);
      if(result.properties.holes.length)result.lines.push(`可去不連續點 x=${result.properties.holes.map(fmt).join(',')}`);
      result.notes.push('約去因式後，原式分母為零的位置仍須排除；不一定每個排除點都是漸近線。');
      const pn=degree(r.p),qn=degree(r.q);if(qn>0&&pn<qn){result.properties.horizontalAsymptote=0;result.lines.push('水平漸近線 y=0');}else if(qn>0&&pn===qn){const asymptote=coefficient(r.p,pn)/coefficient(r.q,qn);if(finite(asymptote)){result.properties.horizontalAsymptote=asymptote;result.lines.push(`水平漸近線 y=${fmt(asymptote)}`);}}
      const d=symbolicDerivative(tree,scope);if(d){result.derivative=d;result.lines.push(`f′(x)=${d}`);}return finish();
    }
    const family=affineFamily(tree,scope),arg=family&&polynomial(family.arg,scope);
    if(family&&univariate(arg)&&degree(arg)<=1){
      const k=coefficient(arg,1),b=coefficient(arg,0),A=family.amplitude,c=family.offset,name=family.name;
      result.type=['sin','cos','tan'].includes(name)?'trigonometric':['ln','log'].includes(name)?'logarithmic':['exp','power-exp'].includes(name)?'exponential':name==='sqrt'?'radical':name==='abs'?'absolute':'hyperbolic';
      result.title={trigonometric:'三角函數',logarithmic:'對數函數',exponential:'指數函數',radical:'平方根函數',absolute:'絕對值函數',hyperbolic:'雙曲函數'}[result.type];result.properties={amplitude:A,offset:c,argumentSlope:k,argumentIntercept:b};
      result.domain=['ln','log'].includes(name)?`${textPolynomial(arg)} > 0`:name==='sqrt'?`${textPolynomial(arg)} >= 0`:name==='tan'?`cos(${textPolynomial(arg)}) != 0`:'所有實數';
      if(k===0){let value;try{value=M.compile(stringify(tree)).evaluate({...scope,x:0});}catch{}result.properties.value=finite(value)?value:null;result.notes.push(finite(value)?'引數不含 x，這組參數下為常數函數。':'這組參數在實數範圍內未定義。');}
      if(['sin','cos','tan'].includes(name)&&k!==0&&A!==0){const period=(name==='tan'?Math.PI:2*Math.PI)/Math.abs(k);result.properties.period=period;result.lines.push(`週期=${name==='tan'?'pi':'2*pi'}/abs(${fmt(k)})`);if(name!=='tan'){result.properties.range=[c-Math.abs(A),c+Math.abs(A)];result.lines.push(`值域 [${fmt(c-Math.abs(A))},${fmt(c+Math.abs(A))}]`);}}
      if(['ln','log','sqrt','abs'].includes(name)&&k!==0){result.properties.boundary=-b/k;result.lines.push(`引數為零的位置 x=${fmt(-b/k)}`);}
      if(['exp','power-exp'].includes(name)){const rate=k*(name==='power-exp'?Math.log(family.base):1);result.properties.growthRate=rate;result.lines.push(`指數成長率=${fmt(rate)}`);if(k!==0&&A!==0){result.properties.horizontalAsymptote=c;result.lines.push(`水平漸近線 y=${fmt(c)}`);}if(name==='power-exp')result.properties.base=family.base;}
    }else{result.title='一般函數';result.notes.push('此算式保留完整圖形；未套用單一標準函數分類。');}
    const d=symbolicDerivative(tree,scope);if(d){result.derivative=d;result.lines.push(`f′(x)=${d}`);result.notes.push('導數式適用於原式有定義且可微的位置；尖點、端點與分母為零處須另行判斷。');}
    return finish();
  }
  const api=Object.freeze({describe});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GraphInsight=api;
})(typeof globalThis!=='undefined'?globalThis:this);
