'use strict';
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const G=require('../spatial/geometry.js');
let checks=0;
const check=(value,message)=>{assert.ok(value,message);checks++;};
const equal=(actual,expected)=>{assert.deepEqual(actual,expected);checks++;};
const close=(a,b)=>{check(Number.isFinite(a)&&Math.abs(a-b)<=2e-8*Math.max(1,Math.abs(b)),`${a} ≈ ${b}`);};
function compare(actual,expected) {
  if(typeof expected==='number')close(actual,expected);
  else if(Array.isArray(expected)){equal(actual.length,expected.length);expected.forEach((v,i)=>compare(actual[i],v));}
  else if(expected&&typeof expected==='object'){for(const [key,value]of Object.entries(expected))compare(actual[key],value);}
  else equal(actual,expected);
}
const independent=JSON.parse(execFileSync('python3',[path.join(__dirname,'check-geometry-math.py'),'--json'],{encoding:'utf8',maxBuffer:1024*1024}));
for(const fixture of independent.fixtures)compare(G[fixture.method](...fixture.args),fixture.expected);

for(const [source,type]of [
  ['A=(1,2,3)','point'],['B=（1/2，√4，3²）','point'],['v=(2,-1,3)','vector'],
  ['2x-y+z=4','plane'],['x=3','plane'],['y=-2','plane'],['z=4','plane'],
  ['(x-1)^2+(y+2)^2+(z-3)^2=25','sphere'],['2x²+2y²+2z²-4x+8y-12z=22','sphere'],
  ['x²+y²=9','cylinder'],['y²+z²=4','cylinder'],['x²+z²=16','cylinder'],
  ['x²+y²=z²','cone'],['y²+z²=4x²','cone'],['(x-1)^2+(y+2)^2=4(z-3)^2','cone'],
  ['z=x²-y²','surface'],['z=sin(x)*cos(y)','surface'],
  ['x=cos(t), y=sin(t), z=t','parametric'],['z=t, x=cos(t), y=sin(t)','parametric'],
  ['x=v*cos(u),y=v*sin(u),z=v','parametricSurface'],['x=2u,y=v,z=uv','parametricSurface'],
  ['x=1+2t, y=2-t, z=3+t','line'],['(x,y,z)=(1,2,3)+t(2,-1,1)','line'],
  ['(x-1)/2=(y+2)/(-1)=(z-3)/3','line'],['(x,y,z)=(sqrt(4),1/2,3)+t(1,-2,3)','line'],
  ['x^2+2y^2+z^2=1','implicit'],['sin(x)+cos(y)+z=0','implicit']
]) {
  const object=G.parse(source);equal(object.type,type);equal(G.validate(JSON.parse(JSON.stringify(object))),object);
}
const sphere=G.parse('(x-1)^2+(y+2)^2+(z-3)^2=25');equal(sphere.center,[1,-2,3]);equal(sphere.radius,5);
const translatedCone=G.parse('(x-1)^2+(y+2)^2=4(z-3)^2');compare(translatedCone.vertex,[1,-2,3]);equal(translatedCone.slope,2);
const A=G.parse('A=(1,2,3)'),E=G.parse('2x-y+z=4');
const measured=G.measure(A,E,'distance');equal(measured.exact,'1/sqrt(6)');equal(measured.exactFoot,['4/3','11/6','19/6']);
check(measured.auxiliary.some(o=>o.type==='segment'));check(measured.auxiliary.some(o=>o.type==='vector'));
equal(G.pointPlane(G.parse('P=(1/3,1/2,0)'),E).exact,'(23/6)/sqrt(6)');
equal(G.pointPlane(G.parse('P=(pi,1,2)'),E).exact,null);
equal(G.pointPlane(G.parse('P=(sqrt(2),1,2)'),E).exact,null);
compare(G.measure(A,E,'projection').projection,[4/3,11/6,19/6]);
const through=G.make('line',{points:[[1,2,3],[3,1,4]]});equal(through.direction,[2,-1,1]);
const planeThree=G.make('plane',{points:[[1,0,0],[0,1,0],[0,0,1]]});
for(const p of [[1,0,0],[0,1,0],[0,0,1]])close(G.dot(planeThree.normal,p),planeThree.constant);
close(G.measure(G.make('line',{point:[0,0,0],direction:[1,0,1]}),G.parse('z=2'),'angle').angle,45);
equal(G.linePlane(G.make('line',{point:[0,0,2],direction:[1,0,0]}),G.parse('z=2')).status,'contained');
equal(G.linePlane(G.make('line',{point:[0,0,3],direction:[1,0,0]}),G.parse('z=2')).status,'parallel');
compare(G.linePlane(G.make('line',{point:[0,0,0],direction:[1,2,1]}),G.parse('z=2')).point,[2,4,2]);
const planeLine=G.planePair(G.parse('x=2'),G.parse('y=3'));
equal(planeLine.status,'intersecting');compare(planeLine.line.point,[2,3,0]);
close(G.dot(planeLine.line.direction,[1,0,0]),0);close(G.dot(planeLine.line.direction,[0,1,0]),0);
equal(G.planePair(G.parse('x=2'),G.parse('-2x=-4')).status,'coincident');
compare(G.planePair(G.parse('x=2'),G.parse('-2x=-8')), {status:'parallel',distance:2});
const u=G.parse('u=(1,0,0)'),v=G.parse('v=(-1,0,0)');
equal(G.measure(u,v,'angle').angle,180);equal(G.measure(u,v,'dot').value,-1);equal(G.measure(u,G.parse('v=(0,1,0)'),'cross').cross,[0,0,1]);
compare(G.measure(G.parse('u=(1,2,3)'),G.parse('v=(2,0,0)'),'projection').projection,[1,0,0]);
equal(G.vectorPair([0,0,0],[1,2,3]).status,'zero-vector');equal(G.vectorPair([0,0,0],[1,2,3]).angle,null);
equal(G.threePlanes([G.parse('x=2'),G.parse('2x=4'),G.parse('-x=-2')]).rank,1);
equal(G.threePlanes([G.parse('x=2'),G.parse('y=3'),G.parse('x+y=5')]).status,'infinite');
equal(G.threePlanes([G.parse('x=2'),G.parse('y=3'),G.parse('x+y=6')]).status,'inconsistent');
equal(G.pointSphere(G.make('point',{position:sphere.center}),sphere).status,'inside');
equal(G.pointSphere(G.make('point',{position:[1,-2,8]}),sphere).status,'on-sphere');
equal(G.pointSphere(G.make('point',{position:[1,-2,9]}),sphere).status,'outside');
const degenerate=G.make('tetrahedron',{points:[[0,0,0],[1,0,0],[0,1,0],[1,1,0]]});equal(G.volume(degenerate).status,'degenerate');
for(const values of [{expression:'1/x',domain:[-1,1]}, {expression:'x',domain:[-1,1]}, {expression:'1',innerExpression:'2',domain:[0,1]}])
  check(G.revolutionVolume(G.make('revolution',values)).status!=='regular');
