// @package trainer
// @version 1.0.0
// @file trainer.js

window.DochiTrainerPackage = {
  package: "trainer",
  version: "1.0.0",
  mount(targetId = "trainer-root") {
    const target = document.getElementById(targetId);
    if (!target) return false;
    target.textContent = "trainer package 1.0.0 loaded";
    return true;
  }
};
