#!/usr/bin/env python3
"""Independent reference values: fractions, geometry and exhaustive counting.

No third-party dependencies. --json supplies fixtures to the JavaScript suite.
"""
import itertools
import json
import math
import sys
from fractions import Fraction as Q

fixtures = []
checks = 0


def case(identifier, state, **expected):
    fixtures.append(dict(id=identifier, state=state, expected=expected))


def check(condition):
    global checks
    assert condition
    checks += 1


def close(a, b):
    check(math.isclose(a, b, rel_tol=1e-10, abs_tol=1e-10))


sqrt, pi = math.sqrt, math.pi
case('quadratic-root-location', dict(b=-3, c=2, q=1), delta=1, roots=[1, 2], left=0, right=1)
case('quadratic-root-location', dict(b=0, c=1, q=0), roots=[], left=0, right=0)
case('vieta-product-locus', dict(S=6, t=2), a=1, b=5, product=5, maximum=9)
case('quadratic-sign-intervals', dict(a=1, r=1, t=3, q=2), value=-1, sign='負')
case('rational-sign-chart', dict(a=1, b=3, c=1, q=2), value=-1, removable=True, limit=-2)
case('rational-sign-chart', dict(a=1, b=3, c=1, q=1), value=None)
case('absolute-distance-sum', dict(a=1, b=5, k=4), minimum=4, kind='interval', solutions=[1, 5])
case('absolute-distance-sum', dict(a=1, b=5, k=6), kind='two', solutions=[0, 6])
case('reciprocal-minimum', dict(k=8, x=2), optimum=2*sqrt(2), minimum=4*sqrt(2), value=6)
case('logarithmic-equation-domain', dict(b=2, h=1, k=3), root=9)
case('logarithmic-equation-domain', dict(b=1, h=1, k=3), valid=False)
case('exponential-half-life', dict(N=80, H=3, t=9), ratio=.125, remaining=10)
ssa = [4*sqrt(3)-3, 4*sqrt(3)+3]
for c in ssa:
    close(c*c+8*8-2*c*8*math.cos(pi/6), 25)
case('sine-law-ssa', dict(a=5, b=8, A=30), count=2, sides=ssa, altitude=4)
case('sine-law-ssa', dict(a=4, b=8, A=30), count=1, sides=[4*sqrt(3)])
case('sine-law-ssa', dict(a=2, b=8, A=30), count=0)
case('triangle-included-area', dict(a=3, b=4, C=90), area=6, maximum=6)
case('triangle-included-area', dict(a=3, b=4, C=180), area=0)
case('trig-double-angle', dict(theta=30), sin=sqrt(3)/2, cos=.5)
case('trig-half-angle-sign', dict(theta=450), sin=-sqrt(2)/2, cos=-sqrt(2)/2, magnitude=sqrt(2)/2)
case('trig-addition-rotation', dict(a=45, b=30, op='plus'), sin=(sqrt(6)+sqrt(2))/4, cos=(sqrt(6)-sqrt(2))/4)
case('two-station-height', dict(d=10, a=30, b=60), height=5*sqrt(3), x=5)
case('two-station-height', dict(d=10, a=60, b=30), valid=False)
# Intersect the sum of unit side directions with the base, independently of ratios.
dx, dy = -1/sqrt(2)+4/5, -1/sqrt(2)-3/5
bd = -3/dy*dx+3
close(bd/(7-bd), 3*sqrt(2)/5)
case('triangle-angle-bisector', dict(b=3, c=4, h=3), bd=bd, dc=7-bd)
case('triangle-median-identity', dict(b=3, c=4, h=3), median=sqrt(37)/2, lhs=43, rhs=43)
case('triangle-three-centers', dict(b=3, c=3, h=3), centroid=dict(x=0, y=1), circumcenter=dict(x=0, y=0), inradius=3*(sqrt(2)-1), radius=3)
case('circle-point-power', dict(r=3, p=5, theta=0), power=16, distances=[-8, -2], product=16, tangent=4)
case('circle-common-tangents', dict(R=3, r=1, d=5), count=4, external=sqrt(21), internal=3)
case('circle-common-tangents', dict(R=1, r=1, d=0), coincident=True, count=None)
for d, count in [(0, 0), (1, 0), (2, 1), (3, 2), (4, 3), (5, 4)]:
    case('circle-common-tangents', dict(R=3, r=1, d=d), count=count)
