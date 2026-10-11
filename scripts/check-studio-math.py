#!/usr/bin/env python3
"""Independent scalar references and invariants for every studio model.

The browser models are sampled by Node; Python computes references from analytic
identities, numerical calculus and independent matrix/vector operations.
"""
import json
import math
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
PI = math.pi
TAU = math.tau
checks = 0


def close(actual, expected, label, relative=2e-9, absolute=2e-10):
    global checks
    assert math.isfinite(actual) and math.isfinite(expected), label
    assert math.isclose(actual, expected, rel_tol=relative, abs_tol=absolute), f'{label}: {actual} != {expected}'
    checks += 1


def require(condition, label):
    global checks
    assert condition, label
    checks += 1


def multiply(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(2)) for j in range(2)] for i in range(2)]


def rotation(angle):
    c, s = math.cos(angle), math.sin(angle)
    return [[c, -s], [s, c]]


def poisson(k, rate):
    return math.exp(-rate) * rate ** k / math.factorial(k)


def integrate(fn, a, b, n=1024):
    h = (b - a) / n
    return h / 3 * (fn(a) + fn(b) + sum((4 if k % 2 else 2) * fn(a + k * h) for k in range(1, n)))


def reference(identifier, s, actual):
    key = identifier.removeprefix('studio-')
    if key == 'bisection':
        root = s['a'] ** (1 / 3)
        bound = 3 / 2 ** (s['n'] + 1)
        require(abs(actual['estimate'] - root) <= bound + 1e-14, 'bisection certified interval')
        cell = math.floor(root / (2 * bound))
        return dict(root=root, bound=bound, estimate=(cell + .5) * 2 * bound, error=abs(actual['estimate'] - root))
    if key == 'fixed-point':
        values = [s['x0']]
        for _ in range(s['n']):
            values.append(s['a'] * math.cos(values[-1]))
        lo, hi = 0., s['a']
        for _ in range(60):
            mid = (lo + hi) / 2
            if mid > s['a'] * math.cos(mid):
                hi = mid
            else:
                lo = mid
        bound = s['a'] / (1 - s['a']) * abs(values[-1] - values[-2])
        require(abs(actual['estimate'] - (lo + hi) / 2) <= bound + 2e-14, 'fixed point posterior error bound')
        return dict(estimate=values[-1], bound=bound, residual=abs(values[-1] - s['a'] * math.cos(values[-1])))
    if key == 'secant':
        a, b = s['x0'], 3.
        for _ in range(s['n']):
            if abs(b * b - a * a) < 1e-14:
                break
            a, b = b, (a * b + s['a']) / (a + b)
        return dict(estimate=b, root=math.sqrt(s['a']), error=abs(b - math.sqrt(s['a'])))
    if key == 'finite-difference':
        x, h = s['x'], s['h']
        forward = 2 * math.sin(h / 2) * math.cos(x + h / 2) / h
        central = math.cos(x) * math.sin(h) / h
        exact = math.cos(x)
        return dict(forward=forward, central=central, exact=exact, forwardError=abs(forward - exact), centralError=abs(central - exact))
    if key == 'simpson':
        n, b = 2 * s['m'], s['b']
        exact, error = b ** 5 / 5, 2 * b * (b / n) ** 4 / 15
        return dict(n=n, exact=exact, error=error, approximate=exact + error)
    if key == 'trapezoid':
        b, h = s['b'], s['b'] / s['n']
        approximate = h * (math.expm1(b + h) / math.expm1(h) - (1 + math.exp(b)) / 2)
        exact = math.expm1(b)
        require(actual['error'] >= 0, 'convex trapezoid overestimate')
        return dict(exact=exact, approximate=approximate, error=approximate - exact)
    if key == 'quadratic-interpolation':
        a, x = s['a'], s['x']
        nodes = [-a, 0, a]
        value = sum(math.cos(z) * math.prod((x - other) / (z - other) for other in nodes if other != z) for z in nodes)
        coefficient = -2 * (math.sin(a / 2) / a) ** 2
        return dict(coefficient=coefficient, value=value, exact=math.cos(x), error=value - math.cos(x))
    if key == 'gradient-descent':
        last = s['x0']
        for _ in range(s['n']):
            last -= s['eta'] * s['a'] * last
        require(abs(1 - s['eta'] * s['a']) < 1, 'gradient iteration contracts in supported domain')
        return dict(factor=1 - s['eta'] * s['a'], last=last, energy=s['a'] * last * last / 2)
    if key == 'beats':
        return dict(beatPeriod=TAU / s['delta'], beatFrequency=s['delta'] / TAU, omega1=s['omega'] - s['delta'] / 2, omega2=s['omega'] + s['delta'] / 2)
    if key in ['fourier-square', 'fourier-sawtooth']:
        harmonics = range(1, 2 * s['n'], 2) if key == 'fourier-square' else range(1, s['n'] + 1)
        value = sum((4 / PI if key == 'fourier-square' else 2 * (-1) ** (k + 1)) * math.sin(k * s['x']) / k for k in harmonics)
        exact = 1 if key == 'fourier-square' else s['x']
        return dict(value=value, exact=exact, error=value - exact)
    if key == 'damped-wave':
        amplitude = math.exp(-s['gamma'] * s['t'])
        return dict(value=amplitude * math.cos(s['omega'] * s['t']), amplitude=amplitude, halfLife=math.log(2) / s['gamma'])
    if key == 'gaussian-width':
        width = 2 * math.sqrt(math.log(4)) * s['sigma']
        peak = 1 / math.sqrt(TAU * s['sigma'] ** 2)
        close(math.exp(-.5 * (width / (2 * s['sigma'])) ** 2), .5, 'Gaussian half maximum')
        return dict(width=width, peak=peak, variance=s['sigma'] ** 2)
    if key == 'sigmoid':
        z = math.exp(s['k'] * (s['x'] - s['c']))
        value, slope = z / (1 + z), s['k'] * z / (1 + z) ** 2
        require(actual['slope'] <= s['k'] / 4 + 1e-14, 'sigmoid maximum derivative')
        return dict(value=value, slope=slope, maxSlope=s['k'] / 4)
    if key == 'wave-packet':
        return dict(period=TAU / s['k'], width=2 * math.sqrt(math.log(4)) * s['sigma'], centerValue=1)
    if key == 'discrete-convolution':
        values = [0] * (s['n'] + s['m'] - 1)
        for a in range(s['n']):
            for b in range(s['m']):
                values[a + b] += 1
        return dict(values=values, mass=sum(values), peak=max(values))
    if key == 'logistic-map':
        value = s['x0']
        for _ in range(s['n']):
            value = s['r'] * value * (1 - value)
        fixed = (s['r'] - 1) / s['r']
        close(s['r'] * fixed * (1 - fixed), fixed, 'logistic fixed point')
        return dict(last=value, fixed=fixed, multiplier=s['r'] * (1 - 2 * fixed))
    if key == 'discrete-decay':
        last = s['a']
        for _ in range(s['n']):
            last *= s['q']
        half = math.log(.5, s['q'])
        require(s['q'] ** math.ceil(half) <= .5 + 1e-14, 'first discrete half life')
        return dict(last=last, halfLife=half, ratio=s['q'])
    if key == 'affine-recursion':
        last = s['x0']
        for _ in range(s['n']):
            last = s['q'] * last + s['b']
        fixed = s['b'] / (1 - s['q'])
        return dict(fixed=fixed, last=last, error=last - fixed)
    if key == 'harmonic-phase':
        t = math.radians(s['theta'])
        return dict(x=s['A'] * math.cos(t), v=-s['A'] * s['omega'] * math.sin(t), energy=(s['A'] * s['omega']) ** 2 / 2)
    if key == 'pendulum-energy':
        t = math.radians(s['theta'])
        energy = s['v'] ** 2 / 2 + 2 * s['g'] * math.sin(t / 2) ** 2
        return dict(energy=energy, barrier=2 * s['g'], theta=t, velocity=s['v'])
    if key in ['euler-growth', 'midpoint-decay']:
        h, last = s['T'] / s['n'], 1.
        rate = s['a'] if key == 'euler-growth' else -s['a']
        for _ in range(s['n']):
            slope = rate * last
            if key == 'midpoint-decay':
                slope = rate * (last + h * slope / 2)
            last += h * slope
        exact = math.exp(rate * s['T'])
        factor = 1 + rate * h + (0 if key == 'euler-growth' else (rate * h) ** 2 / 2)
        return dict(last=last, exact=exact, error=last - exact, factor=factor)
    if key == 'predator-nullclines':
        x, y = s['gamma'] / s['delta'], s['alpha'] / s['beta']
        close(x * (s['alpha'] - s['beta'] * y), 0, 'prey equilibrium derivative')
        close(y * (s['delta'] * x - s['gamma']), 0, 'predator equilibrium derivative')
        determinant = s['beta'] * x * s['delta'] * y
        return dict(x=x, y=y, period=TAU / math.sqrt(determinant))
    if key in ['bezier-quadratic', 'bezier-cubic']:
        points = [(-2, 0), (0, s['h']), (2, 0)] if key == 'bezier-quadratic' else [(-3, 0), (-1, s['h1']), (1, s['h2']), (3, 0)]
        n, t = len(points) - 1, s['t']
        bernstein = lambda n, k: math.comb(n, k) * t ** k * (1 - t) ** (n - k)
        p = [sum(bernstein(n, k) * point[d] for k, point in enumerate(points)) for d in range(2)]
        v = [sum(bernstein(n - 1, k) * n * (points[k + 1][d] - points[k][d]) for k in range(n)) for d in range(2)]
        result = dict(x=p[0], y=p[1], dx=v[0], dy=v[1])
        if n == 2:
            second = [2 * (points[2][d] - 2 * points[1][d] + points[0][d]) for d in range(2)]
            result['curvature'] = abs(v[0] * second[1] - v[1] * second[0]) / math.hypot(*v) ** 3
        return result
    if key == 'osculating-circle':
        x, a = s['x'], s['a']
        slope, y = 2 * a * x, a * x * x
        radius = (1 + slope * slope) ** 1.5 / (2 * a)
        cx, cy = -4 * a * a * x ** 3, 3 * a * x * x + 1 / (2 * a)
        close(math.hypot(actual['cx'] - x, actual['cy'] - y), actual['radius'], 'osculating circle passes through contact point')
        close((actual['cx'] - x) + slope * (actual['cy'] - y), 0, 'osculating radius normal to tangent')
        return dict(y=y, slope=slope, curvature=1 / radius, radius=radius, cx=cx, cy=cy)
    if key == 'involute':
        r, t = s['R'], s['t']
        x, y = r * (math.cos(t) + t * math.sin(t)), r * (math.sin(t) - t * math.cos(t))
        close(math.hypot(actual['x'] - r * math.cos(t), actual['y'] - r * math.sin(t)), r * t, 'involute string length')
        return dict(x=x, y=y, length=integrate(lambda u: r * u, 0, t), stringLength=r * t)
    if key == 'catenary':
        a, x = s['a'], s['x']
        length = integrate(lambda u: math.hypot(1, math.sinh(u / a)), -2, 2, 4096)
        return dict(y=a * math.cosh(x / a), slope=math.sinh(x / a), length=length)
    if key == 'superellipse':
        box = 4 * s['a'] * s['b']
        exact = box * math.gamma(1 + 1 / s['n']) ** 2 / math.gamma(1 + 2 / s['n'])
        require(0 <= exact - actual['area'] + 1e-10 <= exact * .001 + 1e-10, 'inscribed superellipse area lies within 0.1% of analytic Gamma area')
        return dict(area=actual['area'], boxArea=box, fillRatio=actual['area'] / box)
    if key == 'circle-inversion':
        radius = math.hypot(s['x'], s['y'])
        image_radius = s['R'] ** 2 / radius
        angle = math.atan2(s['y'], s['x'])
        scale = (s['R'] / radius) ** 2
        close(actual['x'] * s['y'] - actual['y'] * s['x'], 0, 'inversion preserves ray direction')
        return dict(x=image_radius * math.cos(angle), y=image_radius * math.sin(angle), product=s['R'] ** 2, scale=scale)
    if key == 'stereographic':
        angle = 2 * math.atan(s['t'])
        return dict(x=math.sin(angle), y=-math.cos(angle), norm2=1, inverse=s['t'])
    if key == 'poisson':
        rate = s['lambda']
        return dict(probability=poisson(s['k'], rate), mean=rate, variance=rate, shownMass=sum(poisson(k, rate) for k in range(25)))
    if key == 'exponential-distribution':
        rate = s['lambda']
        cdf = 1 - math.exp(-rate * s['x'])
        return dict(density=rate * (1 - cdf), cdf=cdf, mean=1 / rate, median=math.log(2) / rate)
    if key == 'geometric-memoryless':
        tail, reference = (1 - s['p']) ** s['n'], (1 - s['p']) ** s['m']
        return dict(tail=tail, joint=tail * reference, conditional=reference, reference=reference)
    if key == 'beta-distribution':
        a, b = s['alpha'], s['beta']
        normalizer = 1 / math.exp(math.lgamma(a) + math.lgamma(b) - math.lgamma(a + b))
        density = lambda x: normalizer * x ** (a - 1) * (1 - x) ** (b - 1)
        mass = integrate(density, 0, 1)
        mean = integrate(lambda x: x * density(x), 0, 1)
        variance = integrate(lambda x: (x - mean) ** 2 * density(x), 0, 1)
        close(mass, 1, 'Beta density integrates to one', relative=1e-8)
        return dict(normalizer=normalizer, mean=mean, variance=variance)
    if key == 'binomial-poisson':
        n, rate = s['n'], s['lambda']
        p = rate / n
        probabilities = [math.comb(n, k) * p ** k * (1 - p) ** (n - k) for k in range(n + 1)]
        variation = sum(abs((probabilities[k] if k <= n else 0) - poisson(k, rate)) for k in range(max(n, 60) + 1)) / 2
        return dict(p=p, variance=n * p * (1 - p), variation=variation)
    if key == 'uniform-sum':
        a, b = s['a'], s['b']
        return dict(mean=(a + b) / 2, variance=(a * a + b * b) / 12, peak=1 / max(a, b))
    if key == 'chebyshev':
        k = s['k']
        actual_tail = max(0, (math.sqrt(3) - k) / math.sqrt(3))
        bound = 1 / (k * k)
        require(actual['actual'] <= actual['bound'] + 1e-14, 'Chebyshev tail bound')
        return dict(actual=actual_tail, bound=bound, gap=bound - actual_tail)
    if key == 'binary-entropy':
        p = s['p']
        entropy = math.log(1 / (p ** p * (1 - p) ** (1 - p)), 2)
        require(0 <= actual['entropy'] <= 1, 'binary entropy range')
        return dict(entropy=entropy, variance=p * (1 - p))
    if key == 'symmetric-eigenspaces':
        a, b, d = s['a'], s['b'], s['d']
        trace, determinant = a + d, a * d - b * b
        discriminant = math.sqrt(max(0, trace * trace - 4 * determinant))
        angle = .5 * math.atan2(2 * b, a - d)
        u = [math.cos(actual['angle']), math.sin(actual['angle'])]
        close(a * u[0] + b * u[1], actual['l1'] * u[0], 'symmetric eigenvector x')
        close(b * u[0] + d * u[1], actual['l1'] * u[1], 'symmetric eigenvector y')
        return dict(l1=(trace + discriminant) / 2, l2=(trace - discriminant) / 2, angle=angle, trace=trace, det=determinant)
    if key == 'singular-values':
        matrix = multiply(multiply(rotation(math.radians(s['theta'])), [[s['s1'], 0], [0, s['s2']]]), rotation(math.radians(s['phi'])))
        a, b, c, d = matrix[0][0], matrix[0][1], matrix[1][0], matrix[1][1]
        close(a * a + b * b + c * c + d * d, s['s1'] ** 2 + s['s2'] ** 2, 'SVD Frobenius norm invariant')
        close(a * d - b * c, s['s1'] * s['s2'], 'SVD determinant invariant')
        return dict(a=a, b=b, c=c, d=d, condition=max(s['s1'], s['s2']) / min(s['s1'], s['s2']), area=PI * abs(a * d - b * c))
    if key == 'matrix-power':
        result, matrix = [[1., 0.], [0., 1.]], [[s['a'], s['b']], [0, s['d']]]
        for _ in range(s['n']):
            result = multiply(result, matrix)
        return dict(aPower=result[0][0], dPower=result[1][1], coupling=result[0][1], x=sum(result[0]), y=sum(result[1]))
    if key == 'matrix-exponential':
        angle = s['omega'] * s['t']
        z = complex(0, angle)
        term, value = 1 + 0j, 1 + 0j
        for k in range(1, 80):
            term *= z / k
            value += term
        return dict(c=value.real, d=value.imag, angle=angle, det=1)
    if key == 'quadratic-form':
        a, b = math.sqrt(s['level'] / s['l1']), math.sqrt(s['level'] / s['l2'])
        return dict(a=a, b=b, area=PI * s['level'] / math.sqrt(s['l1'] * s['l2']), minEigen=min(s['l1'], s['l2']))
    if key == 'householder':
        t = math.radians(s['theta'])
        a, b, d = -math.cos(2 * t), -math.sin(2 * t), math.cos(2 * t)
        x, y = a * s['x'] + b * s['y'], b * s['x'] + d * s['y']
        close(a * actual['x'] + b * actual['y'], s['x'], 'reflection involution x')
        close(b * actual['x'] + d * actual['y'], s['y'], 'reflection involution y')
        return dict(x=x, y=y, a=a, b=b, d=d, length=math.hypot(s['x'], s['y']), det=-1)
    if key == 'least-squares':
        t = math.radians(s['theta'])
        u, v = (math.cos(t), math.sin(t)), (-math.sin(t), math.cos(t))
        coefficient, residual = u[0] * s['x'] + u[1] * s['y'], v[0] * s['x'] + v[1] * s['y']
        return dict(coefficient=coefficient, px=coefficient * u[0], py=coefficient * u[1], rx=residual * v[0], ry=residual * v[1], cost=residual ** 2, orthogonality=0)
    if key == 'condition-sensitivity':
        e, delta = s['epsilon'], s['delta']
        large = ((2 + e) + math.sqrt((2 + e) ** 2 - 4 * e)) / 2
        small = e / large
        close(actual['x'] + actual['y'], 2, 'sensitivity first linear equation')
        close(actual['x'] + (1 + e) * actual['y'], 2 + delta, 'sensitivity second linear equation')
        return dict(x=2 - delta / e, y=delta / e, condition=large / small, solutionChange=math.hypot(delta / e, delta / e), large=large, small=small)
    raise AssertionError(f'No independent reference for {identifier}')


