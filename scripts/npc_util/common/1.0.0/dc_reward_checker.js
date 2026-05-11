// Common reward/action helpers for NPC scripts.
// Dialogue, trainer, quest, and other domain scripts should delegate side-effect actions here.

function rew_chk_toText(v) {
  return v == null ? "" : String(v);
}

function rew_chk_toInt(v, fallback) {
  var n = parseInt(String(v), 10);
  return isNaN(n) ? fallback : n;
}

function rew_chk_toNumber(v, fallback) {
  var n = parseFloat(String(v));
  return isNaN(n) ? fallback : n;
}

function rew_chk_result(pass, msg) {
  return { pass: !!pass, msg: msg != null ? String(msg) : "" };
}

function rew_chk_pickList(list, mode) {
  var arr = Array.isArray(list) ? list : [];
  if (!arr.length) return [];
  var m = rew_chk_toText(mode).toLowerCase();
  if (m === "random") return [arr[Math.floor(Math.random() * arr.length)]];
  return arr;
}

function rew_chk_playerName(player) {
  try { if (player && typeof player.getName === "function") return String(player.getName()); } catch (e0) {}
  try { return String(player.name || ""); } catch (e1) {}
  return "";
}

function rew_chk_npcUuid(npc) {
  try { if (npc && typeof npc.getUUID === "function") return String(npc.getUUID()); } catch (e0) {}
  return "";
}

function rew_chk_replaceVars(text, npc, player) {
  var out = rew_chk_toText(text);
  var name = rew_chk_playerName(player);
  var uuid = rew_chk_npcUuid(npc);
  if (name) out = out.split("@player").join(name).split("{player}").join(name);
  if (uuid) out = out.split("@npc").join(uuid).split("{npc}").join(uuid);
  return out;
}

function rew_chk_execNpcCommand(npc, command) {
  if (!npc || !command) return false;
  try {
    if (typeof npc.executeCommand === "function") {
      npc.executeCommand(String(command));
      return true;
    }
  } catch (e0) {}
  return false;
}

function rew_chk_applyFaction(player, key, value) {
  var pts = rew_chk_toInt(value, 0);
  if (!key) return rew_chk_result(false, "FACTION key missing");
  player.addFactionPoints(key, pts);
  return rew_chk_result(true, "FACTION " + key + " +" + pts);
}

function rew_chk_applyItem(player, key, value) {
  var cnt = Math.max(1, rew_chk_toInt(value, 1));
  if (!key) return rew_chk_result(false, "ITEM key missing");
  player.giveItem(player.getWorld().createItem(key, cnt));
  return rew_chk_result(true, "ITEM " + key + " x" + cnt);
}

function rew_chk_applyCommand(npc, player, command) {
  var cmd = rew_chk_replaceVars(command, npc, player);
  if (!cmd) return rew_chk_result(false, "COMMAND empty");
  if (!rew_chk_execNpcCommand(npc, cmd)) return rew_chk_result(false, "COMMAND failed");
  return rew_chk_result(true, "COMMAND " + cmd);
}

function rew_chk_applyAdvancement(npc, player, key) {
  if (!key) return rew_chk_result(false, "ADV key missing");
  if (!rew_chk_execNpcCommand(npc, "advancement grant " + rew_chk_playerName(player) + " only " + key)) return rew_chk_result(false, "ADV failed");
  return rew_chk_result(true, "ADV " + key);
}

function rew_chk_getStoredData(owner) {
  if (!owner) return null;
  try { if (typeof owner.getStoreddata === "function") return owner.getStoreddata(); } catch (e0) {}
  try { if (typeof owner.getStoredData === "function") return owner.getStoredData(); } catch (e1) {}
  return null;
}

function rew_chk_getWorld(ctx) {
  try { if (ctx && ctx.world) return ctx.world; } catch (e0) {}
  try { if (ctx && ctx.player && typeof ctx.player.getWorld === "function") return ctx.player.getWorld(); } catch (e1) {}
  try { if (ctx && ctx.npc && typeof ctx.npc.getWorld === "function") return ctx.npc.getWorld(); } catch (e2) {}
  return null;
}

function rew_chk_normalizeStore(store) {
  var raw = store && typeof store === "object" ? store : {};
  return {
    key: String(raw.key || raw.id || raw.name || ""),
    op: String(raw.storeOp || raw.op || raw.operator || "set"),
    value: raw.value != null ? raw.value : (raw.val != null ? raw.val : ""),
    scope: String(raw.scope || raw.storeScope || raw.storeTarget || raw.targetScope || raw.target || raw.targetType || "player")
  };
}

function rew_chk_storeOwner(ctx, store) {
  var scope = String(store && store.scope || "player").toLowerCase();
  if (scope === "npc") return { owner: ctx ? ctx.npc : null, scope: "npc" };
  if (scope === "world" || scope === "global") return { owner: rew_chk_getWorld(ctx), scope: "world" };
  return { owner: ctx ? ctx.player : null, scope: "player" };
}

