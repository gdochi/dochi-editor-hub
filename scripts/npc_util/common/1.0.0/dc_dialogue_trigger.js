

var DcDialogueTriggerConfig = {
  enabled: true,
  dialogueJsonPath: "DochiConditionTest/00.json",
  guiJsonPath: "",
  htmlPath: "html/dc_util/dc_gui_runtime.html"
};

var DC_DIALOGUE_TRIGGER_DIRECT_PATH_KEY = "dc_dialogue_json_path";
var DC_DIALOGUE_TRIGGER_SELECTION_KEY = "npc_browser_dc_selection";
var DC_DIALOGUE_TRIGGER_LOCK_KEY = "npc_browser_dochi_lock";

function dc_dialogue_trigger_cleanPath(path){
  path = String(path || "").replace(/\\/g, "/").replace(/^\s+|\s+$/g, "");
  while(path.charAt(0) === "/") path = path.substring(1);
  return path.replace(/\/+/g, "/");
}

function dc_dialogue_trigger_readStore(store, key){
  try{
    if(!store || !key) return "";
    var value = store.get(String(key));
    if(value == null) return "";
    return String(value);
  }catch(err){
    return "";
  }
}

function dc_dialogue_trigger_readSelectionPath(raw){
  var obj, prefix, path;
  try{
    if(!raw) return "";
    obj = JSON.parse(String(raw));
    prefix = String(obj.prefix || "");
    if(prefix && prefix !== "dc_dialogue") return "";
    path = dc_dialogue_trigger_cleanPath(obj.jsonPath || "");
    return path;
  }catch(err){
    return "";
  }
}

function dc_dialogue_trigger_getStoredDialoguePath(npc){
  var store, path;
  try{
    if(!npc || typeof npc.getStoreddata !== "function") return "";
    store = npc.getStoreddata();
  }catch(err0){
    return "";
  }
  path = dc_dialogue_trigger_cleanPath(dc_dialogue_trigger_readStore(store, DC_DIALOGUE_TRIGGER_DIRECT_PATH_KEY));
  if(path) return path;
  path = dc_dialogue_trigger_readSelectionPath(dc_dialogue_trigger_readStore(store, DC_DIALOGUE_TRIGGER_SELECTION_KEY));
  if(path) return path;
  path = dc_dialogue_trigger_readSelectionPath(dc_dialogue_trigger_readStore(store, DC_DIALOGUE_TRIGGER_LOCK_KEY));
  if(path) return path;
  return "";
}

function dc_dialogue_trigger_getDialoguePath(npc){
  var storedPath = dc_dialogue_trigger_getStoredDialoguePath(npc);
  if(storedPath) return storedPath;
  return dc_dialogue_trigger_cleanPath(DcDialogueTriggerConfig.dialogueJsonPath || "");
}

function dc_dialogue_trigger_interact(e){
  if(!DcDialogueTriggerConfig.enabled) return;
  if(!e || !e.player || !e.npc) return;
  if(typeof dc_dialogue_open !== "function"){
    throw new Error("dc_dialogue_open is not loaded.");
  }

  var dialogueJsonPath = dc_dialogue_trigger_getDialoguePath(e.npc);
  if(!dialogueJsonPath){
    throw new Error("dialogueJsonPath is empty.");
  }

  var opts = {
    dialogueJsonPath: dialogueJsonPath,
    htmlPath: String(DcDialogueTriggerConfig.htmlPath || "html/dc_util/dc_gui_runtime.html"),
    mode: "npc_interact"
  };
  var guiJsonPath = String(DcDialogueTriggerConfig.guiJsonPath || "").trim();
  if(guiJsonPath) opts.guiJsonPath = guiJsonPath;

  dc_dialogue_open(e, opts);
}

function dc_dialogue_trigger_htmlGuiEvent(e){
  if(!e || typeof dc_dialogue_handleHtmlEvent !== "function") return;
  dc_dialogue_handleHtmlEvent(e);
}

function dc_dialogue_trigger_module(){
  return {
    events: {
      interact: dc_dialogue_trigger_interact,
      htmlGuiEvent: dc_dialogue_trigger_htmlGuiEvent
    }
  };
}

if(typeof NpcEventModule !== "undefined" && NpcEventModule && typeof NpcEventModule.registerModule === "function"){
  NpcEventModule.registerModule("dc_dialogue_trigger", dc_dialogue_trigger_module());
}else{
  if(typeof __DcNpcEventPendingModules === "undefined" || !__DcNpcEventPendingModules) var __DcNpcEventPendingModules = [];
  __DcNpcEventPendingModules.push({
    name: "dc_dialogue_trigger",
    module: dc_dialogue_trigger_module()
  });
}
