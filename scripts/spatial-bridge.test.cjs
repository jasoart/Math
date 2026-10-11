'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {execFileSync}=require('node:child_process'),{JSDOM,VirtualConsole}=require('jsdom');
const B=require('../engine/spatial-bridge.js'),G=require('../spatial/geometry.js');
let checks=0;
function close(actual,expected,label){assert.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<1e-9*Math.max(1,Math.abs(expected)),`${label}: ${actual} != ${expected}`);checks++;}
function closeVector(actual,expected,label){assert.equal(actual.length,expected.length,label);actual.forEach((value,i)=>close(value,expected[i],label+'.'+i));}
const reference=JSON.parse(execFileSync('python3',['-c',`
import json,math
dot=lambda a,b:sum(x*y for x,y in zip(a,b))
cross=lambda a,b:[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
p=[math.sqrt(2),2,3];u=[1,1,-1];t=dot(p,u)/dot(u,u);foot=[t*x for x in u]
skew_n=cross([1.35,.65,.25],[.55,-.38,1.22]);offset=[2.75,-.4,1.9]
print(json.dumps({'pointLineFoot':foot,'pointLineDistance':math.dist(p,foot),'pointPlaneFoot':[1-2/3,2-2/3,3-2/3],'pointPlaneDistance':2/math.sqrt(3),'sphereSectionRadius':4,'sphereSectionArea':16*math.pi,'tetraVolume':4,'tripleVolume':8,'skewDistance':abs(dot(offset,skew_n))/math.sqrt(dot(skew_n,skew_n)),'cross':cross([3,1,1],[0,3,2]),'projection':[0,15/13,10/13],'cubeSectionArea':3*math.sqrt(3)/4,'linePlaneAngle':math.degrees(math.asin(5/(3*math.sqrt(6)))),'revolutionVolume':math.pi*1.5**2*9/2,'revolutionRadius':1.5*math.sqrt(1.5),'spherePointRadius':math.sqrt(7.25)}))
`],{encoding:'utf8'}));
const fixtures={
  'space-point-line-projection':{x:'√2',y:2,z:3,a:1,b:-1},
  'sphere-plane-section-radius':{R:5,d:3},'tetrahedron-intercept-volume':{a:2,b:3,c:4},
  'space-vector-coplanarity':{x:2,y:5,z:3},
  'space-cross-product':{ux:3,uy:1,uz:1,vx:0,vy:3,vz:2},
  'spatial-section-geometry':{t:1.5},'space-plane-distance':{px:1,py:2,pz:3,c:4},
  'sphere-space-coordinate':{x:1,y:2,z:1.5,R:3},'scalar-triple-product':{cx:1,cy:1,cz:2},
  'space-skew-lines':{qx:.75,qy:-1.15,qz:1.65},'cross-section-volume':{a:1.5,x:1.5},
  'plane-intersection-line':{a:2,b:-1,c:1},'line-plane-angle':{vx:2,vy:1,vz:2}
};
const docs={};
for(const [id,parameters]of Object.entries(fixtures)){
  const source=JSON.stringify(parameters);Object.freeze(parameters);const scene=B.scene(id,parameters);docs[id]=scene;
  assert.ok(scene.objects.length>=2&&scene.objects.length<=24,id);checks++;
  assert.equal(new Set(scene.objects.map(item=>item.id)).size,scene.objects.length);checks++;
  scene.objects.forEach((item,index)=>{assert.equal(item.id,'g'+index);assert.equal(item.visible,true);assert.deepEqual(G.validate(item.object),item.object);checks+=3;});
  assert.deepEqual(scene.camera,{yaw:-.72,pitch:.58,zoom:1});assert.equal(scene.wire,false);assert.equal(scene.explore,false);checks+=3;
  assert.equal(JSON.stringify(parameters),source,'Opening 3D never mutates module parameters');checks++;
  const target=new URL(B.url(id,parameters,'https://jasoart.github.io/Math/index.html?view=module#old'));
  assert.equal(target.pathname,'/Math/spatial.html');assert.equal(target.search,'');assert.ok(target.hash.startsWith('#space='));checks+=3;
  assert.deepEqual(JSON.parse(decodeURIComponent(target.hash.slice(7))),scene);checks++;
}
const objects=id=>docs[id].objects.map(item=>item.object),one=(id,type)=>objects(id).find(object=>object.type===type);
let result=G.pointLine(one('space-point-line-projection','point'),one('space-point-line-projection','line'));
closeVector(result.foot,reference.pointLineFoot,'point-line foot');close(result.distance,reference.pointLineDistance,'point-line distance');
result=G.pointPlane(one('space-plane-distance','point'),one('space-plane-distance','plane'));
closeVector(result.foot,reference.pointPlaneFoot,'point-plane foot');close(result.distance,reference.pointPlaneDistance,'point-plane distance');
result=G.spherePlane(one('sphere-plane-section-radius','sphere'),one('sphere-plane-section-radius','plane'));
close(result.radius,reference.sphereSectionRadius,'sphere section');close(result.area,reference.sphereSectionArea,'section area');
close(G.volume(one('tetrahedron-intercept-volume','polyhedron')).volume,reference.tetraVolume,'tetrahedron');
close(G.volume(one('scalar-triple-product','polyhedron')).volume,reference.tripleVolume,'parallelepiped');
const skew=objects('space-skew-lines').filter(object=>object.type==='line');close(G.linePair(...skew).distance,reference.skewDistance,'skew lines');
closeVector(objects('space-cross-product').find(object=>object.label==='u×v').direction,reference.cross,'cross product');
closeVector(objects('space-cross-product').find(object=>object.label==='projᵥu').direction,reference.projection,'projection');
close(G.polyhedronPlane(one('spatial-section-geometry','polyhedron'),one('spatial-section-geometry','plane')).area,reference.cubeSectionArea,'cube section');
close(G.pointPlane(one('space-vector-coplanarity','point'),one('space-vector-coplanarity','plane')).distance,0,'coplanarity');
close(G.linePlane(one('line-plane-angle','line'),one('line-plane-angle','plane')).angle,reference.linePlaneAngle,'line-plane angle');
close(G.revolutionVolume(one('cross-section-volume','revolution')).volume,reference.revolutionVolume,'revolution volume');
close(one('cross-section-volume','circle').radius,reference.revolutionRadius,'live revolution slice');
close(G.pointSphere(objects('sphere-space-coordinate').find(object=>object.label==='P'),one('sphere-space-coordinate','sphere')).centerDistance,reference.spherePointRadius,'point-sphere distance');
const planes=objects('plane-intersection-line').filter(object=>object.type==='plane'),intersection=G.planePair(...planes).line;
close(G.dot(intersection.direction,[1,1,2]),0,'intersection perpendicular to first normal');close(G.dot(intersection.direction,[2,-1,1]),0,'intersection perpendicular to second normal');
// Special inputs retain their geometry rather than manufacturing valid directions.
assert.equal(B.scene('line-plane-angle',{vx:0,vy:0,vz:0}).objects.filter(item=>item.object.type==='line').length,0);checks++;
assert.equal(B.scene('plane-intersection-line',{a:0,b:0,c:0}).objects.filter(item=>item.object.type==='plane').length,1);checks++;
assert.equal(B.scene('sphere-plane-section-radius',{R:1,d:2}).objects.filter(item=>item.object.type==='circle').length,0);checks++;
close(G.volume(B.scene('tetrahedron-intercept-volume',{a:0,b:3,c:4}).objects[0].object).volume,0,'degenerate tetrahedron');
const liveValue=Object.freeze({value:Math.SQRT2,source:'√2'});close(B.scene('sphere-space-coordinate',{x:liveValue,y:0,z:0,R:3}).objects[1].object.position[0],Math.SQRT2,'read-only scalar object');
assert.equal(B.scene('not-a-module',{}),null);assert.equal(B.url('not-a-module',{}),null);checks+=2;
for(const invalid of [NaN,Infinity,'1/0','<script>',{},null]){assert.throws(()=>B.scene('sphere-space-coordinate',{x:invalid,y:0,z:0,R:3}));checks++;}

