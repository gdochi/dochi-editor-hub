// Common condition checker helpers.
// Domain-specific cond_one() implementations should call these helpers.

function cond_chk_toText(v) {return v == null ? '' : String(v);}
function cond_chk_toNumber(v, fallback) {var n = parseFloat(String(v));return isNaN(n) ? fallback : n;}
function cond_chk_result(pass, msg) {return { pass: !!pass, msg: msg != null ? String(msg) : '' };}
function cond_chk_normalizeOp(type, op) {
  var t = cond_chk_toText(type).toLowerCase();
  var o = cond_chk_toText(op).toLowerCase();
  if (t === 'item') {
    if (o !== 'has' && o !== 'not' && o !== '>=' ) return 'has';
    return o;
  }
  if (t === 'stored' || t === 'faction') {
    if (o !== '==' && o !== '>=' && o !== '<=') return '==';
    return o;
  }
  if (t === 'tag') {
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
  return cond_chk_result(false, 'TEXT unsupported op ' + o);
}
function cond_chk_compareNumber(cur, tgt, op) {
  var a = parseFloat(String(cur));
  var b = parseFloat(String(tgt));
  var o = cond_chk_normalizeOp('stored', op);
  if (isNaN(a) || isNaN(b)) return cond_chk_result(false, 'NUM invalid');
  if (o === '==') return cond_chk_result(a === b, 'NUM ' + a + ' == ' + b);
  if (o === '>=') return cond_chk_result(a >= b, 'NUM ' + a + ' >= ' + b);
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
  if (o === '>=') return cond_chk_result(a >= b, label + ' ' + a + ' >= ' + b);
  return cond_chk_result(false, label + ' unsupported op ' + o);
}

function cond_item(n, p, op, key, val) {
  if (!key) return cond_chk_result(false, 'ITEM key missing');
  var has = 0;
  try {
    has = p.getInventory().count(p.getWorld().createItem(key, 1), true, true);
  } catch (e) {
    return cond_chk_result(false, 'ITEM invalid id ' + key);
  }
  var normalized = cond_chk_normalizeOp('item', op);
  if (normalized === '>=') {
    var need = parseInt(String(val != null ? val : '0'), 10);
    if (isNaN(need) || need < 1) return cond_chk_result(false, 'ITEM >= invalid');
    return cond_chk_compareCount(has, need, '>=', 'ITEM ' + key);
  }
  return cond_chk_comparePresence(has > 0, normalized, 'ITEM ' + key);
}

function cond_stored(n, p, op, key, val) {
  if (!key) return cond_chk_result(false, 'STORED key missing');
  var cur = p.getStoreddata().get(key);
  var tgt = val != null ? String(val) : '';
  var normalized = cond_chk_normalizeOp('stored', op);
  if (normalized === '==') return cond_chk_compareText(cur, tgt, '==');
  return cond_chk_compareNumber(cur, tgt, normalized);
}

function cond_tag(n, p, op, key) {
  if (!key) return cond_chk_result(false, 'TAG key missing');
  var ok = false;
  try {
    ok = p.hasTag(key);
  } catch (e) {}
  return cond_chk_comparePresence(ok, op, 'TAG ' + key);
}

function cond_faction(n, p, op, key, val) {
  if (!key) return cond_chk_result(false, 'FACTION key missing');
  var pts = 0;
  try {
    pts = p.getFactionPoints(key);
  } catch (e) {}
  var t = parseInt(String(val != null ? val : '0'), 10);
  if (isNaN(t)) t = 0;
  return cond_chk_compareNumber(pts, t, op);
}

function cond_adv(n, p, op, key) {
  if (!key) return cond_chk_result(false, 'ADV key missing');
  var has = false;
  try {
    has = p.hasAdvancement(key);
  } catch (e) {}
  var normalized = op === 'not' ? 'not' : 'done';
  return cond_chk_comparePresence(has, normalized, 'ADV ' + key);
}
