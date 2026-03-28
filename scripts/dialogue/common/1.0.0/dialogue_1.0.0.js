// @package dialogue
// @version 1.0.0
// @file dialogue.js

window.DochiDialoguePackage = {
  package: "dialogue",
  version: "1.0.0",
  mount(targetId = "dialogue-root") {
    const target = document.getElementById(targetId);
    if (!target) return false;
    target.textContent = "dialogue package 1.0.0 loaded";
    return true;
  }
};
