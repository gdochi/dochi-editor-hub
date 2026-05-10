// GUI Maker runtime loader for CustomNPCs HTML GUIs.
// Depends on shared util scripts (load BEFORE this file):
// - dc_lib/ds_npc_util/dc_cfg_checker.js   (cfg_chk_*)
// - dc_lib/ds_npc_util/dc_util_common.js   (util_toInt)

var DcGuiRuntimeModule = (function () {
  var OVERLAY_NAME = "dc_gui_runtime";
  var DEFAULT_HTML = "html/dc_util/dc_gui_runtime.html";
  var DEFAULT_ENTITY_SLOT_BASE = 0;

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
      return null;
    }

    var file = null;
    try{ file = cfg_chk_resolveFile(rawPath, null); }catch(err0){ file = null; }
    if(!file) return null;

    var exists = false;
    try{ exists = file.exists(); }catch(err1){ exists = false; }
    if(!exists) return null;

    try{
      var payload = cfg_chk_readJsonFile(file);
      return payload && payload.json ? payload.json : null;
    }catch(err2){
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

  function readFxImageCrop(fx) {
    if (!fx || typeof fx !== "object") return { enabled:false, x:0, y:0, w:0, h:0, sourceW:0, sourceH:0 };
    var direct = fx.imageCrop && typeof fx.imageCrop === "object" ? fx.imageCrop : (fx.crop && typeof fx.crop === "object" ? fx.crop : null);
    var raw = direct || fx;
    var enabled = direct ? raw.enabled !== false : (fx.cropEnabled === true || String(fx.cropEnabled || "").toLowerCase() === "true");
    var w = Number(raw.w != null ? raw.w : (raw.cropW != null ? raw.cropW : raw.width)) || 0;
    var h = Number(raw.h != null ? raw.h : (raw.cropH != null ? raw.cropH : raw.height)) || 0;
    if (!enabled || w <= 0 || h <= 0) return { enabled:false, x:0, y:0, w:0, h:0, sourceW:0, sourceH:0 };
    return {
      enabled:true,
      x:Number(raw.x != null ? raw.x : raw.cropX) || 0,
      y:Number(raw.y != null ? raw.y : raw.cropY) || 0,
      w:w,
      h:h,
      sourceW:Number(raw.sourceW || raw.sourceWidth || 0) || 0,
      sourceH:Number(raw.sourceH || raw.sourceHeight || 0) || 0
    };
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

        var cropObj = readFxImageCrop(imgFx);
        if (t === "image") {
          imgEl.imageCrop = cropObj;
          if (imgFx.imageScale != null) imgEl.imageScale = Number(imgFx.imageScale) || imgEl.imageScale;
          if (imgFx.imageInsetX != null) imgEl.imageInsetX = Number(imgFx.imageInsetX) || 0;
          if (imgFx.imageOffsetX != null) imgEl.imageOffsetX = Number(imgFx.imageOffsetX) || 0;
          if (imgFx.imageOffsetY != null) imgEl.imageOffsetY = Number(imgFx.imageOffsetY) || 0;
        } else if (t === "dialog") {
          imgEl.dialogImageCrop = cropObj;
          if (imgFx.imageScale != null) imgEl.dialogImageScale = Number(imgFx.imageScale) || imgEl.dialogImageScale;
          if (imgFx.imageOffsetX != null) imgEl.dialogImageOffsetX = Number(imgFx.imageOffsetX) || 0;
          if (imgFx.imageOffsetY != null) imgEl.dialogImageOffsetY = Number(imgFx.imageOffsetY) || 0;
        }
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
        entityId = entityIdSafe(ctx.player) || entityIdSafe(playerEntity);
        useEntityId = !!entityId;
        if (!useEntityId) model = ctx.player;
      } else if (targetType === "id") {
        model = buildEntityById(world, targetId);
      } else {
        model = buildNpcModel(world, ctx.npc);
      }

      var nbt = null;
      if (!useEntityId) {
        if (!model) {
          continue;
        }

        applyNpcSkinToModel(model, el.entitySkinTexture);
        applyGeckoConfigToModel(model, el);
        nbt = entityNbtSafe(model);
        if (!nbt) {
          continue;
        }
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
        if (item.imageOffsetX == null) item.imageOffsetX = 0;
        if (item.imageOffsetY == null) item.imageOffsetY = 0;
      }
      if (String(item.type || "").toLowerCase() === "dialog") {
        if (item.dialogImageScale == null) item.dialogImageScale = 100;
        if (item.dialogImageOffsetX == null) item.dialogImageOffsetX = 0;
        if (item.dialogImageOffsetY == null) item.dialogImageOffsetY = 0;
      }
    }
    return gui;
  }
  function buildInitData(ctx, guiJson, options) {
    if(typeof cfg_chk_deepCopy !== "function"){
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
    return {
      __overlayName: OVERLAY_NAME,
      sessionId: String((options && options.sessionId) || ""),
      speaker: speakerName,
      gui: gui,
      bindings: bindings,
      entitySlots: overlay.entitySlots,
      overlayEntities: overlay.overlayEntities
    };
  }

  function open(target, maybeNpc, maybeOpts) {
    var ctx = getContext(target, maybeNpc, maybeOpts);
    if (!ctx || !ctx.player || !ctx.npc) return null;
    var options = ctx.opts || {};

    var guiPath = String(options.guiJsonPath || options.templatePath || "").trim();
    if (!guiPath) return null;

    var guiJson = readGuiJson(ctx, options, guiPath);
    if (!guiJson) return null;

    var initData = buildInitData(ctx, guiJson, options);
    if(!initData) return null;

    var htmlPath = String(options.htmlPath || DEFAULT_HTML).trim() || DEFAULT_HTML;

    try {
      if (typeof cnpcext === "undefined" || !cnpcext || typeof cnpcext.openHtmlGui !== "function") {
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
          if (h0 != null) return h0;
        } catch (eOpen0) {
        }
        return null;
      }

      try{
        var handle = cnpcext.openHtmlGui(ctx.player, htmlPath, 0, 0, JSON.stringify(initData));
        return handle;
      }catch(eOpen1){
        return null;
      }
    } catch (err) {
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














