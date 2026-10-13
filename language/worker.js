'use strict';
importScripts('../graph/math.js', '../graph/render.js', './values.js', './mathscript.js');
const programs = new Map();
self.onmessage = event => {
  const { id, source, parameters, width, height } = event.data || {}, started = performance.now();
  try {
    let program = programs.get(source), cached = !!program;
    if (!program) {
      program = MathScript.compile(source); programs.set(source, program);
      if (programs.size > 8) programs.delete(programs.keys().next().value);
    } else { programs.delete(source); programs.set(source, program); }
    const result = MathScript.run(program, { parameters, width, height });
    result.stats.duration = performance.now() - started; result.stats.cached = cached;
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({ id, error: { message: error.message, line: error.line || 1, column: error.column || 1 } });
  }
};
