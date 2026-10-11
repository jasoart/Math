'use strict';
const assert=require('node:assert/strict');
const M=require('../graph/math.js'),S=require('../graph/state.js'),SVG=require('../graph/svg.js');
let checks=0;
const eq=(a,b,tol=1e-6)=>{assert.ok(Math.abs(a-b)<=tol,`${a} ≠ ${b}`);checks++;};
const f=s=>x=>M.parse(s).at(x,0,{a:2,b:1,c:0,d:3,h:2,k:-1});
for(const [text,x,y]of [
  ['if(x<0,-x,x^2)',-2,2],['if(x<0,-x,x^2)',3,9],
  ['if(x>=0,sqrt(x),sqrt(-x))',-4,2],['if(x=0,1,sin(x)/x)',0,1],
  ['if(x<0,-1,if(x=0,0,1))',0,0],['cbrt(x)',-8,-2],['y=d(x-h)^2+k',3,2],
  ['if(-2<x<=3,1,0)',-3,0],['if(-2<x<=3,1,0)',3,1],['if(x>0&&x<3,1,0)',2,1],
  ['if(x<0||x>3,1,0)',2,0],['sec(x)',0,1],['cosh(x)',0,1]
])eq(f(text)(x),y);
assert.ok(Number.isNaN(f('sqrt(x) {0<=x<=4}')(-1)));checks++;
eq(f('sqrt(x) {0<=x<=4}')(4),2);
assert.ok(Number.isNaN(f('x {sqrt(-1)>0}')(2)));checks++;
assert.ok(Number.isNaN(f('if(sqrt(-1)>0,1,2)')(2)));checks++;
for(const [s,point,inside]of [['x^2+y^2≤9',[0,0],true],['x^2+y^2<9',[3,0],false],['y>x+1',[0,2],true],['y>x+1',[0,1],false]]){const p=M.parse(s);assert.equal(p.kind,'inequality');assert.equal(p.contains(p.at(...point)),inside);checks++;}
for(const s of ['if(x,1)','if(x,1,2,3)','x {x>0','y=x {y>0}','y=x {x>0}{x<1}','0<x<3','x.__proto__','this','constructor','alert(1)','x;process.exit()']){assert.throws(()=>M.parse(s));checks++;}
for(const [fn,a,b,expected,absolute]of [[x=>x*x,0,3,9,false],[Math.sin,0,Math.PI,2,false],[x=>x**3-x,-1,2,2.25,false],[x=>x**3-x,-1,2,2.75,true],[x=>2+x,0,4,16,false],[x=>x*x,3,0,-9,false],[x=>x,1,-1,1,true],[Math.abs,-1,1,1,false],[x=>x*x,2,2,0,false],[x=>x<.3?1:2,0,1,1.7,false]]){const r=M.integrate(fn,a,b,{absolute});assert.ok(r.converged,JSON.stringify(r));eq(r.value,expected);}
for(const [fn,a,b]of [[x=>1/x,-1,1],[x=>1/(x-.123),-1,1],[x=>1/(x-.123)**2,-1,1],[Math.log,0,1],[Math.sqrt,-1,1]]){assert.equal(M.integrate(fn,a,b).converged,false);checks++;}
eq(M.slope(x=>x*x,3),6);assert.ok(Number.isNaN(M.slope(Math.abs,0)));checks++;
assert.ok(Number.isNaN(M.slope(x=>1/x,0)));checks++;
assert.deepEqual(M.roots(()=>1e-12,-5,5),[]);checks++;
assert.equal(M.analyze(()=>1e-12,-5,5).allZero,false);checks++;
const tiny=M.roots(x=>1e-12*(x-.123),-5,5);assert.equal(tiny.length,1);eq(tiny[0],.123);
for(const power of [2,4]){const roots=M.roots(x=>(x-.123456)**power,-5,5);assert.equal(roots.length,1);eq(roots[0],.123456);}
const base=S.defaults(),migrated=S.validate({...base,version:1,params:{a:1,b:2,c:3},ranges:undefined});
assert.equal(migrated.version,3);assert.equal(migrated.params.d,1);checks++;
assert.deepEqual(S.validate(JSON.parse(JSON.stringify(base))),base);checks++;
for(const changed of [{version:4},{rows:[]},{rows:Array(13).fill(base.rows[0])},{params:{a:Infinity,b:1,c:1}},{view:{x:0,y:0,span:0}},{ranges:{a:[2,1,.1]}},{ranges:{a:[0,1,0]}},{rows:[{text:'x',visible:true,color:'url(bad)'}]},{t:[1,0]}]){assert.throws(()=>S.validate({...base,...changed}));checks++;}
const named={...base,rows:[{...base.rows[0],label:'頂點 <A> & B'}],display:{labels:'all',quality:'precise',legend:false}};
assert.deepEqual(S.validate(JSON.parse(JSON.stringify(named))),named);checks++;
const oldDocument={...base};delete oldDocument.display;oldDocument.rows=oldDocument.rows.map(({label,...row})=>row);
assert.equal(S.validate(oldDocument).display.labels,'smart');assert.equal(S.validate(oldDocument).rows[0].label,'');checks+=2;
for(const change of [{display:{labels:'bad',quality:'precise',legend:true}},{display:{labels:'all',quality:'bad',legend:true}},{rows:[{...base.rows[0],label:'x'.repeat(61)}]},{rows:[{...base.rows[0],label:42}]}]){assert.throws(()=>S.validate({...base,...change}));checks++;}
const hist=new S.History(base),next={...base,grid:false};hist.commit(next);hist.commit(next);assert.equal(hist.items.length,2);assert.equal(hist.undo().grid,true);assert.ok(hist.canRedo);assert.equal(hist.redo().grid,false);hist.undo();hist.commit({...base,t:[0,1]});assert.ok(!hist.canRedo);checks+=4;
const svg=new SVG(100,100);svg.fillText('<script>&"',2,3);svg.save();svg.beginPath();svg.rect(0,0,100,100);svg.clip();svg.restore();const xml=svg.toString();assert.ok(!xml.includes('<script>'));assert.ok(xml.includes('&lt;script&gt;&amp;&quot;'));assert.equal((xml.match(/<g /g)||[]).length,(xml.match(/<\/g>/g)||[]).length);checks+=3;
console.log(`PASS ${checks} Pro math, integration, document and history checks`);
