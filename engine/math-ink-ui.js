(() => {
  'use strict';
  const $=id=>document.getElementById(id);if(!$('inkSource')||!window.MathInk)return;
  const examples={fraction:'(sqrt(x^2+1))/(1+x^2)',matrix:'[[cos(t),-sin(t)],[sin(t),cos(t)]]',sum:'sum(n^2,n,1,N)=N*(N+1)*(2*N+1)/6',integral:'integrate(exp(-x^2),x,0,1)',scripts:'a_i^2+b_i^2=c_i^2'};let result=null;
  function update(){try{result=window.MathInk.render($('inkSource').value);$('inkPreview').innerHTML=result.html;$('inkStatus').textContent=`MathInk · ${result.width} × ${result.height}`;$('inkExport').disabled=false;}catch(e){result=null;$('inkPreview').textContent=$('inkSource').value;$('inkStatus').textContent=e.message;$('inkExport').disabled=true;}}
  $('inkSource').addEventListener('input',update);$('inkExample').onchange=()=>{$('inkSource').value=examples[$('inkExample').value];update();};
  $('inkExport').onclick=()=>{if(!result)return;const a=document.createElement('a'),url=URL.createObjectURL(new Blob([result.svg],{type:'image/svg+xml'}));a.href=url;a.download='mathink-formula.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};update();
})();