close(G.revolutionVolume(G.make('revolution',{expression:'x',domain:[0,3],axis:'y'})).volume,9*Math.PI);
equal(G.revolutionVolume(G.make('revolution',{expression:'sqrt(x)',domain:[0,4]})).exact,'8pi');
equal(G.revolutionVolume(G.make('revolution',{expression:'x^2',domain:[0,2]})).exact,'(32/5)pi');
equal(G.revolutionVolume(G.make('revolution',{expression:'2',innerExpression:'1',domain:[0,5]})).exact,'15pi');
equal(G.revolutionVolume(G.make('revolution',{expression:'exp(x)',domain:[0,1]})).exact,null);
compare(G.measure(sphere,G.parse('z=4'),'distance'),{distance:0,centerDistance:1});
close(G.measure(sphere,G.parse('z=10'),'distance').distance,2);
equal(G.measure(A,E,'intersection').status,'disjoint');
equal(G.measure(G.parse('A=(2,1,1)'),E,'intersection').status,'intersection');
const nearParallel=G.linePair(G.make('line',{point:[0,0,0],direction:[1,0,0]}),G.make('line',{point:[0,1,0],direction:[1,1e-9,0]}));
equal(nearParallel.status,'intersecting');check(nearParallel.angle>0);compare(nearParallel.point,[-1e9,0,0]);
check(G.measure(G.make('vector',{direction:[1000,0,0]}),G.make('vector',{direction:[0,1000,0]}),'cross').auxiliary[0].direction[2]===1e6);
compare(G.measure(G.parse('u=(1,2,3)'),G.parse('v=(4,-1,0)'),'add').direction,[5,1,3]);
compare(G.measure(G.parse('u=(1,2,3)'),G.parse('v=(4,-1,0)'),'subtract').direction,[-3,3,3]);
compare(G.measure(G.parse('A=(1,2,3)'),G.parse('B=(3,-2,1)'),'midpoint').point,[2,0,2]);
compare(G.evaluate(G.make('parametricSurface',{expressions:['2u','uv','sqrt(abs(v))'],domains:[[-1,1],[-1,1]]}),{u:.5,v:-.25}),[1,-.125,.5]);

