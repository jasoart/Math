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
  examples.push(
    { id: 'finite-sums', name: '平方和的程式驗證', tag: '加總 · 驗證', source: `title "從加總看平方和"
param count = 10 from 1 to 40 step 1
let actual = sum(n^2,n,1,count)
let formula = count*(count+1)*(2*count+1)/6
print actual label "逐項加總"
print formula label "公式結果"
assert abs(actual-formula)<1e-8 label "兩種方法一致"
view 0,count+1,0,count^2*1.2
scatter x^2 from 1 to count step 1` },
    { id: 'automatic-derivative', name: '函數、導數與切線', tag: '自動微分 · 連鎖律', source: `title "看見瞬間變化率"
param a = 1.5 from 0.5 to 3 step 0.1
param location = 0.5 from -2 to 2 step 0.1
fn wave(u)=sin(a*u)
view -4,4,-4,4
plot wave(x) label "原函數"
plot diff(wave(t),t,x) color "#4f46e5" label "自動微分"
tangent wave(x) at location label "觀察點切線"
print a*cos(a*location) label "連鎖律核對"` },
    { id: 'binomial-distribution', name: '二項分配的機率總和', tag: '組合數 · 散點', source: `title "獨立試驗的成功次數"
param count = 10 from 2 to 20 step 1
param chance = 0.4 from 0.1 to 0.9 step 0.1
fn mass(k)=choose(count,k)*chance^k*(1-chance)^(count-k)
view -1,count+1,0,1
scatter mass(x) from 0 to count step 1
print sum(mass(k),k,0,count) label "機率總和"
assert abs(sum(mass(k),k,0,count)-1)<1e-9 label "總機率為一"
print count*chance label "期望值"` },
    { id: 'arc-length', name: '弧長與微分的組合', tag: '微積分 · 延伸', source: `title "拋物線的弧長"
param upper = 2 from 0.5 to 3 step 0.1
fn curveY(u)=u^2/2
let lengthValue=integrate(sqrt(1+diff(curveY(t),t,u)^2),u,0,upper)
view 0,3.5,0,5
plot curveY(x) label "拋物線"
print lengthValue label "0 到 upper 的弧長 ≈"
print (upper*sqrt(1+upper^2)+ln(upper+sqrt(1+upper^2)))/2 label "反導函數核對"` },
    { id: 'nested-reduction', name: '雙重加總與區域變數', tag: '加總 · 作用域', source: `title "方格上的乘積總和"
param rows = 4 from 1 to 20 step 1
param columns = 5 from 1 to 20 step 1
let total=sum(sum(i*j,j,1,columns),i,1,rows)
print total label "雙重加總"
print rows*(rows+1)*columns*(columns+1)/4 label "分離乘積核對"
view 0,rows+1,0,rows*columns*(columns+1)/2*1.2
scatter sum(x*j,j,1,columns) from 1 to rows step 1` },
    { id: 'taylor-sine', name: '用有限級數逼近正弦', tag: '階乘 · 多項式', source: `title "正弦的 Taylor 近似"
param terms = 4 from 1 to 8 step 1
fn approximation(u)=sum((-1)^n*u^(2*n+1)/factorial(2*n+1),n,0,terms-1)
view -4,4,-2,2
plot sin(x) label "sin(x)"
plot approximation(x) color "#4f46e5" label "有限多項式"
print approximation(1)-sin(1) label "x=1 的誤差"
table approximation(x) from -3 to 3 step 0.5` },
    { id: 'integer-tools', name: '公因數、週期與連乘', tag: '整數 · 組合', source: `title "整數工具箱"
param first = 12 from 1 to 30 step 1
param second = 18 from 1 to 30 step 1
print gcd(first,second) label "最大公因數"
print lcm(first,second) label "最小公倍數"
assert gcd(first,second)*lcm(first,second)==first*second label "正整數恆等式"
print product(k,k,1,6) label "6 階乘"
print choose(10,3) label "十取三"
view -1,31,-1,second+1
scatter mod(x,second) from 0 to 30 step 1` },
    { id: 'integral-function', name: '累積函數與面積', tag: '積分 · 函數', source: `title "從速率到累積量"
param rate = 0.5 from 0.1 to 1 step 0.1
fn velocity(u)=exp(rate*u)
fn accumulated(u)=integrate(velocity(t),t,0,u)
view 0,4,0,60
plot velocity(x) label "速率"
plot accumulated(x) color "#4f46e5" label "累積量"
print accumulated(3) label "三個時間單位的累積"
assert abs(accumulated(3)-(exp(3*rate)-1)/rate)<1e-7 label "反導函數核對"` }
  );
  if (typeof module === 'object' && module.exports) module.exports = examples;
  else root.MathScriptExamples = examples;
})(typeof globalThis !== 'undefined' ? globalThis : this);
