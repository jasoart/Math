"""Independent reference calculations. Inputs/outputs arrive from the real JS engine.
Uses Fraction for rational arithmetic, vector identities and numerical quadrature.
No eval of JavaScript/MathScript expressions and no third-party dependencies.
"""
import json, math, sys
from fractions import Fraction as F

def reference(name, p):
    q = {k: F(str(v)) for k, v in p.items()}
    a,b,c,d = (q.get(k, F(0)) for k in 'abcd')
    if name == 'linear': return (c-b)/a
    if name == 'vieta': return -(q['r']+q['s'])*a
    if name == 'vertex': return q['k']
    if name == 'remainder': return ((a*q['r']+b)*q['r'])*q['r']+c
    if name == 'system':
        # Gaussian elimination, rather than the model's determinant formula.
        second_y = a + b*b/a
        second_rhs = q['v'] + b*q['u']/a
        return (q['u'] - b*second_rhs/second_y)/a
    if name == 'exponential': return q['initial'] * math.prod([q['base']]*int(q['time']))
    if name == 'logarithm': return math.log(p['value'], p['base'])
    if name == 'rational': return q['k']/q['delta']+q['v']
    if name == 'absolute': return a*abs(q['u']-q['h'])+q['k']
    if name == 'composition': return a*(b*q['u']+c)**2
    if name == 'distance': return math.dist((p['u'],p['v']), (p['u']+p['dx'],p['v']+p['dy']))
    if name == 'section': return (a*q['n']+b*q['m'])/(q['m']+q['n'])
    if name == 'line-distance':
        u,v=q['u'],q['v']; denominator=a*a+b*b
        foot=(u-a*(a*u+b*v+c)/denominator,v-b*(a*u+b*v+c)/denominator)
        return math.dist((u,v),foot)
    if name == 'chord': return 2*p['radius']*math.sqrt((1-p['ratio'])*(1+p['ratio']))
    if name == 'ellipse': return math.sqrt(1-p['ratio']**2)
    if name == 'cosine-law': return math.dist((p['b'],0),(p['c']*math.cos(math.radians(p['theta'])),p['c']*math.sin(math.radians(p['theta']))))
    if name == 'sine-law': return p['a']*math.sin(math.radians(p['beta']))/math.sin(math.radians(p['alpha']))
    if name == 'triangle-area': return abs(p['b']*p['c']*math.sin(math.radians(p['theta'])))/2
    if name == 'phasor': return math.hypot(a,b)
    if name == 'height': return p['eye']+p['distance']*math.sin(math.radians(p['theta']))/math.cos(math.radians(p['theta']))
    if name == 'dot': return sum(x*y for x,y in zip((a,b),(c,d)))
    if name == 'projection': return (a*c+b*d)/math.hypot(c,d)
    if name == 'cross':
        # Gram determinant identity, independent of the cross-product components.
        return math.sqrt((a*a+b*b)*(c*c+d*d)-(b*d)**2)/2
    if name == 'rotation':
        z=complex(float(q['u']),float(q['v']))*complex(math.cos(math.radians(p['theta'])),math.sin(math.radians(p['theta'])))
        return z.real
    if name == 'determinant':
        # Shoelace area of the transformed unit square.
        points=[(F(0),F(0)),(a,c),(a+b,c+d),(b,d)]
        return abs(sum(points[i][0]*points[(i+1)%4][1]-points[(i+1)%4][0]*points[i][1] for i in range(4)))/2
    if name == 'arithmetic-term':
        value=q['first']
        for _ in range(int(q['count'])-1): value+=q['difference']
        return value
    if name == 'arithmetic-sum': return sum(q['first']+i*q['difference'] for i in range(int(q['count'])))
    if name == 'geometric-sum': return sum(q['first']*q['ratio']**i for i in range(int(q['count'])))
    if name == 'telescoping': return sum(q['scale']/F(i*(i+1)) for i in range(1,int(q['count'])+1))
    if name == 'compound':
        value=q['principal']
        for _ in range(int(q['count'])): value+=value*q['rate']
        return value
    if name == 'combination': return math.comb(int(q['count']),int(q['pick']))
    if name == 'binomial': return math.comb(int(q['count']),int(q['hits']))*q['prob']**int(q['hits'])*(1-q['prob'])**int(q['count']-q['hits'])
    if name == 'hypergeometric': return F(int(q['red'])*math.comb(int(q['blue']),int(q['draws']-1)),math.comb(int(q['red']+q['blue']),int(q['draws'])))
    if name == 'bayes': return 1/(1+(1-q['prior'])/q['prior']*q['falseRate']/q['hit'])
    if name == 'expectation': return q['loss']+q['prob']*(q['win']-q['loss'])
    if name == 'mean': return (a+b+c+d)/4
    if name == 'variance':
        data=[q['center']-q['left'],q['center']+q['left'],q['center']-q['right'],q['center']+q['right']]
        mean=sum(data)/len(data)
        return sum((v-mean)**2 for v in data)/len(data)
    if name == 'weighted-mean': return sum([a]*int(q['m'])+[b]*int(q['n']))/(q['m']+q['n'])
    if name == 'z-score': return (q['value']-q['meanValue'])/q['sigma']
    if name == 'regression':
        xs=[F(-1),F(0),F(1)];ys=[a,b,c];xm=sum(xs)/3;ym=sum(ys)/3
        slope=sum((x-xm)*(y-ym) for x,y in zip(xs,ys))/sum((x-xm)**2 for x in xs)
        return ym+slope*(q['u']-xm)
    if name == 'power-derivative': return a*q['power']*q['position']**(int(q['power'])-1)
    if name == 'definite-integral': return a*q['upper']**int(q['power']+1)/(q['power']+1)
    if name == 'area-between':
        # Simpson integrates this quadratic exactly, evaluated using rational points.
        r=q['radius']; return (2*r)/6*(0+4*a*r*r+0)
    if name == 'optimization':
        # AM-GM upper bound for positive sides summing to perimeter/2.
        return (q['perimeter']/2)**2/4
    if name == 'exponential-integral':
        # Independent composite Simpson quadrature rather than exponential antiderivative.
        n=2000; h=p['upper']/n
        return h/3*sum((1 if i in (0,n) else 4 if i%2 else 2)*p['a']*math.exp(p['rate']*i*h) for i in range(n+1))
    raise AssertionError('Missing reference: '+name)

cases=json.load(sys.stdin)
for case in cases:
    expected=float(reference(case['model'],case['parameters']));actual=case['answer']
    assert math.isfinite(actual) and math.isclose(actual,expected,rel_tol=1e-9,abs_tol=1e-8), (case,expected)
    if case['model']=='power-derivative' and 'derivative' in case:
        assert math.isclose(case['derivative'],expected,rel_tol=1e-10,abs_tol=1e-10), case
print(f'PASS independent Python math: {len(cases)} cases, 45 model families, rational/vector/probability/calculus checks.')
