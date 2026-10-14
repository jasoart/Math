(() => {
  'use strict';
  const $=id=>document.getElementById(id),G=window.GraphStudio,D=window.GraphDynamics;
  if(!G||!D)return;
  const presets={oscillator:{p:'y',q:'-x',seeds:[[2,0],[4,0]],title:'簡諧振盪 · 能量軌道'},spiral:{p:'y',q:'-x-0.3y',seeds:[[4,0],[-3,2]],title:'阻尼振盪 · 收斂螺旋'},pendulum:{p:'y',q:'-sin(x)-0.15y',seeds:[[2,0],[-2,2],[0,3]],title:'非線性單擺 · 相平面'},saddle:{p:'x',q:'-y',seeds:[[.1,3],[-.1,-3]],title:'鞍點 · 穩定與不穩定方向'},logistic:{p:'1',q:'y*(1-y/3)',seeds:[[-5,.2],[-5,2],[-5,4]],title:'邏輯斯成長 · 斜率場'}};
  let seeds=[[2,0],[4,0]],worker=null,seq=0,timer,timeout,result=null,active=false,lastKey='',busy=false;
  const message=(text,error=false)=>{$('fieldStatus').textContent=text;$('fieldStatus').dataset.error=String(error);};
  function config(){return {p:$('fieldP').value,q:$('fieldQ').value,density:Number($('fieldDensity').value),duration:Number($('fieldDuration').value),seeds,params:G.snapshot().params,view:G.viewport()};}
  function seedList(){const host=$('fieldSeeds');host.replaceChildren();seeds.forEach((p,i)=>{const b=document.createElement('button');b.type='button';b.textContent=`(${p.map(x=>Number(x.toFixed(3))).join(', ')}) ×`;b.setAttribute('aria-label','移除初始點 '+(i+1));b.onclick=()=>{seeds.splice(i,1);seedList();run();};host.append(b);});}
  function finish(data,id){if(id!==seq)return;clearTimeout(timeout);busy=false;$('stopField').disabled=true;if(data.error){message(data.error,true);return;}result=data.result;G.setDynamicsOverlay(result);$('fieldCSV').disabled=false;const incomplete=result.traces.filter(t=>t.reason!=='complete').length;message(`${seeds.length} 個初始點 · ${result.arrows.length} 支方向箭頭 · ${result.traces.reduce((n,t)=>n+t.steps,0)} 步自適應積分${incomplete?' · '+incomplete+' 條軌跡提前停止（未定義／精度／計算上限）':''}${result.timeDependent?' · 箭頭顯示 t=0':''}`);worker?.terminate();worker=null;}
  function stop(){seq++;clearTimeout(timeout);clearTimeout(timer);worker?.terminate();worker=null;busy=false;$('stopField').disabled=true;}
  function run(){
    stop();result=null;G.setDynamicsOverlay(null);$('fieldCSV').disabled=true;let c;try{c=D.validate(config());}catch(e){active=false;message(e.message,true);return;}
    active=true;busy=true;const id=++seq;lastKey=JSON.stringify(c);$('stopField').disabled=false;message('正在計算向量場與軌跡…');
    try{worker=new Worker('./graph/dynamics-worker.js');worker.onmessage=e=>finish(e.data,id);worker.onerror=()=>{stop();message('背景計算無法啟動，請重新載入頁面後再試。',true);};worker.postMessage({id,config:c});timeout=setTimeout(()=>{stop();message('計算已停止，請縮短積分時間或減少初始點。',true);},6000);}
    catch{setTimeout(()=>{if(id!==seq)return;try{finish({result:D.compute(c)},id);}catch(e){finish({error:e.message},id);}},0);}
    try{localStorage.setItem('mathlab-dynamics-v1',JSON.stringify({p:c.p,q:c.q,density:c.density,duration:c.duration,seeds}));}catch{}
  }
  $('runField').onclick=run;$('stopField').onclick=()=>{stop();message('已停止，保留上次完成的圖形。');};
  $('clearField').onclick=()=>{stop();active=false;result=null;G.setDynamicsOverlay(null);$('fieldCSV').disabled=true;message('疊圖已清除。');};
  $('fieldPreset').onchange=()=>{const p=presets[$('fieldPreset').value];if(!p)return;$('fieldP').value=p.p;$('fieldQ').value=p.q;seeds=p.seeds.map(s=>[...s]);seedList();run();};
  $('addFieldSeed').onclick=()=>{try{if(seeds.length>=12)throw Error('最多 12 個初始點。');const p=[$('fieldSeedX').value,$('fieldSeedY').value].map(s=>{const c=window.GraphMath.compile(s);if(c.variables.length)throw Error('初始點須為數字或 π 等常數。');return c.evaluate({});});if(!p.every(Number.isFinite))throw Error('請輸入有限座標。');seeds.push(p);seedList();run();}catch(e){message(e.message,true);}};
  let down=null;const canvas=$('graphCanvas');canvas.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});canvas.addEventListener('pointerup',e=>{if(!$('clickFieldSeed').checked||!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5||seeds.length>=12)return;const r=canvas.getBoundingClientRect(),v=G.viewport();seeds.push([v.xmin+(e.clientX-r.left)/r.width*(v.xmax-v.xmin),v.ymax-(e.clientY-r.top)/r.height*(v.ymax-v.ymin)]);seedList();run();});
  window.addEventListener('graph:render',()=>{if(!active)return;const key=JSON.stringify(config());if(key===lastKey)return;clearTimeout(timer);timer=setTimeout(run,180);});
  for(const id of ['fieldP','fieldQ','fieldDensity','fieldDuration'])$(id).addEventListener('input',()=>{if(active){clearTimeout(timer);timer=setTimeout(run,500);}});
  $('fieldCSV').onclick=()=>{if(!result)return;const lines=['seed,direction,t,x,y,status'];result.traces.forEach(t=>t.points.forEach(([x,y,time])=>lines.push([t.seed+1,t.direction,time,x,y,t.reason].join(','))));const a=document.createElement('a'),url=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/csv'}));a.href=url;a.download='mathlab-trajectories.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  try{const saved=JSON.parse(localStorage.getItem('mathlab-dynamics-v1'));if(saved){D.validate({...saved,params:G.snapshot().params,view:G.viewport()});$('fieldP').value=saved.p;$('fieldQ').value=saved.q;$('fieldDensity').value=saved.density;$('fieldDuration').value=saved.duration;seeds=saved.seeds;}}catch{}
  seedList();window.addEventListener('pagehide',stop);
})();
