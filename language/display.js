/* Shared, escaped SVG/report generation for the editor and exported publications. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MathScriptDisplay = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const number = n => n === null || !Number.isFinite(n) ? '未定義' : Object.is(n, -0) ? '0' : Number(n.toPrecision(9)).toString();
  function svg(result, width = 900, height = 540) {
    const pad = 42, w = width - pad * 2, h = height - pad * 2, v = result.view;
    const x = n => pad + (n - v.xmin) / (v.xmax - v.xmin) * w;
    const y = n => pad + (v.ymax - n) / (v.ymax - v.ymin) * h;
    const coord = n => Number(n.toFixed(3));
    const parts = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="ms-plot-title ms-plot-desc"><title id="ms-plot-title">${escape(result.title)}</title><desc id="ms-plot-desc">${result.plots.length} 條曲線，${result.points.length} 個點；x 範圍 ${number(v.xmin)} 至 ${number(v.xmax)}，y 範圍 ${number(v.ymin)} 至 ${number(v.ymax)}。圖形為有限取樣。</desc><rect width="100%" height="100%" fill="#fcfcf8"/><defs><clipPath id="ms-clip"><rect x="${pad}" y="${pad}" width="${w}" height="${h}"/></clipPath></defs>`];
    function ticks(min, max, pixels) {
      const rough = (max - min) / Math.max(2, Math.floor(pixels / 95)), magnitude = 10 ** Math.floor(Math.log10(rough));
      const step = [1, 2, 5, 10].find(n => n * magnitude >= rough) * magnitude;
      const list = []; for (let i = Math.ceil(min / step); i <= Math.floor(max / step) && list.length < 24; i++) list.push(i * step);
      return list;
    }
    for (const n of ticks(v.xmin, v.xmax, w)) parts.push(`<path d="M${coord(x(n))},${pad}V${height - pad}" stroke="${n === 0 ? '#94a9a1' : '#e6ece7'}"/><text x="${coord(x(n))}" y="${height - 14}" text-anchor="middle" fill="#667a73" font-size="12">${number(n)}</text>`);
    for (const n of ticks(v.ymin, v.ymax, h)) parts.push(`<path d="M${pad},${coord(y(n))}H${width - pad}" stroke="${n === 0 ? '#94a9a1' : '#e6ece7'}"/><text x="${pad - 7}" y="${coord(y(n) + 4)}" text-anchor="end" fill="#667a73" font-size="12">${number(n)}</text>`);
    parts.push(`<rect x="${pad}" y="${pad}" width="${w}" height="${h}" fill="none" stroke="#dce3dc"/><g clip-path="url(#ms-clip)">`);
    for (const plot of result.plots) {
      const d = plot.segments.map(segment => segment.map((p, i) => `${i ? 'L' : 'M'}${coord(x(p[0]))},${coord(y(p[1]))}`).join('')).join('');
      parts.push(`<path d="${d}" fill="none" stroke="${escape(plot.color)}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"><title>${escape(plot.label)}</title></path>`);
    }
    for (const p of result.points) {
      if (p.x < v.xmin || p.x > v.xmax || p.y < v.ymin || p.y > v.ymax) continue;
      const px = x(p.x), py = y(p.y), left = px > width - 160;
      parts.push(`<circle cx="${coord(px)}" cy="${coord(py)}" r="5" fill="${escape(p.color)}" stroke="#fff" stroke-width="2"><title>${escape(p.label)} (${number(p.x)}, ${number(p.y)})</title></circle>`);
      if (p.label) parts.push(`<text x="${coord(px + (left ? -10 : 10))}" y="${coord(py < pad + 20 ? py + 22 : py - 12)}" text-anchor="${left ? 'end' : 'start'}" fill="#324b43" font-size="13" paint-order="stroke" stroke="#fcfcf8" stroke-width="4" stroke-linejoin="round">${escape(p.label.slice(0, 28))}</text>`);
    }
    parts.push('</g></svg>'); return parts.join('');
  }
  function outputs(result) {
    return result.outputs.map(o => {
      if (o.type === 'table') return `<details class="result-table" open><summary>數值表 · 第 ${o.line} 行 · ${o.rows.length} 列</summary><div class="table-scroll"><table><thead><tr><th scope="col">x</th><th scope="col">f(x)</th></tr></thead><tbody>${o.rows.map(row => `<tr><td>${number(row[0])}</td><td>${number(row[1])}</td></tr>`).join('')}</tbody></table></div></details>`;
      const v = o.type === 'assert' ? '通過 ✓' : o.type === 'roots' ? o.values.map(number).join('、') || '未找到零點（有限取樣）' : number(o.value);
      return `<div class="result-value"><span>${escape(o.label)}</span><strong>${escape(v)}</strong>${o.type === 'integral' ? `<small>估計誤差 ${number(o.error)}</small>` : ''}</div>`;
    }).join('');
  }
  function publication(result, source, link) {
    return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(result.title)} · MathScript</title><style>body{max-width:960px;margin:40px auto;padding:0 24px;color:#213c34;background:#f5f3ee;font:16px/1.7 system-ui}svg{width:100%;height:auto}h1{line-height:1.3}a{color:#087f73}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#172d29;color:#e0eee6;padding:24px;border-radius:12px}table{border-collapse:collapse;width:100%}th,td{padding:8px;text-align:right;border-bottom:1px solid #dce3dc}.result-value{display:flex;gap:20px;flex-wrap:wrap;margin:16px 0}.result-value small{color:#63737b}.table-scroll{max-height:440px;overflow:auto}summary{cursor:pointer;padding:12px 0}</style></head><body><p>MATH LAB / MATHSCRIPT ${escape(result.version)}</p><h1>${escape(result.title)}</h1><p>已執行結果的靜態快照 · 參數：${result.parameters.map(p => escape(p.name) + ' = ' + number(p.value)).join('，') || '無'}</p>${svg(result)}<p>${result.plots.map(p => escape(p.label)).join(' · ')}</p>${outputs(result)}${result.warnings.map(w => `<p>${escape(w)}</p>`).join('')}<p><a href="${escape(link)}">開啟 MathScript 編輯器</a></p><details><summary>檢視原始程式</summary><pre>${escape(source)}</pre></details><p>MathScript 的積分與求根為數值近似；圖形採有限取樣。本檔可離線閱讀。</p></body></html>`;
  }
  return { escape, number, svg, outputs, publication };
});
