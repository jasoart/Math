'use strict';
// Project source accounting, deliberately separate from GitHub Linguist.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {cwd: root, encoding: 'utf8'}).split('\0').filter(Boolean);
const groups = {
  JavaScript: {color: '#f1d54a', extensions: ['.js', '.cjs', '.mjs']},
  'Other · MathScript Web': {color: '#16a085', extensions: ['.msw']},
  HTML: {color: '#e66a45', extensions: ['.html']},
  CSS: {color: '#956bd6', extensions: ['.css']},
  Python: {color: '#4389bc', extensions: ['.py']}
};
const totals = Object.fromEntries(Object.keys(groups).map(name => [name, {bytes: 0, files: []}]));
for (const file of [...new Set(files)].sort()) {
  if (file.startsWith('vendor/')) continue;
  if (/\.js$/.test(file) && fs.existsSync(path.join(root, file.replace(/\.js$/, '.msw')))) continue;
  const filename = path.join(root, file);
  if (!fs.existsSync(filename) || !fs.statSync(filename).isFile()) continue;
  const name = Object.keys(groups).find(name => groups[name].extensions.includes(path.extname(file)));
  if (name) {totals[name].bytes += fs.statSync(filename).size; totals[name].files.push(file);}
}
const total = Object.values(totals).reduce((sum, group) => sum + group.bytes, 0);
const languages = Object.entries(totals).filter(([,group]) => group.bytes).sort((a,b) => b[1].bytes-a[1].bytes).map(([name,group]) => ({name, ...group, percentage: Number((group.bytes/total*100).toFixed(2))}));
const report = {schema: 1, method: 'Project-defined authored source bytes; NOT GitHub Linguist. Other means custom .msw sources. Excludes vendor/, .js siblings of .msw, and extensions outside the documented allowlist.', totalBytes: total, languages};
const escape = value => String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
let x = 24;
const bars = languages.map(({name,bytes}) => {const width = 632*bytes/total; const segment = `<rect x="${x.toFixed(3)}" y="90" width="${width.toFixed(3)}" height="16" fill="${groups[name].color}"/>`; x += width; return segment;}).join('');
const rows = languages.map(({name,bytes,percentage}, i) => `<circle cx="30" cy="${139+i*30}" r="5" fill="${groups[name].color}"/><text x="46" y="${144+i*30}" fill="#e6edf3">${escape(name)}</text><text x="550" y="${144+i*30}" text-anchor="end" fill="#e6edf3">${percentage.toFixed(2)}%</text><text x="656" y="${144+i*30}" text-anchor="end" fill="#a4aebc">${(bytes/1024).toFixed(1)} KiB</text>`).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="680" height="330" viewBox="0 0 680 330" role="img" aria-labelledby="title desc">
<title id="title">Project source languages — custom report</title><desc id="desc">Not GitHub Linguist. Other represents MathScript Web source. ${languages.map(x=>escape(x.name+' '+x.percentage+' percent')).join('; ')}</desc>
<rect width="680" height="330" rx="16" fill="#0d1117"/><g font-family="system-ui, sans-serif" font-size="14"><text x="24" y="36" font-size="20" font-weight="700" fill="#f0f6fc">Source languages</text><text x="24" y="62" fill="#a4aebc">Project report · NOT GitHub Linguist · generated JS excluded</text>${bars}${rows}<text x="24" y="312" font-size="12" fill="#a4aebc">Other = custom MathScript Web (.msw) · rebuild: npm run languages</text></g></svg>
`;
for (const [file, content] of [['docs/source-languages.json', JSON.stringify(report,null,2)+'\n'], ['docs/source-languages.svg', svg]]) {
  if (process.argv.includes('--check')) assert.equal(fs.readFileSync(path.join(root,file),'utf8'), content, 'Source report is stale: '+file);
  else fs.writeFileSync(path.join(root,file),content);
}
console.log(`${languages.length} source categories; ${total} authored bytes. This is a custom report, not GitHub Linguist.`);
