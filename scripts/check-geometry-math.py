#!/usr/bin/env python3
"""Independent exact spatial-geometry fixtures (standard library only).

Uses Fraction arithmetic, signed permutation determinants and constructed
orthogonal geometry, rather than reusing the JavaScript implementation.
"""
import itertools
import json
import math
import random
import sys
from fractions import Fraction as Q

fixtures = []
checks = 0


def check(value):
    global checks
    assert value
    checks += 1


def dot(a, b):
    return sum(x*y for x, y in zip(a, b))


def cross(a, b):
    return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]


def add(a, b):
    return [x+y for x, y in zip(a, b)]


def mul(a, k):
    return [x*k for x in a]


def norm(a):
    return math.sqrt(dot(a, a))


def floats(values):
    return [float(x) for x in values]


def case(method, args, expected):
    fixtures.append(dict(method=method, args=args, expected=expected))


def determinant(rows):
    result = 0
    for p in itertools.permutations(range(3)):
        inversions = sum(p[i] > p[j] for i in range(3) for j in range(i+1, 3))
        result += (-1)**inversions*math.prod(rows[i][p[i]] for i in range(3))
    return result


rng = random.Random(78143)
point = dict(type='point', position=[1, 2, 3])
plane = dict(type='plane', normal=[2, -1, 1], constant=4)
case('pointPlane', [point, plane], dict(distance=1/math.sqrt(6), foot=[4/3, 11/6, 19/6], exact='1/sqrt(6)'))

for _ in range(40):
    p = [Q(rng.randint(-12, 12), rng.choice([1, 2, 4])) for _ in range(3)]
    n = [rng.randint(-5, 5) for _ in range(3)]
    if not any(n):
        n[0] = 1
    d = Q(rng.randint(-10, 10), rng.choice([1, 2, 4]))
    residual = dot(p, n)-d
    squared = dot(n, n)
    h = [x-residual*k/squared for x, k in zip(p, n)]
    check(dot(h, n) == d)
    check(dot([x-y for x, y in zip(p, h)], n) == residual)
    case('pointPlane', [dict(type='point', position=floats(p)), dict(type='plane', normal=n, constant=float(d))],
         dict(distance=float(abs(residual))/math.sqrt(squared), foot=floats(h)))

# Construct skew lines from their known common perpendicular. Their supplied
# starting points are offset along the lines, making parameter signs observable.
for _ in range(35):
    u = [rng.randint(-4, 4) for _ in range(3)]
    v = [rng.randint(-4, 4) for _ in range(3)]
    n = cross(u, v)
    if not any(n):
        continue
    A = [rng.randint(-5, 5) for _ in range(3)]
    k = rng.choice([-2, -1, 1, 2])
    B = add(A, mul(n, k))
    s, t = rng.randint(-3, 3), rng.randint(-3, 3)
    a, b = add(A, mul(u, -s)), add(B, mul(v, -t))
    check(dot(n, u) == dot(n, v) == 0)
    case('linePair', [dict(type='line', point=a, direction=u), dict(type='line', point=b, direction=v)],
         dict(status='skew', distance=abs(k)*norm(n), feet=[A, B], parameters=[s, t]))

case('linePair', [dict(type='line', point=[0, 0, 0], direction=[1, 2, 3]),
                  dict(type='line', point=[3, 6, 9], direction=[-2, -4, -6])], dict(status='coincident', distance=0))
case('linePair', [dict(type='line', point=[0, 0, 0], direction=[1, 0, 0]),
                  dict(type='line', point=[0, 3, 4], direction=[-2, 0, 0])], dict(status='parallel', distance=5))
case('linePair', [dict(type='line', point=[1, 2, 3], direction=[1, 0, 0]),
                  dict(type='line', point=[1, -2, 3], direction=[0, 1, 0])], dict(status='intersecting', distance=0, intersection=[1, 2, 3]))

for _ in range(25):
    normals = [[rng.randint(-4, 4) for _ in range(3)] for _ in range(3)]
    if determinant(normals) == 0:
        continue
    p = [rng.randint(-6, 6) for _ in range(3)]
    constants = [dot(n, p) for n in normals]
    # Cramer's rule using permutation determinants independently certifies p.
    for col in range(3):
        replaced = [[constants[i] if j == col else normals[i][j] for j in range(3)] for i in range(3)]
        check(Q(determinant(replaced), determinant(normals)) == p[col])
    case('threePlanes', [[dict(type='plane', normal=n, constant=d) for n, d in zip(normals, constants)]],
         dict(status='unique', rank=3, point=p))

