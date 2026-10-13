'use strict';
const assert = require('node:assert/strict'), {spawnSync} = require('node:child_process'), path = require('node:path');
const M = require('../language/mathscript.js');
const check = spawnSync('python3', [path.join(__dirname,'check-mathscript-data.py')], {encoding:'utf8',maxBuffer:8*1024*1024});
assert.equal(check.status,0,check.stderr || check.error?.message);
const fixtures = JSON.parse(check.stdout);
function compare(actual, expected, source) {
  if (Array.isArray(expected)) { assert.ok(Array.isArray(actual),source); assert.equal(actual.length,expected.length,source); expected.forEach((v,i)=>compare(actual[i],v,source)); }
  else assert.ok(Number.isFinite(actual) && Math.abs(actual-expected)<=1e-9*Math.max(1,Math.abs(expected)),`${source}: ${actual} ≈ ${expected}`);
}
for (const fixture of fixtures) compare(M.run(fixture.source).outputs[0].value,fixture.expected,fixture.source);
let endpoints = 0;
for (const example of require('../language/examples.js')) {
  const result = M.run(example.source);
  for (const parameter of result.parameters) for (const value of [parameter.min,parameter.max]) { M.run(example.source,{parameters:{[parameter.name]:value}}); endpoints++; }
}
console.log(`PASS MathScript 1.2: ${fixtures.length} independent Python exact-rational/statistics/vector cases; 19 examples and ${endpoints} slider endpoints.`);
