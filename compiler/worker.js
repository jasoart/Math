/* Only compiles source to text. User-generated output is never executed here. */
'use strict';
importScripts('./runtime.js','./compiler.js');
self.onmessage=event=>{const {id,source}=event.data||{};try{if(typeof source!=='string')throw Error('請提供文字原始碼。');self.postMessage({id,code:MathWebCompiler.compile(source)});}catch(error){self.postMessage({id,error:error.message});}};