function rew_chk_applyStore(ctxOrPlayer, store) {
  var ctx, looksLikeCtx, normalized, key, ownerInfo, data, op, cur, delta;
  if (!ctxOrPlayer || !store) return rew_chk_result(false, "STORE missing");
  looksLikeCtx = !!(ctxOrPlayer && (ctxOrPlayer.player || ctxOrPlayer.npc || ctxOrPlayer.world || ctxOrPlayer.event)
    && typeof ctxOrPlayer.getStoreddata !== "function"
    && typeof ctxOrPlayer.getStoredData !== "function");
  ctx = looksLikeCtx ? ctxOrPlayer : { player: ctxOrPlayer };
  normalized = rew_chk_normalizeStore(store);
  key = String(normalized.key || "");
  if (!key) return rew_chk_result(false, "STORE key missing");
  ownerInfo = rew_chk_storeOwner(ctx, normalized);
  data = rew_chk_getStoredData(ownerInfo.owner);
  if (!data) return rew_chk_result(false, "STORE data missing " + ownerInfo.scope);
  op = String(normalized.op || "set").toLowerCase();
  if (op === "delete" || op === "remove" || op === "clear") {
    try {
      if (typeof data.remove === "function") data.remove(key);
      else if (typeof data.put === "function") data.put(key, "");
    } catch (e0) {}
    return rew_chk_result(true, "STORE remove " + ownerInfo.scope + ":" + key);
  }
  if (op === "add" || op === "subtract" || op === "increment" || op === "decrement") {
    cur = 0;
    try { cur = rew_chk_toNumber(data.get(key), 0); } catch (e1) { cur = 0; }
    delta = rew_chk_toNumber(normalized.value != null ? normalized.value : 0, 0);
    data.put(key, String(op === "subtract" || op === "decrement" ? cur - delta : cur + delta));
    return rew_chk_result(true, "STORE " + op + " " + ownerInfo.scope + ":" + key);
  }
  data.put(key, String(normalized.value != null ? normalized.value : ""));
  return rew_chk_result(true, "STORE set " + ownerInfo.scope + ":" + key);
}

function rew_chk_applyTag(player, tag) {
  var key, op;
  if (!player || !tag) return rew_chk_result(false, "TAG missing");
  key = String(tag.key || tag.tag || "");
  if (!key) return rew_chk_result(false, "TAG key missing");
  op = String(tag.op || "add").toLowerCase();
  try {
    if (op === "delete" || op === "remove") {
      if (typeof player.removeTag === "function") player.removeTag(key);
      return rew_chk_result(true, "TAG remove " + key);
    }
    if (typeof player.addTag === "function") player.addTag(key);
    return rew_chk_result(true, "TAG add " + key);
  } catch (e0) {
    return rew_chk_result(false, "TAG failed " + key);
  }
}

function rew_chk_applyAdvancementAction(npc, player, adv) {
  var id;
  if (!adv) return rew_chk_result(false, "ADV action missing");
  id = String(adv.id || adv.advancement || adv.key || "");
  if (!id) return rew_chk_result(false, "ADV key missing");
  if (adv.grant === true || adv.value === true || adv.apply === true) return rew_chk_applyAdvancement(npc, player, id);
  return rew_chk_result(true, "ADV skipped " + id);
}

function rew_chk_applyFtbTask(npc, player, task) {
  var quest, taskIndex, suffix;
  if (!task) return rew_chk_result(false, "FTB task missing");
  quest = typeof task === "object" ? String(task.quest || "") : String(task || "");
  if (!quest) return rew_chk_result(false, "FTB quest missing");
  taskIndex = typeof task === "object" ? Number(task.task || 0) : 0;
  suffix = taskIndex > 0 ? (" " + taskIndex) : "";
  return rew_chk_applyCommand(npc, player, "ftbquests change_progress {player} complete " + quest + suffix);
}

function rew_chk_applyFtbComplete(npc, player, complete) {
  var quest = typeof complete === "object" ? String(complete.quest || "") : String(complete || "");
  if (!quest) return rew_chk_result(false, "FTB complete quest missing");
  return rew_chk_applyCommand(npc, player, "ftbquests change_progress {player} complete " + quest);
}

function rew_chk_applyCobbleDollar(npc, player, op, amount) {
  var cmdOp, n;
  n = rew_chk_toNumber(amount, 0);
  if (!n) return rew_chk_result(false, "COBBLEDOLLAR amount missing");
  op = String(op || "add").toLowerCase();
  cmdOp = "give";
  if (op === "take" || op === "pay" || op === "remove" || op === "subtract") cmdOp = "pay";
  else if (op === "set") cmdOp = "set";
  return rew_chk_applyCommand(npc, player, "cobbledollars " + cmdOp + " {player} " + n);
}

