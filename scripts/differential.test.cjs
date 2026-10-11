'use strict';
// Analytic expectations exercise the interpreter independently of numerical
// differences, including scales at which subtracting nearby values loses slope.
const assert=require('node:assert/strict');
const M=require('../graph/math.js');
let checks=0;
function close(actual,expected,label,relative=2e-12) {
  assert.ok(Number.isFinite(actual),`${label}: expected a finite derivative, got ${actual}`);
  const tolerance=Math.max(Number.MIN_VALUE,Math.abs(expected)*relative);
  assert.ok(Math.abs(actual-expected)<=tolerance,`${label}: ${actual} != ${expected}`);
  checks++;
}
function invalid(actual,label) {assert.ok(Number.isNaN(actual),`${label}: expected NaN, got ${actual}`);checks++;}
function d(expression,x,params={}) {return M.compile(expression).derivative({...params,x});}

for(const [expression,x,expected] of [
  ['42',12,0],['x',12,1],['-x',-4,-1],['+x',4,1],
  ['x^3-2x^2+5x-7',-3,44],['2x(x+1)',4,18],['1/x',-2,-.25],
  ['x/(1+x)',2,1/9],['(x^2+1)/(x-1)',3,.5],
  ['sin(x)',.7,Math.cos(.7)],['cos(x)',.7,-Math.sin(.7)],
  ['tan(x)',.7,1/Math.cos(.7)**2],['sin(3x^2)',.7,4.2*Math.cos(1.47)],
  ['sin(x°)',30,Math.cos(Math.PI/6)*Math.PI/180],['x°',2,Math.PI/180],
  ['asin(x)',.3,1/Math.sqrt(.91)],['acos(x)',.3,-1/Math.sqrt(.91)],
  ['atan(x)',2,.2],['sqrt(x)',4,.25],['cbrt(x)',-8,1/12],
  ['abs(x)',-4,-1],['abs(x)',4,1],['exp(x)',2,Math.exp(2)],
  ['ln(x)',2,.5],['log(x)',100,1/(100*Math.LN10)],
  ['sinh(x)',.7,Math.cosh(.7)],['cosh(x)',.7,Math.sinh(.7)],
  ['tanh(x)',.7,1/Math.cosh(.7)**2],['sec(x)',.7,Math.sin(.7)/Math.cos(.7)**2],
  ['csc(x)',.7,-Math.cos(.7)/Math.sin(.7)**2],['cot(x)',.7,-1/Math.sin(.7)**2],
  ['floor(x)',1.2,0],['ceil(x)',1.2,0],['round(x)',1.2,0],['sign(x)',-2,0],
  ['min(x,x^2)',.3,.6],['max(x,x^2)',.3,1],
  ['min(x,x)',2,1],['max(x^2,-x^2)',0,0],
  ['x^2',-3,-6],['x^3',-3,27],['x^-2',-2,.25],
  ['x^0',0,0],['x^1',0,1],['x^2',0,0],['x^3',0,0],
  ['x^.5',4,.25],['x^x',2,4*(1+Math.LN2)],['2^x',3,8*Math.LN2],
  ['(-2)^3+x',1,1],['sqrt(0)+x',0,1],['0^x',2,0],
])close(d(expression,x),expected,`${expression} at ${x}`);

// Independent analytic samples cover both variables, nested chains and parameters.
const surface=M.compile('sin(xy)+a*x^3+exp(y/2)');
for(const x of [-2,-.3,0,.6,2.1])for(const y of [-1.5,0,.8]) {
  const g=surface.gradient({x,y,a:.7});
  close(g.x,y*Math.cos(x*y)+2.1*x*x,`surface dx at ${x},${y}`);
  close(g.y,x*Math.cos(x*y)+Math.exp(y/2)/2,`surface dy at ${x},${y}`);
}
assert.deepEqual(M.compile('x^2+xy+y^2').gradient({x:2,y:3}),{x:7,y:8});checks++;
assert.deepEqual(M.compile('at^2+bt+c').gradient({a:2,b:3,c:5,t:4},['t','a','b','c']),{t:19,a:16,b:4,c:1});checks++;
assert.deepEqual(M.compile('x').gradient({x:2},[]),{});checks++;
close(M.compile('x^a').derivative({x:-2,a:3},'x'),12,'negative base, fixed integer parameter');
invalid(M.compile('x^a').derivative({x:-2,a:3},'a'),'negative base, varying exponent');
invalid(M.compile('x^y').gradient({x:0,y:2}).y,'variable base and exponent at a surface domain boundary');
const cusp=M.compile('abs(x)+y^2').gradient({x:0,y:3});
invalid(cusp.x,'surface cusp dx');close(cusp.y,6,'surface cusp dy remains defined');

for(const [expression,x,expected] of [
  ['if(x<0,-x,x^2)',-2,-1],['if(x<0,-x,x^2)',3,6],
  ['if(x>=0,sqrt(x),sqrt(-x))',-4,-.25],
  ['if(x>0,ln(x),sqrt(-x))',-4,-.25],
  ['if(-2<x<3,x^2,2x)',1,2],['if(x>0&&x<3,x^2,2x)',1,2],
  ['if(x<0||x>3,x^2,2x)',4,8],['if(abs(x)<1,x,2x)',0,1],
  ['if(floor(x),x^2,2x)',.2,2],['if(x^2+1,x^2,1/x)',0,0],
  ['x<2',1,0],['x>2',1,0],['x&&y',1,0],
])close(d(expression,x,{y:1}),expected,`${expression} smooth branch at ${x}`);

