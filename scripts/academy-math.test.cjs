'use strict';
const assert=require('node:assert/strict'), {spawnSync}=require('node:child_process'), path=require('node:path');
const A=require('../academy/models'), S=require('../academy/state'), D=require('../language/display'), M=require('../language/mathscript');
assert.equal(A.models.length,45);assert.equal(A.scenarios.length,540);assert.equal(A.topics.length,9);
assert.equal(new Set(A.scenarios.map(s=>s.id)).size,540);
const cases=[];
for(const model of A.models){
  const group=A.scenarios.filter(s=>s.modelId===model.id);assert.equal(group.length,12);assert.equal(new Set(group.map(s=>JSON.stringify(s.parameters))).size,12);
  for(const scenario of group){
    const actual=A.run(scenario.id);assert.ok(Number.isFinite(actual.answer));assert.ok(actual.question.length>10);assert.ok(!actual.question.includes('{'));
    for(const p of actual.result.points)assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));
    for(const plot of actual.result.plots)for(const segment of plot.segments)for(const p of segment)assert.ok(p.every(Number.isFinite));
    const svg=D.svg(actual.result);assert.ok(!/NaN|Infinity|undefined/.test(svg));
    const derivative=actual.result.outputs.find(o=>o.type==='derivative')?.value;
    cases.push({model:model.id,parameters:actual.parameters,answer:actual.answer,...(derivative===undefined?{}:{derivative})});
    const parsed=S.parseHash(S.hash(scenario.id,scenario.parameters));assert.deepEqual(parsed.parameters,scenario.parameters);
    assert.equal(M.run(A.source(scenario.id)).outputs[model.steps.length-1].value,actual.answer);
  }
  // Each control endpoint separately, plus all controls at their minimum/maximum.
  const first=group[0];
  for(const c of model.controls)for(const value of [c.min,c.max]){
    const r=A.run(first.id,{...first.parameters,[c.key]:value});cases.push({model:model.id,parameters:r.parameters,answer:r.answer});
  }
  for(const limit of ['min','max']){const p=Object.fromEntries(model.controls.map(c=>[c.key,c[limit]])),r=A.run(first.id,p);cases.push({model:model.id,parameters:r.parameters,answer:r.answer});}
  assert.throws(()=>A.normalize(model,{...first.parameters,constructor:3}));
}
const result=spawnSync('python3',[path.join(__dirname,'check-academy-math.py')],{input:JSON.stringify(cases),encoding:'utf8',maxBuffer:2e6});
assert.equal(result.status,0,result.stderr);process.stdout.write(result.stdout);
assert.equal(A.search('',A.topics[0]).length,60);assert.equal(A.search('餘弦').length,24);assert.equal(A.search('','',A.models[0].id).length,12);
const rare=A.run('academy-binomial-01',{count:16,prob:.9,hits:0});assert.ok(rare.answer>0&&rare.answer<1e-14);assert.equal(A.isCorrect(rare.model,rare.answer,0),false);assert.equal(A.isCorrect(rare.model,rare.answer,1e-16),true);
const first=A.scenarios[0];let state=S.empty();state=S.record(state,first.id,false);assert.equal(S.summary(state).review,1);state=S.record(state,first.id,true);assert.equal(S.summary(state).completed,1);assert.equal(S.summary(state).review,0);assert.equal(S.summary(state).attempts,2);
for(const bad of [null,{}, {...state,items:{invalid:{}}}, {...state,items:{[first.id]:{favorite:true,attempts:1,correct:2,needsReview:false}}}, {...state,recent:{id:first.id,parameters:{a:-999}}}])assert.throws(()=>S.validate(bad));
for(const bad of ['#unknown','#academy-linear-01?p=%ZZ','#academy-linear-01?p={"a":9999}','#academy-linear-01?p=null','#academy-linear-01?bad=1'])assert.throws(()=>S.parseHash(bad));
assert.deepEqual(S.validate(JSON.parse(JSON.stringify(state))),state);
console.log('PASS academy catalog/state: 540 unique scenarios, all source/geometry/links, 12 unique presets/model, filter counts, valid/invalid backups and share bounds.');
