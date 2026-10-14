/* Progressive block editor: text remains an accessible, lossless fallback. */
(() => {
  'use strict';
  const B=window.Blockly,M=window.MathBlocks,$=id=>document.getElementById(id),source=$('source');
  if(!B||!M||!source)return;
  M.register(B);
  const theme=B.Theme.defineTheme('mathlab',{base:B.Themes.Classic,componentStyles:{workspaceBackgroundColour:'#f7f9f7',toolboxBackgroundColour:'#ffffff',toolboxForegroundColour:'#34444a',flyoutBackgroundColour:'#edf2ee',flyoutForegroundColour:'#243c37',flyoutOpacity:1,scrollbarColour:'#9fb8ae',insertionMarkerColour:'#165f59',insertionMarkerOpacity:.25},fontStyle:{family:'system-ui, sans-serif',weight:'500',size:12},startHats:true});
  const workspace=B.inject('blockCanvas',{toolbox:M.toolbox(),theme,renderer:'zelos',media:'./vendor/blockly/media/',sounds:false,trashcan:true,grid:{spacing:24,length:2,colour:'#d2ded6',snap:true},zoom:{controls:true,wheel:false,startScale:.76,maxScale:1.5,minScale:.35,scaleSpeed:1.15},move:{scrollbars:true,drag:true,wheel:true},maxBlocks:M.MAX});
  let loading=false,applying=false,pending=false,lastSource=source.value,timer,mode='blocks';
  const key='mathlab-blocks-v1',status=(s,error=false)=>{$('blockStatus').textContent=s;$('blockStatus').dataset.error=String(error);};
  function save(){try{localStorage.setItem(key,JSON.stringify({version:1,source:lastSource,workspace:B.serialization.workspaces.save(workspace)}));}catch{status('此瀏覽器無法儲存積木草稿，請使用匯出。',true);}}
  function refreshCode(code){$('blockCode').textContent=code;$('blockCount').textContent=workspace.getAllBlocks(false).length+' 積木';}
  function loadSource(){
    loading=true;
    const backup=B.serialization.workspaces.save(workspace);
    try{M.loadSource(B,workspace,source.value);lastSource=source.value;pending=false;refreshCode(source.value);status('拖入積木並接上插槽；完成的程式會即時更新預覽。');workspace.clearUndo();requestAnimationFrame(()=>{B.svgResize(workspace);workspace.scroll(10,20);});save();}
    catch(e){if(backup.blocks)M.load(B,workspace,backup);status('保留文字模式：'+e.message,true);show('text');}
    finally{loading=false;}
  }
  function sync(run=false){
    try{
      if(source.value!==lastSource)throw Error('文字程式已改變，請先按「從文字載入」，避免覆蓋另一份編輯。');
      const code=M.generate(workspace);refreshCode(code);
      if(code!==source.value){applying=true;source.value=code;source.dispatchEvent(new Event('input',{bubbles:true}));applying=false;}
      lastSource=code;pending=false;status('積木與程式已同步 · '+workspace.getAllBlocks(false).length+' 積木');save();if(run)$('runScript').click();return true;
    }catch(e){applying=false;pending=true;status(e.message,true);save();return false;}
  }
  function show(next){mode=next;document.body.dataset.editor=next;$('blockMode').setAttribute('aria-pressed',String(next==='blocks'));$('textMode').setAttribute('aria-pressed',String(next==='text'));$('blockEditor').hidden=next!=='blocks';for(const el of document.querySelectorAll('.code-wrap,.snippet-toolbar,.editor-bottom'))el.hidden=next==='blocks';$('editorHint').textContent=next==='blocks'?'從左側挑選積木，拖入工作區並接上起點。右鍵／長按函數可增減引數；文字模式支援鍵盤完整編輯。':'每行一個指令。Ctrl／⌘ + Enter 執行。';if(next==='blocks')requestAnimationFrame(()=>B.svgResize(workspace));}
  $('blockMode').onclick=()=>{show('blocks');if(!pending&&lastSource!==source.value)loadSource();};$('textMode').onclick=()=>show('text');
  for(const id of ['runScript','saveProject','exportProject','shareProject'])$(id).addEventListener('click',event=>{if(mode==='blocks'&&pending&&!sync()){event.preventDefault();event.stopImmediatePropagation();}},true);
  document.addEventListener('keydown',event=>{if(mode==='blocks'&&(event.ctrlKey||event.metaKey)&&event.key==='Enter'&&!sync()){event.preventDefault();event.stopImmediatePropagation();}},true);
  $('reloadBlocks').onclick=()=>{if(pending){$('blockRecovery').textContent=JSON.stringify(B.serialization.workspaces.save(workspace));$('blockRecoveryPanel').hidden=false;}loadSource();};
  $('blockRun').onclick=()=>sync(true);$('blockUndo').onclick=()=>workspace.undo(false);$('blockRedo').onclick=()=>workspace.undo(true);$('blockFit').onclick=()=>workspace.zoomToFit();
  const download=(name,text)=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([text],{type:'application/json'}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  $('exportBlocks').onclick=()=>download('experiment.blocks.json',JSON.stringify({kind:'mathscript-blocks',version:1,workspace:B.serialization.workspaces.save(workspace)},null,2));
  $('recoverBlocks').onclick=()=>download('recovered.blocks.json',JSON.stringify({kind:'mathscript-blocks',version:1,workspace:JSON.parse($('blockRecovery').textContent)},null,2));
  $('importBlocks').onclick=()=>$('blocksFile').click();
  $('blocksFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;const backup=B.serialization.workspaces.save(workspace);try{if(file.size>350000)throw Error('積木檔案不可超過 350 KB。');const value=JSON.parse(await file.text());if(value.kind!=='mathscript-blocks'||value.version!==1)throw Error('不是支援的積木作品。');loading=true;M.load(B,workspace,value.workspace);loading=false;pending=true;show('blocks');sync();requestAnimationFrame(()=>{B.svgResize(workspace);workspace.scroll(10,20);});}catch(error){loading=true;M.load(B,workspace,backup);loading=false;status('匯入失敗：'+error.message,true);}finally{e.target.value='';}};
  workspace.addChangeListener(e=>{if(loading||e.isUiEvent||e.type===B.Events.FINISHED_LOADING)return;pending=true;clearTimeout(timer);timer=setTimeout(()=>sync(),300);});
  window.addEventListener('mathscript:source',()=>{if(applying)return;if(source.value===lastSource)return;if(pending){status('文字已更新，未完成積木仍保留。按「從文字載入」可切換，舊積木會提供備份。',true);show('text');}else loadSource();});
  new ResizeObserver(()=>B.svgResize(workspace)).observe($('blockCanvas'));
  window.addEventListener('pagehide',save);
  let saved=null;try{saved=JSON.parse(localStorage.getItem(key));}catch{}
  show('blocks');
  if(saved?.version===1&&saved.source===source.value){loading=true;try{M.load(B,workspace,saved.workspace);pending=true;refreshCode(source.value);status('已恢復積木草稿。');}catch{loadSource();}finally{loading=false;}}else loadSource();
  // Exposed for local diagnostics and integration tests, never evaluates JavaScript.
  window.MathBlockStudio=Object.freeze({workspace,generate:()=>M.generate(workspace),sync,show,loadSource});
})();