// Exercise the real browser module controls and statechange events.
const root=path.resolve(__dirname,'..'),errors=[],vc=new VirtualConsole();vc.on('jsdomError',error=>errors.push(error.message));
const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'https://example.com/Math/index.html',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc}),w=dom.window;
const context=new Proxy({measureText:text=>({width:String(text).length*7}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(object,key)=>object[key]??(()=>{}),set:(object,key,value)=>(object[key]=value,true)});
Object.defineProperty(w.HTMLCanvasElement.prototype,'clientWidth',{get:()=>1100});Object.defineProperty(w.HTMLCanvasElement.prototype,'clientHeight',{get:()=>720});
w.HTMLCanvasElement.prototype.getContext=()=>context;w.HTMLCanvasElement.prototype.getBoundingClientRect=()=>({width:1100,height:720,top:0,bottom:720,left:0,right:1100});w.HTMLElement.prototype.scrollIntoView=()=>{};w.CanvasRenderingContext2D=class{};w.ResizeObserver=class{constructor(callback){this.callback=callback;}observe(){this.callback();}};w.structuredClone=structuredClone;
function load(file){new vm.Script(fs.readFileSync(path.join(root,file),'utf8'),{filename:file}).runInContext(dom.getInternalVMContext());}
let cases=0;
try{
  for(const script of w.document.querySelectorAll('script[src]'))load(script.getAttribute('src').replace(/^\.\//,''));
  if(!w.SpatialGeometry)load('spatial/geometry.js');if(!w.MathSpatialBridge)load('engine/spatial-bridge.js');
  const link=w.document.querySelector('#spatialModuleBridge a'),wrap=link.parentElement;
  assert.equal(wrap.hidden,true,'Unrelated 2D modules do not show a 3D action');checks++;
  for(const id of B.ids){
    const module=w.MathLab.modules.find(module=>module.id===id);assert.ok(module,'Supported module exists: '+id);checks++;
    const defaults=Object.fromEntries(module.controls.map(control=>[control.key,control.defaultValue])),states=[defaults];
    for(const control of module.controls)if(control.type!=='select')for(const value of [control.min,control.max])states.push({...defaults,[control.key]:value});
    for(const state of states){w.MathLab.selectModule(id,state);assert.equal(wrap.hidden,false,id+' can open current parameters');checks++;
      const actual=JSON.parse(decodeURIComponent(new URL(link.href).hash.slice(7)));
      assert.deepEqual(actual,B.scene(id,state),id+' links the currently displayed geometry');checks++;cases++;
    }
  }
  w.MathLab.selectModule('sphere-space-coordinate',{x:'√2',y:2,z:3,R:4});
  const actual=JSON.parse(decodeURIComponent(new URL(link.href).hash.slice(7)));
  close(actual.objects.find(item=>item.object.label==='P').object.position[0],Math.SQRT2,'Symbolic control uses its unrounded live value');
  const previous=link.href;w.MathLab.selectModule('sphere-space-coordinate',{x:1,y:2,z:3,R:5});assert.notEqual(link.href,previous,'Parameter changes refresh the 3D action');checks++;
  w.MathLab.selectModule('circle-line');assert.equal(wrap.hidden,true);assert.equal(link.hasAttribute('href'),false);checks+=2;
  assert.deepEqual(errors,[]);
}finally{w.close();}
process.stdout.write(`PASS ${checks} spatial bridge checks; Python-verified geometry and ${cases} live/default/boundary cases across ${B.ids.length} existing modules\n`);
