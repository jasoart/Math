'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(__dirname,'compiler.msw'),'utf8');
const seed=require('./seed.cjs'),stage1=seed.compile(source);
function load(code){const m={exports:{}};vm.runInNewContext(code,{module:m,require:p=>require(path.resolve(__dirname,p))},{timeout:5000});return m.exports;}
const stage2=load(stage1).compile(source),stage3=load(stage2).compile(source);
assert.equal(stage2,stage1,'self compiler output must match seed');assert.equal(stage3,stage2,'self compilation must reach a byte-identical fixed point');
const compiler=load(stage3),files=['compiler/compiler.msw','curriculum/geometry.msw','curriculum/catalog.msw','curriculum/modules.msw','curriculum/tools.msw'];
const check=process.argv.includes('--check');let count=0;
for(const file of files){const input=path.join(root,file);if(!fs.existsSync(input))throw Error('Missing source: '+file);const code=compiler.compile(fs.readFileSync(input,'utf8'));new vm.Script(code,{filename:file});const dest=input.replace(/\.msw$/,'.js');if(check)assert.equal(fs.readFileSync(dest,'utf8'),code,'generated artifact is stale: '+file);else fs.writeFileSync(dest,code);count++;}
console.log(`MathScript Web: ${count} modules ${check?'verified':'built'}; 3-stage self compilation is byte-identical.`);
