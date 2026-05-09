// GUI Maker runtime loader for CustomNPCs HTML GUIs.
// Depends on shared util scripts (load BEFORE this file):
// - dc_lib/ds_npc_util/dc_cfg_checker.js   (cfg_chk_*)
// - dc_lib/ds_npc_util/dc_util_common.js   (util_toInt)

var DcGuiRuntimeModule = (function () {
  var OVERLAY_NAME = "dc_gui_runtime";
  var DEFAULT_HTML = "html/dc_util/dc_gui_runtime.html";
  var DEFAULT_ENTITY_SLOT_BASE = 0;

  function dbgEnabled(options){
    return options && (options.debug === true || String(options.debug || "").trim() === "1");
  }

  function log(ctx, options, msg, err){
    if(!dbgEnabled(options)) return;
    var line = "[dc_gui_runtime] " + String(msg) + (err != null ? (" | " + String(err)) : "");
    try{ if(ctx && ctx.npc && typeof ctx.npc.say === "function") ctx.npc.say(line); }catch(e0){}
  }

  function requireFn(ctx, options, name){
    if(typeof this[name] === "function") return true;
    if(typeof globalThis !== "undefined" && typeof globalThis[name] === "function") return true;
    log(ctx, options, "Missing dependency function: " + name);
    return false;
  }

  function getContext(target, maybeNpc, maybeOpts) {
    if (target && target.player && target.npc) {
      var opts = null;
      if (maybeNpc && typeof maybeNpc === "object") opts = maybeNpc;
      if (!opts && maybeOpts && typeof maybeOpts === "object") opts = maybeOpts;
      return { player: target.player, npc: target.npc, event: target, opts: opts || {} };
    }
    if (target && typeof target.getMCEntity === "function") {
      return { player: target, npc: maybeNpc, event: null, opts: (maybeOpts && typeof maybeOpts === "object") ? maybeOpts : {} };
    }
    return null;
  }
function normalizeEntityTargetType(value) {
    var key = String(value || "npc").trim().toLowerCase();
    if (key === "player" || key === "id") return key;
    return "npc";
  }

  function sortElementsForRuntime(elements) {
    var list = Array.isArray(elements) ? elements.slice() : [];
    list.sort(function (a, b) {
      var za = (a && a.z != null) ? Number(a.z) : 0;
      var zb = (b && b.z != null) ? Number(b.z) : 0;
      if (za !== zb) return za - zb;
      var ia = (a && a.__index != null) ? Number(a.__index) : 0;
      var ib = (b && b.__index != null) ? Number(b.__index) : 0;
      return ia - ib;
    });
    return list;
  }

  function readGuiJson(ctx, options, rawPath){
    if(typeof cfg_chk_resolveFile !== "function" || typeof cfg_chk_readJsonFile !== "function"){
      log(ctx, options, "cfg_chk_* helpers not loaded (dc_cfg_checker.js)");
      return null;
    }

    var file = null;
    try{ file = cfg_chk_resolveFile(rawPath, null); }catch(err0){ file = null; }
    if(!file){ log(ctx, options, "Invalid guiJsonPath", rawPath); return null; }

    var exists = false;
    try{ exists = file.exists(); }catch(err1){ exists = false; }
    if(!exists){ log(ctx, options, "GUI JSON not found", String(file.getAbsolutePath ? file.getAbsolutePath() : rawPath)); return null; }

    try{
      var payload = cfg_chk_readJsonFile(file);
      return payload && payload.json ? payload.json : null;
    }catch(err2){
      log(ctx, options, "Failed to read/parse GUI JSON", err2);
      return null;
    }
  }

  function buildNpcModel(world, npc) {
    try {
      var model = world.createEntity("customnpcs:customnpc");
      model.setEntityNbt(npc.getEntityNbt());
      return model;
    } catch (err) {
      return null;
    }
  }

  function buildPlayerModel(world, player) {
    try {
      // Use the actual player entity (not a skin-mimic model).
      return player;
    } catch (err) {
      return null;
    }
  }

  function buildEntityById(world, id) {
    var entityId = String(id || "").trim();
    if (!entityId) return null;
    try {
      return world.createEntity(entityId);
    } catch (err) {
      return null;
    }
  }

  function entityNbtSafe(entity) {
    try {
      if (typeof cnpcext !== "undefined" && cnpcext && typeof cnpcext.entityNbt === "function") {
        return String(cnpcext.entityNbt(entity) || "");
      }
    } catch (err) {}
    return "";
  }

  function entityIdSafe(entity) {
    try {
      if (typeof cnpcext !== "undefined" && cnpcext && typeof cnpcext.entityId === "function") {
        return cnpcext.entityId(entity);
      }
    } catch (err) {}
    return null;
  }


  function fxList(fx, key) {
    if (!fx || typeof fx !== "object") return [];
    var direct = fx[key];
    if (Array.isArray(direct)) return direct;
    if (direct && typeof direct === "object") return [direct];
    if (Array.isArray(fx.items)) {
      var out = [];
      for (var i = 0; i < fx.items.length; i++) {
        var item = fx.items[i] || {};
        if (String(item.fxType || item.type || "").toLowerCase() === key) out.push(item);
      }
      return out;
    }
    return [];
  }

  function fxTargetMatchesElement(el, fx) {
    var id = String(el && el.id || "");
    var name = String(el && el.name || "");
    var key = String(fx && (fx.targetElementKey || fx.guiTargetKey || "") || "").split(".")[0];
    var targetId = String(fx && (fx.targetElementId || fx.guiImageElementId || fx.elementId || "") || "");
    var targetName = String(fx && (fx.targetElementName || fx.guiImageElementName || "") || "");
    return (key && key === id) || (targetId && targetId === id) || (targetName && targetName === name);
  }

  function fxAssetPath(fx, primaryKey) {
    if (!fx || typeof fx !== "object") return "";
    var asset = fx.asset && typeof fx.asset === "object" ? fx.asset : null;
    var path = String(fx[primaryKey] || fx.assetFilePath || fx.runtimePath || fx.url || "").trim();
    if (!path && asset) {
      var sub = String(asset.subPath || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
      var file = String(asset.fileName || "").replace(/\\/g, "/").replace(/^\/+/, "");
      path = sub && file ? (sub + "/" + file) : file;
    }
    return path.replace(/\\/g, "/").replace(/^\/+/, "");
  }

  function applyBindingFxToGui(gui, bindings) {
    if (!gui || typeof gui !== "object") return gui;
    var fx = bindings && bindings.textFx && typeof bindings.textFx === "object" ? bindings.textFx : null;
    if (!fx) return gui;
    var elements = Array.isArray(gui.elements) ? gui.elements : [];
    var images = fxList(fx, "image");
    for (var i = 0; i < images.length; i++) {
      var imgFx = images[i] || {};
      var imgPath = fxAssetPath(imgFx, "assetFilePath");
      if (!imgPath) continue;
      for (var j = 0; j < elements.length; j++) {
        var imgEl = elements[j] || {};
        if (!fxTargetMatchesElement(imgEl, imgFx)) continue;
        var t = String(imgEl.type || "").toLowerCase();
        if (t === "image") imgEl.imagePath = imgPath;
        else if (t === "dialog") imgEl.dialogImagePath = imgPath;
        else if (t === "itemrender") imgEl.itemRenderImagePath = imgPath;
      }
    }
    var itemrenders = fxList(fx, "itemrender");
    for (var k = 0; k < itemrenders.length; k++) {
      var itemFx = itemrenders[k] || {};
      for (var m = 0; m < elements.length; m++) {
        var itemEl = elements[m] || {};
        if (String(itemEl.type || "").toLowerCase() !== "itemrender") continue;
        if (!fxTargetMatchesElement(itemEl, itemFx)) continue;
        itemEl.itemRenderId = String(itemFx.itemId || itemFx.itemRenderId || itemEl.itemRenderId || "minecraft:diamond_sword");
        if (itemFx.itemScale != null) itemEl.itemRenderScale = Number(itemFx.itemScale) || itemEl.itemRenderScale;
        if (itemFx.itemRotation != null) itemEl.itemRenderRotation = Number(itemFx.itemRotation) || 0;
      }
    }
    var npcs = fxList(fx, "npc");
    for (var n = 0; n < npcs.length; n++) {
      var npcFx = npcs[n] || {};
      for (var p = 0; p < elements.length; p++) {
        var npcEl = elements[p] || {};
        if (String(npcEl.type || "").toLowerCase() !== "entity") continue;
        if (String(npcEl.entityTargetType || "npc").toLowerCase() !== "npc") continue;
        if (!fxTargetMatchesElement(npcEl, npcFx)) continue;
        npcEl.entitySkinTexture = String(npcFx.skinTexture || "").trim();
        npcEl.entityGeckoModel = String(npcFx.geckoModel || "");
        npcEl.entityGeckoTexture = String(npcFx.geckoTexture || "");
        npcEl.entityGeckoAnimationFile = String(npcFx.geckoAnimationFile || "");
        npcEl.entityGeckoAnimation = String(npcFx.geckoAnimation || "");
        npcEl.entityGeckoPlayMode = String(npcFx.geckoPlayMode || "thenPlay");
      }
    }
    return gui;
  }

  function callIfFunction(target, name, value) {
    if (!target || value == null || String(value).trim() === "") return false;
    try {
      if (typeof target[name] === "function") {
        target[name](String(value));
        return true;
      }
    } catch (errCall) {}
    return false;
  }

  function applyNpcSkinToModel(model, skinTexture) {
    var texture = String(skinTexture || "").trim();
    if (!model || !texture) return;
    try {
      var display = null;
      try { display = (typeof model.getDisplay === "function") ? model.getDisplay() : null; } catch (errD0) { display = null; }
      if (!display) { try { display = model.display || null; } catch (errD1) { display = null; } }
      if (callIfFunction(display, "setSkinTexture", texture)) return;
      callIfFunction(model, "setSkinTexture", texture);
    } catch (errS) {}
  }

  function applyGeckoConfigToModel(model, el) {
    if (!model || !el) return;
    callIfFunction(model, "setGeckoModel", el.entityGeckoModel);
    callIfFunction(model, "setGeckoTexture", el.entityGeckoTexture);
    callIfFunction(model, "setGeckoAnimationFile", el.entityGeckoAnimationFile);
    callIfFunction(model, "setGeckoIdleAnimation", el.entityGeckoAnimation);
  }
  function buildOverlayEntities(ctx, gui, options) {
    var world = null;
    try { world = ctx.npc && ctx.npc.getWorld ? ctx.npc.getWorld() : (ctx.player && ctx.player.world ? ctx.player.world : null); } catch (err0) { world = null; }
    if (!world) {
      log(ctx, options, "No world detected in context");
      return { entitySlots: {}, overlayEntities: [] };
    }

    var base = DEFAULT_ENTITY_SLOT_BASE;
    try{
      if(typeof util_toInt === "function") base = util_toInt(options && options.entitySlotBase, DEFAULT_ENTITY_SLOT_BASE);
    }catch(err1){ base = DEFAULT_ENTITY_SLOT_BASE; }
    if (base < 0) base = DEFAULT_ENTITY_SLOT_BASE;

    var elements = Array.isArray(gui && gui.elements) ? gui.elements : [];
    for (var i = 0; i < elements.length; i++) {
      if (elements[i] && typeof elements[i] === "object" && elements[i].__index == null) elements[i].__index = i;
    }

    var sorted = sortElementsForRuntime(elements);
    var entityElements = [];
    for (var i = 0; i < sorted.length; i++) {
      if (sorted[i] && String(sorted[i].type || "").toLowerCase() === "entity") entityElements.push(sorted[i]);
    }

    var entitySlots = {};
    var overlayEntities = [];
    var slotCursor = 0;

    for (var i = 0; i < entityElements.length; i++) {
      var el = entityElements[i] || {};
      var label = String(el.entityLabel || el.name || ("entity_render_" + i));
      if (!label) label = "entity_render_" + i;

      var slot = base + slotCursor;
      slotCursor += 1;

      var targetType = normalizeEntityTargetType(el.entityTargetType);
      var targetId = String(el.entityTargetId || "").trim();

      var useEntityId = false;
      var entityId = null;
      var model = null;

      if (targetType === "player") {
        var playerEntity = null;
        try { playerEntity = (ctx.player && typeof ctx.player.getMCEntity === "function") ? ctx.player.getMCEntity() : null; } catch (errP) { playerEntity = null; }
        // Prefer wrapper first (matches docs usage), then MC entity.
        entityId = entityIdSafe(ctx.player) || entityIdSafe(playerEntity);
        useEntityId = !!entityId;
        if (!useEntityId) model = buildPlayerModel(world, ctx.player);
      } else if (targetType === "id") {
        model = buildEntityById(world, targetId);
      } else {
        model = buildNpcModel(world, ctx.npc);
      }

      var nbt = null;
      if (!useEntityId) {
        if (!model) {
          log(ctx, options, "Entity model build failed", targetType + (targetType === "id" ? (":" + targetId) : ""));
          continue;
        }

        applyNpcSkinToModel(model, el.entitySkinTexture);
        applyGeckoConfigToModel(model, el);
        nbt = entityNbtSafe(model);
        if (!nbt) {
          log(ctx, options, "cnpcext.entityNbt returned empty", label);
          continue;
        }
      }

      if (targetType === "player") {
        log(ctx, options, "player overlay target", (useEntityId ? ("entityId=" + entityId) : ("nbt=" + (nbt ? ("" + nbt.length) : "0"))));
      }

            var rot = 180;
      try{
        rot = parseInt(String(el.entityRotation != null ? el.entityRotation : 180), 10);
        if(isNaN(rot)) rot = 180;
      }catch(errRot){ rot = 180; }
      if(rot < 0) rot = 0;
      if(rot > 360) rot = 360;

      var follow = (el.entityFollowCursor != null) ? (el.entityFollowCursor === true) : true;
      var anim = (el.entityAnimate != null) ? (el.entityAnimate === true) : true;



      entitySlots[label] = slot;
      var entry = { slot: slot, rotation: rot, followCursor: follow, animate: anim };
      if (el.entitySkinTexture) entry.skinTexture = String(el.entitySkinTexture || "");
      if (el.entityGeckoAnimation || el.entityGeckoModel || el.entityGeckoTexture || el.entityGeckoAnimationFile) {
        entry.geckoModel = String(el.entityGeckoModel || "");
        entry.geckoTexture = String(el.entityGeckoTexture || "");
        entry.geckoAnimationFile = String(el.entityGeckoAnimationFile || "");
        entry.geckoAnimation = String(el.entityGeckoAnimation || "");
        entry.geckoPlayMode = String(el.entityGeckoPlayMode || "thenPlay");
      }
      if (useEntityId) entry.entityId = entityId;
      else entry.nbt = nbt;
      overlayEntities.push(entry);
    }

    return { entitySlots: entitySlots, overlayEntities: overlayEntities };
  }
  function normalizeImageLayoutForRuntime(gui) {
    if (!gui || typeof gui !== "object") return gui;
    var stage = gui.stage && typeof gui.stage === "object" ? gui.stage : null;
    if (stage) {
      if (stage.backgroundImageInsetX == null) stage.backgroundImageInsetX = 0;
      if (stage.backgroundImageScale == null) stage.backgroundImageScale = 100;
    }
    var elements = Array.isArray(gui.elements) ? gui.elements : [];
    for (var i = 0; i < elements.length; i++) {
      var item = elements[i];
      if (!item || typeof item !== "object") continue;
      if (String(item.type || "").toLowerCase() === "image") {
        if (item.imageInsetX == null) item.imageInsetX = 0;
        if (item.imageScale == null) item.imageScale = 100;
      }
    }
    return gui;
  }


  function buildOverlayItems(gui) {
    var elements = Array.isArray(gui && gui.elements) ? gui.elements : [];
    var sorted = sortElementsForRuntime(elements);
    var itemSlots = {};
    var overlayItems = [];
    var slotCursor = 0;
    for (var i = 0; i < sorted.length; i++) {
      var el = sorted[i] || {};
      if (String(el.type || "").toLowerCase() !== "itemrender") continue;
      var slot = slotCursor;
      slotCursor += 1;
      var id = String(el.id || "");
      var label = String(el.itemLabel || el.name || id || ("item_render_" + i));
      var itemId = String(el.itemRenderId || el.itemId || "minecraft:diamond_sword").trim() || "minecraft:diamond_sword";
      var count = Number(el.itemRenderCount || el.itemCount || 1) || 1;
      if (id) itemSlots[id] = slot;
      if (label) itemSlots[label] = slot;
      overlayItems.push({ slot: slot, item: itemId, count: count });
    }
    return { itemSlots: itemSlots, overlayItems: overlayItems };
  }
  function buildInitData(ctx, guiJson, options) {
    if(typeof cfg_chk_deepCopy !== "function"){
      log(ctx, options, "cfg_chk_deepCopy not loaded (dc_cfg_checker.js)");
      return null;
    }

    var gui = null;
    try{ gui = cfg_chk_deepCopy(guiJson || {}); }catch(err0){ gui = guiJson || {}; }
    gui = normalizeImageLayoutForRuntime(gui);
    var bindings = {};
    try{ bindings = (options && options.bindings) ? cfg_chk_deepCopy(options.bindings) : {}; }catch(err1){ bindings = options && options.bindings ? options.bindings : {}; }


    var speakerName = "";
    try{ speakerName = String(ctx && ctx.npc && ctx.npc.display && typeof ctx.npc.display.getName === "function" ? ctx.npc.display.getName() : ""); }catch(errS0){ speakerName = ""; }
    if(!speakerName){ try{ speakerName = String(ctx && ctx.npc && typeof ctx.npc.getName === "function" ? ctx.npc.getName() : ""); }catch(errS1){ speakerName = ""; } }
    speakerName = String(speakerName || "").trim();
    if(speakerName){
      try{
        if(!bindings || typeof bindings !== "object") bindings = {};
        if(!bindings.dialog || typeof bindings.dialog !== "object") bindings.dialog = {};
        if(!bindings.dialog.speaker) bindings.dialog.speaker = speakerName;
        if(!bindings.speaker) bindings.speaker = speakerName;
      }catch(errS2){}
    }

    gui = applyBindingFxToGui(gui, bindings);
    var overlay = buildOverlayEntities(ctx, gui, options);
    var itemOverlay = buildOverlayItems(gui);
    return {
      __overlayName: OVERLAY_NAME,
      debug: dbgEnabled(options),
      sessionId: String((options && options.sessionId) || ""),
      speaker: speakerName,
      gui: gui,
      bindings: bindings,
      entitySlots: overlay.entitySlots,
      overlayEntities: overlay.overlayEntities,
      itemSlots: itemOverlay.itemSlots,
      overlayItems: itemOverlay.overlayItems
    };
  }

  function open(target, maybeNpc, maybeOpts) {
    var ctx = getContext(target, maybeNpc, maybeOpts);
    if (!ctx || !ctx.player || !ctx.npc) return null;
    var options = ctx.opts || {};

    log(ctx, options, "open() start");

    var guiPath = String(options.guiJsonPath || options.templatePath || "").trim();
    if (!guiPath) { log(ctx, options, "missing guiJsonPath"); return null; }

    var guiJson = readGuiJson(ctx, options, guiPath);
    if (!guiJson) { log(ctx, options, "GUI JSON load failed", guiPath); return null; }

    var initData = buildInitData(ctx, guiJson, options);
    if(!initData){ log(ctx, options, "buildInitData failed"); return null; }

    var htmlPath = String(options.htmlPath || DEFAULT_HTML).trim() || DEFAULT_HTML;
    log(ctx, options, "htmlPath=" + htmlPath);
    try{ log(ctx, options, "elements=" + (initData.gui && initData.gui.elements ? initData.gui.elements.length : 0)); }catch(err0){}
    try{ log(ctx, options, "entitySlots=" + (initData.entitySlots ? Object.keys(initData.entitySlots).join(",") : "")); }catch(err1){}
    try{ log(ctx, options, "overlayEntities=" + (initData.overlayEntities ? initData.overlayEntities.length : 0)); }catch(err2){}

    try {
      if (typeof cnpcext === "undefined" || !cnpcext || typeof cnpcext.openHtmlGui !== "function") {
        log(ctx, options, "cnpcext.openHtmlGui unavailable");
        return null;
      }
      try{
        if(typeof cnpcext.closeOverlay === "function"){
          cnpcext.closeOverlay(ctx.player, String(OVERLAY_NAME));
        }
      }catch(errClose){}
      try{
        if(typeof cnpcext.getClientBridge === "function"){
          var br = null;
          try{ br = cnpcext.getClientBridge(ctx.player.getMCEntity()); }catch(e0){ br = null; }
          if(br && typeof br.closeHtmlGui === "function") br.closeHtmlGui();
        }
      }catch(errBridgeClose){}
      // Prefer opening with an event/context object if available (keeps htmlGuiEvent routing to this script).
      if (ctx && ctx.event) {
        try {
          var h0 = cnpcext.openHtmlGui(ctx.event, htmlPath, 0, 0, JSON.stringify(initData));
          log(ctx, options, "openHtmlGui(handle,event)=" + String(h0));
          if (h0 != null) return h0;
        } catch (eOpen0) {
          log(ctx, options, "openHtmlGui(event) threw", eOpen0);
        }
      }

      // Fallback: open with player
      try{
        var handle = cnpcext.openHtmlGui(ctx.player, htmlPath, 0, 0, JSON.stringify(initData));
        log(ctx, options, "openHtmlGui(handle,player)=" + String(handle));
        return handle;
      }catch(eOpen1){
        log(ctx, options, "openHtmlGui(player) threw", eOpen1);
        return null;
      }
    } catch (err) {
      log(ctx, options, "openHtmlGui threw", err);
      return null;
    }
  }

  return {
    OVERLAY_NAME: OVERLAY_NAME,
    DEFAULT_HTML: DEFAULT_HTML,
    buildInitData: buildInitData,
    open: open
  };
})();

var DcGuiRuntime = DcGuiRuntimeModule;

function openDcGuiRuntime(e, opts) {
  return DcGuiRuntimeModule.open(e, opts || {}, null);
}














