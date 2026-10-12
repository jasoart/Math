(function (root) {
  'use strict';
  const doc = root.document, $ = id => doc.getElementById(id), M = root.MathScript, D = root.MathScriptDisplay;
  const draftKey = 'mathlab-mathscript-draft-v1', projectsKey = 'mathlab-mathscript-projects-v1';
  let worker = null, running = false, requestId = 0, timeout, debounce, saveTimer, noticeTimer;
  let parameters = Object.create(null), lastResult = null, lastDocument = null, errorPosition = null, currentProject = '';
  let projects = [], history = [], historyIndex = -1, dirty = true, draftChanged = false;
  const source = $('source');
  const snapshot = () => ({ kind: 'mathscript', version: 1, source: source.value, parameters: { ...parameters } });
  function notify(text) { clearTimeout(noticeTimer); $('studioNotice').textContent = text; $('studioNotice').hidden = false; noticeTimer = setTimeout(() => { $('studioNotice').hidden = true; }, 6000); }
  function exportsEnabled(enabled) { for (const id of ['shareProject', 'exportSVG', 'exportHTML', 'exportCSV']) $(id).disabled = !enabled; }
  function status(text, state) { $('runStatus').textContent = text; $('runStatus').dataset.state = state || ''; }
  function lineNumbers() { $('lineNumbers').textContent = Array.from({ length: source.value.split('\n').length }, (_, i) => i + 1).join('\n'); if (root.MathScriptEditor) $('sourceHighlight').innerHTML = root.MathScriptEditor.highlight(source.value); position(); }
  function position() { const before = source.value.slice(0, source.selectionStart), rows = before.split('\n'); $('cursorPosition').textContent = `第 ${rows.length} 行 · 第 ${rows.at(-1).length + 1} 欄`; }
  function historyButtons() { $('undoEdit').disabled = historyIndex <= 0; $('redoEdit').disabled = historyIndex >= history.length - 1; }
  function remember() {
    const value = JSON.stringify(snapshot());
    if (history[historyIndex] !== value) { history.splice(historyIndex + 1); history.push(value); if (history.length > 60) history.shift(); historyIndex = history.length - 1; }
    historyButtons();
  }
  function saveDraft() {
    if (!draftChanged) return;
    try { root.localStorage.setItem(draftKey, JSON.stringify(snapshot())); $('saveStatus').textContent = '草稿已儲存在此裝置'; draftChanged = false; }
    catch { $('saveStatus').textContent = '草稿無法儲存，請匯出作品備份'; }
  }
  function scheduleSave() { draftChanged = true; clearTimeout(saveTimer); saveTimer = setTimeout(saveDraft, 300); }
  function stop(silent = false) {
    clearTimeout(timeout); clearTimeout(debounce); requestId++;
    if (running && worker) { worker.terminate(); worker = null; }
    running = false; $('stopRun').disabled = true; $('plotStage').setAttribute('aria-busy', 'false');
    if (!silent) { dirty = true; exportsEnabled(false); status('已停止 · 預覽未更新', 'dirty'); $('diagnostics').textContent = '已停止背景運算。可修改程式後再次執行。'; }
  }
  function markDirty() {
    stop(true); dirty = true; exportsEnabled(false); status(lastResult ? '上次結果 · 待更新' : '尚未執行', 'dirty');
    for (const input of $('parameters').querySelectorAll('input')) input.disabled = true;
    $('diagnostics').textContent = '程式已修改，等待執行。'; $('diagnostics').dataset.error = 'false'; $('jumpError').hidden = true;
    source.setAttribute('aria-invalid', 'false');
  }
  function showError(error) {
    dirty = true; exportsEnabled(false); errorPosition = error;
    status('請檢查程式', 'error'); source.setAttribute('aria-invalid', 'true');
    $('diagnostics').dataset.error = 'true';
    $('diagnostics').textContent = `第 ${error.line || 1} 行，第 ${error.column || 1} 欄：${error.message}${lastResult ? ' 畫布保留上次成功結果。' : ''}`;
    $('jumpError').hidden = false;
  }
  function updateParameters(result) {
    const panel = $('parameters'), active = doc.activeElement, keep = active?.dataset.parameter;
    const same = panel.dataset.signature === JSON.stringify(result.parameters.map(p => [p.name, p.min, p.max, p.step]));
    if (!same) {
      panel.replaceChildren(); panel.dataset.signature = JSON.stringify(result.parameters.map(p => [p.name, p.min, p.max, p.step]));
      if (!result.parameters.length) { const p = doc.createElement('p'); p.className = 'muted'; p.textContent = '以 param 定義滑桿，拖曳就能觀察變化。'; panel.append(p); }
      result.parameters.forEach((p, i) => {
        const row = doc.createElement('div'); row.className = 'parameter-row';
        const label = doc.createElement('label'); label.htmlFor = `parameter-${i}`; label.textContent = p.name;
        const slider = doc.createElement('input'), number = doc.createElement('input');
        slider.type = 'range'; slider.id = `parameter-${i}`; number.type = 'number'; number.setAttribute('aria-label', `${p.name} 參數數值`);
        for (const field of [slider, number]) { field.min = p.min; field.max = p.max; field.step = p.step; field.dataset.parameter = p.name; field.value = p.value; }
        const change = field => {
          const v = field.value.trim() === '' ? NaN : Number(field.value);
          if (!Number.isFinite(v) || v < p.min || v > p.max) { field.setAttribute('aria-invalid', 'true'); notify(`${p.name} 需介於 ${p.min} 與 ${p.max}。`); return; }
          field.setAttribute('aria-invalid', 'false'); parameters[p.name] = v;
          slider.value = v; number.value = v;
          stop(true); dirty = true; exportsEnabled(false); status('上次結果 · 更新中', 'dirty'); remember(); scheduleSave(); debounce = setTimeout(execute, 90);
        };
        slider.addEventListener('input', () => change(slider)); number.addEventListener('change', () => change(number));
        row.append(label, slider, number); panel.append(row);
      });
    }
    for (const p of result.parameters) for (const input of panel.querySelectorAll('input')) if (input.dataset.parameter === p.name) { input.disabled = false; if (keep !== p.name || input !== active) input.value = p.value; }
    $('resetParameters').disabled = !result.parameters.length;
  }
  function showResult(result, sentDocument) {
    lastResult = result; lastDocument = sentDocument; parameters = Object.fromEntries(result.parameters.map(p => [p.name, p.value]));
    lastDocument.parameters = { ...parameters }; dirty = false;
    // Normalize defaults in-place so execution itself never creates an undo step or destroys redo.
    if (historyIndex >= 0) history[historyIndex] = JSON.stringify(snapshot());
    $('previewTitle').textContent = result.title; $('plotStage').innerHTML = D.svg(result);
    $('outputs').innerHTML = D.outputs(result) || '<p class="muted">加入 print 或 table，觀察更多數值。</p>';
    $('plotLegend').replaceChildren();
    result.plots.forEach(p => { const item = doc.createElement('span'), color = doc.createElement('i'); color.style.backgroundColor = p.color; item.append(color, doc.createTextNode(p.label)); $('plotLegend').append(item); });
    $('warnings').replaceChildren(); for (const warning of result.warnings) { const li = doc.createElement('li'); li.textContent = warning; $('warnings').append(li); } $('warnings').hidden = !result.warnings.length;
    updateParameters(result); status('已更新', 'ready'); exportsEnabled(true); source.setAttribute('aria-invalid', 'false');
    $('exportCSV').disabled = !result.outputs.some(o => o.type === 'table');
    $('diagnostics').dataset.error = 'false'; $('diagnostics').textContent = `${result.stats.statements} 個指令執行完成。${result.warnings.length ? '請查看預覽下方的取樣提醒。' : '調整參數，繼續探索。'}`; $('jumpError').hidden = true;
    $('engineStats').textContent = `${Math.round(result.stats.duration || 0)} ms · ${result.stats.evaluations.toLocaleString()} 次取樣${result.stats.cached ? ' · 已重用編譯' : ''}`;
  }
  function execute() {
    stop(true); const id = ++requestId, sentDocument = snapshot();
    dirty = true; exportsEnabled(false); status('運算中…', 'running'); $('plotStage').setAttribute('aria-busy', 'true'); $('stopRun').disabled = false;
    $('diagnostics').dataset.error = 'false'; $('diagnostics').textContent = '正在執行程式…';
    try {
      if (!root.Worker) throw Error('此瀏覽器不支援背景運算。請使用新版 Safari、Chrome 或 Firefox。');
      if (!worker) worker = new root.Worker(new URL('./language/worker.js', doc.baseURI));
      running = true;
      worker.onmessage = event => {
        if (event.data.id !== requestId) return;
        clearTimeout(timeout); running = false; $('stopRun').disabled = true; $('plotStage').setAttribute('aria-busy', 'false');
        if (event.data.error) showError(event.data.error); else showResult(event.data.result, sentDocument);
      };
      worker.onerror = event => { event.preventDefault(); if (id !== requestId) return; stop(true); if (worker) { worker.terminate(); worker = null; } showError({ message: '背景引擎載入失敗，請重新連線並重新整理後再試。' }); };
      timeout = setTimeout(() => { if (id !== requestId) return; stop(true); showError({ message: '執行超過 5 秒已停止，請減少曲線或簡化函數。' }); }, 5000);
      worker.postMessage({ id, source: sentDocument.source, parameters: sentDocument.parameters, width: 900, height: 540 });
    } catch (error) { stop(true); showError(error); }
  }
  function applyDocument(value, { persist = true, project = '' } = {}) {
    const validated = M.validateDocument(value); if (!persist) { clearTimeout(saveTimer); saveDraft(); } remember(); markDirty();
    source.value = validated.source; parameters = validated.parameters; currentProject = project; $('projectSelect').value = project;
    lineNumbers(); remember(); if (persist) scheduleSave(); execute();
  }
  function restoreHistory(direction) {
    remember(); const next = historyIndex + direction; if (next < 0 || next >= history.length) return;
    historyIndex = next; const value = M.validateDocument(JSON.parse(history[next])); markDirty(); source.value = value.source; parameters = value.parameters;
    lineNumbers(); historyButtons(); scheduleSave(); execute();
  }
  function download(name, data, type) {
    const url = root.URL.createObjectURL(new Blob([data], { type })), link = doc.createElement('a'); link.href = url; link.download = name; doc.body.append(link); link.click(); link.remove(); setTimeout(() => root.URL.revokeObjectURL(url), 1000);
  }
  function shareLink() {
    if (dirty || !lastDocument) throw Error('請先成功執行目前的程式再分享。');
    const url = new URL('./script.html', root.location.href); url.hash = 'ms=' + encodeURIComponent(JSON.stringify(lastDocument));
    if (url.href.length > 60000) throw Error('作品連結太長，請改用「匯出作品」傳送 JSON 檔案。');
    return url.href;
  }
  function refreshProjects() {
    $('projectSelect').replaceChildren(new Option('開啟已儲存作品…', ''));
    for (const p of projects) $('projectSelect').append(new Option(p.title, p.id));
    $('projectSelect').value = currentProject;
  }
  function loadHash() {
    if (!root.location.hash.startsWith('#ms=')) return false;
    if (root.location.hash.length > 60000) throw Error('分享連結超過長度限制，請改用作品檔案。');
    const value = M.validateDocument(JSON.parse(decodeURIComponent(root.location.hash.slice(4))));
    applyDocument(value, { persist: false }); notify('已開啟分享作品；原有草稿仍保留，開始編輯後才更新草稿。'); return true;
  }
  source.addEventListener('input', () => { parameters = Object.create(null); markDirty(); lineNumbers(); remember(); scheduleSave(); if ($('autoRun').checked) debounce = setTimeout(execute, 450); });
  source.addEventListener('scroll', () => { $('lineNumbers').scrollTop = source.scrollTop; $('sourceHighlight').scrollTop = source.scrollTop; $('sourceHighlight').scrollLeft = source.scrollLeft; });
  for (const event of ['click', 'keyup', 'select']) source.addEventListener(event, position);
  doc.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); execute(); }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); $('saveProject').click(); }
    if (event.key === 'Escape' && running) stop();
  });
  $('autoRun').addEventListener('change', () => { if ($('autoRun').checked && dirty) execute(); else clearTimeout(debounce); });
  $('runScript').onclick = execute; $('stopRun').onclick = () => stop();
  $('undoEdit').onclick = () => restoreHistory(-1); $('redoEdit').onclick = () => restoreHistory(1);
  $('jumpError').onclick = () => {
    if (!errorPosition) return; const rows = source.value.split('\n');
    const line = Math.max(0, Math.min(rows.length - 1, (errorPosition.line || 1) - 1));
    const start = rows.slice(0, line).reduce((n, s) => n + s.length + 1, 0) + Math.max(0, (errorPosition.column || 1) - 1);
    source.focus(); source.setSelectionRange(start, start + 1); source.scrollTop = Math.max(0, line * 27 - 70); $('lineNumbers').scrollTop = source.scrollTop; position();
  };
  for (const example of root.MathScriptExamples) $('exampleSelect').append(new Option(`${example.name} · ${example.tag}`, example.id));
  $('exampleSelect').onchange = () => { const example = root.MathScriptExamples.find(e => e.id === $('exampleSelect').value); if (example) applyDocument({ kind: 'mathscript', version: 1, source: example.source, parameters: {} }); };
  $('projectSelect').onchange = () => { const p = projects.find(p => p.id === $('projectSelect').value); if (p) applyDocument(p.document, { project: p.id }); };
  $('resetParameters').onclick = () => { parameters = Object.create(null); remember(); scheduleSave(); execute(); };
  $('saveProject').onclick = () => {
    remember(); saveDraft();
    const document = snapshot(), existing = projects.find(p => p.id === currentProject);
    if (!existing && projects.length >= 20) { notify('最多保留 20 個作品；可匯出 JSON 備份，或開啟既有作品再更新。'); return; }
    const id = existing?.id || (root.crypto?.randomUUID?.() || String(Date.now())), title = (!dirty && lastResult?.title) || '未完成的實驗 ' + new Date().toLocaleDateString('zh-TW');
    const record = { id, title: title.slice(0, 120), document }, updated = existing ? projects.map(p => p.id === id ? record : p) : [...projects, record];
    try { root.localStorage.setItem(projectsKey, JSON.stringify(updated)); projects = updated; currentProject = id; refreshProjects(); notify(`已儲存「${title}」。`); }
    catch { notify('儲存空間不足或瀏覽器禁止儲存，請匯出 JSON 備份。'); }
  };
  $('exportProject').onclick = () => download('experiment.mathscript.json', JSON.stringify(snapshot(), null, 2), 'application/json;charset=utf-8');
  $('importProject').onclick = () => $('projectFile').click();
  $('projectFile').onchange = async event => {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      if (file.size > 200000) throw Error('作品檔案不可超過 200 KB。');
      const text = await file.text(), value = /\.json$/i.test(file.name) || text.trimStart().startsWith('{') ? JSON.parse(text) : { kind: 'mathscript', version: 1, source: text, parameters: {} };
      const validated = M.validateDocument(value); applyDocument(validated); notify('已匯入；可按「復原」回到匯入前的程式。');
    } catch (error) { notify(`無法匯入：${error.message}`); } finally { event.target.value = ''; }
  };
  $('shareProject').onclick = () => {
    try { $('shareURL').value = shareLink(); $('shareFeedback').textContent = ''; $('shareDialog').showModal(); $('shareURL').select(); }
    catch (error) { notify(error.message); }
  };
  $('copyShare').onclick = async () => {
    try { await root.navigator.clipboard.writeText($('shareURL').value); $('shareFeedback').textContent = '連結已複製。'; }
    catch { $('shareURL').focus(); $('shareURL').select(); $('shareFeedback').textContent = '請長按或使用 Ctrl／⌘ + C 複製已選取的連結。'; }
  };
  $('exportSVG').onclick = () => { if (!dirty && lastResult) download('mathscript-plot.svg', D.svg(lastResult), 'image/svg+xml;charset=utf-8'); };
  $('exportCSV').onclick = () => { if (!dirty && lastResult) download('mathscript-values.csv', root.MathScriptEditor.csv(lastResult), 'text/csv;charset=utf-8'); };
  $('exportHTML').onclick = () => {
    if (dirty || !lastResult) return;
    let link; try { link = shareLink(); } catch { notify('作品過大，網頁內保留完整原始碼，編輯時請複製到 MathScript。'); link = new URL('./script.html', root.location.href).href; }
    download('mathscript-publication.html', D.publication(lastResult, lastDocument.source, link), 'text/html;charset=utf-8');
  };
  root.addEventListener('hashchange', () => { try { loadHash(); } catch (error) { notify(`無法開啟分享：${error.message}`); } });
  root.addEventListener('pagehide', () => { saveDraft(); stop(true); worker?.terminate(); worker = null; });
  root.addEventListener('pageshow', event => { if (event.persisted) execute(); });
  for (const [id, label] of root.MathScriptEditor.snippets) $('snippetSelect').append(new Option(label, id));
  $('snippetSelect').onchange = () => {
    const snippet = root.MathScriptEditor.snippets.find(s => s[0] === $('snippetSelect').value); if (!snippet) return;
    const start = source.selectionStart, end = source.selectionEnd, before = start > 0 && source.value[start - 1] !== '\n' ? '\n' : '', after = source.value[end] === '\n' ? '' : '\n';
    source.setRangeText(before + snippet[2] + after, start, end, 'end'); source.dispatchEvent(new Event('input', { bubbles: true })); source.focus(); $('snippetSelect').value = '';
  };
  $('syntaxColor').onchange = () => doc.body.classList.toggle('syntax-active', $('syntaxColor').checked);
  $('focusScript').onclick = () => { const enabled = doc.body.classList.toggle('script-focused'); $('focusScript').setAttribute('aria-pressed', String(enabled)); $('focusScript').textContent = enabled ? '離開專注 ↙' : '專注 ↗'; };
  doc.addEventListener('keydown', event => { if (event.key === 'Escape' && doc.body.classList.contains('script-focused')) $('focusScript').click(); });
  try {
    const stored = JSON.parse(root.localStorage.getItem(projectsKey) || '[]');
    if (!Array.isArray(stored) || stored.length > 20) throw Error('Invalid projects');
    projects = stored.map(p => { if (!p || typeof p.id !== 'string' || typeof p.title !== 'string' || p.id.length > 100 || p.title.length > 120) throw Error('Invalid project'); return { id: p.id, title: p.title, document: M.validateDocument(p.document) }; });
  } catch { projects = []; }
  refreshProjects();
  let initial = { kind: 'mathscript', version: 1, source: root.MathScriptExamples[0].source, parameters: {} };
  try { const saved = root.localStorage.getItem(draftKey); if (saved) initial = M.validateDocument(JSON.parse(saved)); }
  catch { notify('無法讀取舊草稿，已載入範例。可匯入先前的 JSON 備份。'); }
  source.value = initial.source; parameters = initial.parameters; lineNumbers(); remember();
  try { if (!loadHash()) execute(); } catch (error) { notify(`分享資料無效：${error.message}`); execute(); }
})(window);
