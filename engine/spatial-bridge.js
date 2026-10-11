/* Open existing spatial experiments as editable objects in the shared 3D scene. */
(function(root){
  'use strict';
  const node=typeof module!=='undefined'&&module.exports;
  const G=node?require('../spatial/geometry.js'):root.SpatialGeometry;
  const X=node?require('../graph/exact.js'):root.MathExact;
  const ids=Object.freeze(['space-point-line-projection','sphere-plane-section-radius','tetrahedron-intercept-volume','space-vector-coplanarity','space-cross-product','spatial-section-geometry','space-plane-distance','sphere-space-coordinate','scalar-triple-product','space-skew-lines','cross-section-volume','plane-intersection-line','line-plane-angle']);
  const supported=new Set(ids);
  function scene(moduleId,parameters={}){
    if(!supported.has(moduleId))return null;
    if(!G)throw Error('空間幾何引擎尚未載入。');
    if(!parameters||typeof parameters!=='object'||Array.isArray(parameters))throw Error('模組參數格式不正確。');
    const n=key=>{
      if(!Object.hasOwn(parameters,key))throw Error('模組缺少參數：'+key);
      let value=parameters[key];
      if(value&&typeof value==='object'&&!Array.isArray(value))value=value.value;
      if(typeof value==='string')value=X.scalar(value).value;
      if(typeof value!=='number'||!Number.isFinite(value)||Math.abs(value)>10000)throw Error('模組參數須為有限的常數：'+key);
      return value;
    };
    const objects=[],add=(type,values)=>{const object=G.make(type,values);objects.push(object);return object;};
    const point=(label,position)=>add('point',{label,position});
    const vector=(label,direction,origin=[0,0,0])=>add('vector',{label,direction,origin});
    const plane=(label,normal,constant=0)=>add('plane',{label,normal,constant});
    const line=(label,p,direction)=>add('line',{label,point:p,direction});
    const auxiliary=result=>{for(const object of result.auxiliary||[])objects.push(G.validate(object));};
    if(moduleId==='space-point-line-projection'){
      const p=point('P',[n('x'),n('y'),n('z')]),l=line('L',[0,0,0],[1,n('a'),n('b')]);auxiliary(G.pointLine(p,l));
    }else if(moduleId==='sphere-plane-section-radius'){
      const s=add('sphere',{label:'S',center:[0,0,0],radius:n('R')}),e=plane('E',[0,0,1],n('d'));point('C',[0,0,0]);auxiliary(G.spherePlane(s,e));
    }else if(moduleId==='tetrahedron-intercept-volume'){
      const a=n('a'),b=n('b'),c=n('c');add('tetrahedron',{label:'OABC',points:[[0,0,0],[a,0,0],[0,b,0],[0,0,c]]});
      point('O',[0,0,0]);point('A',[a,0,0]);point('B',[0,b,0]);point('C',[0,0,c]);
    }else if(moduleId==='space-vector-coplanarity'){
      vector('u',[1,1,0]);vector('v',[0,1,1]);const w=[n('x'),n('y'),n('z')];vector('w',w);
      const p=point('W',w),e=plane('E',[1,-1,1]);auxiliary(G.pointPlane(p,e));
    }else if(moduleId==='space-cross-product'){
      const u=[n('ux'),n('uy'),n('uz')],v=[n('vx'),n('vy'),n('vz')];vector('u',u);vector('v',v);vector('u×v',G.cross(u,v));
      add('polygon',{label:'△Ouv',points:[[0,0,0],u,v]});const projection=G.vectorPair(u,v).projection;if(projection)vector('projᵥu',projection);
    }else if(moduleId==='spatial-section-geometry'){
      const cube=add('box',{label:'單位立方體',origin:[0,0,0],size:[1,1,1]}),e=plane('E',[1,1,1],n('t'));auxiliary(G.polyhedronPlane(cube,e));
    }else if(moduleId==='space-plane-distance'){
      const p=point('P',[n('px'),n('py'),n('pz')]),e=plane('E',[1,1,1],n('c'));auxiliary(G.pointPlane(p,e));
    }else if(moduleId==='sphere-space-coordinate'){
      add('sphere',{label:'S',center:[0,0,0],radius:n('R')});point('P',[n('x'),n('y'),n('z')]);point('O',[0,0,0]);add('segment',{label:'OP',a:[0,0,0],b:[n('x'),n('y'),n('z')]});
    }else if(moduleId==='scalar-triple-product'){
      const u=[2,0,0],v=[0,2,0],w=[n('cx'),n('cy'),n('cz')];add('parallelepiped',{label:'平行六面體',u,v,w});vector('a',u);vector('b',v);vector('c',w);
    }else if(moduleId==='space-skew-lines'){
      const a=line('L₁',[-2,-.75,-.25],[1.35,.65,.25]),b=line('L₂',[n('qx'),n('qy'),n('qz')],[.55,-.38,1.22]);auxiliary(G.linePair(a,b));
    }else if(moduleId==='cross-section-volume'){
      const a=n('a'),x=n('x');if(x<0||x>3)throw Error('切片須位於 0 到 3。');
      add('revolution',{label:'旋轉體',expression:'('+a+')sqrt(x)',innerExpression:'0',domain:[0,3],axis:'x'});
      plane('截平面',[1,0,0],x);add('circle',{label:'截圓',center:[x,0,0],normal:[1,0,0],radius:a*Math.sqrt(x)});
    }else if(moduleId==='plane-intersection-line'){
      const normal=[n('a'),n('b'),n('c')],a=plane('E₁',[1,1,2]);vector('n₁',[1,1,2]);vector('n₂',normal);
      // A zero normal does not define a plane; keep its zero vector visible.
      if(G.norm(normal)>1e-12){const b=plane('E₂',normal);auxiliary(G.planePair(a,b));}
    }else if(moduleId==='line-plane-angle'){
      const direction=[n('vx'),n('vy'),n('vz')];plane('E',[1,-1,2]);vector('n',[1,-1,2]);
      if(G.norm(direction)>1e-12)line('L',[0,0,0],direction);else vector('v = 0（方向未定義）',direction);
    }
    const camera=root.SpatialMath?.DEFAULT?.camera||{yaw:-.72,pitch:.58,zoom:1};
    return {objects:objects.map((object,index)=>({id:'g'+index,visible:true,object})),camera:{...camera},wire:false,explore:false};
  }
  function url(moduleId,parameters,base=root.location?.href||'http://localhost/'){
    const doc=scene(moduleId,parameters);if(!doc)return null;
    const target=new URL('./spatial.html',base);target.hash='space='+encodeURIComponent(JSON.stringify(doc));return target.href;
  }
  const api=Object.freeze({ids,supports:id=>supported.has(id),scene,url});
  root.MathSpatialBridge=api;if(node)module.exports=api;
  if(!root.document||!root.MathLab||!G)return;
  const document=root.document,formula=document.getElementById('formulaBox');if(!formula)return;
  const wrap=document.createElement('p'),link=document.createElement('a');wrap.id='spatialModuleBridge';wrap.hidden=true;
  link.className='text-button spatial-module-link';link.textContent='在 3D 工作區探索 ↗';link.setAttribute('aria-label','將目前參數帶入 3D 空間幾何工作區');wrap.append(link);formula.after(wrap);
  function update(){
    const current=root.MathLab.getCurrentModule();wrap.hidden=!api.supports(current.id);if(wrap.hidden){link.removeAttribute('href');return;}
    try{const parameters=Object.fromEntries(current.controls.map(control=>[control.key,control.value]));link.href=api.url(current.id,parameters);wrap.hidden=false;link.title='保留目前參數，開啟可編輯的點、線、面與立體物件。';}
    catch{wrap.hidden=true;link.removeAttribute('href');}
  }
  document.addEventListener('mathlab:modulechange',update);document.addEventListener('mathlab:statechange',update);update();
})(typeof globalThis!=='undefined'?globalThis:this);
