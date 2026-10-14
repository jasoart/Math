'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const B=require('blockly'),Blocks=require('../language/blocks-model.js'),M=require('../language/mathscript.js'),Ink=require('../engine/math-ink.js'),D=require('../graph/dynamics.js');
Blocks.register(B);
test('all 19 examples preserve exact source, comments, and execution through blocks',()=>{
  for(const example of require('../language/examples.js')){
    const w=new B.Workspace();try{Blocks.loadSource(B,w,example.source);const code=Blocks.generate(w);assert.equal(code,example.source,example.id);assert.deepEqual(M.run(code),M.run(example.source));const saved=B.serialization.workspaces.save(w),copy=new B.Workspace();try{Blocks.load(B,copy,saved);assert.equal(Blocks.generate(copy),code);}finally{copy.dispose();}}finally{w.dispose();}
  }
});
test('edits update source, preserve inline comments, and reject incomplete or detached blocks',()=>{
  const w=new B.Workspace();try{Blocks.loadSource(B,w,'# lead\nlet a = 1 # important\nprint a');const n=w.getAllBlocks(false).find(b=>b.type==='ms_number');n.setFieldValue(2,'N');const code=Blocks.generate(w);assert.match(code,/# important/);assert.match(code,/let a = 2/);assert.equal(M.run(code).outputs[0].value,2);const loose=w.newBlock('ms_number');assert.throws(()=>Blocks.generate(w),/接回/);loose.dispose();n.unplug();assert.throws(()=>Blocks.generate(w),/接回/);n.dispose();assert.throws(()=>Blocks.generate(w),/空白/);}finally{w.dispose();}
});
test('block import rejects foreign types, excessive nesting and statement injection',()=>{
  const w=new B.Workspace();try{assert.throws(()=>Blocks.load(B,w,{blocks:{blocks:[{type:'text'}]}}));Blocks.loadSource(B,w,'print [1,2]');const list=w.getAllBlocks(false).find(b=>b.type==='ms_list');assert.throws(()=>list.loadExtraState({count:100000}));Blocks.loadSource(B,w,'print ['+Array.from({length:17},(_,i)=>i).join(',')+']');const raw=w.getAllBlocks(false).find(b=>b.type==='ms_raw');raw.setFieldValue('1\nprint 999','TEXT');assert.throws(()=>Blocks.generate(w),/一個運算式/);}finally{w.dispose();}
});
test('imported metadata cannot hide commands outside the visible block model',()=>{
  const w=new B.Workspace();try{Blocks.loadSource(B,w,'print 1');const b=w.getAllBlocks(false).find(b=>b.type==='ms_print');b.data=JSON.stringify({original:'print 999\n',canonical:'print 1'});assert.equal(M.run(Blocks.generate(w)).outputs[0].value,1);w.getTopBlocks(false)[0].data=JSON.stringify({preamble:'print 888\n'});assert.equal(M.run(Blocks.generate(w)).outputs.length,1);assert.throws(()=>Blocks.load(B,w,{blocks:{blocks:[{type:'ms_print',inputs:{VALUE:{shadow:{type:'foreign'}}}}]}}));}finally{w.dispose();}
});
test('MathInk owns fraction, radical, script, matrix and bounded operator layout',()=>{
  const cases=[['(sqrt(x^2+1))/(1+x^2)','mfrac'],['a_i^2','msubsup'],['[[1,2],[3,4]]','mtable'],['sum(n^2,n,1,N)','munderover'],['integrate(exp(-x^2),x,0,1)','munderover']];
  for(const [source,tag]of cases){const r=Ink.render(source);assert.match(r.mathml,new RegExp('<'+tag));assert.match(r.svg,/<path|<text/);assert.ok(r.width>0&&r.height>0&&r.baseline<r.height);assert.equal(r.html.includes('katex'),false);}
  const tree=Ink.parse('-x^2');assert.equal(tree.k,'unary');assert.equal(tree.arg.k,'script');assert.equal(Ink.parse('x^2^3').sup.k,'script');
});
test('MathInk refuses malicious, incomplete, oversized and ragged notation',()=>{
  for(const s of ['<img src=x onerror=alert(1)>','\\htmlClass{bad}{x}','x+','[[1,2],[3]]','('.repeat(100)+'x'+')'.repeat(100),'x'.repeat(1201)])assert.equal(Ink.safe(s),null,s);
  assert.match(Ink.render('x<2').svg,/x&lt;2/);
});
test('adaptive RK4 tracks oscillator invariants and analytic exponential growth',()=>{
  const circle=D.integrate(([x,y])=>[y,-x],[1,0],2*Math.PI),end=circle.points.at(-1);assert.equal(circle.reason,'complete');assert.ok(Math.abs(end[0]-1)<3e-6&&Math.abs(end[1])<3e-6);assert.ok(Math.abs(end[0]**2+end[1]**2-1)<2e-6);
  const exp=D.integrate(([x,y])=>[x,-y],[1,1],2).points.at(-1);assert.ok(Math.abs(exp[0]-Math.exp(2))<1e-5);assert.ok(Math.abs(exp[1]-Math.exp(-2))<1e-6);
  assert.equal(D.integrate(()=>[NaN,1],[0,0],1).reason,'undefined');assert.equal(D.integrate(()=>[1,1],[0,0],10,{maxSteps:1}).reason,'budget');
});
test('vector field geometry is finite, time aware and bounded',()=>{
  const c={p:'y',q:'-x+t',seeds:[[2,0]],density:20,duration:4,view:{xmin:-6,xmax:6,ymin:-4,ymax:4,width:800,height:500}};
  const r=D.compute(c);assert.ok(r.arrows.length<=1024);assert.equal(r.timeDependent,true);assert.equal(r.traces.length,2);assert.ok(r.arrows.flat().every(Number.isFinite));assert.throws(()=>D.compute({...c,density:100}));assert.throws(()=>D.compute({...c,seeds:[[Infinity,0]]}));
});
