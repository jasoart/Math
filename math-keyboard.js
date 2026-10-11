/* Shared, offline mathematical keyboard. Edits real fields through native input events. */
(()=>{
  'use strict';
  const X=window.MathExact,M=window.GraphMath,fields=new WeakMap();
  let active=null,selection=[0,0],panel=null,tab='basic',system=false,slotID=0;
  const groups={
    basic:[['7','7'],['8','8'],['9','9'],['÷','÷'],['π','π'],['√','√(▯)'],['分數','(▯)/(▯)'],['x²','²'],['4','4'],['5','5'],['6','6'],['×','×'],['e','e'],['∛','∛(▯)'],['(','('],[')',')'],['1','1'],['2','2'],['3','3'],['−','−'],['xⁿ','^(▯)'],['|x|','abs(▯)'],['°','°'],['rad',' rad'],['0','0'],['.','.'],['+','+'],['=','='],['x','x'],['y','y'],['t','t'],['θ','θ']],
    functions:[['sin','sin(▯)'],['cos','cos(▯)'],['tan','tan(▯)'],['ln','ln(▯)'],['log₁₀','log(▯)'],['eˣ','exp(▯)'],['asin','asin(▯)'],['acos','acos(▯)'],['atan','atan(▯)'],['sec','sec(▯)'],['csc','csc(▯)'],['cot','cot(▯)'],['min','min(▯,▯)'],['max','max(▯,▯)'],['floor','floor(▯)'],['ceil','ceil(▯)'],['round','round(▯)'],['sign','sign(▯)'],['sinh','sinh(▯)'],['cosh','cosh(▯)'],['tanh','tanh(▯)'],['√','sqrt(▯)'],['∛','cbrt(▯)'],['|x|','abs(▯)']],
    relations:[['<','<'],['≤','≤'],['>','>'],['≥','≥'],['=','='],['≠','≠'],['且','&&'],['或','||'],['分段 if','if(▯,▯,▯)'],['限制 { }','{▯}'],['逗號',','],['座標 ( , )','(▯,▯)'],['y =','y=▯'],['r =','r=▯'],['單位圓','(cos(t),sin(t))'],['函數限制','▯ {▯}']],
    variables:[['x','x'],['y','y'],['t','t'],['θ','θ'],['a','a'],['b','b'],['c','c'],['d','d'],['h','h'],['k','k'],['π','π'],['e','e']]
  };
  const $=id=>document.getElementById(id),scalar=input=>input.dataset.mathScalar==='true';
  function eligible(el){return (el instanceof HTMLInputElement||el instanceof HTMLTextAreaElement)&&!el.disabled&&!el.readOnly&&el.matches('.expression-input,[data-math-input],.symbol-input');}
  function state(input){if(!fields.has(input)){const s={value:input.value,slots:[],selected:null,history:[],index:0,internal:false};fields.set(input,s);s.history.push(snapshot(input,s));}return fields.get(input);}
  function snapshot(input,s){return {value:input.value,start:input.selectionStart??input.value.length,end:input.selectionEnd??input.value.length,slots:s.slots.map(slot=>({...slot})),selected:s.selected};}
  function capture(){if(!active)return;selection=[active.selectionStart??active.value.length,active.selectionEnd??active.value.length];const s=state(active);if(s.value!==active.value){s.slots=[];s.selected=null;remember(active,s);}if(s.history[s.index]?.value===active.value){s.history[s.index].start=selection[0];s.history[s.index].end=selection[1];}}
  function remember(input,s){s.value=input.value;s.history.splice(s.index+1);s.history.push(snapshot(input,s));if(s.history.length>80)s.history.shift();s.index=s.history.length-1;}
  function currentSlot(s,start=selection[0],end=selection[1]){return s.slots.find(slot=>slot.id===s.selected&&start>=slot.start&&end<=slot.end)||s.slots.find(slot=>start>=slot.start&&end<=slot.end);}
  // Keep template positions aligned with both keyboard insertions and physical typing.
  function adjustSlots(s,start,end,length,replaceSlot=false){
    const delta=length-(end-start),selected=currentSlot(s,start,end);
    s.slots=s.slots.flatMap(slot=>{
      if(slot===selected)return replaceSlot?[]:[{...slot,end:slot.end+delta}];
      if(slot.end<=start)return [slot];
      if(slot.start>=end)return [{...slot,start:slot.start+delta,end:slot.end+delta}];
      return [];
    });
    if(!s.slots.some(slot=>slot.id===s.selected))s.selected=null;
  }
  function changed(input,s){
    const before=s.value,after=input.value;let start=0,end=before.length,last=after.length;
    while(start<end&&start<last&&before[start]===after[start])start++;
    while(end>start&&last>start&&before[end-1]===after[last-1]){end--;last--;}
    if(before!==after){adjustSlots(s,start,end,last-start);remember(input,s);}
  }
  function incomplete(source,error){
    if(/不認得|無法解析/.test(error)&&!/[{}]/.test(source))return false;
    const stack=[];
    for(const ch of source){if(ch==='('||ch==='{')stack.push(ch);if(ch===')'||ch==='}'){if(stack.pop()!==(ch===')'?'(':'{'))return false;}}
    return stack.length>0||/[+−\-×*÷/^=<>≤≥!&|,]\s*$/.test(source)||/[(,]\s*[,)]/.test(source)||/\{\s*\}/.test(source);
  }
  function diagnostic(){
    const source=active.value.trim(),node=$('mathKeyboardDiagnostic');let status='empty',message='開始輸入；原式與符號會保留。';
    if(source){try{
      if(scalar(active)){
        const options={unit:active.dataset.mathUnit||'rad'};
        for(const name of ['min','max']){const raw=active.dataset['math'+name[0].toUpperCase()+name.slice(1)]??active.getAttribute(name);if(raw!==null&&raw!==undefined&&raw!==''&&Number.isFinite(Number(raw)))options[name]=Number(raw);}
        options.integer=active.dataset.mathInteger==='true';
        const result=X.scalar(source,options);status='valid';message='有效常數 · 數值約 '+Number(result.value.toPrecision(12));
      }else{M.parse(source);status='valid';message='算式語法正確；可繼續編輯或按完成輸入。';}
    }catch(e){status=incomplete(source,e.message)?'incomplete':'error';message=status==='incomplete'?'算式尚未完成；補上空格內容、運算元或右括號。':e.message;}}
    node.dataset.status=status;node.textContent=message;
  }
  function preview(){
    if(!active||!panel)return;
    $('mathKeyboardTarget').textContent=active.getAttribute('aria-label')||active.labels?.[0]?.textContent?.trim()||'數學算式';
    $('mathKeyboardPreview').innerHTML=X.markup(active.value);
    const s=state(active),slot=currentSlot(s),index=s.slots.indexOf(slot);
    $('mathKeyboardSlots').textContent=s.slots.length?`範本空格 ${index<0?'—':index+1}／${s.slots.length} · Tab 下一格，Shift+Tab 上一格`:'選取文字後按範本，可將選取內容放入第一格。';
    $('mathKeyboardHint').textContent=active.dataset.mathUnit==='deg'?'角度欄以度計。60°、π/3 rad 皆可；原式會保留。':scalar(active)?'常數算式：√2、π/3、1/2。Ctrl/⌘+Z 復原；Ctrl/⌘+Shift+Z 重做。':'Tab 移動範本空格；Enter 完成、Esc 收起。Ctrl/⌘+Z 復原。';
    for(const direction of [-1,1]){const b=panel.querySelector(`[data-edit="${direction<0?'previous':'next'}"]`);b.disabled=!s.slots.length||(direction<0?index===0:index===s.slots.length-1);}
    panel.querySelector('[data-edit="undo"]').disabled=s.index===0;panel.querySelector('[data-edit="redo"]').disabled=s.index>=s.history.length-1;
    diagnostic();
  }
  function renderKeys(){
    const host=$('mathKeyboardKeys');host.replaceChildren();
    for(const [label,template]of groups[tab]){
      const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.insert=template;b.setAttribute('aria-label','輸入 '+label);
      b.disabled=scalar(active)&&(['x','y','t','θ','a','b','c','d','h','k'].includes(template)||['{▯}','(▯,▯)','y=▯','r=▯','(cos(t),sin(t))','▯ {▯}'].includes(template));
      b.onclick=()=>insert(template);host.append(b);
    }
    panel.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tab===tab)));
  }
  function focusSelection(start,end=start){active.focus({preventScroll:true});active.setSelectionRange(start,end);selection=[start,end];capture();}
  function emit(input,s,inputType){s.internal=true;try{input.dispatchEvent(new InputEvent('input',{bubbles:true,inputType,data:null}));}finally{s.internal=false;}}
  function insert(template){
    if(!active?.isConnected)return close();
    capture();const s=state(active),[start,end]=selection,chosen=active.value.slice(start,end),slots=[];let text='',ordinal=0;
    for(const ch of template){if(ch!=='▯'){text+=ch;continue;}const content=ordinal++===0?chosen:'';slots.push({id:++slotID,start:start+text.length,end:start+text.length+content.length});text+=content;}
    if(active.value.length-(end-start)+text.length>(active.maxLength>0?active.maxLength:480)){ $('mathKeyboardDiagnostic').dataset.status='error';$('mathKeyboardDiagnostic').textContent='已達欄位字數上限。';return;}
    adjustSlots(s,start,end,text.length,slots.length>0);s.slots.push(...slots);s.slots.sort((a,b)=>a.start-b.start||a.id-b.id);
    active.value=active.value.slice(0,start)+text+active.value.slice(end);
    s.value=active.value;
    if(slots.length)s.selected=slots[0].id;
    focusSelection(slots.length?slots[0].start:start+text.length,slots.length?slots[0].end:start+text.length);
    remember(active,s);emit(active,s,template?'insertText':'deleteContentBackward');preview();
  }
  function navigate(direction){
    if(!active?.isConnected)return false;capture();const s=state(active),slot=currentSlot(s),index=s.slots.indexOf(slot);
    const next=index>=0?index+direction:direction>0?s.slots.findIndex(v=>v.start>=selection[0]):s.slots.findLastIndex(v=>v.end<=selection[0]);
    if(next<0||next>=s.slots.length)return false;
    const target=s.slots[next];s.selected=target.id;focusSelection(target.start,target.end);preview();return true;
  }
  function restore(direction){
    if(!active?.isConnected)return;capture();const s=state(active),index=s.index+direction;if(index<0||index>=s.history.length)return;
    const saved=s.history[index];s.index=index;s.value=saved.value;s.slots=saved.slots.map(slot=>({...slot}));s.selected=saved.selected;active.value=saved.value;focusSelection(saved.start,saved.end);emit(active,s,direction<0?'historyUndo':'historyRedo');preview();
  }
  function edit(action){
    if(!active?.isConnected)return close();capture();const [start,end]=selection;
    if(action==='undo'||action==='redo'){restore(action==='undo'?-1:1);return;}
    if(action==='previous'||action==='next'){navigate(action==='previous'?-1:1);return;}
    if(action==='left'||action==='right'){const p=Math.max(0,Math.min(active.value.length,action==='left'?start===end?start-1:start:start===end?end+1:end));focusSelection(p);preview();return;}
    if(action==='clear'){active.setSelectionRange(0,active.value.length);insert('');return;}
    if(action==='backspace'){if(start===end){const previous=Array.from(active.value.slice(0,start)).at(-1)||'';active.setSelectionRange(start-previous.length,end);}insert('');return;}
    if(action==='apply'){active.dispatchEvent(new Event('change',{bubbles:true}));close();}
  }
  function viewport(){
    if(!panel||panel.hidden)return;const v=window.visualViewport,height=v?.height||window.innerHeight;
    panel.style.setProperty('--math-keyboard-viewport-height',height+'px');panel.style.bottom=Math.max(0,window.innerHeight-height-(v?.offsetTop||0))+'px';
    document.documentElement.style.setProperty('--math-keyboard-height',panel.getBoundingClientRect().height+'px');
  }
  function ensure(){
    if(panel)return;panel=document.createElement('section');panel.id='mathKeyboard';panel.hidden=true;panel.setAttribute('aria-label','網頁數學鍵盤');
    panel.innerHTML='<div class="math-keyboard-head"><div><b>數學鍵盤</b><span id="mathKeyboardTarget"></span></div><button type="button" id="mathKeyboardSystem">系統鍵盤</button><button type="button" id="mathKeyboardClose" aria-label="收起數學鍵盤">⌄ 收起</button></div><div id="mathKeyboardPreview" class="math-preview"></div><p id="mathKeyboardDiagnostic" role="status" aria-live="polite"></p><div class="math-keyboard-tabs" role="group" aria-label="數學按鍵分類"><button type="button" data-tab="basic">常用</button><button type="button" data-tab="functions">函數</button><button type="button" data-tab="relations">條件</button><button type="button" data-tab="variables">變數</button></div><div id="mathKeyboardKeys" class="math-keyboard-keys"></div><div class="math-keyboard-edit"><button type="button" data-edit="undo" aria-label="復原輸入" title="Ctrl/⌘+Z">↶ 復原</button><button type="button" data-edit="redo" aria-label="重做輸入" title="Ctrl/⌘+Shift+Z">↷ 重做</button><button type="button" data-edit="previous" aria-label="上一個範本空格">上一格</button><button type="button" data-edit="next" aria-label="下一個範本空格">下一格</button><button type="button" data-edit="left" aria-label="游標向左">←</button><button type="button" data-edit="right" aria-label="游標向右">→</button><button type="button" data-edit="backspace" aria-label="刪除前一個字元">⌫</button><button type="button" data-edit="clear">清除欄位</button><button type="button" data-edit="apply" class="primary">完成輸入 ✓</button></div><p id="mathKeyboardSlots"></p><p id="mathKeyboardHint"></p>';
    document.body.append(panel);panel.addEventListener('pointerdown',e=>{if(e.target.closest('button'))e.preventDefault();});
    panel.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;renderKeys();viewport();});panel.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>edit(b.dataset.edit));
    $('mathKeyboardClose').onclick=close;$('mathKeyboardSystem').onclick=()=>{system=!system;if(active){active.inputMode=system?'text':'none';active.blur();active.focus();}$('mathKeyboardSystem').textContent=system?'網頁鍵盤':'系統鍵盤';};
    if(window.ResizeObserver)new ResizeObserver(viewport).observe(panel);
    window.addEventListener('resize',viewport);window.visualViewport?.addEventListener('resize',viewport);window.visualViewport?.addEventListener('scroll',viewport);
  }
  function open(input){
    if(!eligible(input))return;ensure();active=input;const s=state(input);if(s.value!==input.value){s.slots=[];s.selected=null;remember(input,s);}capture();panel.hidden=false;document.body.classList.add('math-keyboard-open');input.inputMode=system?'text':'none';renderKeys();preview();
    requestAnimationFrame(()=>{if(panel.hidden||active!==input)return;viewport();const r=input.getBoundingClientRect(),top=panel.getBoundingClientRect().top;if(r.bottom>top-16)input.scrollIntoView({block:'center',behavior:'smooth'});});
  }
  function close(){if(!panel)return;panel.hidden=true;document.body.classList.remove('math-keyboard-open');document.documentElement.style.removeProperty('--math-keyboard-height');}
  // Rows often enhance their empty numeric fields before assigning exact defaults.
  // Establish undo history on first focus, after that initialization has finished.
  function enhance(input){if(input.dataset.mathReady)return;input.dataset.mathReady='true';input.dataset.mathInput='true';input.autocomplete='off';input.spellcheck=false;input.inputMode='none';input.maxLength=input.maxLength>0?input.maxLength:input.matches('.expression-input')?480:240;}
  function enhanceNumbers(scope=document){scope.querySelectorAll('input[type=number]').forEach(input=>{input.type='text';input.dataset.mathScalar='true';input.classList.add('symbol-input');enhance(input);});scope.querySelectorAll('.expression-input,[data-math-input]').forEach(enhance);}
  document.addEventListener('focusin',e=>{if(eligible(e.target))open(e.target);});
  document.addEventListener('beforeinput',e=>{if(eligible(e.target)&&e.target===active)capture();});
  document.addEventListener('input',e=>{if(!eligible(e.target))return;const s=state(e.target);if(!s.internal)changed(e.target,s);if(e.target===active){capture();preview();}});
  for(const type of ['select','keyup','pointerup'])document.addEventListener(type,e=>{if(e.target===active){capture();preview();}});
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&panel&&!panel.hidden&&(eligible(e.target)||panel.contains(e.target))){e.preventDefault();close();return;}
    if(!eligible(e.target))return;
    if(e.key==='Enter'&&!e.isComposing){e.preventDefault();e.target.dispatchEvent(new Event('change',{bubbles:true}));close();return;}
    if((e.ctrlKey||e.metaKey)&&!e.altKey&&/^[zy]$/i.test(e.key)){active=e.target;const s=state(active),direction=e.key.toLowerCase()==='y'||e.shiftKey?1:-1;if(s.history.length>1){e.preventDefault();restore(direction);}return;}
    if(e.key==='Tab'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&panel&&!panel.hidden&&e.target===active&&navigate(e.shiftKey?-1:1))e.preventDefault();
  });
  document.addEventListener('mathlab:modulechange',close);
  window.MathKeyboard={open,close,enhance,enhanceNumbers,numeric:input=>{try{return X.scalar(input.value,{unit:input.dataset.mathUnit||'rad'}).value;}catch{return NaN;}}};
})();