def curve_reference(identifier, s, x):
    """Check actual chart evaluators, separately from the reported result fields."""
    key = identifier.removeprefix('studio-')
    if key == 'bisection':
        return [x ** 3 - s['a']]
    if key == 'fixed-point':
        return [s['a'] * math.cos(x), x]
    if key == 'secant':
        return [x ** 2 - s['a']]
    if key == 'finite-difference':
        value, slope = math.sin(s['x']), math.cos(s['x'])
        central = slope * math.sin(s['h']) / s['h']
        return [math.sin(x), value + slope * (x - s['x']), value + central * (x - s['x'])]
    if key == 'simpson':
        return [x ** 4]
    if key == 'trapezoid':
        return [math.exp(x)]
    if key == 'quadratic-interpolation':
        return [math.cos(x), 1 - 2 * (math.sin(s['a'] / 2) * x / s['a']) ** 2]
    if key == 'beats':
        signal = math.cos((s['omega'] - s['delta'] / 2) * x) + math.cos((s['omega'] + s['delta'] / 2) * x)
        envelope = 2 * abs(math.cos(s['delta'] * x / 2))
        return [signal, envelope, -envelope]
    if key == 'fourier-square':
        value = 4 / PI * sum(math.sin(k * x) / k for k in range(1, 2 * s['n'], 2))
        return [value, 1 if math.sin(x) > 0 else -1 if math.sin(x) < 0 else 0]
    if key == 'fourier-sawtooth':
        return [sum(2 * (-1) ** (k + 1) * math.sin(k * x) / k for k in range(1, s['n'] + 1)), x]
    if key == 'damped-wave':
        envelope = math.exp(-s['gamma'] * x)
        return [envelope * math.cos(s['omega'] * x), envelope, -envelope]
    if key == 'gaussian-width':
        return [math.exp(-((x - s['mu']) ** 2) / (2 * s['sigma'] ** 2)) / math.sqrt(TAU * s['sigma'] ** 2), 1 / (2 * math.sqrt(TAU * s['sigma'] ** 2))]
    if key == 'sigmoid':
        z = math.exp(s['k'] * (x - s['c']))
        return [z / (1 + z), s['k'] * z / (1 + z) ** 2]
    if key == 'wave-packet':
        envelope = math.exp(-((x - s['c']) ** 2) / (2 * s['sigma'] ** 2))
        return [envelope * math.cos(s['k'] * (x - s['c'])), envelope, -envelope]
    if key == 'affine-recursion':
        return [s['b'] / (1 - s['q'])]
    if key == 'pendulum-energy':
        energy = s['v'] ** 2 / 2 + 2 * s['g'] * math.sin(math.radians(s['theta']) / 2) ** 2
        radicand = 2 * energy - 4 * s['g'] * math.sin(x / 2) ** 2
        return [math.sqrt(radicand), -math.sqrt(radicand)] if radicand >= 0 else [None, None]
    if key == 'euler-growth':
        return [math.exp(s['a'] * x)]
    if key == 'midpoint-decay':
        return [math.exp(-s['a'] * x)]
    if key == 'osculating-circle':
        return [s['a'] * x ** 2]
    if key == 'catenary':
        return [s['a'] * math.cosh(x / s['a']), s['a'] * math.cosh(s['x'] / s['a']) + math.sinh(s['x'] / s['a']) * (x - s['x'])]
    if key == 'exponential-distribution':
        return [s['lambda'] * math.exp(-s['lambda'] * x)]
    if key == 'beta-distribution':
        normalizer = math.exp(math.lgamma(s['alpha'] + s['beta']) - math.lgamma(s['alpha']) - math.lgamma(s['beta']))
        return [normalizer * x ** (s['alpha'] - 1) * (1 - x) ** (s['beta'] - 1)]
    if key == 'uniform-sum':
        # The second derivative of the sum CDF is the tent/trapezoid density.
        positive = lambda z: max(0, z)
        return [(positive(x) - positive(x - s['a']) - positive(x - s['b']) + positive(x - s['a'] - s['b'])) / (s['a'] * s['b'])]
    if key == 'chebyshev':
        return [x ** -2, max(0, (math.sqrt(3) - x) / math.sqrt(3))]
    if key == 'binary-entropy':
        return [math.log(1 / (x ** x * (1 - x) ** (1 - x)), 2)]
    if key == 'condition-sensitivity':
        return [2 - x, (2 + s['delta'] - x) / (1 + s['epsilon'])]
    raise AssertionError(f'No rendered curve reference for {identifier}')


