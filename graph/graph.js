/* Standalone graph studio; no remote services or runtime dependencies. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id), M = window.GraphMath, S = window.GraphState, R = window.GraphRender;
  const colors=S.colors, keys=S.keys, X=window.MathExact, K=window.MathKeyboard;
  const numeric=el=>K.numeric(el);
  const names={function:'函數 y=f(x)',implicit:'隱函數',inequality:'不等式區域',parametric:'參數曲線',polar:'極座標',point:'座標點'};
  const examples={quadratic:['y=a(x-b)^2+c','y=x+2'],circle:['x^2+y^2=9','x^2/16+y^2/4=1'],trig:['y=a sin(b x)+c','y=cos(x)'],rational:['y=1/x','y=(x^2-1)/(x-1)'],parametric:['(3sin(a t),3sin(b t))'],polar:['r=a cos(b t)'],points:['(1,2)','(-2,-1)','y=x+1'],piecewise:['y=if(x<0,-x,x^2)','y=sqrt(x) {0<=x<=4}'],inequality:['x^2+y^2<=9','y>x+1'],integral:['y=x^3-x','y=0'],vt:['y=a+b*x {0<=x<=6}']};
  const defaultState=S.defaults, validState=S.validate;
  Object.assign(examples,{wave:['y=sin(20x)','y=0.5cos(35x)'],saddle:['x*y=0.25','x*y=-0.25'],annotations:['(0,0)','(3,0)','(1,2)','(3t,0)','(t,2t)','(3-2t,2t)']});
  const canvas=$('graphCanvas');let ctx=canvas.getContext('2d');
  let state=defaultState(), compiled=[], width=800,height=500, points=[], frame=0, analysisTimer=0, noticeTimer=0, saveTimer=0;
  let history=null, historyTimer=0, animation=null, integral=null, tableData=null, analysisGeneration=0;
  let labelItems=[],labelObstacles=[],curveObstacles=[],renderStats={},exporting=false,interactionUntil=0,detailTimer=0,frameQuality=null;
  const curveCache=new Map();
  const storageKey='mathlab-graph-v1'; // Preserve the existing user's saved workspace.
  const finite=n=>Number.isFinite(n), clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const fmt=n=>!finite(n)?'未定義':n===0?'0':Math.abs(n)>=1e5||Math.abs(n)<1e-4?Number(n).toExponential(4):String(Number(n.toFixed(6)));
  function historyButtons(){ $('undoGraph').disabled=!history?.canUndo;$('redoGraph').disabled=!history?.canRedo; }
  function flushHistory(){clearTimeout(historyTimer);if(history){history.commit(state);historyButtons();}}
  function remember(){if(animation||!history)return;clearTimeout(historyTimer);historyTimer=setTimeout(flushHistory,400);}
  function restoreHistory(direction){stopAnimation();flushHistory();state=history[direction]();rebuild();historyButtons();}
  function functionKey(){return JSON.stringify([state.rows,state.params]);}
  function invalidateCalculation(){integral=null;$('integralResult').textContent='設定區間後按「計算」。';$('integralResult').dataset.error='false';scheduleDraw();}
  function notice(message) { $('graphNotice').textContent=message;$('graphNotice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('graphNotice').hidden=true,4200); }
  function load() {
    let shared=false;
    try {
      if(location.hash.startsWith('#g=')) { shared=true;if(location.hash.length>50000) throw Error('分享網址過長。');state=validState(JSON.parse(decodeURIComponent(location.hash.slice(3)))); }
      else { const saved=localStorage.getItem(storageKey);if(saved) state=validState(JSON.parse(saved)); }
    } catch { notice(shared?'分享資料無效，已開啟預設圖形。':'無法讀取舊圖形，已開啟預設圖形。');state=defaultState(); }
    stopAnimation();history=new S.History(state);rebuild();historyButtons();
  }
  let storageWarned=false;
  function save() { clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try {localStorage.setItem(storageKey,JSON.stringify(state));}catch{if(!storageWarned){notice('瀏覽器無法儲存，請使用分享網址保留圖形。');storageWarned=true;document.querySelector('.local-badge').textContent='此瀏覽器無法自動儲存';}}},250); }
  function parseRows() {
    compiled=state.rows.map((r,i)=>{
      try {return {...M.parse(r.text),index:i,color:r.color||colors[i],visible:r.visible,text:r.text,label:r.label||''};}
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
    $('parameterPanel').hidden=!keys.some(k=>vars.has(k));
    for(const row of $('parameters').children) row.hidden=!vars.has(row.dataset.key);
    $('tPanel').hidden=!compiled.some(c=>['parametric','polar'].includes(c.kind));
    for(const id of ['probeCurve','integralCurve']) {
      const select=$(id),prior=select.value;select.replaceChildren();
      if(id==='integralCurve'){const o=document.createElement('option');o.value='';o.textContent='x 軸（g = 0）';select.append(o);}
      for(const c of compiled.filter(c=>!c.error&&c.visible&&c.kind==='function')) {const o=document.createElement('option');o.value=c.index;o.textContent=`${c.index+1}. ${c.text}`;select.append(o);}
      if([...select.options].some(o=>o.value===prior))select.value=prior;
    }
    rebuildLegend();update();
  }
  function rebuild() {
    stopAnimation();K.close();K.enhanceNumbers();
    $('expressions').replaceChildren();
    state.rows.forEach((r,i)=>{
      const row=document.createElement('div');row.className='expression-row';row.style.setProperty('--curve',r.color||colors[i]);
      row.innerHTML='<div class="expression-top"><label><input type="checkbox"><span></span></label><input type="color"><span class="expression-kind"></span><button type="button" class="expression-duplicate" title="複製算式">⧉</button><button type="button" class="expression-delete">×</button></div><input class="expression-input" type="text" maxlength="480" autocomplete="off" spellcheck="false"><input class="curve-label-input" type="text" maxlength="60" placeholder="圖形名稱（選填）"><p class="expression-error" role="status" hidden></p>';
      const check=row.querySelector('input[type=checkbox]');check.checked=r.visible;check.setAttribute('aria-label',`顯示圖形 ${i+1}`);check.onchange=()=>{r.visible=check.checked;parseRows();};
      row.querySelector('label span').textContent=`圖形 ${i+1}`;
      const input=row.querySelector('.expression-input');input.value=r.text;input.setAttribute('aria-label',`算式 ${i+1}`);input.setAttribute('aria-describedby',`expression-error-${i}`);row.querySelector('.expression-error').id=`expression-error-${i}`;
      let timer;input.addEventListener('input',()=>{r.text=input.value;clearTimeout(timer);timer=setTimeout(parseRows,220);});input.addEventListener('change',()=>{clearTimeout(timer);parseRows();});
      const label=row.querySelector('.curve-label-input');label.value=r.label||'';label.setAttribute('aria-label',`圖形 ${i+1} 名稱`);label.onfocus=()=>K.close();label.oninput=()=>{r.label=label.value;parseRows();};
      const color=row.querySelector('input[type=color]');color.value=r.color||colors[i];color.setAttribute('aria-label',`圖形 ${i+1} 顏色`);color.oninput=()=>{r.color=color.value;row.style.setProperty('--curve',r.color);parseRows();};
      const duplicate=row.querySelector('.expression-duplicate');duplicate.setAttribute('aria-label',`複製圖形 ${i+1}`);duplicate.disabled=state.rows.length>=12;duplicate.onclick=()=>{flushHistory();state.rows.splice(i+1,0,{...r,color:colors[state.rows.length]});rebuild();};
      const del=row.querySelector('.expression-delete');del.setAttribute('aria-label',`刪除圖形 ${i+1}`);del.onclick=()=>{flushHistory();if(state.rows.length===1){r.text='';}else state.rows.splice(i,1);rebuild();};
      $('expressions').append(row);
    });
    $('curveCount').textContent=`${state.rows.length} / 12`;$('addExpression').disabled=state.rows.length>=12;
    $('parameters').replaceChildren();
    for(const key of keys) {
      const row=document.createElement('div');row.className='parameter-row';row.dataset.key=key;
      row.innerHTML=`<div class="parameter-label"><label for="param-${key}">${key}</label><button class="animate-param" aria-label="播放參數 ${key}" aria-pressed="false">▶</button><input id="param-${key}" type="number" step="any" min="-10000" max="10000" aria-label="參數 ${key}"></div><input type="range" aria-label="調整參數 ${key}"><details class="parameter-range-settings"><summary>滑桿範圍與步長</summary><div class="range-fields"><label>最小<input type="number" step="any" data-range="0" aria-label="${key} 最小值"></label><label>最大<input type="number" step="any" data-range="1" aria-label="${key} 最大值"></label><label>步長<input type="number" step="any" data-range="2" aria-label="${key} 步長"></label></div></details>`;
      const num=row.querySelector('input[type=number]'),range=row.querySelector('input[type=range]');K.enhanceNumbers(row);
      const sync=()=>{const [min,max,step]=state.ranges[key];range.min=min;range.max=max;range.step=step;range.value=clamp(state.params[key],min,max);num.value=state.paramText[key];row.querySelectorAll('[data-range]').forEach(el=>el.value=state.rangeText[key][Number(el.dataset.range)]);};sync();
      num.oninput=()=>{stopAnimation();const v=numeric(num),valid=finite(v)&&Math.abs(v)<=10000;num.setAttribute('aria-invalid',String(!valid));if(valid){state.params[key]=v;state.paramText[key]=num.value;range.value=clamp(v,Number(range.min),Number(range.max));update();}};
      num.onchange=()=>{if(!finite(numeric(num))||Math.abs(numeric(num))>10000)notice('請輸入介於 −10000 到 10000 的常數算式，例如 √2 或 π/3。');};
      range.oninput=()=>{stopAnimation();state.params[key]=Number(range.value);num.value=range.value;state.paramText[key]=range.value;num.setAttribute("aria-invalid","false");update();};
      row.querySelectorAll('[data-range]').forEach(el=>el.onchange=()=>{
        stopAnimation();const r=[...row.querySelectorAll('[data-range]')].map(el=>numeric(el));
        if(!r.every(finite)||r[0]>=r[1]||r[2]<=0||r[2]>r[1]-r[0]||r.slice(0,2).some(v=>Math.abs(v)>10000)){notice('滑桿需最小值 < 最大值、步長 > 0，且範圍在 ±10000 內。');sync();return;}
        state.ranges[key]=r;state.rangeText[key]=[...row.querySelectorAll('[data-range]')].map(el=>el.value);sync();update();
      });
      row.querySelector('.animate-param').onclick=()=>toggleAnimation(key);$('parameters').append(row);
    }
    $('labelMode').value=state.display.labels;$('renderQuality').value=state.display.quality;$('showLegend').checked=state.display.legend;rebuildLegend();
    $('tMin').value=state.tText[0];$('tMax').value=state.tText[1];$('tableCount').dataset.mathInteger='true';$('showGrid').checked=state.grid;K.enhanceNumbers();parseRows();
  }
  const scale=()=>width/state.view.span;
  const sx=x=>width/2+(x-state.view.x)*scale(),sy=y=>height/2-(y-state.view.y)*scale();
  const wx=x=>state.view.x+(x-width/2)/scale(),wy=y=>state.view.y-(y-height/2)/scale();
  const evaluate=(c,x,y)=>c.at(x,y,state.params);
  function scheduleDraw(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;draw();});}
  function update(){
    for(const k of ['x','y','span']){let previous;try{previous=X.scalar(state.viewText[k]).value;}catch{}if(previous!==state.view[k])state.viewText[k]=String(state.view[k]);}
    analysisGeneration++;points=[];
    if(integral&&integral.key!==functionKey())invalidateCalculation();
    if(tableData&&tableData.key!==functionKey()){tableData=null;$('valueTable').textContent='函數已變更，請重新產生數值表。';}
    scheduleDraw();clearTimeout(analysisTimer);analysisTimer=setTimeout(analyze,180);save();remember();
  }
  function resize(){const r=canvas.getBoundingClientRect();if(r.width<1||r.height<1)return;width=r.width;height=r.height;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);update();}
  function grid(){
    const raw=90/scale(),p=10**Math.floor(Math.log10(raw)),step=[1,2,5,10].find(v=>v*p>=raw)*p;
    ctx.font='11px ui-monospace,monospace';ctx.lineWidth=1;
    const xAxis=sy(0),yAxis=sx(0);
    for(let x=Math.ceil(wx(0)/step)*step;x<=wx(width)+step*.001;x+=step){const px=sx(x);if(state.grid){ctx.strokeStyle='#e7edf5';ctx.beginPath();ctx.moveTo(px,0);ctx.lineTo(px,height);ctx.stroke();}ctx.fillStyle='#718297';ctx.textAlign='center';const y=clamp(xAxis+17,18,height-8),text=fmt(x);ctx.fillText(text,px,y);labelObstacles.push({x:px-ctx.measureText(text).width/2-2,y:y-12,width:ctx.measureText(text).width+4,height:15});}
    for(let y=Math.ceil(wy(height)/step)*step;y<=wy(0)+step*.001;y+=step){const py=sy(y);if(state.grid){ctx.strokeStyle='#e7edf5';ctx.beginPath();ctx.moveTo(0,py);ctx.lineTo(width,py);ctx.stroke();}if(Math.abs(y)>step*.001){ctx.fillStyle='#718297';ctx.textAlign='left';const x=clamp(yAxis+8,8,width-65),text=fmt(y);ctx.fillText(text,x,py-5);labelObstacles.push({x:x-2,y:py-17,width:ctx.measureText(text).width+4,height:15});}}
    ctx.strokeStyle='#8c9cb1';ctx.lineWidth=1.3;ctx.beginPath();if(xAxis>=0&&xAxis<=height){ctx.moveTo(0,xAxis);ctx.lineTo(width,xAxis);}if(yAxis>=0&&yAxis<=width){ctx.moveTo(yAxis,0);ctx.lineTo(yAxis,height);}ctx.stroke();
    ctx.fillStyle='#52677c';ctx.font='italic 13px serif';ctx.fillText('x',width-16,clamp(xAxis-8,15,height-10));ctx.fillText('y',clamp(yAxis+9,10,width-15),17);
  }
  const viewport=()=>({xmin:wx(0),xmax:wx(width),ymin:wy(height),ymax:wy(0),width,height});
  const quality=()=>frameQuality||(exporting?'precise':animation||pointers.size||performance.now()<interactionUntil?'interactive':state.display.quality);
  function interact(){interactionUntil=performance.now()+150;clearTimeout(detailTimer);detailTimer=setTimeout(scheduleDraw,170);}
  function shortText(text,maxWidth){const letters=Array.from(text);if(ctx.measureText(text).width<=maxWidth)return text;while(letters.length>1&&ctx.measureText(letters.join('')+'…').width>maxWidth)letters.pop();return letters.join('')+'…';}
  function queueLabel(x,y,color,text,id,priority=1){
    if(state.display.labels==='none'||!finite(x)||!finite(y)||x<0||x>width||y<0||y>height)return;
    ctx.font='12px system-ui';const value=shortText(text,Math.min(width-28,260));
    labelItems.push({id,text:value,anchor:[x,y],width:ctx.measureText(value).width+14,height:25,color,priority});
  }
  function dot(x,y,color,label,id='point',priority=5){if(!finite(x)||!finite(y)||sx(x)<0||sx(x)>width||sy(y)<0||sy(y)>height)return;ctx.beginPath();ctx.arc(sx(x),sy(y),4,0,2*Math.PI);ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='white';ctx.lineWidth=1.5;ctx.stroke();labelObstacles.push({x:sx(x)-6,y:sy(y)-6,width:12,height:12});if(label)queueLabel(sx(x),sy(y),color,label,id,priority);}
  function drawSegments(result,color){
    ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=2.2;ctx.lineJoin='round';
    const total=result.segments.reduce((n,line)=>n+line.length-1,0),stride=Math.max(1,Math.ceil(total/400));let serial=0;
    for(const line of result.segments){if(!line.length)continue;ctx.moveTo(sx(line[0][0]),sy(line[0][1]));for(let i=1;i<line.length;i++){
      ctx.lineTo(sx(line[i][0]),sy(line[i][1]));
      if(serial++%stride===0)curveObstacles.push({x1:sx(line[i-1][0]),y1:sy(line[i-1][1]),x2:sx(line[i][0]),y2:sy(line[i][1]),radius:2});
    }}ctx.stroke();
    renderStats.evaluations=(renderStats.evaluations||0)+result.stats.evaluations;renderStats.segments=(renderStats.segments||0)+result.segments.length;
    if(result.stats.budgetExhausted)renderStats.limited=true;
  }
  function sampled(c){
    const q=quality(),key=JSON.stringify([c.text,c.kind,state.params,state.view,state.t,width,height,q]);
    if(c.text&&curveCache.has(key))return curveCache.get(key);
    const options={quality:q};
    const result=c.kind==='function'?R.sampleFunction(t=>evaluate(c,t),viewport(),options):c.kind==='implicit'||c.kind==='inequality'?R.contourImplicit((x,y)=>evaluate(c,x,y),viewport(),options):R.sampleParametric(t=>evaluate(c,t),state.t[0],state.t[1],viewport(),options);
    if(c.text){if(curveCache.size>=36)curveCache.delete(curveCache.keys().next().value);curveCache.set(key,result);}return result;
  }
  function curve(c){drawSegments(sampled(c),c.color);}
  function implicit(c){
    // Shading and its boundary share the same finite predicate; strict bounds use dashes.
    if(c.kind==='inequality'){
      const cell=quality()==='interactive'?12:6;ctx.save();ctx.fillStyle=c.color;ctx.globalAlpha=.13;
      for(let y=0;y<height;y+=cell)for(let x=0;x<width;x+=cell){const px=x+Math.min(cell,width-x)/2,py=y+Math.min(cell,height-y)/2;if(c.contains(evaluate(c,wx(px),wy(py))))ctx.fillRect(x,y,Math.min(cell,width-x),Math.min(cell,height-y));}
      ctx.restore();
    }
    ctx.save();ctx.setLineDash(c.kind==='inequality'&&['<','>'].includes(c.relation)?[6,5]:[]);drawSegments(sampled(c),c.color);ctx.restore();
  }
  function curveName(c,result){
    if(!c.label||!result?.segments.length)return;
    const line=result.segments.reduce((best,line)=>line.length>best.length?line:best,[]),p=line[Math.floor(line.length*.65)];
    if(p)queueLabel(sx(p[0]),sy(p[1]),c.color,c.label,'curve-'+c.index,2);
  }
  function drawLabels(){
    const candidates=state.display.labels==='smart'?[...labelItems].sort((a,b)=>b.priority-a.priority).slice(0,width<500?12:26):labelItems;
    const layout=R.placeLabels(candidates,{width,height},{obstacles:[...labelObstacles,...curveObstacles],padding:8,gap:4});
    ctx.save();ctx.font='12px system-ui';ctx.textAlign='left';ctx.textBaseline='middle';
    for(const l of layout.labels){if(l.leader){ctx.beginPath();ctx.strokeStyle=l.color;ctx.lineWidth=.9;ctx.setLineDash([]);ctx.moveTo(...l.leader[0]);ctx.lineTo(...l.leader[1]);ctx.stroke();}
      ctx.fillStyle='#ffffff';ctx.globalAlpha=.94;ctx.fillRect(l.x,l.y,l.width,l.height);ctx.globalAlpha=1;ctx.fillStyle=l.color;ctx.fillText(l.text,l.x+7,l.y+l.height/2);
    }ctx.restore();
    renderStats.labels=layout.labels.map(l=>({id:l.id,x:l.x,y:l.y,width:l.width,height:l.height,text:l.text}));renderStats.suppressed=labelItems.length-layout.labels.length;
    $('labelReadout').textContent=state.display.labels==='none'?'標註已隱藏':`標註 ${layout.labels.length}/${labelItems.length}`+(renderStats.suppressed?' · 密集處請查看智慧分析':'');
    if(renderStats.limited)$('labelReadout').textContent+=' · 密集圖形請縮小觀察範圍以取得更多細節';
    canvas.dataset.labelCount=String(layout.labels.length);canvas.dataset.quality=quality();
  }
  function rebuildLegend(){
    const host=$('graphLegend');host.replaceChildren();host.hidden=!state.display.legend;
    for(const c of compiled.filter(c=>!c.error&&c.visible)){const item=document.createElement('span'),swatch=document.createElement('i'),text=document.createElement('span');swatch.style.background=c.color;text.textContent=`${c.index+1}. ${c.label||c.text}`;item.title=c.text;item.append(swatch,text);host.append(item);}
  }
  function probe(){
    const c=compiled[Number($('probeCurve').value)],x=numeric($('probeX'));
    if(!c||c.kind!=='function'||!c.visible||!finite(x)||$('probeCurve').value===''){ $('probeResult').textContent='加入 y=f(x) 即可觀察數值。';return; }
    const f=x=>evaluate(c,x),y=f(x),slope=M.slope(f,x),differentiable=finite(slope);
    $('probeResult').textContent=`f(${$('probeX').value}) ≈ ${fmt(y)}；斜率 ≈ ${differentiable?fmt(slope):'無法判定'}`;
    if($('showDerivative').checked){ctx.save();ctx.setLineDash([4,4]);curve({kind:'function',color:c.color,at:t=>M.slope(f,t)});ctx.restore();}
    if($('traceCurve').checked&&finite(y)){ctx.save();ctx.setLineDash([3,5]);ctx.strokeStyle='#9aaabd';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(sx(x),0);ctx.lineTo(sx(x),height);ctx.stroke();ctx.restore();dot(x,y,c.color,`觀察 (${fmt(x)}, ${fmt(y)})`,'probe',20);}
    if($('showTangent').checked&&finite(y)&&differentiable){ctx.save();ctx.setLineDash([6,5]);ctx.strokeStyle=c.color;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,sy(y+slope*(wx(0)-x)));ctx.lineTo(width,sy(y+slope*(wx(width)-x)));ctx.stroke();ctx.restore();dot(x,y,c.color);}
  }
  function draw(){
    frameQuality=quality();try{
    labelItems=[];labelObstacles=[{x:8,y:8,width:Math.min(270,width-16),height:30},{x:width-100,y:height-32,width:92,height:24}];curveObstacles=[];renderStats={quality:quality(),evaluations:0,segments:0};
    ctx.clearRect(0,0,width,height);ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,height);grid();ctx.save();ctx.beginPath();ctx.rect(0,0,width,height);ctx.clip();shadeArea();
    for(const c of compiled.filter(c=>!c.error&&c.visible)){if(c.kind==='point'){const p=evaluate(c,0);dot(...p,c.color,`${c.label?c.label+' ':''}(${fmt(p[0])}, ${fmt(p[1])})`,'point-'+c.index,10);}else if(c.kind==='implicit'||c.kind==='inequality')implicit(c);else curve(c);if(c.kind!=='point')curveName(c,sampled(c));}
    if($('showAnalysis').checked)for(const [i,p] of points.entries())dot(p.x,p.y,p.color,`${p.label.split(' · ').at(-1)} (${fmt(p.x)}, ${fmt(p.y)})`,'analysis-'+i,p.label.includes('交點')?9:6);
    probe();drawLabels();ctx.restore();$('viewReadout').textContent=`x ∈ [${fmt(wx(0))}, ${fmt(wx(width))}]`;
    for(const [id,key]of [['viewX','x'],['viewY','y'],['viewSpan','span']])if(document.activeElement!==$(id))$(id).value=state.viewText[key];
    }finally{frameQuality=null;}
  }
  async function analyze(){
    const ticket=analysisGeneration,params={...state.params},xmin=wx(0),xmax=wx(width),ymin=wy(height),ymax=wy(0);
    const functions=compiled.filter(c=>!c.error&&c.visible&&c.kind==='function'),messages=[],resultPoints=[];
    const at=(c,x)=>c.at(x,undefined,params),box=$('analysisResults');box.setAttribute('aria-busy','true');
    const yieldWork=async()=>{await new Promise(resolve=>setTimeout(resolve,0));return ticket===analysisGeneration;};
    const add=(x,y,color,label)=>{if(finite(x)&&finite(y)&&y>=ymin&&y<=ymax&&resultPoints.length<70)resultPoints.push({x,y,color,label});};
    for(const c of functions){
      if(!await yieldWork())return;
      if(/\b(floor|ceil|round|sign)\s*\(/.test(c.text)){messages.push(`圖形 ${c.index+1} 含跳躍函數，略過特殊點分析。`);continue;}
      const f=x=>at(c,x),result=M.analyze(f,xmin,xmax);
      for(const x of result.zeros)add(x,0,c.color,`圖形 ${c.index+1} · 零點`);
      for(const x of result.extrema)add(x,f(x),c.color,`圖形 ${c.index+1} · 局部極值`);
      if(result.allZero)messages.push(`圖形 ${c.index+1} 在取樣點皆為 0，未列孤立零點。`);
    }
    for(let i=0;i<functions.length;i++)for(let j=i+1;j<functions.length;j++){
      if(!await yieldWork())return;
      const a=functions[i],b=functions[j];if(/\b(floor|ceil|round|sign)\s*\(/.test(a.text+b.text))continue;
      const result=M.analyze(x=>at(a,x)-at(b,x),xmin,xmax);
      if(result.allZero){messages.push(`圖形 ${a.index+1}、${b.index+1} 在取樣點重合。`);continue;}
      for(const x of result.zeros)add(x,at(a,x),'#172b42',`圖形 ${a.index+1} × ${b.index+1} · 交點`);
    }
    if(ticket!==analysisGeneration)return;points=resultPoints;box.replaceChildren();box.setAttribute('aria-busy','false');
    for(const p of points){const button=document.createElement('button');button.className='analysis-chip';const label=document.createElement('b');label.textContent=p.label;button.append(label,document.createTextNode(`(${fmt(p.x)}, ${fmt(p.y)})`));button.onclick=()=>{flushHistory();state.view.x=p.x;state.view.y=p.y;$('probeX').value=p.x;update();};box.append(button);}
    if(!points.length)messages.unshift(functions.length?'目前視窗未找到孤立特殊點；可縮放或移動畫面。':'輸入 y=f(x) 可自動分析零點與交點。');
    for(const message of messages){const p=document.createElement('p');p.className='small-label';p.textContent=message;box.append(p);}scheduleDraw();
  }
  function zoom(factor,px=width/2,py=height/2){const before=[wx(px),wy(py)];state.view.span=clamp(state.view.span*factor,.001,1e6);state.view.x+=before[0]-wx(px);state.view.y+=before[1]-wy(py);boundView();update();}
  function boundView(){state.view.x=clamp(state.view.x,-1e9,1e9);state.view.y=clamp(state.view.y,-1e9,1e9);}
  function fit(){
    let samples=[],hasImplicit=false;
    for(const c of compiled.filter(c=>!c.error&&c.visible)){
      if(c.kind==='implicit'||c.kind==='inequality'){hasImplicit=true;for(const line of sampled(c).segments)samples.push(...line);continue;}
      if(c.kind==='point'){samples.push(evaluate(c,0));continue;}
      const explicit=c.kind==='function',a=explicit?-10:state.t[0],b=explicit?10:state.t[1];
      for(let i=0;i<=400;i++){const t=a+(b-a)*i/400,v=evaluate(c,t);samples.push(explicit?[t,v]:v);}
    }
    samples=samples.filter(p=>p.every(finite)&&p.every(v=>Math.abs(v)<1e8));
    if(!samples.length){state.view={x:0,y:0,span:14};notice(hasImplicit?'隱函數使用原點視窗，請拖曳或縮放尋找其他區域。':'未取得有限座標，已回到原點。');update();return;}
    const xs=samples.map(p=>p[0]).sort((a,b)=>a-b),ys=samples.map(p=>p[1]).sort((a,b)=>a-b);
    const trim=samples.length>100?.025:0,x0=xs[0],x1=xs.at(-1),y0=ys[Math.floor(ys.length*trim)],y1=ys[Math.min(ys.length-1,Math.floor(ys.length*(1-trim)))];
    state.view={x:(x0+x1)/2,y:(y0+y1)/2,span:clamp(Math.max(x1-x0,(y1-y0)*width/height,2)*1.2,.001,1e6)};boundView();update();notice('已依 x ∈ [−10,10]、t 範圍與視窗內隱函數輪廓取景；視窗外分支與極端值仍可能需手動調整。');
  }
  const pointers=new Map();let gesture=null,tap=null;
  const position=e=>{const r=canvas.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top];};
  function rebaseGesture(){const p=[...pointers.values()];gesture=p.length===1?{p:p[0],view:{...state.view}}:p.length>=2?{p:[(p[0][0]+p[1][0])/2,(p[0][1]+p[1][1])/2],distance:Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]),view:{...state.view}}:null;}
  canvas.addEventListener('pointerdown',e=>{K.close();interact();canvas.focus({preventScroll:true});stopAnimation();tap={p:position(e),moved:false};pointers.set(e.pointerId,position(e));canvas.setPointerCapture(e.pointerId);rebaseGesture();});
  canvas.addEventListener('pointermove',e=>{
    const p=position(e);$('coordinateReadout').textContent=`x ${fmt(wx(p[0]))}   y ${fmt(wy(p[1]))}`;
    if(tap&&Math.hypot(p[0]-tap.p[0],p[1]-tap.p[1])>5)tap.moved=true;
    if($('traceCurve').checked&&!pointers.size){$('probeX').value=Number(wx(p[0]).toPrecision(8));scheduleDraw();}
    if(!pointers.has(e.pointerId)||!gesture)return;interact();pointers.set(e.pointerId,p);const ps=[...pointers.values()];
    const center=ps.length>1?[(ps[0][0]+ps[1][0])/2,(ps[0][1]+ps[1][1])/2]:p;
    const distance=ps.length>1?Math.hypot(ps[0][0]-ps[1][0],ps[0][1]-ps[1][1]):0;
    const span=gesture.distance&&distance?clamp(gesture.view.span*gesture.distance/distance,.001,1e6):gesture.view.span;
    state.view.span=span;state.view.x=gesture.view.x+(gesture.p[0]-width/2)*gesture.view.span/width-(center[0]-width/2)*span/width;state.view.y=gesture.view.y-(gesture.p[1]-height/2)*gesture.view.span/width+(center[1]-height/2)*span/width;boundView();update();
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{if(event==='pointerup'&&tap&&!tap.moved&&pointers.size===1&&$('traceCurve').checked){$('probeX').value=Number(wx(position(e)[0]).toPrecision(8));scheduleDraw();}if(pointers.size>1&&tap)tap.moved=true;pointers.delete(e.pointerId);rebaseGesture();if(!pointers.size){tap=null;interact();scheduleDraw();}});
  canvas.addEventListener('wheel',e=>{e.preventDefault();interact();zoom(Math.exp(clamp(e.deltaY,-100,100)*.002),...position(e));},{passive:false});
  canvas.addEventListener('keydown',e=>{const step=state.view.span*.06;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','0'].includes(e.key))e.preventDefault();else return;if(e.key==='ArrowLeft')state.view.x-=step;if(e.key==='ArrowRight')state.view.x+=step;if(e.key==='ArrowUp')state.view.y+=step;if(e.key==='ArrowDown')state.view.y-=step;if(e.key==='+'||e.key==='=')zoom(.8);if(e.key==='-')zoom(1.25);if(e.key==='0')state.view={x:0,y:0,span:14};boundView();update();});
  $('addExpression').onclick=()=>{if(state.rows.length<12){flushHistory();state.rows.push({text:'',visible:true,color:colors[state.rows.length]});rebuild();$('expressions').lastElementChild.querySelector('.expression-input').focus();}};
  $('exampleSelect').onchange=e=>{
    const name=e.target.value;if(!examples[name])return;stopAnimation();flushHistory();state=defaultState();
    state.rows=examples[name].map((text,i)=>({text,visible:true,color:colors[i]}));
    if(name==='annotations'){['A','B','C','AB','AC','BC'].forEach((label,i)=>state.rows[i].label=label);state.view={x:1.5,y:1,span:6};state.t=[0,1];state.tText=['0','1'];}
    if(name==='wave')state.view={x:0,y:0,span:4};
    if(name==='parametric')Object.assign(state.params,{a:3,b:2});if(name==='polar')Object.assign(state.params,{a:4,b:3});
    if(name==='vt'){Object.assign(state.params,{a:2,b:1});state.view={x:3,y:4,span:12};}
    keys.forEach(k=>state.paramText[k]=String(state.params[k]));for(const k of ['x','y','span'])state.viewText[k]=String(state.view[k]);e.target.value='';K.close();rebuild();
    if(name==='integral'||name==='vt'){$('integralA').value=name==='vt'?0:-1;$('integralB').value=name==='vt'?4:2;$('integralCurve').value='';calculateIntegral();}
  };
  $('zoomIn').onclick=()=>zoom(.8);$('zoomOut').onclick=()=>zoom(1.25);$('homeView').onclick=()=>{state.view={x:0,y:0,span:14};update();};$('fitView').onclick=fit;
  for(const id of ['labelMode','renderQuality','showLegend'])$(id).onchange=()=>{state.display={labels:$('labelMode').value,quality:$('renderQuality').value,legend:$('showLegend').checked};rebuildLegend();update();};
  $('showGrid').onchange=()=>{state.grid=$('showGrid').checked;update();};$('showAnalysis').onchange=scheduleDraw;
  for(const id of ['probeCurve','probeX','showTangent','showDerivative','traceCurve'])$(id).addEventListener('input',scheduleDraw);
  for(const id of ['tMin','tMax'])$(id).addEventListener('change',()=>{const a=numeric($('tMin')),b=numeric($('tMax'));if(!finite(a)||!finite(b)||a>=b||Math.max(Math.abs(a),Math.abs(b))>1e5){notice('t 起點需小於終點，且介於 −100000 到 100000。');$('tMin').value=state.tText[0];$('tMax').value=state.tText[1];return;}state.t=[a,b];state.tText=[$('tMin').value,$('tMax').value];update();});
  $('shareGraph').onclick=()=>{stopAnimation();const url=new URL(location.href);url.hash='g='+encodeURIComponent(JSON.stringify(state));$('graphShareURL').value=url.href;$('graphShareDialog').showModal();$('graphShareURL').select();};
  $('copyGraphURL').onclick=async()=>{try{await navigator.clipboard.writeText($('graphShareURL').value);notice('圖形網址已複製。');}catch{$('graphShareURL').select();notice('請長按或按 Ctrl/Cmd+C 複製網址。');}};
  function wrapped(text,maxWidth,font){
    ctx.font=font;const lines=[];let line='';
    for(const letter of text){if(line&&ctx.measureText(line+letter).width>maxWidth){lines.push(line);line='';}line+=letter;}if(line)lines.push(line);return lines;
  }
  function footerLines(){
    const content=[{text:'MATH LAB · 智慧繪圖 Pro',font:'600 14px system-ui',color:'#172b42'},...state.rows.filter(r=>r.visible).map(r=>({text:(r.label?r.label+' · ':'')+r.text,font:'12px monospace',color:r.color})),{text:'弧度 · '+keys.map(k=>k+'='+state.paramText[k]).join(', ')+' · 數值取樣圖形',font:'11px system-ui',color:'#52677c'}];
    return content.flatMap(record=>wrapped(record.text,width-36,record.font).map(text=>({...record,text})));
  }
  function footer(target,lines){target.save();target.fillStyle='#fff';target.fillRect(0,height,width,28+lines.length*22);target.textAlign='left';target.textBaseline='alphabetic';lines.forEach((line,i)=>{target.font=line.font;target.fillStyle=line.color;target.fillText(line.text,18,height+24+i*22);});target.restore();}
  $('exportGraph').onclick=()=>{
    stopAnimation();exporting=true;
    try{draw();const ratio=canvas.width/width,lines=footerLines(),out=document.createElement('canvas');out.width=canvas.width;out.height=canvas.height+Math.ceil((28+lines.length*22)*ratio);const c=out.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,out.width,out.height);c.drawImage(canvas,0,0);c.scale(ratio,ratio);footer(c,lines);
      out.toBlob(blob=>{if(!blob){notice('無法匯出圖形，請稍後再試。');return;}download(blob,'mathlab-graph.png');notice('PNG 已匯出，包含標註、完整算式與參數。');},'image/png');
    }finally{exporting=false;scheduleDraw();}
  };
  function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
  function stopAnimation(){
    if(!animation)return;cancelAnimationFrame(animation.frame);animation=null;
    document.querySelectorAll('.animate-param').forEach(b=>{b.textContent='▶';b.setAttribute('aria-pressed','false');});
    $('calculateIntegral').disabled=false;update();flushHistory();
  }
  function toggleAnimation(key){
    if(animation?.key===key){stopAnimation();return;}stopAnimation();flushHistory();invalidateCalculation();clearTimeout(analysisTimer);analysisGeneration++;points=[];$('analysisResults').textContent='參數播放中；暫停後更新特殊點。';$('analysisResults').setAttribute('aria-busy','false');tableData=null;$('valueTable').textContent='播放參數後，請重新產生數值表。';
    const button=$('parameters').querySelector(`[data-key="${key}"] .animate-param`);button.textContent='Ⅱ';button.setAttribute('aria-pressed','true');
    const [min,max,step]=state.ranges[key],start=performance.now(),initial=clamp(state.params[key],min,max);
    animation={key,frame:0,last:0};$('calculateIntegral').disabled=true;
    function tick(now){if(!animation)return;if(now-animation.last>=50){
      const phase=(initial-min)/(max-min)+(now-start)/6000,cycle=phase%2,v=min+(cycle<=1?cycle:2-cycle)*(max-min);
      state.params[key]=clamp(min+Math.round((v-min)/step)*step,min,max);state.paramText[key]=String(Number(state.params[key].toPrecision(10)));$('param-'+key).value=state.paramText[key];
      $('parameters').querySelector(`[data-key="${key}"] input[type=range]`).value=state.params[key];animation.last=now;scheduleDraw();
    }animation.frame=requestAnimationFrame(tick);}
    animation.frame=requestAnimationFrame(tick);
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAnimation();});
  $('undoGraph').onclick=()=>restoreHistory('undo');$('redoGraph').onclick=()=>restoreHistory('redo');
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&document.body.classList.contains('graph-focused'))$('focusGraph').click();
    if(!(e.ctrlKey||e.metaKey)||e.altKey||/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)||e.target.isContentEditable)return;
    if(e.key.toLowerCase()==='z'){e.preventDefault();restoreHistory(e.shiftKey?'redo':'undo');}
  });
  $('focusGraph').onclick=()=>{const active=document.body.classList.toggle('graph-focused');$('focusGraph').textContent=active?'離開專注':'專注畫布';$('focusGraph').setAttribute('aria-pressed',String(active));resize();};
  $('applyView').onclick=()=>{const x=numeric($('viewX')),y=numeric($('viewY')),span=numeric($('viewSpan'));
    if(![x,y,span].every(finite)||Math.max(Math.abs(x),Math.abs(y))>1e9||span<.001||span>1e6){notice('中心需在 ±10⁹，x 軸寬度需介於 0.001 到 1000000。');return;}
    flushHistory();state.view={x,y,span};state.viewText={x:$('viewX').value,y:$('viewY').value,span:$('viewSpan').value};update();
  };
  $('saveProject').onclick=()=>{stopAnimation();download(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),'mathlab-graph.json');notice('已下載可繼續編輯的圖形檔。');};
  $('openProject').onclick=()=>$('projectFile').click();
  $('projectFile').onchange=async e=>{
    const file=e.target.files[0];if(!file)return;
    try{if(file.size>100000)throw Error('圖形檔不可超過 100 KB。');const imported=validState(JSON.parse(await file.text()));stopAnimation();flushHistory();state=imported;rebuild();notice('圖形已匯入；可按復原回到原先內容。');}
    catch(error){notice('匯入失敗：'+error.message);}finally{e.target.value='';}
  };
  $('exportSVG').onclick=()=>{
    stopAnimation();const previous=ctx;exporting=true;
    try{
      const lines=footerLines(),svg=new window.GraphSVG(width,height+28+lines.length*22,(text,font)=>{previous.save();previous.font=font;const measured=previous.measureText(text);previous.restore();return measured;});
      ctx=svg;draw();footer(svg,lines);download(new Blob([svg.toString()],{type:'image/svg+xml'}),'mathlab-graph.svg');notice('已匯出向量 SVG，標註與完整算式會自動排版。');
    }catch(error){notice('SVG 匯出失敗，請改用 PNG。');}finally{ctx=previous;exporting=false;scheduleDraw();}
  };
  function selectedFunction(id='probeCurve'){const value=$(id).value,c=compiled[Number(value)];return value!==''&&c?.kind==='function'&&!c.error&&c.visible?c:null;}
  function calculateIntegral(){
    stopAnimation();const c=selectedFunction(),other=selectedFunction('integralCurve'),a=numeric($('integralA')),b=numeric($('integralB'));
    const out=$('integralResult');integral=null;out.dataset.error='true';
    if(!c){out.textContent='請先選擇一條有效的 y=f(x)。';scheduleDraw();return;}
    if(![a,b].every(finite)||Math.max(Math.abs(a),Math.abs(b))>1e8){out.textContent='請輸入 ±10⁸ 以內的有限積分上下限。';scheduleDraw();return;}
    const f=x=>evaluate(c,x),g=other?x=>evaluate(other,x):()=>0,diff=x=>f(x)-g(x),signed=M.integrate(diff,a,b),area=M.integrate(diff,a,b,{absolute:true});
    if(!signed.converged||!area.converged){out.textContent='無法可靠估計：區間內可能有未定義點、奇異點，或數值計算未收斂。請分割區間並確認連續性。';scheduleDraw();return;}
    integral={a,b,f,g,key:functionKey(),color:c.color};out.dataset.error='false';out.replaceChildren();
    const title=document.createElement('strong');title.textContent=`∫ (${other?'f − g':'f'})(x) dx ≈ ${fmt(signed.value)}`;
    const detail=document.createElement('span');detail.textContent=`幾何面積 ≈ ${fmt(area.value)}　｜　區間 [${$('integralA').value}, ${$('integralB').value}]`;
    out.append(title,detail);scheduleDraw();
  }
  function shadeArea(){
    if(!integral||!$('shadeIntegral').checked||integral.key!==functionKey())return;
    const lo=Math.max(Math.min(integral.a,integral.b),wx(0)),hi=Math.min(Math.max(integral.a,integral.b),wx(width));if(hi<=lo)return;
    const count=Math.min(800,Math.max(2,Math.ceil((hi-lo)*scale()/2)));ctx.save();ctx.globalAlpha=.18;
    for(let i=0;i<count;i++){const x0=lo+(hi-lo)*i/count,x1=lo+(hi-lo)*(i+1)/count,y0=integral.f(x0),y1=integral.f(x1),g0=integral.g(x0),g1=integral.g(x1);if(![y0,y1,g0,g1].every(finite))continue;ctx.fillStyle=(y0+y1-g0-g1)>=0?'#078673':'#d96936';ctx.beginPath();ctx.moveTo(sx(x0),sy(y0));ctx.lineTo(sx(x1),sy(y1));ctx.lineTo(sx(x1),sy(g1));ctx.lineTo(sx(x0),sy(g0));ctx.closePath();ctx.fill();}ctx.restore();
  }
  $('calculateIntegral').onclick=calculateIntegral;$('shadeIntegral').onchange=scheduleDraw;
  for(const id of ['integralA','integralB','integralCurve','probeCurve'])$(id).addEventListener('input',invalidateCalculation);
  function buildTable(){
    stopAnimation();const curves=compiled.filter(c=>!c.error&&c.visible&&c.kind==='function'),start=numeric($('tableStart')),step=numeric($('tableStep')),count=numeric($('tableCount'));
    if(!curves.length||![start,step,count].every(finite)||step===0||!Number.isInteger(count)||count<1||count>200||Math.max(Math.abs(start),Math.abs(start+step*(count-1)))>1e9){notice('請先輸入函數；數值表需非零步長、1–200 筆，且 x 在 ±10⁹ 內。');return false;}
    const rows=Array.from({length:count},(_,i)=>{const x=start+i*step;return [x,...curves.map(c=>evaluate(c,x))];}),headers=['x',...curves.map(c=>`${c.index+1}. ${c.text}`)];
    tableData={key:functionKey(),headers,rows};const table=document.createElement('table'),head=document.createElement('thead'),tr=document.createElement('tr');
    headers.forEach(t=>{const th=document.createElement('th');th.scope='col';th.textContent=t;tr.append(th);});head.append(tr);table.append(head);const body=document.createElement('tbody');
    rows.forEach(row=>{const tr=document.createElement('tr');row.forEach((v,i)=>{const td=document.createElement('td');if(!i){const b=document.createElement('button');b.textContent=fmt(v);b.onclick=()=>{$('probeX').value=v;$('traceCurve').checked=true;scheduleDraw();};td.append(b);}else td.textContent=fmt(v);tr.append(td);});body.append(tr);});table.append(body);$('valueTable').replaceChildren(table);return true;
  }
  $('buildTable').onclick=buildTable;
  for(const id of ['tableStart','tableStep','tableCount'])$(id).addEventListener('input',()=>{tableData=null;$('valueTable').textContent='範圍已變更，請重新產生數值表。';});
  $('exportCSV').onclick=()=>{if(!buildTable())return;const quote=v=>'"'+String(v).replace(/"/g,'""')+'"',csv=[tableData.headers,...tableData.rows.map(row=>row.map(v=>finite(v)?v:'未定義'))].map(row=>row.map(quote).join(',')).join('\r\n');download(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),'mathlab-values.csv');};
  window.addEventListener('hashchange',load);window.addEventListener('pagehide',()=>{try{localStorage.setItem(storageKey,JSON.stringify(state));}catch{}});
  window.GraphStudio={getRenderReport:()=>JSON.parse(JSON.stringify(renderStats))};
  load();new ResizeObserver(resize).observe(canvas);
})();
