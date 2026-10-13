'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const M = require('../language/mathscript.js'), V = require('../language/values.js'), D = require('../language/display.js'), E = require('../language/editor-tools.js');
const value = source => M.run(source).outputs[0].value;
const close = (a, b, tolerance = 1e-11) => assert.ok(Math.abs(a-b) <= tolerance*Math.max(1,Math.abs(b)), `${a} ≈ ${b}`);
const rejects = sources => { for (const source of sources) assert.throws(() => M.run(source), M.ScriptError, source); };

test('1.1 identifiers and lexical functions remain compatible with new builtin names', () => {
  assert.equal(value('let total=3\nlet norm=4\nprint total+norm'),7);
  assert.equal(value('let norm=4\nprint norm+norm([3,4])'),9);
  assert.equal(value('fn norm(v)=v^2\nprint norm(3)'),9);
  assert.equal(value('fn norm(v)=v^2\nprint diff(norm(u),u,3)'),6);
  assert.equal(value('fn sample(a)=a+1\nprint sample(3)'),4);
  assert.equal(value('let points=2\nfn polyline(n)=points*n\nprint polyline(4)'),8);
  assert.equal(value('print sum(mean,mean,1,3)'),6);
  const result=M.run('fn before(u)=norm(u)\nfn norm(u)=total(u)\nprint before([3,4])\nprint norm([3,4])');
  assert.deepEqual(result.outputs.map(o=>o.value),[5,7]);
  rejects(['let sin=1','fn if(a)=a','fn mean(u)=mean(u,u)']);
});

test('typed literals, immutable operations and lexical custom functions', () => {
  assert.deepEqual(value('print [[1,2],\n # row separator\n [3,4]]'), [[1,2],[3,4]]);
  const r = M.run('let v=[1,2]\nfn shifted(a)=a+v\nprint shifted([3,4])\nprint v\nprint -v*2\nprint [[2,4],[6,8]]/2');
  assert.deepEqual(r.outputs.map(o=>o.value),[[4,6],[1,2],[-2,-4],[[1,2],[3,4]]]);
  assert.equal(r.outputs[0].type,'vector'); assert.equal(r.outputs[3].type,'matrix');
  assert.deepEqual(value('fn twice(a)=2*a\nfn both(a,b)=twice(a)+b\nprint both([1,2],[3,4])'),[5,8]);
  assert.equal(value('assert [[1,2]]==[[1,2]]'),1);
  assert.equal(value('print [1,2]==[1]'),0); assert.equal(value('print [1]==1'),0);
  assert.deepEqual(value('print if(1,[2,3],1/0)'),[2,3]);
  assert.equal(value('print 0 && norm(1/0)'),0);
  rejects(['print []','print [1,]','print [1 2]','print [[1],[2,3]]','print [1,[2]]','print [[[1]]]','print [sqrt(-1)]','print [[1],2]','print [1].constructor','print [1][0]']);
  rejects(['print [1]+[2,3]','print [1]+1','print [1]*[2]','print 2/[1]','print [1]/0','print [1]^2','print [1]<[2]','print [1]&&1','print 1&&[1]','print if([0],1,2)','print [1]!=sqrt(-1)']);
});

