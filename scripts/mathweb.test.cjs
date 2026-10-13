'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const C=require('../compiler/compiler.js'),R=require('../compiler/runtime.js'),seed=require('../compiler/seed.cjs');let checks=0;
const source=fs.readFileSync(path.join(__dirname,'../compiler/compiler.msw'),'utf8');
const fixed=C.compile(source);assert.equal(fixed,seed.compile(source));assert.equal(fixed,fs.readFileSync(path.join(__dirname,'../compiler/compiler.js'),'utf8'));checks+=2;
function load(text,compiler=C){const m={exports:{}};vm.runInNewContext(compiler.compile(text),{module:m,require:p=>{assert.equal(p,'../compiler/runtime.js');return R;}},{timeout:1000});return m.exports;}
for(const compiler of [C,load(source)]){
 const m=load(`(module Test
 (fn fact (n) (if (<= n 1) (return 1)) (return (* n (fact (- n 1)))))
 (fn build (n) (let out (array)) (let i 0) (while (< i n) (push out (* i i)) (set i (+ i 1))) (return out))
 (let fold (lambda (x) (+ x 1)))
 (export (record ("fact" fact) ("build" build) ("answer" (fold 41)) ("lazy" (choose true 7 (fail "unreachable"))) ("negative" (- 3)))))`,compiler);
 assert.equal(m.fact(10),3628800);assert.equal(JSON.stringify(m.build(5)),'[0,1,4,9,16]');assert.equal(m.answer,42);assert.equal(m.lazy,7);assert.equal(m.negative,-3);checks+=5;
}
for(const [s,pattern]of [
 ['(module Missing (export (record ("x" window))))',/尚未宣告/],
 ['(module Invalid (let x 1) (let x 2) (export (record)))',/名稱重複/],
 ['(module Invalid (fn f (x x) (return x)) (export (record)))',/名稱重複/],
 ['(module Invalid (return 2) (export (record)))',/return/],
 ['(module Invalid (export (record ("constructor" 3))))',/安全/],
 ['(module Invalid (use M "GraphMath" "../../secrets.js") (export (record)))',/use/],
 ['(module Invalid (export (record ("x" (+ 1)))))',/參數/],
 ['(module Invalid (export (record))',/第 1 行/],
 ['(module Invalid\n (let x "open)',/字串未結束/],
 ['(module A (export (record))) (module B (export (record)))',/一個 module/],
 ['(module Invalid (export (record ("x" '+ '('.repeat(110)+'1'+')'.repeat(110)+'))))',/上限/],
 [' '.repeat(120001),/上限/]
]){assert.throws(()=>C.compile(s),pattern);checks++;}
const safe=load('(module Safe (export (record ("text" "</script><img onerror=alert(1)>"))))');assert.equal(safe.text,'</script><img onerror=alert(1)>');checks++;
const bad=load('(module Limits (fn spin () (while true (let x 1)) (return 0)) (fn recurse () (return (recurse))) (fn accessor (x) (return (get x "constructor"))) (export (record ("spin" spin) ("recurse" recurse) ("accessor" accessor))))');
assert.throws(()=>bad.spin(),/步數/);assert.throws(()=>bad.recurse(),/深度/);assert.throws(()=>bad.accessor({}),/欄位/);checks+=3;
const callback=load('(module Callback (fn maker () (fn spin () (while true (let x 0)) (return 0)) (return spin)) (export (record ("maker" maker))))').maker();assert.throws(callback,/步數/);checks++;
assert.equal(load('(module AfterLimit (export (record ("ok" 42))))').ok,42);checks++;
console.log(`PASS MathScript Web ${checks} compiler, lexical scope, code generation, fixed-point and bounded-runtime checks.`);