function rew_chk_normalizeAction(action) {
  var a = action && typeof action === "object" ? action : {};
  var type = String(a.type || a.action || "").toLowerCase();
  var out = {};
  if (a.store && typeof a.store === "object") out.store = rew_chk_normalizeStore(a.store);
  else if (a.storeData && typeof a.storeData === "object") out.store = rew_chk_normalizeStore(a.storeData);
  else if (a.storedData && typeof a.storedData === "object") out.store = rew_chk_normalizeStore(a.storedData);
  else if (type === "store" || type === "stored" || type === "storeddata" || type === "store_data" || type === "stored_data") out.store = rew_chk_normalizeStore(a);
  if (a.tag && typeof a.tag === "object") out.tag = a.tag;
  else if (type === "tag") out.tag = { key: String(a.key || a.tag || ""), op: String(a.op || "add") };
  if (a.advancement && typeof a.advancement === "object") out.advancement = a.advancement;
  else if (type === "adv" || type === "advancement") out.advancement = { id: String(a.key || a.id || a.value || ""), grant: a.grant !== false };
  if (a.command != null || type === "command") out.command = String(a.command != null ? a.command : a.value);
  if (a.ftb_task) out.ftb_task = a.ftb_task;
  else if (type === "ftb_task") out.ftb_task = { quest: String(a.quest || ""), task: Number(a.task || 0) };
  if (a.ftb_complete) out.ftb_complete = a.ftb_complete;
  else if (type === "ftb_complete") out.ftb_complete = { quest: String(a.quest || a.key || "") };
  if (a.cobbledollar) out.cobbledollar = a.cobbledollar;
  else if (type === "cobbledollar" || type === "cobbledollar_add" || type === "cobbledollar_take") {
    out.cobbledollar = {
      op: type === "cobbledollar_take" ? "take" : String(a.moneyOp || a.op || "add"),
      amount: Number(a.amount || a.value || 0)
    };
  }
  return out;
}

function rew_chk_applyAction(ctx, action) {
  var a = rew_chk_normalizeAction(action);
  var npc = ctx && ctx.npc ? ctx.npc : null;
  var player = ctx && ctx.player ? ctx.player : null;
  var results = [];
  var pass = true;
  if (a.store) results.push(rew_chk_applyStore(ctx, a.store));
  if (a.tag) results.push(rew_chk_applyTag(player, a.tag));
  if (a.advancement) results.push(rew_chk_applyAdvancementAction(npc, player, a.advancement));
  if (a.ftb_task) results.push(rew_chk_applyFtbTask(npc, player, a.ftb_task));
  if (a.ftb_complete) results.push(rew_chk_applyFtbComplete(npc, player, a.ftb_complete));
  if (a.cobbledollar) results.push(rew_chk_applyCobbleDollar(npc, player, a.cobbledollar.op || a.cobbledollar.moneyOp || "add", a.cobbledollar.amount));
  if (a.command) results.push(rew_chk_applyCommand(npc, player, a.command));
  for (var i = 0; i < results.length; i++) {
    if (results[i] && results[i].pass === false) pass = false;
  }
  return { pass: pass, msg: pass ? "ACTION applied" : "ACTION failed", results: results };
}

function rew_chk_applyActions(ctx, actions) {
  var list = Array.isArray(actions) ? actions : [];
  var results = [];
  var pass = true;
  for (var i = 0; i < list.length; i++) results.push(rew_chk_applyAction(ctx, list[i]));
  for (var j = 0; j < results.length; j++) {
    if (results[j] && results[j].pass === false) pass = false;
  }
  return { pass: pass, msg: pass ? "ACTIONS applied" : "ACTIONS failed", results: results };
}

var DcRewardCheckerModule = {
  normalizeAction: rew_chk_normalizeAction,
  normalizeStore: rew_chk_normalizeStore,
  applyAction: rew_chk_applyAction,
  applyActions: rew_chk_applyActions,
  applyStore: rew_chk_applyStore,
  applyTag: rew_chk_applyTag,
  applyAdvancement: rew_chk_applyAdvancementAction,
  applyFtbTask: rew_chk_applyFtbTask,
  applyFtbComplete: rew_chk_applyFtbComplete,
  applyCobbleDollar: rew_chk_applyCobbleDollar
};

function dc_reward_normalizeAction(action) { return rew_chk_normalizeAction(action); }
function dc_reward_applyAction(ctx, action) { return rew_chk_applyAction(ctx, action); }
function dc_reward_applyActions(ctx, actions) { return rew_chk_applyActions(ctx, actions); }
function dc_reward_applyStore(ctx, store) { return rew_chk_applyStore(ctx, store); }
