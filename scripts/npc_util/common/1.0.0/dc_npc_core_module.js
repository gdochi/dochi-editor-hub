var NpcEventModule = NpcEventModule || {};
var NpcEventModuleDebugEnabled = true;

function debugSay(e, msg) {
  if (!NpcEventModuleDebugEnabled) return;
  try {
    var npc = e && (e.npc || e.entity);
    if (npc && typeof npc.say === "function") npc.say(String(msg || ""));
  } catch (err) {}
}

(function (ns) {
  var modules = {};
  var handlers = {};
  var timerIds = {};
  var timerKeys = {};
  var nextTimerId = 1000;

  function addHandler(eventName, fn) {
    if (!eventName || typeof fn !== "function") return;
    var key = String(eventName);
    if (!handlers[key]) handlers[key] = [];
    handlers[key].push(fn);
  }
  function register(eventName, fn) {
    addHandler(eventName, fn);
  }
  function registerModule(name, mod) {
    if (!name || !mod) return;
    modules[String(name)] = mod;
    if (!mod.events) return;
    for (var key in mod.events) {
      if (mod.events.hasOwnProperty(key)) addHandler(key, mod.events[key]);
    }
  }
  function emit(eventName, e) {
    var list = handlers[String(eventName)];

    if (!list || !list.length) return;
    for (var i = 0; i < list.length; i++) {
      try {
        list[i](e, ns);
      } catch (err) {}
    }
  }
  function reserveTimer(moduleName, timerName) {
    var key = String(moduleName || "") + ":" + String(timerName || "");
    var id = timerIds[key];
    if (id != null) return id;
    id = nextTimerId++;
    timerIds[key] = id;
    timerKeys[String(id)] = key;
    return id;
  }
  function bindTimer(id, moduleName, timerName) {
    var key = String(moduleName || "") + ":" + String(timerName || "");
    timerKeys[String(id)] = key;
    timerIds[key] = id;
    return id;
  }
  function startTimer(npc, moduleName, timerName, delay, repeat) {
    if (!npc || !npc.timers) return 0;
    var id = reserveTimer(moduleName, timerName);
    bindTimer(id, moduleName, timerName);
    npc.timers.forceStart(id, Math.max(1, Number(delay || 1)), repeat === true);
    return id;
  }
  function dispatchTimer(e) {
    var id = e && e.id != null ? String(e.id) : "";
    var key = timerKeys[id];
    if (key) {

      emit("timer:" + key, e);
      return;
    }

    emit("timer:" + id, e);
    emit("timer", e);
  }
  ns.register = register;
  ns.registerModule = registerModule;
  ns.emit = emit;
  ns.reserveTimer = reserveTimer;
  ns.bindTimer = bindTimer;
  ns.startTimer = startTimer;
  ns.dispatchTimer = dispatchTimer;
  ns._handlers = handlers;
  ns._modules = modules;
})(NpcEventModule);

function init(e) { NpcEventModule.emit("init", e); }
function interact(e) { NpcEventModule.emit("interact", e); }
function collide(e) { NpcEventModule.emit("collide", e); }
function damaged(e) { NpcEventModule.emit("damaged", e); }
function died(e) { NpcEventModule.emit("died", e); }
function kill(e) { NpcEventModule.emit("kill", e); }
function meleeAttack(e) { NpcEventModule.emit("meleeAttack", e); }
function rangedAttack(e) { NpcEventModule.emit("rangedAttack", e); }
function target(e) { NpcEventModule.emit("target", e); }
function targetLost(e) { NpcEventModule.emit("targetLost", e); }
function tick(e) { NpcEventModule.emit("tick", e); }
function timer(e) { NpcEventModule.dispatchTimer(e); }
function htmlGuiEvent(e) { NpcEventModule.emit("htmlGuiEvent", e); }
function trigger(e) { NpcEventModule.emit("trigger", e); }
