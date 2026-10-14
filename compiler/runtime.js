/* MathScript Web host ABI: collections, text, arithmetic and bounded execution.
 * This file has no lexer, parser, code generator, eval or Function constructor. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MathWebRuntime=api;})(globalThis,function(){
'use strict';
const forbidden=new Set(['__proto__','prototype','constructor','caller','callee','arguments']);
const key=k=>{if((typeof k!=='string'&&typeof k!=='number')||forbidden.has(String(k)))throw Error('不允許的欄位：'+String(k));return k;};
function located(location, message) { throw Error(location + '：' + message); }
let fuel=5000000,depth=0;
const R={
 run(fn){if(depth===0)fuel=5000000;if(depth>=512)throw Error("MathScript Web 呼叫深度超出上限。");depth++;try{return fn();}finally{depth--;}},
 tick(){if(--fuel<0)throw Error('MathScript Web 運算步數超過上限。');},
 range(mode,start,end,step,term,location){return R.run(()=>{
   try {
     if(!['sum','product','collect'].includes(mode))throw Error('未知的區間運算。');
     if(![start,end,step].every(Number.isFinite)||Math.abs(start)>1000000||Math.abs(end)>1000000||step===0)
       throw Error('區間端點須為 ±1000000 內的有限實數，步長須為非零有限實數。');
     const distance=(end-start)/step,limit=mode==='collect'?2048:10000;
     if((step>0&&end<start)||(step<0&&end>start))return mode==='collect'?[]:mode==='product'?1:0;
     const tolerance=8*Number.EPSILON*Math.max(1,Math.abs(distance));
     const count=Math.floor(distance+tolerance)+1;
     if(!Number.isSafeInteger(count)||count>limit)throw Error('區間最多 '+limit+' 項。');
     let total=mode==='product'?1:0,correction=0,previous;const out=[];
     for(let i=0;i<count;i++){
       R.tick();
       const x=i>0&&Math.abs(i-distance)<=tolerance?end:start+i*step;
       if(!Number.isFinite(x)||(i>0&&x===previous))throw Error('步長小於浮點解析度，無法可靠取樣。');
       previous=x;const value=term(x);
       if(mode==='collect'){out.push(value);continue;}
       if(!Number.isFinite(value))throw Error('加總／連乘的每一項必須是有限實數。');
       if(mode==='product')total*=value;
       else {const next=total+value;correction+=Math.abs(total)>=Math.abs(value)?(total-next)+value:(value-next)+total;total=next;}
       if(!Number.isFinite(total)||!Number.isFinite(correction))throw Error('區間運算溢位。');
     }
     if(mode==='collect')return out;
     const result=total+correction;
     if(!Number.isFinite(result))throw Error('區間運算溢位。');
     return result;
   }catch(error){if(/^第 \d+ 行，第 \d+ 欄：/.test(error.message))throw error;located(location,error.message);}
 });},
 assertMath(condition,label,location){
   if(typeof label!=='string')located(location,'驗證標籤必須是文字。');
   if(typeof condition!=='boolean'&&!Number.isFinite(condition))located(location,'驗證條件必須是布林或有限實數。');
   if(!condition)located(location,'驗證失敗：'+label);
   return true;
 },
 expose(api){const out=Object.create(null);for(const k of Object.keys(api)){key(k);const v=api[k];out[k]=typeof v==='function'?function(...args){return R.run(()=>v(...args));}:v;}return Object.freeze(out);},
 get:(o,k)=>{key(k);if(o==null)throw Error('不能讀取空值。');if(typeof o==='string'&&k==='length')return o.length;return Object.hasOwn(Object(o),k)?o[k]:null;},
 put:(o,k,v)=>{key(k);if(o===null||typeof o!=='object')throw Error('只能修改集合或紀錄。');if(Array.isArray(o)&&(!Number.isInteger(k)||k<0||k>100000))throw Error('陣列索引超出範圍。');o[k]=v;return v;},
 record:pairs=>{const o=Object.create(null);for(const [k,v]of pairs){key(k);o[k]=v;}return o;},
 length:o=>o.length,
 push:(a,v)=>{if(!Array.isArray(a)||a.length>=100000)throw Error('集合超出上限。');a.push(v);return a;},
 pop:a=>a.pop(), slice:(s,a,b)=>s.slice(a,b==null?undefined:b),
 join:(a,s)=>a.join(s),split:(s,sep)=>String(s).split(sep),trim:s=>s.trim(),
 replace:(s,a,b)=>String(s).split(a).join(b),
 json:o=>JSON.stringify(o),parseJson:s=>JSON.parse(s),str:o=>String(o),num:o=>Number(o),
 keys:o=>Object.keys(o),isArray:Array.isArray,finite:Number.isFinite,integer:Number.isInteger,
 floor:Math.floor,ceil:Math.ceil,round:Math.round,abs:Math.abs,sqrt:Math.sqrt,pow:Math.pow,sin:Math.sin,cos:Math.cos,tan:Math.tan,log:Math.log,exp:Math.exp,min:Math.min,max:Math.max,hypot:Math.hypot,
 fail:s=>{throw Error(String(s));}
};return Object.freeze(R);
});
