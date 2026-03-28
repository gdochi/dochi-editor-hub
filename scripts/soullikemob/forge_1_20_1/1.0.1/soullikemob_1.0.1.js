// @package soullikemob
// @version 1.0.0
// @file soullikemob.js

window.DochiTrainerPackage = {
  package: "soullikemob",
  version: "1.0.1",
  mount(targetId = "soullikemob-root") {
    const target = document.getElementById(targetId);
    if (!target) return false;
    target.textContent = "soullikemob package 1.0.1 loaded";
    return true;
  }
};