test('vectors, matrices, scaled pivoting, singularity and indexing', () => {
  assert.equal(value('print dot([1,2,3],[4,5,6])'),32);
  assert.deepEqual(value('print cross([1,0,0],[0,1,0])'),[0,0,1]);
  close(value('print norm([[1,2],[3,4]])'),Math.sqrt(30));
  close(value('print norm(unit([1e308,1e308]))'),1);
  assert.deepEqual(value('print matmul([[1,2],[3,4]],[5,6])'),[17,39]);
  assert.deepEqual(value('print matmul([[1,2],[3,4]],[[5],[6]])'),[[17],[39]]);
  assert.deepEqual(value('print transpose([[1,2,3],[4,5,6]])'),[[1,4],[2,5],[3,6]]);
  assert.equal(value('print trace([[1,2],[3,4]])'),5);
  assert.deepEqual(value('print solve([[0,2],[1,3]],[4,7])'),[1,2]);
  assert.deepEqual(value('print inverse([[0,1],[1,0]])'),[[0,1],[1,0]]);
  assert.deepEqual(value('print solve([[1e-200,0],[0,1e200]],[2e-200,3e200])'),[2,3]);
  close(value('print det([[1e200,0,0,0],[0,1e200,0,0],[0,0,1e-200,0],[0,0,0,1e-200]])'),1);
  assert.equal(value('print det([[1,2],[2,4]])'),0);
  assert.equal(value('print entry([[1,2],[3,4]],2,1)'),3);
  assert.deepEqual(value('print column([[1,2],[3,4]],2)'),[2,4]);
  assert.deepEqual(value('print row([[1,2],[3,4]],2)'),[3,4]);
  assert.equal(value('print component([7,8],2)'),8);
  rejects(['print solve([[1,2],[2,4]],[1,2])','print inverse([[1,1],[1,1.0000000000001]])','print solve([[1,2]], [3])','print matmul([[1,2]], [3])','print dot([1],[2,3])','print cross([1,2],[3,4])','print unit([0,0])','print component([1,2],0)','print row([[1]],1.5)','print entry([[1]],1,2)','print det([[1,2]])','print det([[1e-300,0],[0,1e-300]])','print norm([1.7e308,1.7e308])']);
  const original=[[1,2],[3,5]], copy=structuredClone(original); V.builtins.get('inverse')[0](original); assert.deepEqual(original,copy);
});

test('statistics and scoped sampling retain finite data and outer bindings', () => {
  close(value('print mean([2,4,4,6,9])'),5);
  assert.equal(value('print total([1e16,1,-1e16])'),1);
  assert.equal(value('print median([9,1,7,3])'),5);
  close(value('print variance([2,4,4,6,9])'),5.6);
  close(value('print samplevar([2,4,4,6,9])'),7);
  close(value('print variance([1e12+1,1e12+2,1e12+3])'),2/3);
  assert.equal(value('print mean([5e-324,5e-324])'),Number.MIN_VALUE);
  close(value('print mean([1e308,1e308,-1e308])'),1e308/3);
  close(value('print stdev([-1e308,1e308,-1e308,1e308])'),1e308);
  assert.ok(Number.isFinite(value('print variance([-1e154,1e154])')));
  assert.deepEqual(value('print linspace(-1,1,5)'),[-1,-.5,0,.5,1]);
  assert.deepEqual(value('print sample(u^2,u,-1,1,.5)'),[1,.25,0,.25,1]);
  assert.deepEqual(value('print sample(u,u,2,2,1)'),[2]);
  assert.equal(value('print length(sample(u,u,0,1,.3))'),4);
  const r=M.run('let k=7\nprint sample(k^2,k,1,3,1)\nprint k'); assert.deepEqual(r.outputs.map(o=>o.value),[[1,4,9],7]);
  assert.deepEqual(value('print sample(total(sample(i*j,j,1,2,1)),i,1,3,1)'),[3,6,9]);
  rejects(['print sample(n,n,3,1,1)','print sample(n,n,0,1,0)','print sample(n,n,0,1,-1)','print sample(n,n,0,1000,1)','print sample(n,n,0,1,1e-309)','print sample([n],n,1,2,1)','print sample(1/n,n,0,1,1)','print sample(n,n,1,2,1)\nprint n','print sample(n,n,0,1,[1])','print mean([[1,2]])','print samplevar([1])','print linspace(1,2,1)','print linspace(1,2,257)']);
});

