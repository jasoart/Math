'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),M=require('../language/mathscript'),D=require('../language/display');
const value=source=>M.run(source).outputs.at(-1).value;
const close=(a,b)=>assert.ok(Math.abs(a-b)<=1e-9*Math.max(1,Math.abs(b)),`${a} != ${b}`);
test('bounded reductions, nested local binders, lexical functions and Chinese commands',()=>{
  assert.equal(value('加總 x^2 從 1 到 10'),385);assert.equal(value('連乘 x 從 1 到 6'),720);
  assert.equal(value('let n=7\nprint sum(n,n,1,3)+n'),13);
  assert.equal(value('print sum(sum(i*j,j,1,4),i,1,3)'),60);
  assert.equal(value('let a=3\nfn f(k)=sum(j*k+a,j,1,4)\nprint f(2)'),32);
  assert.equal(value('print product(k,k,0,4)'),0);
  assert.equal(value('print sum(n,n,-3,3)'),0);
  for(const source of ['print sum(n,n,1,5001)','print sum(n,n,.5,3)','print sum(n,n,3,1)','print sum(n,pi,1,3)','print product(x,x,1,1000)','print sum(1/(n-2),n,1,3)','print sum(n,n,1,3)\nprint n'])assert.throws(()=>M.run(source),M.ScriptError);
});
test('automatic derivatives, lexical closures, derivative plots and tangents',()=>{
  close(value('fn square(z)=z*z\nfn wave(u)=sin(square(u))\nderivative wave(x) at .7'),1.4*Math.cos(.49));
  close(value('參數 倍率 = 2 從 1 到 5\n函數 波(z)=倍率*sin(z)\n微分 波(x) 於 pi/3'),1);
  close(value('print diff(x^3,x,-2)'),12);
  close(value('let u=8\nprint diff(u^2,u,3)+u'),14);
  const r=M.run('plot sin(x)\nplot diff(sin(t),t,x)\n切線 sin(x) 於 pi/4');assert.equal(r.plots.length,3);assert.equal(r.points.length,1);close(r.outputs[0].value,Math.SQRT1_2);
  for(const source of ['derivative abs(x) at 0','derivative floor(x) at 1','derivative ln(x) at 0','print diff(choose(x,2),x,4)','print diff(x^2,2,1)'])assert.throws(()=>M.run(source),M.ScriptError);
});
test('integrals inside expressions retain convergence and domain checks',()=>{
  close(value('let area=integrate(t^3,t,-2,3)\nprint area'),65/4);
  close(value('print integrate(u^2,u,2,0)'),-8/3);
  close(value('let u=5\nprint integrate(u,u,0,2)+u'),7);
  close(value('print integrate(sin(u),u,0,pi)'),2);
  assert.throws(()=>M.run('print integrate(1/x,x,-1,1)'),M.ScriptError);
  assert.throws(()=>M.run('print integrate(t,t,0,1000001)'),M.ScriptError);
});
test('combinatorics, number theory and bounded special functions',()=>{
  assert.equal(value('print choose(20,5)'),15504);assert.equal(value('print factorial(6)'),720);
  assert.equal(value('print gcd(-84,30)'),6);assert.equal(value('print lcm(12,18)'),36);assert.equal(value('print lcm(0,0)'),0);
  assert.equal(value('print mod(-2,5)'),3);assert.equal(value('print hypot(3,4)'),5);close(value('print atan2(1,1)'),Math.PI/4);
  for(const source of ['print choose(2,3)','print choose(4.2,2)','print factorial(-1)','print factorial(171)','print gcd(1.2,3)','print mod(3,0)','print lcm(9007199254740991,2)'])assert.throws(()=>M.run(source),M.ScriptError);
});
test('assertions expose actionable lines, scatter leaves holes and shares table data',()=>{
  const pass=M.run('驗證 abs(0.1+0.2-0.3)<1e-12 標籤 "容差"');assert.match(D.outputs(pass),/通過/);
  assert.throws(()=>M.run('print 1\nassert 0 label "檢查邊界"'),error=>error.line===2&&/檢查邊界/.test(error.message));
  const r=M.run('散點 1/x 從 -2 到 2 每 1');assert.equal(r.points.length,4);assert.equal(r.outputs[0].rows.length,5);assert.equal(r.outputs[0].rows[2][1],null);
  assert.throws(()=>M.run('scatter x from 0 to 200'),M.ScriptError);
  assert.equal(M.run('scatter x from 1 to 1').points.length,1);
  assert.throws(()=>M.run('table x from 1 to .9'),M.ScriptError);
  assert.throws(()=>M.run(Array(11).fill('table x from 1 to 200').join('\n')),/2000 列/);
  assert.throws(()=>M.run(Array(10).fill('scatter x from 1 to 200').join('\n')+'\npoint (0,0)'),/2000 點/);
  const pub=D.publication(pass,'assert 1','https://example.test');assert.match(pub,/MATHSCRIPT 1.2.0/);
});
test('nested iteration still obeys the shared interpreter budget',()=>{
  assert.throws(()=>M.run('print sum(sum(j+i,j,1,5000),i,1,5000)'),/計算上限/);
  assert.equal(M.run('sum x from 1 to 10').outputs[0].value,55);
});
