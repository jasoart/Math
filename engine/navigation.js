/* Shared keyboard-accessible search for workspaces and actual module metadata. */
(function (root) {
  'use strict';
  const doc = root.document;
  const dialog = doc.createElement('dialog'); dialog.className = 'search-dialog'; dialog.setAttribute('aria-labelledby', 'searchTitle');
  dialog.innerHTML = '<div class="search-heading"><div><p class="eyebrow">FIND YOUR NEXT IDEA</p><h2 id="searchTitle">你想探索什麼？</h2></div><button type="button" data-search-close aria-label="關閉搜尋">✕</button></div><label class="sr-only" for="globalSearch">搜尋主題與工作區</label><input id="globalSearch" type="search" placeholder="函數、向量、機率、MathScript…" autocomplete="off"><p id="searchStatus" role="status" aria-live="polite"></p><div id="searchResults" class="search-results"></div><p class="search-keyboard">↑ ↓ 選擇 · Enter 開啟 · Esc 關閉</p>';
  doc.body.append(dialog);
  const input = dialog.querySelector('input'), results = dialog.querySelector('#searchResults'), status = dialog.querySelector('#searchStatus');
  const workspaces = [
    { title: '互動探索', tag: '196 個數學實驗', href: './index.html#experiment', keywords: '首頁 主題 模組 數學' },
    { title: '模組學院', tag: '540 組情境 · 45 個模型', href: './academy.html', keywords: '模組 代數 幾何 微積分 教練 推導 變體' },
    { title: '每日練習', tag: '練習 · 解析 · 錯題', href: './practice.html', keywords: '題目 測驗 複習 學習' },
    { title: '平面繪圖', tag: '2D 自由畫布', href: './graph.html', keywords: '函數 曲線 繪圖 積分 畫布' },
    { title: '立體繪圖', tag: '3D 空間幾何', href: './spatial.html', keywords: '空間 向量 平面 球' },
    { title: 'MathScript 程式實驗', tag: '編輯 · 執行 · 分享', href: './script.html', keywords: 'program code 程式語言 數值表' },
    { title: '我的筆記', tag: '筆記 · 收藏 · 探索進度', href: './index.html#notebook', keywords: '紀錄 收藏 筆記' }
  ];
  let catalog = [], loading, error = '', active = -1, opener;
  function render() {
    const query = input.value.trim().toLocaleLowerCase(), words = query.split(/\s+/).filter(Boolean);
    const modules = catalog.map(m => ({ title: m.title, tag: m.tag, href: (m.workspace === 'academy' ? './academy.html#' : './index.html#') + encodeURIComponent(m.id), id: m.id, workspace: m.workspace, keywords: m.tag }));
    const all = [...workspaces, ...modules], matches = all.filter(item => words.every(word => [item.title, item.tag, item.keywords].join(' ').toLocaleLowerCase().includes(word)));
    const shown = matches.slice(0, 24); results.replaceChildren(); active = -1;
    status.textContent = error || (query ? `${matches.length} 個結果${matches.length > 24 ? '，顯示前 24 個；可加入關鍵字縮小範圍' : ''}` : '搜尋工作區與互動模組');
    for (const item of shown) {
      const a = doc.createElement('a'), title = doc.createElement('strong'), tag = doc.createElement('span');
      a.href = new URL(item.href, doc.baseURI).href; title.textContent = item.title; tag.textContent = item.tag; a.append(title, tag);
      a.addEventListener('click', event => { close(); if (item.id && item.workspace !== 'academy' && root.MathLab) { event.preventDefault(); root.MathLab.selectModule(item.id); doc.getElementById('experiment').scrollIntoView({ block: 'start', behavior: 'smooth' }); doc.getElementById('moduleTitle').focus({ preventScroll: true }); } });
      results.append(a);
    }
    if (!shown.length) { const p = doc.createElement('p'); p.textContent = '找不到結果。試試「向量」、「數列」或「函數」。'; results.append(p); }
  }
  async function load() {
    if (root.MathLab && !catalog.length) { catalog = root.MathLab.modules.map(m => ({ id: m.id, title: m.short || m.title, tag: m.tag })); render(); }
    if (catalog.some(m => m.workspace === 'academy') || loading) return loading;
    loading = (async () => {
      try {
        const response = await root.fetch(new URL('./engine/catalog.json', doc.baseURI)); if (!response.ok) throw Error('Unavailable catalog');
        const value = await response.json(); if (value.version !== 1 || !Array.isArray(value.modules) || value.modules.length > 2000 || value.modules.some(m => !m || typeof m.id !== 'string' || !/^[a-z0-9-]+$/.test(m.id) || typeof m.title !== 'string' || m.title.length > 240 || typeof m.tag !== 'string' || m.tag.length > 120 || (m.workspace !== undefined && m.workspace !== 'academy'))) throw Error('Invalid catalog');
        catalog = value.modules; error = '';
      } catch { error = catalog.length ? '已載入本頁模組；完整模組庫暫時無法讀取。' : '模組清單暫時無法讀取，仍可開啟各工作區。'; }
      finally { loading = null; if (dialog.open) render(); }
    })(); return loading;
  }
  function open() { if (dialog.open) return; opener = doc.activeElement; dialog.showModal(); input.value = ''; render(); input.focus(); load(); }
  function close() { dialog.close(); opener?.focus?.({ preventScroll: true }); }
  for (const button of doc.querySelectorAll('[data-open-search]')) button.addEventListener('click', open);
  dialog.querySelector('[data-search-close]').onclick = close; dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  input.addEventListener('input', render);
  dialog.addEventListener('keydown', event => {
    const links = [...results.querySelectorAll('a')]; if (!links.length) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); active = active < 0 ? (event.key === 'ArrowDown' ? 0 : links.length - 1) : (active + (event.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length; links[active].focus(); }
    if (event.key === 'Enter' && event.target === input) { event.preventDefault(); (links[active] || links[0]).click(); }
  });
  doc.addEventListener('keydown', event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); dialog.open ? close() : open(); } });
  const shortcut = /Mac|iPad|iPhone/.test(root.navigator.platform + root.navigator.userAgent) ? '⌘ K' : 'Ctrl K';
  for (const kbd of doc.querySelectorAll('[data-open-search] kbd')) kbd.textContent = shortcut;
})(window);
