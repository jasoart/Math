'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=process.env.SCREENSHOT_DIR||'/tmp/mathlab-review';fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png','.webp':'image/webp'};
const server=http.createServer((req,res)=>{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}try{const content=fs.readFileSync(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(content);}catch{res.writeHead(404);res.end();}});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote']});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1050},serviceWorkers:'block'}),errors=[];page.on('pageerror',e=>errors.push(e.stack));
    await page.goto(base+'/script.html');await page.waitForFunction(()=>window.MathBlockStudio&&document.querySelector('#runStatus').textContent!=='執行中');
    await page.waitForTimeout(400);assert.match(await page.locator('#blockStatus').textContent(),/同步|拖入|恢復/);
    assert.equal(await page.evaluate(()=>MathBlockStudio.generate()===document.querySelector('#source').value),true);
    await page.screenshot({path:path.join(out,'blocks-desktop.png'),fullPage:true});
    // Exercise the real pointer drag pipeline, not only workspace APIs.
    const count=await page.evaluate(()=>MathBlockStudio.workspace.getAllBlocks(false).length);
    await page.locator('.blocklyToolboxCategory').filter({hasText:'運算'}).click();
    const fly=await page.locator('.blocklyFlyout .blocklyDraggable').first().boundingBox(),area=await page.locator('#blockCanvas').boundingBox();
    await page.mouse.move(fly.x+15,fly.y+12);await page.mouse.down();await page.mouse.move(area.x+area.width-130,area.y+130,{steps:18});await page.mouse.up();
    await page.waitForTimeout(400);assert.ok(await page.evaluate(()=>MathBlockStudio.workspace.getAllBlocks(false).length)>count,'drag creates a block');
    assert.match(await page.locator('#blockStatus').textContent(),/接回/);
    await page.locator('#blockUndo').click();await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>MathBlockStudio.workspace.getAllBlocks(false).length),count);
    await page.evaluate(()=>{const b=MathBlockStudio.workspace.getAllBlocks(false).find(b=>b.type==='ms_number');b.setFieldValue(1.5,'N');});
    await page.waitForTimeout(700);assert.match(await page.locator('#blockStatus').textContent(),/已同步/);
    await page.locator('#textMode').click();assert.equal(await page.locator('#source').isVisible(),true);
    await page.locator('#source').fill('title "Browser test"\nplot sin(x)\nprint 2+3');await page.waitForTimeout(700);await page.locator('#blockMode').click();
    assert.match(await page.evaluate(()=>MathBlockStudio.generate()),/Browser test/);
    await page.locator('#exampleSelect').selectOption('matrix-transform');await page.waitForTimeout(600);assert.match(await page.evaluate(()=>MathBlockStudio.generate()),/matrix|矩陣|transform|rotation/i);
    await page.locator('#inkExample').selectOption('sum');assert.ok(await page.locator('#inkPreview .mathink-svg').count());
    const download=page.waitForEvent('download');await page.locator('#inkExport').click();assert.equal((await download).suggestedFilename(),'mathink-formula.svg');
    await page.locator('#inkSource').fill('<img src=x onerror=alert(1)>');assert.equal(await page.locator('#inkPreview img').count(),0);assert.equal(await page.locator('#inkExport').isDisabled(),true);
    await page.goto(base+'/graph.html');await page.waitForFunction(()=>window.GraphStudio?.getRenderReport().background==='ready');
    await page.locator('.expression-input').first().fill('y=sin(3x)');await page.waitForTimeout(350);await page.waitForFunction(()=>GraphStudio.getRenderReport().background==='ready');await page.locator('#exampleSelect').selectOption('quadratic');await page.waitForFunction(()=>GraphStudio.getRenderReport().background==='ready');
    await page.locator('#runField').click();await page.waitForFunction(()=>document.querySelector('#fieldStatus').textContent.includes('自適應積分'));
    assert.equal(await page.locator('#fieldCSV').isDisabled(),false);const svg=await page.evaluate(()=>GraphStudio.getSVG());assert.match(svg,/<svg/);assert.match(svg,/初始/);
    await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(150);await page.screenshot({path:path.join(out,'graph-desktop.png'),fullPage:true});
    await page.locator('#fieldPreset').selectOption('pendulum');await page.waitForFunction(()=>document.querySelector('#fieldStatus').textContent.includes('3 個初始點'));
    await page.locator('#fieldQ').fill('1/(');await page.locator('#runField').click();assert.equal(await page.locator('#fieldStatus').getAttribute('data-error'),'true');
    await page.locator('#fieldPreset').selectOption('oscillator');await page.waitForFunction(()=>document.querySelector('#fieldStatus').textContent.includes('2 個初始點'));await page.locator('#clearField').click();assert.equal(await page.locator('#fieldCSV').isDisabled(),true);
    await page.goto(base+'/index.html');await page.screenshot({path:path.join(out,'home-desktop.png'),fullPage:true});
    for(const width of [820,390]){
      await page.setViewportSize({width,height:width===820?1180:844});
      for(const name of ['index','script','graph']){await page.goto(base+'/'+name+'.html');await page.waitForTimeout(350);const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);if(overflow)console.log('OVERFLOW',await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+2&&getComputedStyle(e).position!=='absolute').map(e=>[e.tagName,e.id,e.className,String(e.getBoundingClientRect().right)]).slice(0,16)));assert.equal(overflow,false,name+' overflows at '+width);await page.screenshot({path:path.join(out,name+'-'+width+'.png'),fullPage:true});}
    }
    // Touch pointer events use the same Blockly workspace on a tablet viewport.
    const touch=await browser.newPage({viewport:{width:820,height:1180},hasTouch:true,serviceWorkers:'block'});
    await touch.goto(base+'/script.html');await touch.waitForFunction(()=>window.MathBlockStudio);await touch.locator('.blocklyToolboxCategory').filter({hasText:'運算'}).tap();
    const tf=await touch.locator('.blocklyFlyout .blocklyDraggable').first().boundingBox(),ta=await touch.locator('#blockCanvas').boundingBox(),before=await touch.evaluate(()=>MathBlockStudio.workspace.getAllBlocks(false).length),cdp=await touch.context().newCDPSession(touch);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tf.x+15,y:tf.y+12,id:1}]});
    for(let i=1;i<=12;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:tf.x+15+(ta.x+ta.width-65-tf.x-15)*i/12,y:tf.y+12+60*i/12,id:1}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.waitForTimeout(400);assert.ok(await touch.evaluate(()=>MathBlockStudio.workspace.getAllBlocks(false).length)>before,'touch drag creates a block');await touch.reload();await touch.waitForFunction(()=>window.MathBlockStudio);assert.ok(await touch.evaluate(()=>MathBlockStudio.workspace.getAllBlocks(false).length)>before,'incomplete draft survives reload');await touch.close();
    const offline=await browser.newPage();await offline.goto(base+'/script.html');await offline.waitForFunction(()=>navigator.serviceWorker?.controller);await offline.context().setOffline(true);await offline.reload();await offline.waitForFunction(()=>window.MathBlockStudio);assert.ok(await offline.locator('#blockCanvas .blocklySvg').count());await offline.goto(base+'/graph.html');await offline.locator('#runField').click();await offline.waitForFunction(()=>document.querySelector('#fieldStatus').textContent.includes('自適應積分'));await offline.close();
    assert.deepEqual(errors,[]);console.log('Browser checks passed: block/text editing, examples, MathInk SVG, worker refinement, dynamics, exports, desktop/tablet/phone layouts. Screenshots: '+out);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
