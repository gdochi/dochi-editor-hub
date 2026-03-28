// @package dialogue
// @version 1.0.2
// @file dialogue.js

window.DochiDialoguePackage = {
  package: "dialogue",
  version: "1.0.2",
  mount(targetId = "dialogue-root") {
    const target = document.getElementById(targetId);
    if (!target) return false;
    target.textContent = "dialogue package 1.0.2 loaded";
    return true;
  }
};
