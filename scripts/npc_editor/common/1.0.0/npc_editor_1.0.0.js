// @package npc_editor
// @version 1.0.0
// @file npc_editor.js

window.DochiNpcEditorPackage = {
  package: "npc_editor",
  version: "1.0.0",
  mount(targetId = "npc_editor-root") {
    const target = document.getElementById(targetId);
    if (!target) return false;
    target.textContent = "npc_editor package 1.0.0 loaded";
    return true;
  }
};
