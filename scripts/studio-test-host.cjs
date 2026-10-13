/* DOM-only adapter tests. No real-browser, layout, GPU, service-worker or touch claims. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{JSDOM,VirtualConsole}=require('jsdom');
module.exports=function host(page){
 const root=path.resolve(__dirname,'..'),errors=[],downloads=[],blobs=new Map(),vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(fs.readFileSync(path.join(root,page),'utf8'),{url:'https://example.test/Math/'+page,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc}),w=dom.window,d=w.document;
 const context=new Proxy({setLineDash(){},measureText:s=>({width:String(s).length*7}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(...args)=>{for(const x of args)if(typeof x==='number')assert.ok(Number.isFinite(x),'nonfinite canvas '+String(k));},set:(o,k,v)=>(o[k]=v,true)});
 w.HTMLCanvasElement.prototype.getContext=()=>context;w.HTMLCanvasElement.prototype.getBoundingClientRect=()=>({width:800,height:500,left:0,top:0,right:800,bottom:500});w.HTMLCanvasElement.prototype.setPointerCapture=()=>{};
 Object.defineProperty(w.HTMLCanvasElement.prototype,'clientWidth',{get:()=>800});Object.defineProperty(w.HTMLCanvasElement.prototype,'clientHeight',{get:()=>500});
 w.HTMLCanvasElement.prototype.toBlob=cb=>cb(new Blob(['PNG']));w.HTMLElement.prototype.scrollIntoView=()=>{};w.CanvasRenderingContext2D=class{};w.structuredClone=structuredClone;
 w.ResizeObserver=class{constructor(cb){this.cb=cb;}observe(){this.cb();}};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 w.Blob=Blob;w.URL.createObjectURL=b=>{const url='blob:test'+blobs.size;blobs.set(url,b);return url;};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){downloads.push({name:this.download,blob:blobs.get(this.href)});};
 w.fetch=async url=>{const file=path.resolve(root,String(url).replace(/^\.\//,''));return{ok:fs.existsSync(file),text:async()=>fs.readFileSync(file,'utf8'),json:async()=>JSON.parse(fs.readFileSync(file,'utf8'))};};
 w.addEventListener('error',e=>errors.push(e.message));
 function load(file){new vm.Script(fs.readFileSync(path.join(root,file),'utf8'),{filename:file}).runInContext(dom.getInternalVMContext());}
 const $=id=>d.getElementById(id),input=(id,value)=>{const el=typeof id==='string'?$(id):id;el.value=String(value);el.dispatchEvent(new w.Event('input',{bubbles:true}));el.dispatchEvent(new w.Event('change',{bubbles:true}));};
 return{root,dom,w,d,$,errors,downloads,load,input,wait:ms=>new Promise(r=>setTimeout(r,ms)),close:()=>w.close()};
};
