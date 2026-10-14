/* Browser editor/Worker adapter; compilation is implemented by compiler.msw. */
(()=>{'use strict';const $=id=>document.getElementById(id);if(!$('webSource'))return;
 const examples={parabola:'# 定義可重用的函式，並匯出計算結果\n(module MyExperiment\n  (fn f (x)\n    (return (- (* x x) 2)))\n  (let samples (array))\n  (each x (array -2 -1 0 1 2)\n    (push samples (array x (f x))))\n  (export (record ("samples" samples))))\n',factorial:'(module Factorial\n  (fn factorial (n)\n    (if (or (not (integer n)) (< n 0))\n      (fail "n 必須是非負整數。"))\n    (let total 1)\n    (let k 1)\n    (while (<= k n)\n      (set total (* total k))\n      (set k (+ k 1)))\n    (return total))\n  (export (record ("factorial" factorial)\n                  ("ten" (factorial 10)))))\n'};
 let worker=null,timer=0,ticket=0,output='',selfExpected=null;
 const status=(s,bad=false)=>{$('webCompilerStatus').textContent=s;$('webCompilerStatus').dataset.error=String(bad);};
 function stop(){ticket++;clearTimeout(timer);worker?.terminate();worker=null;$('compileWeb').disabled=false;$('stopWeb').disabled=true;}
 function stale(){stop();output='';selfExpected=null;$('downloadWebJS').disabled=true;$('webOutput').textContent='修改原始碼後，按「編譯」。';status('原始碼已變更。');try{localStorage.setItem('mathweb-source-v1',$('webSource').value);}catch{}}
 function run(){stop();output='';$('downloadWebJS').disabled=true;const source=$('webSource').value,id=ticket;$('compileWeb').disabled=true;$('stopWeb').disabled=false;status('正在由自研編譯器分析…');
   try{worker=new Worker('./compiler/worker.js');worker.onmessage=e=>{if(e.data.id!==ticket)return;const data=e.data;stop();if(data.error){$('webOutput').textContent='';status(data.error,true);return;}output=data.code;$('webOutput').textContent=output;$('downloadWebJS').disabled=false;status(selfExpected!==null?(output===selfExpected?'自編譯通過：產物與目前編譯器逐位元相同。':'自編譯產物與目前版本不同，請重新整理後再檢查。'):`編譯完成 · ${source.length} 字原始碼 → ${output.length} 字產物。`,selfExpected!==null&&output!==selfExpected);};
     worker.onerror=()=>{stop();status('背景編譯器無法啟動，請重新整理或使用文件中的離線建置指令。',true);};
     timer=setTimeout(()=>{stop();status('編譯超過 5 秒，已停止。請縮小原始碼。',true);},5000);worker.postMessage({id,source});
   }catch{stop();status('此瀏覽器不支援背景編譯，請使用離線建置。',true);}
 }
 const download=(text,name,type)=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([text],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 $('webSource').addEventListener('input',stale);$('webSource').addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();run();}});
 $('compileWeb').onclick=run;$('stopWeb').onclick=()=>{stop();status('已停止編譯。');};
 $('webExample').onchange=async()=>{
   const choice=$('webExample').value,source=examples[choice];
   if(source){$('webSource').value=source;stale();return;}
   if(!['series','probability','integration'].includes(choice))return;
   stale();const expectedTicket=ticket;status('載入數學範例…');
   try{const response=await fetch('./compiler/examples/'+choice+'.msw');if(!response.ok)throw Error('範例讀取失敗。');
     const text=await response.text();if(ticket!==expectedTicket)return;
     $('webSource').value=text;stale();status('數學範例已載入，按「編譯」查看產物。');
   }catch(error){if(ticket===expectedTicket)status(error.message,true);}
 };
 $('downloadWebSource').onclick=()=>download($('webSource').value,'experiment.msw','text/plain;charset=utf-8');
 $('downloadWebJS').onclick=()=>{if(output)download(output,'experiment.js','text/javascript;charset=utf-8');};
 $('importWebSource').onclick=()=>$('webSourceFile').click();$('webSourceFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>360000)throw Error('原始碼檔不可超過 360 KB。');const source=await file.text();if(source.length>120000)throw Error('原始碼最多 120000 字。');$('webSource').value=source;stale();status('原始碼已匯入，尚未編譯。');}catch(e){status(e.message,true);}finally{$('webSourceFile').value='';}};
 $('selfCompileWeb').onclick=async()=>{stop();const expectedTicket=ticket;status('載入編譯器原始碼…');try{const responses=await Promise.all([fetch('./compiler/compiler.msw'),fetch('./compiler/compiler.js')]);if(responses.some(r=>!r.ok))throw Error('原始碼讀取失敗。');const [source,expected]=await Promise.all(responses.map(r=>r.text()));if(ticket!==expectedTicket)return;$('webSource').value=source;selfExpected=expected;run();}catch(e){if(ticket===expectedTicket)status(e.message,true);}};
 try{const saved=localStorage.getItem('mathweb-source-v1');$('webSource').value=saved&&saved.length<=120000?saved:examples.parabola;}catch{$('webSource').value=examples.parabola;}
 window.addEventListener('pagehide',stop);
})();
