/* Shared, offline mathematical keyboard. Edits the real field at its selection. */
(()=>{
  'use strict';
  const X=window.MathExact;
  let active=null,selection=[0,0],panel=null,tab='basic',system=false;
  const groups={
    basic:[['7','7'],['8','8'],['9','9'],['÷','÷'],['π','π'],['√','√(▯)'],['分數','(▯)/()'],['x²','²'],['4','4'],['5','5'],['6','6'],['×','×'],['e','e'],['∛','∛(▯)'],['(','('],[')',')'],['1','1'],['2','2'],['3','3'],['−','−'],['xⁿ','^(▯)'],['|x|','abs(▯)'],['°','°'],['rad',' rad'],['0','0'],['.','.'],['+','+'],['=','='],['x','x'],['y','y'],['t','t'],['θ','θ']],
    functions:[['sin','sin(▯)'],['cos','cos(▯)'],['tan','tan(▯)'],['ln','ln(▯)'],['log₁₀','log(▯)'],['eˣ','exp(▯)'],['asin','asin(▯)'],['acos','acos(▯)'],['atan','atan(▯)'],['sec','sec(▯)'],['csc','csc(▯)'],['cot','cot(▯)'],['min','min(▯,)'],['max','max(▯,)'],['floor','floor(▯)'],['ceil','ceil(▯)']],
    relations:[['<','<'],['≤','≤'],['>','>'],['≥','≥'],['=','='],['≠','≠'],['且','&&'],['或','||'],['分段 if','if(▯,,)'],['限制 { }','{▯}'],['逗號',','],['座標 ( , )','(▯,)']],
    variables:[['x','x'],['y','y'],['t','t'],['θ','θ'],['a','a'],['b','b'],['c','c'],['d','d'],['h','h'],['k','k'],['π','π'],['e','e']]
  };
  function eligible(el){return el instanceof HTMLInputElement&&(el.matches('.expression-input,[data-math-input],.symbol-input'));}
  function capture(){if(active){selection=[active.selectionStart??active.value.length,active.selectionEnd??active.value.length];}}
  function preview(){if(!active)return;const text=active.value;$('mathKeyboardTarget').textContent=active.getAttribute('aria-label')||active.labels?.[0]?.textContent?.trim()||'數學算式';$('mathKeyboardPreview').innerHTML=X.markup(text);$('mathKeyboardHint').textContent=active.dataset.mathUnit==='deg'?'角度欄以度計。可輸入 60°，或 π/3 rad；原式會保留。':active.dataset.mathScalar==='true'?'常數算式：√2、π/3、1/2。保留符號，不會吸附到滑桿小數刻度。':'輸入算式；根號、分數、函數鍵會將游標放在括號內。';}
  const $=id=>document.getElementById(id);
  function renderKeys(){const host=$('mathKeyboardKeys');host.replaceChildren();for(const [label,template]of groups[tab]){const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.insert=template;b.setAttribute('aria-label','輸入 '+label);b.disabled=active?.dataset.mathScalar==='true'&&['x','y','t','θ','a','b','c','d','h','k'].includes(template);b.onclick=()=>insert(template);host.append(b);}panel.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tab===tab)));}
  function insert(template){
    if(!active?.isConnected)return close();
    const [start,end]=selection,chosen=active.value.slice(start,end),mark=template.indexOf('▯'),text=template.replace('▯',chosen);
    if(active.value.length-(end-start)+text.length>(active.maxLength>0?active.maxLength:480))return;
    active.value=active.value.slice(0,start)+text+active.value.slice(end);
    const caret=mark<0?start+text.length:start+mark+(chosen?chosen.length:0);selection=[caret,caret];
    active.focus({preventScroll:true});selection=[caret,caret];active.setSelectionRange(caret,caret);active.dispatchEvent(new Event('input',{bubbles:true}));preview();
  }
  function edit(action){if(!active?.isConnected)return close();const [start,end]=selection;
    if(action==='left'||action==='right'){const p=Math.max(0,Math.min(active.value.length,(action==='left'?start-1:end+1)));active.focus({preventScroll:true});selection=[p,p];active.setSelectionRange(p,p);return;}
    if(action==='clear'){selection=[0,active.value.length];insert('');return;}
    if(action==='backspace'){if(start===end)selection=[Math.max(0,start-1),end];insert('');return;}
    if(action==='apply'){active.dispatchEvent(new Event('change',{bubbles:true}));close();}
  }
  function ensure(){if(panel)return;panel=document.createElement('section');panel.id='mathKeyboard';panel.hidden=true;panel.setAttribute('aria-label','網頁數學鍵盤');
    panel.innerHTML='<div class="math-keyboard-head"><div><b>數學鍵盤</b><span id="mathKeyboardTarget"></span></div><button type="button" id="mathKeyboardSystem">系統鍵盤</button><button type="button" id="mathKeyboardClose" aria-label="收起數學鍵盤">⌄ 收起</button></div><div id="mathKeyboardPreview" class="math-preview" aria-live="polite"></div><div class="math-keyboard-tabs"><button type="button" data-tab="basic">常用</button><button type="button" data-tab="functions">函數</button><button type="button" data-tab="relations">條件</button><button type="button" data-tab="variables">變數</button></div><div id="mathKeyboardKeys" class="math-keyboard-keys"></div><div class="math-keyboard-edit"><button type="button" data-edit="left" aria-label="游標向左">←</button><button type="button" data-edit="right" aria-label="游標向右">→</button><button type="button" data-edit="backspace" aria-label="刪除前一個字元">⌫</button><button type="button" data-edit="clear">清除欄位</button><button type="button" data-edit="apply" class="primary">完成輸入 ✓</button></div><p id="mathKeyboardHint"></p>';
    document.body.append(panel);panel.addEventListener('pointerdown',e=>{if(e.target.closest('button'))e.preventDefault();});
    panel.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;renderKeys();});panel.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>edit(b.dataset.edit));
    $('mathKeyboardClose').onclick=close;$('mathKeyboardSystem').onclick=()=>{system=!system;if(active){active.inputMode=system?'text':'none';active.blur();active.focus();}$('mathKeyboardSystem').textContent=system?'網頁鍵盤':'系統鍵盤';};
    if(window.ResizeObserver)new ResizeObserver(()=>{if(!panel.hidden)document.documentElement.style.setProperty('--math-keyboard-height',panel.getBoundingClientRect().height+'px');}).observe(panel);
  }
  function open(input){ensure();active=input;capture();panel.hidden=false;document.body.classList.add('math-keyboard-open');input.inputMode=system?'text':'none';renderKeys();preview();requestAnimationFrame(()=>{document.documentElement.style.setProperty('--math-keyboard-height',panel.getBoundingClientRect().height+'px');const r=input.getBoundingClientRect(),top=panel.getBoundingClientRect().top;if(r.bottom>top-16)input.scrollIntoView({block:'center',behavior:'smooth'});});}
  function close(){if(!panel)return;panel.hidden=true;document.body.classList.remove('math-keyboard-open');document.documentElement.style.removeProperty('--math-keyboard-height');}
  function enhance(input){if(input.dataset.mathReady)return;input.dataset.mathReady='true';input.dataset.mathInput='true';input.autocomplete='off';input.spellcheck=false;input.inputMode='none';input.maxLength=input.maxLength>0?input.maxLength:240;}
  function enhanceNumbers(scope=document){scope.querySelectorAll('input[type=number]').forEach(input=>{input.type='text';input.dataset.mathScalar='true';input.classList.add('symbol-input');enhance(input);});scope.querySelectorAll('.expression-input,[data-math-input]').forEach(enhance);}
  document.addEventListener('focusin',e=>{if(eligible(e.target))open(e.target);});
  document.addEventListener('input',e=>{if(e.target===active){capture();preview();}});
  document.addEventListener('select',e=>{if(e.target===active)capture();});document.addEventListener('keyup',e=>{if(e.target===active)capture();});document.addEventListener('pointerup',e=>{if(e.target===active)capture();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close();if(e.key==='Enter'&&eligible(e.target)){e.preventDefault();e.target.dispatchEvent(new Event('change',{bubbles:true}));close();}});
  document.addEventListener('mathlab:modulechange',close);
  window.MathKeyboard={open,close,enhance,enhanceNumbers,numeric:input=>{try{return X.scalar(input.value,{unit:input.dataset.mathUnit||'rad'}).value;}catch{return NaN;}}};
})();
