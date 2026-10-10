/* Small vector recording target for the drawing commands used by graph.js. */
(function(root){
  'use strict';
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  class GraphSVG{
    constructor(w,h){this.width=w;this.height=h;this.elements=[];this.stack=[];this.path='';this.fillStyle='#000';this.strokeStyle='#000';this.lineWidth=1;this.font='12px sans-serif';this.textAlign='left';this.globalAlpha=1;this.dash=[];}
    beginPath(){this.path='';}
    moveTo(x,y){this.path+=`M${x},${y} `;}
    lineTo(x,y){this.path+=`L${x},${y} `;}
    closePath(){this.path+='Z ';}
    rect(x,y,w,h){this.path+=`M${x},${y}h${w}v${h}h${-w}Z `;}
    arc(x,y,r){this.path+=`M${x-r},${y}a${r},${r} 0 1,0 ${r*2},0a${r},${r} 0 1,0 ${-r*2},0 `;}
    fill(){this.elements.push(`<path d="${this.path}" fill="${esc(this.fillStyle)}" opacity="${this.globalAlpha}"/>`);}
    stroke(){this.elements.push(`<path d="${this.path}" fill="none" stroke="${esc(this.strokeStyle)}" stroke-width="${this.lineWidth}" stroke-linejoin="round" stroke-dasharray="${this.dash.join(' ')}" opacity="${this.globalAlpha}"/>`);}
    fillRect(x,y,w,h){this.elements.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${esc(this.fillStyle)}" opacity="${this.globalAlpha}"/>`);}
    clearRect(){this.elements=[];}
    fillText(text,x,y){this.elements.push(`<text x="${x}" y="${y}" fill="${esc(this.fillStyle)}" style="font:${esc(this.font)}" text-anchor="${this.textAlign==='center'?'middle':this.textAlign==='right'?'end':'start'}">${esc(text)}</text>`);}
    setLineDash(d){this.dash=d;}
    save(){this.stack.push({fillStyle:this.fillStyle,strokeStyle:this.strokeStyle,lineWidth:this.lineWidth,font:this.font,textAlign:this.textAlign,globalAlpha:this.globalAlpha,dash:[...this.dash],clipped:this.clipped});}
    restore(){const s=this.stack.pop();if(!s)return;if(this.clipped&&!s.clipped)this.elements.push('</g>');Object.assign(this,s);}
    clip(){this.elements.push(`<defs><clipPath id="plot"><path d="${this.path}"/></clipPath></defs><g clip-path="url(#plot)">`);this.clipped=true;}
    toString(){return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}" viewBox="0 0 ${this.width} ${this.height}" role="img"><title>Math Lab 智慧繪圖</title>${this.elements.join('')}</svg>`;}
  }
  if(typeof module!=='undefined'&&module.exports)module.exports=GraphSVG;else root.GraphSVG=GraphSVG;
})(typeof globalThis!=='undefined'?globalThis:this);
