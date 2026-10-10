'use strict';
const assert=require('node:assert/strict');
const M=require('../graph/math.js');
let checks=0;
const close=(a,b,t=1e-7)=>{assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);checks++;};
const value=(s,x=2,p={a:2,b:1,c:3})=>M.parse(s).at(x,0,p);
close(value('2x+1'),5);close(value('x(x+1)'),6);close(value('-x^2'),-4);close(value('(-x)^2'),4);
close(value('2^3^2'),512);close(value('2^-2'),.25);close(value('sin(pi/2)'),1);close(value('cos(π)'),-1);
close(value('x²−2×x+1'),1);close(value('ln(e)'),1);close(value('log(100)'),2);close(value('sqrt(9)'),3);
close(value('1e-3x'),.002);close(value('max(x,3)'),3);close(value('min(x,3)'),2);close(value('abs(-3)'),3);
close(value('y=a(x-b)^2+c'),5);close(value('exp(0)'),1);close(value('sin(x)^2+cos(x)^2'),1);
close(M.parse('xy=6').at(2,3),0);close(M.parse('x^2+y^2=9').at(0,3),0);close(M.parse('x=2').at(2,9),0);
assert.deepEqual(M.parse('(2,3)').at(0),[2,3]);checks++;
const p=value('(3cos(t),2sin(t))',Math.PI/2);close(p[0],0);close(p[1],2);
const polar=value('r=3cos(2θ)',0);close(polar[0],3);close(polar[1],0);
for(const s of ['window.alert(1)','constructor(1)','x;1','x=','y=x=y','sin x','sin()','max(1)','sqrt(1,2)','x+','(x','x)','foo','y=t','r=x','(x,2)','[1]','x'.repeat(481)]){assert.throws(()=>M.parse(s),s);checks++;}
for(const [s,expected]of [['y=x','function'],['x=2','implicit'],['(2,3)','point'],['(t,t^2)','parametric'],['r=sin(t)','polar']]){assert.equal(M.parse(s).kind,expected);checks++;}
let result=M.analyze(x=>x*x-2,-5,5);assert.equal(result.zeros.length,2);close(result.zeros[0],-Math.SQRT2);close(result.extrema[0],0);
result=M.analyze(x=>(x-.12345)**2,-5,5);assert.equal(result.zeros.length,1);close(result.zeros[0],.12345);
assert.deepEqual(M.roots(x=>1/x,-5,5),[]);checks++;
assert.deepEqual(M.roots(x=>Math.tan(x),1,2),[]);checks++;
assert.deepEqual(M.analyze(x=>0,-5,5).zeros,[]);checks++;
assert.equal(M.analyze(x=>0,-5,5).allZero,true);checks++;
assert.deepEqual(M.analyze(x=>Math.sqrt(x),-5,-1).zeros,[]);checks++;
close(M.derivative(x=>x*x,3),6);
console.log(`PASS ${checks} expression and numerical checks`);
