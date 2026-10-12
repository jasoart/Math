(function (root) {
  'use strict';
  const P = root.MathPractice, doc = root.document, $ = id => doc.getElementById(id), key = 'mathlab.practice.v1';
  let records = P.empty(), question, answered = false, session = [], index = 0, sessionCorrect = 0, reviewing = false, noticeTimer;
  function notice(message) { clearTimeout(noticeTimer); $('practiceNotice').textContent = message; $('practiceNotice').hidden = false; noticeTimer = setTimeout(() => { $('practiceNotice').hidden = true; }, 6000); }
  function save() { try { root.localStorage.setItem(key, JSON.stringify(records)); $('practiceStorage').textContent = '練習紀錄已儲存於此裝置。'; } catch { $('practiceStorage').textContent = '無法儲存；請匯出紀錄備份，本次仍可繼續練習。'; } }
  function seed() { const values = new Uint32Array(1); if (root.crypto?.getRandomValues) return root.crypto.getRandomValues(values)[0]; return Math.floor(Math.random() * 4294967296); }
  function renderStats() {
    $('attemptCount').textContent = records.attempts; $('accuracy').textContent = records.attempts ? Math.round(records.correct / records.attempts * 100) + '%' : '—';
    const count = records.days[P.today()] || 0; $('todayCount').textContent = count; $('dailyProgress').value = Math.min(10, count);
    $('mistakeCount').textContent = records.mistakes.length; $('reviewMistakes').disabled = !records.mistakes.length;
    $('topicPerformance').replaceChildren();
    for (const topic of P.topics) {
      const row = doc.createElement('div'), title = doc.createElement('span'), value = doc.createElement('strong');
      const item = records.topics[topic.id]; title.textContent = topic.name; value.textContent = item?.attempts ? `${Math.round(item.correct / item.attempts * 100)}% · ${item.attempts} 題` : '尚未練習'; row.append(title, value); $('topicPerformance').append(row);
    }
    $('mistakeList').replaceChildren();
    if (!records.mistakes.length) { const empty = doc.createElement('p'); empty.className = 'muted'; empty.textContent = '目前沒有待複習錯題。繼續練習，把每個觀念想清楚。'; $('mistakeList').append(empty); }
    for (const item of [...records.mistakes].reverse()) {
      const q = P.generate(item.topic, item.difficulty, item.seed), card = doc.createElement('article'), title = doc.createElement('p'), button = doc.createElement('button');
      title.textContent = q.question; button.type = 'button'; button.textContent = '重新練習 ↗'; button.onclick = () => startReview([item]); card.append(title, button); $('mistakeList').append(card);
    }
  }
  function renderQuestion(focus = false) {
    question = session[index]; answered = false; $('sessionSummary').hidden = true;
    $('questionTag').textContent = `${P.topics.find(t => t.id === question.topic).name} · ${question.difficulty === 1 ? '基礎' : '進階'}${reviewing ? ' · 錯題複習' : ''}`;
    $('sessionPosition').textContent = `第 ${index + 1} / ${session.length} 題`; $('sessionProgress').max = session.length; $('sessionProgress').value = index;
    $('practiceQuestion').textContent = question.question; $('practiceAnswer').value = ''; $('practiceAnswer').disabled = false; $('practiceAnswer').setAttribute('aria-invalid', 'false');
    $('checkAnswer').disabled = false; $('nextQuestion').disabled = true; $('nextQuestion').textContent = index === session.length - 1 ? '完成這次練習 →' : '下一題 →'; $('showHint').disabled = false;
    $('practiceHint').hidden = true; $('answerExplanation').hidden = true; $('answerFeedback').textContent = ''; $('answerFeedback').dataset.state = '';
    $('practiceChoices').replaceChildren();
    question.choices.forEach((choice, i) => {
      const button = doc.createElement('button'); button.type = 'button'; button.textContent = `${'ABCD'[i]}  ${choice.text}`; button.setAttribute('aria-pressed', 'false'); button.dataset.choice = i;
      button.onclick = () => { $('practiceAnswer').value = choice.text; for (const b of $('practiceChoices').children) b.setAttribute('aria-pressed', String(b === button)); $('practiceAnswer').setAttribute('aria-invalid', 'false'); };
      $('practiceChoices').append(button);
    });
    if (focus) { $('practiceQuestion').focus({ preventScroll: true }); $('practiceQuestion').scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  }
  function startSession() {
    reviewing = false; const topic = $('practiceTopic').value, difficulty = Number($('practiceDifficulty').value);
    session = Array.from({ length: 10 }, (_, i) => P.generate(topic === 'all' ? P.topics[i % P.topics.length].id : topic, difficulty, seed()));
    index = 0; sessionCorrect = 0; renderQuestion();
  }
  function startReview(items) { if (!items.length) return; reviewing = true; session = items.map(item => P.generate(item.topic, item.difficulty, item.seed)); index = 0; sessionCorrect = 0; renderQuestion(true); }
  $('answerForm').onsubmit = event => {
    event.preventDefault(); if (answered) return;
    let response; try { response = P.grade(question, $('practiceAnswer').value); }
    catch { $('practiceAnswer').setAttribute('aria-invalid', 'true'); $('answerFeedback').textContent = '請輸入有限數值或算式，例如 2/3、√13。'; $('answerFeedback').dataset.state = 'invalid'; return; }
    try { records = P.record(records, question, response.correct, P.today()); }
    catch (error) { notice(error.message); return; }
    answered = true; sessionCorrect += Number(response.correct); save(); renderStats();
    $('answerFeedback').dataset.state = response.correct ? 'correct' : 'wrong';
    $('answerFeedback').textContent = response.correct ? '答對了！看看解析，確認你的理由。' : `這次答案為 ${question.answerText}。已加入錯題，之後可以再練一次。`;
    $('solutionSteps').textContent = question.explanation; $('answerExplanation').hidden = false;
    const url = new URL('./index.html', root.location.href); url.hash = question.module; $('relatedExperiment').href = url.href;
    $('practiceAnswer').disabled = true; $('checkAnswer').disabled = true; $('nextQuestion').disabled = false;
    for (const button of $('practiceChoices').children) { button.disabled = true; const choice = question.choices[Number(button.dataset.choice)]; if (Math.abs(choice.value - question.answer) < 1e-7) button.dataset.correct = 'true'; }
    $('sessionProgress').value = index + 1;
  };
  $('practiceAnswer').addEventListener('input', () => { $('practiceAnswer').setAttribute('aria-invalid', 'false'); for (const button of $('practiceChoices').children) button.setAttribute('aria-pressed', 'false'); });
  $('showHint').onclick = () => { $('practiceHint').textContent = question.hint; $('practiceHint').hidden = false; $('showHint').disabled = true; };
  $('nextQuestion').onclick = () => { if (!answered) return; if (index < session.length - 1) { index++; renderQuestion(true); } else { $('sessionSummary').hidden = false; $('summaryText').textContent = `${session.length} 題中答對 ${sessionCorrect} 題。${sessionCorrect < session.length ? '回到錯題清單，再想一次解題理由。' : '可以挑戰進階題，或開啟相關互動圖形。'}`; $('nextQuestion').disabled = true; } };
  $('startSession').onclick = startSession; $('anotherSession').onclick = startSession; $('reviewMistakes').onclick = () => startReview([...records.mistakes]);
  $('exportPractice').onclick = () => { const url = URL.createObjectURL(new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' })), link = doc.createElement('a'); link.href = url; link.download = 'mathlab-practice.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
  $('importPractice').onclick = () => $('practiceFile').click();
  $('practiceFile').onchange = async event => { const file = event.target.files?.[0]; if (!file) return; try { if (file.size > 150000) throw Error('檔案不可超過 150 KB。'); const next = P.validate(JSON.parse(await file.text())); records = next; save(); renderStats(); notice('已匯入練習紀錄。'); } catch (error) { notice(`無法匯入：${error.message}`); } finally { event.target.value = ''; } };
  for (const topic of P.topics) $('practiceTopic').append(new Option(topic.name, topic.id));
  const requested = new URLSearchParams(root.location.search).get('topic'); if (P.topics.some(t => t.id === requested)) $('practiceTopic').value = requested;
  try { const saved = root.localStorage.getItem(key); if (saved) { if (saved.length > 150000) throw Error('紀錄過大'); records = P.validate(JSON.parse(saved)); } }
  catch { $('practiceStorage').textContent = '舊紀錄無法讀取，請保留備份後再匯入。'; }
  renderStats(); startSession();
})(window);
