'use strict';
const { test } = require('node:test'), assert = require('node:assert/strict');
const P = require('../engine/practice.js'), tools = require('../language/editor-tools.js'), M = require('../language/mathscript.js');
const catalog = require('../engine/catalog.json');
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} vs ${b}`);
function expected(q) {
  const text = q.question;
  if (q.topic === 'algebra' && q.difficulty === 1) { const [, a, sign, b, c] = text.match(/(\d+)x ([+−]) (\d+) = (-?\d+)/); return (Number(c) - Number(b) * (sign === '−' ? -1 : 1)) / Number(a); }
  if (q.topic === 'algebra') { const [, a, s1, h, s2, k, x] = text.match(/(\d+)\(x ([+−]) (\d+)\)² ([+−]) (\d+)，求 f\((-?\d+)\)/); return Number(a) * (Number(x) + Number(h) * (s1 === '−' ? -1 : 1)) ** 2 + Number(k) * (s2 === '−' ? -1 : 1); }
  if (q.topic === 'geometry' && q.difficulty === 1) { const [, x, y] = text.match(/B = \((\d+), (\d+)\)/); return Math.hypot(Number(x), Number(y)); }
  if (q.topic === 'geometry') { const coords = [...text.matchAll(/\((-?\d+), (-?\d+)\)/g)].map(m => m.slice(1).map(Number)); return coords[0].reduce((sum, n, i) => sum + n * coords[1][i], 0); }
  if (q.topic === 'trig' && q.difficulty === 1) return Math.sin(Number(text.match(/sin\((\d+)°/)[1]) * Math.PI / 180);
  if (q.topic === 'trig') { const [, n, d] = text.match(/sin θ = (\d+)\/(\d+)/); return Math.cos(2 * Math.asin(Number(n) / Number(d))); }
  if (q.topic === 'sequence') { const [, a, delta, n] = text.match(/首項 (-?\d+)、公[差比] (-?\d+)，求(?:第|前)\s*(\d+) 項/); let term = Number(a), sum = term; for (let i = 1; i < Number(n); i++) { term = q.difficulty === 1 ? term + Number(delta) : term * Number(delta); sum += term; } return q.difficulty === 1 ? term : sum; }
  if (q.topic === 'probability' && q.difficulty === 1) { const [, r, b] = text.match(/(\d+) 顆紅球、(\d+) 顆藍球/); const red = Number(r), total = red + Number(b); return (red * (red - 1) / 2) / (total * (total - 1) / 2); }
  if (q.topic === 'probability') { const [, group, both] = text.match(/有 (\d+) 位參加游泳隊，其中 (\d+) 位/); return Number(both) / Number(group); }
  if (q.topic === 'statistics' && q.difficulty === 1) { const nums = text.match(/資料 ([\d、]+) 的/)[1].split('、').map(Number); return nums.reduce((a, b) => a + b) / nums.length; }
  if (q.topic === 'statistics') { const nums = text.match(/把 (\d+)、(\d+)、(\d+) 視/).slice(1).map(Number), mean = nums.reduce((a, b) => a + b) / 3; return nums.reduce((sum, n) => sum + (n - mean) ** 2, 0) / 3; }
  if (q.topic === 'calculus' && q.difficulty === 1) { const [, a, sign, b, x] = text.match(/(\d+)x² ([+−]) (\d+)x，在 x = (\d+)/), coefficient = Number(b) * (sign === '−' ? -1 : 1), f = n => Number(a) * n ** 2 + coefficient * n; return (f(Number(x) + .001) - f(Number(x) - .001)) / .002; }
  if (q.topic === 'calculus') { const [, n, a, sign, b] = text.match(/∫₀\^(\d+) \((\d+)x ([+−]) (\d+)\)/); const f = x => Number(a) * x + Number(b) * (sign === '−' ? -1 : 1), step = Number(n) / 100; let sum = 0; for (let i = 0; i < 100; i++) sum += (f(i * step) + f((i + 1) * step)) * step / 2; return sum; }
}
test('420 deterministic questions match independent mathematical references', () => {
  for (const topic of P.topics) for (const difficulty of [1, 2]) for (let seed = 0; seed < 30; seed++) {
    const q = P.generate(topic.id, difficulty, seed); near(q.answer, expected(q)); assert.deepEqual(q, P.generate(topic.id, difficulty, seed));
    assert.ok(P.grade(q, q.answerText).correct); assert.equal(q.choices.length, 4); assert.equal(new Set(q.choices.map(c => c.value)).size, 4);
    assert.equal(q.choices.filter(c => P.grade(q, c.text).correct).length, 1); assert.ok(catalog.modules.some(m => m.id === q.module));
  }
});
test('grading accepts exact fractions/roots and rejects invalid or executable input', () => {
  const q = { answer: Math.SQRT2 }; assert.ok(P.grade(q, '√2').correct); assert.ok(P.grade({ answer: 1 / 3 }, '2/6').correct); assert.ok(!P.grade(q, '2').correct);
  for (const input of ['', '1/0', 'window.alert(1)', '<img>', 'a', 'sqrt(-1)']) assert.throws(() => P.grade(q, input));
});
test('wrong answers enter review, correct retries remove them, and records stay bounded', () => {
  let record = P.empty(); const q = P.generate('algebra', 1, 42); record = P.record(record, q, false, '2026-10-12'); assert.equal(record.mistakes.length, 1);
  record = P.record(record, q, false, '2026-10-12'); assert.equal(record.mistakes.length, 1); record = P.record(record, q, true, '2026-10-12'); assert.equal(record.mistakes.length, 0); assert.equal(record.attempts, 3); assert.equal(record.correct, 1); assert.equal(record.days['2026-10-12'], 3);
  for (let seed = 0; seed < 65; seed++) record = P.record(record, P.generate('trig', 1, seed), false, '2026-10-12'); assert.equal(record.mistakes.length, 60); assert.equal(P.validate(JSON.parse(JSON.stringify(record))).attempts, 68);
  assert.throws(() => P.validate({ ...record, correct: 999 })); assert.throws(() => P.validate({ ...record, mistakes: [{ topic: '__proto__', difficulty: 1, seed: 1 }] }));
  assert.throws(() => P.generate('none', 1, 2)); assert.throws(() => P.generate('algebra', 1, -1));
});
test('study days use Asia/Taipei and not the container UTC date', () => { assert.equal(P.today(new Date('2026-10-12T17:00:00Z')), '2026-10-13'); });
test('highlighting escapes incomplete or hostile source and CSV preserves numeric precision', () => {
  const highlighted = tools.highlight('title "<script>"\n# comment\nparam a=2\nprint sin(pi/2)'); assert.ok(highlighted.includes('syntax-keyword')); assert.ok(highlighted.includes('syntax-comment')); assert.doesNotMatch(highlighted, /<script>/);
  assert.doesNotThrow(() => tools.highlight('title "unterminated\nplot x'));
  const result = M.run('table 1/x from 0 to 1 step .5'); const csv = tools.csv(result); assert.ok(csv.startsWith('\ufefftable,line,x,value')); assert.ok(csv.includes('1,1,0,\r\n')); assert.ok(csv.includes('1,1,0.5,2'));
});
