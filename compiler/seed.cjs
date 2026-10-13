/* Bootstrap compiler. compiler.msw is the maintained self-hosted implementation. */
'use strict';
const R=require('./runtime.js');
function compile(source){
 if(typeof source!=='string'||source.length>120000)throw Error('原始碼上限為 120000 字。');
 let pos=0,line=1,col=1,nodes=0;
 function bad(message,at){throw Error('第 '+(at?at.line:line)+' 行，第 '+(at?at.col:col)+' 欄：'+message);}
 function advance(){const c=source[pos++];if(c==='\n'){line++;col=1;}else col++;return c;}
 function space(){while(pos<source.length){const c=source[pos];if(c===' '||c==='\n'||c==='\r'||c==='\t')advance();else if(c==='#'){while(pos<source.length&&source[pos]!=='\n')advance();}else break;}}
 function read(depth){space();if(++nodes>30000||depth>100)bad('語法樹超出上限。');const at={line,col};let c=source[pos];if(c===undefined)bad('非預期的檔案結尾。',at);
 if(c==='('){advance();const value=[];space();while(pos<source.length&&source[pos]!==')'){value.push(read(depth+1));space();}if(source[pos]!==')')bad('缺少右括號。',at);advance();return {type:'list',value,...at};}
 if(c===')')bad('多餘的右括號。',at);
 if(c==='"'){let raw=advance(),closed=false;while(pos<source.length){c=advance();raw+=c;if(c==='\\'){if(pos<source.length)raw+=advance();}else if(c==='"'){closed=true;break;}}if(!closed)bad('字串未結束。',at);let value;try{value=JSON.parse(raw);}catch{bad('字串需要 JSON 雙引號與跳脫格式。',at);}return {type:'string',value,...at};}
 let value='';while(pos<source.length&&!['(',')',' ','\n','\r','\t','#'].includes(source[pos]))value+=advance();
 if(/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value)){const n=Number(value);if(!Number.isFinite(n))bad('數字必須有限。',at);return{type:'number',value:n,...at};}
 return {type:'name',value,...at};
 }
 const tree=read(0);space();if(pos!==source.length)bad('只能有一個 module。');
 const builtin='get put length push pop slice join split trim replace json parseJson str num keys isArray finite integer floor ceil round abs sqrt pow sin cos tan log exp min max hypot fail'.split(' ');
 const operators={'+':'+','-':'-','*':'*','/':'/','%':'%','=':'===','!=':'!==','<':'<','>':'>','<=':'<=','>=':'>=','and':'&&','or':'||'};
 function name(n){if(!n||n.type!=='name'||!/^[_A-Za-z][_A-Za-z0-9]*$/.test(n.value)||['true','false','none'].includes(n.value))bad('需要合法名稱。',n);return '$'+n.value;}
 function form(n){if(!n||n.type!=='list'||!n.value.length)bad('需要非空的表達式。',n);return n.value;}
 function arity(n,min,max){const size=n.value.length-1;if(size<min||size>max)bad('參數個數不符。',n);}
 function expr(n){if(n.type==='string'||n.type==='number')return JSON.stringify(n.value);if(n.type==='name'){if(n.value==='none')return 'null';if(n.value==='true'||n.value==='false')return n.value;return name(n);}const a=form(n),h=a[0].value;
 if(h==='array')return '['+a.slice(1).map(expr).join(',')+']';
 if(h==='record'){const pairs=[];for(const pair of a.slice(1)){const p=form(pair);if(p.length!==2||p[0].type!=='string'||['__proto__','prototype','constructor','caller','callee','arguments'].includes(p[0].value))bad('紀錄需要安全的字串鍵及值。',pair);pairs.push('['+expr(p[0])+','+expr(p[1])+']');}return 'R.record(['+pairs.join(',')+'])';}
 if(Object.hasOwn(operators,h)){arity(n,h==='-'?1:2,2);return '('+(a.length===2?operators[h]:'')+a.slice(1).map(expr).join(operators[h])+')';}
 if(h==='not'){arity(n,1,1);return '(!'+expr(a[1])+')';}
 if(h==='choose'){arity(n,3,3);return '('+expr(a[1])+'?'+expr(a[2])+':'+expr(a[3])+')';}
 if(h==='lambda'){arity(n,2,2);if(a[1].type!=='list')bad('函式需要參數列。',a[1]);const p=a[1].value;return '('+p.map(name).join(',')+')=>R.run(()=>{R.tick();return '+expr(a[2])+';})';}
 if(['module','use','fn','let','set','if','else','while','each','return','export'].includes(h))bad('此語句不可放在表達式中。',n);
 const callee=a[0].type==='name'&&builtin.includes(h)?'R.'+h:expr(a[0]);return '('+callee+')('+a.slice(1).map(expr).join(',')+')';
 }
 function block(a,inFn){return a.map(n=>statement(n,inFn)).join('\n');}
 function statement(n,inFn){const a=form(n),h=a[0].value;
 if(h==='fn'){arity(n,3,30000);const p=a[2];if(p.type!=='list')bad('函式需要參數列。',p);return 'function '+name(a[1])+'('+p.value.map(name).join(',')+'){return R.run(()=>{R.tick();\n'+block(a.slice(3),true)+'\n});}';}
 if(h==='let'||h==='set'){arity(n,2,2);return (h==='let'?'let ':'')+name(a[1])+'='+expr(a[2])+';';}
 if(h==='return'){arity(n,1,1);if(!inFn)bad('return 只能在函式內。',n);return 'return '+expr(a[1])+';';}
 if(h==='if'){arity(n,2,30000);let yes=a.slice(2),no=[];const last=yes.at(-1);if(last.type==='list'&&last.value[0]?.value==='else'){no=last.value.slice(1);yes=yes.slice(0,-1);}return 'if('+expr(a[1])+'){\n'+block(yes,inFn)+'\n}'+(no.length?'else{\n'+block(no,inFn)+'\n}':'');}
 if(h==='while'){arity(n,2,30000);return 'while('+expr(a[1])+'){R.tick();\n'+block(a.slice(2),inFn)+'\n}';}
 if(h==='each'){arity(n,3,30000);return 'for(const '+name(a[1])+' of '+expr(a[2])+'){R.tick();\n'+block(a.slice(3),inFn)+'\n}';}
 if(h==='export'||h==='use'||h==='module'||h==='else')bad('語句位置錯誤。',n);
 return expr(n)+';';
 }
 const top=form(tree);if(top[0].value!=='module'||top.length<3)bad('程式須以 (module 名稱 …) 開始。',tree);const moduleName=name(top[1]).slice(1),imports=[],body=[];let exported=null;
 for(const n of top.slice(2)){const a=form(n),h=a[0].value;if(h==='use'){arity(n,3,3);const binding=name(a[1]);if(a[2].type!=='string'||!/^[_A-Za-z][_A-Za-z0-9]*$/.test(a[2].value)||a[3].type!=='string'||!/^\.\.\/[A-Za-z0-9_/-]+\.js$/.test(a[3].value))bad('use 需要全域名稱及 ../ 內的模組路徑。',n);imports.push({binding,global:a[2].value,path:a[3].value});}else if(h==='export'){arity(n,1,1);if(exported!==null)bad('export 只能出現一次。',n);exported=expr(a[1]);}else body.push(n);}
 if(exported===null)bad('缺少 export。',tree);
 return '// Generated by MathScript Web 0.1; edit the .msw source.\n(function(root,factory){const api=factory(typeof module==="object"&&module.exports?require("../compiler/runtime.js"):root.MathWebRuntime'+imports.map(i=>',typeof module==="object"&&module.exports?require('+JSON.stringify(i.path)+'):root['+JSON.stringify(i.global)+']').join('')+');if(typeof module==="object"&&module.exports)module.exports=api;else root['+JSON.stringify(moduleName)+']=api;})(globalThis,function(R'+imports.map(i=>','+i.binding).join('')+'){"use strict";\n'+block(body,false)+'\nreturn R.expose('+exported+');\n});\n';
}
module.exports={compile};