// A selected branch must not hide a boundary, singularity or non-real domain.
for(const [expression,x] of [
  ['abs(x)',0],['sqrt(x)',0],['sqrt(x)',-1],['cbrt(x)',0],
  ['asin(x)',1],['asin(x)',-1],['acos(x)',1],['ln(x)',0],['log(x)',-1],
  ['floor(x)',1],['ceil(x)',-1],['round(x)',.5],['round(x)',-.5],['sign(x)',0],
  ['min(x,-x)',0],['max(x,-x)',0],['min(x,1/x)',0],['max(-1,sqrt(x))',0],
  ['exp(-1/x)',0],['1/x',0],['x^-.5',0],['x^.5',0],
  ['x^.5',-1],['(-2)^x',2],['(-2)^(x^2)',0],
  ['tan(x)',Math.PI/2],['sec(x)',Math.PI/2],['csc(x)',0],['cot(x)',Math.PI],
  ['if(x<0,-x,x^2)',0],['if(x=0,1,x)',0],['if(x^2,x,2x)',0],
  ['if(x>0&&x<3,x^2,2x)',3],['if(x<0||x>3,x^2,2x)',0],
  ['if(floor(x),x,2x)',1],['if(x,1,2)',0],['x<2',2],['x&&y',0],
  ['exp(x)',1000],['sinh(x)',1000],['x+x',Number.MAX_VALUE],
])invalid(d(expression,x,{y:1}),`${expression} boundary at ${x}`);

// Cancellation-resistant derivatives and overflow-resistant quotient/function rules.
for(const [expression,x,expected] of [
  ['1e20+x',2,1],['1e20+x^2',3,6],['x^2',1e-200,2e-200],
  ['(1e200*x)/1e200',2,1],['x/1e200',3,1e-200],
  ['x^x',1e-300,Math.log(1e-300)+1],['sqrt(x)',1e300,5e-151],
  ['cbrt(x)',1e-300,1e200/3],['atan(x)',1e160,1e-320],
  ['tanh(x)',100,4*Math.exp(-200)],
])close(d(expression,x),expected,`${expression} extreme scale at ${x}`,5e-12);

close(M.parse('y=a(x-h)^2+k').derivative(5,{a:2,h:3,k:8}),8,'parsed function with parameters');
for(const text of ['x^2 {0<=x<=3}','x^2 {0<x<3}','x^2 {x!=0}']) {
  close(M.parse(text).derivative(1),2,`${text} interior`);
  invalid(M.parse(text).derivative(0),`${text} restriction boundary`);
}
invalid(M.parse('x^2 {0<=x<=3}').derivative(3),'included restriction endpoint');
invalid(M.parse('x^2 {0<=x<=3}').derivative(-1),'outside restriction');
close(M.parse('x {abs(x)<1}').derivative(0),1,'restriction condition cusp inside open region');
for(const text of ['(2,3)','(t,t^2)','r=t','x^2+y^2=1','y>x'])invalid(M.parse(text).derivative(1),`${text} is not an explicit function`);
for(const x of [NaN,Infinity,-Infinity])invalid(M.parse('x').derivative(x),'non-finite independent variable');
for(const scope of [{},{x:NaN},{x:Infinity},{x:'2'},null])invalid(M.compile('x').derivative(scope),'missing or invalid numeric scope');
for(const names of [['constructor'],['__proto__'],['z'],[null],'x']) {
  assert.throws(()=>M.compile('x').gradient({x:1},names));checks++;
}
for(const expression of ['x.__proto__','constructor(x)','x;process.exit()','sin x','('.repeat(49)+'x'+')'.repeat(49)]) {
  assert.throws(()=>M.compile(expression));checks++;
}
close(M.derivative(x=>x*x,3),6,'existing numerical derivative',1e-9);
close(M.slope(x=>x*x,3),6,'existing numerical slope',1e-9);
invalid(M.slope(Math.abs,0),'existing cusp detection');
const parsed=M.parse('1e20+x'),precise=x=>parsed.at(x);
precise.derivative=x=>parsed.derivative(x);
close(M.derivative(precise,3),1,'AD-enabled numerical helper');
close(M.slope(precise,3),1,'AD-enabled tangent avoids finite-difference cancellation');
const offsetLine=M.parse('1e12+x'),line=x=>offsetLine.at(x);
line.derivative=x=>offsetLine.derivative(x);
close(M.slope(line,0),1,'large constant offset preserves unit slope');
assert.deepEqual(M.analyze(line,-2,2),{zeros:[],extrema:[],allZero:false});checks++;
const offsetQuadratic=M.parse('1e12+(x-.25)^2'),quadratic=x=>offsetQuadratic.at(x);
quadratic.derivative=x=>offsetQuadratic.derivative(x);
const extrema=M.analyze(quadratic,-2,2).extrema;
assert.equal(extrema.length,1);checks++;
close(extrema[0],.25,'AD sign change locates minimum beneath a large constant offset');
const bounded=M.parse('x {x>=0}'),restricted=x=>bounded.at(x);
restricted.derivative=x=>bounded.derivative(x);
invalid(M.slope(restricted,0),'AD boundary result never falls back to finite differences');
console.log(`PASS ${checks} automatic differentiation and gradient checks`);
