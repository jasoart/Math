'use strict';
const assert=require('node:assert/strict'),G=require('../curriculum/geometry.js'),S=require('../graph/study.js'),M=require('../graph/math.js'),I=require('../graph/insight.js'),W=require('../curriculum/modules.js'),Catalog=require('../curriculum/catalog.js');
let checks=0;const close=(a,b,tol=1e-9)=>{assert.ok(Number.isFinite(a)&&Math.abs(a-b)<=tol*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);checks++;};
for(const h of [-3,0,2])for(const k of [-2,0,4])for(const r of [1,2,3]){
 for(const [px,py,count]of [[h,k,0],[h+r,k,1],[h+r*3,k+r,2]]){
 const result=G.circleTangents(h,k,r,px,py);assert.equal(result.contacts.length,count);checks++;
 for(const p of result.contacts){close(Math.hypot(p.x-h,p.y-k),r);close((p.x-h)*(px-p.x)+(p.y-k)*(py-p.y),0);}
 for(const row of result.graphRows)M.parse(row.text);
 }}
assert.throws(()=>G.circleTangents(0,0,0,3,3));assert.throws(()=>G.triangle(0,0,1,1,2,2));checks+=2;
// Exact rational circumcenters from independent 3x3 determinant identities.
const det3=(a,b,c)=>a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]);
for(let i=1;i<=20;i++){
 const p=[[0,0],[i+1,1],[2,i+3]],rows=p.map(([x,y])=>[BigInt(x),BigInt(y),1n]),s=p.map(([x,y])=>BigInt(x*x+y*y));
 const d=2n*det3(...rows),dx=det3(...rows.map((r,i)=>[s[i],r[1],1n])),dy=det3(...rows.map((r,i)=>[r[0],s[i],1n]));
 const t=G.triangle(...p.flat());close(t.centers.O[0],Number(dx)/Number(d));close(t.centers.O[1],Number(dy)/Number(d));
 const [ox,oy]=t.centers.O,[gx,gy]=t.centers.G,[hx,hy]=t.centers.H;close(hx-ox,3*(gx-ox));close(hy-oy,3*(gy-oy));
 close((hx-p[0][0])*(p[2][0]-p[1][0])+(hy-p[0][1])*(p[2][1]-p[1][1]),0);for(const row of t.graphRows)M.parse(row.text);
}
const fit=G.regression('1,2\n2,4\n3,5\n4,8\n5,9');close(fit.slope,1.8);close(fit.intercept,0.2);close(fit.sse,0.8);close(fit.rows.reduce((a,r)=>a+r[3],0),0);close(fit.rows.reduce((a,r)=>a+r[0]*r[3],0),0);
assert.equal(G.regression('1,2\n2,2').r2,null);assert.throws(()=>G.regression('1,2\n1,3'));assert.throws(()=>G.parseData('1,2\n<script>,3'));assert.throws(()=>G.parseData('1,2\n0x10,2'));checks+=4;
for(const n of [1,2,10,50,100]){
 close(G.riemann('x^2',{},0,1,n,'left').value,(n-1)*(2*n-1)/(6*n*n));
 close(G.riemann('x^2',{},0,1,n,'right').value,(n+1)*(2*n+1)/(6*n*n));
 close(G.riemann('x^2',{},0,1,n,'midpoint').value,1/3-1/(12*n*n));
 close(G.riemann('x^2',{},0,1,n,'trapezoid').value,1/3+1/(6*n*n));
 close(G.riemann('-x^2',{},0,1,n,'left').value,-(n-1)*(2*n-1)/(6*n*n));
}
for(const args of [['x',{},2,1,5,'left'],['x',{},0,1,101,'left'],['1/x',{},-1,1,1,'midpoint'],['1e308',{},0,10,1,'left']]){assert.throws(()=>G.riemann(...args));checks++;}
for(const [s,zeros,excluded]of [['x^2-1',[-1,1],[]],['(x^2-1)/(x-1)',[-1],[1]],['1/x',[],[0]],['(x-1)^2',[1],[]],['(x-1)/(x-1)',[],[1]],['0',[],[]]]){
 const r=S.signChart(s,{},-3,3,'>=');assert.deepEqual(r.zeros,zeros);assert.deepEqual(r.excluded,excluded);checks+=2;
 for(const p of r.parts){if(p.excluded){assert.equal(p.accepted,false);checks++;continue;}const x=p.point?p.from:(p.from+p.to)/2,v=M.parse(s).at(x);if(p.point&&zeros.includes(x))assert.equal(p.sign,0);else assert.equal(p.accepted,v>=0);checks++;}
}
for(const source of ['sin(x)','x^3-1','x {x>0}','1/0','1e-320*x']){assert.throws(()=>S.signChart(source,{},source==='1e-320*x'?1e-7:-2,source==='1e-320*x'?2e-7:2));checks++;}
assert.equal(S.variation('x^3',{},-2,2).extrema.length,0);assert.equal(S.variation('x^2',{},-2,2).extrema[0].type,'局部極小');checks+=2;
close(S.limits('(x^2-1)/(x-1)',{},1,.1).limit,2);assert.equal(S.limits('(x^2-1)/(x-1)',{},1,.1).value,null);assert.equal(S.limits('sin(1/x)',{},0,.1).limit,null);checks+=2;
assert.equal(S.tangent('abs(x)',{},0,.5).slope,null);assert.equal(S.tangent('x^2',{},0,1).graphRows.length,5);checks+=2;
for(const row of S.tangent('1e-310*x',{},0,1).graphRows)M.parse(row.text);
const features=S.features('(x^2-1)/(x-1)');close(features.holes[0].x,1);close(features.holes[0].y,2);close(S.features('(x^2+1)/x').oblique.slope,1);
const comparisons=M.parse('if(x<0,-x,x^2)');for(const x of [-2,0,2])close(M.parse(I.expression(comparisons)).at(x),comparisons.at(x));
const mods=W.create(()=>{});assert.equal(mods.length,324);assert.equal(new Set(mods.map(m=>m.id)).size,324);assert.equal(new Set(Catalog.groups.flatMap(g=>g.items.map(t=>t.source))).size,324);checks+=3;
let cases=0;
for(const m of mods){const s=Object.fromEntries(m.controls.map(c=>[c.key,c.value]));const states=[s];for(const c of m.controls)for(const v of [c.min,c.max])states.push({...s,[c.key]:v});for(const state of states){const model=m.compute(state);assert.equal(model.graphRows.length,1);const parsed=M.parse(model.graphRows[0].text);assert.equal(model.params.a,state.a);assert.ok(model.lines.length>=4);for(const p of model.scene.points)assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));for(const l of model.scene.lines)assert.ok([l.a.x,l.a.y,l.b.x,l.b.y].every(Number.isFinite));cases++;}}
for(const [s,fn]of [['exp(x)',x=>Math.exp(x)],['x^2',x=>x*x],['if(x<0,-x,x^2)',x=>x<0?-x:x*x]]){const p=M.parse(W.transformed(s));for(const x of [-2,0,2,3])close(p.at(x,0,{a:2,h:1,k:-3}),2*fn(x-1)-3);}
const restricted=M.parse(W.transformed('x^2 {x>=0}'));assert.ok(Number.isNaN(restricted.at(0,0,{a:2,h:1,k:3})));close(restricted.at(2,0,{a:2,h:1,k:3}),5);
console.log(`PASS high-school math: ${checks} independent invariants/edge checks; all ${mods.length} experiments and ${cases} default/endpoint cases.`);