case('circle-inscribed-angle', dict(theta=100, phi=180), value=50)
case('circle-inscribed-angle', dict(theta=100, phi=0), value=130)
case('circle-inscribed-angle', dict(theta=100, phi=50), valid=False, value=None)
case('reflection-shortest-path', dict(a=2, b=4, q=0), optimum=-1, shortest=6*sqrt(2), current=sqrt(13)+5)
case('similarity-length-area', dict(b=3, h=4, k=1.5), perimeter=12, area=6, scaledPerimeter=18, scaledArea=13.5)
case('space-point-line-projection', dict(x=1, y=2, z=3, a=0, b=0), foot=[1, 0, 0], distance=sqrt(13), perpendicular=0)
case('sphere-plane-section-radius', dict(R=5, d=3), radius=4, area=16*pi, kind='circle')
case('sphere-plane-section-radius', dict(R=5, d=6), radius=None, area=0, kind='empty')
case('sphere-plane-section-radius', dict(R=5, d=5), radius=0, area=0, kind='point')
# Exact determinant of the diagonal intercept vectors; tetrahedron is 1/6.
tetrahedron = Q(2*3*4, 6)
check(tetrahedron == 4)
case('tetrahedron-intercept-volume', dict(a=2, b=3, c=4), volume=float(tetrahedron), baseArea=3)
case('space-vector-coplanarity', dict(x=2, y=5, z=3), triple=0, distance=0, coplanar=True)
case('space-vector-coplanarity', dict(x=2, y=4, z=3), triple=1, distance=1/sqrt(3), coplanar=False)
for n in (1, 9, 40):
    value = sum(Q(1, k*(k+1)) for k in range(1, n+1))
    check(value == Q(n, n+1))
    case('telescoping-fraction-series', dict(n=n), value=float(value), exact=f'{n}/{n+1}')
case('arithmetic-geometric-weighted-sum', dict(r=.5, n=4), total=float(Q(13, 4)), partial=[1, 2, 2.75, 3.25])
case('arithmetic-geometric-weighted-sum', dict(r=1, n=25), total=325)
for r, kind in [(-.5, 'zero'), (-1, 'oscillating'), (-1.5, 'unbounded-oscillation'), (1, 'one'), (1.5, 'positive-infinity')]:
    case('geometric-sequence-convergence', dict(r=r, n=5), kind=kind)
case('quadratic-sequence-differences', dict(a=1, b=2, c=0, n=4), values=[3, 8, 15, 24], first=[5, 7, 9], second=[2, 2])
# Enumerate distinct permutations, rotate to a canonical minimum representative.
for n in range(3, 8):
    rotations = set()
    for p in itertools.permutations(range(n)):
        j = p.index(0)
        rotations.add(p[j:] + p[:j])
    check(len(rotations) == math.factorial(n-1))
    case('circular-permutation-rotation', dict(n=n, seats='free'), count=len(rotations))
# Exhaustive subsets supply a reference independent of the compressed-space formula.
for n in range(3, 11):
    for k in range(min(n, 5)+1):
        line = circle = 0
        for xs in itertools.combinations(range(n), k):
            if any(b-a == 1 for a, b in zip(xs, xs[1:])):
                continue
            line += 1
            if not (k > 1 and xs[0] == 0 and xs[-1] == n-1):
                circle += 1
        case('nonadjacent-position-selection', dict(n=n, k=k, shape='line'), lineCount=line, circleCount=circle, count=line)
        case('nonadjacent-position-selection', dict(n=n, k=k, shape='circle'), count=circle)
for n in range(1, 8):
    counts = [0]*(n+1)
    for p in itertools.permutations(range(n)):
        counts[sum(i == v for i, v in enumerate(p))] += 1
    check(sum(counts) == math.factorial(n))
    case('derangements-fixed-points', dict(n=n), counts=counts, derangement=counts[0], total=sum(counts))
case('three-set-inclusion-exclusion', dict(a=4, b=3, c=2, ab=2, ac=1, bc=3, abc=1), A=8, B=9, C=7, pairSum=9, union=16)
for n in range(9):
    for k in range(2, 5):
        for cap in range(4):
            solutions = [v for v in itertools.product(range(cap+1), repeat=k) if sum(v) == n]
            counts = [sum(v[0] == x for v in solutions) for x in range(cap+1)]
            case('bounded-stars-bars', dict(n=n, k=k, m=cap), total=len(solutions), inclusionExclusion=len(solutions), counts=counts)
# Dynamic path walk counts compare against the module's closed combination formula.
for m in range(5):
    for n in range(5):
        for a, b in [(0, 0), (1, 1), (m, n), (5, 5)]:
            dp = [[0]*(n+1) for _ in range(m+1)]
            for x in range(m+1):
                for y in range(n+1):
                    if (x, y) == (a, b):
                        continue
                    dp[x][y] = 1 if (x, y) == (0, 0) else (dp[x-1][y] if x else 0) + (dp[x][y-1] if y else 0)
            case('lattice-path-forbidden-point', dict(m=m, n=n, a=a, b=b), count=dp[m][n])
