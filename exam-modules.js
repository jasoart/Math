/* Exam-inspired experiments; original models, not official question solutions. */
window.createExamModules = function () {
  const slider = (key, label, min, max, step, value) => ({key, label, min, max, step, value});
  return [
    {
      id: "polar-sector-sweep", title: "極坐標掃描：扇形、環帶與角度", short: "極坐標與環帶", tag: "三角與幾何", course: "common",
      examSignal: "圓形步道與轉動情境：先區分角度（弧度）、弧長與面積。", prompt: "外半徑固定時，內半徑增加會如何改變環帶面積？", challenge: "說明相同角度的兩個扇形，弧長比與面積比分別為何。",
      controls: [slider("r", "外半徑 R", 1, 5, .1, 4), slider("ratio", "內外半徑比", 0, 1, .05, .5), slider("theta", "掃描角度（度）", 0, 360, 1, 120)],
      compute(s) { const r = s.r * s.ratio, angle = s.theta * DEG; return {r, angle, area: (s.r*s.r-r*r)*angle/2, arc:s.r*angle}; },
      formula(s,m) { return [`θ = ${format(m.angle)} 弧度`, `外弧長 Rθ = ${format(m.arc)}`, `環帶扇形面積 (R²−r²)θ/2 = ${format(m.area)}`]; },
      draw(s,m) { const p=makePlane({scale:Math.min(canvas.clientWidth,canvas.clientHeight)/12}); drawGrid(p); const pts=[]; for(let i=0;i<=100;i++){const t=m.angle*i/100;pts.push({x:s.r*Math.cos(t),y:s.r*Math.sin(t)});} for(let i=100;i>=0;i--){const t=m.angle*i/100;pts.push({x:m.r*Math.cos(t),y:m.r*Math.sin(t)});} drawFilledPolygon(p,pts,palette.fillBlue,palette.blue); drawCircle(p,{x:0,y:0},s.r,palette.muted); drawCircle(p,{x:0,y:0},m.r,palette.green); drawPoint(p,{x:s.r*Math.cos(m.angle),y:s.r*Math.sin(m.angle)},"P"); },
      status(s,m) { return `面積 ${format(m.area)}；內外半徑相同時面積為 0。`; }
    },
    {
      id: "data-projection-variance", title: "資料投影：方向如何改變變異數", short: "投影方向與變異數", tag: "數據分析", course: "enrichment",
      examSignal: "旋轉坐標軸後，一維變異數取決於投影方向；主成分名稱為延伸知識。", prompt: "找出讓投影點最分散與最集中的方向，兩者是否垂直？", challenge: "用 Var(aX+bY)=a²Var(X)+b²Var(Y)+2abCov(X,Y) 驗證投影。",
      controls:[slider("theta","投影角度（度）",0,180,1,30),slider("stretch","水平伸長",.5,3,.1,2)],
      compute(s){ const pts=[[-2,-1],[-1,0],[0,-1],[0,1],[1,0],[2,1]].map(([x,y])=>({x:x*s.stretch,y}));const u={x:Math.cos(s.theta*DEG),y:Math.sin(s.theta*DEG)};const values=pts.map(p=>dot(p,u));return {pts,u,values,variance:variance(values),vx:variance(pts.map(p=>p.x)),vy:variance(pts.map(p=>p.y)),cov:mean(pts.map(p=>p.x*p.y))}; },
      formula(s,m){return [`使用母體變異數：除以 n=${m.pts.length}`,`Var(X)=${format(m.vx)}；Var(Y)=${format(m.vy)}；Cov(X,Y)=${format(m.cov)}`,`Var(X cosθ + Y sinθ) = ${format(m.variance)}`];},
      draw(s,m){const p=makePlane({scale:Math.min(canvas.clientWidth,canvas.clientHeight)/15});drawGrid(p);drawSegment(p,{x:-7*m.u.x,y:-7*m.u.y},{x:7*m.u.x,y:7*m.u.y},palette.green);m.pts.forEach((q,i)=>{const foot={x:m.values[i]*m.u.x,y:m.values[i]*m.u.y};drawSegment(p,q,foot,palette.muted,1,[4,4]);drawPoint(p,q,"",palette.blue);drawPoint(p,foot,"",palette.orange,4);});},
      status(s,m){return `投影變異數 ${format(m.variance)}；橘點為原資料的正交投影。本模組含延伸內容。`;}
    },
    {
      id:"complex-collinearity",title:"複數共線：商的虛部與有向面積",short:"複數與共線",tag:"複數",course:"advanced",
      examSignal:"三個複數表示平面點，(z₃−z₁)/(z₂−z₁) 為實數等價於共線，前提是 z₂≠z₁。",prompt:"固定 A、B，調整 C，何時複數商的虛部為 0？",challenge:"證明三角形面積等於 |Im((z₃−z₁)conj(z₂−z₁))|/2。",
      controls:[slider("bx","B 實部",-4,4,.1,3),slider("by","B 虛部",-4,4,.1,1),slider("cx","C 實部",-4,4,.1,2),slider("cy","C 虛部",-4,4,.1,2)],
      compute(s){const d=s.bx*s.bx+s.by*s.by,cross=s.bx*s.cy-s.by*s.cx;return {d,cross,re:d===0?null:(s.cx*s.bx+s.cy*s.by)/d,im:d===0?null:cross/d,area:Math.abs(cross)/2};},
      formula(s,m){return m.d===0?["A=B，複數商分母為 0，無法用此判準。",`退化三角形面積 = ${format(m.area)}`]:[`A=0，B=${s.bx}+(${s.by})i，C=${s.cx}+(${s.cy})i`,`C/B = ${format(m.re)} + (${format(m.im)})i`,`有向行列式 = ${format(m.cross)}；面積 = ${format(m.area)}`];},
      draw(s,m){const p=makePlane({scale:Math.min(canvas.clientWidth,canvas.clientHeight)/12});drawGrid(p);const a={x:0,y:0},b={x:s.bx,y:s.by},c={x:s.cx,y:s.cy};drawFilledPolygon(p,[a,b,c]);drawPoint(p,a,"A");drawPoint(p,b,"B",palette.green);drawPoint(p,c,"C",palette.orange);},
      status(s,m){return m.d===0?"A、B 重合：共線商判準不適用。":Math.abs(m.cross)<1e-9?"三點共線；複數商為實數。":`三點不共線，面積 ${format(m.area)}。`;}
    },
    {
      id:"riemann-error-bounds",title:"積分誤差：左右端點、梯形與界限",short:"積分近似誤差",tag:"微積分",course:"advanced",
      examSignal:"單調函數的左、右端點和可夾住積分；凸函數的梯形法高估積分。",prompt:"對 f(x)=x² 比較三種方法。區間等分數增加時，哪一種誤差下降較快？",challenge:"證明 T−I=(b−a)³/(6n²)，並說明凸性為何造成高估。",
      controls:[slider("b","積分上限 b",.5,5,.1,3),slider("n","等分數 n",1,80,1,8),{key:"method",label:"顯示方法",type:"select",value:"left",options:[{value:"left",label:"左端點"},{value:"right",label:"右端點"},{value:"trapezoid",label:"梯形"}]}],
      compute(s){const h=s.b/s.n;let left=0,right=0;for(let i=0;i<s.n;i++){left+=(i*h)**2*h;right+=((i+1)*h)**2*h;}const exact=s.b**3/3,trapezoid=(left+right)/2;return {h,left,right,trapezoid,exact,estimate:s.method==="left"?left:s.method==="right"?right:trapezoid};},
      formula(s,m){return [`I=∫₀ᵇx² dx=b³/3=${format(m.exact)}`,`L=${format(m.left)} ≤ I ≤ R=${format(m.right)}`,`T=(L+R)/2=${format(m.trapezoid)}`,`本方法誤差（估計−真值）=${format(m.estimate-m.exact,6)}`,`梯形誤差 b³/(6n²)=${format(s.b**3/(6*s.n*s.n),6)}`];},
      draw(s,m){const p=makePlane({scale:Math.min(canvas.clientWidth/(s.b+2),canvas.clientHeight/(s.b*s.b+3)),origin:{x:55,y:canvas.clientHeight-45}});drawGrid(p);for(let i=0;i<s.n;i++){const a=i*m.h,b=(i+1)*m.h;const l=s.method==="trapezoid"?a*a:s.method==="left"?a*a:b*b,r=s.method==="trapezoid"?b*b:l;drawFilledPolygon(p,[{x:a,y:0},{x:a,y:l},{x:b,y:r},{x:b,y:0}],palette.fillBlue,palette.blue,1);}plotFunction(p,x=>x*x,0,s.b,palette.orange);},
      status(s,m){return `n=${s.n}，估計 ${format(m.estimate)}，真值 ${format(m.exact)}。此模型限 f(x)=x²、b>0。`;}
    },
    {
      id:"spatial-section-geometry",title:"立方體截面：平面 x+y+z=t",short:"空間平面截面",tag:"空間幾何",course:"A",
      examSignal:"截面頂點是平面與立方體稜的交點；不同位置可形成三角形或六邊形。",prompt:"拖曳平面，觀察截面邊數在哪些位置改變。",challenge:"說明 t=1.5 時六邊形如何由立方體的六條稜產生。",
      controls:[slider("t","平面位置 t",0,3,.01,1.5),slider("angle","觀察方向（度）",0,360,1,35)],
      compute(s){const vertices=[];for(let i=0;i<8;i++)vertices.push({x:i&1,y:(i>>1)&1,z:(i>>2)&1});const edges=[];for(let i=0;i<8;i++)for(let bit=0;bit<3;bit++){const j=i^(1<<bit);if(i<j)edges.push([vertices[i],vertices[j]]);}const points=[];for(const [a,b]of edges){const va=a.x+a.y+a.z,vb=b.x+b.y+b.z,q=(s.t-va)/(vb-va);if(q>=-1e-10&&q<=1+1e-10){const p={x:a.x+q*(b.x-a.x),y:a.y+q*(b.y-a.y),z:a.z+q*(b.z-a.z)};if(!points.some(v=>Math.hypot(v.x-p.x,v.y-p.y,v.z-p.z)<1e-8))points.push(p);}}if(points.length>=3){const c={x:s.t/3,y:s.t/3,z:s.t/3};points.sort((a,b)=>Math.atan2((a.x+a.y-2*a.z)/Math.sqrt(6),(a.x-a.y)/Math.sqrt(2))-Math.atan2((b.x+b.y-2*b.z)/Math.sqrt(6),(b.x-b.y)/Math.sqrt(2)));let sum={x:0,y:0,z:0};points.forEach((a,i)=>{const b=points[(i+1)%points.length];const v=cross3(sub3(a,c),sub3(b,c));sum=add3(sum,v);});return {vertices,edges,points,area:norm3(sum)/2};}return {vertices,edges,points,area:0};},
      formula(s,m){return [`單位立方體：0≤x,y,z≤1；截平面 x+y+z=${format(s.t)}`,`截面頂點數=${m.points.length}（端點可能退化）`,`截面面積=${format(m.area,5)}`,"面積由三維有向三角形面積向量求和；圖為正交投影。"]},
      draw(s,m){const angle=s.angle*DEG;const project=q=>({x:(q.x-.5)*Math.cos(angle)-(q.y-.5)*Math.sin(angle),y:(q.z-.5)*.85-((q.x-.5)*Math.sin(angle)+(q.y-.5)*Math.cos(angle))*.5});const p=makePlane({scale:Math.min(canvas.clientWidth,canvas.clientHeight)/2.8});m.edges.forEach(([a,b])=>drawSegment(p,project(a),project(b),palette.muted,2));if(m.points.length>=3)drawFilledPolygon(p,m.points.map(project),palette.fillBlue,palette.blue);m.points.forEach((q,i)=>drawPoint(p,project(q),String(i+1),palette.orange));},
      status(s,m){return m.points.length<3?"截面退化為點，面積 0。":`${m.points.length} 邊形截面，三維實際面積 ${format(m.area)}。`;}
    }
  ];
};
