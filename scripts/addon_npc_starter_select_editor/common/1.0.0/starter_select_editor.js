var StarterSelectEditorAPI = Java.type("noppes.npcs.api.NpcAPI").Instance()

var StarterSelectEditorModule = (function(){
  var ADDON_ID = "dc_starter_select_editor"
  var HTML_PATH = "html/dc_util/starter_select_editor.html"
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

  function readStarter(path){
    var file = resolveFile(path)
    var json
    if(!file || !file.exists()) throw new Error("Starter JSON not found: " + normalizeStarterPath(path))
    json = JSON.parse(readTextFile(file))
    return { file:file, json:normalizeStarterJson(json) }
  }

  function saveStarter(session){
    writeTextFile(session.file, JSON.stringify(session.json, null, 2))
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
    out.commandName = String(src.commandName || src.command || "pokegiveother")
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
      cnpcext.getClientBridge(player.getMCEntity()).sendToBrowser(String(eventName), stringifyBrowserPayload(obj))
    }catch(err){
      try{ player.message("Starter editor browser send failed: " + String(err)) }catch(ignore){}
    }
  }

  function closeHtml(player){
    var br
    try{
      br = cnpcext.getClientBridge(player.getMCEntity())
      if(br && typeof br.closeHtmlGui === "function") br.closeHtmlGui()
    }catch(err){}
  }

  function buildInitData(session){
    return {
      ok:true,
      addonId:ADDON_ID,
      jsonPath:session.jsonPath,
      fileName:String(session.file && session.file.getName ? session.file.getName() : session.jsonPath),
      json:session.json
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
    payload = stringifyBrowserPayload(buildInitData(session))
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
      if(name !== "starterEditorClose") pushBrowser(player, "starterEditorResult", { ok:false, error:"Starter editor session expired." })
      return
    }
    if(name === "starterEditorReady"){
      pushBrowser(player, "starterEditorState", buildInitData(session))
      return
    }
    if(name === "starterEditorSave"){
      try{
        session.json = normalizeStarterJson(data.json)
        saveStarter(session)
        pushBrowser(player, "starterEditorResult", { ok:true, action:"save", message:"Saved " + session.jsonPath })
        pushBrowser(player, "starterEditorState", buildInitData(session))
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
