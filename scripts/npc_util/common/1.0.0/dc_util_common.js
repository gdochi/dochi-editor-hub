// Minimal common utility helpers for NPC scripts.
// Load this before scripts that use util_* helpers.

var API = Java.type("noppes.npcs.api.NpcAPI").Instance();
var TID = {
  // AI detection timer, repeated by detectTick.
  AI: 10,
  // Battle facing correction timer, rearmed every 10 ticks.
  ROT: 20,
  // Sequence playback timer, single-tick rearm.
  SEQ: 30,
  // Battle preparation / delay timer.
  BAT: 40,
  // Battle exclamation timer, runs before pre-sequence playback.
  EXCL: 50,
  // Battle exclamation browser handshake timer.
  EXCL_SEND: 51
};

function util_toInt(v, d) {
  var n = parseInt(String(v), 10);
  return isNaN(n) ? d : n;
}

function util_toF(v, d) {
  var n = parseFloat(String(v));
  return isNaN(n) ? d : n;
}

function util_fw(n) {
  var r = n.getRotation() * Math.PI / 180;
  return { x: -Math.sin(r), z: Math.cos(r) };
}

function util_msgPrint(p, step) {
  if (!p || !step) return;
  var text = step.text != null ? String(step.text) : "";
  if (!text) return;
  var lines = text.split("@@");
  for (var i = 0; i < lines.length; i++) {
    p.message(lines[i]);
  }
}

function util_soundPath(cfg) {
  var sound = cfg && cfg.sound ? cfg.sound : cfg;
  var asset = sound && sound.asset ? sound.asset : null;
  var subPath = asset ? String(asset.subPath || "").trim() : "";
  var fileName = asset ? String(asset.fileName || "").trim() : "";
  var path = String(sound && (sound.soundPath || sound.path || sound.src || sound.id || sound.soundId) || "").trim();
  if (path) return path;
  if (subPath || fileName) {
    if (subPath && fileName) return "sounds/" + subPath.replace(/^\/+|\/+$/g, "") + "/" + fileName.replace(/^\/+/g, "");
    if (subPath) return "sounds/" + subPath.replace(/^\/+|\/+$/g, "");
    return "sounds/" + fileName.replace(/^\/+/g, "");
  }
  return "";
}

function util_soundPlay(p, id, pitch, volume) {
  var soundId = String(id || "").trim();
  if (!p || typeof p.playSound !== "function" || !soundId) return false;
  try {
    p.playSound(soundId, util_toF(volume, 1), util_toF(pitch, 1));
    return true;
  } catch (e) {}
  return false;
}

function util_soundHtml(p, sound) {
  if (!p || !sound) return false;
  if (typeof cnpcext === "undefined" || !cnpcext || typeof cnpcext.getClientBridge !== "function") return false;
  var bridge = null;
  try {
    bridge = cnpcext.getClientBridge(p.getMCEntity());
  } catch (e0) {
    bridge = null;
  }
  if (!bridge || typeof bridge.openOverlay !== "function") return false;
  try {
    var cfg = sound.sound ? sound.sound : sound;
    bridge.openOverlay(
      String(cfg.overlayName || cfg.name || "npc_sound_once"),
      String(cfg.htmlPath || "html/dc_util/dc_sound.html"),
      0, 0, 0, 0,
      JSON.stringify({
        soundPath: util_soundPath(cfg),
        volume: util_toF(cfg.volume != null ? cfg.volume : cfg.vol, 1),
        pitch: util_toF(cfg.pitch, 1),
        autoCloseMs: util_toInt(cfg.autoCloseMs, 3000)
      })
    );
    return true;
  } catch (e1) {}
  return false;
}

function util_sound(p, sound) {
  var cfg = sound && sound.sound ? sound.sound : sound;
  if (!p || !cfg) return false;

  var mode = String(cfg.mode || cfg.soundMode || "playsound").toLowerCase();
  if (mode === "asset_loader" || mode === "html" || mode === "overlay") {
    return util_soundHtml(p, cfg);
  }

  return util_soundPlay(p, String(cfg.id || cfg.soundId || cfg.src || cfg.path || ""), cfg.pitch, cfg.volume != null ? cfg.volume : cfg.vol);
}

function util_playSound(p, id, pitch, volume) { return util_soundPlay(p, id, pitch, volume); }
function util_assetSound(p, sound) { return util_soundHtml(p, sound); }
