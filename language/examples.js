(function (root) {
  'use strict';
  const examples = [
    { id: 'quadratic', name: '拋物線的移動', tag: '函數 · 參數', source: `# 改變 a、h、k，觀察拋物線的開口與頂點
title "拋物線的移動"
param a = 1 from -3 to 3 step 0.1
param h = 0 from -4 to 4 step 0.1
param k = -2 from -4 to 4 step 0.1
fn f(x) = a * (x - h)^2 + k

view -6, 6, -5, 7
plot f(x) color "#087f73" label "拋物線 f(x)"
point (h, k) label "頂點"
print f(2) label "f(2)"
integral f(x) from 0 to 2
table f(x) from -2 to 2 step 1` },
    { id: 'motion', name: '速度與位移', tag: '物理 · 積分', source: `# 速度對時間的定積分是位移
標題 "從速度圖看位移"
參數 v0 = 2 從 0 到 6 每 0.5
參數 acceleration = 1 從 -2 到 3 每 0.1
函數 velocity(x) = v0 + acceleration * x
視窗 0, 8, -6, 18
繪圖 velocity(x) 顏色 "#087f73" 標籤 "速度 v(t)"
積分 velocity(x) 從 0 到 4
顯示 v0 * 4 + 0.5 * acceleration * 4^2 標籤 "位移公式核對"
表格 velocity(x) 從 0 到 6 每 1` },
    { id: 'wave', name: '李薩如曲線', tag: '參數式 · 波動', source: `title "兩個振動，一條曲線"
param a = 3 from 1 to 6 step 1
param b = 2 from 1 to 6 step 1
param phase = 0.5 from 0 to 2 step 0.05
view -1.5, 1.5, -1.5, 1.5
curve (sin(a*t + phase*pi), sin(b*t)) from 0 to 2*pi color "#6468b0" label "李薩如曲線"
print phase*pi label "相位差（弧度）"` },
    { id: 'sequence', name: '等比數列與收斂', tag: '數列 · 數值表', source: `title "公比如何影響收斂？"
param r = 0.5 from -1.5 to 1.5 step 0.1
fn term(n) = r^n
view 0, 16, -4, 4
# 只畫整數項；連續曲線不等同數列
point (1, term(1)) label "第 1 項"
point (2, term(2))
point (3, term(3))
point (4, term(4))
point (5, term(5))
point (8, term(8))
point (12, term(12))
table term(x) from 1 to 15 step 1
print term(15) label "第 15 項"
print if(abs(r) < 1, 1, 0) label "|r| < 1 時為 1（極限為 0）"` },
    { id: 'piecewise', name: '分段函數與求根', tag: '條件 · 求根', source: `title "分段函數的交會"
param shift = 1 from -2 to 2 step 0.1
fn f(x) = if(x < 0, -x - shift, x^2 - shift)
view -4, 4, -3, 6
plot f(x) color "#087f73" label "分段 f(x)"
plot 0 color "#b7742a" label "x 軸"
roots f(x) from -4 to 4
table f(x) from -3 to 3 step 0.5` }
  ];
  if (typeof module === 'object' && module.exports) module.exports = examples;
  else root.MathScriptExamples = examples;
})(typeof globalThis !== 'undefined' ? globalThis : this);
