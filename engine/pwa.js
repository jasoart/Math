(function (root) {
  'use strict';
  const doc = root.document;
  if (!doc || root.MathPWA) return;
  const nav = root.navigator;
  const supported = !!(nav.serviceWorker && root.isSecureContext);
  const standalone = () => root.matchMedia?.('(display-mode: standalone)').matches || nav.standalone === true;
  const ios = /iPad|iPhone|iPod/.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
  let registration, prompt, ready = false, dismissedUpdate = false, reloadPending = false;
  let controls = doc.querySelector('[data-pwa-controls]');
  if (!controls) { controls = doc.createElement('div'); controls.className = 'pwa-controls'; controls.setAttribute('data-pwa-controls', ''); (doc.querySelector('.app-footer') || doc.body).append(controls); }
  let status = controls.querySelector('[data-pwa-status]');
  if (!status) { status = doc.createElement('span'); status.className = 'pwa-status'; status.setAttribute('data-pwa-status', ''); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); controls.append(status); }
  let install = doc.querySelector('[data-pwa-install]');
  if (!install) { install = doc.createElement('button'); install.type = 'button'; install.className = 'pwa-install'; install.setAttribute('data-pwa-install', ''); install.hidden = true; controls.append(install); }
  const notice = doc.createElement('aside'); notice.className = 'pwa-notice'; notice.hidden = true; notice.setAttribute('role', 'status'); notice.setAttribute('aria-live', 'polite'); notice.setAttribute('aria-label', '應用程式通知');
  const message = doc.createElement('p');
  const actions = doc.createElement('div'); actions.className = 'pwa-notice-actions';
  const update = doc.createElement('button'); update.type = 'button'; update.textContent = '套用更新'; update.setAttribute('data-pwa-update', '');
  const close = doc.createElement('button'); close.type = 'button'; close.textContent = '稍後'; close.setAttribute('aria-label', '關閉應用程式通知');
  actions.append(close, update); notice.append(message, actions); doc.body.append(notice);
  function connectivity() {
    status.dataset.state = !supported ? 'unsupported' : !nav.onLine ? 'offline' : ready ? 'ready' : 'preparing';
    status.textContent = !supported ? (root.isSecureContext ? '此瀏覽器暫不支援離線工作區' : '離線模式需使用 HTTPS 瀏覽') : !nav.onLine ? (ready ? '離線 · 可繼續探索' : '離線 · 尚未備妥資料') : ready ? '已可離線使用' : '正在準備離線工作區…';
  }
  function installation() {
    const installed = standalone(); install.hidden = !supported || installed || (!prompt && !ios); install.disabled = false;
    install.textContent = prompt ? '安裝應用程式' : '加入主畫面';
  }
  function showUpdate() {
    if (!registration?.waiting || dismissedUpdate) return;
    message.textContent = '新的工作區已準備好。套用更新會重新開啟頁面，已儲存的筆記與圖形會保留。';
    update.hidden = false; update.disabled = false; close.textContent = '稍後'; notice.hidden = false;
  }
  close.addEventListener('click', () => { notice.hidden = true; if (registration?.waiting) dismissedUpdate = true; });
  update.addEventListener('click', () => {
    if (!registration?.waiting) return;
    update.disabled = true; close.disabled = true; update.textContent = '正在更新…'; reloadPending = true;
    registration.waiting.postMessage({ type: 'APPLY_UPDATE' });
  });
  install.addEventListener('click', async () => {
    if (prompt) {
      const selected = prompt; prompt = null; install.disabled = true;
      try { await selected.prompt(); await selected.userChoice; } catch (_) { /* Browser may dismiss its own prompt. */ }
      installation();
    } else if (ios && !standalone()) {
      message.textContent = '在 Safari 點選「分享」，再選「加入主畫面」。第一次連線載入完成後，可在離線時使用已準備好的工作區。';
      update.hidden = true; close.textContent = '知道了'; close.disabled = false; notice.hidden = false;
    }
  });
  root.addEventListener('beforeinstallprompt', event => { event.preventDefault(); prompt = event; installation(); });
  root.addEventListener('appinstalled', () => { prompt = null; installation(); });
  root.addEventListener('online', connectivity); root.addEventListener('offline', connectivity);
  root.matchMedia?.('(display-mode: standalone)').addEventListener?.('change', installation);
  doc.addEventListener('visibilitychange', () => { if (!doc.hidden && registration && nav.onLine) registration.update().catch(() => {}); });
  root.MathPWA = Object.freeze({
    getStatus: () => ({ supported, installed: standalone(), offlineReady: ready, online: nav.onLine, updateWaiting: !!registration?.waiting }),
    checkForUpdate: async () => { if (registration && nav.onLine) await registration.update(); }
  });
  installation(); connectivity();
  if (!supported) return;
  const source = doc.currentScript?.src || new URL('engine/pwa.js', doc.baseURI).href;
  const base = new URL('../', source);
  let previouslyControlled = !!nav.serviceWorker.controller;
  nav.serviceWorker.addEventListener('controllerchange', () => {
    ready = !!nav.serviceWorker.controller; connectivity();
    // Every controlled tab must use the newly activated shell. Initial activation has no reload.
    if (reloadPending || previouslyControlled) root.location.reload();
    previouslyControlled = true;
  });
  nav.serviceWorker.register(new URL('sw.js', base), { scope: base.pathname, updateViaCache: 'none' }).then(async registered => {
    registration = registered; showUpdate();
    registered.addEventListener('updatefound', () => {
      const worker = registered.installing;
      worker?.addEventListener('statechange', () => { if (worker.state === 'installed' && nav.serviceWorker.controller) { dismissedUpdate = false; showUpdate(); } });
    });
    await nav.serviceWorker.ready; ready = true; connectivity();
  }).catch(() => { status.dataset.state = 'error'; status.textContent = '離線資料尚未完成，連線時可正常使用'; });
})(typeof window === 'object' ? window : globalThis);
