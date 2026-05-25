var StarterSelectEditorAPI = Java.type("noppes.npcs.api.NpcAPI").Instance()

var StarterSelectEditorModule = (function(){
  var ADDON_ID = "dc_starter_select_editor"
  var HTML_PATH = "html/addon/starter_select_editor.html"
  var sessions = {}

  function key(player){
    try{ return String(player.getUUID()) }catch(err){}
    try{ return String(player.getName()) }catch(err2){}
    return "player"
  }

  function toInt(value, fallback){
    var n = parseInt(String(value), 10)
    return isNaN(n) ? fallback : n
  }

  function cleanPath(path){
    var p = String(path || "").replace(/\\/g, "/").replace(/^\s+|\s+$/g, "")
    while(p.charAt(0) === "/") p = p.substring(1)
    return p.replace(/\/+/g, "/")
  }

  function cleanToken(value){
    return String(value || "").replace(/[^A-Za-z0-9_:-]/g, "").toLowerCase()
  }

  function normalizeStarterPath(path){
    var p = cleanPath(path)
    if(!p) return ""
    if(p.indexOf("customnpcs/") === 0) return p
    if(p.indexOf("dc_data/") === 0) return "customnpcs/" + p
    if(p.indexOf("dc_starters/") === 0) return "customnpcs/dc_data/" + p
    return "customnpcs/dc_data/dc_starters/" + (/\.json$/i.test(p) ? p : p + ".json")
  }

  function resolveFile(path){
    var normalized = normalizeStarterPath(path)
    if(typeof cfg_chk_resolveFile === "function") return cfg_chk_resolveFile(normalized, null)
    var File = Java.type("java.io.File")
    return new File(normalized)
  }

  function readTextFile(file){
    var Files = Java.type("java.nio.file.Files")
    var StandardCharsets = Java.type("java.nio.charset.StandardCharsets")
    var raw = new java.lang.String(Files.readAllBytes(file.toPath()), StandardCharsets.UTF_8)
    raw = String(raw || "")
    if(raw.length && raw.charCodeAt(0) === 65279) raw = raw.substring(1)
    return raw
  }

  function writeTextFile(file, text){
    var Files = Java.type("java.nio.file.Files")
    var StandardCharsets = Java.type("java.nio.charset.StandardCharsets")
    var JString = Java.type("java.lang.String")
    var parent = file.getParentFile()
    if(parent && !parent.exists()) parent.mkdirs()
    Files.write(file.toPath(), new JString(String(text || "")).getBytes(StandardCharsets.UTF_8))
  }

  function logInfo(message){
    try{
      Java.type("java.lang.System").out.println("[starter_select_editor] " + String(message))
    }catch(err){}
  }

  function choiceSummary(json){
    var list = json && json.choices instanceof Array ? json.choices : []
    var out = []
    var i
    for(i = 0; i < list.length; i++) out.push(String((list[i] || {}).species || ""))
    return out.join(",")
  }

  function readStarter(path){
    var file = resolveFile(path)
    var json
    if(!file || !file.exists()) throw new Error("Starter JSON not found: " + normalizeStarterPath(path))
    json = JSON.parse(readTextFile(file))
    return { file:file, json:normalizeStarterJson(json) }
  }

  function saveStarter(session){
    var text = JSON.stringify(session.json, null, 2)
    var length = 0
    writeTextFile(session.file, text)
    try{ length = session.file && session.file.length ? session.file.length() : text.length }catch(errLen){ length = text.length }
    logInfo("saved path=" + String(session.file && session.file.getPath ? session.file.getPath() : session.jsonPath) + " bytes=" + length + " choices=" + choiceSummary(session.json))
  }

  function statBlock(){
    return { hp:0, atk:0, def:0, spatk:0, spdef:0, speed:0 }
  }

  function normalizeStats(raw){
    raw = raw && typeof raw === "object" ? raw : {}
    return {
      hp:Math.max(0, toInt(raw.hp, 0)),
      atk:Math.max(0, toInt(raw.atk, 0)),
      def:Math.max(0, toInt(raw.def, 0)),
      spatk:Math.max(0, toInt(raw.spatk, 0)),
      spdef:Math.max(0, toInt(raw.spdef, 0)),
      speed:Math.max(0, toInt(raw.speed, 0))
    }
  }

  function normalizeMoves(raw){
    var arr = raw instanceof Array ? raw : []
    var out = ["", "", "", ""]
    var i
    for(i = 0; i < 4; i++) out[i] = String(arr[i] || "")
    return out
  }

  function defaultChoice(){
    return {
      id:"sylveon",
      label:"Sylveon",
      species:"sylveon",
      level:5,
      gender:"random",
      nature:"",
      ability:"",
      form:"",
      shiny:false,
      moveset:["", "", "", ""],
      ivs:statBlock(),
      evs:statBlock()
    }
  }

  function normalizeChoice(raw, index){
    var c = raw && typeof raw === "object" ? raw : {}
    var species = cleanToken(c.species || c.pokemon || c.key || c.id || "sylveon") || "sylveon"
    var label = String(c.label || c.name || species)
    var id = cleanToken(c.id || species) || species
    return {
      id:id,
      label:label,
      species:species,
      pokemon:species,
      level:Math.max(1, Math.min(100, toInt(c.level || c.lvl, 5))),
      gender:cleanToken(c.gender || ""),
      nature:cleanToken(c.nature || ""),
      ability:String(c.ability || ""),
      form:String(c.form || ""),
      shiny:c.shiny === true,
      moveset:normalizeMoves(c.moveset || c.moves),
      ivs:normalizeStats(c.ivs),
      evs:normalizeStats(c.evs)
    }
  }

  function normalizeStarterJson(raw){
    var src = raw && typeof raw === "object" ? raw : {}
    var list = src.choices instanceof Array ? src.choices : (src.starters instanceof Array ? src.starters : (src.pokemon instanceof Array ? src.pokemon : []))
    var out = {}
    var i
    out.id = String(src.id || "starter_list")
    out.title = String(src.title || "Starter Pokemon Selection")
    out.subtitle = String(src.subtitle || "")
    out.once = src.once === true
    out.claimKey = String(src.claimKey || src.id || "starter_list")
    out.commandName = "pokegiveother"
    out.alreadyClaimedMessage = String(src.alreadyClaimedMessage || "")
    out.choices = []
    for(i = 0; i < list.length; i++) out.choices.push(normalizeChoice(list[i], i))
    if(!out.choices.length) out.choices.push(defaultChoice())
    return out
  }

  function stringifyBrowserPayload(obj){
    return escapeBrowserJson(JSON.stringify(obj || {}))
  }

  function escapeBrowserJson(json){
    json = String(json == null ? "{}" : json)
    return json.replace(/[\u007f-\uffff]/g, function(ch){
      var code = ch.charCodeAt(0).toString(16)
      while(code.length < 4) code = "0" + code
      return "\\u" + code
    })
  }

  function parsePayload(raw){
    if(!raw) return {}
    if(typeof raw === "string"){
      try{ return JSON.parse(String(raw)) }catch(err){ return {} }
    }
    return raw && typeof raw === "object" ? raw : {}
  }

  function pushBrowser(player, eventName, obj){
    try{
      var br = cnpcext.getClientBridge(player.getMCEntity())
      var payload = stringifyBrowserPayload(obj)
      if(!br || typeof br.sendToBrowser !== "function") return false
      try{
        br.sendToBrowser(player.getMCEntity(), String(eventName), payload)
        return true
      }catch(errEntity){}
      br.sendToBrowser(String(eventName), payload)
      return true
    }catch(err){
      try{ player.message("Starter editor browser send failed: " + String(err)) }catch(ignore){}
    }
    return false
  }

  function closeHtml(player){
    var br
    try{
      br = cnpcext.getClientBridge(player.getMCEntity())
      if(br && typeof br.closeHtmlGui === "function"){
        try{
          br.closeHtmlGui(player.getMCEntity())
          return true
        }catch(errEntity){}
        br.closeHtmlGui()
        return true
      }
    }catch(err){}
    try{
      if(player && typeof player.closeGui === "function"){
        player.closeGui()
        return true
      }
    }catch(errClose){}
    return false
  }

  function normalizeLocaleValue(value){
    var locale = String(value || "en_us").toLowerCase().replace("-", "_")
    if(!/^[a-z]{2,3}_[a-z0-9_]+$/.test(locale)) return "en_us"
    return locale
  }

  function cleanLocaleValue(value){
    var locale = String(value || "").toLowerCase().replace("-", "_")
    if(!/^[a-z]{2,3}_[a-z0-9_]+$/.test(locale)) return ""
    return locale
  }

  function getEditorLocale(player){
    try{
      if(typeof getStoredLocalePreference === "function"){
        var pref = cleanLocaleValue(getStoredLocalePreference(player))
        if(pref) return pref
      }
    }catch(errPref){}
    try{
      if(typeof getPlayerLocale === "function") return normalizeLocaleValue(getPlayerLocale(player))
    }catch(errLocale){}
    return "en_us"
  }

  function findStarterLangRoots(){
    var File = Java.type("java.io.File")
    return [
      new File("customnpcs/dc_data/dc_lang/addon_npc_starter_select_editor"),
      new File("minecraft/customnpcs/dc_data/dc_lang/addon_npc_starter_select_editor"),
      new File("./customnpcs/dc_data/dc_lang/addon_npc_starter_select_editor"),
      new File("./minecraft/customnpcs/dc_data/dc_lang/addon_npc_starter_select_editor")
    ]
  }

  function mergeMessages(target, source){
    var k
    if(!source) return
    for(k in source) if(source.hasOwnProperty(k)) target[k] = source[k]
  }

  function loadJsonFileIfExists(file){
    if(!file || !file.isFile()) return null
    return JSON.parse(readTextFile(file))
  }

  function loadStarterEditorI18n(locale){
    var roots = findStarterLangRoots()
    var messages = {}
    var normalized = normalizeLocaleValue(locale)
    var queue = ["en_us"]
    var File = Java.type("java.io.File")
    var i, j, file, loaded
    if(normalized !== "en_us") queue.push(normalized)
    for(i = 0; i < queue.length; i++){
      for(j = 0; j < roots.length; j++){
        file = new File(roots[j], queue[i] + ".json")
        try{
          loaded = loadJsonFileIfExists(file)
          if(loaded) mergeMessages(messages, loaded)
        }catch(err){}
      }
    }
    return { locale:normalized, messages:messages }
  }

  function buildEditorI18n(player){
    var locale = getEditorLocale(player)
    var base = { locale:locale, messages:{} }
    var addon = loadStarterEditorI18n(locale)
    try{
      if(typeof loadNpcEditorI18n === "function"){
        base = loadNpcEditorI18n(locale)
        if(!base || typeof base !== "object") base = { locale:locale, messages:{} }
      }
    }catch(errBase){}
    base.locale = normalizeLocaleValue(base.locale || locale)
    base.messages = base.messages || {}
    mergeMessages(base.messages, addon.messages)
    return base
  }

  function buildInitData(session, player){
    var i18n = buildEditorI18n(player)
    return {
      ok:true,
      addonId:ADDON_ID,
      jsonPath:session.jsonPath,
      fileName:String(session.file && session.file.getName ? session.file.getName() : session.jsonPath),
      json:session.json,
      locale:i18n.locale,
      i18n:{ locale:i18n.locale, messages:i18n.messages || {}, error:i18n.error || "" }
    }
  }

  function open(ctx){
    var player = ctx && ctx.player
    var path = ctx ? cleanPath(ctx.jsonPath || "") : ""
    var loaded, session, payload
    if(!player) return false
    if(!path){
      player.message("Starter JSON path is empty.")
      return false
    }
    loaded = readStarter(path)
    session = {
      npc:ctx.npc || null,
      jsonPath:path,
      file:loaded.file,
      json:loaded.json
    }
    sessions[key(player)] = session
    if(typeof cnpcext === "undefined" || !cnpcext || typeof cnpcext.openHtmlGui !== "function"){
      player.message("CNPCExtended HTML GUI is required.")
      return false
    }
    payload = stringifyBrowserPayload(buildInitData(session, player))
    cnpcext.openHtmlGui(player, HTML_PATH, 0, 0, payload)
    return true
  }

  function handleHtmlEvent(e){
    var name = String(e && e.eventName || "")
    var player = e && e.player
    var session, data
    if(name.indexOf("starterEditor") !== 0) return
    if(!player) return
    session = sessions[key(player)]
    data = parsePayload(e.data)
    if(!session){
      if(name === "starterEditorClose"){
        closeHtml(player)
        return
      }
      if(name === "starterEditorBack"){
        closeHtml(player)
        if(typeof tryOpenEditor === "function") tryOpenEditor(player)
        return
      }
      pushBrowser(player, "starterEditorResult", { ok:false, action:name, error:"Starter editor session expired." })
      return
    }
    if(name === "starterEditorReady"){
      pushBrowser(player, "starterEditorState", buildInitData(session, player))
      return
    }
    if(name === "starterEditorSave"){
      try{
        session.json = normalizeStarterJson(data.json)
        logInfo("save event player=" + String(player.getName ? player.getName() : "") + " jsonPath=" + session.jsonPath + " choices=" + choiceSummary(session.json))
        saveStarter(session)
        pushBrowser(player, "starterEditorResult", { ok:true, action:"save", path:session.jsonPath })
        pushBrowser(player, "starterEditorState", buildInitData(session, player))
      }catch(errSave){
        pushBrowser(player, "starterEditorResult", { ok:false, action:"save", error:String(errSave) })
      }
      return
    }
    if(name === "starterEditorBack"){
      delete sessions[key(player)]
      closeHtml(player)
      if(typeof tryOpenEditor === "function") tryOpenEditor(player)
      return
    }
    if(name === "starterEditorClose"){
      delete sessions[key(player)]
      closeHtml(player)
      return
    }
  }

  function register(){
    var spec = {
      id:ADDON_ID,
      name:"Starter Pokemon List Editor",
      description:"Edit the selected starter Pokemon JSON list for dc_starter NPCs.",
      targetPrefix:"dc_starter",
      defaultEnabled:true,
      editLabel:"Edit Pokemon",
      open:open,
      htmlGuiEvent:handleHtmlEvent
    }
    if(typeof dc_npc_editor_registerAddon === "function"){
      dc_npc_editor_registerAddon(spec)
      return
    }
    if(typeof DC_NPC_EDITOR_PENDING_ADDONS === "undefined" || !DC_NPC_EDITOR_PENDING_ADDONS || typeof DC_NPC_EDITOR_PENDING_ADDONS.length !== "number" || typeof DC_NPC_EDITOR_PENDING_ADDONS.push !== "function") DC_NPC_EDITOR_PENDING_ADDONS = []
    DC_NPC_EDITOR_PENDING_ADDONS.push(spec)
  }

  register()

  return {
    ADDON_ID:ADDON_ID,
    open:open,
    htmlGuiEvent:handleHtmlEvent
  }
})()

var __starterSelectEditorPreviousHtmlGuiEvent = (typeof htmlGuiEvent === "function" && !htmlGuiEvent.__starterSelectEditorBridge) ? htmlGuiEvent : null
htmlGuiEvent = function(e){
  var name = String(e && e.eventName || "")
  if(name.indexOf("starterEditor") === 0) return StarterSelectEditorModule.htmlGuiEvent(e)
  if(typeof __starterSelectEditorPreviousHtmlGuiEvent === "function") return __starterSelectEditorPreviousHtmlGuiEvent(e)
}
htmlGuiEvent.__starterSelectEditorBridge = true
