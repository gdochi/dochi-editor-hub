var NpcEventModule = NpcEventModule || {};
(function (ns) {
  if (!ns || typeof ns !== "object") ns = {};
  var modules = ns._modules || {};
  var handlers = ns._handlers || {};
  var timerIds = ns._timerIds || {};
  var timerKeys = ns._timerKeys || {};
  var nextTimerId = ns._nextTimerId || 1000;

  function addHandler(eventName, fn) {
    if (!eventName || typeof fn !== "function") return;
    var key = String(eventName);
    if (!handlers[key]) handlers[key] = [];
    handlers[key].push(fn);
  }
  function removeHandler(eventName, fn) {
    if (!eventName || typeof fn !== "function") return;
    var key = String(eventName);
    var list = handlers[key];
    if (!list || !list.length) return;
    var out = [];
    for (var i = 0; i < list.length; i++) {
      if (list[i] !== fn) out.push(list[i]);
    }
    handlers[key] = out;
  }
  function register(eventName, fn) {
    addHandler(eventName, fn);
  }
  function registerModule(name, mod) {
    if (!name || !mod) return;
    var key = String(name);
    var prev = modules[key];
    if (prev && prev._handlerRefs) {
      for (var oldEvent in prev._handlerRefs) {
        if (!prev._handlerRefs.hasOwnProperty(oldEvent)) continue;
        var oldList = prev._handlerRefs[oldEvent] || [];
        for (var i = 0; i < oldList.length; i++) {
          removeHandler(oldEvent, oldList[i]);
        }
      }
    }
    modules[key] = mod;
    if (!mod.events) return;
    mod._handlerRefs = {};
    for (var key in mod.events) {
      if (!mod.events.hasOwnProperty(key)) continue;
      var fn = mod.events[key];
      addHandler(key, fn);
      if (!mod._handlerRefs[key]) mod._handlerRefs[key] = [];
      mod._handlerRefs[key].push(fn);
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

  var pending = (typeof __DcNpcEventPendingModules !== "undefined" && __DcNpcEventPendingModules && __DcNpcEventPendingModules.length)
    ? __DcNpcEventPendingModules
    : [];
  for (var pi = 0; pi < pending.length; pi++) {
    try {
      var item = pending[pi] || {};
      registerModule(item.name, item.module);
    } catch (errPending) {}
  }
  if (typeof __DcNpcEventPendingModules !== "undefined") __DcNpcEventPendingModules = [];
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
