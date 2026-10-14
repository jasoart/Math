'use strict';
importScripts('./math.js','./dynamics.js');
self.onmessage=e=>{try{self.postMessage({id:e.data.id,result:self.GraphDynamics.compute(e.data.config)});}catch(error){self.postMessage({id:e.data.id,error:error.message});}};
