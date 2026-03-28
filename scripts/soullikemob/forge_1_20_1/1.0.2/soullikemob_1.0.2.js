// @package soullikemob
// @version 1.0.0
// @file soullikemob.js

window.DochiTrainerPackage = {
  package: "soullikemob",
  version: "1.0.2",
  mount(targetId = "soullikemob-root") {
    const target = document.getElementById(targetId);
    if (!target) return false;
    target.textContent = "soullikemob package 1.0.2 loaded";
    return true;
  }
};
