/* Bounded planar dynamics: vector sampling and adaptive RK4 with step doubling. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./math.js'):root.GraphMath);if(typeof module==='object'&&module.exports)module.exports=api;root.GraphDynamics=api;})(typeof globalThis==='object'?globalThis:this,function(M){
  'use strict';
  const finite=Number.isFinite;
  function validate(c){
    if(!c||typeof c.p!=='string'||typeof c.q!=='string')throw Error('請輸入 dx/dt 與 dy/dt。');
    M.compile(c.p);M.compile(c.q);
    const view=c.view;if(!view||!['xmin','xmax','ymin','ymax','width','height'].every(k=>finite(view[k]))||view.xmax<=view.xmin||view.ymax<=view.ymin||view.width<=0||view.height<=0)throw Error('視窗無效。');
    if(!Number.isInteger(c.density)||c.density<8||c.density>32)throw Error('密度須介於 8–32。');
    if(!finite(c.duration)||c.duration<=0||c.duration>40)throw Error('積分時間須介於 0–40。');
    if(!Array.isArray(c.seeds)||c.seeds.length>12||c.seeds.some(s=>!Array.isArray(s)||s.length!==2||!s.every(n=>finite(n)&&Math.abs(n)<=1e6)))throw Error('最多 12 個有限初始點，座標須在 ±10⁶ 內。');
    const params={};for(const k of ['a','b','c','d','h','k']){params[k]=c.params?.[k]??1;if(!finite(params[k]))throw Error('參數無效。');}
    return {...c,view:{...view},params,seeds:c.seeds.map(s=>[...s])};
  }
  function rk4(f,p,t,h){
    const add=(a,b,s)=>[a[0]+b[0]*s,a[1]+b[1]*s],a=f(p,t),b=f(add(p,a,h/2),t+h/2),c=f(add(p,b,h/2),t+h/2),d=f(add(p,c,h),t+h);
    return [p[0]+h*(a[0]+2*b[0]+2*c[0]+d[0])/6,p[1]+h*(a[1]+2*b[1]+2*c[1]+d[1])/6];
  }
  function integrate(f,seed,duration,{tolerance=1e-6,maxSteps=5000}={}){
    if(!seed.every(finite)||!finite(duration)||duration===0||!finite(tolerance)||tolerance<=0||!Number.isInteger(maxSteps)||maxSteps<1||maxSteps>10000)throw Error('積分設定無效。');
    const sign=Math.sign(duration),end=Math.abs(duration);let t=0,p=[...seed],h=sign*Math.min(.025,end),attempts=0,rejected=0,maxError=0,reason='complete';const points=[[...p,0]];
    while(Math.abs(t)<end-1e-12&&attempts++<maxSteps){
      h=sign*Math.min(Math.abs(h),end-Math.abs(t));
      const whole=rk4(f,p,t,h),half=rk4(f,rk4(f,p,t,h/2),t+h/2,h/2);
      if(![...whole,...half].every(finite)){reason='undefined';break;}
      if(half.some(n=>Math.abs(n)>1e6)){reason='escaped';break;}
      const err=Math.hypot(whole[0]-half[0],whole[1]-half[1])/15,scale=tolerance*(1+Math.hypot(...half));
      if(err>scale){if(Math.abs(h)<=1e-7){reason='precision';break;}h*=Math.max(.1,.8*(scale/err)**.2);rejected++;continue;}
      p=half;t+=h;maxError=Math.max(maxError,err);points.push([...p,t]);
      h=sign*Math.min(.15,Math.abs(h)*Math.min(2,Math.max(.5,err? .9*(scale/err)**.2:2)));
    }
    if(Math.abs(t)<end-1e-12&&reason==='complete')reason='budget';
    return {points,reason,steps:points.length-1,rejected,maxError};
  }
  function compute(input){
    const c=validate(input),p=M.compile(c.p),q=M.compile(c.q),at=(xy,t)=>{const scope={...c.params,x:xy[0],y:xy[1],t};return [p.evaluate(scope),q.evaluate(scope)];},v=c.view,arrows=[];
    const nx=c.density,ny=Math.max(6,Math.min(32,Math.round(nx*v.height/v.width))),dx=(v.xmax-v.xmin)/nx,dy=(v.ymax-v.ymin)/ny;
    for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
      const x=v.xmin+(i+.5)*dx,y=v.ymin+(j+.5)*dy,[u,w]=at([x,y],0),speed=Math.hypot(u,w);
      if([u,w,speed].every(finite)&&speed>1e-12)arrows.push([x,y,u,w,speed]);
    }
    const traces=c.seeds.flatMap((seed,index)=>[-1,1].map(sign=>({...integrate(at,seed,sign*c.duration),seed:index,direction:sign})));
    return {arrows,traces,seeds:c.seeds,cell:Math.min(v.width/nx,v.height/ny),evaluations:arrows.length+traces.reduce((n,t)=>n+12*(t.steps+t.rejected),0),timeDependent:p.variables.includes('t')||q.variables.includes('t')};
  }
  return Object.freeze({validate,rk4,integrate,compute});
});
