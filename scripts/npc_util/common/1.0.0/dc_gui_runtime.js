// GUI Maker runtime loader for CustomNPCs HTML GUIs.
// Depends on shared util scripts (load BEFORE this file):
// - dc_lib/dc_npc_util/dc_cfg_checker.js   (cfg_chk_*)
// - dc_lib/dc_npc_util/dc_util_common.js   (util_toInt)

var DcGuiRuntimeModule = (function () {
  var OVERLAY_NAME = "dc_gui_runtime";
  var DEFAULT_HTML = "html/dc_util/dc_gui_runtime.html";
  var DEFAULT_ENTITY_SLOT_BASE = 0;
  var LANG_RESOURCE_CACHE = {};
  var McComponent = null;
  var McText = null;

  try{
    if(typeof Java !== "undefined" && Java.type){
      try{ McComponent = Java.type("net.minecraft.network.chat.Component"); }catch(eForgeComponent){}
      try{ McText = Java.type("net.minecraft.text.Text"); }catch(eFabricText){}
    }
  }catch(eComponent){}

  function unwrapEventTarget(target) {
    try {
      if (target && target.event && target.event.player && target.event.npc) return target.event;
    } catch (err) {}
    return target;
  }

  function getContext(target, maybeNpc, maybeOpts) {
    if (target && target.player && target.npc) {
      var opts = null;
      var eventTarget = unwrapEventTarget(target);
      if (maybeNpc && typeof maybeNpc === "object") opts = maybeNpc;
      if (!opts && maybeOpts && typeof maybeOpts === "object") opts = maybeOpts;
      return { player: target.player, npc: target.npc, event: eventTarget, opts: opts || {} };
    }
    if (target && typeof target.getMCEntity === "function") {
      return { player: target, npc: maybeNpc, event: null, opts: (maybeOpts && typeof maybeOpts === "object") ? maybeOpts : {} };
    }
    return null;
  }

  function getPlayerLocale(player){
var candidates=[],mc=null,opts=null;
addLocaleCandidate(candidates,readJavaNoArgString(player,["getLanguage"]));
try{if(player&&typeof player.getMCEntity==="function")mc=player.getMCEntity();}catch(err1){}
addLocaleCandidate(candidates,readJavaNoArgString(mc,["getLanguage"]));
addLocaleCandidate(candidates,readJavaFieldString(mc,["field_46156","language","locale","clientLanguage","selectedLanguage"]));
opts=readJavaNoArgValue(mc,["method_53823","clientInformation","getClientInformation","getClientOptions"]);
if(opts)addLocaleCandidate(candidates,readJavaNoArgString(opts,["comp_1951","language","getLanguage","getLocale","locale"]));
if(opts)addLocaleCandidate(candidates,readJavaFieldString(opts,["comp_1951","language","locale"]));
return pickBestLocaleCandidate(candidates)||"en_us";
}
function addLocaleCandidate(list,value){
var locale=normalizeLocaleCandidate(value);
if(locale)list.push(locale);
}
function normalizeLocaleCandidate(value){
var locale=String(value||"").toLowerCase().replace("-","_");
if(!/^[a-z]{2,3}_[a-z0-9_]+$/.test(locale))return "";
return locale;
}
function pickBestLocaleCandidate(list){
var i,first="";
for(i=0;i<list.length;i++){
if(!first)first=list[i];
if(list[i]&&list[i]!=="en_us")return list[i];
}
return first||"";
}
function readJavaNoArgString(obj,names){
var value=readJavaNoArgValue(obj,names);
if(value==null)return "";
return String(value||"");
}
function readJavaNoArgValue(obj,names){
var i,value,methods,empty,j,m;
if(!obj)return null;
for(i=0;i<names.length;i++){
try{if(typeof obj[names[i]]==="function"){value=obj[names[i]]();if(value!=null)return value;}}catch(err0){}
}
try{
methods=obj.getClass().getMethods();
empty=Java.to([],"java.lang.Object[]");
for(i=0;i<names.length;i++){
for(j=0;j<methods.length;j++){
m=methods[j];
try{
if(String(m.getName())===names[i]&&m.getParameterCount()===0){
try{m.setAccessible(true);}catch(err1){}
value=m.invoke(obj,empty);
if(value!=null)return value;
}
}catch(err2){}
}
}
}catch(err3){}
return null;
}
function readJavaFieldString(obj,names){
var cls=null,i,field,value;
if(!obj)return "";
try{cls=obj.getClass();}catch(err0){return "";}
while(cls){
for(i=0;i<names.length;i++){
try{
field=cls.getDeclaredField(names[i]);
field.setAccessible(true);
value=field.get(obj);
if(value!=null&&String(value)!=="")return String(value);
}catch(err1){}
}
try{cls=cls.getSuperclass();}catch(err2){cls=null;}
}
return "";
}
function normalizeLocale(locale){
locale=String(locale||"en_us").toLowerCase().replace("-","_");
return locale||"en_us";
}
function translateNpcNameForPlayer(player,name){
name=String(name||"");
if(!isTranslationKeyText(name))return name;
return getLangResourceValue(getPlayerLocale(player),name)||vanillaTranslateKey(name)||name;
}
function componentString(comp){
if(comp==null)return "";
try{if(typeof comp.getString==="function")return String(comp.getString());}catch(err0){}
try{if(typeof comp.getContents==="function")return String(comp.getContents());}catch(err1){}
return String(comp);
}
function vanillaTranslateKey(key){
key=String(key||"");
if(!key)return "";
if(McComponent&&typeof McComponent.m_237115_==="function"){
try{return componentString(McComponent.m_237115_(key));}catch(err0){}
}
if(McComponent&&typeof McComponent.translatable==="function"){
try{return componentString(McComponent.translatable(key));}catch(err1){}
}
if(McText&&typeof McText.translatable==="function"){
try{return componentString(McText.translatable(key));}catch(err2){}
}
return "";
}
function isTranslationKeyText(text){
text=String(text||"");
return text.indexOf(".")>0&&/^[a-z0-9_.-]+$/.test(text);
}
function getLangResourceValue(locale,key){
var map=loadLangResourceMap(locale),fallback;
if(map[key]!=null)return String(map[key]);
if(normalizeLocale(locale)!=="en_us"){
fallback=loadLangResourceMap("en_us");
if(fallback[key]!=null)return String(fallback[key]);
}
return "";
}
function loadLangResourceMap(locale){
locale=normalizeLocale(locale);
if(LANG_RESOURCE_CACHE[locale])return LANG_RESOURCE_CACHE[locale];
LANG_RESOURCE_CACHE[locale]={};
loadLangResourcesInto(LANG_RESOURCE_CACHE[locale],locale);
return LANG_RESOURCE_CACHE[locale];
}
function loadLangResourcesInto(out,locale){
var containers=findLangResourceContainers(),i,file;
for(i=0;i<containers.length;i++){
file=containers[i];
if(file.isFile())readZipLangResources(out,file,locale);
else if(file.isDirectory())readDirLangResources(out,file,locale);
}
}
function findLangResourceContainers(){
var File=Java.type("java.io.File"),out=[],seen={},dirs=[new File("mods"),new File("./mods"),new File("minecraft/mods"),new File("./minecraft/mods"),new File("resourcepacks"),new File("./resourcepacks"),new File("minecraft/resourcepacks"),new File("./minecraft/resourcepacks")],i;
for(i=0;i<dirs.length;i++)pushResourceContainersFromDir(out,seen,dirs[i]);
return out;
}
function pushResourceContainersFromDir(out,seen,dir){
var list,i,file,name,path;
if(!dir||!dir.exists()||!dir.isDirectory())return;
list=dir.listFiles();
if(!list)return;
for(i=0;i<list.length;i++){
file=list[i];
if(!file)continue;
name=String(file.getName()).toLowerCase();
if(file.isDirectory()||name.slice(-4)===".jar"||name.slice(-4)===".zip"){
path=String(file.getAbsolutePath()).replace(/\\/g,"/");
if(!seen[path]){seen[path]=true;out.push(file);}
}
}
}
function readZipLangResources(out,file,locale){
var ZipFile=Java.type("java.util.zip.ZipFile"),zip=null,entries,entry,path,raw;
try{
zip=new ZipFile(file);
entries=zip.entries();
while(entries.hasMoreElements()){
entry=entries.nextElement();
if(entry.isDirectory())continue;
path=String(entry.getName()).toLowerCase();
if(!isLangResourcePath(path,locale))continue;
raw=readInputStreamText(zip.getInputStream(entry));
mergeLangJson(out,raw);
}
}finally{
if(zip)zip.close();
}
}
function readDirLangResources(out,dir,locale){
walkDirLangResources(out,dir,dir,locale);
}
function walkDirLangResources(out,root,dir,locale){
var list=dir.listFiles(),i,file,rel;
if(!list)return;
for(i=0;i<list.length;i++){
file=list[i];
if(file.isDirectory()){walkDirLangResources(out,root,file,locale);continue;}
rel=String(root.toURI().relativize(file.toURI()).getPath()||"").toLowerCase();
if(isLangResourcePath(rel,locale))mergeLangJson(out,readTextFile(file));
}
}
function isLangResourcePath(path,locale){
var suffix="/lang/"+normalizeLocale(locale)+".json";
path=String(path||"").toLowerCase().replace(/\\/g,"/");
return path.indexOf("assets/")===0&&path.indexOf("/lang/")>0&&path.slice(-suffix.length)===suffix;
}
function mergeLangJson(out,raw){
var text=stripBom(String(raw||"{}")).trim(),obj,keys,i,key,value;
if(!text)return;
if(text.charAt(0)!=="{")text="{"+text+"}";
try{
obj=JSON.parse(text);
}catch(err){
return;
}
keys=Object.keys(obj);
for(i=0;i<keys.length;i++){
key=keys[i];
value=obj[key];
if(value!=null)out[key]=String(value);
}
}
function readInputStreamText(input){
var InputStreamReader=Java.type("java.io.InputStreamReader"),BufferedReader=Java.type("java.io.BufferedReader"),br=null,line,parts=[];
try{
br=new BufferedReader(new InputStreamReader(input,"UTF-8"));
while((line=br.readLine())!==null)parts.push(String(line));
return stripBom(parts.join("\n"));
}finally{
if(br)br.close();
}
}
function readTextFile(file){
var FileInputStream=Java.type("java.io.FileInputStream"),InputStreamReader=Java.type("java.io.InputStreamReader"),BufferedReader=Java.type("java.io.BufferedReader"),br=null,line,parts=[];
try{
br=new BufferedReader(new InputStreamReader(new FileInputStream(file),"UTF-8"));
while((line=br.readLine())!==null)parts.push(String(line));
return stripBom(parts.join("\n"));
}finally{
if(br)br.close();
}
}
function stripBom(text){
text=String(text||"");
if(text.length&&text.charCodeAt(0)===65279)return text.substring(1);
return text;
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
    var path = String(asset && asset.path || "").trim();
    return path.replace(/\\/g, "/").replace(/^\/+/, "");
  }

  function readFxImageCrop(fx) {
    if (!fx || typeof fx !== "object") return { enabled:false, x:0, y:0, w:0, h:0, sourceW:0, sourceH:0 };
    var render = fx.render && typeof fx.render === "object" ? fx.render : {};
    var raw = render.crop && typeof render.crop === "object" ? render.crop : null;
    if(!raw) return { enabled:false, x:0, y:0, w:0, h:0, sourceW:0, sourceH:0 };
    var enabled = raw.enabled !== false;
    var w = Number(raw.w || 0) || 0;
    var h = Number(raw.h || 0) || 0;
    if (!enabled || w <= 0 || h <= 0) return { enabled:false, x:0, y:0, w:0, h:0, sourceW:0, sourceH:0 };
    return {
      enabled:true,
      x:Number(raw.x || 0) || 0,
      y:Number(raw.y || 0) || 0,
      w:w,
      h:h,
      sourceW:Number(raw.sourceW || 0) || 0,
      sourceH:Number(raw.sourceH || 0) || 0
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
        var render = imgFx.render && typeof imgFx.render === "object" ? imgFx.render : {};
        if (t === "image") {
          imgEl.imageCrop = cropObj;
          if (render.scale != null) imgEl.imageScale = Number(render.scale) || imgEl.imageScale;
          if (render.sidePadding != null) imgEl.imageInsetX = Number(render.sidePadding) || 0;
          if (render.offsetX != null) imgEl.imageOffsetX = Number(render.offsetX) || 0;
          if (render.offsetY != null) imgEl.imageOffsetY = Number(render.offsetY) || 0;
        } else if (t === "dialog") {
          imgEl.dialogImageCrop = cropObj;
          if (render.scale != null) imgEl.dialogImageScale = Number(render.scale) || imgEl.dialogImageScale;
          if (render.offsetX != null) imgEl.dialogImageOffsetX = Number(render.offsetX) || 0;
          if (render.offsetY != null) imgEl.dialogImageOffsetY = Number(render.offsetY) || 0;
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

  function pushOverlayItem(overlayItems, data, slot) {
    if (!data || typeof data !== "object") return;
    var nbt = String(data.itemNbt || data.nbt || data.snbt || "").trim();
    var item = String(data.itemId || data.item || data.itemKey || "").trim();
    if (!nbt && !item) item = "minecraft:air";

    var count = parseInt(String(data.itemCount != null ? data.itemCount : (data.count != null ? data.count : 1)), 10);
    if (isNaN(count) || count < 1) count = 1;

    var entry = { slot: slot, count: count };
    if (nbt) entry.nbt = nbt;
    else entry.item = item;
    overlayItems.push(entry);
  }

  function pushCurrencyOverlayItem(overlayItems, data, slot) {
    if (!data || typeof data !== "object") return;
    var nbt = String(data.currencyItemNbt || data.currencyNbt || "").trim();
    var item = String(data.currencyItemId || data.currencyItem || "").trim();
    if (!nbt && !item) return;
    var entry = { slot: slot, count: 1 };
    if (nbt) entry.nbt = nbt;
    else entry.item = item;
    overlayItems.push(entry);
  }

  function choiceHasItemData(data) {
    if (!data || typeof data !== "object") return false;
    if (String(data.itemId || data.item || data.itemKey || "").trim()) return true;
    if (String(data.itemNbt || data.nbt || data.snbt || "").trim()) return true;
    return false;
  }

  function assignShopChoiceItemSlots(list, overlayItems, startSlot, usedSlots) {
    var slot = startSlot;
    if (!Array.isArray(list)) return slot;
    for (var i = 0; i < list.length; i++) {
      var choice = list[i];
      if (!choice || typeof choice !== "object") {
        slot += 1;
        continue;
      }
      if (!choice.data || typeof choice.data !== "object") choice.data = {};
      var explicitSlot = parseInt(String(choice.data.mcSlot != null ? choice.data.mcSlot : ""), 10);
      var hasExplicitSlot = !isNaN(explicitSlot) && explicitSlot >= 0;
      if(!hasExplicitSlot && !choiceHasItemData(choice.data)){
        try{ delete choice.data.mcSlot; }catch(errDel){}
        slot += 1;
        continue;
      }
      var useSlot = hasExplicitSlot ? explicitSlot : slot;
      if(!hasExplicitSlot){
        while(usedSlots[String(useSlot)]) useSlot += 1;
      }
      choice.data.mcSlot = useSlot;
      if(!usedSlots[String(useSlot)]){
        pushOverlayItem(overlayItems, choice.data, useSlot);
        usedSlots[String(useSlot)] = true;
      }
      var nextSlot = hasExplicitSlot ? slot : useSlot + 1;
      if(hasExplicitSlot && useSlot >= nextSlot) nextSlot = useSlot + 1;
      var currencyItem = String(choice.data.currencyItemId || choice.data.currencyItem || "").trim();
      if(currencyItem){
        var explicitCurrencySlot = parseInt(String(choice.data.currencyMcSlot != null ? choice.data.currencyMcSlot : ""), 10);
        var hasExplicitCurrencySlot = !isNaN(explicitCurrencySlot) && explicitCurrencySlot >= 0;
        var currencySlot = hasExplicitCurrencySlot ? explicitCurrencySlot : nextSlot;
        if(!hasExplicitCurrencySlot){
          while(usedSlots[String(currencySlot)]) currencySlot += 1;
        }
        choice.data.currencyMcSlot = currencySlot;
        if(!usedSlots[String(currencySlot)]){
          pushCurrencyOverlayItem(overlayItems, choice.data, currencySlot);
          usedSlots[String(currencySlot)] = true;
        }
        if(currencySlot >= nextSlot) nextSlot = currencySlot + 1;
      }
      slot = nextSlot;
    }
    return slot;
  }

  function pushPrebuiltOverlayItem(overlayItems, entry, usedSlots) {
    if(!entry || typeof entry !== "object") return;
    var slot = parseInt(String(entry.slot != null ? entry.slot : ""), 10);
    if(isNaN(slot) || slot < 0) return;
    if(usedSlots[String(slot)]) return;
    var out = { slot: slot };
    if(entry.nbt != null && String(entry.nbt || "").trim()) out.nbt = String(entry.nbt || "");
    else out.item = String(entry.item || entry.itemId || "minecraft:air");
    var count = parseInt(String(entry.count != null ? entry.count : 1), 10);
    out.count = isNaN(count) || count < 1 ? 1 : count;
    overlayItems.push(out);
    usedSlots[String(slot)] = true;
  }

  function pushPrebuiltShopOverlayItems(shop, overlayItems, usedSlots) {
    var list = shop && Array.isArray(shop.overlayItems) ? shop.overlayItems : [];
    for(var i=0;i<list.length;i++){
      pushPrebuiltOverlayItem(overlayItems, list[i], usedSlots);
    }
  }

  function buildOverlayItems(bindings, options) {
    var base = 0;
    try{
      if(typeof util_toInt === "function") base = util_toInt(options && options.itemSlotBase, 0);
    }catch(err0){ base = 0; }
    if (base < 0) base = 0;

    var overlayItems = [];
    var shop = bindings && bindings.shop && typeof bindings.shop === "object" ? bindings.shop : null;
    var choices = shop && shop.choices && typeof shop.choices === "object" ? shop.choices : null;
    if (!choices) return { overlayItems: overlayItems };

    var slot = base;
    var usedSlots = {};
    pushPrebuiltShopOverlayItems(shop, overlayItems, usedSlots);
    slot = assignShopChoiceItemSlots(choices.item_slots, overlayItems, slot, usedSlots);
    slot = assignShopChoiceItemSlots(choices.selected_slot, overlayItems, slot, usedSlots);
    return { overlayItems: overlayItems };
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
      if (String(item.type || "").toLowerCase() === "choice") {
        var role = String(item.shopRole || "").toLowerCase();
        if (role === "item_slots" || role === "selected_slot") {
          if (item.choiceItemRenderScale == null) item.choiceItemRenderScale = 100;
          if (item.choiceItemRenderOffsetX == null) item.choiceItemRenderOffsetX = 0;
          if (item.choiceItemRenderOffsetY == null) item.choiceItemRenderOffsetY = 0;
        }
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
    try{ speakerName = translateNpcNameForPlayer(ctx.player, String(ctx && ctx.npc && ctx.npc.display && typeof ctx.npc.display.getName === "function" ? ctx.npc.display.getName() : "")); }catch(errS0){ speakerName = ""; }
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
    var itemOverlay = buildOverlayItems(bindings, options);
    return {
      __overlayName: OVERLAY_NAME,
      __runtimeOwner: String((options && options.runtimeOwner) || ""),
      sessionId: String((options && options.sessionId) || ""),
      speaker: speakerName,
      gui: gui,
      bindings: bindings,
      entitySlots: overlay.entitySlots,
      overlayEntities: overlay.overlayEntities,
      overlayItems: itemOverlay.overlayItems
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
      if(options.skipPreClose !== true){
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
      }
      if (ctx && ctx.event) {
        try {
          var h0 = cnpcext.openHtmlGui(ctx.event, htmlPath, 0, 0, JSON.stringify(initData));
          if (h0 != null) return h0;
        } catch (eOpen0) {
        }
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














