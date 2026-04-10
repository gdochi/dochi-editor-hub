// Minimal common sequence core for NPC scripts.
// Domain scripts should provide step runners and completion callbacks.

function seq_core_toText(v) {
  return v == null ? '' : String(v);
}

function seq_core_toInt(v, fallback) {
  var n = parseInt(String(v), 10);
  return isNaN(n) ? fallback : n;
}

function seq_core_deepCopy(v) {
  return JSON.parse(JSON.stringify(v));
}

function seq_core_defaultState() {
  return {
    kind: '',
    round: 0,
    tick: 0,
    total: 1,
    steps: [],
    done: {},
    next: ''
  };
}

function seq_core_hasSteps(steps) {
  return Array.isArray(steps) && steps.length > 0;
}

function seq_core_calcTotal(steps, fallback) {
  if (!Array.isArray(steps) || !steps.length) return Math.max(1, seq_core_toInt(fallback, 20));
  var max = 0;
  for (var i = 0; i < steps.length; i++) {
    var s = steps[i] || {};
    var start = Math.max(0, seq_core_toInt(s.startTick, 0));
    var dur = Math.max(1, seq_core_toInt(s.duration, 1));
    if (start + dur > max) max = start + dur;
  }
  return Math.max(1, max);
}

function seq_core_pack(kind, round, steps, total, nextMode) {
  return {
    kind: seq_core_toText(kind),
    round: seq_core_toInt(round, 0),
    tick: 0,
    total: Math.max(1, seq_core_toInt(total, seq_core_calcTotal(steps, 20))),
    steps: Array.isArray(steps) ? seq_core_deepCopy(steps) : [],
    done: {},
    next: seq_core_toText(nextMode)
  };
}

function seq_core_stepReady(step, tick, done) {
  if (!step) return false;
  var idx = step.__idx != null ? step.__idx : null;
  if (idx != null && done[idx] === true) return false;
  var start = Math.max(0, seq_core_toInt(step.startTick, 0));
  return tick >= start;
}

function seq_core_markDone(done, step) {
  var idx = step && step.__idx != null ? step.__idx : null;
  if (idx != null) done[idx] = true;
  return done;
}

function seq_core_prepareSteps(steps) {
  var out = [];
  for (var i = 0; i < (Array.isArray(steps) ? steps.length : 0); i++) {
    var step = seq_core_deepCopy(steps[i] || {});
    step.__idx = i;
    out.push(step);
  }
  return out;
}
