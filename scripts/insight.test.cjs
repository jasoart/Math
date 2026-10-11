'use strict';
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const M=require('../graph/math.js'),I=require('../graph/insight.js');
let checks=0;
const equal=(a,b)=>{assert.deepEqual(a,b);checks++;};
const close=(a,b,label='value')=>{assert.ok(Number.isFinite(a)&&Math.abs(a-b)<=2e-10*Math.max(1,Math.abs(b)),`${label}: ${a} != ${b}`);checks++;};
const describe=(s,p={})=>I.describe(M.parse(s),p);
equal(M.parse('y=x^2').source,'y=x^2');equal(M.parse('x+y=2').trees.length,2);
equal(describe('y=2x+3').type,'line');equal(describe('y=2x+3').properties,{degree:1,coefficients:[3,2],slope:2,intercept:3});
equal(describe('a*x^2+b*x+c',{a:0,b:2,c:1}).type,'line');
equal(describe('a*x^2+b*x+c',{a:0,b:0,c:1}).type,'constant');
equal(describe('a*x^2+b*x+c',{a:1,b:-4,c:3}).properties.roots,[1,3]);
equal(describe('a*x^2+b*x+c',{a:1,b:0,c:1}).properties.roots,[]);
equal(describe('a*x^2+b*x+c',{a:1,b:2,c:1}).properties.roots,[-1]);
equal(describe('1e-20*x^2+x').type,'quadratic');
equal(describe('1e-300*x^2+1e-300').properties.roots,[]);
equal(describe('1e-300*x^2+1e-300').properties.discriminantSign,-1);
equal(describe('1e300*x^2+1e300*x').properties.roots,[-1,-0]);
equal(describe('x^7').type,'function');
equal(describe('(x-1)^2+(y+2)^2=25').type,'circle');
equal(describe('(x-1)^2+(y+2)^2=25').properties.center,[1,-2]);
close(describe('(x-1)^2+(y+2)^2=25').properties.radiusSquared,25);
equal(describe('x^2+y^2=-1').type,'empty');equal(describe('x^2+y^2=0').type,'point-conic');
equal(describe('x^2+2y^2=4').type,'ellipse');equal(describe('x^2+2y^2=-4').type,'empty');
equal(describe('x^2+2y^2=0').type,'point-conic');
equal(describe('x*y=1').type,'hyperbola');equal(describe('x^2-y^2=0').type,'degenerate-conic');
equal(describe('x^2=y').type,'parabola');equal(describe('x=2').type,'line');
equal(describe('x-x=0').type,'identity');equal(describe('x-x=1').type,'empty');
equal(describe('x^2+y^2<4').type,'inequality');
equal(describe('x^2+y^2<4').notes.includes('嚴格不等式不包含邊界曲線。'),true);
equal(describe('(2,3)').properties.point,[2,3]);equal(describe('(cos(t),sin(t))').type,'parametric');
equal(describe('r=3cos(2t)').type,'polar');
let r=describe('(x-1)/(x^2-1)');equal(r.properties.excluded,[-1,1]);equal(r.properties.poles,[-1]);equal(r.properties.holes,[1]);
r=describe('1/(x-2)^2');equal(r.properties.poles,[2]);equal(r.properties.holes,[]);
r=describe('(x-2)^2/(x-2)');equal(r.properties.holes,[2]);equal(r.properties.poles,[]);
r=describe('1/(a*x+b)',{a:2,b:-4});equal(r.properties.poles,[2]);
r=describe('1/(a*x+b)',{a:1,b:2});equal(r.properties.poles,[-2]);
equal(describe('1/(x^3-2)').domain,'(x^3-2) != 0');
equal(describe('1/(x-x)').type,'empty');
equal(describe('sin(30*x°)').type,'trigonometric');close(describe('sin(30*x°)').properties.period,12);
close(describe('2sin(3x)+4').properties.period,2*Math.PI/3);equal(describe('2sin(3x)+4').properties.range,[2,6]);
close(describe('tan(2x)').properties.period,Math.PI/2);close(describe('3*exp(2x-1)+4').properties.growthRate,2);
close(describe('2^x').properties.growthRate,Math.LN2);equal(describe('ln(2x-4)').domain,'2*x-4 > 0');
equal(describe('sqrt(2x-4)').domain,'2*x-4 >= 0');close(describe('sqrt(2x-4)').properties.boundary,2);
equal(describe('abs(x+2)').type,'absolute');equal(describe('sin(0*x+2)').properties.value,Math.sin(2));
equal(describe('sin(0*x+2) {x>1}').properties.value,Math.sin(2));
equal(describe('x^2 {x>0}').domain,'所有實數，並滿足輸入的範圍條件');
equal(describe('x^2 {x>0}').notes.some(note=>note.includes('範圍外不屬於此圖形')),true);
for(const source of ['<img src=x onerror=alert(1)>','globalThis.x=1','constructor(1)','x;process.exit()','x'.repeat(481)])equal(I.describe(source).type,'invalid');
equal(I.describe(null).type,'unknown');
// Python independently constructs coefficients and expected geometry; this is
// not a transcription of the AST transformations used by the implementation.
const reference=JSON.parse(execFileSync('python3',['-c',String.raw`
import json, math, random
rng=random.Random(73192)
fixtures=[]
for n in range(1,7):
 for j in range(8):
  roots=[rng.randint(-4,4) for _ in range(n)]
  factor=rng.choice([-3,-2,-1,1,2,3])
  coefficients=[factor]
  for r in roots:
   out=[0]*(len(coefficients)+1)
   for i,c in enumerate(coefficients):
    out[i]-=c*r;out[i+1]+=c
   coefficients=out
  expression=str(factor)+''.join('*'+'(x-('+str(r)+'))' for r in roots)
  probes=[]
  for x in [-2.25,-.375,.625,2.125]:
   derivative=sum(i*c*x**(i-1) for i,c in enumerate(coefficients) if i)
   probes.append([x,derivative])
  fixtures.append(dict(source=expression,coefficients=coefficients,probes=probes))
quadratics=[]
for j in range(36):
 a=rng.choice([-4,-3,-2,-1,1,2,3,4]);h=rng.randint(-8,8);k=rng.randint(-8,8)
 quadratics.append(dict(source=f'{a}*(x-({h}))^2+({k})',vertex=[h,k],discriminant=-4*a*k))
conics=[]
for A,B,C,h,k,r in [(2,1,3,2,-3,4),(3,2,5,-4,1,7),(2,4,-1,1,2,3),(1,0,4,3,-1,9)]:
 D=-2*A*h-B*k;E=-B*h-2*C*k;F=A*h*h+B*h*k+C*k*k-r
 determinant=A*C*F+B*D*E/4-A*E*E/4-C*D*D/4-B*B*F/4
 conics.append(dict(source=f'{A}x^2+({B})x*y+({C})y^2+({D})x+({E})y+({F})=0',center=[h,k],discriminant=B*B-4*A*C,determinant=determinant))
print(json.dumps(dict(fixtures=fixtures,quadratics=quadratics,conics=conics)))
`],{encoding:'utf8'}));
for(const fixture of reference.fixtures){const info=describe(fixture.source);equal(info.properties.coefficients,fixture.coefficients);const derivative=M.compile(info.derivative);for(const[x,value]of fixture.probes)close(derivative.evaluate({x}),value,fixture.source);}
for(const fixture of reference.quadratics){const info=describe(fixture.source);fixture.vertex.forEach((v,i)=>close(info.properties.vertex[i],v));close(info.properties.discriminant,fixture.discriminant);}
for(const fixture of reference.conics){const info=describe(fixture.source);fixture.center.forEach((v,i)=>close(info.properties.center[i],v));close(info.properties.discriminant,fixture.discriminant);close(info.properties.determinant,fixture.determinant);}
const analytic=[
 ['sin(2x+1)',x=>2*Math.cos(2*x+1)],['cos(3x-2)',x=>-3*Math.sin(3*x-2)],
 ['tan(x/3)',x=>1/(3*Math.cos(x/3)**2)],['exp(x^2)',x=>2*x*Math.exp(x*x)],
 ['ln(2x+4)',x=>2/(2*x+4)],['log(2x+4)',x=>2/((2*x+4)*Math.LN10)],
 ['sqrt(2x+4)',x=>1/Math.sqrt(2*x+4)],['cbrt(x+3)',x=>1/(3*Math.cbrt(x+3)**2)],
 ['atan(2x)',x=>2/(1+4*x*x)],['sinh(2x)',x=>2*Math.cosh(2*x)],
 ['cosh(2x)',x=>2*Math.sinh(2*x)],['tanh(2x)',x=>2/Math.cosh(2*x)**2],
 ['(x+2)/(x+3)',x=>1/(x+3)**2],['2^(3x+1)',x=>3*Math.LN2*2**(3*x+1)],
 ['a*x^3+sin(b*x)',(x,p)=>3*p.a*x*x+p.b*Math.cos(p.b*x)]
];
for(const[source,expected]of analytic){const params={a:2,b:-3},info=describe(source,params);assert.ok(info.derivative,source);checks++;const derivative=M.compile(info.derivative);for(const x of[-.5,.125,.75])close(derivative.evaluate({...params,x}),expected(x,params),source);}
for(const source of ['1e300*x^2+1e300*x','1e308*x^6','x^6/(x^6+1)','sin(x)+cos(x)','if(x<0,-x,x)']){
 const info=describe(source);assert.ok(!JSON.stringify(info).includes('Infinity'),source);checks++;
}
console.log(`PASS ${checks} structural formula and independent Python checks`);
