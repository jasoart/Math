'use strict';
const assert=require('node:assert/strict'),host=require('./studio-test-host.cjs'),h=host('graph.html'),{w,d,$,load,input,wait,errors,downloads}=h;
(async()=>{
 for(const s of d.querySelectorAll('script[src]')){const file=s.getAttribute('src').replace(/^\.\//,'');if(file==='engine/pwa.js')continue;load(file);}
 await wait(250);const A=w.GraphStudio;
 assert.equal($('studyTool').options.length,10);
 const replace=source=>A.applyRows([{text:source,label:'測試'}],{replace:true});
 const run=id=>{input('studyTool',id);$('runStudy').click();assert.equal($('studyMessage').dataset.error,'false',id+': '+$('studyMessage').textContent);assert.equal($('studyResult').hidden,false);};
 replace('x^2-1');run('sign');assert.match($('studyResult').textContent,/零點：-1、1/);assert.equal(d.querySelectorAll('#studyResult tbody tr').length,7);
 input('study-relation','>');assert.equal($('studyResult').hidden,true);assert.equal($('studyHTML').disabled,true);$('runStudy').click();assert.match($('studyResult').textContent,/解集/);
 run('variation');assert.match($('studyResult').textContent,/局部極小/);
 replace('(x^2-1)/(x-1)');run('limits');assert.match($('studyResult').textContent,/極限 ≈ 2/);assert.match(A.getSVG(),/破洞/);
 $('showGuides').checked=false;$('showGuides').dispatchEvent(new w.Event('change'));assert.equal(A.snapshot().display.guides,false);assert.ok(!A.getSVG().includes('破洞'));$('showGuides').checked=true;$('showGuides').dispatchEvent(new w.Event('change'));
 replace('x^2');run('tangent');const before=JSON.stringify(A.snapshot().rows);$('addStudy').click();assert.equal(A.snapshot().rows.length,6);assert.equal($('studyResult').hidden,true);$('undoGraph').click();assert.equal(JSON.stringify(A.snapshot().rows),before);
 run('transform');$('addStudy').click();assert.equal(A.snapshot().rows.length,2);assert.ok(A.snapshot().rows[1].text.includes('x-(2)'));
 replace('x^2');run('inverse');$('addStudy').click();assert.equal(w.GraphMath.parse(A.snapshot().rows[1].text).kind,'implicit');
 run('circle');$('replaceStudy').click();assert.equal(A.snapshot().rows.length,6);assert.equal(A.snapshot().rows[0].label,'圓');
 run('triangle');$('addStudy').click();assert.match($('studyMessage').textContent,/12 列/);assert.equal(A.snapshot().rows.length,6);$('replaceStudy').click();assert.equal(A.snapshot().rows.length,10);assert.deepEqual(Array.from(A.snapshot().t),[0,1]);
 run('regression');assert.equal(d.querySelectorAll('#studyResult tbody tr').length,5);$('studyCSV').click();assert.equal(downloads.at(-1).name,'mathlab-investigation.csv');assert.match(await downloads.at(-1).blob.text(),/殘差/);
 input('study-data','1,2\n1,3');$('runStudy').click();assert.equal($('studyMessage').dataset.error,'true');assert.equal($('studyHTML').disabled,true);
 replace('x^2');run('riemann');assert.equal($('clearStudyOverlay').disabled,false);assert.ok(A.getSVG().includes('#08917b25'));$('studyHTML').click();assert.equal(downloads.at(-1).name,'mathlab-investigation.html');const html=await downloads.at(-1).blob.text();assert.match(html,/<svg/);assert.match(html,/探究條件/);assert.match(html,/midpoint/);assert.ok(!/NaN|Infinity/.test(html));
 $('clearStudyOverlay').click();assert.ok(!A.getSVG().includes('#08917b25'));$('runStudy').click();input(d.querySelector('.expression-input'),'x^3');assert.equal($('studyHTML').disabled,true);assert.ok(!A.getSVG().includes('#08917b25'));
 replace('a*x^2');run('tangent');d.querySelector('[aria-label="播放參數 a"]').click();assert.equal($('studyHTML').disabled,true);A.stop();
 replace('abs(x)');input('studyTool','tangent');input('study-x',0);$('runStudy').click();assert.match($('studyResult').textContent,/無法確認有限導數/);
 await wait(250);assert.deepEqual(errors,[]);console.log('PASS high-school DOM: all 10 tools, graph/parameter invalidation, row limit, append/replace/undo, holes/guides, overlays, CSV/HTML/SVG and singular points.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>h.close());