def main():
    payload = subprocess.check_output(['node', 'scripts/studio-modules.test.cjs', '--json'], cwd=ROOT, text=True)
    fixtures = json.loads(payload)['fixtures']
    identifiers = set()
    for fixture in fixtures:
        identifier, actual = fixture['id'], fixture['results']
        identifiers.add(identifier)
        expected = reference(identifier, fixture['state'], actual)
        require(set(actual) == set(expected), identifier + ': every results field has a reference')
        for key, value in expected.items():
            values = enumerate(value) if isinstance(value, list) else [(None, value)]
            for index, scalar in values:
                result = actual[key][index] if index is not None else actual[key]
                close(result, scalar, f'{identifier}/{fixture["name"]}/{key}/{index}')
        for sample in fixture['samples']:
            expected_curves = curve_reference(identifier, fixture['state'], sample['x'])
            require(len(sample['values']) == len(expected_curves), identifier + ': chart curve count')
            for index, value in enumerate(expected_curves):
                if value is None:
                    require(sample['values'][index] is None, identifier + ': undefined region is not drawn')
                else:
                    close(sample['values'][index], value, f'{identifier}/{fixture["name"]}/curve/{index}')
    require(len(identifiers) == 48, 'independent reference coverage for every module')
    print(f'Python studio math: {len(identifiers)} models, {len(fixtures)} states, {checks} independent numerical and invariant checks passed.')


if __name__ == '__main__':
    main()
