// Common condition checker helpers.
// Domain-specific cond_one() implementations should call these helpers.

function cond_chk_toText(v) {return v == null ? '' : String(v);}
function cond_chk_toNumber(v, fallback) {var n = parseFloat(String(v));return isNaN(n) ? fallback : n;}
function cond_chk_result(pass, msg) {return { pass: !!pass, msg: msg != null ? String(msg) : '' };}
function cond_chk_normalizeOp(type, op) {
  var t = cond_chk_toText(type).toLowerCase();
  var o = cond_chk_toText(op).toLowerCase();
  if (t === 'item') {
    if (o === "hasnt" || o === "hasn't" || o === "notdone") o = 'not';
    if (o !== 'has' && o !== 'not' && o !== '>' && o !== '>=' && o !== '<' && o !== '<=' && o !== '==' && o !== '!=' ) return 'has';
    return o;
  }
  if (t === 'stored' || t === 'faction') {
    if (o !== '==' && o !== '!=' && o !== '>' && o !== '>=' && o !== '<' && o !== '<=') return '==';
    return o;
  }
  if (t === 'tag') {
    if (o === "hasnt" || o === "hasn't") o = 'not';
    if (o !== 'has' && o !== 'not') return 'has';
    return o;
  }
  if (t === 'adv') {
    if (o !== 'done' && o !== 'not') return 'done';
    return o;
  }
  return o;
}
function cond_chk_compareText(cur, tgt, op) {
  var a = cond_chk_toText(cur);
  var b = cond_chk_toText(tgt);
  var o = cond_chk_normalizeOp('stored', op);
  if (o === '==') return cond_chk_result(a === b, 'TEXT ' + a + ' ' + o + ' ' + b);
  if (o === '!=') return cond_chk_result(a !== b, 'TEXT ' + a + ' != ' + b);
  return cond_chk_result(false, 'TEXT unsupported op ' + o);
}
function cond_chk_compareNumber(cur, tgt, op) {
  var a = parseFloat(String(cur));
  var b = parseFloat(String(tgt));
  var o = cond_chk_normalizeOp('stored', op);
  if (isNaN(a) || isNaN(b)) return cond_chk_result(false, 'NUM invalid');
  if (o === '==') return cond_chk_result(a === b, 'NUM ' + a + ' == ' + b);
  if (o === '!=') return cond_chk_result(a !== b, 'NUM ' + a + ' != ' + b);
  if (o === '>') return cond_chk_result(a > b, 'NUM ' + a + ' > ' + b);
  if (o === '>=') return cond_chk_result(a >= b, 'NUM ' + a + ' >= ' + b);
  if (o === '<') return cond_chk_result(a < b, 'NUM ' + a + ' < ' + b);
  if (o === '<=') return cond_chk_result(a <= b, 'NUM ' + a + ' <= ' + b);
  return cond_chk_result(false, 'NUM unsupported op ' + o);
}
function cond_chk_comparePresence(hasValue, op, label) {
  var o = cond_chk_toText(op).toLowerCase();
  if (o !== 'has' && o !== 'not') o = 'has';
  if (o === 'has') return cond_chk_result(!!hasValue, label + ' has');
  return cond_chk_result(!hasValue, label + ' not');
}
function cond_chk_compareCount(count, need, op, label) {
  var o = cond_chk_normalizeOp('item', op);
  var a = parseInt(String(count), 10);
  var b = parseInt(String(need), 10);
  if (isNaN(a) || isNaN(b)) return cond_chk_result(false, label + ' invalid count');
  if (o === 'has') return cond_chk_result(a > 0, label + ' has ' + a);
  if (o === 'not') return cond_chk_result(a === 0, label + ' not ' + a);
  if (o === '>') return cond_chk_result(a > b, label + ' ' + a + ' > ' + b);
  if (o === '>=') return cond_chk_result(a >= b, label + ' ' + a + ' >= ' + b);
  if (o === '<') return cond_chk_result(a < b, label + ' ' + a + ' < ' + b);
  if (o === '<=') return cond_chk_result(a <= b, label + ' ' + a + ' <= ' + b);
  if (o === '==') return cond_chk_result(a === b, label + ' ' + a + ' == ' + b);
  if (o === '!=') return cond_chk_result(a !== b, label + ' ' + a + ' != ' + b);
  return cond_chk_result(false, label + ' unsupported op ' + o);
}

function cond_item(n, p, op, key, val) {

  if (!key) return cond_chk_result(false, 'ITEM key missing');
  var has = 0;
  has = p.getInventory().count(p.getWorld().createItem(key, 1), true, true);
  var normalized = cond_chk_normalizeOp('item', op);
  if (normalized === '>' || normalized === '>=' || normalized === '<' || normalized === '<=' || normalized === '==' || normalized === '!=') {
    var need = parseInt(String(val != null ? val : '0'), 10);
    if (isNaN(need)) return cond_chk_result(false, 'ITEM count invalid');
    return cond_chk_compareCount(has, need, normalized, 'ITEM ' + key);
  }
  return cond_chk_comparePresence(has > 0, normalized, 'ITEM ' + key);
}

