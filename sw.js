'use strict';
// Generated shell inventory is refreshed by node scripts/build-pwa.cjs before release.
const BUILD = '41a73df9c09867ac5f08';
const PRECACHE = [
  "academy.html",
  "academy/academy.css",
  "academy/academy.js",
  "academy/models.js",
  "academy/state.js",
  "app.js",
  "assets/favicon.svg",
  "assets/studio-app-icon.svg",
  "assets/studio-hero-mobile.webp",
  "assets/studio-hero.webp",
  "assets/studio-icon.png",
  "assets/studio-icon.webp",
  "assets/studio-math.svg",
  "compiler/compiler.js",
  "compiler/compiler.msw",
  "compiler/playground.css",
  "compiler/playground.js",
  "compiler/runtime.js",
  "compiler/worker.js",
  "curriculum/bridge.js",
  "curriculum/catalog.js",
  "curriculum/catalog.msw",
  "curriculum/geometry.js",
  "curriculum/geometry.msw",
  "curriculum/modules.js",
  "curriculum/modules.msw",
  "curriculum/tools.js",
  "curriculum/tools.msw",
  "engine/canvas.js",
  "engine/catalog.json",
  "engine/dashboard.js",
  "engine/insight.css",
  "engine/navigation.js",
  "engine/practice-ui.js",
  "engine/practice.js",
  "engine/pwa.css",
  "engine/pwa.js",
  "engine/spatial-bridge.js",
  "engine/studio.css",
  "engine/typeset.css",
  "engine/typeset.js",
  "engine/workspace.js",
  "exam-modules.js",
  "expansion-modules.js",
  "extension-modules.js",
  "graph.html",
  "graph/exact.js",
  "graph/graph.css",
  "graph/graph.js",
  "graph/insight.js",
  "graph/math.js",
  "graph/render.js",
  "graph/state.js",
  "graph/study-ui.js",
  "graph/study.css",
  "graph/study.js",
  "graph/svg.js",
  "index.html",
  "language/display.js",
  "language/editor-tools.js",
  "language/examples.js",
  "language/mathscript.js",
  "language/studio.css",
  "language/studio.js",
  "language/values.js",
  "language/worker.js",
  "learning.js",
  "manifest.webmanifest",
  "math-keyboard.css",
  "math-keyboard.js",
  "practice.html",
  "script.html",
  "spatial.html",
  "spatial/core.js",
  "spatial/geometry-render.js",
  "spatial/geometry-studio.css",
  "spatial/geometry-studio.js",
  "spatial/geometry.js",
  "spatial/spatial.css",
  "spatial/spatial.js",
  "studio-modules.js",
  "styles.css",
  "vendor/katex/fonts/KaTeX_AMS-Regular.ttf",
  "vendor/katex/fonts/KaTeX_AMS-Regular.woff",
  "vendor/katex/fonts/KaTeX_AMS-Regular.woff2",
  "vendor/katex/fonts/KaTeX_Caligraphic-Bold.ttf",
  "vendor/katex/fonts/KaTeX_Caligraphic-Bold.woff",
  "vendor/katex/fonts/KaTeX_Caligraphic-Bold.woff2",
  "vendor/katex/fonts/KaTeX_Caligraphic-Regular.ttf",
  "vendor/katex/fonts/KaTeX_Caligraphic-Regular.woff",
  "vendor/katex/fonts/KaTeX_Caligraphic-Regular.woff2",
  "vendor/katex/fonts/KaTeX_Fraktur-Bold.ttf",
  "vendor/katex/fonts/KaTeX_Fraktur-Bold.woff",
  "vendor/katex/fonts/KaTeX_Fraktur-Bold.woff2",
  "vendor/katex/fonts/KaTeX_Fraktur-Regular.ttf",
  "vendor/katex/fonts/KaTeX_Fraktur-Regular.woff",
  "vendor/katex/fonts/KaTeX_Fraktur-Regular.woff2",
  "vendor/katex/fonts/KaTeX_Main-Bold.ttf",
  "vendor/katex/fonts/KaTeX_Main-Bold.woff",
  "vendor/katex/fonts/KaTeX_Main-Bold.woff2",
  "vendor/katex/fonts/KaTeX_Main-BoldItalic.ttf",
  "vendor/katex/fonts/KaTeX_Main-BoldItalic.woff",
  "vendor/katex/fonts/KaTeX_Main-BoldItalic.woff2",
  "vendor/katex/fonts/KaTeX_Main-Italic.ttf",
  "vendor/katex/fonts/KaTeX_Main-Italic.woff",
  "vendor/katex/fonts/KaTeX_Main-Italic.woff2",
  "vendor/katex/fonts/KaTeX_Main-Regular.ttf",
  "vendor/katex/fonts/KaTeX_Main-Regular.woff",
  "vendor/katex/fonts/KaTeX_Main-Regular.woff2",
  "vendor/katex/fonts/KaTeX_Math-BoldItalic.ttf",
  "vendor/katex/fonts/KaTeX_Math-BoldItalic.woff",
  "vendor/katex/fonts/KaTeX_Math-BoldItalic.woff2",
  "vendor/katex/fonts/KaTeX_Math-Italic.ttf",
  "vendor/katex/fonts/KaTeX_Math-Italic.woff",
  "vendor/katex/fonts/KaTeX_Math-Italic.woff2",
  "vendor/katex/fonts/KaTeX_SansSerif-Bold.ttf",
  "vendor/katex/fonts/KaTeX_SansSerif-Bold.woff",
  "vendor/katex/fonts/KaTeX_SansSerif-Bold.woff2",
  "vendor/katex/fonts/KaTeX_SansSerif-Italic.ttf",
  "vendor/katex/fonts/KaTeX_SansSerif-Italic.woff",
  "vendor/katex/fonts/KaTeX_SansSerif-Italic.woff2",
  "vendor/katex/fonts/KaTeX_SansSerif-Regular.ttf",
  "vendor/katex/fonts/KaTeX_SansSerif-Regular.woff",
  "vendor/katex/fonts/KaTeX_SansSerif-Regular.woff2",
  "vendor/katex/fonts/KaTeX_Script-Regular.ttf",
  "vendor/katex/fonts/KaTeX_Script-Regular.woff",
  "vendor/katex/fonts/KaTeX_Script-Regular.woff2",
  "vendor/katex/fonts/KaTeX_Size1-Regular.ttf",
  "vendor/katex/fonts/KaTeX_Size1-Regular.woff",
  "vendor/katex/fonts/KaTeX_Size1-Regular.woff2",
  "vendor/katex/fonts/KaTeX_Size2-Regular.ttf",
  "vendor/katex/fonts/KaTeX_Size2-Regular.woff",
  "vendor/katex/fonts/KaTeX_Size2-Regular.woff2",
  "vendor/katex/fonts/KaTeX_Size3-Regular.ttf",
  "vendor/katex/fonts/KaTeX_Size3-Regular.woff",
  "vendor/katex/fonts/KaTeX_Size3-Regular.woff2",
  "vendor/katex/fonts/KaTeX_Size4-Regular.ttf",
  "vendor/katex/fonts/KaTeX_Size4-Regular.woff",
  "vendor/katex/fonts/KaTeX_Size4-Regular.woff2",
  "vendor/katex/fonts/KaTeX_Typewriter-Regular.ttf",
  "vendor/katex/fonts/KaTeX_Typewriter-Regular.woff",
  "vendor/katex/fonts/KaTeX_Typewriter-Regular.woff2",
  "vendor/katex/katex.min.css",
  "vendor/katex/katex.min.js"
];
const BASE = new URL(self.registration.scope);
const PREFIX = 'mathlab-pwa-' + encodeURIComponent(BASE.pathname) + '-';
const SHELL_CACHE = PREFIX + 'shell-' + BUILD;
const RUNTIME_CACHE = PREFIX + 'runtime-' + BUILD;
const RUNTIME_LIMIT = 64;
const shellURLs = new Set(PRECACHE.map(path => new URL(path, BASE).href));
const pageNames = new Set(['', 'index.html', 'graph.html', 'spatial.html', 'script.html', 'practice.html', 'academy.html']);
function localPath(url) { return url.origin === BASE.origin && url.pathname.startsWith(BASE.pathname) ? url.pathname.slice(BASE.pathname.length) : null; }
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    try { await cache.addAll(PRECACHE.map(path => new Request(new URL(path, BASE), { cache: 'reload' }))); }
    catch (error) { await caches.delete(SHELL_CACHE); throw error; }
    // New versions wait for an explicit update action instead of interrupting a session.
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(PREFIX) && name !== SHELL_CACHE && name !== RUNTIME_CACHE).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'APPLY_UPDATE') event.waitUntil(self.skipWaiting());
});
async function runtimeAsset(request) {
  const cache = await caches.open(RUNTIME_CACHE), hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  const bytes = Number(response.headers.get('content-length'));
  if (response.ok && response.type === 'basic' && bytes > 0 && bytes <= 3 * 1024 * 1024) {
    await cache.put(request, response.clone());
    const keys = await cache.keys();
    await Promise.all(keys.slice(0, Math.max(0, keys.length - RUNTIME_LIMIT)).map(key => cache.delete(key)));
  }
  return response;
}
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url), path = localPath(url);
  if (path === null) return;
  if (request.mode === 'navigate') {
    if (pageNames.has(path)) {
      event.respondWith((async () => {
        const cache = await caches.open(SHELL_CACHE), page = new URL(path || 'index.html', BASE);
        return (await cache.match(page)) || fetch(request);
      })());
    } else {
      event.respondWith(fetch(request).catch(() => new Response('<!doctype html><html lang="zh-Hant"><meta name="viewport" content="width=device-width,initial-scale=1"><title>離線工作區｜MATH LAB</title><p>這個頁面尚未儲存。<a href="' + BASE.pathname + 'index.html">返回離線工作區</a></p>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } })));
    }
    return;
  }
  const canonical = url.origin + url.pathname;
  if (shellURLs.has(canonical)) {
    event.respondWith((async () => (await (await caches.open(SHELL_CACHE)).match(canonical)) || fetch(request))());
  } else if (/^(?:assets|engine|graph|spatial|language|vendor)\/.+\.(?:js|css|png|webp|svg|woff2?|ttf)$/.test(path) && !url.search) {
    event.respondWith(runtimeAsset(request));
  }
});
