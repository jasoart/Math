/* Standalone graph studio; no remote services or runtime dependencies. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id), M = window.GraphMath;
  const colors=['#2166d1','#db6b28','#098675','#9b4cc2','#c03967','#74721a','#307f9b','#755b49'];
  const names={function:'函數 y=f(x)',implicit:'隱函數',parametric:'參數曲線',polar:'極座標',point:'座標點'};
  const examples={quadratic:['y=a(x-b)^2+c','y=x+2'],circle:['x^2+y^2=9','x^2/16+y^2/4=1'],trig:['y=a sin(b x)+c','y=cos(x)'],rational:['y=1/x','y=(x^2-1)/(x-1)'],parametric:['(3sin(a t),3sin(b t))'],polar:['r=a cos(b t)'],points:['(1,2)','(-2,-1)','y=x+1']};
  const defaultState=()=>({version:1,rows:[{text:'y=x^2-2',visible:true},{text:'y=x+1',visible:true}],params:{a:1,b:1,c:0},view:{x:0,y:0,span:14},t:[0,2*Math.PI],grid:true});
  const canvas=$('graphCanvas'), ctx=canvas.getContext('2d');
  let state=defaultState(), compiled=[], width=800,height=500, points=[], undo=null, frame=0, analysisTimer=0, noticeTimer=0, saveTimer=0;
  const storageKey='mathlab-graph-v1';
  const finite=n=>Number.isFinite(n), clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const fmt=n=>!finite(n)?'未定義':Math.abs(n)<1e-9?'0':Math.abs(n)>=1e5||Math.abs(n)<1e-4?Number(n).toExponential(3):String(Number(n.toFixed(5)));
  function validState(s) {
    if (!s || s.version!==1 || !Array.isArray(s.rows) || s.rows.length<1 || s.rows.length>8) throw Error('圖形資料格式無效。');
    if(s.rows.some(r=>!r||typeof r.text!=='string'||r.text.length>240||typeof r.visible!=='boolean')) throw Error('算式資料無效。');
    if(!s.params||!['a','b','c'].every(k=>finite(s.params[k])&&Math.abs(s.params[k])<=10000)) throw Error('參數超出範圍。');
    if(!s.view||!['x','y','span'].every(k=>finite(s.view[k]))||s.view.span<.001||s.view.span>1e6||Math.abs(s.view.x)>1e9||Math.abs(s.view.y)>1e9) throw Error('視窗設定無效。');
    if(!Array.isArray(s.t)||s.t.length!==2||!s.t.every(finite)||s.t[1]<=s.t[0]||s.t.some(v=>Math.abs(v)>1e5)) throw Error('參數範圍無效。');
    return {version:1,rows:s.rows.map(r=>({text:r.text,visible:r.visible})),params:{a:s.params.a,b:s.params.b,c:s.params.c},view:{...s.view},t:[...s.t],grid:s.grid!==false};
  }
  function notice(message) { $('graphNotice').textContent=message;$('graphNotice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('graphNotice').hidden=true,4200); }
  function load() {
    let shared=false;
    try {
      if(location.hash.startsWith('#g=')) { shared=true;if(location.hash.length>16000) throw Error('分享網址過長。');state=validState(JSON.parse(decodeURIComponent(location.hash.slice(3)))); }
      else { const saved=localStorage.getItem(storageKey);if(saved) state=validState(JSON.parse(saved)); }
    } catch { notice(shared?'分享資料無效，已開啟預設圖形。':'無法讀取舊圖形，已開啟預設圖形。');state=defaultState(); }
    rebuild();
  }
  let storageWarned=false;
  function save() { clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try {localStorage.setItem(storageKey,JSON.stringify(state));}catch{if(!storageWarned){notice('瀏覽器無法儲存，請使用分享網址保留圖形。');storageWarned=true;document.querySelector('.local-badge').textContent='此瀏覽器無法自動儲存';}}},250); }
  function parseRows() {
    compiled=state.rows.map((r,i)=>{
      try {return {...M.parse(r.text),index:i,color:colors[i],visible:r.visible,text:r.text};}
      catch(error){return {index:i,error:error.message,visible:r.visible,text:r.text};}
    });
    compiled.forEach((c,i)=>{
      const row=$('expressions').children[i];if(!row)return;
      row.querySelector('.expression-kind').textContent=c.error?'待修正':names[c.kind];
      row.querySelector('.expression-error').textContent=c.error||'';
      row.querySelector('.expression-error').hidden=!c.error;
      row.querySelector('.expression-input').setAttribute('aria-invalid',String(!!c.error));
    });
    const vars=new Set(compiled.filter(c=>!c.error).flatMap(c=>c.variables));
    $('parameterPanel').hidden=!['a','b','c'].some(k=>vars.has(k));
    for(const row of $('parameters').children) row.hidden=!vars.has(row.dataset.key);
    $('tPanel').hidden=!compiled.some(c=>['parametric','polar'].includes(c.kind));
    const prior=$('probeCurve').value;$('probeCurve').replaceChildren();
    for(const c of compiled.filter(c=>!c.error&&c.visible&&c.kind==='function')) {const o=document.createElement('option');o.value=c.index;o.textContent=`${c.index+1}. ${c.text}`;$('probeCurve').append(o);}
    if([...$('probeCurve').options].some(o=>o.value===prior)) $('probeCurve').value=prior;
    update();
  }
  function rebuild() {
    $('expressions').replaceChildren();
    state.rows.forEach((r,i)=>{
      const row=document.createElement('div');row.className='expression-row';row.style.setProperty('--curve',colors[i]);
      row.innerHTML='<div class="expression-top"><label><input type="checkbox"><span></span></label><span class="expression-kind"></span><button type="button" class="expression-delete">×</button></div><input class="expression-input" type="text" maxlength="240" autocomplete="off" spellcheck="false"><p class="expression-error" role="status" hidden></p>';
      const check=row.querySelector('input[type=checkbox]');check.checked=r.visible;check.setAttribute('aria-label',`顯示圖形 ${i+1}`);check.onchange=()=>{r.visible=check.checked;parseRows();};
      row.querySelector('label span').textContent=`圖形 ${i+1}`;
      const input=row.querySelector('.expression-input');input.value=r.text;input.setAttribute('aria-label',`算式 ${i+1}`);input.setAttribute('aria-describedby',`expression-error-${i}`);row.querySelector('.expression-error').id=`expression-error-${i}`;
      let timer;input.addEventListener('input',()=>{r.text=input.value;clearTimeout(timer);timer=setTimeout(parseRows,220);});input.addEventListener('change',()=>{clearTimeout(timer);parseRows();});
      const del=row.querySelector('button');del.setAttribute('aria-label',`刪除圖形 ${i+1}`);del.onclick=()=>{if(state.rows.length===1){r.text='';}else state.rows.splice(i,1);rebuild();};
      $('expressions').append(row);
    });
    $('curveCount').textContent=`${state.rows.length} / 8`;$('addExpression').disabled=state.rows.length>=8;
    $('parameters').replaceChildren();
    for(const key of ['a','b','c']) {
      const row=document.createElement('div');row.className='parameter-row';row.dataset.key=key;
      row.innerHTML=`<div class="parameter-label"><label for="param-${key}">${key}</label><input id="param-${key}" type="number" step="0.1" min="-10000" max="10000" aria-label="參數 ${key}"></div><input type="range" min="-10" max="10" step="0.1" aria-label="調整參數 ${key}"><div class="parameter-range"><span>−10</span><span>0</span><span>10</span></div>`;
      const num=row.querySelector('input[type=number]'),range=row.querySelector('input[type=range]');num.value=state.params[key];range.value=clamp(state.params[key],-10,10);
      num.oninput=()=>{if(num.value!==''&&num.validity.valid&&finite(num.valueAsNumber)){state.params[key]=num.valueAsNumber;range.value=clamp(num.valueAsNumber,-10,10);update();}};
      num.onchange=()=>{if(!num.validity.valid||num.value===''){num.value=state.params[key];notice('參數請輸入 −10000 到 10000 的數字。');}};
      range.oninput=()=>{state.params[key]=Number(range.value);num.value=range.value;update();};$('parameters').append(row);
    }
    $('tMin').value=state.t[0];$('tMax').value=state.t[1];$('showGrid').checked=state.grid;parseRows();
  }
  const scale=()=>width/state.view.span;
  const sx=x=>width/2+(x-state.view.x)*scale(),sy=y=>height/2-(y-state.view.y)*scale();
  const wx=x=>state.view.x+(x-width/2)/scale(),wy=y=>state.view.y-(y-height/2)/scale();
  const evaluate=(c,x,y)=>c.at(x,y,state.params);
  function scheduleDraw(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;draw();});}
  function update(){points=[];scheduleDraw();clearTimeout(analysisTimer);analysisTimer=setTimeout(analyze,180);save();}
  function resize(){const r=canvas.getBoundingClientRect();width=r.width;height=r.height;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);update();}
  function grid(){
    const raw=90/scale(),p=10**Math.floor(Math.log10(raw)),step=[1,2,5,10].find(v=>v*p>=raw)*p;
    ctx.font='11px ui-monospace,monospace';ctx.lineWidth=1;
    const xAxis=sy(0),yAxis=sx(0);
    for(let x=Math.ceil(wx(0)/step)*step;x<=wx(width)+step*.001;x+=step){const px=sx(x);if(state.grid){ctx.strokeStyle='#e7edf5';ctx.beginPath();ctx.moveTo(px,0);ctx.lineTo(px,height);ctx.stroke();}ctx.fillStyle='#718297';ctx.textAlign='center';ctx.fillText(fmt(x),px,clamp(xAxis+17,18,height-8));}
    for(let y=Math.ceil(wy(height)/step)*step;y<=wy(0)+step*.001;y+=step){const py=sy(y);if(state.grid){ctx.strokeStyle='#e7edf5';ctx.beginPath();ctx.moveTo(0,py);ctx.lineTo(width,py);ctx.stroke();}if(Math.abs(y)>step*.001){ctx.fillStyle='#718297';ctx.textAlign='left';ctx.fillText(fmt(y),clamp(yAxis+8,8,width-65),py-5);}}
    ctx.strokeStyle='#8c9cb1';ctx.lineWidth=1.3;ctx.beginPath();if(xAxis>=0&&xAxis<=height){ctx.moveTo(0,xAxis);ctx.lineTo(width,xAxis);}if(yAxis>=0&&yAxis<=width){ctx.moveTo(yAxis,0);ctx.lineTo(yAxis,height);}ctx.stroke();
    ctx.fillStyle='#52677c';ctx.font='italic 13px serif';ctx.fillText('x',width-16,clamp(xAxis-8,15,height-10));ctx.fillText('y',clamp(yAxis+9,10,width-15),17);
  }
  function dot(x,y,color,label){if(!finite(x)||!finite(y)||sx(x)<-10||sx(x)>width+10||sy(y)<-10||sy(y)>height+10)return;ctx.beginPath();ctx.arc(sx(x),sy(y),4,0,2*Math.PI);ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='white';ctx.lineWidth=1.5;ctx.stroke();if(label){ctx.font='12px system-ui';ctx.fillStyle=color;ctx.fillText(label,sx(x)+8,sy(y)-8);}}
  // Midpoint subdivision breaks non-finite paths and unresolved jumps at poles.
  function curve(c){
    const explicit=c.kind==='function',start=explicit?wx(0):state.t[0],end=explicit?wx(width):state.t[1];
    const count=explicit?Math.ceil(width/4):900;
    const at=t=>{const v=evaluate(c,t);return explicit?[t,v]:v;};
    ctx.beginPath();ctx.strokeStyle=c.color;ctx.lineWidth=2.2;ctx.lineJoin='round';
    function segment(t0,p0,t1,p1,depth){
      const tm=(t0+t1)/2,pm=at(tm);
      if(!p0.every(finite)||!p1.every(finite)||!pm.every(finite)){if(depth<7){segment(t0,p0,tm,pm,depth+1);segment(tm,pm,t1,p1,depth+1);}return;}
      const error=Math.hypot(sx(pm[0])-(sx(p0[0])+sx(p1[0]))/2,sy(pm[1])-(sy(p0[1])+sy(p1[1]))/2);
      const distance=Math.hypot(sx(p1[0])-sx(p0[0]),sy(p1[1])-sy(p0[1]));
      if(error>1.2||distance>height*.4){if(depth<7){segment(t0,p0,tm,pm,depth+1);segment(tm,pm,t1,p1,depth+1);}return;}
      if(Math.max(Math.abs(sx(p0[0])),Math.abs(sy(p0[1])),Math.abs(sx(p1[0])),Math.abs(sy(p1[1])))>1e7)return;
      ctx.moveTo(sx(p0[0]),sy(p0[1]));ctx.lineTo(sx(p1[0]),sy(p1[1]));
    }
    let p0=at(start);for(let i=1;i<=count;i++){const t0=start+(end-start)*(i-1)/count,t1=start+(end-start)*i/count,p1=at(t1);segment(t0,p0,t1,p1,0);p0=p1;}ctx.stroke();
  }
  function implicit(c){
    const cell=9,nx=Math.ceil(width/cell),ny=Math.ceil(height/cell),values=[];
    for(let j=0;j<=ny;j++){const row=[];for(let i=0;i<=nx;i++)row.push(evaluate(c,wx(i*cell),wy(j*cell)));values.push(row);}
    ctx.beginPath();ctx.strokeStyle=c.color;ctx.lineWidth=2;
    function crossing(a,b,fa,fb){
      if(!finite(fa)||!finite(fb)||((fa>0)===(fb>0))||fa===fb)return null;
      let l=a,r=b,fl=fa;
      for(let k=0;k<20;k++){const m=[(l[0]+r[0])/2,(l[1]+r[1])/2],fm=evaluate(c,wx(m[0]),wy(m[1]));if(!finite(fm))return null;if((fl>0)===(fm>0)){l=m;fl=fm;}else r=m;}
      const p=[(l[0]+r[0])/2,(l[1]+r[1])/2],v=evaluate(c,wx(p[0]),wy(p[1]));
      return finite(v)&&Math.abs(v)<1e-4*Math.max(1,Math.min(Math.abs(fa),Math.abs(fb)))?p:null;
    }
    for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
      const p=[[i*cell,j*cell],[(i+1)*cell,j*cell],[(i+1)*cell,(j+1)*cell],[i*cell,(j+1)*cell]],v=[values[j][i],values[j][i+1],values[j+1][i+1],values[j+1][i]],hits=[];
      for(let e=0;e<4;e++){const h=crossing(p[e],p[(e+1)%4],v[e],v[(e+1)%4]);if(h)hits.push({edge:e,p:h});}
      if(hits.length===2){ctx.moveTo(...hits[0].p);ctx.lineTo(...hits[1].p);}
      else if(hits.length===4){const center=evaluate(c,wx((i+.5)*cell),wy((j+.5)*cell));const pairs=(center>0)===(v[0]>0)?[[0,1],[2,3]]:[[0,3],[1,2]];for(const [a,b]of pairs){ctx.moveTo(...hits[a].p);ctx.lineTo(...hits[b].p);}}
    }ctx.stroke();
  }
  function probe(){
    const c=compiled[Number($('probeCurve').value)],x=$('probeX').valueAsNumber;
    if(!c||c.kind!=='function'||!c.visible||!finite(x)||$('probeCurve').value===''){ $('probeResult').textContent='加入 y=f(x) 即可觀察數值。';return; }
    const f=x=>evaluate(c,x),y=f(x),slope=M.derivative(f,x);
    const h=1e-4*Math.max(1,Math.abs(x)),left=(y-f(x-h))/h,right=(f(x+h)-y)/h;
    const differentiable=finite(slope)&&finite(left)&&finite(right)&&Math.abs(left-right)<.01*Math.max(1,Math.abs(slope));
    $('probeResult').textContent=`f(${fmt(x)}) = ${fmt(y)}；斜率 ≈ ${differentiable?fmt(slope):'無法判定'}`;
    if($('showTangent').checked&&finite(y)&&differentiable){ctx.save();ctx.setLineDash([6,5]);ctx.strokeStyle=c.color;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,sy(y+slope*(wx(0)-x)));ctx.lineTo(width,sy(y+slope*(wx(width)-x)));ctx.stroke();ctx.restore();dot(x,y,c.color);}
  }
  function draw(){
    ctx.clearRect(0,0,width,height);ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,height);grid();ctx.save();ctx.beginPath();ctx.rect(0,0,width,height);ctx.clip();
    for(const c of compiled.filter(c=>!c.error&&c.visible)){if(c.kind==='point'){const p=evaluate(c,0);dot(...p,c.color,`(${fmt(p[0])}, ${fmt(p[1])})`);}else if(c.kind==='implicit')implicit(c);else curve(c);}
    if($('showAnalysis').checked)for(const p of points)dot(p.x,p.y,p.color);
    probe();ctx.restore();$('viewReadout').textContent=`x ∈ [${fmt(wx(0))}, ${fmt(wx(width))}]`;
  }
  function analyze(){
    points=[];const functions=compiled.filter(c=>!c.error&&c.visible&&c.kind==='function'),messages=[];
    const add=(x,y,color,label)=>{if(finite(x)&&finite(y)&&y>=wy(height)&&y<=wy(0)&&points.length<70)points.push({x,y,color,label});};
    for(const c of functions){if(/\b(floor|ceil|round|sign)\s*\(/.test(c.text)){messages.push(`圖形 ${c.index+1} 含跳躍函數，略過特殊點分析。`);continue;}const f=x=>evaluate(c,x),result=M.analyze(f,wx(0),wx(width));for(const x of result.zeros)add(x,0,c.color,`圖形 ${c.index+1} · 零點`);for(const x of result.extrema)add(x,f(x),c.color,`圖形 ${c.index+1} · 局部極值`);if(result.allZero)messages.push(`圖形 ${c.index+1} 在取樣點皆為 0，未列孤立零點。`);}
    for(let i=0;i<functions.length;i++)for(let j=i+1;j<functions.length;j++){
      const a=functions[i],b=functions[j];if(/\b(floor|ceil|round|sign)\s*\(/.test(a.text+b.text))continue;const diff=x=>evaluate(a,x)-evaluate(b,x),result=M.analyze(diff,wx(0),wx(width));
      if(result.allZero){messages.push(`圖形 ${a.index+1}、${b.index+1} 在取樣點重合。`);continue;}
      for(const x of result.zeros)add(x,evaluate(a,x),'#172b42',`圖形 ${a.index+1} × ${b.index+1} · 交點`);
    }
    const box=$('analysisResults');box.replaceChildren();
    for(const p of points){const button=document.createElement('button');button.className='analysis-chip';const label=document.createElement('b');label.textContent=p.label;button.append(label,document.createTextNode(`(${fmt(p.x)}, ${fmt(p.y)})`));button.onclick=()=>{state.view.x=p.x;state.view.y=p.y;update();};box.append(button);}
    if(!points.length)messages.unshift(functions.length?'目前視窗未找到孤立特殊點；可縮放或移動畫面。':'輸入 y=f(x) 可自動分析零點與交點。');
    for(const message of messages){const p=document.createElement('p');p.className='small-label';p.textContent=message;box.append(p);}scheduleDraw();
  }
  function zoom(factor,px=width/2,py=height/2){const before=[wx(px),wy(py)];state.view.span=clamp(state.view.span*factor,.001,1e6);state.view.x+=before[0]-wx(px);state.view.y+=before[1]-wy(py);boundView();update();}
  function boundView(){state.view.x=clamp(state.view.x,-1e9,1e9);state.view.y=clamp(state.view.y,-1e9,1e9);}
  function fit(){
    let samples=[],hasImplicit=false;
    for(const c of compiled.filter(c=>!c.error&&c.visible)){
      if(c.kind==='implicit'){hasImplicit=true;continue;}
      if(c.kind==='point'){samples.push(evaluate(c,0));continue;}
      const explicit=c.kind==='function',a=explicit?-10:state.t[0],b=explicit?10:state.t[1];
      for(let i=0;i<=400;i++){const t=a+(b-a)*i/400,v=evaluate(c,t);samples.push(explicit?[t,v]:v);}
    }
    samples=samples.filter(p=>p.every(finite)&&p.every(v=>Math.abs(v)<1e8));
    if(!samples.length){state.view={x:0,y:0,span:14};notice(hasImplicit?'隱函數使用原點視窗，請拖曳或縮放尋找其他區域。':'未取得有限座標，已回到原點。');update();return;}
    const xs=samples.map(p=>p[0]).sort((a,b)=>a-b),ys=samples.map(p=>p[1]).sort((a,b)=>a-b);
    const trim=samples.length>100?.025:0,x0=xs[0],x1=xs.at(-1),y0=ys[Math.floor(ys.length*trim)],y1=ys[Math.min(ys.length-1,Math.floor(ys.length*(1-trim)))];
    state.view={x:(x0+x1)/2,y:(y0+y1)/2,span:clamp(Math.max(x1-x0,(y1-y0)*width/height,2)*1.2,.001,1e6)};boundView();update();notice('已依 x ∈ [−10,10] 或 t 範圍取景；極端值與隱函數可能需手動調整。');
  }
  const pointers=new Map();let gesture=null;
  const position=e=>{const r=canvas.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top];};
  function rebaseGesture(){const p=[...pointers.values()];gesture=p.length===1?{p:p[0],view:{...state.view}}:p.length>=2?{p:[(p[0][0]+p[1][0])/2,(p[0][1]+p[1][1])/2],distance:Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]),view:{...state.view}}:null;}
  canvas.addEventListener('pointerdown',e=>{canvas.focus({preventScroll:true});pointers.set(e.pointerId,position(e));canvas.setPointerCapture(e.pointerId);rebaseGesture();});
  canvas.addEventListener('pointermove',e=>{
    const p=position(e);$('coordinateReadout').textContent=`x ${fmt(wx(p[0]))}   y ${fmt(wy(p[1]))}`;
    if(!pointers.has(e.pointerId)||!gesture)return;pointers.set(e.pointerId,p);const ps=[...pointers.values()];
    const center=ps.length>1?[(ps[0][0]+ps[1][0])/2,(ps[0][1]+ps[1][1])/2]:p;
    const distance=ps.length>1?Math.hypot(ps[0][0]-ps[1][0],ps[0][1]-ps[1][1]):0;
    const span=gesture.distance&&distance?clamp(gesture.view.span*gesture.distance/distance,.001,1e6):gesture.view.span;
    state.view.span=span;state.view.x=gesture.view.x+(gesture.p[0]-width/2)*gesture.view.span/width-(center[0]-width/2)*span/width;state.view.y=gesture.view.y-(gesture.p[1]-height/2)*gesture.view.span/width+(center[1]-height/2)*span/width;boundView();update();
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{pointers.delete(e.pointerId);rebaseGesture();});
  canvas.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(clamp(e.deltaY,-100,100)*.002),...position(e));},{passive:false});
  canvas.addEventListener('keydown',e=>{const step=state.view.span*.06;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','0'].includes(e.key))e.preventDefault();else return;if(e.key==='ArrowLeft')state.view.x-=step;if(e.key==='ArrowRight')state.view.x+=step;if(e.key==='ArrowUp')state.view.y+=step;if(e.key==='ArrowDown')state.view.y-=step;if(e.key==='+'||e.key==='=')zoom(.8);if(e.key==='-')zoom(1.25);if(e.key==='0')state.view={x:0,y:0,span:14};boundView();update();});
  $('addExpression').onclick=()=>{if(state.rows.length<8){state.rows.push({text:'',visible:true});rebuild();$('expressions').lastElementChild.querySelector('.expression-input').focus();}};
  $('exampleSelect').onchange=e=>{if(!examples[e.target.value])return;undo=JSON.parse(JSON.stringify(state));const name=e.target.value;state=defaultState();state.rows=examples[name].map(text=>({text,visible:true}));if(name==='parametric')state.params={a:3,b:2,c:0};if(name==='polar')state.params={a:4,b:3,c:0};$('undoExample').hidden=false;e.target.value='';rebuild();};
  $('undoExample').onclick=()=>{if(undo){state=undo;undo=null;$('undoExample').hidden=true;rebuild();}};
  $('zoomIn').onclick=()=>zoom(.8);$('zoomOut').onclick=()=>zoom(1.25);$('homeView').onclick=()=>{state.view={x:0,y:0,span:14};update();};$('fitView').onclick=fit;
  $('showGrid').onchange=()=>{state.grid=$('showGrid').checked;update();};$('showAnalysis').onchange=scheduleDraw;
  for(const id of ['probeCurve','probeX','showTangent'])$(id).addEventListener('input',scheduleDraw);
  for(const id of ['tMin','tMax'])$(id).addEventListener('change',()=>{const a=$('tMin').valueAsNumber,b=$('tMax').valueAsNumber;if(!finite(a)||!finite(b)||a>=b||Math.max(Math.abs(a),Math.abs(b))>1e5){notice('t 起點需小於終點，且介於 −100000 到 100000。');$('tMin').value=state.t[0];$('tMax').value=state.t[1];return;}state.t=[a,b];update();});
  $('shareGraph').onclick=()=>{const url=new URL(location.href);url.hash='g='+encodeURIComponent(JSON.stringify(state));$('graphShareURL').value=url.href;$('graphShareDialog').showModal();$('graphShareURL').select();};
  $('copyGraphURL').onclick=async()=>{try{await navigator.clipboard.writeText($('graphShareURL').value);notice('圖形網址已複製。');}catch{$('graphShareURL').select();notice('請長按或按 Ctrl/Cmd+C 複製網址。');}};
  $('exportGraph').onclick=()=>{
    draw();const ratio=canvas.width/width,out=document.createElement('canvas');out.width=canvas.width;const lines=state.rows.map((r,i)=>r.visible?`${i+1}. ${r.text}`:null).filter(Boolean);out.height=canvas.height+Math.ceil((70+lines.length*22)*ratio);const c=out.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,out.width,out.height);c.drawImage(canvas,0,0);c.scale(ratio,ratio);c.fillStyle='#172b42';c.font='600 14px system-ui';c.fillText('MATH LAB · 智慧繪圖',18,height+24);c.font='12px monospace';lines.forEach((line,i)=>c.fillText(line,18,height+48+i*22,width-36));c.fillStyle='#52677c';c.font='10px system-ui';c.fillText(`弧度 · a=${fmt(state.params.a)}, b=${fmt(state.params.b)}, c=${fmt(state.params.c)} · 數值取樣圖形`,18,height+52+lines.length*22,width-36);
    out.toBlob(blob=>{if(!blob){notice('無法匯出圖形，請稍後再試。');return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='mathlab-graph.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);notice('PNG 已匯出，包含目前算式與參數。');},'image/png');
  };
  window.addEventListener('hashchange',load);window.addEventListener('pagehide',()=>{try{localStorage.setItem(storageKey,JSON.stringify(state));}catch{}});
  load();new ResizeObserver(resize).observe(canvas);
})();
