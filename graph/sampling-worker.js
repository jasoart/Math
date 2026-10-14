'use strict';
importScripts('./math.js','./render.js');
self.onmessage=e=>{
  const {generation,config,expressions}=e.data;
  try{
    if(!Array.isArray(expressions)||expressions.length>12)throw Error('Invalid sampling batch');
    const results=expressions.map(text=>{
      const c=GraphMath.parse(text),at=(x,y)=>c.at(x,y,config.params),options={quality:config.quality},v=config.view;
      const geometry=c.kind==='function'?GraphRender.sampleFunction(x=>at(x),v,options):['implicit','inequality'].includes(c.kind)?GraphRender.contourImplicit((x,y)=>at(x,y),v,options):GraphRender.sampleParametric(t=>at(t),config.t[0],config.t[1],v,options);
      return {text,geometry};
    });
    self.postMessage({generation,results});
  }catch(error){self.postMessage({generation,error:error.message});}
};
