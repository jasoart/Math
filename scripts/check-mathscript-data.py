"""Independent exact-rational reference fixtures for MathScript 1.2 (stdlib)."""
import json
import math
import random
from fractions import Fraction as F

rng = random.Random(120026)
cases = []


def literal(value):
    return json.dumps(value, separators=(",", ":"))


def add(expression, expected):
    cases.append({"source": "print " + expression, "expected": expected})


def inverse_and_det(matrix):
    # Exact Gauss-Jordan with first nonzero pivot, independent of JS's scaled
    # partial-pivot / forward-elimination / back-substitution implementation.
    n = len(matrix)
    rows = [[F(v) for v in row] + [F(i == j) for j in range(n)] for i, row in enumerate(matrix)]
    determinant = F(1)
    for col in range(n):
        pivot = next(i for i in range(col, n) if rows[i][col])
        if pivot != col:
            rows[pivot], rows[col] = rows[col], rows[pivot]
            determinant = -determinant
        scale = rows[col][col]
        determinant *= scale
        rows[col] = [v / scale for v in rows[col]]
        for i in range(n):
            if i != col:
                scale = rows[i][col]
                rows[i] = [v - scale * p for v, p in zip(rows[i], rows[col])]
    return [[float(v) for v in row[n:]] for row in rows], float(determinant)


for n in range(1, 9):
    for _ in range(6):
        matrix = [[rng.randint(-8, 8) for _ in range(n)] for _ in range(n)]
        for i in range(n):
            matrix[i][i] = 5 + sum(abs(v) for v in matrix[i])
        rng.shuffle(matrix)
        inv, determinant = inverse_and_det(matrix)
        solution = [rng.randint(-5, 5) for _ in range(n)]
        rhs = [sum(a*b for a, b in zip(row, solution)) for row in matrix]
        columns = [[rng.randint(-5, 5) for _ in range(3)] for _ in range(n)]
        product = [[sum(matrix[i][k] * columns[k][j] for k in range(n)) for j in range(3)] for i in range(n)]
        a = literal(matrix)
        add(f"det({a})", determinant)
        add(f"inverse({a})", inv)
        add(f"solve({a},{literal(rhs)})", solution)
        add(f"matmul({a},{literal(columns)})", product)
        add(f"trace({a})", sum(matrix[i][i] for i in range(n)))

for count in [2, 3, 5, 8, 13, 31, 64, 128, 256]:
    for _ in range(4):
        values = [rng.randint(-1000, 1000) for _ in range(count)]
        data = literal(values)
        mean = F(sum(values), count)
        population = sum((v - mean) ** 2 for v in values) / count
        sample = population * F(count, count - 1)
        ordered = sorted(values)
        median = ordered[count//2] if count % 2 else F(ordered[count//2 - 1] + ordered[count//2], 2)
        for name, expected in [("total", sum(values)), ("mean", mean), ("median", median), ("variance", population), ("samplevar", sample), ("stdev", math.sqrt(population))]:
            add(f"{name}({data})", float(expected))

for _ in range(40):
    u, v = [[rng.randint(-20, 20) for _ in range(3)] for _ in range(2)]
    dot = sum(a*b for a,b in zip(u,v))
    cross = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]]
    # Lagrange's identity also checks each independent cross product fixture.
    assert sum(n*n for n in cross) == sum(n*n for n in u)*sum(n*n for n in v)-dot*dot
    add(f"dot({literal(u)},{literal(v)})", dot)
    add(f"cross({literal(u)},{literal(v)})", cross)
    add(f"norm({literal(u)})", math.sqrt(sum(n*n for n in u)))

print(json.dumps(cases))
