// Simple dialogue trigger for dc_npc_core_module.js.
// ScriptList order:
// 1) dc_lib/ds_npc_util/dc_npc_core_module.js
// 2) dc_lib/ds_npc_util/dc_cfg_checker.js
// 3) dc_lib/ds_npc_util/dc_util_common.js
// 4) dc_lib/ds_npc_util/dc_gui_runtime.js
// 5) dc_lib/ds_npc_util/dc_dialogue_util.js
// 6) dc_lib/ds_npc_util/dc_dialogue_trigger.js

var DcDialogueTriggerConfig = {
  enabled: true,
  dialogueJsonPath: "DochiConditionTest/00.json",
  guiJsonPath: "",
  htmlPath: "html/dc_util/dc_gui_runtime.html"
};

function dc_dialogue_trigger_interact(e){
  if(!DcDialogueTriggerConfig.enabled) return;
  if(!e || !e.player || !e.npc) return;
  if(typeof dc_dialogue_open !== "function"){
    throw new Error("dc_dialogue_open is not loaded.");
  }

  var dialogueJsonPath = String(DcDialogueTriggerConfig.dialogueJsonPath || "").trim();
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
