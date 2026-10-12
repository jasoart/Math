(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./models.js') : root.MathAcademy);
  if (typeof module === 'object' && module.exports) module.exports = api; else root.MathAcademyState = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (A) {
  'use strict';
  const ids = new Set(A.scenarios.map(s => s.id));
  const empty = () => ({ kind: 'mathlab-academy', version: 1, items: {}, recent: null });
  function validate(value) {
    if (!value || value.kind !== 'mathlab-academy' || value.version !== 1 || !value.items || typeof value.items !== 'object' || Array.isArray(value.items) || Object.keys(value.items).length > ids.size) throw Error('不支援的模組紀錄。');
    const state = empty();
    for (const [id, item] of Object.entries(value.items)) {
      if (!ids.has(id) || !item || typeof item.favorite !== 'boolean' || ![item.attempts, item.correct].every(n => Number.isSafeInteger(n) && n >= 0 && n <= 100000) || item.correct > item.attempts || typeof item.needsReview !== 'boolean' || (item.needsReview && item.attempts === item.correct)) throw Error('模組紀錄內容無效。');
      state.items[id] = { favorite: item.favorite, attempts: item.attempts, correct: item.correct, needsReview: item.needsReview };
    }
    if (value.recent !== null && value.recent !== undefined) {
      const { scenario, model } = A.resolve(value.recent.id);
      state.recent = { id: scenario.id, parameters: A.normalize(model, value.recent.parameters) };
    } return state;
  }
  function item(state, id) { if (!ids.has(id)) throw Error('未知模組。'); return state.items[id] || { favorite: false, attempts: 0, correct: 0, needsReview: false }; }
  function record(state, id, correct) {
    const next = validate(state), previous = item(next, id);
    if (previous.attempts >= 100000) throw Error('此模組紀錄已達上限。');
    next.items[id] = { ...previous, attempts: previous.attempts + 1, correct: previous.correct + Number(!!correct), needsReview: !correct };
    return next;
  }
  function summary(state) {
    const items = Object.values(state.items);
    return { completed: items.filter(i => i.correct > 0).length, favorites: items.filter(i => i.favorite).length, review: items.filter(i => i.needsReview).length, attempts: items.reduce((s, i) => s + i.attempts, 0), correct: items.reduce((s, i) => s + i.correct, 0) };
  }
  function hash(id, params) { const { model } = A.resolve(id); return '#' + id + '?p=' + encodeURIComponent(JSON.stringify(A.normalize(model, params))); }
  function parseHash(text) {
    if (typeof text !== 'string' || text.length > 4096) throw Error('分享連結過長。');
    const match = text.match(/^#(academy-[a-z0-9-]+)(?:\?p=([^?]+))?$/); if (!match) throw Error('分享連結格式無效。');
    const { model, scenario } = A.resolve(match[1]);
    let parameters = scenario.parameters;
    if (match[2]) { try { parameters = JSON.parse(decodeURIComponent(match[2])); } catch { throw Error('分享參數無法讀取。'); } }
    return { id: scenario.id, parameters: A.normalize(model, parameters) };
  }
  return { empty, validate, item, record, summary, hash, parseHash };
});
