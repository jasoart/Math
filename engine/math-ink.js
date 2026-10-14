/* MathInk 1.0 — original bounded notation parser, box layout, SVG + MathML renderer.
 * No TeX engine, HTML interpretation, remote fonts, or expression evaluation. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MathInk = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const cache = new Map(), metrics = new Map(), esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const font='Cambria Math, STIX Two Math, Georgia, serif';
  let measure=null;
  // Browser-native glyph metrics; layout itself remains entirely MathInk's.
  try{if(typeof OffscreenCanvas==='function')measure=new OffscreenCanvas(1,1).getContext('2d');else if(typeof document==='object')measure=document.createElement('canvas').getContext('2d');}catch{}
  const ops = {'*':'·','-':'−','<=':'≤','>=':'≥','!=':'≠','==':'=','&&':'∧','||':'∨'};
  const names = {pi:'π',theta:'θ',alpha:'α',beta:'β',infinity:'∞'};
  const prec = {'||':1,'&&':2,'=':5,'==':5,'!=':5,'<':5,'>':5,'<=':5,'>=':5,'+':10,'-':10,'*':20,'/':20,'^':30,'_':31};
  const round = n => Number(n.toFixed(3));
  function parse(input) {
    if (typeof input !== 'string' || !input.trim() || input.length > 1200) throw Error('公式須介於 1–1200 字元。');
    const s = input.replace(/[−–]/g,'-').replace(/[×·]/g,'*').replace(/÷/g,'/').replace(/≤/g,'<=').replace(/≥/g,'>=').replace(/≠/g,'!=').replace(/√/g,'sqrt');
    const tokens = []; let i = 0;
    while (i < s.length) {
      if (/\s/.test(s[i])) {i++;continue;}
      const m = s.slice(i).match(/^(?:(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?|[\p{L}]+[\p{L}\p{N}]*|<=|>=|!=|==|&&|\|\||[+*/^_=<>(),;\[\]!-])/u);
      if (!m) throw Error('不支援的公式符號。');
      tokens.push(m[0]);i+=m[0].length;
      if(tokens.length>600)throw Error('公式過於複雜。');
    }
    let at=0,nodes=0;
    const take=t=>{if(tokens[at++]!==t)throw Error('括號或引數不完整。');};
    const atom=t=>t && (/^[\p{L}\d.]/u.test(t)||t==='('||t==='[');
    function expr(min=0,depth=0,stopSub=false) {
      if(depth>40||++nodes>500)throw Error('公式巢狀過深。');
      const t=tokens[at++];let n;
      if(!t)throw Error('缺少運算元。');
      if(/^[\d.]/.test(t)){if(!Number.isFinite(Number(t)))throw Error('數字過大。');n={k:'num',v:t};}
      else if(/^[\p{L}]/u.test(t)){
        if(tokens[at]==='('){at++;const args=[];if(tokens[at]!==')'){args.push(expr(0,depth+1));while(tokens[at]===','){at++;args.push(expr(0,depth+1));}}take(')');n={k:'call',name:t,args};}
        else n={k:'id',v:t};
      }else if(t==='+'||t==='-')n={k:'unary',op:t,arg:expr(25,depth+1)};
      else if(t==='('){const args=[expr(0,depth+1)];while(tokens[at]===','){at++;args.push(expr(0,depth+1));}take(')');n={k:'group',args};}
      else if(t==='['){const rows=[[]];if(tokens[at]!==']')rows[0].push(expr(0,depth+1));while(tokens[at]===','||tokens[at]===';'){if(tokens[at++]===';')rows.push([]);rows.at(-1).push(expr(0,depth+1));}take(']');if(rows.length===1&&rows[0].length&&rows[0].every(a=>a.k==='matrix'&&a.rows.length===1))n={k:'matrix',rows:rows[0].map(a=>a.rows[0])};else n={k:'matrix',rows};if(!n.rows[0].length||n.rows.length>8||n.rows.some(r=>r.length!==n.rows[0].length||r.length>8))throw Error('矩陣須為最多 8 × 8 的矩形。');}
      else throw Error('不完整的公式。');
      while(at<tokens.length){
        if(tokens[at]==='!'){at++;n={k:'post',arg:n};continue;}
        const implicit=atom(tokens[at]),op=implicit?'*':tokens[at],p=prec[op];
        if(p===undefined||p<min||(stopSub&&op==='_'))break;
        if(!implicit)at++;
        const rhs=expr(op==='^'?p:p+1,depth+1,op==='^');
        if(op==='^'||op==='_'){
          if(n.k!=='script'||(op==='^'&&n.sup)||(op==='_'&&n.sub))n={k:'script',base:n};
          n[op==='^'?'sup':'sub']=rhs.k==='group'&&rhs.args.length===1?rhs.args[0]:rhs;
        }else n={k:'binary',op,left:n,right:rhs,implicit};
      }
      return n;
    }
    const tree=expr();if(at!==tokens.length)throw Error('公式含有多餘符號。');return tree;
  }
  function box(w,a,d,svg,mml){return {w,a,d,svg,mml};}
  function text(value,size=20,italic=false){
    const chars=[...String(value)];let w=chars.reduce((n,c)=>n+(/[il.,]/.test(c)?.29:/[MW∑∏∞]/.test(c)?.87:/[\u2e80-\uffff]/.test(c)?1:.59),0)*size;
    if(measure){const key=size+'|'+italic+'|'+value;let width=metrics.get(key);if(width===undefined){measure.font=(italic?'italic ':'')+size+'px '+font;const m=measure.measureText(String(value));width=Math.max(m.width,m.actualBoundingBoxRight||0)+size*.03;if(metrics.size>=512)metrics.delete(metrics.keys().next().value);metrics.set(key,width);}if(Number.isFinite(width)&&width>0)w=width;}
    return box(w,size*.8,size*.23,`<text x="0" y="0" font-size="${round(size)}"${italic?' font-style="italic"':''}>${esc(value)}</text>`,`<${italic?'mi':/^[\d.]+$/.test(value)?'mn':'mo'}>${esc(value)}</${italic?'mi':/^[\d.]+$/.test(value)?'mn':'mo'}>`);
  }
  const move=(b,x,y)=>`<g transform="translate(${round(x)} ${round(y)})">${b.svg}</g>`;
  function row(items,gap=3){let x=0;const svg=items.map((b,i)=>{const s=move(b,x,0);x+=b.w+(i<items.length-1?gap:0);return s;}).join('');return box(x,Math.max(0,...items.map(b=>b.a)),Math.max(0,...items.map(b=>b.d)),svg,`<mrow>${items.map(b=>b.mml).join('')}</mrow>`);}
  function fence(b,left='(',right=')',size=20){
    const h=Math.max(size,b.a+b.d+6),top=-(h/2+size*.22),bottom=top+h,w=size*.38,pad=3;
    const path=(x,side)=>left==='['?`M${x+side*w*.6} ${top}H${x}V${bottom}H${x+side*w*.6}`:`M${x+side*w*.7} ${top}Q${x-side*w*.5} ${(top+bottom)/2} ${x+side*w*.7} ${bottom}`;
    return box(b.w+2*(w+pad),-top,bottom,`<g fill="none" stroke="currentColor" stroke-width="1.3"><path d="${path(w*.25,1)}"/><path d="${path(b.w+2*pad+1.75*w,-1)}"/></g>${move(b,w+pad,0)}`,`<mrow><mo stretchy="true">${left}</mo>${b.mml}<mo stretchy="true">${right}</mo></mrow>`);
  }
  function fraction(n,d,size){const axis=-size*.23,gap=size*.2,ny=axis-gap-n.d,dy=axis+gap+d.a,w=Math.max(n.w,d.w)+size*.4;return box(w,n.a-ny,dy+d.d,`${move(n,(w-n.w)/2,ny)}<path d="M1 ${axis}H${w-1}" fill="none" stroke="currentColor" stroke-width="1.2"/>${move(d,(w-d.w)/2,dy)}`,`<mfrac>${n.mml}${d.mml}</mfrac>`);}
  function scripts(b,sup,sub,size){const uy=sup?-Math.max(b.a*.7,sup.d+size*.32):0,dy=sub?Math.max(b.d+sub.a*.7,size*.3):0,w=b.w+Math.max(sup?.w||0,sub?.w||0)+2;return box(w,Math.max(b.a,sup?sup.a-uy:0),Math.max(b.d,sub?dy+sub.d:0),b.svg+(sup?move(sup,b.w+2,uy):'')+(sub?move(sub,b.w+2,dy):''),sup&&sub?`<msubsup>${b.mml}${sub.mml}${sup.mml}</msubsup>`:sup?`<msup>${b.mml}${sup.mml}</msup>`:`<msub>${b.mml}${sub.mml}</msub>`);}
  function layout(n,size=20){
    const child=a=>layout(a,size),small=a=>layout(a,size*.73),comma=items=>row(items.flatMap((b,i)=>i?[text(',',size),b]:[b]),size*.14);
    if(n.k==='num'){const parts=n.v.split(/[eE]/);if(parts.length===2)return row([text(parts[0],size),text('×',size),scripts(text('10',size),text(String(Number(parts[1])),size*.73),null,size)],size*.15);const b=text(n.v,size);b.mml='<mn>'+esc(n.v)+'</mn>';return b;}
    if(n.k==='id')return text(names[n.v]||n.v,size,true);
    if(n.k==='group')return fence(comma(n.args.map(child)),'(',')',size);
    if(n.k==='unary')return row([text(ops[n.op]||n.op,size),child(n.arg)],2);
    if(n.k==='post')return row([child(n.arg),text('!',size)],1);
    if(n.k==='script')return scripts(child(n.base),n.sup?small(n.sup):null,n.sub?small(n.sub):null,size);
    if(n.k==='binary'){
      if(n.op==='/')return fraction(layout(n.left,size*.92),layout(n.right,size*.92),size);
      return row([child(n.left),text(ops[n.op]||n.op,size),child(n.right)],size*.2);
    }
    if(n.k==='matrix'){
      const cells=n.rows.map(r=>r.map(child)),widths=cells[0].map((_,i)=>Math.max(...cells.map(r=>r[i].w))),heights=cells.map(r=>Math.max(...r.map(b=>b.a))+Math.max(...r.map(b=>b.d))),h=heights.reduce((a,b)=>a+b,0)+size*.5*(cells.length-1),a=h/2+size*.22;
      let y=-a,svg='';cells.forEach((r,j)=>{const asc=Math.max(...r.map(b=>b.a));let x=0;r.forEach((b,i)=>{svg+=move(b,x+(widths[i]-b.w)/2,y+asc);x+=widths[i]+size*.65;});y+=heights[j]+size*.5;});
      const b=box(widths.reduce((a,b)=>a+b,0)+size*.65*(widths.length-1),a,h-a,svg,`<mtable>${cells.map(r=>`<mtr>${r.map(b=>`<mtd>${b.mml}</mtd>`).join('')}</mtr>`).join('')}</mtable>`);return fence(b,'[',']',size);
    }
    if(n.k==='call'){
      const a=n.args.map(child);
      if(['sqrt','cbrt'].includes(n.name)&&a.length===1){const b=a[0],left=size*.65,top=-b.a-4,w=left+b.w+3;const svg=`<path d="M0 -3 L${size*.18} -6 L${size*.32} ${b.d+1} L${left-2} ${top} H${w}" fill="none" stroke="currentColor" stroke-width="1.4"/>${move(b,left,0)}`;const radical=box(w,b.a+6,b.d+2,svg,`<msqrt>${b.mml}</msqrt>`);if(n.name==='cbrt'){radical.svg+=move(text('3',size*.5),0,top+size*.2);radical.a+=size*.15;radical.mml=`<mroot>${b.mml}<mn>3</mn></mroot>`;}return radical;}
      if(['sum','product','integrate'].includes(n.name)&&a.length===4){
        const integral=n.name==='integrate',op=text(integral?'∫':n.name==='sum'?'∑':'∏',size*1.45),lower=integral?small(n.args[2]):row([small(n.args[1]),text('=',size*.73),small(n.args[2])],2),upper=small(n.args[3]);
        const w=Math.max(op.w,lower.w,upper.w),up=-op.a-upper.d-3,down=op.d+lower.a+3;
        const operator=box(w,upper.a-up,down+lower.d,move(op,(w-op.w)/2,0)+move(upper,(w-upper.w)/2,up)+move(lower,(w-lower.w)/2,down),`<munderover>${op.mml}${lower.mml}${upper.mml}</munderover>`);
        return row([operator,a[0],...(integral?[text('d',size),a[1]]:[])],size*.25);
      }
      if(n.name==='abs'&&a.length===1){const b=a[0];return box(b.w+10,b.a+2,b.d+2,`<path d="M1 ${-b.a-2}V${b.d+2}M${b.w+9} ${-b.a-2}V${b.d+2}" stroke="currentColor" fill="none"/>${move(b,5,0)}`,`<mrow><mo>|</mo>${b.mml}<mo>|</mo></mrow>`);}
      const fn=text(n.name,size);fn.mml=`<mi mathvariant="normal">${esc(n.name)}</mi>`;return row([fn,fence(comma(a),'(',')',size)],2);
    }
    throw Error('不支援的公式結構。');
  }
  function render(source){
    if(cache.has(source))return cache.get(source);
    const b=layout(parse(source)),pad=5,w=Math.ceil(b.w+2*pad),h=Math.ceil(b.a+b.d+2*pad);
    if(w>16000||h>4000)throw Error('公式超過排版尺寸限制。');
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" class="mathink-svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(source)}"><title>${esc(source)}</title><g fill="currentColor" font-family="Cambria Math, STIX Two Math, Georgia, serif" transform="translate(${pad} ${round(b.a+pad)})">${b.svg}</g></svg>`;
    const mathml=`<math xmlns="http://www.w3.org/1998/Math/MathML">${b.mml}</math>`;
    const result=Object.freeze({svg,mathml,width:w,height:h,baseline:b.a+pad,html:`<span class="mathink" data-renderer="mathink-1" style="--math-depth:${round(b.d+pad)}px"><span aria-hidden="true">${svg}</span><span class="mathink-accessible">${mathml}</span></span>`});
    if(cache.size>=128)cache.delete(cache.keys().next().value);cache.set(source,result);return result;
  }
  function safe(source){try{return render(source);}catch{return null;}}
  return Object.freeze({version:'1.0.0',parse,render,safe,clearCache:()=>cache.clear()});
});
