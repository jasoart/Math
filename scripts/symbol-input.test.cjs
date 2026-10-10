'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom'),X=require('../graph/exact.js'),S=require('../graph/state.js');
let checks=0;const close=(a,b)=>{assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);checks++;};
for(const [source,expected]of [['√2',Math.SQRT2],['2√2',2*Math.SQRT2],['π/3',Math.PI/3],['1/2',.5],['(1+√5)/2',(1+Math.sqrt(5))/2],['∛8',2],['sin(30°)',.5],['2π',2*Math.PI]]){const r=X.scalar(source);assert.equal(r.source,source);close(r.value,expected);}
close(X.scalar('π/3 rad',{unit:'deg'}).value,60);close(X.scalar('60°',{unit:'deg'}).value,60);close(X.scalar('60°').value,Math.PI/3);
for(const source of ['√(-1)','1/0','x','a','alert(1)','<script>','π rad + 1','']){assert.throws(()=>X.scalar(source));checks++;}
assert.throws(()=>X.scalar('√2',{integer:true}));close(X.scalar('√4',{integer:true}).value,2);
assert.throws(()=>X.scalar('√2',{max:1.4}));checks++;
assert.ok(X.markup('π/√2').includes('<mfrac>'));assert.ok(X.markup('π/√2').includes('<msqrt>'));assert.ok(X.markup('π/√2').includes('π'));assert.ok(!X.markup('<script>').includes('<script>'));checks+=4;
const state=S.defaults();state.paramText.a='√2';state.tText[1]='4π';state.viewText.x='π/3';state.rangeText.a=['-π','π','π/12'];const restored=S.validate(state);close(restored.params.a,Math.SQRT2);close(restored.t[1],4*Math.PI);close(restored.ranges.a[2],Math.PI/12);assert.equal(restored.paramText.a,'√2');assert.equal(S.validate(JSON.parse(JSON.stringify(restored))).tText[1],'4π');checks+=2;
if(process.env.DEBUG_SYMBOLS)process.stdout.write('scalar tests complete\n');
const root=path.join(__dirname,'..'),errors=[],downloads=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'https://example.com/Math/index.html',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
const w=dom.window,d=w.document,$=id=>d.getElementById(id),wait=ms=>new Promise(r=>setTimeout(r,ms));
const context=new Proxy({measureText:s=>({width:String(s).length*7}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
Object.defineProperty(w.HTMLCanvasElement.prototype,'clientWidth',{get:()=>1100});Object.defineProperty(w.HTMLCanvasElement.prototype,'clientHeight',{get:()=>720});
w.HTMLCanvasElement.prototype.getContext=()=>context;w.HTMLCanvasElement.prototype.getBoundingClientRect=()=>({width:1100,height:720,top:0,bottom:720,left:0,right:1100});w.HTMLCanvasElement.prototype.toDataURL=()=> 'data:image/png;base64,';w.HTMLElement.prototype.scrollIntoView=()=>{};w.CanvasRenderingContext2D=class{};w.ResizeObserver=class{constructor(cb){this.cb=cb;}observe(){this.cb();}};
w.Blob=Blob;w.URL.createObjectURL=blob=>{downloads.push(blob);return 'blob:test';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=()=>{};
const edit=(input,text)=>{input.value=text;input.dispatchEvent(new w.Event('input',{bubbles:true}));input.dispatchEvent(new w.Event('change',{bubbles:true}));};
(async()=>{
 for(const file of ['graph/math.js','graph/exact.js','math-keyboard.js','extension-modules.js','exam-modules.js','expansion-modules.js','app.js','learning.js']){if(process.env.DEBUG_SYMBOLS)process.stdout.write('load '+file+'\n');new (require('node:vm').Script)(fs.readFileSync(path.join(root,file),'utf8'),{filename:file}).runInContext(dom.getInternalVMContext());}
 const lab=w.MathLab;assert.equal(lab.modules.length,148);
 assert.equal(new Set(lab.modules.map(m=>m.id)).size,148);
 assert.equal($('moduleCount').textContent,'148');
 $('expansionOnly').checked=true;$('expansionOnly').dispatchEvent(new w.Event('change'));
 assert.equal(d.querySelectorAll('#moduleList button[data-module-id]').length,50);
 $('moduleSearch').value='SSA';$('moduleSearch').dispatchEvent(new w.Event('input'));await wait(220);
 assert.equal(d.querySelectorAll('#moduleList button[data-module-id]').length,1);
 d.querySelector('#moduleList button[data-module-id]').click();assert.equal(lab.getCurrentModule().id,'sine-law-ssa');
 assert.equal($('moduleTrapWrap').hidden,false);assert.equal($('challengeSolution').hidden,false);assert.equal($('challengeSolution').open,false);
 $('challengeSolution').open=true;$('teacherMode').checked=true;$('teacherMode').dispatchEvent(new w.Event('change'));assert.equal($('challengeSolution').open,false);
 $('teacherMode').checked=false;$('teacherMode').dispatchEvent(new w.Event('change'));
 $('clearFilters').click();assert.equal($('expansionOnly').checked,false);assert.equal(d.querySelectorAll('#moduleList button[data-module-id]').length,148);
 lab.selectModule('mean-value-parallel-tangent');assert.ok($('formulaBox').textContent.includes('a<c<b'));
 lab.selectModule('triangle-included-area',{a:'√2',b:'π',C:'π/2 rad'});const newURL=lab.createShareURL();w.location.hash=new URL(newURL).hash;await wait(60);assert.equal(lab.getState().parameters.a,'√2');assert.equal(lab.getState().parameters.C,'π/2 rad');
 lab.selectModule('circle-line');assert.equal($('moduleTrapWrap').hidden,true);assert.equal($('challengeSolution').hidden,true);
 let fields=0;
 for(const m of lab.modules){if(process.env.DEBUG_SYMBOLS)process.stdout.write(m.id+'\n');const values=Object.fromEntries(m.controls.map(c=>[c.key,c.type==='select'?c.defaultValue:`(${c.defaultValue})/1`]));lab.selectModule(m.id,values);const numeric=m.controls.filter(c=>c.type!=='select');assert.equal(d.querySelectorAll('#controls .symbol-input').length,numeric.length,m.id);for(const c of numeric){assert.equal(c.exact,values[c.key]);close(c.value,c.defaultValue);fields++;}assert.equal($('exactParameters').hidden,false);}
 lab.selectModule('circle-line');const input=$('symbol-r');edit(input,'√2');await wait(40);assert.equal(input.value,'√2');close(lab.getCurrentModule().controls.find(c=>c.key==='r').value,Math.SQRT2);assert.equal(lab.getState().parameters.r,'√2');assert.ok($('exactParameters').innerHTML.includes('<msqrt>'));
 edit($('symbol-theta'),'π/3 rad');close(lab.getCurrentModule().controls.find(c=>c.key==='theta').value,60);assert.equal(lab.getState().parameters.theta,'π/3 rad');
 const url=lab.createShareURL(),snapshot=JSON.stringify(lab.getState());w.location.hash=new URL(url).hash;await wait(60);assert.equal(JSON.stringify(lab.getState()),snapshot);assert.equal($('symbol-r').value,'√2');
 const current=JSON.stringify(lab.getState());edit($('symbol-r'),'1/0');assert.equal($('symbol-r').getAttribute('aria-invalid'),'true');assert.equal(JSON.stringify(lab.getState()),current);edit($('symbol-r'),'√2');
 $('exportLearning').click();const backup=JSON.parse(await downloads.at(-1).text());assert.equal(backup.parameters.r,'√2');assert.equal(backup.parameters.theta,'π/3 rad');
 lab.selectModule('circle-line',{r:2});Object.defineProperty($('learningFile'),'files',{configurable:true,value:[{size:500,text:async()=>JSON.stringify(backup)}]});$('learningFile').dispatchEvent(new w.Event('change'));await wait(60);assert.equal(lab.getState().parameters.r,'√2');
 await wait(400);const saved=JSON.parse(w.localStorage.getItem('mathlab.symbolic.v1'));assert.equal(saved['circle-line'].r,'√2');
 lab.selectModule('riemann-error-bounds');edit($('symbol-n'),'√2');assert.equal($('symbol-n').getAttribute('aria-invalid'),'true');edit($('symbol-n'),'√4');assert.equal(lab.getState().parameters.n,'√4');close(lab.getCurrentModule().controls.find(c=>c.key==='n').value,2);
 const symbol=$('symbol-b');symbol.value='';symbol.focus();symbol.setSelectionRange(0,0);symbol.dispatchEvent(new w.Event('select',{bubbles:true}));d.querySelector('[data-insert="π"]').click();d.querySelector('[data-insert="÷"]').click();d.querySelector('[data-insert="2"]').click();assert.equal(symbol.value,'π÷2');d.querySelector('[data-edit="apply"]').click();assert.equal(lab.getState().parameters.b,'π÷2');
 assert.deepEqual(errors,[]);process.stdout.write(`PASS ${checks} symbolic checks and ${fields} exact fields across all ${lab.modules.length} modules; keyboard, radians/degrees, no slider rounding, sharing, local storage, learning JSON\n`);
})().catch(e=>{process.stderr.write(e.stack+'\n');process.exitCode=1;}).finally(()=>w.close());
