(function (root) {
  'use strict';
  const keywords = new Set('title param let fn view plot curve point print table integral roots from to step color label derivative tangent at sum product assert scatter 標題 參數 設 函數 視窗 繪圖 曲線 點 顯示 表格 積分 求根 從 到 每 顏色 標籤 微分 切線 於 加總 連乘 驗證 散點'.split(' '));
  const builtins = new Set('sin cos tan asin acos atan sqrt cbrt abs exp ln log floor ceil round min max if pi e π diff integrate factorial choose gcd lcm mod atan2 hypot sign sinh cosh tanh'.split(' '));
  const escape = text => text.replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  function highlight(source) {
    const pattern = /#[^\n]*|\/\/[^\n]*|"(?:\\[^\n]|[^"\\\n])*(?:"|$)|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?|[\p{L}_][\p{L}\p{N}_]*|[+\-*/^=<>(),]/gu;
    let result = '', start = 0;
    for (const match of source.matchAll(pattern)) {
      result += escape(source.slice(start, match.index)); const word = match[0];
      const type = word.startsWith('#') || word.startsWith('//') ? 'comment' : word.startsWith('"') ? 'string' : keywords.has(word) ? 'keyword' : builtins.has(word) ? 'builtin' : /^\d|^\.\d/.test(word) ? 'number' : /^[+\-*/^=<>(),]$/.test(word) ? 'operator' : 'name';
      result += `<span class="syntax-${type}">${escape(word)}</span>`; start = match.index + word.length;
    }
    return result + escape(source.slice(start)) + '\n';
  }
  const snippets = [
    ['parameter', '參數滑桿', 'param a = 1 from -3 to 3 step 0.1'],
    ['function', '自訂函數', 'fn f(x) = a * x^2'],
    ['plot', '函數圖形', 'plot f(x) color "#4f46e5" label "我的曲線"'],
    ['curve', '參數曲線', 'curve (cos(t), sin(t)) from 0 to 2*pi'],
    ['table', '數值表', 'table f(x) from -2 to 2 step 0.5'],
    ['integral', '定積分', 'integral f(x) from 0 to 2'],
    ['roots', '求根', 'roots f(x) from -4 to 4'],
    ['sum', '有限加總', 'print sum(n^2, n, 1, 10) label \"平方和\"'],
    ['product', '有限連乘', 'print product(k, k, 1, 6)'],
    ['derivative', '自動微分', 'derivative sin(x) at pi/4'],
    ['tangent', '切線', 'tangent x^2 at 1'],
    ['scatter', '離散散點', 'scatter choose(6,x) from 0 to 6 step 1'],
    ['assert', '驗證條件', 'assert abs(0.1+0.2-0.3) < 1e-12 label \"浮點容差檢查\"']
  ];
  function csv(result) {
    const rows = [['table', 'line', 'x', 'value']]; let table = 0;
    for (const output of result.outputs) if (output.type === 'table') { table++; for (const row of output.rows) rows.push([table, output.line, row[0], row[1] === null ? '' : row[1]]); }
    return '\ufeff' + rows.map(row => row.join(',')).join('\r\n') + '\r\n';
  }
  const api = { highlight, snippets, csv };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.MathScriptEditor = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
