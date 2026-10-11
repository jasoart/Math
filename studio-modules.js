/* Deterministic mathematical studios. Every model shares the scene and formula engines. */
(function (root) {
  'use strict';
  const PI=Math.PI, TAU=2*PI;
  const C=['#087f73','#3868b2','#c58b39','#8b63aa'];
  const F=n=>Number.isFinite(n)?String(Number(n.toPrecision(7))):'未定義';
  const num=(key,label,min,max,value,step=.1)=>({key,label,min,max,value,step,integer:false});
  const integer=(key,label,min,max,value)=>({...num(key,label,min,max,value,1),integer:true});
  const angle=(key,label,value=30)=>({...num(key,label,-180,180,value,1),unit:'°'});
  const point=(x,y,label='',color=C[0])=>({x,y,label,color});
  const line=(a,b,color=C[0],dash=false)=>({a,b,color,dash});
  const curve=(f,color=C[0],x,holes=[])=>({f,color,x,holes});
  const graph=(curves,x,y,extra={})=>({curves,x,y,...extra});
  function range(values,padding=.18) {
    const finite=values.filter(Number.isFinite),lo=Math.min(0,...finite),hi=Math.max(1,...finite),pad=Math.max(.1,hi-lo)*padding;
    return [lo-pad,hi+pad];
  }
  function geometry(points,extra={}) {
    const xs=points.map(p=>p.x),ys=points.map(p=>p.y);
    for(const circle of extra.circles||[]){xs.push(circle.x-circle.r,circle.x+circle.r);ys.push(circle.y-circle.r,circle.y+circle.r);}
    return {x:range(xs),y:range(ys),equal:true,points,...extra};
  }
  function sequence(values,start=0,extra={}) {
    const points=values.map((v,i)=>point(start+i,v));
    return graph([], [start-.4,start+Math.max(1,values.length-1)+.4],range(values), {points:points.length<=32?points:[],lines:points.slice(1).map((p,i)=>line(points[i],p)),...extra});
  }
  function bars(values,extra={}) {
    return graph([],[-.5,values.length-.5],range(values,.12),{bars:values.map((value,x)=>({x,value,label:String(x),color:C[0]})),...extra});
  }
  function parametric(fn,a,b,n=160) {return Array.from({length:n+1},(_,i)=>{const p=fn(a+(b-a)*i/n);return point(p[0],p[1]);});}
  function path(points,color=C[0]) {return points.slice(1).map((p,i)=>line(points[i],p,color));}
  const model=(results,lines,scene,summary=lines[0])=>({results,lines,scene,summary});
  const factorial=n=>{let result=1;for(let k=2;k<=n;k++)result*=k;return result;};
  const poisson=(k,lambda)=>{let result=Math.exp(-lambda);for(let j=1;j<=k;j++)result*=lambda/j;return result;};
  const binomial=(n,p)=>{const values=[(1-p)**n];for(let k=1;k<=n;k++)values.push(values[k-1]*(n-k+1)/k*p/(1-p));return values;};
  function create() {
    const modules=[];
    const add=config=>modules.push({...config,formula:(s,m)=>m.lines,status:(s,m)=>m.summary,draw:(s,m)=>root.MathScene.draw(m.scene,config.short)});
    const define=(id,short,tag,controls,compute,examSignal,prompt,trap,challenge)=>add({id,short,title:short,tag,controls,compute,examSignal,prompt,trap,challenge});

    // Numerical methods: iteration, quadrature and approximation.
    define('studio-bisection','二分法與誤差界','數值方法',[num('a','目標 a',.1,8,2),integer('n','迭代次數 n',1,20,7)],s=>{
      let lo=0,hi=3;const steps=[];for(let i=0;i<s.n;i++){const mid=(lo+hi)/2;steps.push(point(mid,mid**3-s.a));if(mid**3>s.a)hi=mid;else lo=mid;}
      const estimate=(lo+hi)/2,root=Math.cbrt(s.a),bound=(hi-lo)/2;
      return model({estimate,root,bound,error:Math.abs(estimate-root)},[`f(x)=x³−${F(s.a)}`,`根 ≈ ${F(root)}；二分估計 ≈ ${F(estimate)}`,`誤差 ≤ ${F(bound)}；實際誤差 ≈ ${F(Math.abs(estimate-root))}`],graph([curve(x=>x**3-s.a)],[-.2,3.2],[-s.a-1,28-s.a],{points:steps,lines:[line(point(lo,-s.a),point(lo,27-s.a),C[1],true),line(point(hi,-s.a),point(hi,27-s.a),C[1],true)]}));
    },'先建立包含根的區間，再用符號縮小範圍。','增加迭代次數，觀察區間寬度是否每次減半。','需要連續函數及端點異號；小區間不等於任意函數都含根。','用區間寬度推導所需的迭代次數。');
    define('studio-fixed-point','固定點迭代與收縮','數值方法',[num('a','收縮係數 a',.1,.95,.7,.05),num('x0','初始位置 x₀',-1,1,.8),integer('n','迭代次數 n',1,20,8)],s=>{
      const values=[s.x0],segments=[];for(let i=0;i<s.n;i++){const x=values.at(-1),y=s.a*Math.cos(x);segments.push(line(point(x,x),point(x,y),C[1]),line(point(x,y),point(y,y),C[1]));values.push(y);}
      const estimate=values.at(-1),bound=s.a/(1-s.a)*Math.abs(estimate-values.at(-2));
      return model({estimate,bound,residual:Math.abs(estimate-s.a*Math.cos(estimate))},[`xₙ₊₁=${F(s.a)} cos(xₙ)`,`|g′(x)| ≤ ${F(s.a)} < 1`,`目前 x ≈ ${F(estimate)}；後驗誤差界 ≈ ${F(bound)}`],graph([curve(x=>s.a*Math.cos(x)),curve(x=>x,C[2])],[-1.2,1.2],[-1.2,1.2],{lines:segments,points:[point(estimate,estimate,'目前位置')]}));
    },'收縮映射會將相鄰輸入變得更接近。','比較不同起點是否靠近同一個固定點。','誤差界須先確認不變區間與收縮係數小於一。','以導數上界解釋迭代為何收斂。');
    define('studio-secant','割線法求平方根','數值方法',[num('a','被開方數 a',.25,9,2,.25),num('x0','第一個起點',.1,1,.5),integer('n','迭代次數 n',1,8,5)],s=>{
      let a=s.x0,b=3;const points=[point(a,a*a-s.a),point(b,b*b-s.a)],segments=[];
      for(let i=0;i<s.n;i++){const fa=a*a-s.a,fb=b*b-s.a,den=fb-fa;if(Math.abs(den)<1e-14)break;const c=b-fb*(b-a)/den;segments.push(line(point(a,fa),point(b,fb),C[1]),line(point(b,fb),point(c,0),C[1],true));a=b;b=c;points.push(point(b,b*b-s.a));}
      return model({estimate:b,root:Math.sqrt(s.a),error:Math.abs(b-Math.sqrt(s.a))},[`f(x)=x²−${F(s.a)}`,`割線估計 ≈ ${F(b)}；√a ≈ ${F(Math.sqrt(s.a))}`,`誤差 ≈ ${F(Math.abs(b-Math.sqrt(s.a)))}`],graph([curve(x=>x*x-s.a)],[-.2,3.3],[-s.a-1,10],{points,lines:segments}));
    },'用兩個函數值建立割線，取它與橫軸的交點。','比較割線與真正切線的差異。','分母接近零時須停止更新；一般割線法不保證收斂。','說明割線法如何省去導數計算。');
    define('studio-finite-difference','差分精度與截斷誤差','數值方法',[num('x','觀察位置 x',-3,3,1),num('h','差分步長 h',.001,1,.2,.001)],s=>{
      const forward=(Math.sin(s.x+s.h)-Math.sin(s.x))/s.h,central=(Math.sin(s.x+s.h)-Math.sin(s.x-s.h))/(2*s.h),exact=Math.cos(s.x),y=Math.sin(s.x);
      return model({forward,central,exact,forwardError:Math.abs(forward-exact),centralError:Math.abs(central-exact)},[`f(x)=sin(x)，f′(x)=cos(x)`,`前向差分 ≈ ${F(forward)}；中心差分 ≈ ${F(central)}`,`兩種誤差 ≈ ${F(Math.abs(forward-exact))}、${F(Math.abs(central-exact))}`],graph([curve(Math.sin),curve(x=>y+exact*(x-s.x),C[2]),curve(x=>y+central*(x-s.x),C[1])],[-4,4],[-2,2],{points:[point(s.x,y,'觀察點')]}));
    },'對稱取樣可抵消一階截斷誤差。','將步長減半，比較兩種誤差的縮小比例。','非常小的步長會放大浮點數相減誤差。','推導中心差分的二階精度。');
    define('studio-simpson','Simpson 積分與多項式','數值方法',[num('b','積分上限 b',.5,3,2),integer('m','區間對數 m',1,20,4)],s=>{
      const n=2*s.m,h=s.b/n;let total=1*s.b**4;for(let k=1;k<n;k++)total+=(k%2?4:2)*(k*h)**4;const approximate=total*h/3,exact=s.b**5/5;
      return model({approximate,exact,error:approximate-exact,n},[`∫₀ᵇ x⁴ dx=b⁵/5 ≈ ${F(exact)}`,`Simpson 估計 ≈ ${F(approximate)}；分割數 ${n}`,`誤差 ≈ ${F(approximate-exact)}`],graph([curve(x=>x**4)],[0,s.b*1.05],[0,s.b**4*1.15],{points:Array.from({length:n+1},(_,k)=>point(k*h,(k*h)**4))}));
    },'成對區間使用二次插值累積面積。','增加分割數，觀察四次函數的近似誤差。','分割數必須為偶數；四次函數通常不會被精確積分。','說明為何對三次以下多項式可以精確積分。');
    define('studio-trapezoid','梯形積分與凸性','數值方法',[num('b','積分上限 b',.5,3,2),integer('n','分割數 n',1,40,8)],s=>{
      const h=s.b/s.n;let sum=(1+Math.exp(s.b))/2;for(let k=1;k<s.n;k++)sum+=Math.exp(k*h);const approximate=h*sum,exact=Math.expm1(s.b),points=Array.from({length:s.n+1},(_,k)=>point(k*h,Math.exp(k*h)));
      return model({approximate,exact,error:approximate-exact},[`∫₀ᵇ eˣ dx=eᵇ−1 ≈ ${F(exact)}`,`梯形估計 ≈ ${F(approximate)}`,`高估量 ≈ ${F(approximate-exact)}`],graph([curve(Math.exp)],[0,s.b*1.06],[0,Math.exp(s.b)*1.15],{lines:path(points,C[1]),points:points.length<20?points:[]}));
    },'凸函數的弦位於曲線上方。','比較分割數加倍後的高估量。','此處的高估結論依賴凸性，不能套用到所有函數。','由幾何圖像解釋誤差的正負。');
    define('studio-quadratic-interpolation','三點插值與局部近似','數值方法',[num('a','節點間距 a',.25,2,1,.05),num('x','觀察位置 x',-2,2,.7)],s=>{
      const coefficient=(Math.cos(s.a)-1)/(s.a*s.a),p=x=>1+coefficient*x*x,value=p(s.x),exact=Math.cos(s.x);
      return model({coefficient,value,exact,error:value-exact},[`節點：−a、0、a；f(x)=cos(x)`,`p(x)=1+${F(coefficient)}x²`,`p(x)−f(x) ≈ ${F(value-exact)}`],graph([curve(Math.cos),curve(p,C[1])],[-2.3,2.3],[-2,1.3],{points:[point(-s.a,Math.cos(s.a)),point(0,1),point(s.a,Math.cos(s.a)),point(s.x,value,'插值值',C[1])]}));
    },'三個節點決定一個二次插值多項式。','觀察節點內與節點外的誤差差異。','插值在節點精確，並不表示整個區間皆精確。','用對稱性說明一次項為零。');
    define('studio-gradient-descent','梯度下降與步長','數值方法',[num('a','曲率 a',.5,2,1),num('eta','學習率 η',.05,.9,.4,.05),num('x0','初始位置',1,6,4),integer('n','迭代次數 n',1,16,8)],s=>{
      const factor=1-s.eta*s.a,values=Array.from({length:s.n+1},(_,k)=>s.x0*factor**k),last=values.at(-1);
      return model({factor,last,energy:s.a*last*last/2},[`f(x)=a x²/2；xₙ₊₁=(1−ηa)xₙ`,`收縮倍率 ≈ ${F(factor)}`,`xₙ ≈ ${F(last)}；f(xₙ) ≈ ${F(s.a*last*last/2)}`],sequence(values,0,{note:'橫軸為迭代次數；負倍率會交替靠近最小點。'}));
    },'二次函數的梯度下降可以化成等比遞迴。','調整學習率，觀察單側或交替收斂。','收斂條件是 0<ηa<2；步長並非越大越好。','推導一步到達最小點的學習率。');

    // Signals and waves.
    define('studio-beats','拍頻與波形疊合','訊號與波動',[num('omega','中心角頻率 ω',2,5,3),num('delta','角頻率差 Δ',.1,2,.5)],s=>{
      const envelope=t=>2*Math.cos(s.delta*t/2),signal=t=>envelope(t)*Math.cos(s.omega*t);
      return model({beatPeriod:TAU/s.delta,beatFrequency:s.delta/TAU,omega1:s.omega-s.delta/2,omega2:s.omega+s.delta/2},[`cos((ω−Δ/2)t)+cos((ω+Δ/2)t)=2cos(Δt/2)cos(ωt)`,`包絡振幅：2|cos(Δt/2)|`,`拍週期 ≈ ${F(TAU/s.delta)}；每單位時間拍數 ≈ ${F(s.delta/TAU)}`],graph([curve(signal),curve(t=>Math.abs(envelope(t)),C[1]),curve(t=>-Math.abs(envelope(t)),C[1])],[0,12],[-2.4,2.4]));
    },'和差化積把快速振盪與緩慢包絡分開。','改變頻率差，觀察振幅的起伏速度。','角頻率差須除以 2π 才是每單位時間的拍數。','推導包絡達到最大振幅的時刻。');
    define('studio-fourier-square','方波的 Fourier 近似','訊號與波動',[integer('n','奇次諧波項數 n',1,12,5),num('x','觀察位置 x',.05,3,.7,.05)],s=>{
      const f=x=>{let sum=0;for(let k=0;k<s.n;k++)sum+=Math.sin((2*k+1)*x)/(2*k+1);return 4/PI*sum;};
      return model({value:f(s.x),exact:1,error:f(s.x)-1},[`Sₙ(x)=(4/π)Σ sin((2k+1)x)/(2k+1)`,`目前值 ≈ ${F(f(s.x))}；方波值 1`,`誤差 ≈ ${F(f(s.x)-1)}`],graph([curve(f),curve(x=>Math.sin(x)>0?1:Math.sin(x)<0?-1:0,C[1],undefined,[-PI,0,PI])],[-TAU,TAU],[-1.6,1.6]));
    },'奇次諧波疊合可以逼近奇對稱方波。','增加項數，觀察跳躍處的超越現象。','跳躍點附近的超越不會單純因項數增加而消失。','說明方波為何不需要偶次諧波。');
    define('studio-fourier-sawtooth','鋸齒波與諧波','訊號與波動',[integer('n','諧波項數 n',1,16,6),num('x','觀察位置 x',-2.8,2.8,1)],s=>{
      const f=x=>{let sum=0;for(let k=1;k<=s.n;k++)sum+=2*(-1)**(k+1)*Math.sin(k*x)/k;return sum;};
      return model({value:f(s.x),exact:s.x,error:f(s.x)-s.x},[`Sₙ(x)=2Σ (−1)ᵏ⁺¹sin(kx)/k`,`−π<x<π 時的目標為 f(x)=x`,`觀察誤差 ≈ ${F(f(s.x)-s.x)}`],graph([curve(f),curve(x=>x,C[1])],[-PI,PI],[-4,4]));
    },'週期延拓決定端點附近的跳躍。','比較中央與兩端的近似品質。','端點的 Fourier 極限是左右極限的平均，不等於單側值。','說明係數為何隨頻率以 1/k 衰減。');
    define('studio-damped-wave','阻尼振盪與包絡','訊號與波動',[num('gamma','衰減係數 γ',.05,1,.3,.05),num('omega','角頻率 ω',1,6,3),num('t','觀察時間 t',0,8,2)],s=>{
      const f=t=>Math.exp(-s.gamma*t)*Math.cos(s.omega*t),amplitude=Math.exp(-s.gamma*s.t);
      return model({value:f(s.t),amplitude,halfLife:Math.LN2/s.gamma},[`f(t)=e^(−γt) cos(ωt)`,`振幅包絡 ≈ ${F(amplitude)}；目前值 ≈ ${F(f(s.t))}`,`振幅半衰期 ≈ ${F(Math.LN2/s.gamma)}`],graph([curve(f),curve(t=>Math.exp(-s.gamma*t),C[1]),curve(t=>-Math.exp(-s.gamma*t),C[1])],[0,8],[-1.2,1.2],{points:[point(s.t,f(s.t),'目前值')]}));
    },'振盪頻率與振幅衰減是兩個不同尺度。','分別調整 γ 與 ω，辨認各自改變的部分。','振幅半衰期與能量半衰期不同。','若振幅減半，平方振幅會剩下多少？');
    define('studio-gaussian-width','高斯形狀與半高全寬','訊號與波動',[num('sigma','標準差 σ',.2,2,.8),num('mu','中心 μ',-2,2,0)],s=>{
      const f=x=>Math.exp(-.5*((x-s.mu)/s.sigma)**2)/(s.sigma*Math.sqrt(TAU)),width=2*Math.sqrt(2*Math.LN2)*s.sigma,peak=f(s.mu);
      return model({width,peak,variance:s.sigma*s.sigma},[`g(x)=e^(−(x−μ)²/(2σ²))/(σ√(2π))`,`半高全寬 ≈ ${F(width)}；峰值 ≈ ${F(peak)}`,`變異數 σ² ≈ ${F(s.sigma*s.sigma)}`],graph([curve(f),curve(()=>peak/2,C[1])],[-6,6],[0,peak*1.2],{points:[point(s.mu-width/2,peak/2),point(s.mu+width/2,peak/2)]}));
    },'高度與寬度由同一個尺度參數共同決定。','增大 σ，觀察峰值和半高全寬的反向變化。','半高全寬並不等於標準差或機率區間。','從峰值的一半推導半高全寬。');
    define('studio-sigmoid','Sigmoid 與最大斜率','訊號與波動',[num('k','陡峭係數 k',.2,4,1),num('c','中心位置 c',-2,2,0),num('x','觀察位置 x',-4,4,1)],s=>{
      const f=x=>1/(1+Math.exp(-s.k*(x-s.c))),value=f(s.x),slope=s.k*value*(1-value);
      return model({value,slope,maxSlope:s.k/4},[`S(x)=1/(1+e^(−k(x−c)))`,`S′(x)=k S(x)(1−S(x)) ≈ ${F(slope)}`,`中心值 1/2；最大斜率 k/4 ≈ ${F(s.k/4)}`],graph([curve(f),curve(x=>s.k*f(x)*(1-f(x)),C[1])],[-6,6],[0,Math.max(1.2,s.k/4*1.2)],{points:[point(s.x,value,'S(x)'),point(s.c,.5,'中心')]}));
    },'輸出值能直接寫出導數，中心具有最大斜率。','比較平移 c 與伸縮 k 對曲線的作用。','最大斜率結論在此假設 k>0。','以二次函數 S(1−S) 找到最大斜率。');
    define('studio-wave-packet','波包與局部振盪','訊號與波動',[num('sigma','包絡寬度 σ',.3,2,1),num('k','角頻率 k',1,10,5),num('c','中心 c',-2,2,0)],s=>{
      const envelope=x=>Math.exp(-.5*((x-s.c)/s.sigma)**2),f=x=>envelope(x)*Math.cos(s.k*(x-s.c));
      return model({period:TAU/s.k,width:2*Math.sqrt(2*Math.LN2)*s.sigma,centerValue:1},[`w(x)=e^(−(x−c)²/(2σ²)) cos(k(x−c))`,`載波週期 ≈ ${F(TAU/s.k)}`,`包絡半高全寬 ≈ ${F(2*Math.sqrt(2*Math.LN2)*s.sigma)}`],graph([curve(f),curve(envelope,C[1]),curve(x=>-envelope(x),C[1])],[-6,6],[-1.3,1.3]));
    },'局部振盪由包絡與載波相乘形成。','改變寬度與頻率，辨認波包內能容納的週期。','包絡的寬度與載波的週期不應混為同一個量。','估計半高全寬內包含多少個週期。');
    define('studio-discrete-convolution','離散卷積與重疊','訊號與波動',[integer('n','第一段長度 n',1,6,3),integer('m','第二段長度 m',1,6,4)],s=>{
      const values=Array.from({length:s.n+s.m-1},(_,k)=>Math.max(0,Math.min(s.n-1,k)-Math.max(0,k-s.m+1)+1));
      return model({mass:values.reduce((a,b)=>a+b,0),peak:Math.min(s.n,s.m),values},['兩段常數序列的卷積＝每個位移的重疊數',`總和 n m=${s.n*s.m}；峰值 min(n,m)=${Math.min(s.n,s.m)}`],bars(values));
    },'卷積可視為滑動後的重疊長度。','改變兩段長度，觀察三角形何時變成梯形。','卷積與逐項相乘的定義不同。','解釋卷積總和為何等於兩序列總和的乘積。');

    // Dynamical systems.
    define('studio-logistic-map','Logistic 映射與軌道','動態系統',[num('r','增長參數 r',2.5,3.95,3.4,.05),num('x0','初始狀態',.05,.95,.2,.05),integer('n','迭代次數 n',4,50,25)],s=>{
      const values=[s.x0];for(let i=0;i<s.n;i++)values.push(s.r*values.at(-1)*(1-values.at(-1)));const fixed=1-1/s.r;
      return model({last:values.at(-1),fixed,multiplier:2-s.r},[`xₙ₊₁=r xₙ(1−xₙ)`,`非零固定點 ≈ ${F(fixed)}；局部倍率 ≈ ${F(2-s.r)}`,`目前軌道值 ≈ ${F(values.at(-1))}`],sequence(values,0,{y:[-.05,1.05],note:'觀察固定點、週期軌道與對起點敏感的變化。'}));
    },'固定點的局部倍率决定穩定性。','比較 r 小於與大於 3 的軌道。','有限迭代圖不能證明所有參數的長期混沌性質。','由導數推導非零固定點的穩定區間。');
    define('studio-discrete-decay','離散衰減與半衰期','動態系統',[num('q','每步保留比例 q',.1,.95,.8,.05),num('a','初始量 a',1,6,4),integer('n','步數 n',1,25,10)],s=>{
      const values=Array.from({length:s.n+1},(_,k)=>s.a*s.q**k),halfLife=Math.log(.5)/Math.log(s.q);
      return model({last:values.at(-1),halfLife,ratio:s.q},[`xₙ=a qⁿ ≈ ${F(values.at(-1))}`,`連續延伸的半衰步數 ≈ ${F(halfLife)}`,`真正離散步數為其向上取整：${Math.ceil(halfLife)}`],sequence(values));
    },'固定比例的減少對應等比軌道。','比較比例降低後，半衰步數如何改變。','離散系統的首次減半步數須取整，不能直接當成小數步。','找出至少減至原量十分之一的步數。');
    define('studio-affine-recursion','仿射遞迴與穩定點','動態系統',[num('q','回饋係數 q',-.9,.9,.6),num('b','每步輸入 b',-2,2,1),num('x0','初始狀態',-3,3,-1),integer('n','步數 n',1,20,10)],s=>{
      const fixed=s.b/(1-s.q),values=Array.from({length:s.n+1},(_,k)=>fixed+s.q**k*(s.x0-fixed));
      return model({fixed,last:values.at(-1),error:values.at(-1)-fixed},[`xₙ₊₁=q xₙ+b；固定點 b/(1−q) ≈ ${F(fixed)}`,`xₙ=固定點+qⁿ(x₀−固定點)`,`目前偏差 ≈ ${F(values.at(-1)-fixed)}`],sequence(values,0,{curves:[curve(()=>fixed,C[1])]}));
    },'移到固定點附近後，仿射遞迴變成等比遞迴。','比較正負 q 的靠近方式。','穩定性依賴 |q|<1，本模組參數已限制於此區間。','用平移變數推導顯式解。');
    define('studio-harmonic-phase','簡諧運動的相平面','動態系統',[num('A','振幅 A',.5,3,2),num('omega','角頻率 ω',.5,3,1),angle('theta','相位 θ',45)],s=>{
      const t=s.theta*PI/180,x=s.A*Math.cos(t),v=-s.A*s.omega*Math.sin(t),energy=(v*v+s.omega*s.omega*x*x)/2,ps=parametric(t=>[s.A*Math.cos(t),-s.A*s.omega*Math.sin(t)],0,TAU);
      return model({x,v,energy},[`x=A cosθ ≈ ${F(x)}；v=−Aω sinθ ≈ ${F(v)}`,`v²+ω²x²=A²ω²`,`單位質量能量 ≈ ${F(energy)}`],geometry([point(x,v,'目前狀態')],{x:[-s.A*1.2,s.A*1.2],y:[-s.A*s.omega*1.2,s.A*s.omega*1.2],lines:path(ps),note:'橫軸為位置，縱軸為速度；兩者的物理單位不同。'}));
    },'把時間消去後，位置與速度形成橢圓。','改變相位，觀察能量是否保持不變。','相平面的橫縱軸不是兩個空間位置。','由相平面橢圓推導最大速度。');
    define('studio-pendulum-energy','擺的能量與轉向','動態系統',[num('g','勢能尺度 g',1,4,2),angle('theta','觀察角 θ',60),num('v','觀察角速度',.1,4,1)],s=>{
      const theta=s.theta*PI/180,energy=s.v*s.v/2+s.g*(1-Math.cos(theta)),f=x=>{const z=2*(energy-s.g*(1-Math.cos(x)));return z>=0?Math.sqrt(z):NaN;};
      return model({energy,barrier:2*s.g,theta,velocity:s.v},[`E=v²/2+g(1−cosθ) ≈ ${F(energy)}`,`完整轉動的勢能障壁 2g=${F(2*s.g)}`,energy<2*s.g?'此能量存在轉向位置。':energy>2*s.g?'此能量超過完整轉動的勢能障壁。':'此能量位於分離軌道。'],graph([curve(f),curve(x=>-f(x))],[-PI,PI],[-Math.sqrt(2*energy)*1.15,Math.sqrt(2*energy)*1.15],{points:[point(theta,s.v,'觀察狀態')],note:'此模型將質量與擺長正規化；橫軸角度以弧度繪製。'}));
    },'能量決定轉向與完整轉動的可能性。','增加角速度，觀察封閉軌道何時打開。','達到勢能障壁時是臨界分離軌道，與超過障壁不同。','用能量條件找出轉向角。');
    define('studio-euler-growth','Euler 方法與時間步長','動態系統',[num('a','增長率 a',-1,1,.5),num('T','總時間 T',.5,4,2),integer('n','時間分割數 n',2,40,8)],s=>{
      const h=s.T/s.n,values=Array.from({length:s.n+1},(_,k)=>(1+s.a*h)**k),exact=Math.exp(s.a*s.T),last=values.at(-1),ps=values.map((v,k)=>point(k*h,v));
      return model({last,exact,error:last-exact,factor:1+s.a*h},[`y′=a y，y(0)=1；解析解 e^(aT) ≈ ${F(exact)}`,`Euler 更新：yₖ₊₁=(1+a h)yₖ`,`估計 ≈ ${F(last)}；誤差 ≈ ${F(last-exact)}`],graph([curve(t=>Math.exp(s.a*t))],[0,s.T*1.05],range([...values,exact]),{lines:path(ps,C[1]),points:ps,note:'橫軸為時間；粗步長可能產生非物理的振盪或增長。'}));
    },'以目前的切線斜率預測下一步。','減小步長，觀察數值軌道是否靠近解析解。','穩定性與精度是不同問題，衰減系統尤其須檢查步長。','推導衰減問題的 Euler 穩定步長。');
    define('studio-midpoint-decay','中點法的二階精度','動態系統',[num('a','衰減率 a',.1,1,.6),num('T','總時間 T',.5,3,2),integer('n','時間分割數 n',2,30,8)],s=>{
      const h=s.T/s.n,factor=1-s.a*h+(s.a*h)**2/2,values=Array.from({length:s.n+1},(_,k)=>factor**k),last=values.at(-1),exact=Math.exp(-s.a*s.T),ps=values.map((v,k)=>point(k*h,v));
      return model({last,exact,error:last-exact,factor},[`y′=−a y；中點倍率 1−a h+(a h)²/2`,`解析值 ≈ ${F(exact)}；中點估計 ≈ ${F(last)}`,`誤差 ≈ ${F(last-exact)}`],graph([curve(t=>Math.exp(-s.a*t))],[0,s.T*1.05],[0,1.15],{lines:path(ps,C[1]),points:ps}));
    },'先估計半步的位置，再採用中點斜率更新。','將分割數加倍，觀察誤差降低比例。','二階精度不表示任意大的時間步都穩定。','比較中點法與指數函數的二階展開。');
    define('studio-predator-nullclines','捕食模型與零增長線','動態系統',[num('alpha','獵物增長 α',.2,2,1),num('beta','捕食係數 β',.2,2,.8),num('gamma','捕食者衰減 γ',.2,2,1),num('delta','轉換係數 δ',.2,2,.7)],s=>{
      const x=s.gamma/s.delta,y=s.alpha/s.beta,xmax=Math.max(4,x*1.6),ymax=Math.max(4,y*1.6),segments=[];
      for(let i=1;i<=7;i++)for(let j=1;j<=7;j++){const a=xmax*i/8,b=ymax*j/8,dx=a*(s.alpha-s.beta*b),dy=b*(s.delta*a-s.gamma),norm=Math.hypot(dx,dy);if(norm)segments.push(line(point(a,b),point(a+dx/norm*xmax*.025,b+dy/norm*ymax*.025),C[2]));}
      return model({x,y,period:TAU/Math.sqrt(s.alpha*s.gamma)},[`x′=x(α−βy)，y′=y(δx−γ)`,`正平衡點 ≈ (${F(x)},${F(y)})`,`平衡附近線性化週期 ≈ ${F(TAU/Math.sqrt(s.alpha*s.gamma))}`],graph([], [0,xmax],[0,ymax],{points:[point(x,y,'平衡')],lines:[...segments,line(point(x,0),point(x,ymax),C[1]),line(point(0,y),point(xmax,y),C[0])],note:'短線表示局部變化方向；未繪製完整數值軌道。'}));
    },'零增長線的交點定位平衡狀態。','觀察各區域中兩種族群的增減方向。','線性化週期只描述平衡附近的小振幅，不是全部軌道週期。','直接由零增長條件求出正平衡點。');

    // Curve geometry.
    define('studio-bezier-quadratic','二次 Bézier 與切線','曲線幾何',[num('h','控制點高度 h',-3,3,2),num('t','曲線參數 t',0,1,.4,.01)],s=>{
      const fn=t=>[4*t-2,2*s.h*t*(1-t)],ps=parametric(fn,0,1),p=fn(s.t),dy=2*s.h*(1-2*s.t),curvature=16*Math.abs(s.h)/(16+dy*dy)**1.5;
      return model({x:p[0],y:p[1],dx:4,dy,curvature},['B(t)=(1−t)²P₀+2(1−t)tP₁+t²P₂',`B(t) ≈ (${F(p[0])},${F(p[1])})`,`切向量 ≈ (4,${F(dy)})；曲率 ≈ ${F(curvature)}`],geometry([point(-2,0,'P₀'),point(0,s.h,'P₁',C[1]),point(2,0,'P₂'),point(...p,'B(t)')],{lines:[line(point(-2,0),point(0,s.h),C[1],true),line(point(0,s.h),point(2,0),C[1],true),...path(ps),line(point(p[0]-.6,p[1]-.15*dy),point(p[0]+.6,p[1]+.15*dy),C[2])]}));
    },'控制點的加權平均形成曲線；導數決定切線。','把控制點移到另一側，觀察曲率與彎曲方向。','Bézier 控制點通常不在曲線上。','說明曲線為何留在控制點的凸包內。');
    define('studio-bezier-cubic','三次 Bézier 的形狀控制','曲線幾何',[num('h1','第一控制點高度',-3,3,2),num('h2','第二控制點高度',-3,3,-1),num('t','曲線參數 t',0,1,.5,.01)],s=>{
      const fn=t=>[-3+6*t,3*(1-t)**2*t*s.h1+3*(1-t)*t*t*s.h2],p=fn(s.t),dy=3*(1-4*s.t+3*s.t*s.t)*s.h1+3*(2*s.t-3*s.t*s.t)*s.h2,ps=parametric(fn,0,1);
      return model({x:p[0],y:p[1],dx:6,dy},['B(t)=Σ C(3,k)(1−t)³⁻ᵏtᵏPₖ',`B(t) ≈ (${F(p[0])},${F(p[1])})`,`切向量 ≈ (6,${F(dy)})`],geometry([point(-3,0,'P₀'),point(-1,s.h1,'P₁',C[1]),point(1,s.h2,'P₂',C[1]),point(3,0,'P₃'),point(...p,'B(t)')],{lines:[line(point(-3,0),point(-1,s.h1),C[1],true),line(point(-1,s.h1),point(1,s.h2),C[1],true),line(point(1,s.h2),point(3,0),C[1],true),...path(ps)]}));
    },'兩個內部控制點分別調整兩端的方向。','改變 h₁、h₂，觀察 S 形與單側彎曲。','內部控制點的高度不等於曲線同一橫座標的高度。','由端點導數解釋控制線的作用。');
    define('studio-osculating-circle','拋物線的密切圓','曲線幾何',[num('a','拋物線係數 a',.1,1,.5),num('x','接觸位置 x',-2,2,.6)],s=>{
      const y=s.a*s.x*s.x,slope=2*s.a*s.x,curvature=2*s.a/(1+slope*slope)**1.5,radius=1/curvature,cx=s.x-slope*radius/Math.sqrt(1+slope*slope),cy=y+radius/Math.sqrt(1+slope*slope);
      return model({y,slope,curvature,radius,cx,cy},[`κ=|y″|/(1+y′²)^(3/2) ≈ ${F(curvature)}`,`密切圓半徑 R=1/κ ≈ ${F(radius)}`,`圓心 ≈ (${F(cx)},${F(cy)})`],geometry([point(s.x,y,'接觸點'),point(cx,cy,'圓心',C[1])],{circles:[{x:cx,y:cy,r:radius,color:C[1]}],curves:[curve(x=>s.a*x*x)],lines:[line(point(cx,cy),point(s.x,y),C[2],true)]}));
    },'局部彎曲可用同切線、同曲率的圓描述。','比較頂點與遠離頂點處的密切圓半徑。','密切圓是局部近似，不能代表整條拋物線。','從曲率公式求頂點的密切圓。');
    define('studio-involute','圓的漸開線與弧長','曲線幾何',[num('R','基圓半徑 R',.5,2,1),num('t','展開參數 t',.1,6.2,3,.1)],s=>{
      const fn=t=>[s.R*(Math.cos(t)+t*Math.sin(t)),s.R*(Math.sin(t)-t*Math.cos(t))],ps=parametric(fn,0,s.t),p=fn(s.t),tangent=point(s.R*Math.cos(s.t),s.R*Math.sin(s.t));
      return model({x:p[0],y:p[1],length:s.R*s.t*s.t/2,stringLength:s.R*s.t},[`r(t)=R(cos t+t sin t, sin t−t cos t)`,`展開繩長 Rt ≈ ${F(s.R*s.t)}`,`漸開線弧長 Rt²/2 ≈ ${F(s.R*s.t*s.t/2)}`],geometry([point(...p,'展開端點'),tangent],{lines:[...path(ps),line(tangent,point(...p),C[1])],circles:[{x:0,y:0,r:s.R,color:C[2]}]}));
    },'拉直的繩子沿著基圓切線展開。','比較繩長與端點軌跡的弧長。','展開參數須以弧度計，繩長和軌跡長不同。','對參數式求導，驗證速度大小為 Rt。');
    define('studio-catenary','懸鏈線與雙曲函數','曲線幾何',[num('a','尺度 a',.4,2,1),num('x','觀察位置 x',-2,2,.8)],s=>{
      const f=x=>s.a*Math.cosh(x/s.a),y=f(s.x),slope=Math.sinh(s.x/s.a),length=2*s.a*Math.sinh(2/s.a);
      return model({y,slope,length},[`y=a cosh(x/a)；目前高度 ≈ ${F(y)}`,`斜率 sinh(x/a) ≈ ${F(slope)}`,`−2 至 2 的弧長 ≈ ${F(length)}`],graph([curve(f),curve(x=>y+slope*(x-s.x),C[1])],[-2.2,2.2],[0,f(2)*1.12],{points:[point(s.x,y,'觀察點')]}));
    },'双曲餘弦描述理想懸鏈線的平衡形狀。','調整尺度，觀察最低點和彎曲程度。','懸鏈線與拋物線只是局部相似，方程不同。','用雙曲恆等式簡化弧長積分。');
    define('studio-superellipse','超橢圓與形狀族','曲線幾何',[num('a','水平半徑 a',.5,3,2),num('b','垂直半徑 b',.5,3,1.5),num('n','形狀指數 n',1,6,3,.1)],s=>{
      const fn=t=>[s.a*Math.sign(Math.cos(t))*Math.abs(Math.cos(t))**(2/s.n),s.b*Math.sign(Math.sin(t))*Math.abs(Math.sin(t))**(2/s.n)],ps=parametric(fn,0,TAU,320);let area=0;for(let i=1;i<ps.length;i++)area+=ps[i-1].x*ps[i].y-ps[i].x*ps[i-1].y;area=Math.abs(area)/2;
      return model({area,boxArea:4*s.a*s.b,fillRatio:area/(4*s.a*s.b)},[`|x/a|ⁿ+|y/b|ⁿ=1`,`內接多邊形面積估計 ≈ ${F(area)}`,`外接矩形面積 4ab=${F(4*s.a*s.b)}；比例 ≈ ${F(area/(4*s.a*s.b))}`],geometry([], {x:[-s.a*1.2,s.a*1.2],y:[-s.b*1.2,s.b*1.2],lines:path(ps),note:'面積以 320 段內接多邊形近似；n=2 為橢圓。'}));
    },'同一個隱方程隨指數變化產生不同圓角。','比較 n=1、2 與更大的指數。','圖形面積是數值近似；角點的平滑性依指數而變。','用 n=1 與 n=2 核對面積估計。');
    define('studio-circle-inversion','圓反演與距離乘積','曲線幾何',[num('R','反演半徑 R',.5,2,1),num('x','原點水平座標',.3,3,2),num('y','原點垂直座標',-2,2,1)],s=>{
      const norm2=s.x*s.x+s.y*s.y,k=s.R*s.R/norm2,x=s.x*k,y=s.y*k;
      return model({x,y,product:Math.hypot(s.x,s.y)*Math.hypot(x,y),scale:k},[`P′=R² P/|P|² ≈ (${F(x)},${F(y)})`,`|P| |P′|=R² ≈ ${F(s.R*s.R)}`,`縮放倍率 ≈ ${F(k)}`],geometry([point(0,0,'O'),point(s.x,s.y,'P'),point(x,y,'P′',C[1])],{circles:[{x:0,y:0,r:s.R,color:C[2]}],lines:[line(point(0,0),point(s.x,s.y)),line(point(0,0),point(x,y),C[1])]}));
    },'沿同一條射線，以距離乘積保持固定定義反演。','把點移到反演圓內外，觀察像點的位置。','反演在圓心未定義，並不是全平面的線性縮放。','證明再做一次反演會回到原點。');
    define('studio-stereographic','圓的立體投影與有理參數','曲線幾何',[num('t','直線參數 t',-3,3,1)],s=>{
      const x=2*s.t/(1+s.t*s.t),y=(s.t*s.t-1)/(1+s.t*s.t);
      return model({x,y,norm2:x*x+y*y,inverse:x/(1-y)},[`P(t)=(2t/(1+t²),(t²−1)/(1+t²))`,`座標 ≈ (${F(x)},${F(y)})；x²+y² ≈ ${F(x*x+y*y)}`,`反解 t=x/(1−y) ≈ ${F(x/(1-y))}`],geometry([point(0,1,'N'),point(s.t,0,'直線位置',C[1]),point(x,y,'圓上點')],{circles:[{x:0,y:0,r:1,color:C[2]}],lines:[line(point(0,1),point(s.t,0),C[1]),line(point(s.t,0),point(x,y),C[1])]}));
    },'從固定極點投影到直線，可把圓參數化為有理式。','移動直線位置，觀察圓上點靠近哪個極點。','極點 N 不對應任何有限的 t。','代入參數式驗證 x²+y²=1。');

    // Probability and information.
    define('studio-poisson','Poisson 分布與事件數','機率分布',[num('lambda','平均事件數 λ',.3,8,3),integer('k','觀察事件數 k',0,15,3)],s=>{
      const values=Array.from({length:25},(_,k)=>poisson(k,s.lambda)),probability=poisson(s.k,s.lambda);
      return model({probability,mean:s.lambda,variance:s.lambda,shownMass:values.reduce((a,b)=>a+b,0)},[`P(X=k)=e^(−λ) λᵏ/k! ≈ ${F(probability)}`,`平均數與變異數皆為 λ=${F(s.lambda)}`,`圖中 0～24 的機率總和 ≈ ${F(values.reduce((a,b)=>a+b,0))}`],bars(values));
    },'固定平均事件率對應離散事件數的分布。','增加 λ，觀察中心位置與分散程度。','機率分布的完整支撐是所有非負整數；圖只顯示有限部分。','利用相鄰機率比找出眾數附近的位置。');
    define('studio-exponential-distribution','指數分布與等待時間','機率分布',[num('lambda','事件率 λ',.2,3,1),num('x','等待時間 x',.1,6,1.5)],s=>{
      const density=s.lambda*Math.exp(-s.lambda*s.x),cdf=-Math.expm1(-s.lambda*s.x);
      return model({density,cdf,mean:1/s.lambda,median:Math.LN2/s.lambda},[`f(x)=λ e^(−λx)；目前密度 ≈ ${F(density)}`,`P(X≤x)=1−e^(−λx) ≈ ${F(cdf)}`,`平均等待 1/λ ≈ ${F(1/s.lambda)}；中位數 ≈ ${F(Math.LN2/s.lambda)}`],graph([curve(x=>s.lambda*Math.exp(-s.lambda*x))],[0,Math.max(s.x*1.1,6/s.lambda)],[0,s.lambda*1.2],{points:[point(s.x,density,'目前密度')]}));
    },'等待超過一段時間的機率以指數衰減。','比較平均等待時間與中位數。','密度高度不是某個單點的機率。','由累積分布求出中位數。');
    define('studio-geometric-memoryless','幾何分布的無記憶性','機率分布',[num('p','每次成功機率 p',.1,.8,.3,.05),integer('n','已等待次數 n',1,12,4),integer('m','再等待次數 m',1,8,3)],s=>{
      const tail=(1-s.p)**s.n,joint=(1-s.p)**(s.n+s.m),conditional=joint/tail;
      return model({tail,joint,conditional,reference:(1-s.p)**s.m},[`P(T>n)=(1−p)ⁿ ≈ ${F(tail)}`,`P(T>n+m | T>n)=(1−p)ᵐ ≈ ${F(conditional)}`],bars(Array.from({length:16},(_,k)=>s.p*(1-s.p)**k),{note:'柱標 k 代表首次成功發生在第 k+1 次。'}));
    },'已經等待的時間不會改变之後的等待分布。','固定 p、m，調整已等待次數 n。','無記憶性需要每次獨立且成功機率固定。','用條件機率定義推導無記憶性。');
    define('studio-beta-distribution','Beta 分布與比例形狀','機率分布',[integer('alpha','形狀參數 α',1,6,2),integer('beta','形狀參數 β',1,6,3)],s=>{
      const normalizer=factorial(s.alpha+s.beta-1)/(factorial(s.alpha-1)*factorial(s.beta-1)),f=x=>normalizer*x**(s.alpha-1)*(1-x)**(s.beta-1),mean=s.alpha/(s.alpha+s.beta),variance=s.alpha*s.beta/((s.alpha+s.beta)**2*(s.alpha+s.beta+1));const peak=Math.max(...Array.from({length:101},(_,i)=>f(i/100)));
      return model({normalizer,mean,variance},[`f(x)=x^(α−1)(1−x)^(β−1)/B(α,β)`,`平均數 α/(α+β) ≈ ${F(mean)}`,`變異數 ≈ ${F(variance)}`],graph([curve(f)],[0,1],[0,peak*1.15],{points:[point(mean,f(mean),'平均位置')]}));
    },'兩個形狀參數調整比例在零與一之間的分布。','交換 α 與 β，觀察密度是否左右鏡射。','平均位置不是密度最高的位置。','在 α=β=1 時解釋密度形狀。');
    define('studio-binomial-poisson','二項分布的稀有事件極限','機率分布',[integer('n','試驗次數 n',10,100,30),num('lambda','固定平均 λ',.2,5,2,.1)],s=>{
      const p=s.lambda/s.n,b=binomial(s.n,p),length=Math.min(25,s.n+1),values=b.slice(0,length);let total=0;for(let k=0;k<=Math.max(s.n,60);k++)total+=Math.abs((b[k]||0)-poisson(k,s.lambda));const variation=total/2;
      return model({p,variance:s.lambda*(1-p),variation},[`p=λ/n ≈ ${F(p)}；平均數 np=λ`,`二項變異數 ≈ ${F(s.lambda*(1-p))}`,`總變差距離估計 ≈ ${F(variation)}`],bars(values,{points:values.map((v,k)=>point(k,poisson(k,s.lambda),'',C[1])),note:'柱為二項機率；點為同平均數的 Poisson 機率。總變差尾端取至至少 60。'}));
    },'維持平均數固定，同時增加試驗次數與降低單次機率。','增大 n，觀察兩個分布的距離。','稀有事件極限需要 np 固定；單純增加 n 並不足夠。','比較兩個分布的變異數。');
    define('studio-uniform-sum','均勻分布相加與卷積','機率分布',[num('a','第一段寬度 a',.5,3,2),num('b','第二段寬度 b',.5,3,1)],s=>{
      const f=x=>Math.max(0,Math.min(s.a,x)-Math.max(0,x-s.b))/(s.a*s.b),mean=(s.a+s.b)/2,variance=(s.a*s.a+s.b*s.b)/12;
      return model({mean,variance,peak:1/Math.max(s.a,s.b)},['兩個獨立均勻分布相加，密度由重疊長度決定',`平均數 ≈ ${F(mean)}；變異數 ≈ ${F(variance)}`,`最高密度 ≈ ${F(1/Math.max(s.a,s.b))}`],graph([curve(f)],[0,s.a+s.b],[0,1/Math.max(s.a,s.b)*1.2],{points:[point(mean,f(mean),'平均位置')]}));
    },'連續卷積把區間重疊長度轉成密度。','比較兩段寬度相等與不相等的形狀。','變異數相加使用了獨立性。','以對稱性和面積核對密度。');
    define('studio-chebyshev','Chebyshev 界與實際尾端','機率分布',[num('k','標準差倍數 k',1,4,2,.05)],s=>{
      const actual=Math.max(0,1-s.k/Math.sqrt(3)),bound=1/(s.k*s.k);
      return model({actual,bound,gap:bound-actual},['X 為 [−√3,√3] 的均勻分布，平均 0、變異數 1',`P(|X|≥k)=${F(actual)} ≤ 1/k²=${F(bound)}`],graph([curve(k=>1/(k*k)),curve(k=>Math.max(0,1-k/Math.sqrt(3)),C[1])],[1,4],[0,1.1],{points:[point(s.k,bound,'一般上界'),point(s.k,actual,'實際機率',C[1])],note:'橫軸為標準差倍數 k；此處用單一分布比較一般上界的寬鬆程度。'}));
    },'僅知道平均數與變異數也能得到尾端上界。','觀察上界與這個均勻分布實際機率的差距。','Chebyshev 是上界，不是所有分布的實際尾端機率。','檢查 k=√3 時實際尾端與上界。');
    define('studio-binary-entropy','二元熵與不確定性','機率分布',[num('p','事件機率 p',.01,.99,.3,.01)],s=>{
      const H=p=>p>0&&p<1?-p*Math.log2(p)-(1-p)*Math.log2(1-p):0,entropy=H(s.p);
      return model({entropy,variance:s.p*(1-s.p)},[`H(p)=−p log₂p−(1−p)log₂(1−p)`,`二元熵 ≈ ${F(entropy)} bit`,`Bernoulli 變異數 ≈ ${F(s.p*(1-s.p))}`],graph([curve(H)],[0,1],[0,1.15],{points:[point(s.p,entropy,'目前不確定性')]}));
    },'兩種結果越均衡，平均資訊量越高。','比較 p 與 1−p 的不確定性。','熵與變異數的單位和定義不同。','用導數找出最大熵的位置。');

    // Linear algebra and geometry.
    define('studio-symmetric-eigenspaces','對稱矩陣與正交特徵方向','線性代數',[num('a','矩陣項 a',-2,3,2),num('b','矩陣項 b',-2,2,1),num('d','矩陣項 d',-2,3,1)],s=>{
      const gap=Math.hypot(s.a-s.d,2*s.b),l1=(s.a+s.d+gap)/2,l2=(s.a+s.d-gap)/2,t=.5*Math.atan2(2*s.b,s.a-s.d),u=point(Math.cos(t),Math.sin(t)),v=point(-Math.sin(t),Math.cos(t));
      return model({l1,l2,angle:t,trace:s.a+s.d,det:s.a*s.d-s.b*s.b},[`A=[${F(s.a)},${F(s.b)};${F(s.b)},${F(s.d)}]`,`特徵值 ≈ ${F(l1)}、${F(l2)}`,gap<1e-12?'重複特徵值：任意正交基皆可。':'兩個特徵方向互相垂直。'],geometry([point(0,0),point(u.x,u.y,'u₁'),point(v.x,v.y,'u₂',C[1]),point(l1*u.x,l1*u.y,'Au₁'),point(l2*v.x,l2*v.y,'Au₂',C[1])],{lines:[line(point(0,0),u),line(point(0,0),v,C[1]),line(u,point(l1*u.x,l1*u.y),C[2],true),line(v,point(l2*v.x,l2*v.y),C[2],true)]}));
    },'實對稱矩陣的伸縮方向可以選成正交基。','改變非對角項，觀察特徵方向如何旋轉。','重複特徵值時，特徵向量沒有唯一方向。','用跡與行列式核對兩個特徵值。');
    define('studio-singular-values','奇異值與單位圓影像','線性代數',[num('s1','第一伸縮尺度',.2,3,2),num('s2','第二伸縮尺度',.2,3,.8),angle('theta','左旋轉角 θ',30),angle('phi','右旋轉角 φ',45)],s=>{
      const t=s.theta*PI/180,p=s.phi*PI/180,ct=Math.cos(t),st=Math.sin(t),cp=Math.cos(p),sp=Math.sin(p),a=ct*s.s1*cp-st*s.s2*sp,b=-ct*s.s1*sp-st*s.s2*cp,c=st*s.s1*cp+ct*s.s2*sp,d=-st*s.s1*sp+ct*s.s2*cp,ps=parametric(q=>[a*Math.cos(q)+b*Math.sin(q),c*Math.cos(q)+d*Math.sin(q)],0,TAU),condition=Math.max(s.s1,s.s2)/Math.min(s.s1,s.s2);
      return model({a,b,c,d,condition,area:PI*s.s1*s.s2},[`A=[${F(a)},${F(b)};${F(c)},${F(d)}]`,`奇異值為 ${F(s.s1)}、${F(s.s2)}；條件數 ≈ ${F(condition)}`,`影像橢圓面積 ≈ ${F(PI*s.s1*s.s2)}`],geometry([], {x:range(ps.map(p=>p.x)),y:range(ps.map(p=>p.y)),lines:path(ps),circles:[{x:0,y:0,r:1,color:C[1]}],note:'右旋轉改變點的對應；左旋轉改變影像橢圓的方向。'}));
    },'線性變換可拆成旋轉、主軸伸縮與旋轉。','只改右旋轉角，觀察橢圓形狀是否改變。','奇異值是非負伸縮量，與一般特徵值不同。','用面積變化推導行列式的絕對值。');
    define('studio-matrix-power','三角矩陣的冪與耦合','線性代數',[num('a','第一對角項 a',-1.2,1.2,.8),num('b','耦合項 b',-1,1,.5),num('d','第二對角項 d',-1.2,1.2,.6),integer('n','矩陣冪 n',1,12,6)],s=>{
      let coupling=0;for(let j=0;j<s.n;j++)coupling+=s.b*s.a**(s.n-1-j)*s.d**j;const x=s.a**s.n+coupling,y=s.d**s.n,ps=[point(1,1)];for(let k=1;k<=s.n;k++){const p=ps.at(-1);ps.push(point(s.a*p.x+s.b*p.y,s.d*p.y));}
      return model({aPower:s.a**s.n,dPower:s.d**s.n,coupling,x,y},[`A=[a,b;0,d]；Aⁿ=[aⁿ, bΣaⁿ⁻¹⁻ʲdʲ;0,dⁿ]`,`耦合項 ≈ ${F(coupling)}`,`Aⁿ(1,1) ≈ (${F(x)},${F(y)})`],geometry(ps,{points:ps,lines:path(ps),note:'從向量 (1,1) 出發，反覆套用同一個三角矩陣。'}));
    },'非對角項會累積兩個主方向之間的耦合。','比較不同與相同對角項的累積方式。','即使兩個特徵值大小小於一，短期仍可能因耦合而放大。','在 a=d 時把耦合和式化簡。');
    define('studio-matrix-exponential','矩陣指數與連續旋轉','線性代數',[num('omega','旋轉速度 ω',-2,2,1),num('t','時間 t',0,3,1)],s=>{
      const q=s.omega*s.t,c=Math.cos(q),d=Math.sin(q),ps=parametric(q=>[Math.cos(q),Math.sin(q)],0,q,Math.max(40,Math.ceil(Math.abs(q)*30)));
      return model({c,d,angle:q,det:c*c+d*d},[`J=[0,−ω;ω,0]`,`exp(tJ)=[cos(ωt),−sin(ωt);sin(ωt),cos(ωt)]`,`位置 ≈ (${F(c)},${F(d)})；行列式 ≈ ${F(c*c+d*d)}`],geometry([point(0,0),point(c,d,'目前位置')],{x:[-1.3,1.3],y:[-1.3,1.3],lines:[...path(ps),line(point(0,0),point(c,d))],circles:[{x:0,y:0,r:1,color:C[1]}]}));
    },'連續線性系統的解由矩陣指數描述。','改變速度的符號，觀察旋轉方向。','矩陣指數不是逐項對矩陣元素取指數。','利用 J²=−ω²I 推導旋轉矩陣。');
    define('studio-quadratic-form','正定二次型與等值橢圓','線性代數',[num('l1','第一主曲率 λ₁',.2,3,1),num('l2','第二主曲率 λ₂',.2,3,2),num('level','等值高度 c',.5,4,2),angle('theta','主軸角 θ',30)],s=>{
      const t=s.theta*PI/180,a=Math.sqrt(s.level/s.l1),b=Math.sqrt(s.level/s.l2),ps=parametric(q=>[a*Math.cos(q)*Math.cos(t)-b*Math.sin(q)*Math.sin(t),a*Math.cos(q)*Math.sin(t)+b*Math.sin(q)*Math.cos(t)],0,TAU);
      return model({a,b,area:PI*a*b,minEigen:Math.min(s.l1,s.l2)},[`q=λ₁u²+λ₂v²=c`,`主半徑 ≈ ${F(a)}、${F(b)}`,`等值橢圓面積 ≈ ${F(PI*a*b)}`],geometry([], {x:range(ps.map(p=>p.x)),y:range(ps.map(p=>p.y)),lines:path(ps),note:'u、v 是旋轉後的主座標；正曲率確保等值線封閉。'}));
    },'正定二次型在主座標下就是兩個正平方項。','增大一個主曲率，觀察該方向的半徑。','本模組限制兩個特徵值為正；負值會改變等值線類型。','由二次型係數推導主半徑。');
    define('studio-householder','Householder 反射與正交性','線性代數',[angle('theta','單位法向角 θ',30),num('x','向量水平量',-3,3,2),num('y','向量垂直量',-3,3,1)],s=>{
      const t=s.theta*PI/180,nx=Math.cos(t),ny=Math.sin(t),dot=nx*s.x+ny*s.y,x=s.x-2*nx*dot,y=s.y-2*ny*dot,a=1-2*nx*nx,b=-2*nx*ny,d=1-2*ny*ny;
      return model({x,y,a,b,d,length:Math.hypot(x,y),det:a*d-b*b},[`H=I−2nnᵀ=[${F(a)},${F(b)};${F(b)},${F(d)}]`,`Hv ≈ (${F(x)},${F(y)})；|Hv|=|v| ≈ ${F(Math.hypot(x,y))}`,`det(H) ≈ ${F(a*d-b*b)}`],geometry([point(0,0),point(s.x,s.y,'v'),point(x,y,'Hv',C[1])],{lines:[line(point(-4*ny,4*nx),point(4*ny,-4*nx),C[2]),line(point(0,0),point(s.x,s.y)),line(point(0,0),point(x,y),C[1]),line(point(s.x,s.y),point(x,y),C[2],true)]}));
    },'減去兩倍法向投影，即為穿過鏡面的反射。','調整法向量方向，觀察鏡面與反射點。','n 必須是單位法向量；鏡面方向與 n 垂直。','驗證做兩次同一反射會回到原向量。');
    define('studio-least-squares','最小平方法與正交殘差','線性代數',[angle('theta','擬合方向角 θ',30),num('x','資料向量水平量',-3,3,2),num('y','資料向量垂直量',-3,3,2)],s=>{
      const t=s.theta*PI/180,ux=Math.cos(t),uy=Math.sin(t),coefficient=ux*s.x+uy*s.y,px=coefficient*ux,py=coefficient*uy,rx=s.x-px,ry=s.y-py;
      return model({coefficient,px,py,rx,ry,cost:rx*rx+ry*ry,orthogonality:ux*rx+uy*ry},[`最小化 |c u−b|²；|u|=1 時 c=uᵀb ≈ ${F(coefficient)}`,`投影 ≈ (${F(px)},${F(py)})`,`殘差平方 ≈ ${F(rx*rx+ry*ry)}；uᵀ殘差 ≈ ${F(ux*rx+uy*ry)}`],geometry([point(0,0),point(s.x,s.y,'資料 b'),point(px,py,'擬合',C[1])],{lines:[line(point(-4*ux,-4*uy),point(4*ux,4*uy),C[2]),line(point(0,0),point(s.x,s.y)),line(point(0,0),point(px,py),C[1]),line(point(px,py),point(s.x,s.y),C[2],true)]}));
    },'最佳擬合的誤差必須與可擬合方向垂直。','旋轉擬合方向，觀察殘差平方的變化。','本例只有一個單位方向；一般矩陣問題需解正常方程或用 QR。','從對 c 的導數推出投影公式。');
    define('studio-condition-sensitivity','條件數與解的敏感性','線性代數',[num('epsilon','矩陣差異 ε',.02,1,.2,.01),num('delta','資料擾動 δ',-.2,.2,.05,.01)],s=>{
      const y=s.delta/s.epsilon,x=2-y,gap=Math.hypot(s.epsilon,2),large=(2+s.epsilon+gap)/2,small=2*s.epsilon/(2+s.epsilon+gap),condition=large/small,max=Math.max(4,Math.abs(x)+2,Math.abs(y)+2);
      return model({x,y,condition,solutionChange:Math.SQRT2*Math.abs(s.delta/s.epsilon),large,small},[`A=[1,1;1,1+ε]；b=(2,2+δ)`,`解 ≈ (${F(x)},${F(y)})；κ₂(A) ≈ ${F(condition)}`,`相對於 δ=0 的解變化 ≈ ${F(Math.SQRT2*Math.abs(s.delta/s.epsilon))}`],graph([curve(t=>2-t),curve(t=>(2+s.delta-t)/(1+s.epsilon),C[1])],[-max,max],[-max,max],{points:[point(x,y,'交點')],note:'兩條直線越接近平行，小資料變化越可能產生大解變化。'}));
    },'接近奇異的矩陣會放大輸入擾動。','固定 δ，縮小 ε，觀察交點與條件數。','大條件數表示可能敏感，不表示每個方向的擾動都同樣放大。','由兩方程相減求出解的變化量。');
    return modules;
  }
  root.createStudioModules=create;
  if(typeof module!=='undefined'&&module.exports)module.exports=create;
})(typeof globalThis!=='undefined'?globalThis:this);