distinct = math.prod(Q(365-k, 365) for k in range(23))
check(.5072 < 1-distinct < .5074)
case('birthday-collision-probability', dict(n=23, days=365), probability=float(1-distinct))
case('birthday-collision-probability', dict(n=10, days=5), probability=1)
case('monty-hall-generalized', dict(n=5), stay=.2, change=.8)
for replace in (True, False):
    draws = list(itertools.product(range(5), repeat=2) if replace else itertools.combinations(range(5), 2))
    values = [Q(sum(sum(ball < 3 for ball in draw) == k for draw in draws), len(draws)) for k in range(3)]
    mean = sum(k*p for k, p in enumerate(values))
    variance = sum((k-mean)**2*p for k, p in enumerate(values))
    case('replacement-vs-no-replacement', dict(R=3, B=2, n=2, mode='replace' if replace else 'without'), values=list(map(float, values)), mean=float(mean), variance=float(variance), probabilitySum=1)
case('replacement-vs-no-replacement', dict(R=1, B=0, n=2, mode='without'), valid=False)
case('conditional-expected-successes', dict(p=.5, q=.5), event=.75, mean=4/3, values=[2/3, 1/3])
case('conditional-expected-successes', dict(p=0, q=0), event=0, mean=None)
case('least-squares-residual-cost', dict(m=1, b=1, outlier=3), slope=1, intercept=1, cost=0, minimum=0)
case('least-squares-residual-cost', dict(m=1.4, b=1.4, outlier=5), slope=1.4, intercept=1.4, cost=1.6, minimum=1.6)
X, Z = [-2, -1, 0, 1, 2], [1, -2, 2, -2, 1]
Y = [-x+z for x, z in zip(X, Z)]
var = lambda xs: sum((Q(x)-sum(map(Q, xs))/len(xs))**2 for x in xs)/len(xs)
cov = sum(Q(x*y, 5) for x, y in zip(X, Y))
check(var([x+y for x, y in zip(X, Y)]) == var(X)+var(Y)+2*cov)
case('variance-sum-covariance', dict(a=-1, b=1), varX=float(var(X)), varY=float(var(Y)), covariance=float(cov), varianceSum=float(var(Z)))
case('rationalization-difference-quotient', dict(a=4, h=0), value=.25, limit=.25, direct=None)
case('removable-hole-function-value', dict(a=2, v=7), limit=4, value=7, continuous=False)
case('removable-hole-function-value', dict(a=2, v=4), continuous=True)
case('mean-value-parallel-tangent', dict(a=0, width=2), slope=1, candidates=[2/sqrt(3)])
case('power-cusp-differentiability', dict(p=1.5, h=.25), right=.5, left=-.5, differentiable=True, derivative=0)
case('power-cusp-differentiability', dict(p=1, h=.25), right=1, left=-1, differentiable=False, derivative=None)
case('velocity-signed-distance', dict(v=2, a=-1, T=4), displacement=0, distance=4, turn=2)
case('integral-average-height', dict(a=0, width=3, c=0), integral=9, average=3, rectangleArea=9)
case('washer-conical-volume', dict(a=1, k=.5, b=2, u=.5), coefficient=2, volume=2*pi, outer=1, inner=.5, crossSection=.75*pi)
case('parabola-tangent-normal', dict(t=1), slope=2, normal=-.5, point=[1, 1])
case('parabola-tangent-normal', dict(t=0), slope=0, normal=None)
# Independent high-resolution trapezoids check analytic calculus examples.
def quadrature(f, a, b, n=10000):
    h = (b-a)/n
    return h*(sum(f(a+i*h) for i in range(1, n))+(f(a)+f(b))/2)

check(abs(quadrature(lambda t: abs(2-t), 0, 4)-4) < 1e-8)
check(abs(quadrature(lambda x: x*x, 0, 3)-9) < 1e-6)
check(abs(quadrature(lambda x: pi*(x*x-(x/2)**2), 0, 2)-2*pi) < 1e-6)
check(len({f['id'] for f in fixtures}) == 50)

if '--json' in sys.argv:
    print(json.dumps(dict(fixtures=fixtures, checks=checks), ensure_ascii=False))
else:
    print(f'PASS Python reference: {checks} independent identities and {len(fixtures)} fixtures across all 50 new modules')
