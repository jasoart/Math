/* Versioned, whitelisted graph documents. v1 links remain readable. */
(function(root){
  'use strict';
  const X=typeof module!=='undefined'&&module.exports?require('./exact.js'):root.MathExact;
  const colors=['#2166d1','#db6b28','#098675','#9b4cc2','#c03967','#74721a','#307f9b','#755b49','#7953db','#bd3745','#057a9c','#596a31'];
  const keys=['a','b','c','d','h','k'];
  const defaults=()=>({version:3,paramText:{a:"1",b:"1",c:"0",d:"1",h:"0",k:"0"},tText:["0","2π"],viewText:{x:"0",y:"0",span:"14"},rangeText:Object.fromEntries(keys.map(k=>[k,["-10","10","0.1"]])),rows:[{text:'y=x^2-2',visible:true,color:colors[0]},{text:'y=x+1',visible:true,color:colors[1]}],params:{a:1,b:1,c:0,d:1,h:0,k:0},ranges:Object.fromEntries(keys.map(k=>[k,[-10,10,.1]])),view:{x:0,y:0,span:14},t:[0,2*Math.PI],grid:true});
  const finite=Number.isFinite;
  function validate(s){
    if(!s||![1,2,3].includes(s.version)||!Array.isArray(s.rows)||s.rows.length<1||s.rows.length>12)throw Error('圖形資料格式無效。');
    if(s.rows.some(r=>!r||typeof r.text!=='string'||r.text.length>480||typeof r.visible!=='boolean'||(r.color!==undefined&&!/^#[0-9a-f]{6}$/i.test(r.color))))throw Error('算式或顏色資料無效。');
    const d=defaults();
    if(s.version<3)s={...s,paramText:undefined,tText:undefined,rangeText:undefined,viewText:undefined};
    if(!s.params||!['a','b','c'].every(k=>finite(s.params[k])&&Math.abs(s.params[k])<=10000))throw Error('參數超出範圍。');
    for(const k of keys){const v=s.params[k]??d.params[k];if(!finite(v)||Math.abs(v)>10000)throw Error('參數超出範圍。');d.params[k]=v;}
    if(!s.view||!['x','y','span'].every(k=>finite(s.view[k]))||s.view.span<.001||s.view.span>1e6||Math.abs(s.view.x)>1e9||Math.abs(s.view.y)>1e9)throw Error('視窗設定無效。');
    if(!Array.isArray(s.t)||s.t.length!==2||!s.t.every(finite)||s.t[1]<=s.t[0]||s.t.some(v=>Math.abs(v)>1e5))throw Error('參數範圍無效。');
    for(const k of keys){const r=s.ranges?.[k]??d.ranges[k];if(!Array.isArray(r)||r.length!==3||!r.every(finite)||r[0]>=r[1]||r[2]<=0||r[2]>r[1]-r[0]||r.slice(0,2).some(v=>Math.abs(v)>10000))throw Error('滑桿範圍無效。');d.ranges[k]=[...r];}
    const numericText=(raw,value,options)=>X.scalar(raw===undefined?String(value):raw,options);
    for(const k of keys){const p=numericText(s.paramText?.[k],d.params[k],{min:-10000,max:10000});d.params[k]=p.value;d.paramText[k]=p.source;
      d.rangeText[k]=d.ranges[k].map((v,i)=>numericText(s.rangeText?.[k]?.[i],v,{min:i===2?Number.MIN_VALUE:-10000,max:i===2?20000:10000}).source);
      d.ranges[k]=d.rangeText[k].map(v=>X.scalar(v).value);const r=d.ranges[k];if(r[0]>=r[1]||r[2]<=0||r[2]>r[1]-r[0])throw Error('滑桿範圍無效。');
    }
    const t=s.t.map((v,i)=>numericText(s.tText?.[i],v,{min:-100000,max:100000}));if(t[1].value<=t[0].value)throw Error('參數範圍無效。');
    d.t=t.map(v=>v.value);d.tText=t.map(v=>v.source);
    for(const k of ['x','y','span']){const v=numericText(s.viewText?.[k],s.view[k],{min:k==='span'?.001:-1e9,max:k==='span'?1e6:1e9});d.view[k]=v.value;d.viewText[k]=v.source;}
    return {...d,rows:s.rows.map((r,i)=>({text:r.text,visible:r.visible,color:r.color||colors[i]})),grid:s.grid!==false};
  }
  class History{
    constructor(state){this.items=[JSON.stringify(state)];this.index=0;}
    commit(state){const s=JSON.stringify(state);if(s===this.items[this.index])return;this.items.splice(this.index+1);this.items.push(s);if(this.items.length>60)this.items.shift();this.index=this.items.length-1;}
    undo(){if(this.index>0)this.index--;return JSON.parse(this.items[this.index]);}
    redo(){if(this.index<this.items.length-1)this.index++;return JSON.parse(this.items[this.index]);}
    get canUndo(){return this.index>0;}
    get canRedo(){return this.index<this.items.length-1;}
  }
  const api={colors,keys,defaults,validate,History};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GraphState=api;
})(typeof globalThis!=='undefined'?globalThis:this);
