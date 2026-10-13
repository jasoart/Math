/* High-school investigations: bounded algebra, transparent numerical evidence,
 * and constructions that become ordinary editable graph rows. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./math.js'):root.GraphMath,typeof module==='object'&&module.exports?require('./insight.js'):root.GraphInsight,typeof module==='object'&&module.exports?require('../curriculum/geometry.js'):root.MathWebGeometry);if(typeof module==='object'&&module.exports)module.exports=api;else root.GraphStudy=api;})(typeof globalThis!=='undefined'?globalThis:this,function(M,I,G){
'use strict';
const finite=Number.isFinite,fmt=n=>finite(n)?String(Number(n.toPrecision(9))):'未定義';
const fail=s=>{throw Error(s);};
const scalar=(v,label='數值')=>{if(!finite(v)||Math.abs(v)>1e6)fail(label+'需為 ±1000000 內的有限數。');return v;};
const poly=(p,x)=>p.reduceRight((v,c)=>v*x+c,0),degree=p=>{let n=p.length-1;while(n&&p[n]===0)n--;return n;};
const derivative=p=>p.slice(1).map((v,i)=>v*(i+1));
function roots(p){
 const n=degree(p);if(n>2)return null;if(n===0)return p[0]===0?{all:true,values:[]}:{all:false,values:[]};
 if(n===1){const r=-p[0]/p[1];return finite(r)?{all:false,values:[r]}:null;}
 const scale=Math.max(...p.map(Math.abs)),a=p[2]/scale,b=p[1]/scale,c=p[0]/scale,d=b*b-4*a*c;
 if(!finite(d)||a===0)return null;if(d<0)return{all:false,values:[]};if(d===0)return{all:false,values:[-b/(2*a)]};
 const q=-.5*(b+Math.sign(b||1)*Math.sqrt(d)),values=[q/a,c/q].sort((a,b)=>a-b);return values.every(finite)?{all:false,values:[...new Set(values)]}:null;
}
const row=(text,label)=>({text,label:label||'',visible:true});
const point=(x,y,label)=>row(`(${x},${y})`,label);
function functionOf(source,params={}){const parsed=typeof source==='string'?M.parse(source):source;if(parsed.kind!=='function')fail('請選擇一條有效的 y=f(x)。');return{parsed,at:x=>parsed.at(x,undefined,params),slope:x=>parsed.derivative(x,params),expression:I.expression(parsed)};}
const report=(title,signal,steps,trap,challenge,extra={})=>({title,signal,steps,trap,challenge,headers:[],rows:[],graphRows:[],...extra});
function bounds(a,b){scalar(a,'區間起點');scalar(b,'區間終點');if(!(b>a)||b-a<1e-9)fail('區間終點須大於起點，寬度至少 10⁻⁹。');}
function signChart(source,params,a,b,relation='>=',other=null){
 bounds(a,b);if(!['>','>=','<','<=','=','!='].includes(relation))fail('不支援的比較關係。');
 const f=functionOf(source,params),g=other?functionOf(other,params):null;
 if(f.parsed.restricted||g?.parsed.restricted)fail('符號表目前不處理 {範圍}；請以完整定義域函數分析，再取範圍交集。');
 const expr=g?`(${f.expression})-(${g.expression})`:f.expression;
 if(expr.length>480)fail('比較式過長，請化簡算式。');
 const parsed=M.parse(expr),r=I.algebra(parsed,params);if(!r)fail('完整符號表支援多項式／有理式；其他函數請使用數值表及圖形判讀。');
 const sets=[r.numerator,r.denominator,...r.constraints].map(roots);
 if(sets.some(s=>s===null))fail('完整符號表需要分子、分母與禁點條件各不超過二次；請先因式分解或改用數值分析。');
 if(sets.slice(1).some(s=>s.all))fail('原式分母恆為零，定義域為空集合。');
 const excluded=[...new Set(sets.slice(1).flatMap(s=>s.values))],zeros=sets[0].values.filter(x=>!excluded.includes(x));
 const cuts=[...new Set([a,b,...zeros,...excluded].filter(x=>x>=a&&x<=b))].sort((x,y)=>x-y),parts=[];
 const accept=s=>relation==='>'?s>0:relation==='>='?s>=0:relation==='<'?s<0:relation==='<='?s<=0:relation==='='?s===0:s!==0;
 const at=x=>parsed.at(x,undefined,params);
 for(let i=0;i<cuts.length;i++){
  const x=cuts[i],blocked=excluded.includes(x),zero=zeros.includes(x)||sets[0].all,v=blocked?NaN:zero?0:at(x);
  if(!blocked&&!finite(v))fail('端點數值未定義或溢位，請調整區間。');
  parts.push({from:x,to:x,point:true,excluded:blocked,sign:finite(v)?Math.sign(v):null,accepted:finite(v)&&accept(Math.sign(v))});
  if(i<cuts.length-1){const y=cuts[i+1],mid=x+(y-x)/2,value=at(mid);if(!finite(value)||(value===0&&!sets[0].all))fail('區間內數值溢位、消去或精度不足，請縮小範圍或調整係數。');parts.push({from:x,to:y,point:false,excluded:false,sign:Math.sign(value),accepted:accept(Math.sign(value))});}
 }
 const selected=parts.filter(p=>p.accepted).map(p=>p.point?`{${fmt(p.from)}}`:`(${fmt(p.from)}, ${fmt(p.to)})`).join(' ∪ ')||'空集合';
 return report('方程與不等式符號表','先找零點與原分母禁點，再在各區間判斷正負。',[`比較 ${g?'f(x)−g(x)':'f(x)'} ${relation} 0，限於 [${fmt(a)}, ${fmt(b)}]。`,`零點：${zeros.map(fmt).join('、')|| (sets[0].all?'在定義域內恆為零':'無')}`,`禁點：${excluded.map(fmt).join('、')||'無'}`,`解集：${selected}`],'端點以單點列明；嚴格不等式不含零點，約分後仍不可補回禁點。係數採浮點結構運算。','把比較符號改成嚴格不等式，哪些端點會消失？',{headers:['區段','符號','是否符合'],rows:parts.map(p=>[p.point?`x = ${fmt(p.from)}`:`(${fmt(p.from)}, ${fmt(p.to)})`,p.excluded?'未定義':p.sign===null?'未能判定':p.sign===0?'0':p.sign>0?'+':'−',p.accepted?'是':'否']),parts,zeros,excluded,complete:true,solution:selected});
}
function variation(source,params,a,b){
 const f=functionOf(source,params);if(f.parsed.restricted)fail('增減表目前不處理自訂範圍；請另檢查端點與開閉條件。');
 const info=I.describe(f.parsed,params);if(!info.derivative||info.derivative.length>480)fail('此式無可用的有界導數式；可改用指定點的切線工具。');
 const chart=signChart(info.derivative,params,a,b,'>');
 const r=I.algebra(f.parsed,params);if(!r)fail('完整增減表目前只支援多項式與有理函數。');
 const domainSets=[r.denominator,...r.constraints].map(roots);if(domainSets.some(s=>!s||s.all))fail('原式定義域無法完整分割。');
 const excluded=[...new Set(domainSets.flatMap(s=>s.values))];
 // A cancelled factor must remain a cut in a derivative-based report.
 if(excluded.some(x=>x>a&&x<b&&!chart.parts.some(p=>p.point&&p.from===x)))fail('原式有導數約分後消失的禁點；請先在禁點兩侧分段分析。');
 const points=chart.parts.filter(p=>p.point),intervals=chart.parts.filter(p=>!p.point);
 const extrema=[];for(const p of points){const left=intervals.find(q=>q.to===p.from),right=intervals.find(q=>q.from===p.from),y=f.at(p.from);if(left&&right&&finite(y)&&!excluded.includes(p.from)&&left.sign*right.sign<0)extrema.push({x:p.from,y,type:left.sign>0?'局部極大':'局部極小'});}
 return report('增減與局部極值','看導數在臨界點兩側是否變號；f′=0 並不自動代表極值。',[`f′(x) = ${info.derivative}`,`分析區間 [${fmt(a)}, ${fmt(b)}]；原式禁點：${excluded.map(fmt).join('、')||'無'}`,extrema.length?extrema.map(p=>`${p.type} (${fmt(p.x)}, ${fmt(p.y)})`).join('；'):'此區間未得到導數變號的內部極值。'],'區間端點的最大最小值要另比較；導數為零但未變號的點不能直接稱為極值。','用 x³ 檢查：導數在 0 等於零，為什麼沒有局部極值？',{headers:['開區間','導數符號','變化'],rows:intervals.map(p=>[`(${fmt(p.from)}, ${fmt(p.to)})`,p.sign>0?'+':p.sign<0?'−':'0',p.sign>0?'遞增':p.sign<0?'遞減':'常數']),extrema,graphRows:extrema.map(p=>point(p.x,p.y,p.type)),derivative:info.derivative});
}
function rationalLimit(r,x){
 if(!r)return null;let p=r.numerator.slice(),q=r.denominator.slice();
 for(let n=0;n<=6;n++){const a=poly(p,x),b=poly(q,x);if(![a,b].every(finite))return null;if(b!==0){const value=a/b;return finite(value)?value:null;}if(a!==0)return null;p=derivative(p);q=derivative(q);if(!q.length)return null;}
 return null;
}
function features(source,params={}){
 const f=functionOf(source,params),info=I.describe(f.parsed,params),r=I.algebra(f.parsed,params),holes=[];
 if(f.parsed.restricted)return{holes,poles:[],horizontal:null,oblique:null};
 for(const x of info.properties.holes||[]){const y=rationalLimit(r,x);if(finite(y))holes.push({x,y});}
 let oblique=null;
 if(r){const n=degree(r.numerator),d=degree(r.denominator);if(d>0&&n===d+1){const slope=r.numerator[n]/r.denominator[d],intercept=((r.numerator[n-1]||0)-slope*(r.denominator[d-1]||0))/r.denominator[d];if([slope,intercept].every(finite))oblique={slope,intercept};}}
 return{holes,poles:info.properties.poles||[],horizontal:finite(info.properties.horizontalAsymptote)?info.properties.horizontalAsymptote:null,oblique};
}
function limits(source,params,x,step){
 scalar(x,'觀察位置');scalar(step,'起始距離');if(step<=0)fail('起始距離必須大於零。');const f=functionOf(source,params),rows=[];
 for(let i=0;i<8;i++){const h=step/10**i,l=x-h,r=x+h;if(l===x||r===x)break;rows.push([h,l,finite(f.at(l))?f.at(l):null,r,finite(f.at(r))?f.at(r):null]);}
 if(!rows.length)fail('距離小於此座標的浮點解析度，請增加距離。');
 const value=f.at(x),r=I.algebra(f.parsed,params),algebraic=rationalLimit(r,x);
 const validDomain=r&&!([r.denominator,...r.constraints].some(p=>degree(p)===0&&p[0]===0));
 const conclusion=validDomain&&finite(algebraic)?`有理式結構可得此處有限極限 ≈ ${fmt(algebraic)}；f(${fmt(x)}) ${finite(value)?'≈ '+fmt(value):'未定義'}。`:'下表只提供左右數值趨勢；不足以證明極限存在、無窮大或不存在。';
 return report('左右極限與函數值','分開比較左側、右側的趨近趨勢，以及該點真正的函數值。',[conclusion,`本次使用 ${rows.length} 層十倍縮小的距離。`],'趨近某值不代表每一項都小於它；高頻震盪與分段邊界不能只靠有限取樣判定。','比較 (x²−1)/(x−1) 在 x=1 的極限與函數值。',{headers:['距離 h','左側 x','左側 f(x)','右側 x','右側 f(x)'],rows,limit:validDomain&&finite(algebraic)?algebraic:null,value:finite(value)?value:null});
}
function tangent(source,params,x,h){
 scalar(x);scalar(h);if(h===0||x+h===x)fail('割線距離不可為零或小於浮點解析度。');const f=functionOf(source,params),y=f.at(x),other=f.at(x+h);if(![y,other].every(finite))fail('割線兩個端點需在函數定義域內。');
 const secant=(other-y)/h,slope=f.slope(x);if(!finite(secant))fail('割線斜率超出可計算範圍。');
 const graphRows=[point(x,y,'P'),point(x+h,other,'Q'),row(`y=(${secant})*(x-(${x}))+(${y})`,'割線')];
 if(finite(slope)){graphRows.push(row(`y=(${slope})*(x-(${x}))+(${y})`,'切線'));graphRows.push(row(`(x-(${x}))+(${slope})*(y-(${y}))=0`,'法線'));}
 return report('割線、切線與法線','割線看平均變化；切線使用自動微分，法線與切線垂直。',[`P=(${fmt(x)}, ${fmt(y)})；Q=(${fmt(x+h)}, ${fmt(other)})`,`割線斜率 ≈ ${fmt(secant)}`,finite(slope)?`切線斜率 ≈ ${fmt(slope)}；法線${slope===0?'為鉛直線 x='+fmt(x):'斜率 ≈ '+fmt(-1/slope)}`:'此處無法確認有限導數，只建立割線。'],'尖點與定義域邊界不可用有限差分假裝切線；水平切線的法線為鉛直線。','把 h 減半，觀察割線斜率如何接近導數。',{graphRows,headers:['x₀','f(x₀)','h','割線斜率','導數'],rows:[[x,y,h,secant,finite(slope)?slope:null]],slope:finite(slope)?slope:null});
}
function transform(source,params,shiftX,shiftY,scale,reflect=false){
 [shiftX,shiftY,scale].forEach(v=>scalar(v));if(scale===0)fail('伸縮係數不可為零。');const f=functionOf(source,params);if(f.parsed.restricted)fail('變換工具目前不搬移 {範圍}；請先處理新的定義域。');
 const expr=f.expression, transformed=reflect?`x=(${expr.replace(/\bx\b/g,'y')})`:`y=(${scale})*(${expr.replace(/\bx\b/g,`(x-(${shiftX}))`)})+(${shiftY})`;
 if(transformed.length>480)fail('變換後超過 480 字，請先化簡。');M.parse(transformed);
 return report(reflect?'關於 y=x 的鏡射':'函數平移與縱向伸縮',reflect?'交換 x、y 得反關係，再檢查原函數是否一對一。':'先看括號內的水平位移，再看函數外的縱向伸縮與位移。',[transformed,reflect?'圖形是反關係；可能需要限制原定義域，才成為反函數。':`水平平移 ${fmt(shiftX)}；縱向乘 ${fmt(scale)}；垂直平移 ${fmt(shiftY)}。`],reflect?'x² 的反關係是 x=y²，並非全實數上的單值反函數。':'f(x−h) 向右 h；負的縱向係數會上下翻轉。','選擇 x²，先平移，再觀察頂點的位置。',{graphRows:[row(transformed,reflect?'反關係':'變換後'),...(reflect?[row('y=x','鏡射軸')]:[])]});
}
const {circleTangents,triangle,regression,parseData,riemann}=G;
const api={fmt,roots,poly,signChart,variation,limits,tangent,transform,circleTangents,triangle,regression,parseData,riemann,features};return Object.freeze(api);
});
