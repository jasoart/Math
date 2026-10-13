'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM,VirtualConsole}=require('jsdom');
global.GraphMath=require('../graph/math.js');global.katex=require('katex');
const T=require('../engine/typeset.js');
let checks=0;
const equal=(actual,expected,label)=>{assert.equal(actual,expected,label);checks++;};
// Golden notation distinguishes grouping that changes mathematical meaning.
for(const [source,expected]of [
  ['a/(b+c)','\\frac{a}{b + c}'],['a/b+c','\\frac{a}{b} + c'],
  ['(x+1)^2','{\\left(x + 1\\right)}^{2}'],['-x^2','-{x}^{2}'],
  ['(-x)^2','{\\left(-x\\right)}^{2}'],['x^2^3','{x}^{{2}^{3}}'],
  ['(x+1)°','{\\left(x + 1\\right)}^{\\circ}'],
  ['x<(y<1)','x < \\left(y < 1\\right)'],['(x<y)<1','\\left(x < y\\right) < 1'],
  ['sqrt(x+1)','\\sqrt{x + 1}'],['z=x^2-y^2','z = {x}^{2} - {y}^{2}'],
  ['y=x^2 {x>=0}','y = {x}^{2}\\quad \\left\\{x \\geq 0\\right\\}']
])equal(T.expressionTeX(source),expected,source);
for(const [source,expected]of [
  ['x^2_1','{x}^{2}_{1}'],['x_1^2','{x}^{2}_{1}'],['x²₁','{x}^{2}_{1}'],
  ['x^(a_1)','{x}^{{a}_{1}}'],['x^(a+b)','{x}^{a + b}'],
  ['A=[1,2;3,4]','A = \\begin{bmatrix}1 & 2 \\\\ 3 & 4\\end{bmatrix}'],
  ['a-(b-c)','a - \\left(b - c\\right)'],['1e999',null]
])equal(T.symbolicTeX(source),expected,source);
equal(T.symbolicTeX('[1,2;3]'),null,'Nonrectangular matrix must remain plain');
equal(T.expressionTeX('('.repeat(80)+'x'+')'.repeat(80)),null,'Bounded expression depth');
equal(T.symbolicTeX('('.repeat(80)+'x'+')'.repeat(80)),null,'Bounded symbolic depth');
equal(T.expressionTeX('x'.repeat(481)),null,'Bounded expression source');
equal(T.symbolicTeX('x'.repeat(481)),null,'Bounded symbolic source');

const fragment=html=>JSDOM.fragment(html);
for(const source of ['<img src=x onerror=alert(1)>','<script>alert(1)</script>',
  '\\href{javascript:alert(1)}{x}','\\includegraphics{https://invalid.example/x}',
  '\\htmlClass{unsafe}{x}','\" onmouseover=\"alert(1)','</code><svg onload=alert(1)>',
  'x & y','1e999','x'.repeat(481),'🙂 中文公式']) {
  for(const html of [T.expressionHTML(source),T.linesHTML([source])]) {
    const dom=fragment(html),wrapper=dom.firstElementChild;
    equal(wrapper.dataset.mathSource,source,'Original source survives escaping');
    equal(dom.querySelectorAll('script,img,svg,iframe,a,style,link').length,0,'Input cannot create executable markup');
    equal(dom.querySelectorAll('[onerror],[onload],[onclick],[onmouseover]').length,0,'Input cannot create event handlers');
  }
}
const rational=fragment(T.expressionHTML('sqrt(2)/(1+x)'));
assert.ok(rational.querySelector('math mfrac msqrt'),'Fractions and roots expose real MathML');checks++;
const prose=fragment(T.linesHTML(['距離 d=1/sqrt(6)；法向量 n=(2,-1,1)']));
assert.ok(prose.querySelector('.math-prose')?.textContent.includes('距離'));checks++;
assert.ok(prose.querySelector('math mfrac'));checks++;
assert.ok(prose.querySelector('math msqrt'));checks++;
const originalKatex=global.katex,options=[];
global.katex={renderToString:(tex,settings)=>{options.push(settings);return originalKatex.renderToString(tex,settings);}};
T.clearCache();T.expressionHTML('x+1');T.linesHTML(['A=[1,2;3,4]']);
assert.ok(options.length>=2);checks++;
for(const settings of options){equal(settings.trust,false);equal(settings.strict,'error');equal(settings.maxExpand,128);equal(settings.maxSize,20);equal(settings.output,'htmlAndMathml');}
global.katex=undefined;T.clearCache();assert.ok(T.expressionHTML('x^2').includes('is-plain'));checks++;
equal(T.cacheSize(),0,'Deferred renderer absence does not poison cache');
global.katex=originalKatex;assert.ok(T.expressionHTML('x^2').includes('is-typeset'));checks++;
for(let i=0;i<300;i++)T.expressionHTML(`x+${i}`);
equal(T.cacheSize(),256,'The shared cache cannot grow without bound');

