var RCTApi = Java.type("com.gitlab.srcmc.rctapi.api.RCTApi");
var TrainerModel = Java.type("com.gitlab.srcmc.rctapi.api.models.TrainerModel");
var BR = Java.type("com.cobblemon.mod.common.battles.BattleRegistry");
var TBA = Java.type("com.cobblemon.mod.common.battles.actor.TrainerBattleActor");
var PBA = Java.type("com.cobblemon.mod.common.battles.actor.PokemonBattleActor");
var KEY = {
  SPEC_PATH: "dc_trainer_spec_path",
  CFG: "dc_trainer_cfg",
  CFG_RAW: "dc_trainer_cfg_raw",
  STATE: "dc_trainer_state",
  LOCK: "dc_trainer_lock",
  TARGET: "dc_trainer_target",
  TARGET_NAME: "dc_trainer_target_name",
  TARGET_UUID: "dc_trainer_target_uuid",
  EXCL_SEND_TRY: "dc_trainer_excl_send_try",
  SPEED: "dc_trainer_speed",
  STANDING: "dc_trainer_standing",
  ANGLE: "dc_trainer_angle",
  RETURN_HOME: "dc_trainer_return_home",
  BUSY: "dc_trainer_busy",
  INIT_DONE: "dc_trainer_init_done",
  SEQ_KIND: "dc_trainer_seq_kind",
  SEQ_NEXT: "dc_trainer_seq_next",
  SEQ_ROUND: "dc_trainer_seq_round",
  SEQ_TICK: "dc_trainer_seq_tick",
  SEQ_TOTAL: "dc_trainer_seq_total",
  SEQ_STEPS: "dc_trainer_seq_steps",
  SEQ_DONE: "dc_trainer_seq_done",
  SEQ_STATE: "dc_trainer_seq_state",
  SEQ_TIMER_MAP: "dc_trainer_seq_timer_map",
  DENY_COOLDOWN: "dc_trainer_deny_cooldown",
  EXCL_OVERLAY: "dc_trainer_excl_overlay",
  BD_ACTIVE: "dc_trainer_bd_active",
  BD_SESSION: "dc_trainer_bd_session",
  BD_DONE: "dc_trainer_bd_done",
  BD_DONE_ROUND: "dc_trainer_bd_done_round",
  BD_CFG: "dc_trainer_bd_cfg",
  BAT_GRACE_UNTIL: "dc_trainer_bat_grace_until",
  BAT_SKIP_DELAY: "dc_trainer_bat_skip_delay"
};
var JS_LIB_ROOT = "customnpcs/scripts/ecmascript/dc_lib";
var JS_MODULE_CACHE = {};
var DC_LAST_INTERACT_EVENT = {};
var DC_BD_LINK = {};
var DC_BD_LAST_CHOICE = {};
function dc_evt_key(p){try{ return p.getUUID(); }catch(e){ return ""; }}
function dc_evt_store(p, e){try{ var k = dc_evt_key(p); if(k) DC_LAST_INTERACT_EVENT[k] = e; }catch(err){}}
function dc_evt_get(p){try{ var k = dc_evt_key(p); return k ? DC_LAST_INTERACT_EVENT[k] : null; }catch(err){ return null; }}
function dc_evt_clear(p){try{ var k = dc_evt_key(p); if(k && DC_LAST_INTERACT_EVENT.hasOwnProperty(k)) delete DC_LAST_INTERACT_EVENT[k]; }catch(err){}}
function bd_linkKey(p){try{ return p.getUUID(); }catch(e){ return ""; }}
function bd_linkSet(p, n, sessionId){try{var k = bd_linkKey(p);if(!k) return;DC_BD_LINK[k] = { npc: n || null, sessionId: String(sessionId || "") };}catch(e){}}
function bd_linkGet(p, sessionId){
  try{
    var k = bd_linkKey(p);
    if(!k) return null;
    var v = DC_BD_LINK[k];
    if(!v) return null;
    if(sessionId && v.sessionId && String(v.sessionId) !== String(sessionId)) return null;
    return v.npc || null;
  }catch(e){ return null; }
}
function bd_linkClear(p){
  try{
    var k = bd_linkKey(p);
    if(!k) return;
    if(DC_BD_LINK.hasOwnProperty(k)) delete DC_BD_LINK[k];
  }catch(e){}
}
function bd_choiceKey(p){try{ return p.getUUID(); }catch(e){ return ""; }}
function bd_choiceMark(p, sessionId){
  try{
    var k = bd_choiceKey(p);
    if(!k) return;
    DC_BD_LAST_CHOICE[k] = { sid: String(sessionId || ""), at: Date.now() };
  }catch(e){}
}
function bd_choiceIsRecent(p, sessionId, withinMs){
  try{
    var k = bd_choiceKey(p);
    if(!k) return false;
    var v = DC_BD_LAST_CHOICE[k];
    if(!v) return false;
    // If sessionId is empty, treat as wildcard (some __guiClosed events have no payload sid).
    if(sessionId && String(sessionId) !== "" && v.sid && String(v.sid) !== String(sessionId)) return false;
    return (Date.now() - (v.at || 0)) <= Math.max(0, util_toInt(withinMs, 0));
  }catch(e){ return false; }
}
var DEFAULT_CFG = {
  basic: {
    displayArea: "",
    handItem: "",
    walkSpeed: 0,
    maxHealth: 20,
    returnHome: true,
    detectType: 0,
    detectTick: 20,
    visionDistance: 8,
    visionWidth: 1,
    radiusRange: 10,
    battleExclamation: {
      enable: false,
      concept: "modern",
      text: "!",
      style: {
        textColor: "#ffffff",
        glowColor: "#ffd84d",
        sceneTop: "#121a2a",
        sceneBottom: "#05070d",
        backgroundOpacity: 1,
        classicBoxColor: "#ffffff",
        classicBoxOpacity: 1,
        textScale: 1,
        cardScale: 1,
        markScale: 1,
        pulseSpeed: 900,
        shakeSpeed: 550
      },
      animation: {
        durationTicks: 24
      },
      sound: {
        mode: "playsound",
        id: "",
        volume: 1,
        pitch: 1,
        asset: {
          subPath: "",
          fileName: ""
        }
      }
    }
  },
  battleSettings: {
    rematchEnable: false,
    rematchMax: 0,
    rematchStartRound: 0,
    rematchRoundMode: "fixed"
  },
  battle: [],
  condition: [],
  after: { rounds: [] },
  globalCompatibility: {}
};
function cfg_loadRaw(n) {
  var sd = n.getStoreddata();
  var rawPath = sd.get(KEY.SPEC_PATH);
  var fallback = "customnpcs/dc_data/dc_trainers/spec/sample.json";
  var f = cfg_chk_resolveFile(rawPath, null);
  if (!f || !f.exists()) {
    f = cfg_chk_resolveFile(fallback, null);
  }
  if (!f || !f.exists()) {
    return null;
  }
  return { path: String(rawPath || fallback), file: f, raw: cfg_chk_readTextFile(f) };
}
function cfg_normalize(raw) {
  var out = cfg_chk_defaultConfig(DEFAULT_CFG);
  if (!raw) return out;
  cfg_chk_merge(out, raw);

  out.basic = out.basic || {};
  out.battleSettings = out.battleSettings || {};
  out.battle = Array.isArray(out.battle) ? out.battle : [];
  out.condition = Array.isArray(out.condition) ? out.condition : [];
  out.after = out.after || {};
  out.after.rounds = Array.isArray(out.after.rounds) ? out.after.rounds : [];
  out.globalCompatibility = out.globalCompatibility || {};

  if (out.basic.position && !out.position) out.position = out.basic.position;
  if (out.basic.npcDash && !out.npcDash) out.npcDash = out.basic.npcDash;
  if (out.battleSettings == null) out.battleSettings = {};
  if ((!raw.battleSettings || typeof raw.battleSettings !== "object") && out.battle && out.battle[0]) {
    var firstBattle = out.battle[0];
    if (firstBattle.rematchEnable != null) out.battleSettings.rematchEnable = firstBattle.rematchEnable === true;
    if (firstBattle.rematchMax != null) out.battleSettings.rematchMax = util_toInt(firstBattle.rematchMax, 0);
    if (firstBattle.rematchStartRound != null) out.battleSettings.rematchStartRound = util_toInt(firstBattle.rematchStartRound, 0);
    if (firstBattle.rematchRoundMode != null) out.battleSettings.rematchRoundMode = String(firstBattle.rematchRoundMode || "fixed");
  }
  return out;
}
function cfg_refresh(n) {
  var rawInfo = cfg_loadRaw(n);
  var td = n.getTempdata();
  if (!rawInfo) {
    td.put(KEY.CFG, JSON.stringify(cfg_chk_defaultConfig(DEFAULT_CFG)));
    td.put(KEY.CFG_RAW, "");
    return cfg_chk_defaultConfig(DEFAULT_CFG);
  }
  var parsed = null;
  var rawText = String(rawInfo.raw || "").replace(/^\uFEFF/, "");
  try {
    parsed = JSON.parse(rawText);
  } catch (e) {
    parsed = null;
  }
  var cfg = cfg_normalize(parsed);
  td.put(KEY.CFG_RAW, rawText);
  td.put(KEY.CFG, JSON.stringify(cfg));
  return cfg;
}
function cfg_get(n) {
  var td = n.getTempdata();
  var cached = td.get(KEY.CFG);
  if (cached) {
    try {
      return cfg_normalize(JSON.parse(String(cached)));
    } catch (e) {
      return cfg_refresh(n);
    }
  }
  return cfg_refresh(n);
}
function cfg_basic(n) {var cfg = cfg_get(n);return cfg.basic || {};}
function ret_setBattleHandItem(n) {
  var basic = cfg_basic(n);
  var itemId = String((basic && basic.handItem) || "").trim();
  try {
    if (!itemId) {
      n.setMainhandItem(n.getWorld().createItem("minecraft:air", 1));
      n.updateClient();
      return;
    }
    n.setMainhandItem(n.getWorld().createItem(itemId, 1));
    n.updateClient();
  } catch (e) {
    try { n.setMainhandItem(n.getWorld().createItem("minecraft:air", 1)); n.updateClient(); } catch (e2) {}
  }
}
function ret_clearHandItem(n) {
  try { n.setMainhandItem(n.getWorld().createItem("minecraft:air", 1)); n.updateClient(); } catch (e) {}
}
function cfg_roundPack(n, p) {
  var cfg = cfg_get(n);
  var idx = cond_round(n, p, cfg);
  var battle = cfg.battle[idx] || cfg.battle[0] || {};
  var afterRound = (cfg.after && cfg.after.rounds && cfg.after.rounds[idx]) ? cfg.after.rounds[idx] : {};
  return {
    cfg: cfg,
    round: idx,
    basic: cfg.basic || {},
    battleSettings: cfg.battleSettings || {},
    battle: battle,
    condition: cfg.condition[idx] || {},
    reward: afterRound,
    preSteps: battle.preSequenceEnabled === true ? ((battle.preSequence) || []) : [],
    afterSteps: afterRound.afterSequenceEnabled === true ? ((afterRound.afterSequence) || []) : []
  };
}
function ai_detect(n) {
  var cfg = cfg_get(n);
  var basic = cfg.basic || {};
  if (util_toInt(basic.detectType, 0) === 0) {
    n.timers.stop(TID.AI);
    return;
  }
  if (ai_isDenied(n)) {
    ai_stepDeny(n, util_toInt(basic.detectTick, 20));
    return;
  }
  if (bat_isLocked(n)) {
    var lockedTarget = bat_getTarget(n);
    if (ai_targetInvalid(n, lockedTarget, cfg)) {
      try{
        var td = n.getTempdata();
        var until = util_toInt(td.get(KEY.BAT_GRACE_UNTIL), 0);
        if(until && Date.now() < until){
          return;
        }
      }catch(eG0){}
      ret_cancel(n);
    }
    return;
  }
  var p = ai_findTarget(n, cfg);
  if (!p) return;
  if (n.canSeeEntity(p) !== true) return;
  if (ai_check(n, p) === false) return;
  flow_begin(n, p);
}
function ai_targetDistance(n, p) {
  if (!n || !p) return 9e9;
  try {
    var np = typeof n.getPos === "function" ? n.getPos() : null;
    var pp = typeof p.getPos === "function" ? p.getPos() : null;
    if (!np || !pp) return 9e9;
    if (typeof np.distanceTo === "function") return util_toF(np.distanceTo(pp), 9e9);
    var dx = util_toF(pp.x, 0) - util_toF(np.x, 0);
    var dy = util_toF(pp.y, 0) - util_toF(np.y, 0);
    var dz = util_toF(pp.z, 0) - util_toF(np.z, 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  } catch (e) {
    return 9e9;
  }
}
function ai_battleRangeLimit(n, cfg) {
  var basic = (cfg && cfg.basic) || {};
  var vision = util_toF(basic.visionDistance, 8);
  var radius = util_toF(basic.radiusRange, 10);
  return Math.max(8, vision, radius) + 3;
}
function ai_targetInvalid(n, p, cfg) {
  if (!p) return true;
  try {
    var gm = util_toInt(typeof p.getGamemode === "function" ? p.getGamemode() : -1, -1);
    if (gm === 1 || gm === 3) return true;
  } catch (e0) {
    return true;
  }
  return ai_targetDistance(n, p) > ai_battleRangeLimit(n, cfg);
}
function ai_findTarget(n, cfg) {
  var basic = (cfg && cfg.basic) || {};
  var type = util_toInt(basic.detectType, 0);
  if (type === 1) return ai_findFrontTarget(n, basic);
  if (type === 2) return ai_findRadiusTarget(n, basic);
  return null;
}
function ai_findFrontTarget(n, basic) {
  var w = n.getWorld();
  var range = util_toF(basic.visionDistance, 8) + 1;
  var list = w.getNearbyEntities(n.getPos(), range, 1);
  var face = util_fw(n);
  var best = null;
  var bestDot = 9e9;
  var ny = n.y;
  var width = util_toF(basic.visionWidth, 1);
  for (var i = 0; i < list.length; i++) {
    var p = list[i];
    var dx = p.x - n.x;
    var dz = p.z - n.z;
    var dot = dx * face.x + dz * face.z;
    if (dot > 0 && Math.abs(dx * face.z - dz * face.x) <= width && Math.abs(p.y - ny) <= 2 && dot < bestDot) {
      bestDot = dot;
      best = p;
    }
  }
  return best;
}
function ai_findRadiusTarget(n, basic) {
  var w = n.getWorld();
  var range = util_toF(basic.radiusRange, 10);
  var list = w.getNearbyEntities(n.getPos(), range + 1, 1);
  var best = null;
  var bestDist = 9e9;
  var ny = n.y;
  var rr = range * range;
  for (var i = 0; i < list.length; i++) {
    var p = list[i];
    var dx = p.x - n.x;
    var dz = p.z - n.z;
    var d2 = dx * dx + dz * dz;
    if (d2 <= rr && Math.abs(p.y - ny) <= 2 && d2 < bestDist) {
      bestDist = d2;
      best = p;
    }
  }
  return best;
}
function ai_check(n, p) {
  if (!p) return false;
  var td = n.getTempdata();
  var gm = p.getGamemode();
  if (gm === 1 || gm === 3) return false;
  if (td.get(KEY.LOCK)) return false;
  if (ai_isDenied(n)) return false;
  if (ai_isBattle(p) === false) return false;
  if (ai_targetDistance(n, p) > ai_battleRangeLimit(n, cfg_get(n))) return false;
  if (cond_check(n, p) === false) return false;
  return true;
}
function ai_dash(n, p, pos) {
  if (!pos || pos.dashEnable !== true || !p) return;
  var np = typeof n.getPos === "function" ? n.getPos() : null;
  var pp = typeof p.getPos === "function" ? p.getPos() : null;
  if (!np || !pp) return;
  var dx = util_toF(pp.x, 0) - util_toF(np.x, 0);
  var dz = util_toF(pp.z, 0) - util_toF(np.z, 0);
  var len = Math.sqrt(dx * dx + dz * dz);
  if (len <= 0) return;
  dx /= len;
  dz /= len;
  var pow = Math.max(0.45, Math.min(2.2, ai_targetDistance(n, p) * 0.22));
  try {
    n.setMotionX(dx * pow);
    n.setMotionY(0.1);
    n.setMotionZ(dz * pow);
  } catch (e) {}
}
function ai_isDenied(n) {
  var ticks = n.getStoreddata().get("deny_tick");
  return util_toInt(ticks, 0) > 0;
}
function ai_stepDeny(n, stepTicks) {
  var sd = n.getStoreddata();
  var left = util_toInt(sd.get("deny_tick"), 0);
  if (left <= 0) return 0;
  left -= Math.max(1, util_toInt(stepTicks, 1));
  if (left < 0) left = 0;
  sd.put("deny_tick", String(left));
  return left;
}
function ai_isBattle(p) {
  var b = BR.getBattleByParticipatingPlayer(p.getMCEntity());
  if (!b) return true;
  var actors = b.getActors();
  for (var i = 0; i < actors.size(); i++) {
    if (actors.get(i) instanceof TBA) return false;
  }
  for (var j = 0; j < actors.size(); j++) {
    var a2 = actors.get(j);
    if (a2 instanceof PBA) {
      var owner = a2.getPokemon().getOriginalPokemon().getOwnerPlayer();
      if (owner == null) return false;
    }
  }
  return false;
}
function cond_progress(n, p) {
  var raw = p.getStoreddata().get("trainerData");
  if (!raw) return null;
  try {
    var data = JSON.parse(String(raw));
    return data ? data[n.getUUID()] : null;
  } catch (e) {
    return null;
  }
}
function cond_totalRounds(cfg) {
  var settings = (cfg && cfg.battleSettings) || {};
  var exported = util_toInt(settings.maxBattleRounds, 0);
  if (exported > 0) return exported;
  var byRematch = util_toInt(settings.rematchMax, 0) + 1;
  var byBattle = cfg && Array.isArray(cfg.battle) ? cfg.battle.length : 0;
  return Math.max(1, byRematch, byBattle);
}
function cond_canChallenge(n, p, cfg) {
  var rec = cond_progress(n, p);
  if (!(rec && rec.firstClear === true)) return true;
  var settings = (cfg && cfg.battleSettings) || {};
  return settings.rematchEnable === true;
}
function cond_check(n, p) {return cond_sat(n, p).ok;}
function cond_sat(n, p) {
  var cfg = cfg_get(n);
  if (cond_canChallenge(n, p, cfg) === false) {
    return { ok: false, round: 0, mode: "and" };
  }
  var idx = cond_round(n, p, cfg);
  var pack = cfg.condition[idx] || {};
  var mode = (pack && pack.mode != null) ? String(pack.mode) : "and";
  var rules = Array.isArray(pack.list) ? pack.list : (Array.isArray(pack.rules) ? pack.rules : []);
  if (!rules.length) return { ok: true, round: idx, mode: mode };

  for (var i = 0; i < rules.length; i++) {
    var c = rules[i] || {};
    var type = String(c.type || "");
    var op = c.op != null ? String(c.op) : "";
    var key = c.key != null ? String(c.key) : "";
    var val = c.value != null ? c.value : null;
    var res = cond_one(n, p, type, op, key, val, c);
    if (mode === "or") {
      if (res.pass) return { ok: true, round: idx, mode: mode };
    } else {
      if (!res.pass) return { ok: false, round: idx, mode: mode };
    }
  }
  if (mode === "or") return { ok: false, round: idx, mode: mode };
  return { ok: true, round: idx, mode: mode };
}
function cond_one(n, p, type, op, key, val, entry) {
  var t = String(type || "").toLowerCase();
  var value = val != null ? val : (entry && entry.val != null ? entry.val : null);
  if (t === "advancement") t = "adv";
  if (t === "item") return cond_item(n, p, op, key, value);
  if (t === "stored") return cond_stored(n, p, op, key, value);
  if (t === "tag") return cond_tag(n, p, op, key);
  if (t === "faction") return cond_faction(n, p, op, key, value);
  if (t === "adv") return cond_adv(n, p, op, key);
  if (t === "ftb" && typeof cond_ftb === "function") return cond_ftb(n, p, op, key, value, entry && entry.task);
  if (t === "cobblemon_party" && typeof cond_cobblemon_party === "function") return cond_cobblemon_party(n, p, op, key, value);
  if (t === "cobbledollar" && typeof cond_cobbledollar === "function") return cond_cobbledollar(n, p, op, key, value);
  return { pass: false, msg: "UNKNOWN type " + type };
}
function cond_round(n, p, cfg) {
  var rec = cond_progress(n, p);
  if (!(rec && rec.firstClear === true)) return 0;
  var cleared = 1;
  if (rec.clearCount != null) {
    var cc = parseInt(rec.clearCount, 10);
    if (!isNaN(cc) && cc >= 1) cleared = cc;
  }
  var battleSettings = (cfg && cfg.battleSettings) || {};
  if (battleSettings.rematchEnable !== true) return 0;
  var maxRounds = cond_totalRounds(cfg);
  var last = Math.max(0, maxRounds - 1);
  var start = Math.max(0, Math.min(last, util_toInt(battleSettings.rematchStartRound, 0)));
  var mode = String(battleSettings.rematchRoundMode || "fixed").toLowerCase();
  var span = Math.max(1, last - start + 1);
  if (mode === "loop") return start + ((cleared - 1) % span);
  if (mode === "continue") return Math.min(last, start + cleared - 1);
  return start;
}
function flow_begin(n, p) {
  var td = n.getTempdata();
  var state = String(td.get(KEY.STATE) || "idle");
  if (td.get(KEY.BUSY) || state !== "idle") {
    return false;
  }
  if (flow_lock(n, p) === false) { return false; }
  ret_savePose(n);
  try { rot_face(n, p); } catch (e) {}
  rot_start(n);
  var pack = cfg_roundPack(n, p);
  var basic = pack.basic || {};
  var denyCooldown = Math.max(0, util_toInt((pack.battle || {}).denyCooldown, util_toInt((pack.battleSettings || {}).denyCooldown, 0)));
  td.put(KEY.DENY_COOLDOWN, String(denyCooldown));
  ai_dash(n, p, basic.npcDash || {});
  if (excl_shouldPlay(pack)) {
    excl_start(n, p, pack);
    return true;
  }
  flow_continueAfterExcl(n, pack);
  return true;
}
function flow_lock(n, p) {
  if (!p) return false;
  if (bat_isLocked(n)) {
    var lock = bat_getLock(n);
    if (lock && lock.uuid && String(lock.uuid) !== String(p.getUUID())) return false;
  }
  bat_lock(n, p);
  return true;
}
function bat_isLocked(n) {var td = n.getTempdata();return !!td.get(KEY.LOCK);}
function bat_getLock(n) {
  var td = n.getTempdata();
  var raw = td.get(KEY.LOCK);
  if (!raw) return null;
  try {return JSON.parse(String(raw));} catch (e) {return null;}
}
function bat_getTarget(n) {return n.getTempdata().get(KEY.TARGET);}
function bat_lock(n, p) {
  var td = n.getTempdata();
  var lock = {
    uuid: String(p.getUUID()),
    name: String(p.getName()),
    at: Date.now()
  };
  td.put(KEY.LOCK, JSON.stringify(lock));
  td.put(KEY.TARGET, p);
  td.put(KEY.TARGET_NAME, p.getName());
  td.put(KEY.TARGET_UUID, String(p.getUUID()));
  td.put(KEY.STATE, "locked");
  td.put(KEY.BUSY, "busy");
  return true;
}
function bat_unlock(n) {
  var td = n.getTempdata();
  td.remove(KEY.LOCK);
  td.remove(KEY.TARGET);
  td.remove(KEY.TARGET_NAME);
  td.remove(KEY.TARGET_UUID);
  td.remove(KEY.BUSY);
  td.remove(KEY.BD_ACTIVE);
  td.remove(KEY.BD_SESSION);
  td.remove(KEY.BD_DONE);
  td.remove(KEY.BD_DONE_ROUND);
  td.remove(KEY.BD_CFG);
  td.put(KEY.STATE, "idle");
}
function rot_start(n) {n.timers.forceStart(TID.ROT, 10, false);}
function rot_tick(n) {
  var p = bat_getTarget(n);
  if (!p || !bat_isLocked(n)) {n.timers.stop(TID.ROT);return;}
  rot_face(n, p);
  n.timers.forceStart(TID.ROT, 10, false);
}
function rot_face(n, p) {
  if (!n || !p) return;
  var dx = p.x - n.x;
  var dz = p.z - n.z;
  var yaw = Math.atan2(-dx, dz) * 180 / Math.PI;
  n.setRotation(yaw);
  n.updateClient();
}
function bat_facePair(n, p) {
  if (!n || !p) return;
  try {
    var np = typeof n.getPos === "function" ? n.getPos() : null;
    var pp = typeof p.getPos === "function" ? p.getPos() : null;
    if (np && pp) {
      var nyaw = Math.atan2(-(pp.x - np.x), pp.z - np.z) * 180 / Math.PI;
      n.setRotation(nyaw);
      if (typeof n.updateClient === "function") n.updateClient();
    } else {
      rot_face(n, p);
    }
  } catch (e) {}
  try {
    var np2 = typeof n.getPos === "function" ? n.getPos() : null;
    var pp2 = typeof p.getPos === "function" ? p.getPos() : null;
    var dx = np2 && pp2 ? util_toF(np2.x, 0) - util_toF(pp2.x, 0) : n.x - p.x;
    var dz = np2 && pp2 ? util_toF(np2.z, 0) - util_toF(pp2.z, 0) : n.z - p.z;
    var pyaw = Math.atan2(-dx, dz) * 180 / Math.PI;
    p.setRotation(pyaw);
    if (typeof p.updateClient === "function") p.updateClient();
  } catch (e2) {}
}
function excl_getConfig(pack) {
  var basic = (pack && pack.basic) || {};
  return basic.battleExclamation || {};
}
function excl_shouldPlay(pack) {
  var cfg = excl_getConfig(pack);
  return cfg && cfg.enable === true;
}
function excl_durationTicks(cfg) {
  return Math.max(1, util_toInt(cfg && cfg.animation && cfg.animation.durationTicks, 24));
}
function excl_bridgeEnvelope(eventName, payload) {
  return {
    type: String(eventName || "battleExclamationConfig"),
    eventName: String(eventName || "battleExclamationConfig"),
    data: payload,
    payload: payload
  };
}
function excl_playSound(n, p, cfg) {
  if (!cfg || !cfg.sound) return;
  try {
    if (typeof util_sound === "function") util_sound(p, cfg.sound);
  } catch (e) {}
}
function excl_openOverlay(p, cfg) {
  if (typeof cnpcext === "undefined" || !cnpcext || !p) return false;
  try {
    var bridge = cnpcext.getClientBridge(p.getMCEntity());
    if (!bridge || typeof bridge.openOverlay !== "function") return false;
    bridge.openOverlay("dc_battle_exclamation", "html/ds_battle_exclamation.html", 0, 0, 0, 0, JSON.stringify(cfg || {}));
    return true;
  } catch (e) {}
  return false;
}
function excl_closeOverlay(n, p) {
  try {
    var td = n ? n.getTempdata() : null;
    var overlayName = String(td && td.get(KEY.EXCL_OVERLAY) || "dc_battle_exclamation");
    if (p && typeof cnpcext !== "undefined" && cnpcext && typeof cnpcext.getClientBridge === "function") {
      var bridge = cnpcext.getClientBridge(p.getMCEntity());
      if (bridge && typeof bridge.closeOverlay === "function") bridge.closeOverlay(overlayName);
    }
  } catch (e) {}
}
function excl_sendBrowser(p, eventName, payload) {
  if (typeof cnpcext === "undefined" || !cnpcext || !p) return false;
  try {
    var bridge = cnpcext.getClientBridge(p.getMCEntity());
    if (!bridge || typeof bridge.sendToBrowser !== "function") return false;
    try {
      bridge.sendToBrowser(p.getMCEntity(), String(eventName || ""), JSON.stringify(payload || {}));
      return true;
    } catch (e0) {}
    bridge.sendToBrowser(String(eventName || ""), JSON.stringify(payload || {}));
    return true;
  } catch (e) {}
  return false;
}
function excl_play(n, p, cfg) {
  if (!p || !cfg) return;
  bat_facePair(n, p);
  excl_playSound(n, p, cfg);
  excl_openOverlay(p, cfg);
  excl_sendBrowser(p, "message", cfg);
  excl_sendBrowser(p, "battleExclamationConfig", cfg);
  excl_sendBrowser(p, "battle_exclamation_init", cfg);
}
function excl_send_tick(n) {
  var p = bat_getTarget(n);
  if (!p || !bat_isLocked(n)) {
    n.timers.stop(TID.EXCL_SEND);
    return;
  }
  var td = n.getTempdata();
  var tries = util_toInt(td.get(KEY.EXCL_SEND_TRY), 0);
  var pack = cfg_roundPack(n, p);
  var cfg = excl_getConfig(pack);
  if (!cfg || cfg.enable !== true) {
    n.timers.stop(TID.EXCL_SEND);
    return;
  }
  tries += 1;
  td.put(KEY.EXCL_SEND_TRY, String(tries));
  excl_sendBrowser(p, "message", cfg);
  excl_sendBrowser(p, "battleExclamationConfig", cfg);
  excl_sendBrowser(p, "battle_exclamation_init", cfg);
  if (tries < 5) {
    n.timers.forceStart(TID.EXCL_SEND, 2, false);
  } else {
    n.timers.stop(TID.EXCL_SEND);
  }
}
function excl_start(n, p, pack) {
  var cfg = excl_getConfig(pack);
  if (!cfg || cfg.enable !== true) {
    flow_continueAfterExcl(n, pack);
    return;
  }
  n.getTempdata().put(KEY.STATE, "exclamation");
  n.getTempdata().put(KEY.EXCL_OVERLAY, "dc_battle_exclamation");
  n.getTempdata().put(KEY.EXCL_SEND_TRY, "0");
  excl_play(n, p, cfg);
  n.timers.forceStart(TID.EXCL_SEND, 1, false);
  n.timers.forceStart(TID.EXCL, excl_durationTicks(cfg), false);
}
function excl_tick(n) {
  var p = bat_getTarget(n);
  if (!p || !bat_isLocked(n)) {
    n.timers.stop(TID.EXCL);
    ret_cancel(n);
    return;
  }
  excl_closeOverlay(n, p);
  var pack = cfg_roundPack(n, p);
  flow_continueAfterExcl(n, pack);
}
function flow_continueAfterExcl(n, pack) {
  var p = bat_getTarget(n);
  // Battle dialogue should play after exclamation and before any pre-sequence steps.
  if (p && bd_maybeStart(n, p, pack)) return;
  if (seq_hasSteps(pack.preSteps)) {
    seq_start(n, "pre", pack.round, pack.preSteps, seq_totalTicks(pack.preSteps, pack.battle.preSequenceTimelineTicks), "bat");
    return;
  }
  bat_begin(n);
}
function flow_continueAfterBattleDialogue(n, p) {
  if(!n || !p) return;
  var pack = cfg_roundPack(n, p);
  var round = util_toInt(pack && pack.round, 0);
  var preSteps = pack && pack.preSteps ? pack.preSteps : [];
  if (seq_hasSteps(preSteps)) {
    seq_start(n, "pre", round, preSteps, seq_totalTicks(preSteps, pack.battle.preSequenceTimelineTicks), "bat");
    return;
  }
  bat_begin(n);
}
function seq_hasSteps(steps) {return typeof seq_core_hasSteps === "function" ? seq_core_hasSteps(steps) : (Array.isArray(steps) && steps.length > 0);}
function seq_totalTicks(steps, fallback) {return typeof seq_core_calcTotal === "function" ? seq_core_calcTotal(steps, fallback) : Math.max(1, util_toInt(fallback, 20));}
function seq_token() {
  return String((new Date()).getTime()) + "_" + String(Math.floor(Math.random() * 900000 + 100000));
}
function seq_timerMapLoad(td) {
  var raw = td.get(KEY.SEQ_TIMER_MAP);
  if (!raw) return {};
  try {
    var parsed = JSON.parse(String(raw));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (e) {
    return {};
  }
}
function seq_timerMapSave(td, map) {
  td.put(KEY.SEQ_TIMER_MAP, JSON.stringify(map || {}));
}
function seq_timerClear(n) {
  if (!n || typeof n.getTempdata !== "function") return;
  var td = n.getTempdata();
  var map = seq_timerMapLoad(td);
  for (var id in map) {
    if (map.hasOwnProperty(id)) {
      try { n.timers.stop(util_toInt(id, 0)); } catch (e) {}
    }
  }
  td.remove(KEY.SEQ_TIMER_MAP);
}
function seq_timerReserve(n, timerName) {
  if (typeof NpcEventModule !== "undefined" && NpcEventModule && typeof NpcEventModule.reserveTimer === "function") {
    return NpcEventModule.reserveTimer("dc_trainer_seq", String(timerName || ""));
  }
  return 0;
}
function seq_timerSchedule(n, state, role, idx, delay) {
  if (!n || !state) return 0;
  var td = n.getTempdata();
  var timerName = String(state.token || seq_token()) + ":" + String(state.kind || "seq") + ":" + String(util_toInt(state.round, 0)) + ":" + String(role || "step") + ":" + String(util_toInt(idx, -1));
  var id = seq_timerReserve(n, timerName);
  if (!id) return 0;
  var map = seq_timerMapLoad(td);
  map[String(id)] = {
    token: String(state.token || ""),
    kind: String(state.kind || "seq"),
    round: util_toInt(state.round, 0),
    role: String(role || "step"),
    idx: util_toInt(idx, -1)
  };
  seq_timerMapSave(td, map);
  try { n.timers.stop(id); } catch (e0) {}
  n.timers.forceStart(id, Math.max(1, util_toInt(delay, 1)), false);
  return id;
}
function seq_stepExecute(n, state, idx) {
  if (!state || !Array.isArray(state.steps) || idx < 0 || idx >= state.steps.length) return false;
  var td = n.getTempdata();
  var started = state.started && typeof state.started === "object" ? state.started : {};
  var done = state.done && typeof state.done === "object" ? state.done : {};
  var step = state.steps[idx] || {};
  var ctx = seq_ctx(n, state);
  if (done[idx] === true) return false;
  if (started[idx] === true) return false;
  seq_runStep(n, ctx, step);
  started[idx] = true;
  done[idx] = true;
  state.started = started;
  state.done = done;
  td.put(KEY.SEQ_STATE, JSON.stringify(state));
  td.put(KEY.SEQ_DONE, JSON.stringify(done));
  td.put("dc_trainer_seq_started", JSON.stringify(started));
  return true;
}
function seq_schedule(n, state) {
  if (!n || !state) return;
  var td = n.getTempdata();
  var steps = Array.isArray(state.steps) ? state.steps : [];
  seq_timerClear(n);
  td.put(KEY.SEQ_STATE, JSON.stringify(state));
  td.put(KEY.SEQ_KIND, String(state.kind || "pre"));
  td.put(KEY.SEQ_NEXT, String(state.next || ""));
  td.put(KEY.SEQ_ROUND, String(util_toInt(state.round, 0)));
  td.put(KEY.SEQ_TICK, "0");
  td.put(KEY.SEQ_TOTAL, String(Math.max(1, util_toInt(state.total, 1))));
  td.put(KEY.SEQ_STEPS, JSON.stringify(steps));
  td.put(KEY.SEQ_DONE, JSON.stringify(state.done || {}));
  td.put(KEY.STATE, "seq");
  for (var i = 0; i < steps.length; i++) {
    var step = steps[i] || {};
    var delay = Math.max(1, util_toInt(step.startTick, 0) + 1);
    seq_timerSchedule(n, state, "step", i, delay);
  }
  seq_timerSchedule(n, state, "finish", -1, Math.max(1, util_toInt(state.total, seq_totalTicks(steps, 20))) + 1);
}
function seq_start(n, kind, roundIdx, steps, totalTicks, nextMode) {
  var td = n.getTempdata();
  var state = typeof seq_core_pack === "function"
    ? seq_core_pack(kind || "pre", roundIdx, typeof seq_core_prepareSteps === "function" ? seq_core_prepareSteps(steps) : (Array.isArray(steps) ? steps : []), totalTicks, nextMode || "")
    : { kind: String(kind || "pre"), round: util_toInt(roundIdx, 0), tick: 0, total: Math.max(1, util_toInt(totalTicks, seq_totalTicks(steps, 20))), steps: Array.isArray(steps) ? steps : [], done: {}, next: String(nextMode || "") };
  state.token = seq_token();
  state.started = {};
  state.done = {};
  state.started = state.started || {};
  seq_schedule(n, state);
}
function seq_handleTimer(n, e) {
  if (!n || !e || e.id == null) return false;
  var td = n.getTempdata();
  var raw = td.get(KEY.SEQ_TIMER_MAP);
  if (!raw) return false;
  var map = null;
  try { map = JSON.parse(String(raw)); } catch (err) { map = null; }
  if (!map) return false;
  var meta = map[String(e.id)];
  if (!meta) return false;
  var stateRaw = td.get(KEY.SEQ_STATE);
  if (!stateRaw) {
    delete map[String(e.id)];
    seq_timerMapSave(td, map);
    return true;
  }
  var state = null;
  try { state = JSON.parse(String(stateRaw)); } catch (err2) { state = null; }
  if (!state) {
    delete map[String(e.id)];
    seq_timerMapSave(td, map);
    return true;
  }
  if (String(meta.role || "") === "finish") {
    delete map[String(e.id)];
    seq_timerMapSave(td, map);
    seq_finish(n);
    return true;
  }
  if (String(meta.role || "") === "step") {
    var idx = util_toInt(meta.idx, -1);
    delete map[String(e.id)];
    seq_timerMapSave(td, map);
    seq_stepExecute(n, state, idx);
    return true;
  }
  return false;
}
function seq_ctx(n, state) {
  var p = bat_getTarget(n);
  var td = n.getTempdata();
  return {
    npc: n,
    player: p,
    cfg: cfg_get(n),
    targetName: td.get(KEY.TARGET_NAME),
    targetUuid: td.get(KEY.TARGET_UUID),
    round: util_toInt(state && state.round != null ? state.round : td.get(KEY.SEQ_ROUND), 0),
    kind: String(state && state.kind != null ? state.kind : td.get(KEY.SEQ_KIND))
  };
}
function js_stepRelativePath(step) {
  if (!step) return "";
  var sub = String(step.jsSubPath || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  var file = String(step.jsFileName || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!file) return "";
  return sub ? (sub + "/" + file) : file;
}
function js_stepLoadPath(step) {
  if (!step) return "";
  var raw = String(step.jsPath || "").trim().replace(/\\/g, "/");
  if (!raw) raw = js_stepRelativePath(step);
  if (!raw) return "";
  raw = raw.replace(/^minecraft\//, "");
  raw = raw.replace(/^customnpcs\/scripts\/ecmascript\/dc_lib\/?/, "");
  raw = raw.replace(/^scripts\/ecmascript\/dc_lib\/?/, "");
  raw = raw.replace(/^dc_lib\/?/, "");
  return JS_LIB_ROOT + "/" + raw;
}
function js_hasCallableEntry(text) {return /\bfunction\s+jsCall\s*\(/.test(String(text || ""));}
function js_loadStepModule(n, ctx, step) {
  var loadPath = js_stepLoadPath(step);
  if (!loadPath) {
    return false;
  }
  if (JS_MODULE_CACHE[loadPath] === true) {
    return true;
  }
  var file = cfg_chk_resolveFile(loadPath, null);
  if (!file || !file.exists()) {
    return false;
  }
  try {
    var raw = cfg_chk_readTextFile(file);
    if (!js_hasCallableEntry(raw)) {
      return false;
    }
    if (typeof load === "function") {
      load(String(file.getAbsolutePath()));
    } else {
      return false;
    }
    JS_MODULE_CACHE[loadPath] = true;
    return true;
  } catch (err) {
    return false;
  }
}
function js_runStep(n, ctx, step) {
  if (!js_loadStepModule(n, ctx, step)) return;
  try {
    var callOpts = {};
    if (step && typeof step === "object") {
      for (var k in step) {
        if (step.hasOwnProperty(k)) callOpts[k] = step[k];
      }
    }
    if (!callOpts.handItem && ctx && ctx.cfg && ctx.cfg.basic && ctx.cfg.basic.handItem) {
      callOpts.handItem = String(ctx.cfg.basic.handItem || "");
    }
    jsCall(ctx, callOpts);
  } catch (err) {
  }
}
function seq_runStep(n, ctx, step) {
  if (!step) return;
  var type = String(step.type || "");
  if (type === "message") {
    util_msgPrint(ctx.player, step);
    return;
  }
  if (type === "sound") {
    if (typeof util_sound === "function") util_sound(ctx.player, step);
    return;
  }
  if (type === "html") {
    if (typeof ds_ani_html === "function") ds_ani_html(ctx, step);
    return;
  }
  if (type === "js") {
    js_runStep(n, ctx, step);
    return;
  }
  if (type === "dialogue") {
    if (typeof ds_dialogue === "function") ds_dialogue(ctx, step);
    return;
  }
  if (type === "gecko") {
    if (typeof ds_ani_gecko === "function") ds_ani_gecko(ctx, step);
    return;
  }
  if (type === "cutscene") {
    if (step.command) n.executeCommand(String(step.command));
    return;
  }
}
function seq_finish(n) {
  var td = n.getTempdata();
  var next = String(td.get(KEY.SEQ_NEXT) || "");
  seq_timerClear(n);
  td.remove(KEY.SEQ_KIND);
  td.remove(KEY.SEQ_NEXT);
  td.remove(KEY.SEQ_ROUND);
  td.remove(KEY.SEQ_TICK);
  td.remove(KEY.SEQ_TOTAL);
  td.remove(KEY.SEQ_STEPS);
  td.remove(KEY.SEQ_DONE);
  td.remove(KEY.SEQ_STATE);
  td.remove(KEY.RETURN_HOME);
  if (next === "bat") {
    // Pre-sequence end -> start battle immediately (no extra startDelay gap)
    try{ td.put(KEY.BAT_SKIP_DELAY, "1"); }catch(e0){}
    bat_begin(n);
    return;
  }
  if (next === "ret") {ret_end(n);return;}
  td.put(KEY.STATE, "idle");
}
function bd_getActive(n){
  if(!n) return null;
  var td = n.getTempdata();
  if(!td || td.get(KEY.BD_ACTIVE) !== "1") return null;
  var raw = td.get(KEY.BD_CFG);
  if(!raw) return null;
  try{ return JSON.parse(String(raw)); }catch(e){ return null; }
}
function bd_isDone(n, round){
  var td = n.getTempdata();
  return td.get(KEY.BD_DONE) === "1" && String(td.get(KEY.BD_DONE_ROUND) || "") === String(round);
}
function bd_markDone(n, round){
  var td = n.getTempdata();
  td.put(KEY.BD_DONE, "1");
  td.put(KEY.BD_DONE_ROUND, String(round));
  td.remove(KEY.BD_ACTIVE);
  td.remove(KEY.BD_SESSION);
  td.remove(KEY.BD_CFG);
}
function bd_clearActive(n){
  var td = n.getTempdata();
  td.remove(KEY.BD_ACTIVE);
  td.remove(KEY.BD_SESSION);
  td.remove(KEY.BD_CFG);
}
function bd_setActive(n, sessionId, cfgObj){
  var td = n.getTempdata();
  td.put(KEY.BD_ACTIVE, "1");
  td.put(KEY.BD_SESSION, String(sessionId || ""));
  td.put(KEY.BD_CFG, JSON.stringify(cfgObj || {}));
}
function bd_closeHtml(p){
  try{
    if(typeof cnpcext === "undefined" || !cnpcext || !p) return;
    if(typeof cnpcext.getClientBridge !== "function") return;
    var br = null;
    try{ br = cnpcext.getClientBridge(p.getMCEntity()); }catch(e0){ br = null; }
    if(br && typeof br.closeHtmlGui === "function") br.closeHtmlGui();
  }catch(e){}
}
function bd_dialogueFullPath(rel){
  var clean = String(rel || "").trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if(!clean) return "";
  if(clean.toLowerCase().indexOf("customnpcs/") === 0) return clean;
  if(clean.toLowerCase().indexOf("dc_data/") === 0) return "customnpcs/" + clean;
  if(clean.toLowerCase().indexOf("dc_dialogues/") === 0) return "customnpcs/dc_data/" + clean;
  return "customnpcs/dc_data/dc_dialogues/" + clean;
}
function bd_guiFullPath(offset){
  var clean = String(offset || "").trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if(!clean) return "customnpcs/dc_data/dc_gui/dialogue_gui.json";
  if(clean.toLowerCase().indexOf("customnpcs/") === 0) return clean;
  if(clean.toLowerCase().indexOf("dc_data/") === 0) return "customnpcs/" + clean;
  if(clean.toLowerCase().indexOf("dc_gui/") === 0) return "customnpcs/dc_data/" + clean;
  if(clean.toLowerCase().endsWith(".json")) return "customnpcs/dc_data/dc_gui/" + clean;
  // keys like "dialogue_gui_default" -> treat as default file
  return "customnpcs/dc_data/dc_gui/dialogue_gui.json";
}
function bd_resolveGuiPath(pack, cfg){
  var src = String(cfg && cfg.guiSource || "default").trim().toLowerCase();
  var offset = String(cfg && cfg.guiOffset || "").trim();
  if(src === "custom" && offset){
    return bd_guiFullPath(offset);
  }
  if(src === "global"){
    var gc = (pack && pack.cfg && pack.cfg.globalCompatibility) ? pack.cfg.globalCompatibility : {};
    var enabled = gc && gc.battleDialogueGuiGlobalEnabled === true;
    var go = String(gc && gc.battleDialogueGuiGlobalOffset || "").trim();
    if(enabled && go) return bd_guiFullPath(go);
    return bd_guiFullPath("dialogue_gui.json");
  }
  return bd_guiFullPath(offset || "dialogue_gui.json");
}
function bd_readJson(path){
  if(!path) return null;
  if(typeof cfg_chk_resolveFile !== "function" || typeof cfg_chk_readJsonFile !== "function") return null;
  var f = null;
  try{ f = cfg_chk_resolveFile(path, null); }catch(e0){ f = null; }
  if(!f || !f.exists()) return null;
  try{
    var payload = cfg_chk_readJsonFile(f);
    return payload && payload.json ? payload.json : null;
  }catch(e1){
    return null;
  }
}
function bd_buildBindings(raw){
  var node = raw && raw.node && typeof raw.node === "object" ? raw.node : raw;
  var out = { text: [], choice: [] };
  if(node){
    var t = node.text != null ? node.text : (node.lines != null ? node.lines : null);
    if(Array.isArray(t)){
      for(var i=0;i<t.length;i++) out.text.push(String(t[i] || ""));
    }else if(typeof t === "string"){
      out.text.push(String(t || ""));
    }
  }
  var choices = node && Array.isArray(node.choice) ? node.choice : (node && Array.isArray(node.choices) ? node.choices : []);
  for(var j=0;j<choices.length;j++){
    var ch = choices[j] || {};
    var rawActions = Array.isArray(ch.actions) ? ch.actions : [];
    var normActions = [];
    for(var k=0;k<rawActions.length;k++){
      var a = rawActions[k] || {};
      if(!a || typeof a !== "object") continue;
      var rawType = String(a.type || a.action || "").toLowerCase();
      if(a.close === true || rawType === "close"){
        normActions.push({ close: true });
        continue;
      }
      var cmd = a.command != null ? a.command : (rawType === "command" ? a.value : null);
      if(cmd){
        normActions.push({ command: String(cmd) });
        continue;
      }
      var go = a.goto != null ? a.goto : (rawType === "goto" ? (a.target != null ? a.target : a.value) : null);
      if(go != null){
        var linkMode = String(a.linkMode || a.link || "internal").toLowerCase();
        if(linkMode === "external_json") linkMode = "external";
        if(linkMode === "internal_node") linkMode = "internal";
        normActions.push({ goto: String(linkMode === "external" ? (a.filePath || go) : go), linkMode: linkMode, filePath: String(a.filePath || "") });
        continue;
      }
      if(rawType === "store"){
        normActions.push({ store:{ key:String(a.key || ""), op:String(a.storeOp || a.op || "set"), value:a.value } });
        continue;
      }
      if(rawType === "tag"){
        normActions.push({ tag:{ key:String(a.key || a.tag || ""), op:String(a.op || "add") } });
        continue;
      }
      if(rawType === "ftb_task"){
        normActions.push({ ftb_task:{ quest:String(a.quest || ""), task:Number(a.task || 0) } });
        continue;
      }
      if(rawType === "ftb_complete"){
        normActions.push({ ftb_complete:{ quest:String(a.quest || "") } });
        continue;
      }
      if(rawType === "cobblemon_give"){
        normActions.push({ cobblemon_give:{ pokemon:String(a.pokemon || a.key || ""), amount:Number(a.amount || a.value || 1) } });
        continue;
      }
      if(rawType === "cobbledollar" || rawType === "cobbledollar_add" || rawType === "cobbledollar_take"){
        normActions.push({ cobbledollar:{ op:rawType === "cobbledollar_take" ? "take" : String(a.moneyOp || a.op || "add"), amount:Number(a.amount || 0) } });
        continue;
      }
    }
    out.choice.push({
      label: String(ch.label || ""),
      role: String(ch.role || ""),
      data: { actions: normActions }
    });
  }
  return out;
}
function bd_open(n, p, pack, cfgObj){
  if(typeof dc_dialogue_open !== "function") return false;
  var round = util_toInt(pack && pack.round, 0);
  var cfg = cfgObj && cfgObj.cfg ? cfgObj.cfg : {};
  var curPath = String(cfgObj && cfgObj.curPath || cfg.dialogueJsonPath || "").trim();
  if(!curPath) return false;
  var guiJsonPath = bd_resolveGuiPath(pack, cfg);
  var sessionId = String(Date.now()) + "_" + String(Math.floor(Math.random()*900000+100000));
  var wantedGoto = String(cfg && cfg.choiceGoto || "cobblemon_battle").trim();
  var handle = null;
  var evCtx = null;
  try{ evCtx = dc_evt_get(p); }catch(eEv0){ evCtx = null; }
  if(!evCtx) evCtx = { player: p, npc: n };
  try{
    handle = dc_dialogue_open(evCtx, {
      dialogueJsonPath: curPath,
      guiJsonPath: guiJsonPath,
      htmlPath: "html/dc_util/dc_gui_runtime.html",
      sessionId: sessionId,
      mode: "trainer_battle",
      returnGoto: wantedGoto
    });
  }catch(e0){
    handle = null;
  }
  if(handle == null) return false;
  bd_setActive(n, sessionId, { round: round, cfg: cfg, curPath: curPath });
  bd_linkSet(p, n, sessionId);
  try{ n.getTempdata().put(KEY.STATE, "battle_dialogue"); }catch(e1){}
  return true;
}
function bd_maybeStart(n, p, pack){
  var battle = (pack && pack.battle) ? pack.battle : {};
  var cfg = battle && battle.battleDialogue && typeof battle.battleDialogue === "object" ? battle.battleDialogue : null;
  if(!cfg || cfg.enabled !== true) return false;
  var round = util_toInt(pack && pack.round, 0);
  if(bd_isDone(n, round)) return false;
  var rel = String(cfg.dialogueJsonPath || "").trim();
  if(!rel) return false;
  return bd_open(n, p, pack, { round: round, cfg: cfg, curPath: rel });
}
function bd_handleChoice(n, p, payload){
  if(!n || !p || !payload) return false;
  var td = n.getTempdata();
  if(td.get(KEY.BD_ACTIVE) !== "1") return false;
  var session = String(td.get(KEY.BD_SESSION) || "");
  if(session && String(payload.sessionId || "") !== session) return false;
  var active = bd_getActive(n);
  if(!active || !active.cfg) return false;
    var actions = [];
  try{
    if(payload.data && Array.isArray(payload.data.actions)) actions = payload.data.actions;
    else if(Array.isArray(payload.actions)) actions = payload.actions;
  }catch(e0){ actions = []; }
  var wantedGoto = String(active.cfg.choiceGoto || "cobblemon_battle").trim();
  for(var i=0;i<actions.length;i++){
    var a0 = actions[i] || {};
    // accept normalized {close/command/goto} or typed {type,value}
    var aType = String(a0.type || "").toLowerCase();
    var isClose = (a0.close === true) || (aType === "close");
    var cmd = a0.command != null ? a0.command : (aType === "command" ? a0.value : null);
    var go = a0.goto != null ? a0.goto : (aType === "goto" ? a0.value : null);

    if(isClose){
      bd_closeHtml(p);
      bd_clearActive(n);
      ret_cancel(n);
      return true;
    }
    if(cmd){
      try{ n.executeCommand(String(cmd)); }catch(e1){}
    }
    if(a0.ftb_complete && typeof rew_chk_applyFtbComplete === "function"){
      rew_chk_applyFtbComplete(n, p, a0.ftb_complete.quest);
    }
    if(a0.cobblemon_give && typeof rew_chk_applyCobblemonGive === "function"){
      rew_chk_applyCobblemonGive(n, p, a0.cobblemon_give.pokemon, a0.cobblemon_give.amount);
    }
    if(a0.cobbledollar && typeof rew_chk_applyCobbleDollar === "function"){
      rew_chk_applyCobbleDollar(n, p, a0.cobbledollar.op, a0.cobbledollar.amount);
    }
    if(go){
      var g = String(go || "").trim();
      if(g && g.toLowerCase() === wantedGoto.toLowerCase()){
        bd_closeHtml(p);
        bd_markDone(n, util_toInt(active.round, 0));
        try{ n.getTempdata().put(KEY.BAT_SKIP_DELAY, "1"); }catch(e0){}
        bat_begin(n);
        return true;
      }
      // navigate to another dialogue node
      var sub = String(active.cfg.dialogueJsonSubPath || "").trim().replace(/\\/g, "/");
      if(sub && !/\/$/.test(sub)) sub += "/";
      var nextRel = g;
      if(nextRel && nextRel.toLowerCase().endsWith(".json") !== true) nextRel = nextRel + ".json";
      if(nextRel && nextRel.indexOf("/") < 0) nextRel = sub + nextRel;
      var nextCfg = { round: util_toInt(active.round, 0), cfg: active.cfg, curPath: nextRel };
      bd_closeHtml(p);
      bd_clearActive(n);
      var pack = cfg_roundPack(n, p);
      bd_open(n, p, pack, nextCfg);
      return true;
    }
  }
  return true;
}
function bd_handleClosed(n, p){
  if(!n || !p) return false;
  var td = n.getTempdata();
  if(td.get(KEY.BD_ACTIVE) !== "1") return false;
  bd_clearActive(n);
  ret_cancel(n);
  return true;
}
function bat_begin(n) {
  var p = bat_getTarget(n);
  if (!p) {
    ret_cancel(n);
    return;
  }
  var pack = cfg_roundPack(n, p);
  var battle = pack.battle || {};
  var delay = Math.max(0, util_toInt(battle.startDelay, 0));
  // If coming from a pre-sequence completion (seq_finish->bat), skip startDelay for immediate battle.
  var td0 = n.getTempdata();
  if (td0.get(KEY.BAT_SKIP_DELAY) === "1") {
    delay = 0;
    td0.remove(KEY.BAT_SKIP_DELAY);
  }
  // prevent AI detect from canceling while waiting the BAT delay
  var graceMs = (delay > 0 ? (delay * 50) : 0) + 1500;
  td0.put(KEY.BAT_GRACE_UNTIL, String(Date.now() + graceMs));
  ret_battlePose(n);
  if (delay > 0) {n.timers.forceStart(TID.BAT, delay, false);return;}
  bat_launch(n);
}
function bat_launch(n) {
  var p = bat_getTarget(n);
  n.getTempdata().remove(KEY.BAT_GRACE_UNTIL);
  if (!p) {
    ret_cancel(n);
    return;
  }
  var pack = cfg_roundPack(n, p);
  var battle = pack.battle || {};
  var specPath = String(battle.specPath || battle.trainerSpec || "").trim();
  if (!specPath) {
    ret_cancel(n);
    return;
  }
  if (spc_apply(n, specPath) === false) {
    ret_cancel(n);
    return;
  }
  bat_reposition(n, p, pack.basic, pack.battle);
  bat_startBattle(n, p, pack);
}
function bat_reposition(n, p, basic, battle) {
  var pos = (basic && basic.position) || {};
  if (pos.useReposition !== true) return;
  var yaw = n.getRotation() * Math.PI / 180;
  var dist = util_toF(pos.playerDistance, 0);
  var yoff = util_toF(pos.playerHeight, 0.5);
  var fx = -Math.sin(yaw) * dist;
  var fz = Math.cos(yaw) * dist;
  p.setPosition(n.getHomeX() + fx, n.getHomeY() + yoff, n.getHomeZ() + fz);
}
function bat_returnHome(n, basic, force) {
  if (force !== true && (basic && basic.returnHome) !== true) return;
  try {
    n.setPosition(n.getHomeX() + 0.5, n.getHomeY() + 1, n.getHomeZ() + 0.5);
  } catch (e) {}
}
function bat_startBattle(n, p, pack) {
  var battle = pack.battle || {};
  var battleFormat = String(battle.battleFormat || "GEN_9_SINGLES");
  var itemLimit = Math.max(0, util_toInt(battle.itemLimit, 0));
  var rules = "{maxItemUses:" + itemLimit + "}";
  var hook = "onwin {1:['@2 noppes script trigger 1 " + p.getName() + "'],2:['@1 noppes script trigger 2 " + p.getName() + "']}";
  ret_setBattleHandItem(n);
  try { n.setPosition(n.getHomeX() + 0.5, n.getHomeY() + 1, n.getHomeZ() + 0.5); } catch (e0) {}
  bat_facePair(n, p);
  var startSound = (((pack.cfg || {}).sound || {}).start) || null;
  if (startSound && (startSound.id || startSound.soundId) && typeof util_sound === "function") {
    util_sound(p, { mode: startSound.mode || startSound.soundMode || "playsound", id: startSound.id || startSound.soundId, volume: startSound.vol, pitch: startSound.pitch, asset: startSound.asset });
  }
  var cmdLine = "/tbcs battle " + battleFormat + " " + p.getName() + " vs " + n.getUUID() + " " + hook + " rules " + rules;
  n.executeCommand(cmdLine);
  rot_start(n);
  n.getTempdata().put(KEY.STATE, "battle");
}
function rew_clear(p, n) {
  var sd = p.getStoreddata();
  var raw = sd.get("trainerData");
  var obj = raw ? JSON.parse(raw) : {};
  var key = n.getUUID();
  var rec = obj[key] || {};
  rec.firstClear = true;
  rec.clearCount = util_toInt(rec.clearCount, 0) + 1;
  obj[key] = rec;
  sd.put("trainerData", JSON.stringify(obj));
}
function rew_grant(n, p, round) {
  var cfg = cfg_get(n);
  var reward = (cfg.after && cfg.after.rounds && cfg.after.rounds[round]) ? cfg.after.rounds[round] : null;
  if (!reward || !reward.list || !reward.list.length) {
    return;
  }
  var list = reward.list;
  var pick = typeof rew_chk_pickList === "function" ? rew_chk_pickList(list, reward.mode || "all") : list;
  for (var i = 0; i < pick.length; i++) {
    var r = pick[i];
    if (!r) continue;
    var type = String(r.type || "").toLowerCase();
    var value = r.value != null ? r.value : r.val;
    if (type === "advancement") type = "adv";
    if (type === "faction" && typeof rew_chk_applyFaction === "function") {
      rew_chk_applyFaction(p, r.key, value, r.operator);
    } else if (type === "item" && typeof rew_chk_applyItem === "function") {
      rew_chk_applyItem(p, r.key, value);
    } else if (type === "command" && typeof rew_chk_applyCommand === "function") {
      rew_chk_applyCommand(n, p, r.key);
    } else if (type === "adv" && typeof rew_chk_applyAdvancement === "function") {
      rew_chk_applyAdvancement(n, p, r.key, r.operator);
    } else if (type === "ftb_complete" && typeof rew_chk_applyFtbComplete === "function") {
      rew_chk_applyFtbComplete(n, p, r.key || r.quest);
    } else if (type === "cobbledollar_add" && typeof rew_chk_applyCobbleDollar === "function") {
      rew_chk_applyCobbleDollar(n, p, "add", value);
    } else if (type === "cobbledollar_take" && typeof rew_chk_applyCobbleDollar === "function") {
      rew_chk_applyCobbleDollar(n, p, "take", value);
    } else if (type === "cobblemon_give" && typeof rew_chk_applyCobblemonGive === "function") {
      rew_chk_applyCobblemonGive(n, p, r.key || r.pokemon, value);
    }
  }
  try { p.updatePlayerInventory(); } catch (e) {}
}
function ret_init(n) {ret_reset(n, "init");}
function cfg_setBasicReturnHome(n, value) {
  var td = n.getTempdata();
  var raw = td.get(KEY.CFG);
  if (!raw) return false;
  var cfg = null;
  try { cfg = JSON.parse(String(raw)); } catch (e) { cfg = null; }
  if (!cfg) return false;
  cfg.basic = cfg.basic || {};
  cfg.basic.returnHome = value === true;
  try {
    td.put(KEY.CFG, JSON.stringify(cfg_normalize(cfg)));
    return true;
  } catch (e2) {
    return false;
  }
}
function ret_savePose(n) {
  var sd = n.getStoreddata();
  var cfg = cfg_get(n);
  var basic = cfg.basic || {};
  sd.put(KEY.SPEED, n.ai.getWalkingSpeed());
  sd.put(KEY.STANDING, n.ai.getStandingType());
  sd.put(KEY.ANGLE, n.getRotation());
  sd.put(KEY.RETURN_HOME, basic.returnHome === true ? "true" : "false");
  cfg_setBasicReturnHome(n, false);
}
function ret_battlePose(n) {
  var cfg = cfg_get(n);
  var basic = cfg.basic || {};
  var mh = Math.max(1, util_toInt(basic.maxHealth, 20));
  try {
    n.getStats().setMaxHealth(mh);
    n.setHealth(mh);
  } catch (e) {}
  try {
    n.ai.setStandingType(1);
    n.ai.setWalkingSpeed(0);
  } catch (e2) {}
  n.updateClient();
}
function ret_restorePose(n) {
  var sd = n.getStoreddata();
  var speed = util_toF(sd.get(KEY.SPEED), NaN);
  var standing = util_toInt(sd.get(KEY.STANDING), NaN);
  var angle = util_toF(sd.get(KEY.ANGLE), NaN);
  var returnHomeRaw = String(sd.get(KEY.RETURN_HOME) || "");
  try {if (!isNaN(standing)) n.ai.setStandingType(standing);} catch (e) {}
  try {if (!isNaN(speed)) n.ai.setWalkingSpeed(speed);} catch (e2) {}
  try {if (!isNaN(angle)) n.setRotation(angle);} catch (e3) {}
  if (returnHomeRaw === "true" || returnHomeRaw === "false") {
    cfg_setBasicReturnHome(n, returnHomeRaw === "true");
  }
  n.updateClient();
}
function ret_cancel(n) {ret_reset(n, "cancel");}
function ret_end(n) {ret_reset(n, "end");}
function ret_stopSounds(n, p) {
  if (!n || !p) return;
  // Stop vanilla sounds that may be looping (safe even if nothing is playing).
  try {
    var name = String(p.getName ? p.getName() : "");
    if (name && typeof n.executeCommand === "function") {
      // Stop the most common categories. (Different MC versions vary a bit.)
      var cats = ["master", "music", "record", "weather", "block", "hostile", "neutral", "player", "ambient", "voice"];
      for (var i = 0; i < cats.length; i++) {
        try { n.executeCommand("stopsound " + name + " " + cats[i]); } catch (e0) {}
      }
    }
  } catch (e1) {}

  // Close html sound overlay (asset loader) if open.
  try {
    if (typeof cnpcext !== "undefined" && cnpcext) {
      if (typeof cnpcext.closeOverlay === "function") {
        try { cnpcext.closeOverlay(p, "npc_sound_once"); } catch (e2) {}
      } else if (typeof cnpcext.getClientBridge === "function") {
        var bridge = null;
        try { bridge = cnpcext.getClientBridge(p.getMCEntity()); } catch (e3) { bridge = null; }
        if (bridge && typeof bridge.closeOverlay === "function") {
          try { bridge.closeOverlay("npc_sound_once"); } catch (e4) {}
        }
      }
    }
  } catch (e5) {}
}
function ret_reset(n, mode) {
  var td = n.getTempdata();
  var p = bat_getTarget(n);
  try{ if(p) dc_evt_clear(p); }catch(eEvtClr){}
  var cfg = cfg_get(n);
  var basic = cfg.basic || {};
  var pack = p ? cfg_roundPack(n, p) : null;
  var battle = pack && pack.battle ? pack.battle : {};
  var denyCooldown = Math.max(0, util_toInt(td.get(KEY.DENY_COOLDOWN), util_toInt(battle.denyCooldown, util_toInt((cfg.battleSettings || {}).denyCooldown, 0))));
  n.timers.stop(TID.ROT);
  n.timers.stop(TID.BAT);
  n.timers.stop(TID.EXCL);
  try{ td.remove(KEY.BAT_GRACE_UNTIL); }catch(eG3){}
  try{ td.remove(KEY.BAT_SKIP_DELAY); }catch(eG4){}
  try {
    // Never close arbitrary GUIs. Only close our html gui if open.
    if (typeof bd_closeHtml === "function" && p) bd_closeHtml(p);
  } catch (e0) {}
  try {
    excl_closeOverlay(n, p);
  } catch (e1) {}
  try {
    if (mode === "end" || mode === "cancel") ret_stopSounds(n, p);
  } catch (eS0) {}

  if (mode !== "init") {ret_restorePose(n);}
  ret_clearHandItem(n);
  try {n.setPosition(n.getHomeX() + 0.5, n.getHomeY() + 1, n.getHomeZ() + 0.5);} catch (e2) {}

  bat_unlock(n);
  td.remove(KEY.TARGET);
  td.remove(KEY.SEQ_KIND);
  td.remove(KEY.SEQ_NEXT);
  td.remove(KEY.SEQ_ROUND);
  td.remove(KEY.SEQ_TICK);
  td.remove(KEY.SEQ_TOTAL);
  td.remove(KEY.SEQ_STEPS);
  td.remove(KEY.SEQ_DONE);
  td.remove(KEY.SEQ_TIMER_MAP);
  td.remove(KEY.DENY_COOLDOWN);
  td.put(KEY.STATE, "idle");
  td.remove(KEY.EXCL_OVERLAY);
  td.remove(KEY.EXCL_SEND_TRY);

  if (mode !== "init" && denyCooldown > 0) {
    td.remove(KEY.LOCK);
    td.remove(KEY.TARGET);
    td.remove(KEY.TARGET_NAME);
    td.remove(KEY.TARGET_UUID);
    n.getStoreddata().put("deny_tick", String(denyCooldown));
  } else if (mode === "init") {
    n.getStoreddata().put("deny_tick", "0");
  }

  if (mode === "init" || util_toInt(basic.detectType, 0) !== 0) {
    n.timers.stop(TID.AI);
    n.timers.forceStart(TID.AI, util_toInt(basic.detectTick, 20), true);
  }
}
function spc_detach(n) {
  var sd = n.getStoreddata();
  var old = sd.get("trainer_attached_id");
  if (!old) return;
  try {
    RCTApi.getInstance("tbcs").getTrainerRegistry().unregisterById(old);
  } catch (e) {}
  sd.remove("trainer_attached_id");
}
function spc_id() {return "trainer_" + Math.floor(Math.random() * 900000 + 100000);}
function spc_baseDir(n) {
  var rawInfo = cfg_loadRaw(n);
  if (!rawInfo || !rawInfo.file) return null;
  var root = rawInfo.file;
  for (var i = 0; i < 4 && root; i++) {
    root = root.getParentFile();
  }
  return root && root.exists() ? root : null;
}
function spc_resolve(n, specPath) {
  var raw = spc_normalizePathText(specPath);
  if (!raw) return null;
  var base = spc_baseDir(n);
  var f = cfg_chk_resolveFile(spc_joinPartyPath(raw), base);
  if (!f || !f.exists()) {
    var rawInfo = cfg_loadRaw(n);
    var parent = rawInfo && rawInfo.file ? rawInfo.file.getParentFile() : null;
    f = cfg_chk_resolveFile(spc_joinPartyPath(raw), parent);
  }
  if (!f || !f.exists()) return null;
  return f;
}
function spc_joinPartyPath(relativePath) {
  var rel = String(relativePath || "").trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (!rel) return "customnpcs/dc_data/dc_trainers/pokemonparty";
  return "customnpcs/dc_data/dc_trainers/pokemonparty/" + rel;
}
function spc_normalizePathText(specPath) {
  var raw = String(specPath || "").trim().replace(/\\/g, "/");
  if (!raw) return "";
  var roots = [
    "minecraft/customnpcs/dc_data/dc_trainers/pokemonparty/",
    "customnpcs/dc_data/dc_trainers/pokemonparty/",
    "dc_data/dc_trainers/pokemonparty/",
    "dc_trainers/pokemonparty/",
    "customnpcs/dc_trainers/pokemonparty/",
    "customnpcs/dc_trainers/",
    "pokemonparty/"
  ];
  for (var i = 0; i < roots.length; i++) {
    var root = roots[i];
    var idx = raw.lastIndexOf(root);
    if (idx >= 0) {
      return raw.slice(idx + root.length);
    }
  }
  return raw.replace(/^\/+/, "");
}
function spc_load(f) {return cfg_chk_readTextFile(f);}
function spc_temp(n, spec, id, displayName) {
  var src = spc_resolve(n, spec);
  if (!src) return null;
  var raw = spc_load(src);
  var mod = raw.replace(/"name"\s*:\s*"([^"]*)"/, '"name": "' + String(displayName || "Trainer") + '"');
  return {
    file: src,
    raw: mod
  };
}
function spc_register(n, id, rawText) {
  var api = RCTApi.getInstance("tbcs");
  var reg = api.getTrainerRegistry();
  var gson = api.gsonBuilder().disableHtmlEscaping().create();
  var model = gson.fromJson(String(rawText), TrainerModel.class);
  try {
    reg.unregisterById(id);
  } catch (e) {}
  var trainerObj = reg.registerNPC(id, model);
  if (!trainerObj) return null;
  trainerObj.setEntity(n.getMCEntity());
  return trainerObj;
}
function spc_apply(n, specPath) {
  if (!specPath) { return false; }
  spc_detach(n);
  var id = spc_id();
  var normalized = spc_normalizePathText(specPath);
  var temp = spc_temp(n, normalized, id, n.getDisplay().getName());
  if (!temp) {
    return false;
  }
  var trainerObj = spc_register(n, id, temp.raw);
  if (!trainerObj) {
    return false;
  }
  n.getStoreddata().put("trainer_attached_id", id);
  return true;
}

function dc_trainer_syncAiTimer(n) {
  if (!n) return;
  var basic = cfg_basic(n);
  var detectType = util_toInt(basic.detectType, 0);
  if (detectType !== 0) {
    n.timers.forceStart(TID.AI, util_toInt(basic.detectTick, 20), true);
  } else {
    n.timers.stop(TID.AI);
  }
}
function dc_trainer_core_module(){
  return {
    events: {
      init: function (e) {
        var n = e.npc;
        // Reload config on init so spec edits apply without requiring a full restart.
        try { cfg_refresh(n); } catch (eCfg0) {}
        var td = n ? n.getTempdata() : null;
        var already = td && td.get(KEY.INIT_DONE) === "1";
        if (!already) {
          if (td) td.put(KEY.INIT_DONE, "1");
          n.timers.clear();
          ret_init(n);
          ret_clearHandItem(n);
        }
        dc_trainer_syncAiTimer(n);
      },
      interact: function (e) {
        var n = e.npc;
        var p = e.player;
        var basic = cfg_basic(n);
        if (util_toInt(basic.detectType, 0) !== 0) return;
        if (ai_check(n, p) === false) return;
        dc_evt_store(p, e);
        flow_begin(n, p);
      }
    }
  };
}
function dc_trainer_timer_module(){
  return {
    events: {
      timer: function (e) {
        var n = e.npc;
        if (seq_handleTimer(n, e) === true) return;
        if (e.id === TID.AI) {
          ai_detect(n);
        } else if (e.id === TID.ROT) {
          rot_tick(n);
        } else if (e.id === TID.EXCL) {
          excl_tick(n);
        } else if (e.id === TID.EXCL_SEND) {
          excl_send_tick(n);
        } else if (e.id === TID.BAT) {
          bat_launch(n);
        }
      }
    }
  };
}
function dc_trainer_reward_module(){
  return {
    events: {
      trigger: function (e) {
        var n = e.entity;

        var p = e.arguments && e.arguments.length ? n.getWorld().getPlayer(e.arguments[0]) : null;
        if (!p) p = bat_getTarget(n);
        if (!p) return;
        var pack = cfg_roundPack(n, p);
        var round = pack.round;
        if (e.id === 1) {
          rew_grant(n, p, round);
          rew_clear(p, n);
          if (seq_hasSteps(pack.afterSteps)) {
            seq_start(n, "after", round, pack.afterSteps, seq_totalTicks(pack.afterSteps, (((pack.reward || {}).afterSequenceTimelineTicks) || 20)), "ret");
            return;
          }
          ret_end(n);
          return;
        }
        if (e.id === 2) {ret_cancel(n);return;}
        ret_cancel(n);
      }
    }
  };
}

function dc_trainer_overlay_module(){
  return {
    events: {
      htmlGuiEvent: function (e) {
  
        if (!e) return;

        var n = e.npc;
        var p = e.player;
        var evName = String(e.eventName || "");

        var payload = e.data;
        if (typeof payload === "string") {
          try { payload = JSON.parse(String(payload)); } catch (err0) { payload = null; }
        }
        var sidForChoice = "";
        sidForChoice = payload && typeof payload === "object" ? String(payload.sessionId || "") : "";
        if (p) {
          if (evName === "choice") {
            bd_choiceMark(p, sidForChoice);
          } else if (evName === "__guiClosed" || evName === "done") {
            // closing immediately after a choice is expected (choice handler closes gui). Don't cancel flow for that.
            if (bd_choiceIsRecent(p, sidForChoice, 1200) || bd_choiceIsRecent(p, "", 1200)) {
              return;
            }
          }
        }

        if (!n && p) {
          var sidLink = payload && typeof payload === "object" ? String(payload.sessionId || "") : "";
          n = bd_linkGet(p, sidLink) || bd_linkGet(p, "") || n;
        }
        if (p && (evName === "__guiClosed" || evName === "done")) {
          bd_linkClear(p);
        }

        if (p) {
          // Dialogue util (battle dialogue): consumes htmlGuiEvent and returns a result.
          try{
            if (typeof dc_dialogue_handleHtmlEvent === "function") {
              
              var eCtx = e;
              if ((!e || e.npc == null) && n) {
                eCtx = { player: p, npc: n, eventName: e && e.eventName, data: e && e.data, id: e && e.id };
              }
              var handled = dc_dialogue_handleHtmlEvent(eCtx);
    
              if (handled && handled.handled === true) {
         
                var res = handled.result || {};
                var nn = n || (e && e.npc) || null;
                var td = null;
                td = nn && typeof nn.getTempdata === "function" ? nn.getTempdata() : null;
                if (td && td.get(KEY.BD_ACTIVE) === "1") {
                  var active = bd_getActive(nn) || {};
                  var round = util_toInt(active.round, 0);
                  if (res && res.done === true) {
                    bd_linkClear(p);
                    if (String(res.reason || "") === "return") {
                      // Ensure battle target is locked (detection-based triggers may open dialogue without flow_begin()).
                      var curT = bat_getTarget(nn);
                      if(!curT) bat_lock(nn, p);
                      // Battle dialogue return -> start immediately (no startDelay gap)
                      nn.getTempdata().put(KEY.BAT_SKIP_DELAY, "1");
                      bd_markDone(nn, round);
                      flow_continueAfterBattleDialogue(nn, p);
                      return;
                    }
                    bd_clearActive(nn);
                    ret_cancel(nn);
                    return;
                  }
                }
                return; // handled by dialogue util, nothing else to do
              }
            }
          }catch(err1){}
        }

        if (evName !== "sound_done") return;
        try {
          if (typeof cnpcext === "undefined" || !cnpcext || typeof cnpcext.closeOverlay !== "function") return;
          cnpcext.closeOverlay(e.player, "npc_sound_once");
        } catch (err) {}
      }
    }
  };
}
function dc_trainer_pendingModules() {
  if (typeof __DcNpcEventPendingModules === "undefined" || !__DcNpcEventPendingModules) __DcNpcEventPendingModules = [];
  return __DcNpcEventPendingModules;
}
function dc_trainer_registerOrQueue(name, module) {
  if (typeof NpcEventModule !== "undefined" && NpcEventModule && typeof NpcEventModule.registerModule === "function") {
    NpcEventModule.registerModule(name, module);
    return;
  }
  dc_trainer_pendingModules().push({
    name: name,
    module: module
  });
}
dc_trainer_registerOrQueue("dc_trainer_core", dc_trainer_core_module());
dc_trainer_registerOrQueue("dc_trainer_timer", dc_trainer_timer_module());
dc_trainer_registerOrQueue("dc_trainer_reward", dc_trainer_reward_module());
dc_trainer_registerOrQueue("dc_trainer_overlay", dc_trainer_overlay_module());

function htmlGuiEvent(e){
  try{ if(typeof NpcEventModule !== "undefined" && NpcEventModule && typeof NpcEventModule.emit === "function"){ NpcEventModule.emit("htmlGuiEvent", e); } }catch(err1){}
}
