/* DOM/download host adapter. Tool schema and dispatch are authored in tools.msw. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),api=window.GraphStudio,T=window.MathWebTools,M=window.GraphMath,X=window.MathExact;
 let result=null,resultKey='',inputKey='',curveKey='',context=null;const inputs=new Map(),labels={left:'左端點',right:'右端點',midpoint:'中點',trapezoid:'梯形'};
 const option=(text,value)=>{const o=document.createElement('option');o.textContent=text;o.value=value;return o;};
 const selected=()=>T.tools.find(t=>t.id===$('studyTool').value);
 const fingerprint=()=>JSON.stringify([$('studyTool').value,$('studyCurve').value,[...inputs].map(([k,e])=>[k,e.value])]);
 function message(text,error=false){$('studyMessage').textContent=text;$('studyMessage').dataset.error=String(error);}
 function invalidate(text='設定已變更，請重新探究。'){
   result=null;context=null;for(const id of ['addStudy','replaceStudy','studyCSV','studyHTML','clearStudyOverlay'])$(id).disabled=true;
   $('studyResult').hidden=true;api.setStudyOverlay(null);message(text);
 }
 function curves(select,zero=false){
   const prior=select.value,state=api.snapshot();select.replaceChildren();if(zero)select.append(option('x 軸（g = 0）',''));
   state.rows.forEach((r,i)=>{try{if(r.visible&&M.parse(r.text).kind==='function')select.append(option(`${i+1}. ${r.label||r.text}`,String(i)));}catch{}});
   if([...select.options].some(o=>o.value===prior))select.value=prior;
 }
 function refresh(){const key=api.key();if(key===curveKey)return;curveKey=key;curves($('studyCurve'));for(const field of selected()?.fields||[])if(field.type==='curve')curves(inputs.get(field.key),true);}
 function fields(){
   invalidate('設定參數後，按「開始探究」。');inputs.clear();$('studyFields').replaceChildren();const tool=selected();$('studyDescription').textContent=tool.description;$('studyCurveLabel').hidden=!tool.curve;
   for(const f of tool.fields){const label=document.createElement('label');label.textContent=f.label;let el;
     if(f.type==='select'||f.type==='curve'){el=document.createElement('select');if(f.options)for(const value of f.options)el.append(option(labels[value]||value,value));else curves(el,true);}
     else if(f.type==='text'){el=document.createElement('textarea');el.maxLength=8000;el.spellcheck=false;label.className='wide-field';}
     else{el=document.createElement('input');el.type='text';el.maxLength=80;el.inputMode='text';el.autocomplete='off';el.placeholder='例如 π/2 或 √2';}
     el.id='study-'+f.key;el.value=String(f.value);el.addEventListener('input',()=>invalidate());label.append(el);$('studyFields').append(label);inputs.set(f.key,el);
   }
   curves($('studyCurve'));
 }
 for(const t of T.tools)$('studyTool').append(option(t.name,t.id));$('studyTool').onchange=fields;$('studyCurve').onchange=()=>invalidate();
 function show(report){
   const host=$('studyResult');host.replaceChildren();const title=document.createElement('h3');title.textContent=report.title;host.append(title);
   const signal=document.createElement('p');signal.textContent=report.signal;host.append(signal);
   const steps=document.createElement('ol');for(const s of report.steps){const li=document.createElement('li');li.textContent=s;steps.append(li);}host.append(steps);
   if(report.headers.length){const wrap=document.createElement('div');wrap.className='study-table-wrap';wrap.tabIndex=0;wrap.setAttribute('aria-label','探究結果數值表');const table=document.createElement('table'),head=document.createElement('thead'),row=document.createElement('tr');for(const h of report.headers){const th=document.createElement('th');th.scope='col';th.textContent=h;row.append(th);}head.append(row);table.append(head);const body=document.createElement('tbody');for(const values of report.rows){const tr=document.createElement('tr');for(const v of values){const td=document.createElement('td');td.textContent=v===null?'未定義':typeof v==='number'?window.GraphStudy.fmt(v):String(v);tr.append(td);}body.append(tr);}table.append(body);wrap.append(table);host.append(wrap);}
   const trap=document.createElement('p');trap.className='study-trap';trap.textContent='留意：'+report.trap;const challenge=document.createElement('p');challenge.className='study-challenge';challenge.textContent='下一個問題：'+report.challenge;host.append(trap,challenge);host.hidden=false;
 }
 $('runStudy').onclick=()=>{
   api.stop();invalidate('正在計算…');
   try{const t=selected(),state=api.snapshot(),row=state.rows[Number($('studyCurve').value)];if(t.curve&&(!$('studyCurve').value||!row||!row.visible||M.parse(row.text).kind!=='function'))throw Error('請先加入並選擇一條有效的 y=f(x)。');
     const values=Object.create(null);for(const f of t.fields){const input=inputs.get(f.key);input.removeAttribute('aria-invalid');try{values[f.key]=f.type==='number'?X.scalar(input.value,{min:-1e6,max:1e6}).value:input.value;}catch(e){input.setAttribute('aria-invalid','true');throw Error(f.label+'：'+e.message);}}
     const other=values.other?state.rows[Number(values.other)]?.text:null;result=T.run(t.id,row?.text||'',state.params,values,other);resultKey=api.key();inputKey=fingerprint();context={tool:t.name,source:t.curve?row.text:null,other,parameters:state.params,inputs:values};show(result);
     if(result.rectangles){api.setStudyOverlay(result.rectangles);$('clearStudyOverlay').disabled=false;}
     $('addStudy').disabled=!result.graphRows.length;$('replaceStudy').disabled=!result.graphRows.length;$('studyCSV').disabled=!result.headers.length;$('studyHTML').disabled=false;
     message(result.rectangles?'完成。面積積木已疊在上方畫布，可與報告一起匯出。':result.graphRows.length?`完成，可加入 ${result.graphRows.length} 列可編輯圖形。`:'完成。請比較數值、推導提示與常見陷阱。');
   }catch(e){invalidate();message(e.message,true);}
 };
 function current(){if(!result||resultKey!==api.key()||inputKey!==fingerprint()){invalidate();throw Error('結果已過期，請重新探究。');}return result;}
 for(const [id,replace]of [['addStudy',false],['replaceStudy',true]])$(id).onclick=()=>{try{const r=current();api.applyRows(r.graphRows,{replace,t:r.t});message('已更新畫布，可按「復原」還原。若要匯出報告，請重新探究。');}catch(e){message(e.message,true);}};
 $('clearStudyOverlay').onclick=()=>{api.setStudyOverlay(null);$('clearStudyOverlay').disabled=true;message('面積積木已清除，計算結果仍保留。');};
 const download=(text,type,name)=>{const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 $('studyCSV').onclick=()=>{try{const r=current(),quote=v=>{let s=v===null?'未定義':String(v);if(typeof v!=='number'&&/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};download('\ufeff'+[r.headers,...r.rows].map(row=>row.map(quote).join(',')).join('\r\n'),'text/csv;charset=utf-8','mathlab-investigation.csv');}catch(e){message(e.message,true);}};
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 $('studyHTML').onclick=()=>{try{const r=current(),svg=api.getSVG();const html='<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escape(r.title)+'</title><style>body{font:16px/1.8 system-ui;color:#172b42;max-width:1000px;margin:auto;padding:24px}svg{width:100%;height:auto}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px;text-align:left}.study-table-wrap{overflow:auto}pre{white-space:pre-wrap;overflow-wrap:anywhere}@media print{body{padding:0;font-size:11pt}svg{max-height:70vh}}</style><h1>'+escape(r.title)+'</h1><p>MATH LAB 探究快照 · '+escape(new Date().toISOString())+'</p>'+svg+'<h2>探究條件</h2><pre>'+escape(JSON.stringify(context,null,2))+'</pre>'+$('studyResult').innerHTML+'<p>圖形與數值為近似結果；此檔保存目前快照。</p></html>';download(html,'text/html;charset=utf-8','mathlab-investigation.html');message('已下載圖形與探究條件、數值表，可離線閱讀或列印。');}catch(e){message(e.message,true);}};
 window.addEventListener('graph:change',e=>{if(result&&(e.detail.playing||resultKey!==e.detail.key))invalidate('函數或參數已變更，請重新探究。');refresh();});
 document.getElementById('graphExpressions').addEventListener('input',()=>{if(result)invalidate('算式編輯中，請重新探究。');});
 fields();refresh();
})();
