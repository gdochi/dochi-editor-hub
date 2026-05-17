// Dialogue util for dc_gui_runtime.html
// - Loads dialogue JSON ({node:{text,choice}})
// - Opens html GUI via openDcGuiRuntime()
// - Handles htmlGuiEvent("choice"), dialogue navigation, and delegates reward/actions.
//
// Requires these loaded before:
// - dc_lib/dc_npc_util/dc_cfg_checker.js   (cfg_chk_*)
// - dc_lib/dc_npc_util/dc_gui_runtime.js   (openDcGuiRuntime)
// - dc_lib/dc_npc_util/dc_reward_checker.js (rew_chk_applyAction)
// - dc_lib/dc_npc_util/dc_gecko_util.js  (DcGeckoUtilModule, optional NPC/Gecko FX)

var DcDialogueUtilModule = (function(){
  var OVERLAY_NAME = "dc_gui_runtime";
  var RUNTIME_OWNER = "dialogue";
  var DEFAULT_GUI_JSON = "customnpcs/dc_data/dc_gui/sample_gui.json";
  var McComponent = null;
  var McText = null;

  try{
    if(typeof Java !== "undefined" && Java.type){
      try{ McComponent = Java.type("net.minecraft.network.chat.Component"); }catch(eForgeComponent){}
      try{ McText = Java.type("net.minecraft.text.Text"); }catch(eFabricText){}
    }
  }catch(eComponent){}

  var KEY = {
    ACTIVE: "dc_dialogue_active",
    CFG: "dc_dialogue_cfg",
    LAST_RESULT: "dc_dialogue_last_result"
  };
  var SHOP_KEY = {
    DIRECT_PATH: "dc_shop_json_path",
    SELECTION: "npc_browser_dc_selection",
    LOCK: "npc_browser_dochi_lock"
  };
  var JS_LIB_ROOT = "customnpcs/scripts/ecmascript/dc_lib";
  var JS_MODULE_CACHE = {};

  function temp(player){return player && typeof player.getTempdata === "function" ? player.getTempdata() : null;}

  function debugLog(npc, enabled, msg){
    if(enabled !== true) return;
    var line = "[dc_dialogue_util] " + String(msg);
    try{ if(npc && typeof npc.say === "function") npc.say(line); }catch(e0){}
  }

  function closeHtmlGui(player){
    if(!player) return false;
    if(typeof cnpcext === "undefined" || !cnpcext) return false;
    if(typeof cnpcext.getClientBridge !== "function") return false;
    try{
      var br = cnpcext.getClientBridge(player.getMCEntity());
      if(br && typeof br.closeHtmlGui === "function"){
        br.closeHtmlGui();
        return true;
      }
    }catch(e){}
    return false;
  }

  function sendToBrowser(player, eventName, payload){
    if(!player || typeof cnpcext === "undefined" || !cnpcext || typeof cnpcext.getClientBridge !== "function") return false;
    try{
      var br = cnpcext.getClientBridge(player.getMCEntity());
      if(!br || typeof br.sendToBrowser !== "function") return false;
      try{
        br.sendToBrowser(player.getMCEntity(), String(eventName || ""), JSON.stringify(payload || {}));
        return true;
      }catch(e0){}
      br.sendToBrowser(String(eventName || ""), JSON.stringify(payload || {}));
      return true;
    }catch(e){
      return false;
    }
  }

  function normalizeDialoguePath(raw){
    var p = String(raw || "").replace(/\\/g, "/").replace(/^\/+/, "");
    if(!p) return "";
    if(p.indexOf("customnpcs/") === 0) return p;
    if(p.indexOf("dc_data/") === 0) return "customnpcs/" + p;
    if(p.indexOf("dc_dialogues/") === 0) return "customnpcs/dc_data/" + p;
    return "customnpcs/dc_data/dc_dialogues/" + p;
  }

  function normalizeGuiPath(raw){
    var p = String(raw || "").replace(/\\/g, "/").replace(/^\/+/, "");
    if(!p) return DEFAULT_GUI_JSON;
    if(p.indexOf("customnpcs/") === 0) return p;
    if(p.indexOf("dc_data/") === 0) return "customnpcs/" + p;
    if(p.indexOf("dc_gui/") === 0) return "customnpcs/dc_data/" + p;
    return "customnpcs/dc_data/dc_gui/" + p;
  }

  function cleanRelPath(raw){
    var p = String(raw || "").replace(/\\/g, "/").replace(/^\s+|\s+$/g, "");
    while(p.charAt(0) === "/") p = p.substring(1);
    return p.replace(/\/+/g, "/");
  }

  function readJson(path){
    if(typeof cfg_chk_resolveFile !== "function" || typeof cfg_chk_readJsonFile !== "function") return null;
    try{
      var f = cfg_chk_resolveFile(path, null);
      if(!f || !f.exists()) return null;
      var payload = cfg_chk_readJsonFile(f);
      return payload && payload.json ? payload.json : null;
    }catch(e){
      return null;
    }
  }

  function fileExists(path){
    if(typeof cfg_chk_resolveFile !== "function") return false;
    try{
      var f = cfg_chk_resolveFile(path, null);
      return !!(f && f.exists && f.exists());
    }catch(e){
      return false;
    }
  }

  function readStoreValue(store, key){
    try{
      if(!store || !key) return "";
      var value = store.get(String(key));
      if(value == null) return "";
      return String(value);
    }catch(e){
      return "";
    }
  }

  function readShopSelectionPath(raw){
    var obj, entries, i, entry, prefix, path;
    try{
      if(!raw) return "";
      obj = JSON.parse(String(raw));
      entries = obj && Array.isArray(obj.entries) ? obj.entries : [];
      for(i=0;i<entries.length;i++){
        entry = entries[i] || {};
        if(String(entry.prefix || "") !== "dc_shop") continue;
        path = cleanRelPath(entry.jsonPath || "");
        if(path) return path;
      }
      prefix = String(obj && obj.prefix || "");
      if(prefix && prefix !== "dc_shop") return "";
      return cleanRelPath(obj && obj.jsonPath || "");
    }catch(e){
      return "";
    }
  }

  function getStoredShopPath(npc){
    var store, path;
    try{
      if(!npc || typeof npc.getStoreddata !== "function") return "";
      store = npc.getStoreddata();
    }catch(e0){
      return "";
    }
    path = cleanRelPath(readStoreValue(store, SHOP_KEY.DIRECT_PATH));
    if(path) return path;
    path = readShopSelectionPath(readStoreValue(store, SHOP_KEY.SELECTION));
    if(path) return path;
    path = readShopSelectionPath(readStoreValue(store, SHOP_KEY.LOCK));
    if(path) return path;
    return "";
  }

  function unwrapNode(raw){
    if(!raw || typeof raw !== "object") return null;
    return (raw.nodeName != null && raw.node && typeof raw.node === "object") ? raw.node : null;
  }

  function baseSubPath(rel){
    var s = String(rel || "").replace(/\\/g, "/");
    var idx = s.lastIndexOf("/");
    return idx < 0 ? "" : s.slice(0, idx + 1);
  }

  function stripJsonSuffix(name){
    return String(name || "").replace(/\.json$/i, "");
  }

  function rawNodeId(raw){
    if(!raw || typeof raw !== "object") return "";
    if(raw.nodeName != null) return String(raw.nodeName);
    return "";
  }

  function findDialogueInBase(baseRel, target){
    var wanted = stripJsonSuffix(target).toLowerCase();
    if(!wanted || typeof cfg_chk_resolveFile !== "function" || typeof cfg_chk_readJsonFile !== "function") return "";
    try{
      var dir = cfg_chk_resolveFile(normalizeDialoguePath(baseRel || ""), null);
      if(!dir || !dir.exists || !dir.exists() || !dir.isDirectory || !dir.isDirectory()) return "";
      var files = dir.listFiles();
      if(!files) return "";
      for(var i=0;i<files.length;i++){
        var f = files[i];
        if(!f || !f.isFile || !f.isFile()) continue;
        var name = String(f.getName ? f.getName() : "");
        if(!/\.json$/i.test(name)) continue;
        if(stripJsonSuffix(name).toLowerCase() === wanted){
          return String(baseRel || "") + name;
        }
      }
      for(var j=0;j<files.length;j++){
        var f2 = files[j];
        if(!f2 || !f2.isFile || !f2.isFile()) continue;
        var name2 = String(f2.getName ? f2.getName() : "");
        if(!/\.json$/i.test(name2)) continue;
        try{
          var payload = cfg_chk_readJsonFile(f2);
          var id = rawNodeId(payload && payload.json);
          if(id && id.toLowerCase() === wanted) return String(baseRel || "") + name2;
        }catch(eRead){}
      }
    }catch(e){}
    return "";
  }

  function resolveNextDialogueRel(active, action, rawGoto){
    var linkMode = String(action.linkMode || "internal").toLowerCase();
    var g = String(rawGoto || "");
    var nextRel = linkMode === "external" ? String(action.filePath || g || "") : g;
    if(!nextRel) return "";
    if(nextRel.toLowerCase().endsWith(".json") !== true) nextRel = nextRel + ".json";
    if(linkMode !== "external" && nextRel.indexOf("/") < 0) nextRel = String(active.baseSubPath || "") + nextRel;
    if(fileExists(normalizeDialoguePath(nextRel))) return nextRel;
    if(linkMode !== "external"){
      var found = findDialogueInBase(String(active.baseSubPath || ""), g);
      if(found) return found;
    }
    return nextRel;
  }

  function getPayloadGuiPath(raw, requested){
    var req = String(requested || "").trim();
    if(req){
      var requestedPath = normalizeGuiPath(req);
      return fileExists(requestedPath) ? requestedPath : DEFAULT_GUI_JSON;
    }
    var gui = raw && raw.gui && typeof raw.gui === "object" ? raw.gui : {};
    var source = String(gui.guiSource || "default").toLowerCase();
    var offset = String(gui.guiOffset || "").trim();
    if(source === "custom" && offset){
      var customPath = normalizeGuiPath(offset);
      return fileExists(customPath) ? customPath : DEFAULT_GUI_JSON;
    }
    return DEFAULT_GUI_JSON;
  }

  function normalizeJsRelPath(raw){
    var p = cleanRelPath(raw || "");
    p = p.replace(/^minecraft\/customnpcs\/scripts\/ecmascript\/dc_lib\/?/i, "");
    p = p.replace(/^customnpcs\/scripts\/ecmascript\/dc_lib\/?/i, "");
    p = p.replace(/^scripts\/ecmascript\/dc_lib\/?/i, "");
    p = p.replace(/^dc_lib\/?/i, "");
    return cleanRelPath(p);
  }

  function splitJsRelPath(raw){
    var p = normalizeJsRelPath(raw || "");
    var idx = p.lastIndexOf("/");
    if(idx < 0) return { subPath:"", fileName:p };
    return { subPath:p.slice(0, idx + 1), fileName:p.slice(idx + 1) };
  }

  function normalizeJsAction(action){
    var a = action && typeof action === "object" ? action : {};
    var subPath = normalizeJsRelPath(a.jsSubPath || "");
    var fileName = cleanRelPath(a.jsFileName || "");
    var jsPath = normalizeJsRelPath(a.jsPath || a.filePath || a.path || "");
    if(!jsPath && fileName) jsPath = normalizeJsRelPath((subPath ? subPath + "/" : "") + fileName);
    if(jsPath){
      var split = splitJsRelPath(jsPath);
      if(!subPath) subPath = split.subPath;
      if(!fileName) fileName = split.fileName;
    }
    return {
      type:"js",
      scriptCall:String(a.scriptCall || "jsCall") || "jsCall",
      jsSubPath:subPath,
      jsFileName:fileName,
      jsPath:jsPath
    };
  }

  function getJsActionLoadPath(action){
    var a = normalizeJsAction(action);
    var rel = normalizeJsRelPath(a.jsPath || ((a.jsSubPath ? a.jsSubPath + "/" : "") + (a.jsFileName || "")));
    if(!rel) return "";
    return JS_LIB_ROOT + "/" + rel;
  }

  function jsHasCallableEntry(text){
    return /\bfunction\s+jsCall\s*\(/.test(String(text || ""));
  }

  function loadJsActionModule(action){
    var loadPath = getJsActionLoadPath(action);
    if(!loadPath) return false;
    if(JS_MODULE_CACHE[loadPath] === true) return true;
    if(typeof cfg_chk_resolveFile !== "function" || typeof cfg_chk_readTextFile !== "function") return false;
    try{
      var file = cfg_chk_resolveFile(loadPath, null);
      if(!file || !file.exists || !file.exists()) return false;
      var raw = cfg_chk_readTextFile(file);
      if(!jsHasCallableEntry(raw)) return false;
      if(typeof load !== "function") return false;
      load(String(file.getAbsolutePath()));
      JS_MODULE_CACHE[loadPath] = true;
      return true;
    }catch(e){
      return false;
    }
  }

  function runJsAction(player, npc, eventObj, action){
    var a = normalizeJsAction(action);
    if(!loadJsActionModule(a)) return { pass:false, msg:"JS action load failed" };
    if(typeof jsCall !== "function") return { pass:false, msg:"jsCall is not loaded" };
    var opts = {};
    for(var k in a){ if(Object.prototype.hasOwnProperty.call(a, k)) opts[k] = a[k]; }
    var target = (eventObj && eventObj.player && eventObj.npc) ? eventObj : { player:player, npc:npc, event:eventObj };
    try{
      var result = jsCall(target, opts);
      return { pass:true, msg:"JS action called", result:result };
    }catch(e){
      return { pass:false, msg:"JS action failed: " + String(e) };
    }
  }

  function normalizeActions(list){
    var out = [];
    var arr = Array.isArray(list) ? list : [];
    for(var i=0;i<arr.length;i++){
      var a = arr[i];
      if(!a || typeof a !== "object") continue;
      var type = String(a.type || "").toLowerCase();
      if(type === "close"){ out.push({ close:true }); continue; }
      if(type === "command"){ out.push({ command: String(a.value) }); continue; }
      if(type === "goto"){
        var linkMode = String(a.linkMode || "internal").toLowerCase();
        var target = a.value;
        var filePath = String(a.filePath || "");
        if(linkMode === "external") target = filePath;
        out.push({ goto: String(target || ""), linkMode: linkMode, filePath: filePath });
        continue;
      }
      if(type === "go_shop"){
        out.push({ type: "go_shop" });
        continue;
      }
      if(type === "js"){
        out.push(normalizeJsAction(a));
        continue;
      }
      if(type === "store"){
        out.push({ store: {
          key: String(a.key || ""),
          op: String(a.storeOp || "set"),
          value: a.value
        }});
        continue;
      }
      if(type === "tag"){
        out.push({ tag: {
          key: String(a.key || ""),
          op: String(a.op || "add")
        }});
        continue;
      }
      if(type === "ftb_task"){ out.push({ ftb_task: { quest:String(a.quest || ""), task:Number(a.task || 0) } }); continue; }
      if(type === "ftb_complete"){ out.push({ ftb_complete: { quest:String(a.quest || "") } }); continue; }
      if(type === "cobblemon_give"){
        out.push({ cobblemon_give: {
          pokemon: String(a.pokemon || a.key || ""),
          level: Number(a.level || a.amount || a.value || 0),
          amount: Number(a.level || a.amount || a.value || 0),
          pokemonData: a.pokemonData
        }});
        continue;
      }
      if(type === "cobbledollar" || type === "cobbledollar_add" || type === "cobbledollar_take"){
        out.push({ cobbledollar: {
          op: type === "cobbledollar_take" ? "take" : String(a.moneyOp || "add"),
          amount: Number(a.amount || 0)
        }});
        continue;
      }
    }
    return out;
  }

  function evalOneCondition(player, npc, cond){
    if(!cond || typeof cond !== "object") return true;
    var type = String(cond.type || "stored").toLowerCase();
    var op = String(cond.op || "==").toLowerCase();
    var key = String(cond.key || cond.id || "");
    var val = cond.value;
    if(type === "tag" && op === "hasn't") op = "not";
    if(type === "item" && op === "hasn't") op = "not";
    if(type === "stored" && typeof cond_stored === "function") return !!cond_stored(npc, player, op, key, val).pass;
    if(type === "tag" && typeof cond_tag === "function") return !!cond_tag(npc, player, op, key, val).pass;
    if(type === "item" && typeof cond_item === "function") return !!cond_item(npc, player, op, key, val).pass;
    if(type === "adv" && typeof cond_adv === "function") return !!cond_adv(npc, player, op, key, val).pass;
    if(type === "faction" && typeof cond_faction === "function") return !!cond_faction(npc, player, op, key, val).pass;
    if(type === "ftb" && typeof cond_ftb === "function") return !!cond_ftb(npc, player, op, key, val).pass;
    if(type === "ftb_task" && typeof cond_ftb === "function") return !!cond_ftb(npc, player, op, key, val, cond.task).pass;
    if(type === "cobblemon_party" && typeof cond_cobblemon_party === "function") return !!cond_cobblemon_party(npc, player, op, key, val).pass;
    if(type === "cobbledollar" && typeof cond_cobbledollar === "function") return !!cond_cobbledollar(npc, player, op, key, val).pass;
    return false;
  }

  function evalConditions(player, npc, owner){
    if(!owner || typeof owner !== "object") return true;
    var list = Array.isArray(owner.conditions) ? owner.conditions : [];
    if(!list.length) return true;
    var mode = String(owner.conditionMode || owner.mode || "and").toLowerCase() === "or" ? "or" : "and";
    if(mode === "or"){
      for(var i=0;i<list.length;i++){ if(evalOneCondition(player, npc, list[i])) return true; }
      return false;
    }
    for(var j=0;j<list.length;j++){ if(!evalOneCondition(player, npc, list[j])) return false; }
    return true;
  }

  function getRouteAction(route){
    var actions = route && Array.isArray(route.actions) ? route.actions : [];
    for(var i=0;i<actions.length;i++){
      var a = actions[i] || {};
      var type = String(a.type || "").toLowerCase();
      if(type === "go_shop") return { type:"go_shop" };
      if(type === "js") return normalizeJsAction(a);
      if(type === "goto"){
        return {
          type:"goto",
          value:String(a.value || route.goto || ""),
          linkMode:String(a.linkMode || route.linkMode || "internal"),
          filePath:String(a.filePath || route.filePath || "")
        };
      }
    }
    if(String(route && (route.actionType || route.type) || "").toLowerCase() === "go_shop") return { type:"go_shop" };
    if(String(route && (route.actionType || route.type) || "").toLowerCase() === "js") return normalizeJsAction(route);
    return {
      type:"goto",
      value:String(route && route.goto || ""),
      linkMode:String(route && route.linkMode || "internal"),
      filePath:String(route && route.filePath || "")
    };
  }

  function openShopFromDialogue(player, npc, eventObj){
    if(typeof dc_shop_open !== "function"){
      throw new Error("dc_shop_open is not loaded.");
    }
    var shopJsonPath = getStoredShopPath(npc);
    if(!shopJsonPath && typeof dc_shop_trigger_getShopPath === "function"){
      shopJsonPath = dc_shop_trigger_getShopPath(npc);
    }
    if(!shopJsonPath) throw new Error("go_shop shopJsonPath is empty.");
    var target = (eventObj && eventObj.player && eventObj.npc) ? eventObj : { player:player, npc:npc, event:eventObj };
    return dc_shop_open(target, {
      shopJsonPath: shopJsonPath,
      accessPolicy: "dialogue_only",
      source: "dialogue"
    });
  }

  function resolveStartRoute(raw, player, npc, dialogueRel, eventObj, debug){
    var node = unwrapNode(raw);
    if(!node || String(node.type || "") !== "start") return null;
    var routes = Array.isArray(node.routes) ? node.routes : [];
    if(!routes.length) return null;
    for(var i=0;i<routes.length;i++){
      var route = routes[i] || {};
      if(!evalConditions(player, npc, route)) continue;
      var action = getRouteAction(route);
      if(String(action.type || "").toLowerCase() === "go_shop"){
        debugLog(npc, debug, "start route " + (i + 1) + " opens shop.");
        return { type:"shop", opened:openShopFromDialogue(player, npc, eventObj) };
      }
      if(String(action.type || "").toLowerCase() === "js"){
        debugLog(npc, debug, "start route " + (i + 1) + " runs js.");
        return { type:"js", opened:runJsAction(player, npc, eventObj, action) };
      }
      var active = { baseSubPath:baseSubPath(dialogueRel) };
      var target = action.linkMode === "external" ? String(action.filePath || action.value || "") : String(action.value || "");
      if(!target) throw new Error("Start route " + (i + 1) + " target is empty.");
      var nextRel = resolveNextDialogueRel(active, action, target);
      var nextRaw = readJson(normalizeDialoguePath(nextRel));
      if(!nextRaw) throw new Error("Start route " + (i + 1) + " target JSON not found: " + String(nextRel || ""));
      debugLog(npc, debug, "start route " + (i + 1) + " -> " + nextRel);
      return { type:"dialogue", raw:nextRaw, dialogueRel:nextRel };
    }
    return null;
  }

  function componentString(comp){
    if(comp == null) return "";
    try{ if(typeof comp.getString === "function") return String(comp.getString()); }catch(e0){}
    try{ if(typeof comp.getContents === "function") return String(comp.getContents()); }catch(e1){}
    return String(comp);
  }

  function translateKey(value){
    var key = String(value || "");
    if(!key) return "";
    if(McComponent && typeof McComponent.m_237115_ === "function"){
      try{ return componentString(McComponent.m_237115_(key)); }catch(e0){}
    }
    if(McComponent && typeof McComponent.translatable === "function"){
      try{ return componentString(McComponent.translatable(key)); }catch(e1){}
    }
    if(McText && typeof McText.translatable === "function"){
      try{ return componentString(McText.translatable(key)); }catch(e2){}
    }
    return key;
  }
  function maybeTranslate(value, enabled){return enabled === true ? translateKey(value) : String(value || "");}
  
  function buildBindings(raw, player, npc){
    var node = unwrapNode(raw);
    var out = { text: [], choice: [], textFx: null };
    if(node){
      var t = node.text != null ? node.text : null;
      var textIsKey = node.textTranslationKey === true;
      if(Array.isArray(t)){ for(var i=0;i<t.length;i++) out.text.push(maybeTranslate(t[i], textIsKey)); }
      else if(typeof t === "string"){ out.text.push(maybeTranslate(t, textIsKey)); }
      if(node.textFx && typeof node.textFx === "object") out.textFx = node.textFx;
    }
    var choices = node && Array.isArray(node.choice) ? node.choice : [];
    for(var j=0;j<choices.length;j++){
      var ch = choices[j] || {};
      if(!evalConditions(player, npc, ch)) continue;
      var labelIsKey = ch.labelTranslationKey === true;
      out.choice.push({
        label: maybeTranslate(ch.label, labelIsKey),
        role: String(ch.role || ""),
        data: { actions: normalizeActions(ch.actions), fx: (ch.fx && typeof ch.fx === "object") ? ch.fx : null, conditions: Array.isArray(ch.conditions) ? ch.conditions : [], sourceIndex: j }
      });
    }
    return out;
  }


  function mergeChoiceFxIntoBindings(bindings, fx) {
    if (!bindings || typeof bindings !== "object") bindings = { text: [], choice: [], textFx: null };
    if (!fx || typeof fx !== "object") return bindings;
    var base = bindings.textFx && typeof bindings.textFx === "object" ? bindings.textFx : {};
    var out = {};
    for (var k in base) { if (Object.prototype.hasOwnProperty.call(base, k)) out[k] = base[k]; }
    var keys = ["sound", "image", "npc"];
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var a = [];
      if (Array.isArray(out[key])) a = out[key].slice();
      else if (out[key] && typeof out[key] === "object") a = [out[key]];
      var incoming = fx[key];
      if (!incoming && Array.isArray(fx.items)) {
        incoming = [];
        for (var j = 0; j < fx.items.length; j++) {
          var item = fx.items[j] || {};
          if (String(item.fxType || item.type || "").toLowerCase() === key) incoming.push(item);
        }
      }
      if (Array.isArray(incoming)) a = a.concat(incoming);
      else if (incoming && typeof incoming === "object") a.push(incoming);
      if (a.length) out[key] = a;
    }
    bindings.textFx = out;
    return bindings;
  }

  function setActive(player, cfgObj){
    var td = temp(player);
    if(!td) return;
    td.put(KEY.ACTIVE, "1");
    td.put(KEY.CFG, JSON.stringify(cfgObj || {}));
  }

  function clearActive(player){
    var td = temp(player);
    if(!td) return;
    td.remove(KEY.ACTIVE);
    td.remove(KEY.CFG);
  }

  function getActive(player){
    var td = temp(player);
    if(!td || td.get(KEY.ACTIVE) !== "1") return null;
    var raw = td.get(KEY.CFG);
    if(!raw) return null;
    try{ return JSON.parse(String(raw)); }catch(e){ return null; }
  }

  function matchesActiveEvent(active, payload){
    var sid = String(payload && payload.sessionId || "");
    if(!sid || String(active && active.sessionId || "") !== sid) return false;
    var owner = String((payload && (payload.__runtimeOwner || payload.runtimeOwner)) || "");
    if(owner && owner !== String(active && active.runtimeOwner || RUNTIME_OWNER)) return false;
    return true;
  }

  function setLastResult(player, result){
    var td = temp(player);
    if(!td) return;
    td.put(KEY.LAST_RESULT, JSON.stringify(result || {}));
  }

  function open(target, maybeNpc, maybeOpts){
    var eventObj = (target && target.player) ? target : null;
    var player = eventObj ? eventObj.player : target;
    var npc = eventObj ? (eventObj.npc || maybeNpc) : maybeNpc;
    var opts = {};
    if(eventObj && maybeNpc && typeof maybeNpc === "object"){
      opts = maybeNpc;
    }else if(maybeOpts && typeof maybeOpts === "object"){
      opts = maybeOpts;
    }
    var debug = opts.debug === true;
    debugLog(npc, debug, "open request dialogueJsonPath=" + String(opts.dialogueJsonPath || "") + " htmlPath=" + String(opts.htmlPath || ""));
    if(typeof openDcGuiRuntime !== "function"){
      debugLog(npc, debug, "openDcGuiRuntime is not loaded.");
      return null;
    }
    if(!player || !npc) return null;

    var dialogueRel = String(opts.dialogueJsonPath || "").replace(/\\/g, "/");
    if(!dialogueRel){
      debugLog(npc, debug, "dialogueJsonPath is empty after normalize.");
      return null;
    }

    var normalizedDialoguePath = normalizeDialoguePath(dialogueRel);
    debugLog(npc, debug, "read dialogue=" + normalizedDialoguePath);
    var raw = readJson(normalizedDialoguePath);
    if(!raw){
      debugLog(npc, debug, "dialogue JSON read failed.");
      return null;
    }
    var routeResult = resolveStartRoute(raw, player, npc, dialogueRel, eventObj, debug);
    if(routeResult && routeResult.type === "shop"){
      return routeResult.opened;
    }
    if(routeResult && routeResult.type === "js"){
      return routeResult.opened;
    }
    if(routeResult && routeResult.type === "dialogue"){
      raw = routeResult.raw;
      dialogueRel = routeResult.dialogueRel;
      normalizedDialoguePath = normalizeDialoguePath(dialogueRel);
      debugLog(npc, debug, "route resolved dialogue=" + normalizedDialoguePath);
    }
    var nodeForCondition = unwrapNode(raw);
    if(!evalConditions(player, npc, nodeForCondition)){
      debugLog(npc, debug, "start/open conditions failed.");
      return null;
    }
    var guiJsonPath = getPayloadGuiPath(raw, opts.guiJsonPath);
    debugLog(npc, debug, "resolved guiJsonPath=" + guiJsonPath);
    var sessionId = String(opts.sessionId || (Date.now() + "_" + Math.floor(Math.random()*900000+100000)));

    var runOpts = {
      guiJsonPath: guiJsonPath,
      htmlPath: String(opts.htmlPath || "html/dc_util/dc_gui_runtime.html"),
      sessionId: sessionId,
      runtimeOwner: RUNTIME_OWNER,
      debug: opts.debug === true,
      bindings: mergeChoiceFxIntoBindings(buildBindings(raw, player, npc), opts.pendingFx)
    };

    closeHtmlGui(player);

    setActive(player, {
      sessionId: sessionId,
      overlayName: OVERLAY_NAME,
      runtimeOwner: RUNTIME_OWNER,
      mode: String(opts.mode || "generic"),
      returnGoto: String(opts.returnGoto || ""),
      baseSubPath: baseSubPath(dialogueRel),
      dialogueJsonPath: dialogueRel,
      guiJsonPath: guiJsonPath
    });

    var openTarget = eventObj || { player: player, npc: npc };
    var handle = openDcGuiRuntime(openTarget, runOpts);
    debugLog(npc, debug, "openDcGuiRuntime returned=" + String(handle));
    if(handle == null){ clearActive(player); return null; }
    return handle;
  }

  function updateOpenDialogue(player, npc, active, raw, nextRel, pendingFx){
    if(!player || !active || !raw) return false;
    var sessionId = String(active.sessionId || "");
    var mergedBindings = mergeChoiceFxIntoBindings(buildBindings(raw, player, npc), pendingFx);
    var payload = {
      __overlayName: OVERLAY_NAME,
      __runtimeOwner: RUNTIME_OWNER,
      type: "dcDialogueUpdate",
      sessionId: sessionId,
      dialogueJsonPath: String(nextRel || ""),
      bindings: mergedBindings
    };
    try{
      if(typeof DcGuiRuntimeModule !== "undefined" && DcGuiRuntimeModule && typeof DcGuiRuntimeModule.buildInitData === "function"){
        var guiJson = readJson(String(active.guiJsonPath || ""));
        if(guiJson){
          var runtimeData = DcGuiRuntimeModule.buildInitData({ player:player, npc:npc }, guiJson, {
            sessionId: sessionId,
            debug: false,
            bindings: mergedBindings
          });
          if(runtimeData && typeof runtimeData === "object"){
            for(var key in runtimeData){
              if(Object.prototype.hasOwnProperty.call(runtimeData, key)) payload[key] = runtimeData[key];
            }
            payload.type = "dcDialogueUpdate";
            payload.dialogueJsonPath = String(nextRel || "");
          }
        }
      }
    }catch(eBuildUpdate){}
    var ok = sendToBrowser(player, "dcDialogueUpdate", payload);
    if(!ok) return false;
    setActive(player, {
      sessionId: sessionId,
      overlayName: OVERLAY_NAME,
      runtimeOwner: RUNTIME_OWNER,
      mode: String(active.mode || "generic"),
      returnGoto: String(active.returnGoto || ""),
      baseSubPath: baseSubPath(nextRel),
      dialogueJsonPath: String(nextRel || ""),
      guiJsonPath: String(active.guiJsonPath || "")
    });
    return true;
  }

  function runRewardAction(player, npc, eventObj, action){
    var ctx = { player: player, npc: npc, event: eventObj };
    if(typeof rew_chk_applyAction === "function"){
      return rew_chk_applyAction(ctx, action);
    }
    {
      throw new Error("dc_reward_checker.js must be loaded before dc_dialogue_util.js");
    }
  }
  function runChoiceNpcFx(eventObj, player, npc, choiceFx){
    if(!choiceFx || typeof choiceFx !== "object") return false;
    var list = [];
    if(Array.isArray(choiceFx.npc)) list = choiceFx.npc;
    else if(Array.isArray(choiceFx.items)){
      for(var i=0;i<choiceFx.items.length;i++){
        var item = choiceFx.items[i] || {};
        if(String(item.fxType || item.type || "").toLowerCase() === "npc") list.push(item);
      }
    }
    if(!list.length) return false;
    var applied = false;
    for(var j=0;j<list.length;j++){
      var fx = list[j] || {};
      try{
        if(typeof DcGeckoUtilModule !== "undefined" && DcGeckoUtilModule && typeof DcGeckoUtilModule.applyNpcFx === "function"){
          applied = DcGeckoUtilModule.applyNpcFx(eventObj, player, npc, fx) || applied;
        }else if(npc && fx.skinTexture){
          var display = null;
          try{ display = typeof npc.getDisplay === "function" ? npc.getDisplay() : null; }catch(e0){ display = null; }
          if(display && typeof display.setSkinTexture === "function"){
            display.setSkinTexture(String(fx.skinTexture));
            applied = true;
          }else if(typeof npc.setSkinTexture === "function"){
            npc.setSkinTexture(String(fx.skinTexture));
            applied = true;
          }
        }
      }catch(eFx){}
    }
    return applied;
  }

  function parseChoiceData(payload){
    var dataObj = payload ? payload.data : null;
    try{
      if(typeof dataObj === "string") dataObj = JSON.parse(String(dataObj));
    }catch(e){
      dataObj = null;
    }
    return dataObj && typeof dataObj === "object" ? dataObj : {};
  }

  function makeChoiceData(ch, sourceIndex){
    ch = ch || {};
    return {
      actions: normalizeActions(ch.actions),
      fx: (ch.fx && typeof ch.fx === "object") ? ch.fx : null,
      conditions: Array.isArray(ch.conditions) ? ch.conditions : [],
      sourceIndex: sourceIndex
    };
  }

  function resolveCurrentChoice(player, npc, active, payload, dataObj){
    var raw = readJson(normalizeDialoguePath(active && active.dialogueJsonPath || ""));
    var node = unwrapNode(raw);
    var choices = node && Array.isArray(node.choice) ? node.choice : [];
    var sourceIndex = parseInt(String(dataObj && dataObj.sourceIndex != null ? dataObj.sourceIndex : ""), 10);
    var payloadIndex = parseInt(String(payload && payload.index != null ? payload.index : ""), 10);
    var visibleIndex = -1;
    var i, ch;
    if(!isNaN(sourceIndex) && sourceIndex >= 0 && sourceIndex < choices.length){
      ch = choices[sourceIndex] || {};
      if(evalConditions(player, npc, ch)) return { choice:ch, sourceIndex:sourceIndex };
      return null;
    }
    if(isNaN(payloadIndex)) return null;
    for(i=0;i<choices.length;i++){
      ch = choices[i] || {};
      if(!evalConditions(player, npc, ch)) continue;
      visibleIndex++;
      if(visibleIndex === payloadIndex) return { choice:ch, sourceIndex:i };
    }
    return null;
  }

  function handleChoice(player, npc, active, payload, eventObj){
    var dataObj = parseChoiceData(payload);
    var resolvedChoice = resolveCurrentChoice(player, npc, active, payload, dataObj);
    if(!resolvedChoice){
      var resDenied = { done:false, reason:"choice_condition_failed" };
      setLastResult(player, resDenied);
      return resDenied;
    }
    dataObj = makeChoiceData(resolvedChoice.choice, resolvedChoice.sourceIndex);
    var actions = Array.isArray(dataObj.actions) ? dataObj.actions : [];

    var returnGoto = String(active.returnGoto || "");
    var choiceFx = dataObj.fx && typeof dataObj.fx === "object" ? dataObj.fx : null;

    runChoiceNpcFx(eventObj, player, npc, choiceFx);

    for(var i=0;i<actions.length;i++){
      var a = actions[i] || {};
      if(String(a.type || "").toLowerCase() === "go_shop"){
        clearActive(player);
        var shopRes = openShopFromDialogue(player, npc, eventObj);
        var resShop = { done:true, reason:"go_shop", opened: shopRes != null };
        setLastResult(player, resShop);
        return resShop;
      }
      if(String(a.type || "").toLowerCase() === "js"){
        runJsAction(player, npc, eventObj, a);
        continue;
      }
      runRewardAction(player, npc, eventObj, a);

      if(a.close === true){
        closeHtmlGui(player);
        clearActive(player);
        var res = { done:true, reason:"close" };
        setLastResult(player, res);
        return res;
      }

      if(a.goto){
        var g = String(a.goto || "");
        var linkMode = String(a.linkMode || "internal").toLowerCase();
        if(returnGoto && g.toLowerCase() === returnGoto.toLowerCase()){
          closeHtmlGui(player);
          clearActive(player);
          var res2 = { done:true, reason:"return", goto:g };
          setLastResult(player, res2);
          return res2;
        }

        if(linkMode === "battle"){
          closeHtmlGui(player);
          clearActive(player);
          var resBattle = { done:true, reason:"return", goto:g };
          setLastResult(player, resBattle);
          return resBattle;
        }
        var nextRel = resolveNextDialogueRel(active, a, g);
        var nextRaw = readJson(normalizeDialoguePath(nextRel));
        if(nextRaw && updateOpenDialogue(player, npc, active, nextRaw, nextRel, choiceFx)){
          return { done:false, reason:"goto", goto:g, next: nextRel, updated:true };
        }
        var resGotoFail = { done:false, reason:"goto_update_failed", goto:g, next:nextRel };
        setLastResult(player, resGotoFail);
        return resGotoFail;
      }
    }

    return { done:false };
  }

  function handleHtmlEvent(e){
    if(!e || !e.player) return null;
    var player = e.player;
    var npc = e.npc || null;

    var payload = e.data;
    if(typeof payload === "string"){
      try{ payload = JSON.parse(String(payload)); }catch(err0){ payload = null; }
    }
    payload = payload && typeof payload === "object" ? payload : {};

    var active = getActive(player);
    if(!active) return null;

    if(payload.__overlayName && String(payload.__overlayName) !== String(active.overlayName || OVERLAY_NAME)) return null;

    var evName = String(e.eventName || "");
    if((evName === "choice" || evName === "__guiClosed" || evName === "done") && !matchesActiveEvent(active, payload)) return null;
    if(evName === "choice"){
      var res = handleChoice(player, npc, active, payload, e);
      return { handled:true, result: res };
    }
    if(evName === "__guiClosed" || evName === "done"){
      clearActive(player);
      var res2 = { done:true, reason:"closed" };
      setLastResult(player, res2);
      return { handled:true, result: res2 };
    }
    return null;
  }

  return {
    OVERLAY_NAME: OVERLAY_NAME,
    open: open,
    closeHtml: closeHtmlGui,
    handleHtmlEvent: handleHtmlEvent,
    getActive: getActive
  };
})();

function dc_dialogue_open(e, opts){ return DcDialogueUtilModule.open(e, null, opts || {}); }
function dc_dialogue_handleHtmlEvent(e){ return DcDialogueUtilModule.handleHtmlEvent(e); }