// Review actual module notation, including every numeric boundary and choice.
// This reuses the real entrypoint instead of duplicating its module catalog.
const root=path.resolve(__dirname,'..'),errors=[],vc=new VirtualConsole();
vc.on('jsdomError',error=>errors.push(error.message));
const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'https://example.com/Math/index.html',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
const w=dom.window;
const context=new Proxy({measureText:text=>({width:String(text).length*7}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(object,key)=>object[key]??(()=>{}),set:(object,key,value)=>(object[key]=value,true)});
Object.defineProperty(w.HTMLCanvasElement.prototype,'clientWidth',{get:()=>1100});
Object.defineProperty(w.HTMLCanvasElement.prototype,'clientHeight',{get:()=>720});
w.HTMLCanvasElement.prototype.getContext=()=>context;
w.HTMLCanvasElement.prototype.getBoundingClientRect=()=>({width:1100,height:720,top:0,bottom:720,left:0,right:1100});
w.HTMLElement.prototype.scrollIntoView=()=>{};w.CanvasRenderingContext2D=class{};
w.ResizeObserver=class{constructor(callback){this.callback=callback;}observe(){this.callback();}};
w.structuredClone=structuredClone;
let catalogCases=0,catalogLines=0,typesetLines=0;
try {
  for(const script of w.document.querySelectorAll('script[src]')) {
    const file=script.getAttribute('src').replace(/^\.\//,'');
    new vm.Script(fs.readFileSync(path.join(root,file),'utf8'),{filename:file}).runInContext(dom.getInternalVMContext());
  }
  equal(w.MathLab.modules.length,520);
  for(const module of w.MathLab.modules) {
    const defaults=Object.fromEntries(module.controls.map(control=>[control.key,control.defaultValue]));
    const cases=[defaults];
    for(const control of module.controls)for(const value of control.type==='select'?control.options.map(option=>option.value):[control.min,control.max])cases.push({...defaults,[control.key]:value});
    for(const state of cases) {
      const model=module.compute(state),lines=module.formula(state,model),html=w.MathTypeset.linesHTML(lines),doc=fragment(html);
      equal(doc.querySelectorAll('code.math-formula').length,lines.length,module.id+' keeps all formula lines');
      equal([...doc.querySelectorAll('code.math-formula')].map(line=>line.dataset.mathSource).join('\n'),lines.map(String).join('\n'),module.id+' preserves notation');
      equal(doc.querySelectorAll('script,img,iframe,[onload],[onerror]').length,0,module.id+' produces only safe notation');
      for(const line of doc.querySelectorAll('code.math-formula'))assert.ok(line.textContent.trim(),module.id+' has no empty formula');
      catalogCases++;catalogLines+=lines.length;typesetLines+=doc.querySelectorAll('code.is-typeset').length;
    }
  }
  // Workspace anchors are navigation, while unknown module links still fail.
  const failures=[];w.document.addEventListener('mathlab:error',event=>failures.push(event.detail.message));
  const initial=w.MathLab.getCurrentModule().id;
  for(const anchor of ['experiment','parameterSection','insightSection','workspaceTabs','notebook','main']) {
    w.history.replaceState(null,'','#'+anchor);w.dispatchEvent(new w.Event('hashchange'));
    equal(w.MathLab.getCurrentModule().id,initial,'Anchor does not switch module');
  }
  equal(failures.length,0,'Workspace navigation is accepted');
  w.history.replaceState(null,'','#missing-module');w.dispatchEvent(new w.Event('hashchange'));
  equal(failures.length,1,'Unknown module link is still rejected');
  equal(w.MathLab.getCurrentModule().id,initial,'Invalid link preserves current module');
  assert.deepEqual(errors,[]);
} finally {w.close();}
process.stdout.write(`PASS ${checks} typography checks; ${catalogCases} module parameter cases, ${catalogLines} safe formula lines (${typesetLines} with MathML) across all 520 modules\n`);