// Scaling normals and directions must not alter geometric distances.
for(const scale of [1e-7,1,1e3]) {
  close(G.pointPlane(A,G.make('plane',{normal:[2*scale,-scale,scale],constant:4*scale})).distance,1/Math.sqrt(6));
  const pair=G.linePair(G.make('line',{point:[0,0,0],direction:[scale,0,0]}),G.make('line',{point:[0,1,1],direction:[0,scale,0]}));
  close(pair.distance,1);compare(pair.feet,[[0,0,0],[0,0,1]]);
}
for(const bad of ['A=(1,2)','A=(1/0,2,3)','x=process.exit()','x=document.cookie','x²+y²+t²=25','t=4','x=1;y=2','(x^2+y^2+z^2)=0','x^2+y^2+z^2=-1','0x+0y+0z=1','z=foo(x)','z=if(x,1)','A=(NaN,1,2)']) {
  assert.throws(()=>G.parse(bad),undefined,bad);checks++;
}
for(const action of [
  ()=>G.make('line',{direction:[0,0,0]}),()=>G.make('plane',{normal:[0,0,0]}),
  ()=>G.make('plane',{points:[[0,0,0],[1,1,1],[2,2,2]]}),
  ()=>G.make('sphere',{radius:-1}),()=>G.make('point',{position:[1e8,0,0]}),
  ()=>G.make('implicit',{expression:'x+y+t'}),()=>G.make('parametric',{expressions:['x','0','t']}),
  ()=>G.validateScene(Array.from({length:33},()=>A)),()=>G.make('box',{size:[1,0,2]}),
  ()=>G.make('polyhedron',{points:[[0,0,0],[1,0,0],[0,1,0],[0,0,1]],faces:[[0,1,9]]}),
  ()=>G.measure(u,v,'distance'),()=>G.measure(A,E,'dot'),()=>G.measure(A,E,'cross'),
  ()=>G.measure(u,G.parse('v=(0,0,0)'),'projection'),()=>G.measure(A,E,'angle'),()=>G.measure(u,v,'intersection'),
  ()=>G.make('parametricSurface',{expressions:['x','u','v']}),()=>G.make('parametricSurface',{expressions:['t','u','v']}),
  ()=>G.make('parametricSurface',{expressions:['a+u','v','0']}),()=>G.make('parametricSurface',{expressions:['u','v','0'],domains:[[1,0],[0,1]]}),
  ()=>G.measure(A,E,'add'),()=>G.measure(u,v,'midpoint')
]) {assert.throws(action);checks++;}
equal(G.validateScene([A,E,sphere]).length,3);
console.log(`Spatial geometry: ${checks} assertions; ${independent.fixtures.length} independent Python fixtures (${independent.checks} exact checks).`);
