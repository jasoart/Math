'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '..');
const workerSource = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const uiSource = fs.readFileSync(path.join(root, 'engine/pwa.js'), 'utf8');
let checks = 0;
function check(value, message) { assert.ok(value, message); checks++; }
function makeWorker({ failInstall = false } = {}) {
  const handlers = {}, stored = new Map(), logs = [], calls = [];
  let offline = false, skips = 0, claims = 0;
  const key = request => typeof request === 'string' ? request : request instanceof URL ? request.href : request.url;
  function makeCache(name) {
    if (!stored.has(name)) stored.set(name, new Map());
    const entries = stored.get(name);
    return {
      async match(request) { return entries.get(key(request))?.clone(); },
      async put(request, response) { entries.set(key(request), response.clone()); },
      async keys() { return [...entries.keys()].map(url => new Request(url)); },
      async delete(request) { return entries.delete(key(request)); },
      async addAll(requests) {
        calls.push(...requests);
        if (failInstall) throw Error('Missing asset');
        for (const request of requests) entries.set(key(request), new Response('cached:' + key(request)));
      }
    };
  }
  const self = { registration: { scope: 'https://example.test/Math/' }, clients: { async claim() { claims++; } }, async skipWaiting() { skips++; }, addEventListener(type, handler) { handlers[type] = handler; } };
  const caches = { async open(name) { return makeCache(name); }, async keys() { return [...stored.keys()]; }, async delete(name) { return stored.delete(name); } };
  const fetch = async request => {
    logs.push(key(request));
    if (offline) throw Error('Offline');
    const response = new Response('network:' + key(request), { headers: { 'content-length': '20' } });
    Object.defineProperty(response, 'type', { value: 'basic' });
    return response;
  };
  const source = workerSource.replace(/const BUILD = '[^']*';/, "const BUILD = 'unit';").replace(/const PRECACHE = \[[\s\S]*?\];/, "const PRECACHE = ['index.html','graph.html','spatial.html','script.html','language/worker.js','language/mathscript.js','engine/pwa.js'];");
  vm.runInNewContext(source, { self, caches, fetch, URL, Request, Response, Set, Promise, Number });
  async function event(type, values = {}) {
    let pending, response;
    handlers[type]({ ...values, waitUntil(promise) { pending = promise; }, respondWith(promise) { response = promise; } });
    await pending;
    return response ? await response : null;
  }
  async function request(url, mode, method = 'GET') {
    const req = new Request(url, { method });
    if (mode) Object.defineProperty(req, 'mode', { value: mode });
    return event('fetch', { request: req });
  }
  return { stored, calls, logs, event, request, setOffline(value) { offline = value; }, get skips() { return skips; }, get claims() { return claims; } };
}
function makeUI({ secure = true, ios = false } = {}) {
  const dom = new JSDOM('<!doctype html><footer class="app-footer"></footer>', { url: 'https://example.test/Math/index.html', runScripts: 'outside-only' });
  const win = dom.window, events = {}, messages = [];
  let online = true;
  const waiting = { postMessage(message) { messages.push(message); } };
  const registration = { active: {}, waiting: null, addEventListener(type, handler) { events['registration:' + type] = handler; }, async update() {} };
  const serviceWorker = { controller: null, ready: Promise.resolve(registration), addEventListener(type, handler) { events[type] = handler; }, async register(url, options) { serviceWorker.url = String(url); serviceWorker.options = options; return registration; } };
  Object.defineProperty(win, 'isSecureContext', { value: secure });
  Object.defineProperty(win.navigator, 'serviceWorker', { value: serviceWorker });
  Object.defineProperty(win.navigator, 'onLine', { get: () => online });
  if (ios) Object.defineProperty(win.navigator, 'userAgent', { value: 'iPhone Safari' });
  win.matchMedia = () => ({ matches: false, addEventListener() {} });
  win.eval(uiSource);
  return { dom, win, serviceWorker, registration, waiting, messages, events, setOnline(value) { online = value; win.dispatchEvent(new win.Event(value ? 'online' : 'offline')); } };
}
(async () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
  check(manifest.display === 'standalone' && manifest.scope === './', 'Standalone app remains within repository scope');
  check(new URL(manifest.start_url, 'https://example.test/Math/manifest.webmanifest').pathname === '/Math/index.html', 'Repository-relative start URL');
  check(manifest.icons.some(icon => icon.sizes === '192x192') && manifest.icons.some(icon => icon.sizes === 'any'), 'Raster and scalable install icons');
  check(manifest.shortcuts.every(shortcut => new URL(shortcut.url, 'https://example.test/Math/').pathname.startsWith('/Math/')), 'Shortcuts remain inside scope');
  for (const icon of manifest.icons) check(fs.existsSync(path.join(root, icon.src)), 'Icon exists: ' + icon.src);
  const worker = makeWorker();
  worker.stored.set('personal-notes', new Map()); worker.stored.set('mathlab-pwa-%2FOther%2F-shell-old', new Map()); worker.stored.set('mathlab-pwa-%2FMath%2F-shell-old', new Map());
  await worker.event('install');
  check(worker.calls.length === 7 && worker.calls.every(request => request.cache === 'reload'), 'Shell fetches bypass stale HTTP caches');
  check(worker.skips === 0, 'Installing an update does not activate without user action');
  await worker.event('activate');
  check(worker.claims === 1, 'Initial installation can control the workspace');
  check(worker.stored.has('personal-notes') && worker.stored.has('mathlab-pwa-%2FOther%2F-shell-old'), 'Activation preserves unrelated and other-scope caches');
  check(!worker.stored.has('mathlab-pwa-%2FMath%2F-shell-old'), 'Activation removes obsolete cache for this repository');
  worker.setOffline(true);
  for (const page of ['', 'index.html', 'graph.html?example=1', 'spatial.html', 'script.html?shared=1']) {
    const response = await worker.request('https://example.test/Math/' + page, 'navigate');
    check(response.ok && (await response.text()).startsWith('cached:'), 'Offline navigation: ' + page);
  }
  const asset = await worker.request('https://example.test/Math/engine/pwa.js?cache=1');
  check((await asset.text()).includes('cached:'), 'Known assets resolve by canonical URL');
  const missing = await worker.request('https://example.test/Math/not-a-page.html', 'navigate');
  check(missing.status === 503 && (await missing.text()).includes('/Math/index.html'), 'Unknown offline page has an in-scope return link');
  check(await worker.request('https://example.test/Other/index.html', 'navigate') === null, 'Other repositories are untouched');
  check(await worker.request('https://external.test/Math/icon.png') === null, 'External assets are untouched');
  check(await worker.request('https://example.test/Math/upload.json') === null, 'User JSON is never cached');
  check(await worker.request('https://example.test/Math/engine/custom.js', null, 'POST') === null, 'Mutations are never intercepted');
  worker.setOffline(false);
  for (let i = 0; i < 80; i++) await worker.request('https://example.test/Math/engine/custom-' + i + '.js');
  const runtime = [...worker.stored].find(([name]) => name.includes('runtime-'))[1];
  check(runtime.size === 64, 'Runtime cache stays bounded');
  await worker.event('message', { data: { type: 'UNRELATED' } }); check(worker.skips === 0, 'Unrelated messages do not activate');
  await worker.event('message', { data: { type: 'APPLY_UPDATE' } }); check(worker.skips === 1, 'Explicit update action activates the waiting worker');
  const failed = makeWorker({ failInstall: true }); failed.stored.set('mathlab-pwa-%2FMath%2F-shell-old', new Map());
  await assert.rejects(failed.event('install')); checks++;
  check(failed.stored.size === 1 && failed.stored.has('mathlab-pwa-%2FMath%2F-shell-old'), 'Failed installation removes partial new cache and preserves old shell');
  const ui = makeUI(); await new Promise(resolve => setImmediate(resolve));
  check(ui.serviceWorker.url === 'https://example.test/Math/sw.js' && ui.serviceWorker.options.scope === '/Math/', 'Registration resolves relative to script, not root domain');
  check(ui.win.MathPWA.getStatus().offlineReady, 'Successful activation updates accessible offline readiness');
  ui.setOnline(false); check(ui.win.document.querySelector('[data-pwa-status]').textContent.includes('可繼續探索'), 'Offline status confirms usable shell');
  const promptEvent = new ui.win.Event('beforeinstallprompt', { cancelable: true }); let prompted = false;
  promptEvent.prompt = async () => { prompted = true; }; promptEvent.userChoice = Promise.resolve({ outcome: 'dismissed' });
  ui.win.dispatchEvent(promptEvent);
  check(promptEvent.defaultPrevented && !ui.win.document.querySelector('[data-pwa-install]').hidden, 'Install action is offered only when browser prompt is ready');
  ui.win.document.querySelector('[data-pwa-install]').click(); await new Promise(resolve => setImmediate(resolve)); check(prompted, 'Install action calls browser prompt');
  ui.serviceWorker.controller = {}; ui.registration.waiting = ui.waiting; ui.registration.installing = { state: 'installed', addEventListener(type, handler) { handler(); } }; ui.events['registration:updatefound']();
  check(!ui.win.document.querySelector('.pwa-notice').hidden && ui.messages.length === 0, 'Update notice does not automatically activate');
  ui.win.document.querySelector('[data-pwa-update]').click();
  check(ui.messages[0].type === 'APPLY_UPDATE', 'Accessible update button sends explicit activation request');
  const ios = makeUI({ ios: true }); await new Promise(resolve => setImmediate(resolve)); ios.win.document.querySelector('[data-pwa-install]').click();
  check(ios.win.document.querySelector('.pwa-notice').textContent.includes('Safari') && ios.win.document.querySelector('[data-pwa-update]').hidden, 'iOS gives accurate home-screen instructions without fake install prompt');
  const unsupported = makeUI({ secure: false }); check(!unsupported.win.MathPWA.getStatus().supported && !unsupported.serviceWorker.url, 'Insecure hosts do not attempt worker registration');
  ui.dom.window.close(); ios.dom.window.close(); unsupported.dom.window.close();
  console.log('PWA unit: ' + checks + ' manifest, scope, offline navigation, atomic cache, cache bounds, install and update checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
