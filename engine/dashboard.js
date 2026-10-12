(function (root) {
  'use strict';
  const lab = root.MathLab, P = root.MathPractice, doc = root.document, $ = id => doc.getElementById(id);
  if (!lab || !$('topicCards')) return;
  const byId = new Map(lab.modules.map(m => [m.id, m])), recentKey = 'mathlab.recent.v1'; let recent = [], timer;
  const groups = [
    { title: '代數與函數', icon: 'ƒ', subtitle: '方程式、圖形與變換', test: /代數|數線|多項式|函數圖形|二次曲線|指數|對數|複數/ },
    { title: '幾何與向量', icon: '△', subtitle: '從平面到立體空間', test: /幾何|向量|直線與圓|矩陣|三角形|圆/ },
    { title: '三角與週期', icon: 'θ', subtitle: '角度、波動與恆等式', test: /三角|波|訊號/ },
    { title: '數列與級數', icon: '∑', subtitle: '規律、總和與收斂', test: /數列|級數|遞迴/ },
    { title: '機率與統計', icon: 'σ', subtitle: '機率、期望值與資料', test: /機率|統計|數據|排列|組合/ },
    { title: '微積分與進階探索', icon: '∫', subtitle: '變化、面積與數值方法', test: /微積分|數值|科學|動態|曲線幾何|最佳化/ }
  ];
  const assigned = new Set();
  const items = groups.map(group => ({ ...group, modules: lab.modules.filter(m => { if (assigned.has(m.id) || !group.test.test(m.tag)) return false; assigned.add(m.id); return true; }) }));
  for (const module of lab.modules) if (!assigned.has(module.id)) items.at(-1).modules.push(module);
  function jump(module) { lab.selectModule(module.id); $('experiment').scrollIntoView({ block: 'start', behavior: 'smooth' }); $('moduleTitle').focus({ preventScroll: true }); }
  for (const [i, group] of items.entries()) {
    const card = doc.createElement('article'), icon = doc.createElement('span'), title = doc.createElement('h3'), description = doc.createElement('p'), count = doc.createElement('small'), button = doc.createElement('button');
    card.className = 'topic-card'; icon.className = 'topic-icon'; icon.textContent = group.icon; title.textContent = group.title; description.textContent = group.subtitle; count.textContent = `${String(i + 1).padStart(2, '0')} / ${group.modules.length} 個實驗`;
    button.type = 'button'; button.textContent = '探索主題 ↗'; button.onclick = () => {
      const matchingTags = new Set(group.modules.map(m => m.tag)); $('moduleSearch').value = ''; $('favoritesOnly').checked = false;
      $('topicFilter').value = matchingTags.size === 1 ? [...matchingTags][0] : 'all';
      if (matchingTags.size > 1) { $('moduleSearch').value = ''; lab.learning.setCategory(group.modules.map(m => m.id), group.title); }
      else lab.learning.setCategory(null);
      lab.refreshList(); jump(group.modules[0]);
    };
    card.append(icon, count, title, description, button); $('topicCards').append(card);
  }
  function renderProgress() {
    const summary = lab.learning.getSummary(); $('exploreProgress').max = lab.modules.length; $('exploreProgress').value = summary.practiced;
    $('exploreSummary').textContent = `已探索 ${summary.practiced} / ${lab.modules.length} 個實驗`;
    let records = P.empty(); try { const saved = root.localStorage.getItem('mathlab.practice.v1'); if (saved && saved.length <= 150000) records = P.validate(JSON.parse(saved)); } catch {}
    $('dashboardToday').textContent = records.days[P.today()] || 0; $('dashboardMistakes').textContent = records.mistakes.length;
    $('dashboardAccuracy').textContent = records.attempts ? Math.round(records.correct / records.attempts * 100) + '%' : '從第一題開始';
    const next = items.find(group => group.modules.some(m => !summary.practicedIds.includes(m.id)))?.modules.find(m => !summary.practicedIds.includes(m.id));
    if (next) { $('suggestedExperiment').textContent = `下一個想法：${next.short || next.title} ↗`; $('suggestedExperiment').onclick = () => jump(next); }
  }
  function renderRecent() {
    $('recentExperiments').replaceChildren();
    for (const item of recent) { const a = doc.createElement('button'); a.type = 'button'; a.textContent = byId.get(item.id).short || byId.get(item.id).title; a.onclick = () => { lab.selectModule(item.id, item.parameters); $('experiment').scrollIntoView({ block: 'start', behavior: 'smooth' }); }; $('recentExperiments').append(a); }
    $('resumeExperiment').disabled = !recent.length; $('resumeTitle').textContent = recent.length ? byId.get(recent[0].id).title : '選一個主題，開始你的第一個實驗。';
  }
  function rememberCurrent() {
    const state = lab.getState(); recent = [{ id: state.moduleId, parameters: state.parameters }, ...recent.filter(r => r.id !== state.moduleId)].slice(0, 5); renderRecent();
    try { root.localStorage.setItem(recentKey, JSON.stringify(recent)); } catch {}
  }
  try { const saved = JSON.parse(root.localStorage.getItem(recentKey) || '[]'); if (Array.isArray(saved) && saved.length <= 5) recent = saved.filter(r => r && byId.has(r.id)).map(r => ({ id: r.id, parameters: lab.validateParameters(byId.get(r.id), r.parameters) })); } catch {}
  $('resumeExperiment').onclick = () => { if (!recent.length) return; const r = recent[0]; lab.selectModule(r.id, r.parameters); $('experiment').scrollIntoView({ block: 'start', behavior: 'smooth' }); };
  let baseline = JSON.stringify(lab.getState());
  doc.addEventListener('mathlab:modulechange', () => { baseline = JSON.stringify(lab.getState()); rememberCurrent(); });
  doc.addEventListener('mathlab:statechange', () => { const next = JSON.stringify(lab.getState()); if (baseline === next) return; baseline = next; clearTimeout(timer); timer = setTimeout(rememberCurrent, 250); });
  doc.addEventListener('mathlab:learningchange', renderProgress); root.addEventListener('storage', event => { if (event.key === 'mathlab.practice.v1') renderProgress(); });
  root.addEventListener('pagehide', () => { if (timer) { clearTimeout(timer); rememberCurrent(); } });
  const day = P.today(), daily = P.generate(P.topics[Number(day.replace(/-/g, '')) % P.topics.length].id, 1, Number(day.replace(/-/g, '')));
  let dailyRecord = null; try { const saved = JSON.parse(root.localStorage.getItem('mathlab.daily.v1') || 'null'); if (saved?.day === day && typeof saved.correct === 'boolean') dailyRecord = saved; } catch {}
  $('dailyQuestion').textContent = daily.question;
  function showDaily(correct) { $('dailyResult').textContent = (correct ? '答對了！' : '再看一次理由：') + daily.explanation; $('dailyResult').dataset.correct = String(correct); for (const button of $('dailyChoices').children) button.disabled = true; }
  for (const choice of daily.choices) { const button = doc.createElement('button'); button.type = 'button'; button.textContent = choice.text; button.onclick = () => {
    if (dailyRecord) return; const correct = P.grade(daily, choice.text).correct; dailyRecord = { day, correct }; showDaily(correct);
    try { const saved = root.localStorage.getItem('mathlab.practice.v1'), records = saved ? P.validate(JSON.parse(saved)) : P.empty(); root.localStorage.setItem('mathlab.practice.v1', JSON.stringify(P.record(records, daily, correct, day))); root.localStorage.setItem('mathlab.daily.v1', JSON.stringify(dailyRecord)); }
    catch { $('dailyResult').textContent += ' 本次無法儲存紀錄，仍可繼續練習。'; }
    renderProgress();
  }; $('dailyChoices').append(button); }
  if (dailyRecord) showDaily(dailyRecord.correct);
  renderProgress(); renderRecent();
})(window);
