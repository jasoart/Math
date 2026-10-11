Runtime formula rendering uses the pinned KaTeX dependency from package.json.
The distributed JavaScript, CSS and fonts are kept locally so GitHub Pages and the installed application can work offline. Its MIT license is retained in katex/LICENSE.
After npm ci, npm run vendor:math refreshes these files; npm run build:pwa then rebuilds the offline shell digest. Do not strip font files or licenses.