function cond_stored(n, p, op, key, val) {
  if (!key) return cond_chk_result(false, 'STORED key missing');
  var cur = p.getStoreddata().get(key);
  var tgt = val != null ? String(val) : '';
  var normalized = cond_chk_normalizeOp('stored', op);
  if (normalized === '==' || normalized === '!=') {
    var curNum = parseFloat(String(cur));
    var tgtNum = parseFloat(String(tgt));
    if (!isNaN(curNum) && !isNaN(tgtNum)) return cond_chk_compareNumber(cur, tgt, normalized);
    return cond_chk_compareText(cur, tgt, normalized);
  }
  return cond_chk_compareNumber(cur, tgt, normalized);
}

function cond_tag(n, p, op, key) {
  if (!key) return cond_chk_result(false, 'TAG key missing');
  var ok = p.hasTag(key);
  return cond_chk_comparePresence(ok, op, 'TAG ' + key);
}

function cond_faction(n, p, op, key, val) {
  if (!key) return cond_chk_result(false, 'FACTION key missing');
  var pts = p.getFactionPoints(key);
  var t = parseInt(String(val != null ? val : '0'), 10);
  if (isNaN(t)) t = 0;
  return cond_chk_compareNumber(pts, t, op);
}

function cond_adv(n, p, op, key) {
  if (!key) return cond_chk_result(false, 'ADV key missing');
  var has = p.hasAdvancement(key);
  var normalized = op === 'not' ? 'not' : 'done';
  return cond_chk_comparePresence(has, normalized, 'ADV ' + key);
}

function cond_chk_boolTarget(v, fallback) {
  if (v === true || v === false) return v;
  if (v == null || v === '') return fallback !== false;
  var s = String(v).toLowerCase();
  if (s === 'true' || s === '1' || s === 'yes' || s === 'y' || s === 'on') return true;
  if (s === 'false' || s === '0' || s === 'no' || s === 'n' || s === 'off') return false;
  return fallback !== false;
}

function cond_chk_mcPlayer(p) {
  try {
    if (p && typeof p.getMCEntity === 'function') return p.getMCEntity();
  } catch (e0) {}
  return p;
}

function cond_ftb(n, p, op, key, val, taskIndex) {
  if (!key) return cond_chk_result(false, 'FTB quest key missing');
  var ServerQuestFile, QuestObjectBase, file, questLong, quest, data, target, targetName;
  try {
    ServerQuestFile = Java.type('dev.ftb.mods.ftbquests.quest.ServerQuestFile');
    QuestObjectBase = Java.type('dev.ftb.mods.ftbquests.quest.QuestObjectBase');
  } catch (e0) {
    return cond_chk_result(false, 'FTB classes missing');
  }
  file = ServerQuestFile.INSTANCE;
  if (!file) return cond_chk_result(false, 'FTB quest file missing');
  try {
    questLong = QuestObjectBase.parseCodeString(String(key));
    quest = file.getQuest(questLong);
  } catch (e1) {
    return cond_chk_result(false, 'FTB quest id invalid ' + key);
  }
  if (!quest) return cond_chk_result(false, 'FTB quest not found ' + key);
  try {
    data = file.getOrCreateTeamData(cond_chk_mcPlayer(p));
  } catch (e2) {
    return cond_chk_result(false, 'FTB team data missing');
  }
  target = quest;
  targetName = 'quest ' + key;
  if (taskIndex != null && String(taskIndex) !== '') {
    var tasks = quest.getTasksAsList();
    var idx = parseInt(String(taskIndex), 10);
    if (isNaN(idx) || idx < 0 || idx >= tasks.size()) return cond_chk_result(false, 'FTB task out of range ' + key + '#' + taskIndex);
    target = tasks.get(idx);
    targetName = 'task ' + key + '#' + idx;
  }

  var normalized = String(op || 'completed').toLowerCase();
  var want = cond_chk_boolTarget(val, true);
  var completed = false;
  var started = false;
  try { completed = !!data.isCompleted(target); } catch (e3) { completed = false; }
  try { started = !!data.isStarted(target); } catch (e4) { started = false; }

  if (normalized === 'not_completed' || normalized === 'incomplete' || normalized === 'notdone') {
    return cond_chk_result(completed === false, 'FTB ' + targetName + ' completed false');
  }
  if (normalized === 'not_started') {
    return cond_chk_result(started === false, 'FTB ' + targetName + ' started false');
  }
  if (normalized === 'started' || normalized === 'start') {
    return cond_chk_result(started === want, 'FTB ' + targetName + ' started ' + started + ' want ' + want);
  }
  if (normalized === 'completed' || normalized === 'complete' || normalized === 'done') {
    return cond_chk_result(completed === want, 'FTB ' + targetName + ' completed ' + completed + ' want ' + want);
  }
  return cond_chk_result(false, 'FTB unsupported op ' + op);
}
