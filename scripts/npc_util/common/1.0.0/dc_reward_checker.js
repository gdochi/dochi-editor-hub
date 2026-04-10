// Minimal common reward checker helpers for NPC scripts.
// Domain-specific scripts should wrap these helpers with their own rew_* functions.

function rew_chk_toText(v) {
  return v == null ? '' : String(v);
}

function rew_chk_toInt(v, fallback) {
  var n = parseInt(String(v), 10);
  return isNaN(n) ? fallback : n;
}

function rew_chk_result(pass, msg) {
  return { pass: !!pass, msg: msg != null ? String(msg) : '' };
}

function rew_chk_pickList(list, mode) {
  var arr = Array.isArray(list) ? list : [];
  if (!arr.length) return [];
  var m = rew_chk_toText(mode).toLowerCase();
  if (m === 'random') return [arr[Math.floor(Math.random() * arr.length)]];
  return arr;
}

function rew_chk_applyFaction(player, key, value) {
  var pts = rew_chk_toInt(value, 0);
  if (!key) return rew_chk_result(false, 'FACTION key missing');
  try {
    player.addFactionPoints(key, pts);
    return rew_chk_result(true, 'FACTION ' + key + ' +' + pts);
  } catch (e) {
    return rew_chk_result(false, 'FACTION failed ' + key);
  }
}

function rew_chk_applyItem(player, key, value) {
  var cnt = Math.max(1, rew_chk_toInt(value, 1));
  if (!key) return rew_chk_result(false, 'ITEM key missing');
  try {
    player.giveItem(player.getWorld().createItem(key, cnt));
    return rew_chk_result(true, 'ITEM ' + key + ' x' + cnt);
  } catch (e) {
    return rew_chk_result(false, 'ITEM failed ' + key);
  }
}

function rew_chk_applyCommand(npc, player, command) {
  var cmd = rew_chk_toText(command).replace('@player', player.getName()).replace('@npc', npc.getUUID());
  if (!cmd) return rew_chk_result(false, 'COMMAND empty');
  try {
    npc.executeCommand(cmd);
    return rew_chk_result(true, 'COMMAND ' + cmd);
  } catch (e) {
    return rew_chk_result(false, 'COMMAND failed');
  }
}

function rew_chk_applyAdvancement(npc, player, key) {
  if (!key) return rew_chk_result(false, 'ADV key missing');
  try {
    npc.executeCommand('advancement grant ' + player.getName() + ' only ' + key);
    return rew_chk_result(true, 'ADV ' + key);
  } catch (e) {
    return rew_chk_result(false, 'ADV failed ' + key);
  }
}
