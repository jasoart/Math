'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),from=path.join(root,'node_modules/katex'),dest=path.join(root,'vendor/katex');
const pinned=JSON.parse(fs.readFileSync(path.join(root,'package.json'))).dependencies.katex;
if(JSON.parse(fs.readFileSync(path.join(from,'package.json'))).version!==pinned)throw Error('Install the pinned KaTeX dependency before vendoring.');
fs.mkdirSync(dest,{recursive:true});for(const name of ['katex.min.js','katex.min.css'])fs.copyFileSync(path.join(from,'dist',name),path.join(dest,name));fs.copyFileSync(path.join(from,'LICENSE'),path.join(dest,'LICENSE'));fs.cpSync(path.join(from,'dist/fonts'),path.join(dest,'fonts'),{recursive:true});console.log('Vendored pinned KaTeX runtime and fonts with license.');
