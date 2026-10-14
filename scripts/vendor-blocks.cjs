'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),src=path.join(root,'node_modules/blockly'),dst=path.join(root,'vendor/blockly');
fs.mkdirSync(dst,{recursive:true});
for(const file of ['blockly_compressed.js','msg/zh-hant.js']){fs.mkdirSync(path.dirname(path.join(dst,file)),{recursive:true});fs.copyFileSync(path.join(src,file),path.join(dst,file));}
// The npm distribution omits LICENSE; retain the release's checked-in Apache 2.0 text.
if(!fs.existsSync(path.join(dst,'LICENSE')))throw Error('Missing vendor/blockly/LICENSE from the pinned upstream release.');
fs.cpSync(path.join(src,'media'),path.join(dst,'media'),{recursive:true});
fs.writeFileSync(path.join(dst,'VERSION'),require(path.join(src,'package.json')).version+'\n');
console.log('Vendored Blockly '+require(path.join(src,'package.json')).version+' with license, Traditional Chinese locale and offline media.');
