'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM,VirtualConsole}=require('jsdom');
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM('<!doctype html><html><body><button id="outside">其他操作</button></body></html>',{url:'https://example.com',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
const w=dom.window,d=w.document;
w.HTMLElement.prototype.scrollIntoView=()=>{};
w.ResizeObserver=class{constructor(cb){this.cb=cb;}observe(){this.cb();}};
for(const file of ['graph/math.js','graph/exact.js','math-keyboard.js'])new vm.Script(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{filename:file}).runInContext(dom.getInternalVMContext());
let checks=0;
const equal=(a,b)=>{assert.equal(a,b);checks++;};
function field(value='',attributes={}){const el=d.createElement('input');el.type='text';el.value=value;el.className='expression-input';for(const [name,value]of Object.entries(attributes))el.setAttribute(name,value);d.body.prepend(el);w.MathKeyboard.enhance(el);el.focus();return el;}
function click(template){const b=Array.from(d.querySelectorAll('[data-insert]')).find(b=>b.dataset.insert===template);assert.ok(b,template);assert.ok(!b.disabled,template);b.click();}
function edit(action){d.querySelector(`[data-edit="${action}"]`).click();}
function tab(name){d.querySelector(`[data-tab="${name}"]`).click();}
function key(el,key,opts={}){const e=new w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,...opts});el.dispatchEvent(e);return e.defaultPrevented;}
function type(el,text){el.dispatchEvent(new w.InputEvent('beforeinput',{bubbles:true,inputType:'insertText',data:text}));el.setRangeText(text,el.selectionStart,el.selectionEnd,'end');el.dispatchEvent(new w.InputEvent('input',{bubbles:true,inputType:'insertText',data:text}));}
function select(el,start,end=start){el.setSelectionRange(start,end);el.dispatchEvent(new w.Event('select',{bubbles:true}));}
const status=()=>d.getElementById('mathKeyboardDiagnostic').dataset.status;
try{
  const nested=field();let inputs=0,changes=0;nested.addEventListener('input',()=>inputs++);nested.addEventListener('change',()=>changes++);
  click('(▯)/(▯)');equal(nested.value,'()/()');equal(nested.selectionStart,1);equal(status(),'incomplete');
  click('√(▯)');click('2');equal(nested.value,'(√(2))/()');equal(nested.selectionStart,4);
  edit('next');equal(nested.selectionStart,8);click('3');equal(nested.value,'(√(2))/(3)');equal(status(),'valid');equal(inputs,4);
  edit('undo');equal(nested.value,'(√(2))/()');equal(nested.selectionStart,8);edit('redo');equal(nested.value,'(√(2))/(3)');
  equal(key(nested,'Tab',{shiftKey:true}),true);equal(nested.selectionStart,3);equal(nested.selectionEnd,4);
  equal(key(nested,'Tab'),true);equal(nested.selectionStart,8);equal(nested.selectionEnd,9);equal(key(nested,'Tab'),false);
  edit('apply');equal(changes,1);equal(d.getElementById('mathKeyboard').hidden,true);

  const wrapped=field('x+1');select(wrapped,0,3);click('(▯)/(▯)');equal(wrapped.value,'(x+1)/()');equal(wrapped.selectionStart,1);equal(wrapped.selectionEnd,4);
  equal(key(wrapped,'Tab'),true);type(wrapped,'2');equal(wrapped.value,'(x+1)/(2)');equal(status(),'valid');
  equal(key(wrapped,'z',{ctrlKey:true}),true);equal(wrapped.value,'(x+1)/()');equal(wrapped.selectionStart,7);
  equal(key(wrapped,'z',{metaKey:true,shiftKey:true}),true);equal(wrapped.value,'(x+1)/(2)');
  edit('previous');equal(wrapped.value.slice(wrapped.selectionStart,wrapped.selectionEnd),'x+1');
  type(wrapped,'x+2');equal(wrapped.value,'(x+2)/(2)');edit('next');equal(wrapped.value.slice(wrapped.selectionStart,wrapped.selectionEnd),'2');
  select(wrapped,0);type(wrapped,'1+');edit('next');equal(wrapped.value.slice(wrapped.selectionStart,wrapped.selectionEnd),'x+2');
  edit('clear');equal(wrapped.value,'');edit('undo');equal(wrapped.value,'1+(x+2)/(2)');

  const branches=field();tab('relations');click('if(▯,▯,▯)');type(branches,'x<0');equal(key(branches,'Tab'),true);type(branches,'−x');equal(key(branches,'Tab'),true);type(branches,'x');
  equal(branches.value,'if(x<0,−x,x)');equal(status(),'valid');equal(w.GraphMath.parse(branches.value).at(-2),2);
  equal(key(branches,'Tab',{shiftKey:true}),true);equal(branches.value.slice(branches.selectionStart,branches.selectionEnd),'−x');
  const coordinates=field();click('(▯,▯)');type(coordinates,'cos(t)');edit('next');type(coordinates,'sin(t)');equal(coordinates.value,'(cos(t),sin(t))');equal(w.GraphMath.parse(coordinates.value).kind,'parametric');

  const constant=field('',{'data-math-scalar':'true','data-math-unit':'deg'});tab('basic');equal(d.querySelector('[data-insert="x"]').disabled,true);click('π');click('÷');click('3');click(' rad');equal(constant.value,'π÷3 rad');assert.ok(Math.abs(w.MathKeyboard.numeric(constant)-60)<1e-10);checks++;equal(status(),'valid');
  tab('variables');for(const variable of ['x','y','t','θ','a','b','c','d','h','k'])equal(d.querySelector(`[data-insert="${variable}"]`).disabled,true);
  tab('relations');equal(d.querySelector('[data-insert="(▯,▯)"]').disabled,true);equal(d.querySelector('[data-insert="y=▯"]').disabled,true);
  tab('functions');for(const expression of ['round(▯)','sign(▯)','sinh(▯)','cosh(▯)','tanh(▯)'])assert.ok(d.querySelector(`[data-insert="${expression}"]`));checks+=5;
  const minimum=field('',{'data-math-scalar':'true'});click('min(▯,▯)');type(minimum,'√2');edit('next');type(minimum,'π');equal(minimum.value,'min(√2,π)');equal(status(),'valid');assert.ok(Math.abs(w.MathKeyboard.numeric(minimum)-Math.SQRT2)<1e-10);checks++;

  const limits=field('',{'data-math-scalar':'true','data-math-integer':'true',min:'1',max:'5'});type(limits,'√2');equal(status(),'error');select(limits,0,limits.value.length);type(limits,'√4');equal(status(),'valid');select(limits,0,limits.value.length);type(limits,'6');equal(status(),'error');
  for(const [value,expected]of [['sin(','incomplete'],['sin()','incomplete'],['if(x<0,x,)','incomplete'],['y=x {','incomplete'],['x^','incomplete'],['1/0','valid'],['foobar(','error'],['x)','error']]){const expression=field(value);equal(status(),expected);expression.blur();}
  const invalid=field('1/0',{'data-math-scalar':'true'});equal(status(),'error');equal(Number.isNaN(w.MathKeyboard.numeric(invalid)),true);
  const isolated=field('7');type(isolated,'8');equal(isolated.value,'78');edit('undo');equal(isolated.value,'7');constant.focus();edit('undo');equal(constant.value,'π÷3');isolated.focus();edit('redo');equal(isolated.value,'78');
  const outside=d.getElementById('outside');equal(key(outside,'z',{ctrlKey:true}),false);equal(key(outside,'Enter'),false);
  const ordinary=field('');ordinary.className='curve-label-input';ordinary.removeAttribute('data-math-input');w.MathKeyboard.close();ordinary.blur();ordinary.focus();equal(d.getElementById('mathKeyboard').hidden,true);equal(key(ordinary,'Enter'),false);
  const limited=field('123',{'maxlength':'3'});tab('basic');select(limited,3);click('4');equal(limited.value,'123');equal(status(),'error');
  // Graph parameter rows convert number inputs before syncing exact defaults.
  // Their initial value must be an undo baseline, never a spurious user edit.
  for(const initial of ['1','√2']){
    const row=d.createElement('div'),parameter=d.createElement('input');parameter.type='number';row.append(parameter);d.body.prepend(row);
    w.MathKeyboard.enhanceNumbers(row);parameter.value=initial;parameter.focus();
    equal(parameter.type,'text');equal(parameter.value,initial);equal(d.querySelector('[data-edit="undo"]').disabled,true);
    edit('undo');equal(parameter.value,initial);select(parameter,parameter.value.length);type(parameter,'+1');
    equal(d.querySelector('[data-edit="undo"]').disabled,false);edit('undo');equal(parameter.value,initial);equal(d.querySelector('[data-edit="undo"]').disabled,true);
  }
  assert.deepEqual(errors,[]);console.log(`PASS ${checks} keyboard checks: nested/selection-aware templates, slot navigation, typed history, undo/redo caret, scalar constraints, native events, shortcut scope`);
}finally{w.close();}
