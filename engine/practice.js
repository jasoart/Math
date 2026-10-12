/* Reproducible formative questions and validated, browser-local practice records. */
(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('../graph/exact.js') : root.MathExact);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MathPractice = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (exact) {
  'use strict';
  const VERSION = 1, MAX_MISTAKES = 60;
  const topics = [
    { id: 'algebra', name: '代數與函數', icon: 'ƒ', module: 'quadratic-vertex' },
    { id: 'geometry', name: '幾何與向量', icon: '△', module: 'projection' },
    { id: 'trig', name: '三角函數', icon: 'θ', module: 'trig' },
    { id: 'sequence', name: '數列與級數', icon: '∑', module: 'sequence-series' },
    { id: 'probability', name: '機率', icon: 'P', module: 'bayes' },
    { id: 'statistics', name: '數據分析', icon: 'σ', module: 'regression' },
    { id: 'calculus', name: '微積分', icon: '∫', module: 'riemann' }
  ];
  const topicMap = new Map(topics.map(t => [t.id, t]));
  const format = n => Number(n.toPrecision(8)).toString();
  const signed = n => n < 0 ? `− ${Math.abs(n)}` : `+ ${n}`;
  function random(seed) { let state = seed >>> 0; return () => { state += 0x6d2b79f5; let n = state; n = Math.imul(n ^ n >>> 15, n | 1); n ^= n + Math.imul(n ^ n >>> 7, n | 61); return ((n ^ n >>> 14) >>> 0) / 4294967296; }; }
  function generate(topic, difficulty, seed) {
    if (!topicMap.has(topic) || ![1, 2].includes(difficulty) || !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw Error('題目設定無效。');
    const rand = random(seed), integer = (a, b) => a + Math.floor(rand() * (b - a + 1));
    const q = { id: `${topic}:${difficulty}:${seed}`, topic, difficulty, seed, module: topicMap.get(topic).module };
    switch (topic) {
      case 'algebra': {
        const a = integer(2, 6), b = integer(-8, 8), x = integer(-5, 8), c = a * x + b;
        if (difficulty === 1) Object.assign(q, { question: `若 ${a}x ${signed(b)} = ${c}，x 等於多少？`, answer: x, hint: '先在等號兩側減去常數項，再除以 x 的係數。', explanation: `${a}x = ${c} ${signed(-b)} = ${a * x}，所以 x = ${a * x} ÷ ${a} = ${x}。` });
        else { const h = integer(-4, 4), k = integer(-6, 6), input = h + integer(1, 4), answer = a * (input - h) ** 2 + k; Object.assign(q, { question: `f(x) = ${a}(x ${signed(-h)})² ${signed(k)}，求 f(${input})。`, answer, hint: '把輸入代入 x，先計算括號，再平方、乘係數，最後加常數。', explanation: `f(${input}) = ${a} × (${input - h})² ${signed(k)} = ${answer}。`, parameters: { a, h, k } }); } break;
      }
      case 'geometry': {
        if (difficulty === 1) { const x = integer(1, 6), y = integer(1, 6), s = x * x + y * y; Object.assign(q, { question: `A = (0, 0)，B = (${x}, ${y})，線段 AB 的長度是多少？`, answer: Math.sqrt(s), answerText: `√${s}`, hint: '使用兩點距離公式，將兩個座標差平方後相加，再開根號。', explanation: `AB = √(${x}² + ${y}²) = √${s} ≈ ${format(Math.sqrt(s))}。` }); }
        else { const a = [integer(-4, 4), integer(1, 5)], b = [integer(1, 5), integer(-4, 4)], answer = a[0] * b[0] + a[1] * b[1]; Object.assign(q, { question: `a = (${a.join(', ')})，b = (${b.join(', ')})，內積 a·b 等於多少？`, answer, hint: '把對應分量相乘，再相加；不是將分量分別相加。', explanation: `a·b = (${a[0]}) × (${b[0]}) + (${a[1]}) × (${b[1]}) = ${answer}。` }); } break;
      }
      case 'trig': {
        if (difficulty === 1) { const angles = [0, 30, 90, 150, 180, 270], values = [0, .5, 1, .5, 0, -1], i = integer(0, 5); Object.assign(q, { question: `sin(${angles[i]}°) 等於多少？`, answer: values[i], hint: '在單位圓上，sin θ 是對應點的 y 座標。留意象限與角度單位。', explanation: `${angles[i]}° 對應的單位圓 y 座標為 ${values[i]}，所以 sin(${angles[i]}°) = ${values[i]}。` }); }
        else { const n = integer(1, 3), d = 5, s = n / d, answer = 1 - 2 * s * s; Object.assign(q, { question: `已知 sin θ = ${n}/${d}，求 cos(2θ)。`, answer, answerText: `${25 - 2 * n * n}/25`, hint: '用 cos(2θ) = 1 − 2sin²θ，不需要先求 θ。', explanation: `cos(2θ) = 1 − 2 × (${n}/5)² = ${25 - 2 * n * n}/25。` }); } break;
      }
      case 'sequence': {
        if (difficulty === 1) { const a = integer(-3, 8), d = integer(1, 5), n = integer(5, 12), answer = a + (n - 1) * d; Object.assign(q, { question: `等差數列首項 ${a}、公差 ${d}，求第 ${n} 項。`, answer, hint: '從第 1 項走到第 n 項，需要加 n−1 次公差。', explanation: `aₙ = a₁ + (n−1)d = ${a} + ${n - 1} × ${d} = ${answer}。` }); }
        else { const a = integer(1, 4), r = integer(0, 1) ? 2 : -2, n = integer(3, 6), answer = a * (1 - r ** n) / (1 - r); Object.assign(q, { question: `等比數列首項 ${a}、公比 ${r}，求前 ${n} 項和。`, answer, hint: '使用 Sₙ = a₁(1−rⁿ)/(1−r)，負公比的次方要留意正負。', explanation: `Sₙ = ${a} × [1−(${r})^${n}] / [1−(${r})] = ${answer}。` }); } break;
      }
      case 'probability': {
        const red = integer(3, 7), blue = integer(2, 6), n = red + blue;
        if (difficulty === 1) { const answer = red * (red - 1) / (n * (n - 1)); Object.assign(q, { question: `袋中有 ${red} 顆紅球、${blue} 顆藍球，連續取 2 顆且不放回。兩顆都是紅球的機率是多少？`, answer, answerText: `${red * (red - 1)}/${n * (n - 1)}`, hint: '取到第一顆紅球後，紅球數和總球數都減 1。', explanation: `P = (${red}/${n}) × (${red - 1}/${n - 1}) = ${red * (red - 1)}/${n * (n - 1)}。` }); }
        else { const both = integer(1, red - 1), total = red + blue + 8; Object.assign(q, { question: `${total} 位同學中，有 ${red} 位參加游泳隊，其中 ${both} 位也參加自行車隊。已知某同學是游泳隊員，他也參加自行車隊的機率是多少？`, answer: both / red, answerText: `${both}/${red}`, hint: '已知游泳隊員後，樣本空間縮小為游泳隊的同學。', explanation: `P(自行車隊｜游泳隊) = 兩隊皆參加人數 / 游泳隊人數 = ${both}/${red}，分母不再是全班 ${total} 人。` }); } break;
      }
      case 'statistics': {
        const center = integer(4, 15), delta = integer(1, 5);
        if (difficulty === 1) { const data = Array.from({ length: 5 }, () => integer(1, 15)), sum = data.reduce((a, b) => a + b, 0); Object.assign(q, { question: `資料 ${data.join('、')} 的算術平均數是多少？`, answer: sum / 5, hint: '先將全部資料加總，再除以資料筆數。', explanation: `平均 = (${data.join(' + ')}) / 5 = ${sum}/5 = ${format(sum / 5)}。` }); }
        else Object.assign(q, { question: `把 ${center - delta}、${center}、${center + delta} 視為整個母體，其母體變異數是多少？`, answer: 2 * delta * delta / 3, answerText: `${2 * delta * delta}/3`, hint: '先求平均，再將每筆資料與平均的差平方；母體變異數除以資料筆數 3。', explanation: `平均為 ${center}。σ² = [(${delta})² + 0² + (${delta})²]/3 = ${2 * delta * delta}/3；不是除以 2 的樣本變異數。` }); break;
      }
      case 'calculus': {
        const a = integer(1, 5), b = integer(-4, 5), n = integer(1, 5);
        if (difficulty === 1) Object.assign(q, { question: `f(x) = ${a}x² ${signed(b)}x，在 x = ${n} 的切線斜率是多少？`, answer: 2 * a * n + b, hint: '先微分得到 f′(x)，再代入指定的 x。', explanation: `f′(x) = ${2 * a}x ${signed(b)}，所以 f′(${n}) = ${2 * a} × ${n} ${signed(b)} = ${2 * a * n + b}。` });
        else Object.assign(q, { question: `求定積分 ∫₀^${n} (${a}x ${signed(b)}) dx。`, answer: a * n * n / 2 + b * n, hint: '反導函數為 ax²/2 + bx；定積分是上限值減下限值，可為負。', explanation: `[${a}x²/2 ${signed(b)}x]₀^${n} = ${a} × ${n}²/2 ${signed(b * n)} = ${format(a * n * n / 2 + b * n)}。` }); break;
      }
    }
    const candidates = [q.answer, q.answer + 1, q.answer - 1, -q.answer, q.answer * 2, q.answer + 2, q.answer - 2];
    const values = []; for (const value of candidates) if (!values.some(n => Math.abs(n - value) < 1e-7)) values.push(value);
    q.choices = values.slice(0, 4).map(value => ({ value, text: value === q.answer && q.answerText ? q.answerText : format(value) }));
    for (let i = q.choices.length - 1; i > 0; i--) { const j = integer(0, i); [q.choices[i], q.choices[j]] = [q.choices[j], q.choices[i]]; }
    q.answerText = q.answerText || format(q.answer); return q;
  }
  function grade(question, source) {
    const parsed = exact.scalar(source);
    return { correct: Math.abs(parsed.value - question.answer) <= 1e-7 * Math.max(1, Math.abs(question.answer)), value: parsed.value, source: parsed.source };
  }
  function empty() { return { kind: 'mathlab-practice', version: VERSION, attempts: 0, correct: 0, topics: {}, days: {}, mistakes: [] }; }
  function validate(input) {
    if (!input || input.kind !== 'mathlab-practice' || input.version !== VERSION || !Number.isSafeInteger(input.attempts) || input.attempts < 0 || input.attempts > 1000000 || !Number.isSafeInteger(input.correct) || input.correct < 0 || input.correct > input.attempts) throw Error('練習紀錄格式無效。');
    const result = empty(); result.attempts = input.attempts; result.correct = input.correct;
    if (!input.topics || Array.isArray(input.topics) || typeof input.topics !== 'object' || Object.keys(input.topics).length > topics.length || !input.days || Array.isArray(input.days) || typeof input.days !== 'object' || Object.keys(input.days).length > 90 || !Array.isArray(input.mistakes) || input.mistakes.length > MAX_MISTAKES) throw Error('練習資料超過範圍。');
    for (const [key, value] of Object.entries(input.topics)) {
      if (!topicMap.has(key) || !value || !Number.isSafeInteger(value.attempts) || !Number.isSafeInteger(value.correct) || value.attempts < 0 || value.attempts > input.attempts || value.correct < 0 || value.correct > value.attempts) throw Error('主題紀錄無效。');
      result.topics[key] = { attempts: value.attempts, correct: value.correct };
    }
    for (const [key, value] of Object.entries(input.days)) { if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !Number.isSafeInteger(value) || value < 0 || value > input.attempts) throw Error('每日紀錄無效。'); result.days[key] = value; }
    for (const item of input.mistakes) { if (!item || !topicMap.has(item.topic) || ![1, 2].includes(item.difficulty) || !Number.isInteger(item.seed) || item.seed < 0 || item.seed > 0xffffffff) throw Error('錯題紀錄無效。'); const id = `${item.topic}:${item.difficulty}:${item.seed}`; if (result.mistakes.some(x => `${x.topic}:${x.difficulty}:${x.seed}` === id)) throw Error('錯題重複。'); result.mistakes.push({ topic: item.topic, difficulty: item.difficulty, seed: item.seed }); }
    return result;
  }
  function record(input, question, correct, day) {
    const state = validate(input); if (state.attempts >= 1000000) throw Error('紀錄已達上限，請先匯出備份。');
    state.attempts++; state.correct += Number(correct);
    const topic = state.topics[question.topic] || { attempts: 0, correct: 0 }; topic.attempts++; topic.correct += Number(correct); state.topics[question.topic] = topic;
    state.days[day] = (state.days[day] || 0) + 1; for (const key of Object.keys(state.days).sort().slice(0, -90)) delete state.days[key];
    state.mistakes = state.mistakes.filter(x => `${x.topic}:${x.difficulty}:${x.seed}` !== question.id);
    if (!correct) { state.mistakes.push({ topic: question.topic, difficulty: question.difficulty, seed: question.seed }); state.mistakes = state.mistakes.slice(-MAX_MISTAKES); }
    return state;
  }
  function today(date = new Date()) { return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date); }
  return Object.freeze({ topics, generate, grade, empty, validate, record, today, MAX_MISTAKES });
});
