/* Local, bounded academy UI. Numerical results come from the same MathScript sent to the editor. */
(function (root) {
  'use strict';
  const A = root.MathAcademy, S = root.MathAcademyState, D = root.MathScriptDisplay, doc = root.document, $ = id => doc.getElementById(id);
  const key = 'mathlab.academy.v1', PAGE_SIZE = 12;
  let state = S.empty(), current = A.scenarios[0], parameters = { ...current.parameters }, result, page = 0, filtered = [], timer, graded = false, compareResult, damagedStorage = false, initialWarning = '';
  function storageStatus(message) { $('academyStorage').textContent = message; }
  try { const saved = root.localStorage.getItem(key); if (saved) { if (saved.length > 300000) throw Error('too large'); state = S.validate(JSON.parse(saved)); } } catch { damagedStorage = true; }
  function persist() { state.recent = { id: current.id, parameters: { ...parameters } }; if (damagedStorage) { storageStatus('原有紀錄無法讀取，暫不覆寫。請備份本次紀錄，再匯入有效備份以恢復儲存。'); return; } try { root.localStorage.setItem(key, JSON.stringify(state)); storageStatus('進度與收藏已儲存在此裝置。'); } catch { storageStatus('無法儲存至瀏覽器；請按「備份紀錄」保留本次進度。'); } }
  function el(tag, text, className) { const node = doc.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; }
  function setOptions(select, values, label) { select.replaceChildren(new root.Option(label, '')); for (const [value, text] of values) select.add(new root.Option(text, value)); }
  setOptions($('academyTopic'), A.topics.map(t => [t, t]), '全部主題');
  function modelOptions() { const previous = $('academyModel').value; setOptions($('academyModel'), A.models.filter(m => !$('academyTopic').value || m.topic === $('academyTopic').value).map(m => [m.id, m.title]), '全部模型'); if ([...$('academyModel').options].some(o => o.value === previous)) $('academyModel').value = previous; }
  modelOptions();
  function renderProgress() { const s = S.summary(state); $('academyProgress').textContent = `已完成 ${s.completed} / ${A.scenarios.length} 組 · 收藏 ${s.favorites}`; $('academyProgressBar').value = s.completed; $('academyAccuracy').textContent = s.attempts ? `作答 ${s.attempts} 次 · 正確率 ${Math.round(s.correct / s.attempts * 100)}%` : '尚未作答'; }
  function renderList(reset = false) {
    if (reset) page = 0;
    filtered = A.search($('academySearch').value, $('academyTopic').value, $('academyModel').value).filter(s => { const item = S.item(state, s.id); switch ($('academyStatus').value) { case 'favorite': return item.favorite; case 'pending': return item.correct === 0; case 'review': return item.needsReview; default: return true; } });
    const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)); page = Math.min(page, pages - 1);
    $('academyCount').textContent = `${filtered.length} 組符合條件 · ${new Set(filtered.map(s => s.modelId)).size} 個模型`;
    $('academyList').replaceChildren();
    for (const scenario of filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)) {
      const item = S.item(state, scenario.id), button = el('button'); button.type = 'button'; button.dataset.id = scenario.id; button.setAttribute('aria-current', String(scenario.id === current.id));
      button.append(el('strong', scenario.title), el('span', `${scenario.tag}${scenario.extension ? ' · 延伸' : ''}${item.favorite ? ' · ★' : ''}${item.correct ? ' · 已完成' : ''}${item.needsReview ? ' · 待複習' : ''}`));
      button.onclick = () => { select(scenario.id); if (root.innerWidth <= 800) $('academyQuestion').scrollIntoView({ behavior: 'smooth', block: 'start' }); $('academyQuestion').focus({ preventScroll: true }); }; $('academyList').append(button);
    }
    if (!filtered.length) $('academyList').append(el('p', '沒有符合的情境。試著更換主題、關鍵字或紀錄篩選。'));
    $('academyPage').textContent = `${page + 1} / ${pages}`; $('academyPrevious').disabled = page === 0; $('academyNext').disabled = page + 1 >= pages;
  }
  function renderFavorite() { const favorite = S.item(state, current.id).favorite; $('academyFavorite').textContent = favorite ? '★ 已收藏' : '☆ 收藏'; $('academyFavorite').setAttribute('aria-pressed', String(favorite)); }
  function clearAnswer() { graded = false; $('academyAnswer').value = ''; $('academyFeedback').textContent = ''; delete $('academyFeedback').dataset.correct; $('academyCheck').disabled = false; $('academySolution').open = false; }
  function renderControls() {
    const { model } = A.resolve(current.id); $('academyControls').replaceChildren();
    for (const c of model.controls) {
      const wrap = el('div', undefined, 'academy-control'), label = el('label', c.label), row = el('div'), slider = el('input'), number = el('input');
      number.id = 'academy-param-' + c.key; label.htmlFor = number.id;
      for (const input of [slider, number]) { input.type = input === slider ? 'range' : 'number'; input.min = c.min; input.max = c.max; input.step = c.step; input.value = parameters[c.key]; input.dataset.param = c.key; input.setAttribute('aria-label', c.label); }
      const update = input => {
        const v = input.valueAsNumber;
        try { parameters = A.normalize(model, { ...parameters, [c.key]: v }); input.setCustomValidity(''); slider.value = parameters[c.key]; number.value = parameters[c.key]; clearAnswer(); markStale(); clearTimeout(timer); timer = setTimeout(() => { renderExperiment(); persist(); }, 80); }
        catch (error) { input.setCustomValidity(error.message); input.reportValidity(); }
      };
      slider.oninput = () => update(slider); number.onchange = () => update(number);
      row.append(slider, number); wrap.append(label, row, el('small', `${c.min} ～ ${c.max}，步長 ${c.step}`)); $('academyControls').append(wrap);
    }
  }
  function markStale() { result = null; for (const id of ['academyCheck', 'academyCSV', 'academyReport', 'academySource', 'academyShare']) $(id).disabled = true; $('academyScript').removeAttribute('href'); $('academyScript').setAttribute('aria-disabled', 'true'); $('academyPlot').setAttribute('aria-busy', 'true'); }
  function makeShare() { const url = new URL('./academy.html', doc.baseURI); url.hash = S.hash(current.id, parameters); return url.href; }
  function renderExperiment() {
    clearTimeout(timer); timer = null;
    try {
      result = A.run(current.id, parameters); const { model } = result;
      $('academyTitle').textContent = current.title; $('academyTag').textContent = `${model.topic} / ${model.extension ? '延伸探究' : '觀念探究'} / 情境 ${current.index} OF 12`;
      $('academyQuestion').textContent = result.question; $('academySignal').textContent = model.signal; $('academyShortcut').textContent = model.shortcut; $('academyTrap').textContent = model.trap;
      let drawing = result.result;
      if ($('academyCompare').checked) {
        compareResult ||= A.run(current.id).result;
        const a = drawing.view, b = compareResult.view;
        drawing = { ...drawing, view: { xmin: Math.min(a.xmin, b.xmin), xmax: Math.max(a.xmax, b.xmax), ymin: Math.min(a.ymin, b.ymin), ymax: Math.max(a.ymax, b.ymax) }, plots: [...compareResult.plots.map(p => ({ ...p, color: '#abb2c8', label: '初始 · ' + p.label })), ...drawing.plots], points: [...compareResult.points.map(p => ({ ...p, label: '', color: '#abb2c8' })), ...drawing.points] };
      }
      $('academyPlot').innerHTML = D.svg(drawing); $('academyPlot').setAttribute('aria-busy', 'false');
      $('academyWarnings').textContent = result.result.warnings.join(' ');
      $('academyLegend').replaceChildren(); for (const plot of drawing.plots) { const tag = el('span', plot.label); tag.style.setProperty('--curve-color', plot.color); $('academyLegend').append(tag); }
      if ($('academyCompare').checked) $('academyLegend').append(el('span', '灰色為此組初始參數'));
      $('academySteps').replaceChildren();
      for (const step of model.steps) { const li = el('li'); li.append(el('h4', step.label), el('p', step.reason), el('code', `${step.key} = ${step.expression} = ${D.number(result.values[step.key])}`)); $('academySteps').append(li); }
      $('academyOutputs').innerHTML = D.outputs(result.result);
      const source = A.source(current.id, parameters), scriptURL = new URL('./script.html', doc.baseURI); scriptURL.hash = 'ms=' + encodeURIComponent(JSON.stringify({ kind: 'mathscript', version: 1, source, parameters: {} })); $('academyScript').href = scriptURL.href; $('academyScript').removeAttribute('aria-disabled');
      for (const id of ['academyCheck', 'academyReport', 'academySource', 'academyShare']) $(id).disabled = false;
      $('academyCheck').disabled = graded; $('academyCSV').disabled = !result.result.outputs.some(o => o.type === 'table');
      root.history.replaceState(null, '', S.hash(current.id, parameters));
    } catch (error) { markStale(); $('academyPlot').setAttribute('aria-busy', 'false'); $('academyFeedback').textContent = `無法計算：${error.message}`; }
  }
  function select(id, values, push = true) {
    const { scenario, model } = A.resolve(id), next = A.normalize(model, values || scenario.parameters);
    clearTimeout(timer); current = scenario; parameters = next; compareResult = null; clearAnswer();
    if (push) root.history.pushState(null, '', S.hash(id, next));
    renderControls(); renderExperiment(); renderFavorite(); renderList(); persist();
  }
  for (const id of ['academySearch', 'academyModel', 'academyStatus']) $(id).addEventListener(id === 'academySearch' ? 'input' : 'change', () => renderList(true));
  $('academyTopic').onchange = () => { $('academyModel').value = ''; modelOptions(); renderList(true); };
  $('academyPrevious').onclick = () => { page--; renderList(); }; $('academyNext').onclick = () => { page++; renderList(); };
  $('academyFavorite').onclick = () => { const item = S.item(state, current.id); state.items[current.id] = { ...item, favorite: !item.favorite }; persist(); renderFavorite(); renderList(); renderProgress(); };
  $('academyVariant').onclick = () => { const candidates = A.scenarios.filter(s => s.modelId === current.modelId); select(candidates[current.index % candidates.length].id); $('academyQuestion').focus({ preventScroll: true }); };
  $('academyReset').onclick = () => select(current.id, current.parameters, false);
  $('academyCompare').onchange = renderExperiment;
  $('academyAnswerForm').onsubmit = event => {
    event.preventDefault(); if (graded || !result) return;
    let answer; try { const raw = $('academyAnswer').value.trim(); if (!raw || raw.length > 480) throw Error('請先輸入答案。'); answer = root.MathExact.scalar(raw).value; if (!Number.isFinite(answer)) throw Error('請輸入有限實數。'); } catch { $('academyFeedback').textContent = '請輸入有效數值或算式，例如 2/3、√13；本次尚未計入。'; return; }
    const correct = A.isCorrect(result.model, result.answer, answer);
    try { state = S.record(state, current.id, correct); } catch (error) { $('academyFeedback').textContent = error.message; return; }
    graded = true; $('academyCheck').disabled = true; $('academyFeedback').dataset.correct = String(correct);
    $('academyFeedback').textContent = correct ? '答對了！這一組已記入完成進度。展開推導，核對你的理由。' : `再看一下關鍵步驟，結果約為 ${D.number(result.answer)}。可調參數再練，或點「下一組變體」。`;
    $('academySolution').open = true; persist(); renderProgress(); renderList();
  };
  function download(name, text, type) { const url = root.URL.createObjectURL(new Blob([text], { type })), a = doc.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => root.URL.revokeObjectURL(url), 1000); }
  $('academyExport').onclick = () => download('mathlab-academy-records.json', JSON.stringify(state, null, 2), 'application/json');
  $('academyImport').onclick = () => $('academyFile').click();
  $('academyFile').onchange = async event => {
    const file = event.target.files?.[0]; if (!file) return;
    try { if (file.size > 300000) throw Error('備份檔最多 300 KB。'); const imported = S.validate(JSON.parse(await file.text())); state = imported; damagedStorage = false; persist(); renderProgress(); renderList(); renderFavorite(); if (!$('academyStorage').textContent.includes('無法儲存')) storageStatus('已匯入備份紀錄；目前的題目與參數保留。'); } catch (error) { storageStatus('未匯入，現有紀錄保留。' + error.message); } finally { event.target.value = ''; }
  };
  $('academyCSV').onclick = () => { if (result) download(current.id + '.csv', root.MathScriptEditor.csv(result.result), 'text/csv;charset=utf-8'); };
  $('academySource').onclick = () => { if (result) download(current.id + '.mathscript', A.source(current.id, parameters), 'text/plain;charset=utf-8'); };
  $('academyReport').onclick = () => {
    if (!result) return; const report = D.publication(result.result, A.source(current.id, parameters), $('academyScript').href);
    const coach = `<section><h2>題目與推導</h2><p>${D.escape(result.question)}</p><p>${D.escape(result.model.signal)}</p><ol>${result.model.steps.map(s => `<li><strong>${D.escape(s.label)}</strong><p>${D.escape(s.reason)}</p><p>${D.escape(s.expression)} = ${D.number(result.values[s.key])}</p></li>`).join('')}</ol><h3>快捷思路</h3><p>${D.escape(result.model.shortcut)}</p><h3>常見陷阱</h3><p>${D.escape(result.model.trap)}</p></section>`;
    download(current.id + '.html', report.replace('</body>', coach + '</body>'), 'text/html;charset=utf-8');
  };
  $('academyShare').onclick = () => { if (!result) return; $('academyShareURL').value = makeShare(); $('academyCopyStatus').textContent = ''; $('academyShareDialog').showModal(); };
  $('academyCopy').onclick = async () => { try { await root.navigator.clipboard.writeText($('academyShareURL').value); $('academyCopyStatus').textContent = '連結已複製。'; } catch { $('academyShareURL').focus(); $('academyShareURL').select(); $('academyCopyStatus').textContent = '請手動複製選取的連結。'; } };
  root.addEventListener('hashchange', () => { try { const value = S.parseHash(root.location.hash); select(value.id, value.parameters, false); } catch (error) { storageStatus('無法開啟連結，保留目前實驗。' + error.message); } });
  root.addEventListener('storage', event => { if (event.key !== key || !event.newValue) return; try { if (event.newValue.length > 300000) throw Error('size'); state = S.validate(JSON.parse(event.newValue)); damagedStorage = false; renderProgress(); renderFavorite(); renderList(); storageStatus('已同步其他分頁的收藏與作答紀錄。'); } catch { storageStatus('其他分頁的紀錄格式無效，目前畫面保留。'); } });
  root.addEventListener('pagehide', () => { if (timer) { clearTimeout(timer); persist(); } });
  let initial = state.recent || { id: current.id, parameters };
  try { if (root.location.hash) initial = S.parseHash(root.location.hash); } catch (error) { initialWarning = '無法開啟連結，使用最近的實驗。' + error.message; }
  select(initial.id, initial.parameters, false); renderProgress(); if (initialWarning) storageStatus(initialWarning);
})(window);
