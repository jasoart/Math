/* Preserve source expressions as the authoritative value; evaluate only for drawing. */
(function(root){
  'use strict';
  const M=typeof module!=='undefined'&&module.exports?require('./math.js'):root.GraphMath;
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  function scalar(raw,{unit='rad',min=-Infinity,max=Infinity,integer=false}={}){
    if(typeof raw!=='string'&&typeof raw!=='number')throw Error('請輸入數字或常數算式。');
    const source=String(raw).trim();if(!source||source.length>240)throw Error('請輸入 1–240 字的數值算式。');
    let expression=source,value,explicitUnit=null;
    if(/(?:rad|弧度)\s*$/i.test(expression)){explicitUnit='rad';expression=expression.replace(/(?:rad|弧度)\s*$/i,'').trim();}
    else if(/(?:°|deg|度)\s*$/i.test(expression)&&unit==='deg'){explicitUnit='deg';expression=expression.replace(/(?:°|deg|度)\s*$/i,'').trim();}
    const compiled=M.compile(expression);if(compiled.variables.length)throw Error('數值欄位只能使用常數，不可含 x、y 或參數。');
    value=compiled.evaluate({});if(explicitUnit==='rad'&&unit==='deg')value=value*180/Math.PI;
    if(!Number.isFinite(value))throw Error('算式在實數範圍內未定義或超出有限值。');
    const epsilon=1e-12*Math.max(1,Math.abs(value));
    if(value<min-epsilon||value>max+epsilon)throw Error(`此欄位範圍為 ${min} 到 ${max}。`);
    if(integer&&Math.abs(value-Math.round(value))>epsilon)throw Error('此欄位代表數量，結果必須是整數（例如 √4）。');
    if(integer)value=Math.round(value);
    return {source,value,tree:compiled.tree,unit,explicitUnit};
  }
  function nodeXML(n){
    const wrap=x=>'<mrow><mo>(</mo>'+x+'<mo>)</mo></mrow>';
    if(n.kind==='number')return '<mn>'+esc(n.value)+'</mn>';
    if(n.kind==='constant')return '<mi>'+ (n.name==='pi'?'π':'e')+'</mi>';
    if(n.kind==='variable')return '<mi>'+esc(n.name)+'</mi>';
    if(n.kind==='unary')return '<mrow><mo>'+ (n.op==='-'?'−':'+')+'</mo>'+nodeXML(n.child)+'</mrow>';
    if(n.kind==='degree')return '<msup>'+wrap(nodeXML(n.child))+'<mo>°</mo></msup>';
    if(n.kind==='comparison')return '<mrow>'+n.args.map((a,i)=>(i?'<mo>'+esc(n.ops[i-1])+'</mo>':'')+nodeXML(a)).join('')+'</mrow>';
    if(n.kind==='call'){
      if(n.name==='sqrt')return '<msqrt>'+nodeXML(n.args[0])+'</msqrt>';
      if(n.name==='cbrt')return '<mroot>'+nodeXML(n.args[0])+'<mn>3</mn></mroot>';
      if(n.name==='abs')return '<mrow><mo>|</mo>'+nodeXML(n.args[0])+'<mo>|</mo></mrow>';
      return '<mrow><mi>'+esc(n.name)+'</mi>'+wrap(n.args.map(nodeXML).join('<mo>,</mo>'))+'</mrow>';
    }
    if(n.op==='/')return '<mfrac>'+nodeXML(n.left)+nodeXML(n.right)+'</mfrac>';
    if(n.op==='^')return '<msup>'+wrap(nodeXML(n.left))+nodeXML(n.right)+'</msup>';
    const child=n=>n.kind==='binary'?wrap(nodeXML(n)):nodeXML(n);
    return '<mrow>'+child(n.left)+'<mo>'+esc(n.op==='*'?'·':n.op==='-'?'−':n.op)+'</mo>'+child(n.right)+'</mrow>';
  }
  function markup(source){try{const unit=String(source).match(/\s*(rad|弧度|deg|度)\s*$/i),body=unit?String(source).slice(0,unit.index):source;return '<math xmlns="http://www.w3.org/1998/Math/MathML" aria-label="'+esc(source)+'">'+nodeXML(M.compile(body).tree)+(unit?'<mtext> '+esc(unit[1])+'</mtext>':'')+'</math>';}catch{return '<span>'+esc(source)+'</span>';}}
  const api={scalar,markup,escape:esc};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MathExact=api;
})(typeof globalThis!=='undefined'?globalThis:this);
