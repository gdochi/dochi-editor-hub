// @package dialogue
// @version 1.0.1
// @file dialogue.js

window.DochiDialoguePackage = {
  package: "dialogue",
  version: "1.0.1",
  mount(targetId = "dialogue-root") {
    const target = document.getElementById(targetId);
    if (!target) return false;
    target.textContent = "dialogue package 1.0.1 loaded";
    return true;
  }
};
