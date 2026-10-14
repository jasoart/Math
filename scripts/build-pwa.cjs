'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const pages = ['index.html', 'graph.html', 'spatial.html', 'script.html', 'practice.html', 'academy.html'];
function inventory() {
  const files = new Set([...pages, 'manifest.webmanifest']);
  for (const page of pages) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    for (const match of html.matchAll(/(?:src|href|srcset)=["']([^"']+)["']/g)) {
      const value = match[1].replace(/^\.\//, '').split(/[?#]/)[0];
      if (value && !value.startsWith('/') && !value.includes(':') && /\.(?:js|css|png|webp|svg|webmanifest)$/.test(value)) files.add(value);
    }
  }
  function scan(relative) {
    for (const item of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
      const next = relative + '/' + item.name;
      if (item.isDirectory()) scan(next);
      else if (/\.(?:js|css|png|webp|svg|woff2?|ttf|json|msw|cur|gif)$/.test(item.name)) files.add(next);
    }
  }
  for (const directory of ['assets', 'engine', 'graph', 'spatial', 'language', 'compiler', 'curriculum', 'academy', 'vendor/katex', 'vendor/blockly']) scan(directory);
  const sorted = [...files].sort();
  for (const file of sorted) { if (!fs.existsSync(path.join(root, file))) throw Error('Missing PWA asset: ' + file); }
  return sorted;
}
function build() {
  const files = inventory();
  const workerPath = path.join(root, 'sw.js');
  const worker = fs.readFileSync(workerPath, 'utf8');
  const template = worker.replace(/const BUILD = '[^']*';/, "const BUILD = 'pending';").replace(/const PRECACHE = \[[\s\S]*?\];/, 'const PRECACHE = [];');
  const hash = crypto.createHash('sha256');
  hash.update(template);
  for (const file of files) { hash.update(file); hash.update(fs.readFileSync(path.join(root, file))); }
  const revision = hash.digest('hex').slice(0, 20);
  const output = template.replace("const BUILD = 'pending';", "const BUILD = '" + revision + "';").replace('const PRECACHE = [];', 'const PRECACHE = ' + JSON.stringify(files, null, 2) + ';');
  fs.writeFileSync(workerPath, output);
  return { revision, files, bytes: files.reduce((sum, file) => sum + fs.statSync(path.join(root, file)).size, 0) };
}
module.exports = { inventory, build };
if (require.main === module) { const result = build(); console.log('PWA shell: ' + result.files.length + ' local assets, ' + (result.bytes / 1024 / 1024).toFixed(2) + ' MB, ' + result.revision); }
