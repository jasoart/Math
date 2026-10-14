/* Latest-scene-only refinement; interaction and exports remain deterministic. */
(() => {
  'use strict';
  window.GraphRefiner={create(redraw){
    let available=typeof Worker==='function',worker=null,scene='',generation=0,timer,deadline,config,started=false;
    const requested=new Set(),cache=new Map();
    function cancel(){clearTimeout(timer);clearTimeout(deadline);worker?.terminate();worker=null;generation++;started=false;requested.clear();}
    function fail(){cancel();available=false;redraw();}
    function begin(){
      if(!requested.size||!available)return;started=true;const ticket=generation;
      try{worker=new Worker('./graph/sampling-worker.js');worker.onerror=fail;worker.onmessage=e=>{if(e.data.generation!==generation)return;if(e.data.error){fail();return;}clearTimeout(deadline);for(const {text,geometry}of e.data.results){if(cache.size>=48)cache.delete(cache.keys().next().value);cache.set(scene+'|'+text,geometry);}worker?.terminate();worker=null;redraw();};worker.postMessage({generation:ticket,config,expressions:[...requested]});deadline=setTimeout(fail,5000);}catch{fail();}
    }
    return {get available(){return available;},get(sceneKey,text,next){
      if(!available)return null;
      const found=cache.get(sceneKey+'|'+text);if(found)return found;
      if(sceneKey!==scene){cancel();scene=sceneKey;config=next;}
      if(!started){requested.add(text);clearTimeout(timer);timer=setTimeout(begin,90);}
      return null;
    },close(){cancel();scene='';}};
  }};
})();
