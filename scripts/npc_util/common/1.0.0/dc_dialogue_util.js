// Dialogue util for dc_gui_runtime.html
// - Loads dialogue JSON ({node:{text,choice}})
// - Opens html GUI via openDcGuiRuntime()
// - Handles htmlGuiEvent("choice") and executes actions (goto/close/command/store/advancement)
//
// Requires these loaded before:
// - dc_lib/ds_npc_util/dc_cfg_checker.js   (cfg_chk_*)
// - dc_lib/ds_npc_util/dc_gui_runtime.js   (openDcGuiRuntime)
// - dc_lib/ds_npc_util/dc_gecko_util.js  (DcGeckoUtilModule, optional NPC/Gecko FX)

var DcDialogueUtilModule = (function(){
  var OVERLAY_NAME = "dc_gui_runtime";
  var DEFAULT_GUI_JSON = "customnpcs/dc_data/dc_gui/dialogue_gui.json";
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

  function temp(player){
    return player && typeof player.getTempdata === "function" ? player.getTempdata() : null;
  }

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

  function unwrapNode(raw){
    if(!raw || typeof raw !== "object") return null;
    return (raw.node && typeof raw.node === "object") ? raw.node : raw;
  }

  function baseSubPath(rel){
    var s = String(rel || "").replace(/\\/g, "/");
    var idx = s.lastIndexOf("/");
    return idx < 0 ? "" : s.slice(0, idx + 1);
  }

  function stripJsonSuffix(name){
    return String(name || "").replace(/\.json$/i, "");
  }

  function stripNumericPrefix(name){
    return stripJsonSuffix(name).replace(/^\d+[_ -]+/, "");
  }

  function rawNodeId(raw){
    if(!raw || typeof raw !== "object") return "";
    if(raw.nodeId != null) return String(raw.nodeId);
    if(raw.nodeName != null) return String(raw.nodeName);
    if(raw.id != null) return String(raw.id);
    if(raw.name != null) return String(raw.name);
    if(raw.node && typeof raw.node === "object"){
      if(raw.node.id != null) return String(raw.node.id);
      if(raw.node.name != null) return String(raw.node.name);
    }
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
        if(stripJsonSuffix(name).toLowerCase() === wanted || stripNumericPrefix(name).toLowerCase() === wanted){
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
    if(req) return normalizeGuiPath(req);
    var gui = raw && raw.gui && typeof raw.gui === "object" ? raw.gui : {};
    var source = String((raw && raw.guiSource) || gui.guiSource || "default").toLowerCase();
    var offset = String((raw && raw.guiOffset) || gui.guiOffset || "").trim();
    if(source === "custom" && offset) return normalizeGuiPath(offset);
    return DEFAULT_GUI_JSON;
  }

  function normalizeActions(list){
    var out = [];
    var arr = Array.isArray(list) ? list : [];
    for(var i=0;i<arr.length;i++){
      var a = arr[i];
      if(!a || typeof a !== "object") continue;
      var type = String(a.type || a.action || "").toLowerCase();
      if(a.close === true || type === "close"){ out.push({ close:true }); continue; }
      if(a.command != null || type === "command"){ out.push({ command: String(a.command != null ? a.command : a.value) }); continue; }
      if(a.goto != null || type === "goto"){
        var linkMode = String(a.linkMode || a.link || "internal").toLowerCase();
        var target = a.goto != null ? a.goto : (a.target != null ? a.target : a.value);
        var filePath = String(a.filePath || a.path || "");
        if(linkMode === "external_json") linkMode = "external";
        if(linkMode === "internal_node") linkMode = "internal";
        if(linkMode === "external") target = filePath || target;
        out.push({ goto: String(target || ""), linkMode: linkMode, filePath: filePath });
        continue;
      }
      if(a.store && typeof a.store === "object"){ out.push({ store: a.store }); continue; }
      if(type === "store"){
        out.push({ store: {
          key: String(a.key || ""),
          op: String(a.storeOp || a.op || "set"),
          value: a.value
        }});
        continue;
      }
      if(type === "tag"){
        out.push({ tag: {
          key: String(a.key || a.tag || ""),
          op: String(a.op || "add")
        }});
        continue;
      }
      if(type === "ftb_task"){ out.push({ ftb_task: { quest:String(a.quest || ""), task:Number(a.task || 0) } }); continue; }
      if(type === "ftb_complete"){ out.push({ ftb_complete: { quest:String(a.quest || "") } }); continue; }
      if(type === "cobbledollar" || type === "cobbledollar_add" || type === "cobbledollar_take"){
        out.push({ cobbledollar: {
          op: type === "cobbledollar_take" ? "take" : String(a.moneyOp || a.op || "add"),
          amount: Number(a.amount || 0)
        }});
        continue;
      }
      if(a.advancement && typeof a.advancement === "object"){ out.push({ advancement: a.advancement }); continue; }
    }
    return out;
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

  function maybeTranslate(value, enabled){
    return enabled === true ? translateKey(value) : String(value || "");
  }

  function buildBindings(raw){
    var node = unwrapNode(raw);
    var out = { text: [], choice: [], textFx: null };
    if(node){
      var t = node.text != null ? node.text : (node.lines != null ? node.lines : null);
      var textIsKey = node.textTranslationKey === true || node.textIsTranslationKey === true;
      if(Array.isArray(t)){ for(var i=0;i<t.length;i++) out.text.push(maybeTranslate(t[i], textIsKey)); }
      else if(typeof t === "string"){ out.text.push(maybeTranslate(t, textIsKey)); }
      if(node.textFx && typeof node.textFx === "object") out.textFx = node.textFx;
    }
    var choices = node && Array.isArray(node.choice) ? node.choice : (node && Array.isArray(node.choices) ? node.choices : []);
    for(var j=0;j<choices.length;j++){
      var ch = choices[j] || {};
      var labelIsKey = ch.labelTranslationKey === true || ch.labelIsTranslationKey === true;
      out.choice.push({
        label: maybeTranslate(ch.label, labelIsKey),
        role: String(ch.role || ""),
        data: { actions: normalizeActions(ch.actions), fx: (ch.fx && typeof ch.fx === "object") ? ch.fx : null }
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
    var keys = ["sound", "image", "itemrender", "npc"];
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

  function fxHasNpc(fx) {
    if (!fx || typeof fx !== "object") return false;
    if (Array.isArray(fx.npc) && fx.npc.length) return true;
    if (fx.npc && typeof fx.npc === "object") return true;
    if (Array.isArray(fx.items)) {
      for (var i = 0; i < fx.items.length; i++) {
        var item = fx.items[i] || {};
        if (String(item.fxType || item.type || "").toLowerCase() === "npc") return true;
      }
    }
    return false;
  }

  function fxHasItemRender(fx) {
    if (!fx || typeof fx !== "object") return false;
    if (Array.isArray(fx.itemrender) && fx.itemrender.length) return true;
    if (fx.itemrender && typeof fx.itemrender === "object") return true;
    if (Array.isArray(fx.items)) {
      for (var i = 0; i < fx.items.length; i++) {
        var item = fx.items[i] || {};
        if (String(item.fxType || item.type || "").toLowerCase() === "itemrender") return true;
      }
    }
    return false;
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

    var guiJsonPath = getPayloadGuiPath(raw, opts.guiJsonPath);
    debugLog(npc, debug, "resolved guiJsonPath=" + guiJsonPath);
    var sessionId = String(opts.sessionId || (Date.now() + "_" + Math.floor(Math.random()*900000+100000)));

    var runOpts = {
      guiJsonPath: guiJsonPath,
      htmlPath: String(opts.htmlPath || "html/dc_util/dc_gui_runtime.html"),
      sessionId: sessionId,
      debug: opts.debug === true,
      bindings: mergeChoiceFxIntoBindings(buildBindings(raw), opts.pendingFx)
    };

    closeHtmlGui(player);

    setActive(player, {
      sessionId: sessionId,
      overlayName: OVERLAY_NAME,
      mode: String(opts.mode || "generic"),
      returnGoto: String(opts.returnGoto || ""),
      baseSubPath: baseSubPath(dialogueRel),
      dialogueJsonPath: dialogueRel,
      guiJsonPath: guiJsonPath,
      openedAt: Date.now()
    });

    var openTarget = eventObj || { player: player, npc: npc };
    var handle = openDcGuiRuntime(openTarget, runOpts);
    debugLog(npc, debug, "openDcGuiRuntime returned=" + String(handle));
    if(handle == null){ clearActive(player); return null; }
    return handle;
  }

  function updateOpenDialogue(player, active, raw, nextRel, pendingFx){
    if(!player || !active || !raw) return false;
    var sessionId = String(active.sessionId || "");
    var payload = {
      __overlayName: OVERLAY_NAME,
      type: "dcDialogueUpdate",
      sessionId: sessionId,
      dialogueJsonPath: String(nextRel || ""),
      bindings: mergeChoiceFxIntoBindings(buildBindings(raw), pendingFx)
    };
    var ok = sendToBrowser(player, "dcDialogueUpdate", payload);
    if(!ok) return false;
    setActive(player, {
      sessionId: sessionId,
      overlayName: OVERLAY_NAME,
      mode: String(active.mode || "generic"),
      returnGoto: String(active.returnGoto || ""),
      baseSubPath: baseSubPath(nextRel),
      dialogueJsonPath: String(nextRel || ""),
      guiJsonPath: String(active.guiJsonPath || ""),
      openedAt: Number(active.openedAt || Date.now())
    });
    return true;
  }

  function applyStore(player, store){
    if(!player || !store) return;
    var key = String(store.key || "");
    if(!key) return;
    var data = player.getStoreddata();
    var op = String(store.op || store.storeOp || "set").toLowerCase();
    if(op === "delete" || op === "remove"){
      try{ data.remove(key); }catch(e0){}
      return;
    }
    if(op === "add" || op === "subtract"){
      var cur = 0;
      try{ cur = parseFloat(String(data.get(key) || "0")); }catch(e1){ cur = 0; }
      if(isNaN(cur)) cur = 0;
      var delta = parseFloat(String(store.value != null ? store.value : "0"));
      if(isNaN(delta)) delta = 0;
      data.put(key, String(op === "subtract" ? cur - delta : cur + delta));
      return;
    }
    data.put(key, String(store.value != null ? store.value : ""));
  }

  function applyTag(player, tag){
    if(!player || !tag) return;
    var key = String(tag.key || tag.tag || "");
    if(!key) return;
    var op = String(tag.op || "add").toLowerCase();
    try{
      if(op === "delete" || op === "remove"){
        if(typeof player.removeTag === "function") player.removeTag(key);
      }else{
        if(typeof player.addTag === "function") player.addTag(key);
      }
    }catch(e){}
  }

  function applyAdvancement(player, adv){
    if(!player || !adv) return;
    var id = String(adv.id || adv.advancement || "");
    if(!id) return;
    if(adv.grant === true || adv.value === true){
      if(typeof player.giveAdvancement === "function") player.giveAdvancement(id);
    }
  }

  function playerName(player){
    try{ if(player && typeof player.getName === "function") return String(player.getName()); }catch(e0){}
    try{ return String(player.name || ""); }catch(e1){}
    return "";
  }

  function execNpcCommand(npc, command){
    if(!npc || !command) return false;
    try{
      if(typeof npc.executeCommand === "function"){
        npc.executeCommand(String(command));
        return true;
      }
    }catch(e){}
    return false;
  }

  function applyFtbTask(player, npc, task){
    if(!task) return;
    var quest = String(task.quest || "");
    if(!quest) return;
    var name = playerName(player);
    var taskIndex = Number(task.task || 0);
    var suffix = taskIndex > 0 ? (" " + taskIndex) : "";
    execNpcCommand(npc, "ftbquests change_progress " + name + " complete " + quest + suffix);
  }

  function applyFtbComplete(player, npc, complete){
    if(!complete) return;
    var quest = String(complete.quest || "");
    if(!quest) return;
    execNpcCommand(npc, "ftbquests change_progress " + playerName(player) + " complete " + quest);
  }

  function applyCobbleDollar(player, npc, money){
    if(!money) return;
    var amount = Number(money.amount || 0);
    if(!amount) return;
    var op = String(money.op || money.moneyOp || "add").toLowerCase();
    var cmdOp = "give";
    if(op === "take" || op === "pay" || op === "remove" || op === "subtract") cmdOp = "pay";
    else if(op === "set") cmdOp = "set";
    var name = playerName(player);
    execNpcCommand(npc, "cobbledollars " + cmdOp + " " + name + " " + amount);
  }
  function applyChoiceNpcFx(eventObj, player, npc, choiceFx){
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
  function handleChoice(player, npc, active, payload, eventObj){
    var actions = [];
    try{
      var dataObj = payload ? payload.data : null;
      if(typeof dataObj === "string") dataObj = JSON.parse(String(dataObj));
      if(dataObj && Array.isArray(dataObj.actions)) actions = dataObj.actions;
      else if(payload && Array.isArray(payload.actions)) actions = payload.actions;
    }catch(e){ actions = []; }

    var returnGoto = String(active.returnGoto || "");
    var choiceFx = null;
    try{ var dataObjFx = payload ? payload.data : null; if(typeof dataObjFx === "string") dataObjFx = JSON.parse(String(dataObjFx)); choiceFx = dataObjFx && dataObjFx.fx && typeof dataObjFx.fx === "object" ? dataObjFx.fx : null; }catch(eFx){ choiceFx = null; }

    applyChoiceNpcFx(eventObj, player, npc, choiceFx);

    for(var i=0;i<actions.length;i++){
      var a = actions[i] || {};
      if(a.store) applyStore(player, a.store);
      if(a.tag) applyTag(player, a.tag);
      if(a.advancement) applyAdvancement(player, a.advancement);
      if(a.ftb_task) applyFtbTask(player, npc, a.ftb_task);
      if(a.ftb_complete) applyFtbComplete(player, npc, a.ftb_complete);
      if(a.cobbledollar) applyCobbleDollar(player, npc, a.cobbledollar);

      if(a.command){
        var cmd = String(a.command);
        var name = playerName(player);
        if(name) cmd = cmd.split("@player").join(name).split("{player}").join(name);
        execNpcCommand(npc, cmd);
      }

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
        if(nextRaw && !fxHasNpc(choiceFx) && !fxHasItemRender(choiceFx) && updateOpenDialogue(player, active, nextRaw, nextRel, choiceFx)){
          return { done:false, reason:"goto", goto:g, next: nextRel, updated:true };
        }
        open(player, npc, {
          dialogueJsonPath: nextRel,
          guiJsonPath: String(active.guiJsonPath || ""),
          htmlPath: "html/dc_util/dc_gui_runtime.html",
          sessionId: "",
          mode: String(active.mode || "generic"),
          returnGoto: returnGoto,
          pendingFx: choiceFx
        });
        return { done:false, reason:"goto", goto:g, next: nextRel };
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
    // __guiClosed can arrive with no payload/sessionId; accept current session.
    if(payload.sessionId && active.sessionId && String(payload.sessionId) !== String(active.sessionId)) return null;

    var evName = String(e.eventName || "");
    if(evName === "choice"){
      var res = handleChoice(player, npc, active, payload, e);
      return { handled:true, result: res };
    }
    if(evName === "__guiClosed" || evName === "done"){
      if(!payload.sessionId && active.openedAt && (Date.now() - Number(active.openedAt || 0)) < 1200){
        return { handled:true, result:{ done:false, reason:"stale_close_ignored" } };
      }
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