case('threePlanes', [[dict(type='plane', normal=[1, 0, 0], constant=2), dict(type='plane', normal=[0, 1, 0], constant=3), dict(type='plane', normal=[2, 0, 0], constant=4)]], dict(status='infinite', rank=2, point=[2, 3, 0]))
case('threePlanes', [[dict(type='plane', normal=[1, 0, 0], constant=2), dict(type='plane', normal=[0, 1, 0], constant=3), dict(type='plane', normal=[2, 0, 0], constant=5)]], dict(status='inconsistent'))

for z, status, radius in [(3, 'circle', 5), (4, 'circle', math.sqrt(24)), (8, 'tangent', 0), (9, 'disjoint', None)]:
    case('spherePlane', [dict(type='sphere', center=[1, -2, 3], radius=5), dict(type='plane', normal=[0, 0, 1], constant=z)],
         dict(status=status, radius=radius, center=[1, -2, z]))

for _ in range(25):
    edges = [[rng.randint(-4, 4) for _ in range(3)] for _ in range(3)]
    d = determinant(edges)
    if not d:
        continue
    p = [rng.randint(-3, 3) for _ in range(3)]
    tetra = dict(type='polyhedron', kind='tetrahedron', points=[p]+[add(p, v) for v in edges])
    case('volume', [tetra], dict(volume=abs(d)/6))
    case('volume', [dict(type='parallelepiped', origin=p, u=edges[0], v=edges[1], w=edges[2])], dict(volume=abs(d)))

# Washer and disk volumes are analytic integrals of polynomial cross sections.
for expression, inner, interval, expected in [('sqrt(x)', '0', [0, 4], 8), ('x', '0', [0, 3], 9),
                                             ('2', '1', [0, 5], 15), ('x^2', '0', [0, 2], Q(32, 5)),
                                             ('1+x', 'x', [0, 2], 6)]:
    case('revolutionVolume', [dict(type='revolution', expression=expression, innerExpression=inner, domain=interval, axis='x')],
         dict(status='regular', volume=float(expected)*math.pi))
    check(float(expected) > 0)

case('polyhedronPlane', [dict(type='box', origin=[0, 0, 0], size=[2, 3, 4]), dict(type='plane', normal=[0, 0, 1], constant=2)], dict(status='polygon', area=6))
case('polyhedronPlane', [dict(type='box', origin=[0, 0, 0], size=[2, 3, 4]), dict(type='plane', normal=[0, 0, 1], constant=5)], dict(status='disjoint', area=0))
case('polyhedronPlane', [dict(type='tetrahedron', points=[[0, 0, 0], [2, 0, 0], [0, 2, 0], [0, 0, 2]]), dict(type='plane', normal=[0, 0, 1], constant=1)], dict(status='polygon', area=Q(1, 2)))

for _ in range(12):
    u, v = rng.uniform(-math.pi, math.pi), rng.uniform(0, 3)
    point = [v*math.cos(u), v*math.sin(u), v]
    check(math.isclose(point[0]**2+point[1]**2, point[2]**2, rel_tol=1e-12))
    case('evaluate', [dict(type='parametricSurface', expressions=['v*cos(u)', 'v*sin(u)', 'v'], domains=[[-math.pi, math.pi], [0, 3]]), dict(u=u, v=v)], point)
    theta, phi = rng.uniform(-math.pi, math.pi), rng.uniform(-math.pi/2, math.pi/2)
    sphere_point = [1+3*math.cos(theta)*math.cos(phi), -2+3*math.sin(theta)*math.cos(phi), 3+3*math.sin(phi)]
    check(math.isclose(sum((x-c)**2 for x, c in zip(sphere_point, [1, -2, 3])), 9, rel_tol=1e-12))
    case('evaluate', [dict(type='parametricSurface', expressions=['1+3cos(u)cos(v)', '-2+3sin(u)cos(v)', '3+3sin(v)']), dict(u=theta, v=phi)], sphere_point)


def serializable(value):
    if isinstance(value, Q):
        return float(value)
    raise TypeError(type(value).__name__)


if '--json' in sys.argv:
    print(json.dumps(dict(checks=checks, fixtures=fixtures), ensure_ascii=False, default=serializable))
else:
    print(f'Independent Python geometry verification: {checks} exact checks, {len(fixtures)} fixtures.')
