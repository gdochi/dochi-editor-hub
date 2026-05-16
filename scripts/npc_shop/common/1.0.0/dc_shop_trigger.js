// Simple shop trigger for dc_npc_core_module.js.
// ScriptList order:
// 1) dc_lib/dc_npc_util/dc_npc_core_module.js
// 2) dc_lib/dc_npc_util/dc_cfg_checker.js
// 3) dc_lib/dc_npc_util/dc_util_common.js
// 4) dc_lib/dc_npc_util/dc_gui_runtime.js
// 5) dc_lib/dc_npc_util/dc_cond_checker.js
// 6) dc_lib/dc_npc_util/dc_reward_checker.js
// 7) dc_lib/dc_npc_util/dc_shop_runtime.js
// 8) dc_lib/dc_shop/dc_shop_trigger.js

var DcShopTriggerConfig = {
  enabled: true,
  shopJsonPath: "main_shop.json",
  guiJsonPath: "",
  htmlPath: "html/dc_util/dc_gui_runtime.html"
};

var DC_SHOP_TRIGGER_DIRECT_PATH_KEY = "dc_shop_json_path";
var DC_SHOP_TRIGGER_SELECTION_KEY = "npc_browser_dc_selection";
var DC_SHOP_TRIGGER_LOCK_KEY = "npc_browser_dochi_lock";

function dc_shop_trigger_cleanPath(path){
  path = String(path || "").replace(/\\/g, "/").replace(/^\s+|\s+$/g, "");
  while(path.charAt(0) === "/") path = path.substring(1);
  return path.replace(/\/+/g, "/");
}

function dc_shop_trigger_readStore(store, key){
  try{
    if(!store || !key) return "";
    var value = store.get(String(key));
    if(value == null) return "";
    return String(value);
  }catch(err){
    return "";
  }
}

function dc_shop_trigger_readSelectionPath(raw){
  var obj, prefix, path, entries, i, entry;
  try{
    if(!raw) return "";
    obj = JSON.parse(String(raw));
    entries = obj && obj.entries instanceof Array ? obj.entries : [];
    for(i = 0; i < entries.length; i++){
      entry = entries[i] || {};
      if(String(entry.prefix || "") !== "dc_shop") continue;
      path = dc_shop_trigger_cleanPath(entry.jsonPath || "");
      if(path) return path;
    }
    prefix = String(obj.prefix || "");
    if(prefix && prefix !== "dc_shop") return "";
    path = dc_shop_trigger_cleanPath(obj.jsonPath || "");
    return path;
  }catch(err){
    return "";
  }
}

function dc_shop_trigger_isDialogueShopSelection(raw){
  var obj, entries, i, prefix, hasDialogue = false, hasShop = false;
  try{
    if(!raw) return false;
    obj = JSON.parse(String(raw));
    entries = obj && obj.entries instanceof Array ? obj.entries : [];
    for(i = 0; i < entries.length; i++){
      prefix = String((entries[i] || {}).prefix || "");
      if(prefix === "dc_dialogue") hasDialogue = true;
      if(prefix === "dc_shop") hasShop = true;
    }
    return hasDialogue && hasShop;
  }catch(err){
    return false;
  }
}

function dc_shop_trigger_shouldSkipDirectInteract(npc){
  var store;
  try{
    if(!npc || typeof npc.getStoreddata !== "function") return false;
    store = npc.getStoreddata();
  }catch(err0){
    return false;
  }
  if(dc_shop_trigger_isDialogueShopSelection(dc_shop_trigger_readStore(store, DC_SHOP_TRIGGER_SELECTION_KEY))) return true;
  if(dc_shop_trigger_isDialogueShopSelection(dc_shop_trigger_readStore(store, DC_SHOP_TRIGGER_LOCK_KEY))) return true;
  return false;
}

function dc_shop_trigger_getStoredShopPath(npc){
  var store, path;
  try{
    if(!npc || typeof npc.getStoreddata !== "function") return "";
    store = npc.getStoreddata();
  }catch(err0){
    return "";
  }
  path = dc_shop_trigger_cleanPath(dc_shop_trigger_readStore(store, DC_SHOP_TRIGGER_DIRECT_PATH_KEY));
  if(path) return path;
  path = dc_shop_trigger_readSelectionPath(dc_shop_trigger_readStore(store, DC_SHOP_TRIGGER_SELECTION_KEY));
  if(path) return path;
  path = dc_shop_trigger_readSelectionPath(dc_shop_trigger_readStore(store, DC_SHOP_TRIGGER_LOCK_KEY));
  if(path) return path;
  return "";
}

function dc_shop_trigger_getShopPath(npc){
  var storedPath = dc_shop_trigger_getStoredShopPath(npc);
  if(storedPath) return storedPath;
  return dc_shop_trigger_cleanPath(DcShopTriggerConfig.shopJsonPath || "");
}

function dc_shop_trigger_open(e, source, accessPolicy){
  if(!DcShopTriggerConfig.enabled) return null;
  if(!e || !e.player || !e.npc) return null;
  if(typeof dc_shop_open !== "function"){
    throw new Error("dc_shop_open is not loaded.");
  }

  var shopJsonPath = dc_shop_trigger_getShopPath(e.npc);
  if(!shopJsonPath){
    throw new Error("shopJsonPath is empty.");
  }

  var opts = {
    shopJsonPath: shopJsonPath,
    htmlPath: String(DcShopTriggerConfig.htmlPath || "html/dc_util/dc_gui_runtime.html"),
    accessPolicy: String(accessPolicy || "shop_guard"),
    source: String(source || "npc_interact")
  };
  var guiJsonPath = String(DcShopTriggerConfig.guiJsonPath || "").trim();
  if(guiJsonPath) opts.guiJsonPath = guiJsonPath;

  return dc_shop_open(e, opts);
}

/**
 * @param {NpcEvent.InteractEvent} e
 */
function dc_shop_trigger_interact(e){
  if(dc_shop_trigger_shouldSkipDirectInteract(e && e.npc)) return;
  dc_shop_trigger_open(e, "npc_interact", "shop_guard");
}

function dc_shop_trigger_openFromDialogue(e){
  return dc_shop_trigger_open(e, "dialogue", "dialogue_only");
}

function dc_shop_trigger_module(){
  return {
    events: {
      interact: dc_shop_trigger_interact
    }
  };
}

if(typeof NpcEventModule !== "undefined" && NpcEventModule && typeof NpcEventModule.registerModule === "function"){
  NpcEventModule.registerModule("dc_shop_trigger", dc_shop_trigger_module());
}else{
  if(typeof __DcNpcEventPendingModules === "undefined" || !__DcNpcEventPendingModules) var __DcNpcEventPendingModules = [];
  __DcNpcEventPendingModules.push({
    name: "dc_shop_trigger",
    module: dc_shop_trigger_module()
  });
}
