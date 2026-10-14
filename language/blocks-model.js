/* MathScript Blocks: typed Blockly definitions and lossless source bridge. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./mathscript.js'):root.MathScript);if(typeof module==='object'&&module.exports)module.exports=api;root.MathBlocks=api;})(typeof globalThis==='object'?globalThis:this,function(M){
  'use strict';
  const MAX=1200,types=['Scalar','Data','Boolean'];
  const specs={
    title:{label:'實驗標題',fields:['TEXT'],color:210},
    let:{label:'定義',fields:['NAME'],inputs:['VALUE'],color:210},
    param:{label:'滑桿參數',fields:['NAME'],inputs:['VALUE','FROM','TO','STEP'],color:210},
    fn:{label:'定義函數',fields:['NAME','ARGS'],inputs:['VALUE'],color:210},
    view:{label:'座標視窗',inputs:['XMIN','XMAX','YMIN','YMAX'],color:170},
    plot:{label:'繪製函數',inputs:['VALUE'],style:true,color:170},
    point:{label:'標記點',inputs:['X','Y'],style:true,color:170},
    curve:{label:'參數曲線',inputs:['X','Y','FROM','TO'],style:true,color:170},
    points:{label:'資料散點',inputs:['X','Y'],style:true,color:170},
    polyline:{label:'資料折線',inputs:['X','Y'],style:true,color:170},
    print:{label:'顯示結果',inputs:['VALUE'],style:true,color:35},
    assert:{label:'驗證成立',inputs:['VALUE'],style:true,color:35},
    derivative:{label:'微分求值',inputs:['VALUE','AT'],style:true,color:275},
    tangent:{label:'繪製切線',inputs:['VALUE','AT'],style:true,color:275},
    integral:{label:'定積分',inputs:['VALUE','FROM','TO'],color:275},
    roots:{label:'求根',inputs:['VALUE','FROM','TO'],color:275},
    sum:{label:'加總（n）',inputs:['VALUE','FROM','TO'],style:true,color:275},
    product:{label:'連乘（n）',inputs:['VALUE','FROM','TO'],style:true,color:275},
    table:{label:'數值表',inputs:['VALUE','FROM','TO','STEP'],color:35},
    scatter:{label:'取樣散點',inputs:['VALUE','FROM','TO','STEP'],color:35}
  };
  const labels={VALUE:'算式',FROM:'從',TO:'到',STEP:'步長（選填）',AT:'代入 x',X:'x',Y:'y',XMIN:'x 下限',XMAX:'x 上限',YMIN:'y 下限',YMAX:'y 上限'};
  const ident=v=>typeof v==='string'&&/^[\p{L}_][\p{L}\p{N}_]*$/u.test(v)&&!['__proto__','constructor','prototype'].includes(v)?v:null;
  function register(B){
    if(B.Blocks.ms_program)return;
    B.Blocks.ms_program={init(){this.appendDummyInput().appendField('開始數學實驗');this.appendStatementInput('BODY');this.setColour(210);this.setDeletable(false);this.setTooltip('將所有指令接在這個起點內，依序執行。');}};
    for(const [kind,s]of Object.entries(specs))B.Blocks['ms_'+kind]={init(){
      const head=this.appendDummyInput().appendField(s.label);
      for(const field of s.fields||[])head.appendField(new B.FieldTextInput(field==='TEXT'?'我的數學實驗':field==='ARGS'?'x':kind==='fn'?'f':'a'),'F_'+field);
      for(const key of s.inputs||[]){const check=kind==='print'||kind==='let'||kind==='fn'?types:kind==='assert'?['Boolean','Scalar']:['points','polyline'].includes(kind)?'Data':'Scalar';this.appendValueInput(key).setCheck(check).appendField(labels[key]);}
      if(s.style)this.appendDummyInput().appendField('標籤').appendField(new B.FieldTextInput(''),'F_LABEL').appendField('色碼').appendField(new B.FieldTextInput(''),'F_COLOR');
      this.setPreviousStatement(true);this.setNextStatement(true);this.setColour(s.color);this.setInputsInline(true);this.setTooltip('MathScript '+kind+' · 拖入算式積木，或切換文字編輯。');
    }};
    B.Blocks.ms_number={init(){this.appendDummyInput().appendField(new B.FieldNumber(1),'N');this.setOutput(true,'Scalar');this.setColour(130);}};
    B.Blocks.ms_variable={init(){this.appendDummyInput().appendField(new B.FieldTextInput('x'),'NAME');this.setOutput(true,types);this.setColour(210);}};
    B.Blocks.ms_binary={init(){this.appendValueInput('A').setCheck(['Scalar','Boolean']);this.appendValueInput('B').setCheck(['Scalar','Boolean']).appendField(new B.FieldDropdown([['＋','+'],['−','-'],['×','*'],['÷','/'],['次方','^'],['小於','<'],['大於','>'],['≤','<='],['≥','>='],['等於','=='],['≠','!='],['且','&&'],['或','||']]),'OP');this.setInputsInline(true);this.setOutput(true,['Scalar','Boolean']);this.setColour(130);}};
    B.Blocks.ms_unary={init(){this.appendValueInput('A').setCheck('Scalar').appendField(new B.FieldDropdown([['負號','-'],['正號','+']]),'OP');this.setOutput(true,'Scalar');this.setColour(130);}};
    B.Blocks.ms_raw={init(){this.appendDummyInput().appendField('資料／進階算式').appendField(new B.FieldTextInput('[1,2,3]'),'TEXT');this.setOutput(true,types);this.setColour(35);this.setTooltip('保留複雜資料或進階算式；仍由 MathScript 安全解析。');}};
    for(const kind of ['call','list'])B.Blocks['ms_'+kind]={
      init(){this.itemCount_=kind==='call'?1:3;const h=this.appendDummyInput('HEAD');h.appendField(kind==='call'?'函數':'向量／矩陣');if(kind==='call')h.appendField(new B.FieldTextInput('sin'),'NAME');this.setOutput(true,kind==='list'?'Data':types);this.setColour(kind==='list'?35:130);this.updateShape_();this.setTooltip('右鍵可增減引數；長按可開啟選單。矩陣以向量積木巢狀組合。');},
      updateShape_(){for(let i=0;i<this.itemCount_;i++)if(!this.getInput('A'+i))this.appendValueInput('A'+i).setCheck(types).appendField(String(i+1));let i=this.itemCount_;while(this.getInput('A'+i))this.removeInput('A'+i++);this.setInputsInline(this.itemCount_<4);},
      saveExtraState(){return {count:this.itemCount_};},
      loadExtraState(s){if(!s||!Number.isInteger(s.count)||s.count<1||s.count>16)throw Error('引數數量須介於 1–16。');this.itemCount_=s.count;this.updateShape_();},
      customContextMenu(options){for(const [label,delta]of [['增加引數',1],['移除最後引數',-1]])options.push({text:label,enabled:this.itemCount_+delta>=1&&this.itemCount_+delta<=16,callback:()=>{const old=this.saveExtraState(),group=B.Events.getGroup();B.Events.setGroup(true);try{this.itemCount_+=delta;this.updateShape_();B.Events.fire(new B.Events.BlockChange(this,'mutation',null,JSON.stringify(old),JSON.stringify(this.saveExtraState())));}finally{B.Events.setGroup(group);}}});}
    };
  }
  const block=(type,fields={},inputs={},extraState)=>({type:'ms_'+type,fields,inputs,...(extraState?{extraState}:{})});
  const connection=b=>({block:b});
  function exprNode(n){
    if(n.type==='number')return block('number',{N:n.value});
    if(n.type==='variable')return block('variable',{NAME:n.name});
    if(n.type==='unary')return block('unary',{OP:n.op},{A:connection(exprNode(n.child))});
    if(n.type==='binary')return block('binary',{OP:n.op},{A:connection(exprNode(n.left)),B:connection(exprNode(n.right))});
    if(n.type==='array'||n.type==='call'){
      const list=n.elements||n.args;
      if(!list.length||list.length>16)return block('raw',{TEXT:astExpr(n)});
      return block(n.type==='array'?'list':'call',n.name?{NAME:n.name}:{},Object.fromEntries(list.map((a,i)=>['A'+i,connection(exprNode(a))])),{count:list.length});
    }
    throw Error('無法轉換的算式。');
  }
  function astExpr(n){if(n.type==='number')return String(n.value);if(n.type==='variable')return n.name;if(n.type==='unary')return '('+n.op+astExpr(n.child)+')';if(n.type==='binary')return '('+astExpr(n.left)+' '+n.op+' '+astExpr(n.right)+')';if(n.type==='array')return '['+n.elements.map(astExpr).join(',')+']';if(n.type==='call')return n.name+'('+n.args.map(astExpr).join(',')+')';throw Error('不支援的 AST。');}
  function comments(source){let quote=false,escaped=false,out='';for(let i=0;i<source.length;i++){const c=source[i];if(quote){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quote=false;}else if(c==='"')quote=true;else if(c==='#'||source.slice(i,i+2)==='//'){const end=source.indexOf('\n',i),j=end<0?source.length:end;out+=source.slice(i,j)+'\n';i=j;}}return out;}
  function semantic(source){return JSON.stringify(M.compile(source).statements,(key,value)=>key==='token'||key==='height'?undefined:value);}
  function fromSource(source){
    const ast=M.compile(source),list=ast.statements.map((s,i)=>{
      const spec=specs[s.type];if(!spec)throw Error('無法轉換指令 '+s.type);
      const fields={};for(const key of spec.fields||[])fields['F_'+key]=key==='TEXT'?s.value:key==='ARGS'?s.args.join(','):s.name;
      if(spec.style){fields.F_LABEL=s.label||'';fields.F_COLOR=s.color||'';}
      const inputs={};for(const key of spec.inputs||[]){const n=s.type==='view'?s.values[['XMIN','XMAX','YMIN','YMAX'].indexOf(key)]:s[key.toLowerCase()];if(n)inputs[key]=connection(exprNode(n));}
      const b=block(s.type,fields,inputs);b.data=JSON.stringify({original:source.slice(s.token.start,ast.statements[i+1]?.token.start??source.length)});return b;
    });
    for(let i=0;i<list.length-1;i++)list[i].next=connection(list[i+1]);
    const top=block('program',{},list.length?{BODY:connection(list[0])}:{});top.x=30;top.y=30;top.data=JSON.stringify({preamble:source.slice(0,ast.statements[0]?.token.start??source.length)});
    return {blocks:{languageVersion:0,blocks:[top]}};
  }
  function generate(workspace,{preserve=true,validate=true}={}){
    const all=workspace.getAllBlocks(false);if(all.length>MAX)throw Error('最多 '+MAX+' 塊積木。');
    const roots=workspace.getTopBlocks(true);if(roots.length!==1||roots[0].type!=='ms_program')throw Error('請把所有積木接回「開始數學實驗」，或刪除未使用的積木。');
    let count=0;const field=(b,n)=>String(b.getFieldValue(n)??''),name=(b,n)=>{const v=ident(field(b,n));if(!v)throw Error('名稱格式無效。');return v;};
    function exp(b,depth=0){if(!b||!b.isEnabled())throw Error('積木有空白插槽，請接上算式。');if(++count>MAX||depth>50)throw Error('積木過於複雜。');const e=k=>exp(b.getInputTargetBlock(k),depth+1);
      if(b.type==='ms_number'){const n=Number(field(b,'N'));if(!Number.isFinite(n))throw Error('數字須為有限值。');return String(n);}
      if(b.type==='ms_variable')return name(b,'NAME');
      if(b.type==='ms_binary')return '('+e('A')+' '+field(b,'OP')+' '+e('B')+')';
      if(b.type==='ms_unary')return '('+field(b,'OP')+e('A')+')';
      if(b.type==='ms_raw'){const s=field(b,'TEXT');const parsed=M.compile('print '+s);if(parsed.statements.length!==1)throw Error('進階算式只能包含一個運算式。');return astExpr(parsed.statements[0].value);}
      if(b.type==='ms_call'||b.type==='ms_list'){const a=Array.from({length:b.itemCount_},(_,i)=>e('A'+i)).join(', ');return b.type==='ms_call'?name(b,'NAME')+'('+a+')':'['+a+']';}throw Error('不支援的算式積木。');
    }
    function statement(b){
      const t=b.type.slice(3),s=specs[t];if(!s)throw Error('不支援的指令。');const e=k=>exp(b.getInputTargetBlock(k));let out=t+' ';
      if(t==='title')out+=JSON.stringify(field(b,'F_TEXT'));
      else if(t==='let'||t==='param')out+=name(b,'F_NAME')+' = '+e('VALUE');
      else if(t==='fn'){const args=field(b,'F_ARGS').split(',').map(s=>s.trim());if(!args.length||args.some(s=>!ident(s)))throw Error('函數引數格式無效。');out+=name(b,'F_NAME')+'('+args.join(', ')+') = '+e('VALUE');}
      else if(t==='view')out+=['XMIN','XMAX','YMIN','YMAX'].map(e).join(', ');
      else if(t==='point'||t==='curve')out+='('+e('X')+', '+e('Y')+')';
      else if(t==='points'||t==='polyline')out+=e('X')+', '+e('Y');
      else out+=e('VALUE');
      if(s.inputs?.includes('FROM'))out+=' from '+e('FROM')+' to '+e('TO');
      if(s.inputs?.includes('STEP')&&b.getInputTargetBlock('STEP'))out+=' step '+e('STEP');
      if(s.inputs?.includes('AT'))out+=' at '+e('AT');
      if(s.style){if(field(b,'F_COLOR'))out+=' color '+JSON.stringify(field(b,'F_COLOR'));if(field(b,'F_LABEL'))out+=' label '+JSON.stringify(field(b,'F_LABEL'));}
      let data={};try{data=JSON.parse(b.data||'{}');}catch{}
      if(preserve&&typeof data.original==='string'&&data.canonical===out){try{if(semantic(data.original)===semantic(out))return data.original;}catch{}}
      return (preserve&&data.original?comments(data.original):'')+out+'\n';
    }
    let data={};try{data=JSON.parse(roots[0].data||'{}');}catch{}
    const lines=[];let b=roots[0].getInputTargetBlock('BODY');while(b){if(b.isEnabled())lines.push(statement(b));b=b.getNextBlock();}
    const preamble=typeof data.preamble==='string'&&M.compile(data.preamble).statements.length===0?data.preamble:'';
    const result=preamble+lines.join('');if(validate)M.compile(result);return result;
  }
  function load(B,workspace,json){
    const serialized=JSON.stringify(json);if(serialized.length>350000)throw Error('積木檔案超過 350 KB。');let count=0;
    function check(b,depth=0){if(!b||typeof b!=='object'||!B.Blocks[b.type]||!/^ms_/.test(b.type)||++count>MAX||depth>220)throw Error('無效或過大的積木資料。');if(b.extraState&&(!Number.isInteger(b.extraState.count)||b.extraState.count<1||b.extraState.count>16))throw Error('引數數量無效。');for(const v of Object.values(b.fields||{}))if(!['string','number'].includes(typeof v)||String(v).length>24000)throw Error('欄位資料無效。');for(const v of Object.values(b.inputs||{})){if(v.block)check(v.block,depth+1);if(v.shadow)check(v.shadow,depth+1);}if(b.next?.block)check(b.next.block,depth+1);if(b.next?.shadow)throw Error('指令不能使用影子積木。');}
    if(!Array.isArray(json?.blocks?.blocks))throw Error('缺少積木工作區。');json.blocks.blocks.forEach(b=>check(b));
    B.serialization.workspaces.load(json,workspace);
  }
  function loadSource(B,workspace,source){
    load(B,workspace,fromSource(source));
    // Fingerprint each command using the generator, without retaining its next chain.
    for(const b of workspace.getAllBlocks(false))if(specs[b.type.slice(3)]){
      let data;try{data=JSON.parse(b.data||'{}');}catch{continue;}if(!data.original)continue;
      const temp=new B.Workspace();try{const item=B.serialization.blocks.save(b,{addNextBlocks:false});delete item.next;item.data='';const rootBlock=block('program',{}, {BODY:connection(item)});load(B,temp,{blocks:{languageVersion:0,blocks:[rootBlock]}});data.canonical=generate(temp,{preserve:false}).trimEnd();b.data=JSON.stringify(data);}finally{temp.dispose();}
    }
  }
  function toolbox(){
    const num=n=>connection(block('number',{N:n})),variable=n=>connection(block('variable',{NAME:n}));
    const command=t=>{const s=specs[t],inputs={};for(const k of s.inputs||[]){if(k==='STEP')continue;inputs[k]=k==='VALUE'?variable('x'):num(k==='FROM'?0:k==='TO'?5:k.endsWith('MIN')?-6:k.endsWith('MAX')?6:1);}return {kind:'block',...block(t,{},inputs)};};
    const call=(name,args)=>({kind:'block',...block('call',{NAME:name},Object.fromEntries(args.map((v,i)=>['A'+i,typeof v==='number'?num(v):variable(v)])),{count:args.length})});
    return {kind:'categoryToolbox',contents:[
      {kind:'category',name:'定義',colour:'#4275aa',contents:['title','let','param','fn'].map(command)},
      {kind:'category',name:'運算',colour:'#4d9170',contents:[{kind:'block',type:'ms_number'},{kind:'block',type:'ms_variable'},{kind:'block',...block('binary',{OP:'+'},{A:num(1),B:num(2)})},{kind:'block',...block('unary',{OP:'-'},{A:variable('x')})},...['sin','cos','sqrt','abs','exp','ln'].map(n=>call(n,['x'])),call('if',['x',1,0])]},
      {kind:'category',name:'繪圖',colour:'#278b83',contents:['view','plot','curve','point','points','polyline','scatter'].map(command)},
      {kind:'category',name:'微積分',colour:'#8870ac',contents:[...['derivative','tangent','integral','roots','sum','product'].map(command),call('sum',['n','n',1,10]),call('diff',['x','x',1]),call('integrate',['x','x',0,1])]},
      {kind:'category',name:'資料',colour:'#b78c42',contents:[{kind:'block',...block('list',{}, {A0:num(1),A1:num(2),A2:num(3)},{count:3})},call('mean',['xs']),call('dot',['u','v']),call('solve',['A','b']),call('sample',['x','x',0,5,1]),{kind:'block',type:'ms_raw'},...['print','table','assert'].map(command)]}
    ]};
  }
  return Object.freeze({register,fromSource,loadSource,generate,load,toolbox,MAX,specs});
});
