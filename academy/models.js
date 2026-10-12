/* 45 mathematical models × 12 reproducible parameter scenarios = 540 learning modules.
 * Each model emits executable MathScript and a structured, inspectable derivation.
 * Scenario variants are explicitly distinguished from independent algorithms. */
(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('../language/mathscript.js') : root.MathScript);
  if (typeof module === 'object' && module.exports) module.exports = api; else root.MathAcademy = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (M) {
  'use strict';
  const topics = ['代數與方程', '函數與模型', '平面幾何', '三角與測量', '向量與矩陣', '數列與級數', '機率與組合', '統計與資料', '微積分'];
  const C = (key, label, min, max, step, value) => ({ key, label, min, max, step, value });
  const S = (key, expression, label, reason) => ({ key, expression, label, reason });
  const models = [];
  function add(id, title, topic, controls, question, signal, shortcut, trap, steps, visual, extension = false) {
    models.push({ id, title, topic: topics[topic], controls, question, signal, shortcut, trap, steps, visual, extension });
  }
  const positive = (key, label, value = 3) => C(key, label, 1, 12, 1, value);
  const signed = (key, label, value = 2) => C(key, label, -8, 8, 1, value);
  const angle = (key = 'theta', label = '角度（度）', value = 60) => C(key, label, 15, 150, 5, value);

  add('linear', '一次方程與等量關係', 0,
    [positive('a', '係數 a', 2), signed('b', '常數 b', 6), signed('c', '右式 c', 8)],
    '解方程 {a}u + ({b}) = {c}，求 u。',
    '看見等號，先保持兩邊做相同運算。', '先移除常數，再除以非零係數。', '移項要改變符號；此模型 a > 0，除法才有唯一解。',
    [S('rhs', 'c-b', '扣除常數後的右式', '等號兩側同減 b，得到 a·u=c−b。'), S('answer', 'rhs/a', 'u', 'a 非零，等號兩側同除以 a。')],
    ['view -15,15,-25,25', 'plot a*x+b label "左式"', 'plot c label "右式"', 'point (answer,c) label "交點"']);
  add('vieta', '根與係數逆推', 0,
    [signed('r', '第一根 r', -2), signed('s', '第二根 s', 3), positive('a', '首項係數 a', 1)],
    '二次式 {a}(u−({r}))(u−({s})) 的一次項係數是多少？',
    '看到已知根，直接使用因式與根的和。', '一次項只需取兩個交叉乘積。', '一次項係數有負號，也要乘上首項係數 a。重根仍可使用。',
    [S('rootSum', 'r+s', '兩根和', '展開 (u−r)(u−s) 的一次項為 −(r+s)u。'), S('constant', 'a*r*s', '常數項', '常數項為 a·r·s。'), S('answer', '-a*rootSum', '一次項係數', '乘回首項係數，得到 −a(r+s)。')],
    ['view -10,10,-30,70', 'plot a*(x-r)*(x-s) label "因式形式"', 'point (r,0) label "r"', 'point (s,0) label "s"']);
  add('vertex', '配方法與最小值', 0,
    [positive('a', '開口係數 a', 2), signed('h', '對稱軸 h', 1), signed('k', '垂直位移 k', -3)],
    '求 {a}(u−({h}))² + ({k}) 在實數上的最小值。',
    '看到極值與平方，先檢查開口方向。', '非負平方項的最小值是零。', '最小值是 k；取得最小值的位置才是 h。此模型限 a > 0。',
    [S('position', 'h', '取得最小值的位置', '(u−h)²=0 當且僅當 u=h。'), S('answer', 'k', '最小值', 'a>0，所以 a(u−h)²≥0，函數值至少為 k。')],
    ['view h-5,h+5,k-2,k+30', 'plot a*(x-h)^2+k label "頂點式"', 'point (h,k) label "最小值"']);
  add('remainder', '餘式定理與代入', 0,
    [signed('a', '三次項係數 a', 2), signed('b', '二次項係數 b', -1), signed('c', '常數 c', 3), C('r', '除式 u−r 的 r', -3, 3, 1, 2)],
    'P(u)={a}u³+({b})u²+({c}) 除以 u−({r}) 的餘式是多少？',
    '除式是一個一次因式，使用餘式定理。', '餘式等於 P(r)，不必長除法。', '除式若是 u+r，代入點是 −r；本模型明確寫成 u−r。',
    [S('cubic', 'a*r^3', '三次項代入', '以 r 代入多項式的每個 u。'), S('quadratic', 'b*r^2', '二次項代入', '平方項與三次項的正負要分開計算。'), S('answer', 'cubic+quadratic+c', '餘式', '由 P(u)=(u−r)Q(u)+R，令 u=r 得 R=P(r)。')],
    ['view -4,4,-100,100', 'plot a*x^3+b*x^2+c label "P(x)"', 'point (r,answer) label "餘式"']);
  add('system', '二元一次聯立與行列式', 0,
    [positive('a', 'a', 2), positive('b', 'b', 3), signed('u', '第一右式 u', 5), signed('v', '第二右式 v', 1)],
    '解 {a}X+{b}Y={u}、−{b}X+{a}Y={v}，求 X。',
    '係數呈旋轉伸縮結構，行列式一定為正。', '第一式乘 a，第二式乘 −b，再相加消去 Y。', '第二式 X 係數為 −b；行列式是 a²+b²，不是 a²−b²。',
    [S('determinant', 'a^2+b^2', '行列式', 'a,b>0，所以 a²+b²>0，解唯一。'), S('ordinate', '(b*u+a*v)/determinant', 'Y', '消去 X 可得 (a²+b²)Y=bu+av。'), S('answer', '(a*u-b*v)/determinant', 'X', '消去 Y 可得 (a²+b²)X=au−bv。')],
    ['view -10,10,-10,10', 'plot (u-a*x)/b label "第一式"', 'plot (v+b*x)/a label "第二式"', 'point (answer,ordinate) label "唯一解"']);

  add('exponential', '指數成長與倍增', 1,
    [positive('initial', '初始量', 3), C('base', '成長倍率', 1.1, 2, .1, 1.5), C('time', '期數', 1, 8, 1, 4)],
    '初始量 {initial}，每期變成原來的 {base} 倍，{time} 期後是多少？',
    '固定倍率表示指數成長，固定增加量才是線性成長。', '每期乘相同倍率，直接寫成初始量乘倍率的次方。', '成長 20% 對應倍率 1.2，不是 0.2；期數從零開始。',
    [S('multiplier', 'base^time', '累積倍率', 'time 次相乘得到 base^time。'), S('answer', 'initial*multiplier', '期末數量', '將累積倍率乘上初始量。')],
    ['view 0,time+1,0,initial*base^(time+1)*1.15', 'plot initial*base^x label "成長模型"', 'point (time,answer) label "期末"']);
  add('logarithm', '對數與反函數', 1,
    [C('base', '對數底數', 2, 9, 1, 2), C('value', '真數', 1, 64, 1, 8)],
    '求 log_{base}({value}) 的數值。',
    '對數問的是：底數需要幾次方才能得到真數？', '換底公式 log_b(v)=ln(v)/ln(b)。', '底數要正且不等於 1，真數必須正。本模型底數至少為 2。',
    [S('numerator', 'ln(value)', '真數的自然對數', '以自然對數表示指數關係。'), S('answer', 'numerator/ln(base)', '對數值', 'ln(base^u)=u ln(base)，因此 u=ln(value)/ln(base)。')],
    ['view 0,66,-2,7', 'plot ln(x)/ln(base) label "對數函數"', 'point (value,answer) label "觀察點"']);
  add('rational', '反比例平移與漸近線', 1,
    [signed('k', '倍率 k', 3), signed('h', '水平位移 h', 1), signed('v', '垂直位移 v', 2), positive('delta', '距離漸近線 δ', 2)],
    'f(u)={k}/(u−({h}))+({v})，求 f({h}+{delta})。',
    '先將輸入改成「距離垂直漸近線多少」。', '在 u=h+δ 時，分母直接等於 δ。', 'u=h 不在定義域；k=0 時是帶洞的常數函數，不具有垂直漸近線。',
    [S('position', 'h+delta', '代入位置', '輸入位於 h 的右方 δ。'), S('answer', 'k/delta+v', '函數值', '分母 (h+δ)−h=δ，且本模型 δ>0。')],
    ['view h-8,h+14,v-12,v+12', 'plot k/(x-h)+v label "反比例平移"', 'plot v label "水平參考"', 'point (position,answer) label "代入點"']);
  add('absolute', '絕對值與距離模型', 1,
    [positive('a', '倍率 a', 2), signed('h', '中心 h', 1), signed('k', '偏移 k', -2), signed('u', '輸入 u', -3)],
    '求 {a}|{u}−({h})|+({k})。',
    '絕對值先轉譯成數線上兩點的距離。', '先算距離，再伸縮與平移。', '不能將 |u−h| 改成 |u|−|h|；尖點處通常不可微。',
    [S('distance', 'abs(u-h)', '與中心的距離', '距離必為非負值。'), S('answer', 'a*distance+k', '函數值', '距離乘 a，再加上垂直位移 k。')],
    ['view -10,10,k-2,k+18*a', 'plot a*abs(x-h)+k label "距離函數"', 'point (u,answer) label "輸入點"']);
  add('composition', '合成函數的運算順序', 1,
    [positive('a', '外層倍率 a', 2), signed('b', '內層倍率 b', 3), signed('c', '內層平移 c', -1), C('u', '輸入 u', -3, 3, .5, 2)],
    'g(u)={b}u+({c})，f(v)={a}v²，求 f(g({u}))。',
    '先處理括號內的函數，再把結果交給外層。', '畫出 u → g(u) → f(g(u)) 的代入順序。', 'f(g(u)) 與 g(f(u)) 一般不同，不能交換順序。',
    [S('inner', 'b*u+c', '內層 g(u)', '先計算一次函數的輸出。'), S('answer', 'a*inner^2', '合成函數值', '把 inner 當成外層的整個輸入，再平方與乘 a。')],
    ['view -4,4,-5,a*(4*abs(b)+abs(c))^2+5', 'plot a*(b*x+c)^2 label "f(g(x))"', 'point (u,answer) label "合成值"']);

  add('distance', '兩點距離與畢氏定理', 2,
    [signed('u', 'A 的橫座標', 1), signed('v', 'A 的縱座標', 2), positive('dx', '水平差 Δx', 3), positive('dy', '垂直差 Δy', 4)],
    'A=({u},{v})、B=({u}+{dx},{v}+{dy})，求 AB 長度。',
    '座標差就是直角三角形的兩條直角邊。', '平移不改變距離，只需算差值。', '距離要開根號，平方距離與距離的單位不同。',
    [S('squared', 'dx^2+dy^2', '距離平方', '以畢氏定理加總兩個座標差的平方。'), S('answer', 'sqrt(squared)', 'AB 長度', '取非負平方根才是長度。')],
    ['view u-2,u+dx+2,v-2,v+dy+2', 'curve (u+dx*t,v+dy*t) from 0 to 1 label "線段 AB"', 'point (u,v) label "A"', 'point (u+dx,v+dy) label "B"']);
  add('section', '內分點與加權平均', 2,
    [signed('a', 'A 的橫座標', -3), signed('b', 'B 的橫座標', 5), positive('m', 'AP 比例 m', 2), positive('n', 'PB 比例 n', 3)],
    'A=({a},0)、B=({b},0)，P 內分 AB 且 AP:PB={m}:{n}，求 P 的橫座標。',
    '比例先轉成從 A 走向 B 的路程比例。', 'P=A+[m/(m+n)](B−A)。', '靠近 A 時 A 的權重較大；內分與外分公式不可混用。',
    [S('fraction', 'm/(m+n)', '從 A 前進的比例', '整段分成 m+n 份，AP 占 m 份。'), S('answer', 'a+fraction*(b-a)', 'P 的橫座標', '從 A 加上 AB 位移的 fraction 倍。')],
    ['view -10,10,-3,3', 'curve (a+(b-a)*t,0) from 0 to 1 label "AB"', 'point (a,0) label "A"', 'point (b,0) label "B"', 'point (answer,0) label "P"']);
  add('line-distance', '點到直線的距離', 2,
    [positive('a', '直線係數 a', 3), positive('b', '直線係數 b', 4), signed('c', '常數 c', -5), signed('u', '點的橫座標 u', 2), signed('v', '點的縱座標 v', 1)],
    '求點 ({u},{v}) 到直線 {a}X+{b}Y+({c})=0 的距離。',
    '直線法向量為 (a,b)，距離是法向量方向的投影量。', '代入直線式後取絕對值，再除以法向量長度。', '分子要取絕對值；直線式整體乘常數不會改變距離。',
    [S('residual', 'a*u+b*v+c', '代入直線式', '代入點座標得有向的法向偏移量。'), S('norm', 'sqrt(a^2+b^2)', '法向量長度', '法向量 (a,b) 非零。'), S('answer', 'abs(residual)/norm', '垂直距離', '將偏移量除以法向量長度，並取非負值。')],
    ['view -12,12,-12,12', 'plot (-a*x-c)/b label "直線"', 'point (u,v) label "P"', 'curve (u-t*a*residual/(a^2+b^2),v-t*b*residual/(a^2+b^2)) from 0 to 1 label "垂線段"']);
  add('chord', '圓的弦長與圓心距', 2,
    [positive('radius', '半徑 r', 5), C('ratio', '圓心距 / 半徑', 0, .9, .1, .6)],
    '圓半徑 {radius}，弦到圓心的距離為半徑的 {ratio} 倍，求弦長。',
    '圓心到弦的垂線平分弦。', '半弦、圓心距與半徑組成直角三角形。', '畢氏定理求得的是半弦，要再乘 2；圓心距不能大於半徑。',
    [S('distance', 'radius*ratio', '圓心距', '由給定比例計算實際距離。'), S('halfChord', 'sqrt(radius^2-distance^2)', '半弦長', '半弦²+圓心距²=半徑²。'), S('answer', '2*halfChord', '弦長', '垂線平分弦，因此乘回 2。')],
    ['view -radius*1.3,radius*1.3,-radius*1.3,radius*1.3', 'curve (radius*cos(t),radius*sin(t)) from 0 to 2*pi label "圓"', 'curve (-halfChord+2*halfChord*t,distance) from 0 to 1 label "弦"']);
  add('ellipse', '橢圓焦距與離心率', 2,
    [C('major', '半長軸 a', 2, 12, 1, 5), C('ratio', '半短軸 / 半長軸', .2, 1, .1, .6)],
    '橢圓半長軸為 {major}，半短軸為半長軸的 {ratio} 倍，求離心率。',
    '先分清半軸長與整條軸長。', '由 c²=a²−b²，再取 e=c/a。', '離心率是無單位比值；b=a 時退化為圓，e=0。',
    [S('minor', 'major*ratio', '半短軸 b', '短軸比例不超過 1，所以 b≤a。'), S('focal', 'sqrt(major^2-minor^2)', '中心到焦點 c', '橢圓關係為 c²=a²−b²。'), S('answer', 'focal/major', '離心率 e', '以半長軸標準化焦距，得到 0≤e<1。')],
    ['view -major*1.3,major*1.3,-major*1.3,major*1.3', 'curve (major*cos(t),minor*sin(t)) from 0 to 2*pi label "橢圓"', 'point (focal,0) label "焦點"', 'point (-focal,0) label "焦點"']);

  add('cosine-law', '餘弦定理求第三邊', 3,
    [positive('b', '邊 b', 5), positive('c', '邊 c', 7), angle()],
    '兩邊 {b}、{c} 的夾角為 {theta}°，求對邊長度。',
    '已知兩邊夾角，直接使用餘弦定理。', '平方距離等於 b²+c²−2bc cos θ。', '必須是這兩邊的夾角；程式三角函數使用弧度。',
    [S('radian', 'theta*pi/180', '夾角弧度', '角度乘 π/180 轉成弧度。'), S('squared', 'b^2+c^2-2*b*c*cos(radian)', '對邊平方', '由內積或餘弦定理得到第三邊平方。'), S('answer', 'sqrt(squared)', '對邊長', '邊長取非負平方根。')],
    ['view -c-2,b+c+2,-2,c+2', 'curve (b*(1-t)+c*cos(radian)*t,c*sin(radian)*t) from 0 to 1 label "第三邊"', 'curve (b*t,0) from 0 to 1', 'curve (c*cos(radian)*t,c*sin(radian)*t) from 0 to 1']);
  add('sine-law', '正弦定理的對應關係', 3,
    [positive('a', '已知邊 a', 5), C('alpha', '對角 A（度）', 15, 60, 5, 30), C('beta', '目標角 B（度）', 20, 70, 5, 45)],
    'a={a}、A={alpha}°、B={beta}°，求角 B 的對邊 b。',
    '邊與其對角必須成對出現。', 'b/a=sin B/sin A。', '這裡已知兩角與一邊，沒有 SSA 雙解；第三角需為正。',
    [S('third', '180-alpha-beta', '第三角（度）', '三角形內角和為 180°，本模型保證第三角大於零。'), S('scale', 'a/sin(alpha*pi/180)', '共同正弦比例', '由 a/sin A=b/sin B。'), S('answer', 'scale*sin(beta*pi/180)', '邊 b', '共同正弦比例乘 sin B 得所求邊。')],
    ['view 0,180,0,scale*1.15', 'plot scale*sin(x*pi/180) label "對角與對邊"', 'point (alpha,a) label "已知"', 'point (beta,answer) label "目標"']);
  add('triangle-area', '兩邊夾角求面積', 3,
    [positive('b', '底邊 b', 6), positive('c', '鄰邊 c', 4), angle()],
    '兩邊 {b}、{c} 夾角 {theta}°，求三角形面積。',
    '面積先找底與垂直高度。', '高度是 c sin θ，所以面積是 bc sin θ/2。', '鈍角的正弦仍為正；不要把 cos θ 當高度比例。',
    [S('height', 'c*sin(theta*pi/180)', '高度', '垂直投影給出高度 c sin θ。'), S('answer', 'b*height/2', '面積', '三角形面積為底乘高的一半。')],
    ['view -c-2,b+c+2,-2,c+2', 'curve (b*t,0) from 0 to 1', 'curve (c*cos(theta*pi/180)*t,height*t) from 0 to 1', 'curve (b+(c*cos(theta*pi/180)-b)*t,height*t) from 0 to 1']);
  add('phasor', '正弦餘弦合成振幅', 3,
    [signed('a', 'sin 係數 a', 3), signed('b', 'cos 係數 b', 4)],
    '求 {a} sin u + ({b}) cos u 的最大值。',
    '同頻率正弦與餘弦可視為向量的投影。', '由柯西不等式，上界是 √(a²+b²)，且可取等。', 'a=b=0 時函數恆為零，振幅為零且相位不唯一。',
    [S('squared', 'a^2+b^2', '振幅平方', '(a,b) 與單位向量 (sin u,cos u) 內積。'), S('answer', 'sqrt(squared)', '最大值', '非零向量可取同向單位向量達上界；零向量時結果為零。')],
    ['view -pi,pi,-answer-1,answer+1', 'plot a*sin(x)+b*cos(x) label "合成波"', 'plot answer label "上界"']);
  add('height', '仰角與高度測量', 3,
    [C('distance', '水平距離', 2, 30, 1, 12), C('theta', '仰角（度）', 10, 70, 5, 30), C('eye', '觀測高度', 0, 3, .1, 1.5)],
    '水平距離 {distance}、仰角 {theta}°、觀測高度 {eye}，求物體高度。',
    '先建立與地面垂直的直角三角形。', '相對高度是水平距離乘 tan θ。', '必須使用水平距離，並把觀測者眼睛高度加回。',
    [S('rise', 'distance*tan(theta*pi/180)', '相對觀測點高度', 'tan θ=對邊/鄰邊。'), S('answer', 'rise+eye', '物體高度', '加回觀測點距地面的高度。')],
    ['view -2,distance+2,0,answer+3', 'curve (distance*t,eye+rise*t) from 0 to 1 label "視線"', 'curve (distance,answer*t) from 0 to 1 label "物體"', 'point (0,eye) label "觀測點"']);

  add('dot', '平面向量內積', 4,
    [signed('a', 'u₁', 3), signed('b', 'u₂', 1), signed('c', 'v₁', 2), signed('d', 'v₂', -4)],
    '向量 u=({a},{b})、v=({c},{d})，求 u·v。',
    '內積把兩個向量轉成一個純量。', '逐項相乘再相加，也可視為長度與投影相乘。', '內積不是向量，也不是逐項相乘形成的新向量；零向量不能定義夾角。',
    [S('horizontal', 'a*c', '第一分量乘積', '對應橫座標相乘。'), S('vertical', 'b*d', '第二分量乘積', '對應縱座標相乘。'), S('answer', 'horizontal+vertical', '內積', '將對應分量的乘積相加。')],
    ['view -10,10,-10,10', 'curve (a*t,b*t) from 0 to 1 label "u"', 'curve (c*t,d*t) from 0 to 1 label "v"']);
  add('projection', '向量正射影長', 4,
    [signed('a', 'u₁', 4), signed('b', 'u₂', 2), positive('c', 'v₁', 3), signed('d', 'v₂', 1)],
    'u=({a},{b})、v=({c},{d})，求 u 在 v 方向的有向投影長。',
    '投影長先將方向向量標準化。', '有向投影長=(u·v)/|v|。', '有向投影長可能為負；投影向量則需再乘 v/|v|。',
    [S('dotValue', 'a*c+b*d', '內積', '內積等於 |v| 乘以所求有向長。'), S('norm', 'sqrt(c^2+d^2)', '方向向量長', 'c≥1 保證 v 非零。'), S('answer', 'dotValue/norm', '有向投影長', '除以 |v|，保留投影方向的正負。')],
    ['view -12,12,-12,12', 'curve (a*t,b*t) from 0 to 1 label "u"', 'curve (c*t,d*t) from 0 to 1 label "v"', 'point (dotValue*c/norm^2,dotValue*d/norm^2) label "正射影"']);
  add('cross', '空間外積與三角形面積', 4,
    [positive('a', 'u 的 x 分量', 3), signed('b', 'u 的 z 分量', 2), positive('c', 'v 的 y 分量', 4), signed('d', 'v 的 z 分量', 1)],
    'u=({a},0,{b})、v=(0,{c},{d})，求兩向量張成三角形的面積。',
    '面積優先聯想到外積的長度。', '先求 u×v，再取長度的一半。', '外積本身是向量；其長度是平行四邊形面積，三角形須再除 2。',
    [S('cx', '-b*c', '外積 x 分量', '0·d−b·c。'), S('cy', '-a*d', '外積 y 分量', 'b·0−a·d；注意第二分量符號。'), S('cz', 'a*c', '外積 z 分量', 'a·c−0·0。'), S('answer', 'sqrt(cx^2+cy^2+cz^2)/2', '三角形面積', '三維外積長度的一半。')],
    ['view 0,4,min(0,min(cx,cy))-5,max(1,cz)+5', 'point (1,cx) label "外積 x"', 'point (2,cy) label "外積 y"', 'point (3,cz) label "外積 z"'], true);
  add('rotation', '旋轉矩陣與長度不變', 4,
    [signed('u', '原橫座標', 3), signed('v', '原縱座標', 2), C('theta', '逆時針旋轉（度）', -180, 180, 15, 60)],
    '將向量 ({u},{v}) 逆時針旋轉 {theta}°，求新橫座標。',
    '先辨認矩陣代表旋轉，而不是任意展開乘法。', 'x′=u cos θ−v sin θ。', '旋轉方向與 sin 項的符號相連；角度單位不可混用。',
    [S('radian', 'theta*pi/180', '旋轉弧度', '角度先轉成弧度。'), S('ordinate', 'u*sin(radian)+v*cos(radian)', '新縱座標', '旋轉矩陣的第二列內積。'), S('answer', 'u*cos(radian)-v*sin(radian)', '新橫座標', '旋轉矩陣的第一列內積；旋轉保持原點距離。')],
    ['view -13,13,-13,13', 'curve (u*t,v*t) from 0 to 1 label "旋轉前"', 'curve (answer*t,ordinate*t) from 0 to 1 label "旋轉後"']);
  add('determinant', '行列式與面積倍率', 4,
    [signed('a', '矩陣 a', 2), signed('b', '矩陣 b', 1), signed('c', '矩陣 c', -1), signed('d', '矩陣 d', 3)],
    '矩陣 [[{a},{b}],[{c},{d}]] 將單位正方形變換後，面積是多少？',
    '二階行列式給有向面積倍率。', '取 |ad−bc| 即得實際面積倍率。', '行列式為負表示方向翻轉，面積仍非負；為零則壓成線或點。',
    [S('oriented', 'a*d-b*c', '有向面積倍率', '兩個欄向量 (a,c)、(b,d) 的行列式。'), S('answer', 'abs(oriented)', '面積', '原正方形面積為 1，所以像的面積為 |det|。')],
    ['view -18,18,-18,18', 'curve (a*t,c*t) from 0 to 1', 'curve (a+b*t,c+d*t) from 0 to 1', 'curve (b+a*t,d+c*t) from 0 to 1', 'curve (b*t,d*t) from 0 to 1']);

  add('arithmetic-term', '等差數列第 n 項', 5,
    [signed('first', '首項', 2), signed('difference', '公差', 3), C('count', '項數 n', 2, 20, 1, 8)],
    '首項 {first}、公差 {difference}，求第 {count} 項。',
    '相鄰項固定增加量就是等差數列。', '從第一項到第 n 項只走 n−1 步。', '首項是 a₁；不要多加一次公差。',
    [S('increase', '(count-1)*difference', '總增加量', 'n−1 次相同增量。'), S('answer', 'first+increase', '第 n 項', '首項加上 n−1 個公差。')],
    ['view 0,count+1,min(first,answer)-5,max(first,answer)+5', 'scatter first+(x-1)*difference from 1 to count step 1', 'point (1,first) label "首項"', 'point (count,answer) label "末項"']);
  add('arithmetic-sum', '等差級數與首尾配對', 5,
    [signed('first', '首項', 3), signed('difference', '公差', 2), C('count', '項數 n', 2, 20, 1, 10)],
    '首項 {first}、公差 {difference}，求前 {count} 項和。',
    '首尾配對的和相等，可用平均項值乘項數。', 'Sₙ=n(a₁+aₙ)/2。', '項數為奇數仍可用公式；平均值乘項數不需要硬湊成整數對。',
    [S('last', 'first+(count-1)*difference', '末項', '先算第 n 項。'), S('average', '(first+last)/2', '平均項值', '等差數列的平均值等於首末項平均。'), S('answer', 'count*average', '前 n 項和', '項數乘平均項值。')],
    ['view 0,count+1,min(0,answer)-10,max(0,answer)+10', 'scatter sum(first+(j-1)*difference,j,1,x) from 1 to count step 1', 'point (count,answer) label "總和"']);
  add('geometric-sum', '等比級數與倍率抵消', 5,
    [positive('first', '首項', 2), C('ratio', '公比', .2, 1.8, .1, .5), C('count', '項數 n', 2, 12, 1, 6)],
    '首項 {first}、公比 {ratio}，求前 {count} 項和。',
    '等式乘公比後相減，會消去中間項。', 'r≠1 用 a₁(1−rⁿ)/(1−r)；r=1 直接算 na₁。', '公比為 1 時不能除以 1−r；有限和不需要 |r|<1。',
    [S('last', 'first*ratio^(count-1)', '末項', '從首項起乘 n−1 次公比。'), S('answer', 'sum(first*ratio^(j-1),j,1,count)', '前 n 項和', '逐項加總，公比為 1 也有效；可用級數公式交叉核對。')],
    ['view 0,count+1,0,max(first,last)*1.2+1', 'scatter first*ratio^(x-1) from 1 to count step 1', 'point (count,last) label "末項"']);
  add('telescoping', '裂項相消級數', 5,
    [C('count', '項數 n', 2, 40, 1, 10), positive('scale', '倍率', 3)],
    '計算 Σₖ₌₁^{count} {scale}/[k(k+1)]。',
    '相鄰線性因式提示部分分式與相消。', '1/[k(k+1)]=1/k−1/(k+1)。', '相消後仍有首項與最後的負項；不要把最後一項漏掉。',
    [S('boundary', '1-1/(count+1)', '相消後的邊界項', '中間各項消去，僅剩 1−1/(n+1)。'), S('answer', 'scale*boundary', '級數和', '乘回共同倍率。')],
    ['view 0,count+1,0,scale*1.2', 'scatter scale*(1-1/(x+1)) from 1 to count step 1', 'point (count,answer) label "部分和"']);
  add('compound', '複利與定期累積', 5,
    [C('principal', '初始點數', 10, 100, 5, 50), C('rate', '每期增加比例', .01, .12, .01, .05), C('count', '期數', 1, 20, 1, 10)],
    '點數初值 {principal}，每期增加當期的 {rate} 倍，{count} 期後有多少點？',
    '新增量會加入下一期的基數，形成等比變化。', '期末點數=初值×(1+r)ⁿ。', '每期增加比例 r 與倍率 1+r 不同；此處是固定比例的數學模型。',
    [S('factor', '(1+rate)^count', '累積倍率', '每一期都乘上 1+r。'), S('answer', 'principal*factor', '期末點數', '初始點數乘上累積倍率。')],
    ['view 0,count+1,0,principal*(1+rate)^(count+1)*1.15', 'plot principal*(1+rate)^x label "累積模型"', 'point (count,answer) label "期末"']);

  add('combination', '組合數與不計順序選取', 6,
    [C('count', '物件數 n', 6, 20, 1, 10), C('pick', '選取數 k', 1, 5, 1, 3)],
    '從 {count} 個相異物件選出 {pick} 個，不計順序，有多少種？',
    '「選出一組」通常不計順序。', '先排 k 個，再除以每組內部 k! 種順序。', '若角色或位置不同，便可能要計順序；本模型明確不計順序。',
    [S('orders', 'factorial(pick)', '每組內部排列數', 'k 個相異物件可以排列 k! 種。'), S('answer', 'choose(count,pick)', '組合數', 'C(n,k)=n!/[k!(n−k)!]。')],
    ['view 0,6,0,choose(count,5)*1.15+1', 'scatter choose(count,x) from 0 to 5 step 1', 'point (pick,answer) label "所求選法"']);
  add('binomial', '二項分配單點機率', 6,
    [C('count', '獨立試驗次數 n', 6, 16, 1, 10), C('prob', '成功機率 p', .1, .9, .1, .5), C('hits', '成功次數 k', 0, 5, 1, 3)],
    '{count} 次獨立試驗，每次成功率 {prob}，恰好成功 {hits} 次的機率？',
    '獨立、固定次數、相同成功率，對應二項分配。', '指定一種成敗序列，再乘成功位置的選法。', '「恰好」與「至少」不同；此處不把尾端機率相加。',
    [S('ways', 'choose(count,hits)', '成功位置的選法', '從 n 次中選 k 次成功。'), S('onePattern', 'prob^hits*(1-prob)^(count-hits)', '一種指定序列的機率', '獨立性讓各次機率相乘。'), S('answer', 'ways*onePattern', '恰好 k 次成功的機率', '所有等機率序列數乘單一序列機率。')],
    ['view -1,count+1,0,1', 'scatter choose(count,x)*prob^x*(1-prob)^(count-x) from 0 to count step 1', 'point (hits,answer) label "單點機率"']);
  add('hypergeometric', '不放回抽樣與組合', 6,
    [C('red', '紅球數', 4, 12, 1, 6), C('blue', '藍球數', 4, 12, 1, 5), C('draws', '抽取數', 2, 4, 1, 3)],
    '{red} 顆紅球、{blue} 顆藍球中不放回抽 {draws} 顆，恰好一顆紅球的機率？',
    '不放回會改變後續機率，可以直接數整組選法。', '有利選法為 C(紅,1)C(藍,抽取數−1)。', '不放回抽樣不是獨立試驗，不能直接套二項分配。',
    [S('favorable', 'red*choose(blue,draws-1)', '有利選法', '選 1 顆紅球，再選剩餘的藍球。'), S('total', 'choose(red+blue,draws)', '所有選法', '每一組相同大小的球集合等可能。'), S('answer', 'favorable/total', '所求機率', '有利選法除以全部選法。')],
    ['view 0,draws+1,0,1', 'scatter choose(red,x)*choose(blue,draws-x)/total from 0 to draws step 1', 'point (1,answer) label "一顆紅球"']);
  add('bayes', '條件機率與貝氏更新', 6,
    [C('prior', 'A 的機率', .1, .8, .1, .3), C('hit', 'P(B|A)', .5, .9, .1, .8), C('falseRate', 'P(B|非A)', .1, .4, .1, .2)],
    'P(A)={prior}、P(B|A)={hit}、P(B|非A)={falseRate}，求 P(A|B)。',
    '看到條件反轉，先以全機率計算分母。', 'P(A|B)=P(A∩B)/P(B)。', 'P(B|A) 不等於 P(A|B)；必須納入 A 原本的比例。',
    [S('joint', 'prior*hit', 'A 與 B 同時發生', '乘法公式 P(A∩B)=P(A)P(B|A)。'), S('evidence', 'joint+(1-prior)*falseRate', 'B 的總機率', '將 A 與非 A 兩種互斥來源加總。'), S('answer', 'joint/evidence', 'P(A|B)', '在所有 B 事件中，取來自 A 的比例。')],
    ['view 0,4,0,1', 'point (1,prior) label "事前"', 'point (2,evidence) label "P(B)"', 'point (3,answer) label "事後"']);
  add('expectation', '期望值的加權平均', 6,
    [signed('win', '成功時得分', 6), signed('loss', '失敗時得分', -2), C('prob', '成功機率', .1, .9, .1, .4)],
    '成功機率 {prob}，成功得 {win} 分、失敗得 {loss} 分，單次期望得分？',
    '期望值是各結果乘機率後的總和。', 'E=loss+p(win−loss)。', '期望值不一定是單次可能出現的結果，也不是成功時的得分。',
    [S('successPart', 'prob*win', '成功貢獻', '成功得分乘以成功機率。'), S('failurePart', '(1-prob)*loss', '失敗貢獻', '失敗機率為 1−p。'), S('answer', 'successPart+failurePart', '期望得分', '互斥且完整的兩種結果加權相加。')],
    ['view -1,2,min(win,loss)-2,max(win,loss)+2', 'point (0,loss) label "失敗得分"', 'point (1,win) label "成功得分"', 'plot answer label "期望值"']);

  add('mean', '等權資料平均數', 7,
    [signed('a', '第一筆', 2), signed('b', '第二筆', 4), signed('c', '第三筆', 6), signed('d', '第四筆', 8)],
    '資料 {a}、{b}、{c}、{d} 的算術平均數是多少？',
    '每筆資料權重相同，先加總再除以筆數。', '以共同基準平移後計算也能得到相同平均。', '要除以資料筆數，不是不同數值的個數。',
    [S('total', 'a+b+c+d', '資料總和', '每筆資料都計入一次，即使數值重複。'), S('answer', 'total/4', '平均數', '四筆資料共享總和。')],
    ['view 0,5,-10,10', 'point (1,a)', 'point (2,b)', 'point (3,c)', 'point (4,d)', 'plot answer label "平均"']);
  add('variance', '母體變異數與離差', 7,
    [signed('center', '中心值', 2), C('left', '第一組偏移', 1, 8, 1, 3), C('right', '第二組偏移', 1, 8, 1, 5)],
    '四筆資料為 {center}±{left}、{center}±{right}，求母體變異數。',
    '對稱資料先找中心，再看離差平方。', '平均就是中心，變異數為 (left²+right²)/2。', '母體變異數除以 4；樣本不偏變異數則除以 3，兩者不同。',
    [S('meanValue', 'center', '平均數', '成對的正負偏移互相抵消。'), S('squaredTotal', '2*left^2+2*right^2', '離差平方和', '兩種偏移各出現正負兩次。'), S('answer', 'squaredTotal/4', '母體變異數', '離差平方和除以母體資料筆數 4。')],
    ['view 0,5,center-max(left,right)-2,center+max(left,right)+2', 'point (1,center-left)', 'point (2,center+left)', 'point (3,center-right)', 'point (4,center+right)', 'plot center label "平均"']);
  add('weighted-mean', '加權平均與份量', 7,
    [signed('a', '第一組平均', 3), signed('b', '第二組平均', 7), positive('m', '第一組人數', 4), positive('n', '第二組人數', 6)],
    '兩組平均為 {a}、{b}，人數為 {m}、{n}，合併後平均是多少？',
    '群體大小不同時，平均必須依人數加權。', '先由平均還原總和，再合併除以總人數。', '只有兩組人數相同，才能直接平均兩個平均數。',
    [S('total', 'a*m+b*n', '合併總和', '每組平均乘人數得到該組資料總和。'), S('answer', 'total/(m+n)', '合併平均', '總和除以總人數。')],
    ['view 0,4,min(a,b)-2,max(a,b)+2', 'point (1,a) label "第一組"', 'point (2,b) label "第二組"', 'point (3,answer) label "合併"']);
  add('z-score', '標準分數與尺度', 7,
    [C('meanValue', '平均 μ', 30, 80, 5, 60), C('sigma', '標準差 σ', 2, 15, 1, 8), C('value', '觀察值', 10, 100, 5, 75)],
    '平均 {meanValue}、標準差 {sigma}，觀察值 {value} 的 z 分數？',
    '標準化先平移到平均為零，再用標準差作單位。', 'z=(value−μ)/σ。', '標準差不是變異數；z 分數可為負，且不一定對應常態分配。',
    [S('deviation', 'value-meanValue', '離均差', '觀察值減去平均。'), S('answer', 'deviation/sigma', 'z 分數', '除以正標準差得到相差幾個標準差。')],
    ['view 0,110,-35,35', 'plot (x-meanValue)/sigma label "標準化轉換"', 'point (value,answer) label "z 分數"']);
  add('regression', '最小平方法與預測', 7,
    [signed('a', 'X=−1 時的 Y', 1), signed('b', 'X=0 時的 Y', 2), signed('c', 'X=1 時的 Y', 5), C('u', '預測 X', -2, 2, .5, .5)],
    '資料點 (−1,{a})、(0,{b})、(1,{c})，用最小平方直線預測 X={u} 時的 Y。',
    'X 的平均為零，可以直接用共變異的分子求斜率。', '斜率=(c−a)/2，截距為三筆 Y 平均。', '迴歸是近似預測，不保證通過每一點；範圍外推要區分資料與模型。',
    [S('slopeValue', '(c-a)/2', '迴歸斜率', 'Σxᵢ²=2，Σxᵢyᵢ=c−a。'), S('intercept', '(a+b+c)/3', '截距', '最小平方直線通過平均點 (0,ȳ)。'), S('answer', 'slopeValue*u+intercept', '預測值', '將 u 代入迴歸直線。')],
    ['view -2.5,2.5,-20,20', 'plot slopeValue*x+intercept label "最小平方直線"', 'point (-1,a)', 'point (0,b)', 'point (1,c)', 'point (u,answer) label "預測"']);

  add('power-derivative', '冪函數導數與切線', 8,
    [C('a', '係數 a', 1, 5, 1, 2), C('power', '整數次方 n', 2, 5, 1, 3), C('position', '觀察點', -2, 2, .25, 1)],
    'f(u)={a}u^{power}，求 u={position} 處的導數。',
    '瞬間變化率對應導數。', '冪次法則 f′(u)=an·u^(n−1)。', '原函數值與斜率不同；切線要同時知道點與斜率。',
    [S('height', 'a*position^power', '切點高度', '將觀察點代回原函數。'), S('answer', 'a*power*position^(power-1)', '導數', '次方乘到前面，指數減一。')],
    ['view -2.5,2.5,-25,45', 'plot a*x^power label "原函數"', 'tangent a*x^power at position label "自動微分切線"']);
  add('definite-integral', '冪函數定積分', 8,
    [C('a', '係數 a', 1, 5, 1, 2), C('power', '次方 n', 1, 4, 1, 2), C('upper', '積分上限 b', .5, 4, .25, 2)],
    '計算 ∫₀^{upper} {a}u^{power} du。',
    '已知上下限，使用反導函數的端點差。', '將指數加一，再除以新指數。', '不要漏掉分母 n+1；本模型非負區間函數非負，所以積分也等於面積。',
    [S('newPower', 'power+1', '反導函數次方', '冪次加一。'), S('answer', 'a*upper^newPower/newPower', '定積分', '反導函數 a·u^(n+1)/(n+1)，上限代入減去零。')],
    ['view 0,upper*1.1,0,a*upper^power*1.15', 'plot a*x^power label "被積函數"', 'integral a*x^power from 0 to upper']);
  add('area-between', '兩曲線之間的面積', 8,
    [C('a', '曲率 a', .5, 3, .25, 1), C('radius', '交點距中心 r', .5, 4, .25, 2)],
    '求 y={a}({radius}²−u²) 與 u 軸所圍的面積。',
    '先找交點，再確認上減下與對稱性。', '在 [−r,r] 函數非負，用對稱性把積分化為兩倍半邊。', '面積需非負；先找交點才能決定積分區間。',
    [S('halfArea', 'a*(radius^3-radius^3/3)', '右半邊面積', '∫₀ʳ a(r²−u²)du=a(r³−r³/3)。'), S('answer', '2*halfArea', '總面積', '左右對稱，乘以 2，等於 4ar³/3。')],
    ['view -radius*1.3,radius*1.3,-a*radius^2*.5,a*radius^2*1.2', 'plot a*(radius^2-x^2) label "拋物線"', 'point (-radius,0)', 'point (radius,0)', 'integral a*(radius^2-x^2) from -radius to radius']);
  add('optimization', '固定周長的最大面積', 8,
    [C('perimeter', '長方形周長', 4, 60, 2, 24)],
    '長方形周長為 {perimeter}，求最大面積。',
    '固定總長乘積最大，想到配方或算幾不等式。', '長寬相等時乘積最大。', '長加寬是周長的一半；邊長需為正。',
    [S('side', 'perimeter/4', '最佳邊長', '設一邊 u，另一邊 P/2−u；配方後頂點在 P/4。'), S('answer', 'side^2', '最大面積', 'A=−(u−P/4)²+P²/16，最大為 P²/16。')],
    ['view 0,perimeter/2,0,answer*1.2', 'plot x*(perimeter/2-x) label "面積函數"', 'point (side,answer) label "最大面積"']);
  add('exponential-integral', '指數函數與累積量', 8,
    [C('a', '初始速率', 1, 6, 1, 2), C('rate', '連續變化率 k', .1, 1, .1, .5), C('upper', '累積時間', .5, 4, .25, 2)],
    '速率 v(u)={a}e^({rate}u)，求從 0 到 {upper} 的累積量。',
    '速率乘無限小時間再累積，就是定積分。', 'e^(ku) 的反導函數須除以 k。', '累積量不是末端速率乘時間；本模型 k>0。',
    [S('endRate', 'a*exp(rate*upper)', '末端速率', '代入上限，得到 v(b)。'), S('answer', 'a*(exp(rate*upper)-1)/rate', '累積量', '反導函數 a·e^(ku)/k，在上下限取差。')],
    ['view 0,upper*1.1,0,endRate*1.2', 'plot a*exp(rate*x) label "速率"', 'integral a*exp(rate*x) from 0 to upper'], true);

  function hash(text) { let h = 2166136261; for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; }
  function random(seed) { let n = seed >>> 0; return () => { n = (Math.imul(1664525, n) + 1013904223) >>> 0; return n / 4294967296; }; }
  function normalize(model, input = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('參數格式無效。');
    const allowed = new Set(model.controls.map(c => c.key));
    if (Object.keys(input).some(k => !allowed.has(k))) throw Error('包含不屬於此模型的參數。');
    const result = {};
    for (const c of model.controls) {
      const v = Object.hasOwn(input, c.key) ? input[c.key] : c.value;
      if (!Number.isFinite(v) || v < c.min - 1e-9 || v > c.max + 1e-9 || Math.abs((v - c.min) / c.step - Math.round((v - c.min) / c.step)) > 1e-6) throw Error(`${c.label} 超出範圍或步長無效。`);
      result[c.key] = Number((c.min + Math.round((v - c.min) / c.step) * c.step).toFixed(9));
    } return result;
  }
  const scenarios = [];
  for (const model of models) {
    const seen = new Set(), rng = random(hash(model.id));
    for (let i = 0; i < 12; i++) {
      let params = Object.fromEntries(model.controls.map(c => [c.key, c.value]));
      while (seen.has(JSON.stringify(params))) params = Object.fromEntries(model.controls.map(c => [c.key, Number((c.min + Math.floor(rng() * (Math.round((c.max - c.min) / c.step) + 1)) * c.step).toFixed(9))]));
      seen.add(JSON.stringify(params));
      scenarios.push({ id: `academy-${model.id}-${String(i + 1).padStart(2, '0')}`, modelId: model.id, title: `${model.title} · 情境 ${String(i + 1).padStart(2, '0')}`, tag: model.topic, index: i + 1, extension: model.extension, parameters: normalize(model, params) });
    }
  }
  const modelMap = new Map(models.map(m => [m.id, m])), scenarioMap = new Map(scenarios.map(s => [s.id, s]));
  function resolve(id) { const scenario = scenarioMap.get(id); if (!scenario) throw Error('找不到這個模組。'); return { scenario, model: modelMap.get(scenario.modelId) }; }
  const interpolate = (text, params) => text.replace(/\{([a-zA-Z]+)\}/g, (_, key) => String(params[key]));
  function source(id, input, visual = true) {
    const { scenario, model } = resolve(id), params = normalize(model, input || scenario.parameters);
    const lines = [`# ${interpolate(model.question, params)}`, `# ${model.trap}`, `title ${JSON.stringify(scenario.title)}`];
    for (const c of model.controls) lines.push(`param ${c.key} = ${params[c.key]} from ${c.min} to ${c.max} step ${c.step}`);
    for (const step of model.steps) lines.push(`# ${step.reason}`, `let ${step.key} = ${step.expression}`, `print ${step.key} label ${JSON.stringify(step.label)}`);
    if (visual) lines.push(...model.visual);
    return lines.join('\n');
  }
  function run(id, input, options = {}) {
    const { scenario, model } = resolve(id), params = normalize(model, input || scenario.parameters);
    const result = M.run(source(id, params, options.visual !== false));
    const values = Object.fromEntries(model.steps.map((s, i) => [s.key, result.outputs[i].value]));
    return { scenario, model, parameters: params, question: interpolate(model.question, params), values, answer: values.answer, result };
  }
  function search(query = '', topic = '', modelId = '') {
    const words = String(query).trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    return scenarios.filter(s => (!topic || s.tag === topic) && (!modelId || s.modelId === modelId) && words.every(word => [s.title, s.tag, modelMap.get(s.modelId).signal, s.id].join(' ').toLocaleLowerCase().includes(word)));
  }
  function isCorrect(model, expected, actual) {
    if (![expected, actual].every(Number.isFinite)) return false;
    // Tiny probabilities still require significant digits: 0 must not pass for a positive rare event.
    const scale = ['binomial', 'hypergeometric', 'bayes'].includes(model.id) ? Math.abs(expected) : Math.max(1, Math.abs(expected));
    return Math.abs(actual - expected) <= 1e-5 * scale;
  }
  return Object.freeze({ version: 1, topics, models, scenarios, resolve, normalize, source, run, search, isCorrect });
});