test('data plotting, scalar boundaries and located errors survive sampling', () => {
  const r=M.run('資料點 [0,1,2], [2,3,1]\n折線 [0,1,2], [2,3,1] 標籤 "折線"');
  assert.equal(r.points.length,3); assert.deepEqual(r.plots[0].segments,[[[0,2],[1,3],[2,1]]]); assert.equal(r.outputs.length,2);
  rejects(['points [1],[2,3]','polyline [1],[2]','points [1000001],[0]','points 1,2','param a=[1] from 0 to 2','view [1],2,0,2','assert [1]','print sin([1])','integral [x] from 0 to 1','table [x] from 0 to 1','plot [x]','curve (t,[t]) from 0 to 1','plot if(x>2,dot([x],[1,2]),0)']);
  for(const source of ['title "type"\nplot [x]','title "type"\nprint solve([[1,2],[2,4]],[1,2])']) {
    assert.throws(()=>M.run(source),e=>e instanceof M.ScriptError && e.line===2 && e.column>=1);
  }
  assert.equal(value('let v=[2,3]\nlet coefficient=component(v,1)\nprint diff(coefficient*u^2,u,3)'),12);
  rejects(['let v=[2,3]\nprint diff(v,u,1)','print diff([u],u,1)','print diff(dot([u],[2]),u,1)']);
});

test('finite size, output and shared operation budgets bound data programs', () => {
  assert.equal(value('print length(linspace(0,1,256))'),256);
  assert.equal(value('print trace(identity(8))'),8);
  rejects([`print [${Array(257).fill(1).join(',')}]`,'print identity(9)',`print [${Array(9).fill('[1]').join(',')}]`]);
  rejects([Array(17).fill('print linspace(0,1,256)').join('\n'),Array(11).fill('points linspace(0,1,200),linspace(0,1,200)').join('\n'),Array(13).fill('polyline [0,1],[0,1]').join('\n'),'print sum(det(identity(8)),k,1,5000)']);
  assert.ok(M.run('print linspace(0,1,256)').stats.steps>1);
});

test('accessible matrix/vector output, escaped publication and compatible CSV', () => {
  const r=M.run('print [1,0.1234567890123456] label "<img src=x>"\nprint [[1,2],[3,4]]\npolyline [0,1],[2,3]');
  const html=D.outputs(r); assert.match(html,/向量 · 2 個分量/); assert.match(html,/矩陣 · 2 × 2/); assert.match(html,/scope="row"/); assert.match(html,/tabindex="0"/); assert.doesNotMatch(html,/<img/); assert.match(html,/&lt;img/);
  const csv=E.csv(r); assert.ok(csv.startsWith('\ufeffblock,type,line,row,column,value\r\n')); assert.match(csv,/1,vector,1,2,1,0.1234567890123456/); assert.match(csv,/2,matrix,2,2,2,4/); assert.match(csv,/3,table,3,2,2,3/); assert.doesNotMatch(csv,/<img/);
  assert.ok(E.csv(M.run('table x from 0 to 1')).startsWith('\ufefftable,line,x,value\r\n'));
  assert.equal(E.hasData(M.run('print 1')),false); assert.equal(E.hasData(r),true);
  assert.match(D.publication(r,'print [1]','https://example.test'),/矩陣 · 2 × 2/);
  assert.match(E.highlight('print mean([1,2])'),/syntax-builtin/); assert.match(E.highlight('[1]'),/syntax-operator/);
});

test('worker loads its real dependencies and serializes data/errors', () => {
  const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
  const responses=[], loaded=[], directory=path.resolve(__dirname,'../language');
  const context=vm.createContext({performance,self:{postMessage:r=>responses.push(JSON.parse(JSON.stringify(r)))}});
  context.importScripts=(...files)=>{ for(const file of files) {loaded.push(file);vm.runInContext(fs.readFileSync(path.resolve(directory,file),'utf8'),context,{filename:file});} };
  vm.runInContext(fs.readFileSync(path.join(directory,'worker.js'),'utf8'),context);
  context.self.onmessage({data:{id:1,source:'print inverse([[2,1],[1,3]])'}});
  assert.deepEqual(responses[0].result.outputs[0].value,[[.6,-.2],[-.2,.4]]);assert.ok(loaded.includes('./values.js'));
  context.self.onmessage({data:{id:2,source:'title "error"\nprint dot([1],[2,3])'}});
  assert.equal(responses[1].error.line,2);assert.match(responses[1].error.message,/尺寸/);
});
