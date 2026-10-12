'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM,VirtualConsole}=require('jsdom'),A=require('../academy/models');
const base=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(base,f),'utf8'),errors=[],downloads=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM(read('academy.html'),{url:'https://example.test/Math/academy.html',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc}),w=dom.window,d=w.document,$=id=>d.getElementById(id);
w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};w.Blob=Blob;
const blobs=new Map();w.URL.createObjectURL=blob=>{const key='blob:test-'+blobs.size;blobs.set(key,blob);return key};w.URL.revokeObjectURL=()=>{};
w.HTMLAnchorElement.prototype.click=function(){downloads.push({name:this.download,blob:blobs.get(this.href)})};
w.fetch=async()=>({ok:true,json:async()=>JSON.parse(read('engine/catalog.json'))});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const change=(el,value,event='change')=>{el.value=value;el.dispatchEvent(new w.Event(event,{bubbles:true}))};
function answer(value){$('academyAnswer').value=value;$('academyAnswerForm').dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}));}
const saved=()=>JSON.parse(w.localStorage.getItem('mathlab.academy.v1'));
(async()=>{
  for(const e of d.querySelectorAll('script[src]')){const file=e.getAttribute('src').replace(/^\.\//,'');if(file==='engine/pwa.js')continue;new vm.Script(read(file),{filename:file}).runInContext(dom.getInternalVMContext());}
  assert.ok($('academyPlot').querySelector('svg'));assert.equal($('academyList').children.length,12);assert.match($('academyCount').textContent,/540/);assert.equal($('academyPage').textContent,'1 / 45');
  $('academyNext').click();assert.equal($('academyPage').textContent,'2 / 45');$('academyPrevious').click();
  change($('academyTopic'),'微積分');assert.match($('academyCount').textContent,/60/);assert.equal($('academyModel').options.length,6);
  change($('academyModel'),'optimization');assert.equal($('academyList').children.length,12);$('academyList').querySelector('button').click();assert.match($('academyTitle').textContent,/最大面積/);
  const initial=A.run('academy-optimization-01');answer('window.alert(1)');assert.match($('academyFeedback').textContent,/尚未計入/);assert.equal(Object.keys(saved().items).length,0);
  answer(String(initial.answer));assert.match($('academyFeedback').textContent,/答對/);assert.equal(saved().items[initial.scenario.id].correct,1);answer(String(initial.answer));assert.equal(saved().items[initial.scenario.id].attempts,1);
  $('academyFavorite').click();assert.equal($('academyFavorite').getAttribute('aria-pressed'),'true');change($('academyStatus'),'favorite');assert.equal($('academyList').children.length,1);
  $('academyCompare').checked=true;$('academyCompare').dispatchEvent(new w.Event('change'));assert.match($('academyLegend').textContent,/初始/);
  const slider=d.querySelector('#academyControls input[type=range]');change(slider,'40','input');assert.equal($('academyCheck').disabled,true);assert.equal($('academyScript').hasAttribute('href'),false);await wait(110);assert.equal($('academyCheck').disabled,false);assert.match($('academyQuestion').textContent,/40/);
  const exportedDoc=JSON.parse(decodeURIComponent(new URL($('academyScript').href).hash.slice(4)));assert.match(exportedDoc.source,/perimeter = 40/);assert.equal(w.MathScript.run(exportedDoc.source).outputs[1].value,100);
  answer('0');assert.equal(saved().items[initial.scenario.id].needsReview,true);$('academyReset').click();answer('36');assert.equal(saved().items[initial.scenario.id].needsReview,false);
  $('academyShare').click();assert.ok($('academyShareDialog').open);assert.deepEqual(JSON.parse(JSON.stringify(w.MathAcademyState.parseHash(new URL($('academyShareURL').value).hash).parameters)),initial.parameters);
  $('academySource').click();assert.match(downloads.at(-1).name,/mathscript$/);assert.match(await downloads.at(-1).blob.text(),/周長/);
  $('academyReport').click();const report=await downloads.at(-1).blob.text();assert.match(report,/題目與推導/);assert.match(report,/svg/);
  $('academyExport').click();const backup=await downloads.at(-1).blob.text();assert.match(backup,/mathlab-academy/);
  const before=JSON.stringify(saved().items);Object.defineProperty($('academyFile'),'files',{configurable:true,value:[{size:1,text:async()=>'{bad'}]});await $('academyFile').onchange({target:$('academyFile')});assert.equal(JSON.stringify(saved().items),before);assert.match($('academyStorage').textContent,/未匯入/);
  Object.defineProperty($('academyFile'),'files',{configurable:true,value:[{size:backup.length,text:async()=>backup}]});await $('academyFile').onchange({target:$('academyFile')});assert.match($('academyStorage').textContent,/已匯入/);
  $('academyVariant').click();assert.match($('academyTitle').textContent,/情境 02/);assert.equal($('academyCheck').disabled,false);
  w.location.hash='#academy-binomial-01';await wait(20);assert.match($('academyTitle').textContent,/二項/);assert.equal($('academyCSV').disabled,false);$('academyCSV').click();assert.match(await downloads.at(-1).blob.text(),/table,line,x,value/);
  w.location.hash='#academy-linear-01?p=%ZZ';await wait(20);assert.match($('academyTitle').textContent,/二項/);assert.match($('academyStorage').textContent,/無法開啟連結/);
  const setter=w.Storage.prototype.setItem;w.Storage.prototype.setItem=()=>{throw Error('quota')};$('academyFavorite').click();assert.match($('academyStorage').textContent,/無法儲存/);w.Storage.prototype.setItem=setter;
  d.querySelector('[data-open-search]').click();await wait(10);change($('globalSearch'),'橢圓 情境 03','input');const link=d.querySelector('#searchResults a');assert.ok(link);assert.match(link.href,/academy.html#academy-ellipse-03/);
  const title=$('academyTitle').textContent;change($('academySearch'),'<img src=x onerror=alert(1)>','input');assert.equal(d.querySelector('#academyList img'),null);assert.match($('academyList').textContent,/沒有符合/);assert.equal($('academyTitle').textContent,title);
  const remote=JSON.parse(backup);remote.items['academy-linear-01']={favorite:true,attempts:0,correct:0,needsReview:false};
  w.dispatchEvent(new w.StorageEvent('storage',{key:'mathlab.academy.v1',newValue:JSON.stringify(remote)}));assert.match($('academyProgress').textContent,/收藏 2/);assert.match($('academyStorage').textContent,/其他分頁/);
  const recovery=new JSDOM(read('academy.html'),{url:'https://example.test/Math/academy.html#academy-linear-01?p=%ZZ',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
  recovery.window.localStorage.setItem('mathlab.academy.v1','{damaged-record');
  for(const e of recovery.window.document.querySelectorAll('script[src]')){const file=e.getAttribute('src').replace(/^\.\//,'');if(['engine/pwa.js','engine/navigation.js'].includes(file))continue;new vm.Script(read(file),{filename:file}).runInContext(recovery.getInternalVMContext());}
  assert.equal(recovery.window.localStorage.getItem('mathlab.academy.v1'),'{damaged-record');assert.match(recovery.window.document.getElementById('academyStorage').textContent,/無法開啟連結/);recovery.window.close();
  assert.deepEqual(errors,[]);console.log('PASS academy DOM: filters/pagination, parameter edits, comparison, grading/retry guards, review/favorites, share, MathScript transfer, CSV/HTML/source/JSON exports, import rejection, storage failures and 736-entry search.');
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>w.close());
