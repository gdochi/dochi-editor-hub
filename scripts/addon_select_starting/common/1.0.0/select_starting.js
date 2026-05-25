var StarterSelectAPI = Java.type("noppes.npcs.api.NpcAPI").Instance()
var StarterSelectPokemonSpecies = Java.type("com.cobblemon.mod.common.api.pokemon.PokemonSpecies")

var DcStarterSelectConfig = {
  enabled:true,
  starterJsonPath:"sample_starters.json",
  htmlPath:"html/dc_util/select_starting.html",
  commandName:"pokegiveother",
  directInteractWhenDialogue:false
}

var StarterSelectionModule = (function(){
  var OVERLAY_NAME = "starter_selection"
  var OVERLAY_HTML = "html/dc_util/select_starting.html"
  var DEFAULT_POKEMON = "sylveon"
  var DEFAULT_LEVEL = 5
  var DIRECT_PATH_KEY = "dc_starter_json_path"
  var SELECTION_KEY = "npc_browser_dc_selection"
  var LOCK_KEY = "npc_browser_dochi_lock"
  var CLAIM_PREFIX = "dc_starter_claimed:"
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

  function cleanPokemonName(value){
    var name = String(value || DEFAULT_POKEMON).replace(/[^A-Za-z0-9_:-]/g, "").toLowerCase()
    return name || DEFAULT_POKEMON
  }

  function cleanToken(value){
    return String(value || "").replace(/[^A-Za-z0-9_:-]/g, "").toLowerCase()
  }

  function readStore(store, name){
    try{
      if(!store || !name) return ""
      var value = store.get(String(name))
      if(value == null) return ""
      return String(value)
    }catch(err){
      return ""
    }
  }

  function readSelectionPath(raw){
    var obj, prefix, path, entries, i, entry
    try{
      if(!raw) return ""
      obj = JSON.parse(String(raw))
      entries = obj && obj.entries instanceof Array ? obj.entries : []
      for(i = 0; i < entries.length; i++){
        entry = entries[i] || {}
        if(String(entry.prefix || "") !== "dc_starter") continue
        path = cleanPath(entry.jsonPath || "")
        if(path) return path
      }
      prefix = String(obj.prefix || "")
      if(prefix && prefix !== "dc_starter") return ""
      return cleanPath(obj.jsonPath || "")
    }catch(err){
      return ""
    }
  }

  function selectionHasDialogueStarter(raw){
    var obj, entries, i, prefix, hasDialogue = false, hasStarter = false
    try{
      if(!raw) return false
      obj = JSON.parse(String(raw))
      entries = obj && obj.entries instanceof Array ? obj.entries : []
      for(i = 0; i < entries.length; i++){
        prefix = String((entries[i] || {}).prefix || "")
        if(prefix === "dc_dialogue") hasDialogue = true
        if(prefix === "dc_starter") hasStarter = true
      }
      return hasDialogue && hasStarter
    }catch(err){
      return false
    }
  }

  function shouldSkipDirectInteract(npc){
    var store
    if(DcStarterSelectConfig.directInteractWhenDialogue === true) return false
    try{
      if(!npc || typeof npc.getStoreddata !== "function") return false
      store = npc.getStoreddata()
    }catch(err0){
      return false
    }
    if(selectionHasDialogueStarter(readStore(store, SELECTION_KEY))) return true
    if(selectionHasDialogueStarter(readStore(store, LOCK_KEY))) return true
    return false
  }

  function getStoredStarterPath(npc){
    var store, path
    try{
      if(!npc || typeof npc.getStoreddata !== "function") return ""
      store = npc.getStoreddata()
    }catch(err0){
      return ""
    }
    path = cleanPath(readStore(store, DIRECT_PATH_KEY))
    if(path) return path
    path = readSelectionPath(readStore(store, SELECTION_KEY))
    if(path) return path
    path = readSelectionPath(readStore(store, LOCK_KEY))
    if(path) return path
    return ""
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
    if(!normalized) return null
    if(typeof cfg_chk_resolveFile === "function") return cfg_chk_resolveFile(normalized, null)
    var File = Java.type("java.io.File")
    return new File(normalized)
  }

  function readTextFile(file){
    if(typeof cfg_chk_readTextFile === "function") return String(cfg_chk_readTextFile(file))
    var Files = Java.type("java.nio.file.Files")
    var StandardCharsets = Java.type("java.nio.charset.StandardCharsets")
    var raw = new java.lang.String(Files.readAllBytes(file.toPath()), StandardCharsets.UTF_8)
    raw = String(raw || "")
    if(raw.length && raw.charCodeAt(0) === 65279) raw = raw.substring(1)
    return raw
  }

  function readStarterConfig(path){
    var file = resolveFile(path)
    var payload
    if(!file || !file.exists()) throw new Error("Starter JSON not found: " + normalizeStarterPath(path))
    if(typeof cfg_chk_readJsonFile === "function"){
      payload = cfg_chk_readJsonFile(file)
      return payload && payload.json ? payload.json : {}
    }
    return JSON.parse(readTextFile(file))
  }

  function getContext(target, maybeNpc, maybeOpts){
    if(target && target.player){
      return { player:target.player, npc:target.npc || maybeNpc || null, event:target, opts:maybeOpts || maybeNpc || {} }
    }
    if(target && typeof target.getMCEntity === "function"){
      return { player:target, npc:maybeNpc || null, event:null, opts:maybeOpts || {} }
    }
    return null
  }

  function starterPathFromOpts(opts, npc){
    var path = cleanPath(opts.starterJsonPath || opts.jsonPath || opts.path || opts.filePath || "")
    if(path) return path
    path = getStoredStarterPath(npc)
    if(path) return path
    return cleanPath(DcStarterSelectConfig.starterJsonPath || "")
  }

  function getTypes(name){
    var species, types
    try{
      species = StarterSelectPokemonSpecies.getByName(cleanPokemonName(name))
      if(!species) return { type1:"", type2:"" }
      types = species.getStandardForm().getTypes()
      return {
        type1:types.size() > 0 ? String(types.get(0).getName()).toLowerCase() : "",
        type2:types.size() > 1 ? String(types.get(1).getName()).toLowerCase() : ""
      }
    }catch(err){
      return { type1:"", type2:"" }
    }
  }

  function pokeModelNBT(name){
    return '{id:"cobblemon:pokemon_model",count:1,components:{"cobblemon:pokemon_item":{species:"cobblemon:' + cleanPokemonName(name) + '",aspects:[]}}}'
  }

  function defaultChoice(){
    return {
      id:DEFAULT_POKEMON,
      label:DEFAULT_POKEMON,
      species:DEFAULT_POKEMON,
      pokemon:DEFAULT_POKEMON,
      level:DEFAULT_LEVEL,
      gender:"",
      nature:"",
      ability:"",
      form:"",
      shiny:false,
      types:[],
      moveset:["", "", "", ""],
      ivs:{ hp:0, atk:0, def:0, spatk:0, spdef:0, speed:0 },
      evs:{ hp:0, atk:0, def:0, spatk:0, spdef:0, speed:0 }
    }
  }

  function copyStats(raw, maxValue){
    var out = { hp:0, atk:0, def:0, spatk:0, spdef:0, speed:0 }
    var src = raw && typeof raw === "object" ? raw : {}
    out.hp = Math.max(0, Math.min(maxValue, toInt(src.hp, 0)))
    out.atk = Math.max(0, Math.min(maxValue, toInt(src.atk, 0)))
    out.def = Math.max(0, Math.min(maxValue, toInt(src.def, 0)))
    out.spatk = Math.max(0, Math.min(maxValue, toInt(src.spatk, 0)))
    out.spdef = Math.max(0, Math.min(maxValue, toInt(src.spdef, 0)))
    out.speed = Math.max(0, Math.min(maxValue, toInt(src.speed, 0)))
    return out
  }

  function normalizeChoice(raw, index){
    var src = raw && typeof raw === "object" ? raw : { species:raw }
    var choice = defaultChoice()
    var species = cleanPokemonName(src.species || src.pokemon || src.key || src.id || DEFAULT_POKEMON)
    var label = String(src.label || src.name || species)
    var types = getTypes(species)
    var moves = src.moveset instanceof Array ? src.moveset : (src.moves instanceof Array ? src.moves : [])
    choice.id = String(src.id || species || ("starter_" + index))
    choice.label = label || species
    choice.species = species
    choice.pokemon = species
    choice.level = Math.max(1, Math.min(100, toInt(src.level != null ? src.level : src.lvl, DEFAULT_LEVEL)))
    choice.gender = cleanToken(src.gender)
    choice.nature = cleanToken(src.nature)
    choice.ability = cleanToken(src.ability)
    choice.form = cleanToken(src.form)
    choice.shiny = src.shiny === true || String(src.shiny || "").toLowerCase() === "true"
    choice.types = []
    if(src.types instanceof Array){
      for(var i = 0; i < src.types.length; i++){
        if(cleanToken(src.types[i])) choice.types.push(cleanToken(src.types[i]))
      }
    }
    if(!choice.types.length && types.type1) choice.types.push(types.type1)
    if(types.type2) choice.types.push(types.type2)
    choice.type1 = choice.types.length > 0 ? choice.types[0] : types.type1
    choice.type2 = choice.types.length > 1 ? choice.types[1] : types.type2
    choice.moveset = ["", "", "", ""]
    for(i = 0; i < 4 && i < moves.length; i++) choice.moveset[i] = cleanToken(moves[i])
    choice.ivs = copyStats(src.ivs, 31)
    choice.evs = copyStats(src.evs, 252)
    choice.slot = index
    choice.item = "cobblemon:pokemon_model"
    choice.count = 1
    choice.scale = 4.8
    choice.name = species
    choice.nbt = pokeModelNBT(species)
    return choice
  }

  function normalizeStarterConfig(raw){
    var cfg = raw && typeof raw === "object" ? raw : {}
    var list = cfg.choices instanceof Array ? cfg.choices : (cfg.starters instanceof Array ? cfg.starters : (cfg.pokemon instanceof Array ? cfg.pokemon : []))
    var out = {
      id:String(cfg.id || cfg.key || "starter"),
      title:String(cfg.title || cfg.name || "Choose Your Starter"),
      subtitle:String(cfg.subtitle || ""),
      once:cfg.once === true || String(cfg.once || "").toLowerCase() === "true",
      claimKey:String(cfg.claimKey || cfg.claim_key || cfg.id || "default"),
      commandName:String(cfg.commandName || cfg.command || DcStarterSelectConfig.commandName || "pokegiveother").replace(/^\/+/, ""),
      choices:[]
    }
    if(!list.length) list = [defaultChoice()]
    for(var i = 0; i < list.length; i++) out.choices.push(normalizeChoice(list[i], i))
    return out
  }

  function isClaimed(player, cfg){
    var value
    if(!cfg.once) return false
    try{
      value = player.getStoreddata().get(CLAIM_PREFIX + cfg.claimKey)
      return value != null && String(value) !== ""
    }catch(err){
      return false
    }
  }

  function markClaimed(player, cfg, choice){
    if(!cfg.once) return
    try{
      player.getStoreddata().put(CLAIM_PREFIX + cfg.claimKey, JSON.stringify({
        species:choice.species,
        level:choice.level,
        time:String(new Date())
      }))
    }catch(err){}
  }

  function buildInitData(cfg){
    var items = []
    for(var i = 0; i < cfg.choices.length; i++){
      items.push({
        slot:i,
        item:"cobblemon:pokemon_model",
        count:1,
        scale:4.8,
        name:cfg.choices[i].species,
        type1:cfg.choices[i].type1,
        type2:cfg.choices[i].type2,
        nbt:cfg.choices[i].nbt
      })
    }
    return {
      overlayName:OVERLAY_NAME,
      title:cfg.title,
      subtitle:cfg.subtitle,
      once:cfg.once,
      choices:cfg.choices,
      overlayItems:items
    }
  }

  function playCry(player, pokemon, volume){
    if(!player || typeof player.playSound !== "function") return false
    try{
      player.playSound("cobblemon:pokemon." + cleanPokemonName(pokemon) + ".cry", volume || 0.5, 1)
      return true
    }catch(err){
      return false
    }
  }

  function findChoice(session, payload){
    var wanted = String(payload.choiceId || payload.id || "").toLowerCase()
    var pokemon = cleanPokemonName(payload.pokemon || payload.species || "")
    var i, choice
    if(!session || !session.config) return null
    for(i = 0; i < session.config.choices.length; i++){
      choice = session.config.choices[i]
      if(wanted && String(choice.id || "").toLowerCase() === wanted) return choice
      if(pokemon && choice.species === pokemon) return choice
    }
    return session.config.choices.length ? session.config.choices[0] : null
  }

  function buildGiveCommand(player, choice, cfg){
    var playerName = String(player.getName())
    var attrs = []
    var cmd = String(DcStarterSelectConfig.commandName || "pokegiveother").replace(/^\/+/, "")
    attrs.push("lvl=" + Math.max(1, Math.min(100, toInt(choice.level, DEFAULT_LEVEL))))
    if(choice.shiny === true) attrs.push("shiny")
    if(choice.gender) attrs.push("gender=" + choice.gender)
    if(choice.nature) attrs.push("nature=" + choice.nature)
    if(choice.ability) attrs.push("ability=" + choice.ability)
    if(choice.form) attrs.push("form=" + choice.form)
    return "/" + cmd + " " + playerName + " " + cleanPokemonName(choice.species) + " " + attrs.join(" ")
  }

  function giveStarter(player, npc, choice, cfg){
    StarterSelectAPI.executeCommand(player.getWorld(), buildGiveCommand(player, choice, cfg))
    return true
  }

  function open(target, maybeNpc, maybeOpts){
    var ctx = getContext(target, maybeNpc, maybeOpts)
    var opts, path, rawCfg, cfg, initData, handle
    if(!DcStarterSelectConfig.enabled) return null
    if(!ctx || !ctx.player) return null
    opts = ctx.opts && typeof ctx.opts === "object" ? ctx.opts : {}
    path = starterPathFromOpts(opts, ctx.npc)
    rawCfg = readStarterConfig(path)
    cfg = normalizeStarterConfig(rawCfg)
    if(isClaimed(ctx.player, cfg)){
      ctx.player.message(String(rawCfg.alreadyClaimedMessage || "You already selected a starter."))
      return null
    }
    try{
      if(typeof cnpcext === "undefined" || !cnpcext || typeof cnpcext.openHtmlGui !== "function") return null
      initData = JSON.stringify(buildInitData(cfg))
      sessions[key(ctx.player)] = {
        npc:ctx.npc,
        path:path,
        config:cfg,
        source:String(opts.source || "npc_interact")
      }
      handle = cnpcext.openHtmlGui(ctx.player, String(opts.htmlPath || opts.overlayHtml || DcStarterSelectConfig.htmlPath || OVERLAY_HTML), 0.5, 0.5, initData)
      if(cfg.choices.length === 1) playCry(ctx.player, cfg.choices[0].species, 0.6)
      return handle
    }catch(err){
      try{ ctx.player.message("Starter select failed: " + String(err)) }catch(ignore){}
      return null
    }
  }

  function parsePayload(raw){
    if(!raw) return {}
    if(typeof raw === "string"){
      try{ return JSON.parse(String(raw)) }catch(err){ return {} }
    }
    return raw && typeof raw === "object" ? raw : {}
  }

  function handleHtmlEvent(e){
    var payload, overlay, session, choice
    if(!e || !e.player) return
    payload = parsePayload(e.data)
    overlay = String(payload.overlayName || payload.__overlayName || "")
    if(overlay && overlay !== OVERLAY_NAME) return
    session = sessions[key(e.player)]
    if(e.eventName === "pokeCry"){
      playCry(e.player, payload.pokemon || payload.species || DEFAULT_POKEMON, 0.4)
      return
    }
    if(e.eventName === "cancel"){
      delete sessions[key(e.player)]
      return
    }
    if(e.eventName === "select"){
      if(!session || !session.config) return
      choice = findChoice(session, payload)
      if(!choice) return
      if(isClaimed(e.player, session.config)){
        e.player.message("You already selected a starter.")
        delete sessions[key(e.player)]
        return
      }
      giveStarter(e.player, session.npc, choice, session.config)
      markClaimed(e.player, session.config, choice)
      e.player.message("You selected: " + choice.species)
      delete sessions[key(e.player)]
      return
    }
  }

  function triggerInteract(e){
    if(shouldSkipDirectInteract(e && e.npc)) return
    return open(e, null, { source:"npc_interact" })
  }

  function openFromDialogue(e, opts){
    opts = opts && typeof opts === "object" ? opts : {}
    opts.source = "dialogue"
    return open(e, null, opts)
  }

  function module(){
    return {
      events:{
        interact:triggerInteract,
        htmlGuiEvent:function(e){ handleHtmlEvent(e) }
      }
    }
  }

  if(typeof NpcEventModule !== "undefined" && NpcEventModule && typeof NpcEventModule.registerModule === "function"){
    NpcEventModule.registerModule("dc_starter_select", module())
  }else{
    if(typeof __DcNpcEventPendingModules === "undefined" || !__DcNpcEventPendingModules) var __DcNpcEventPendingModules = []
    __DcNpcEventPendingModules.push({
      name:"dc_starter_select",
      module:module()
    })
  }

  return {
    OVERLAY_NAME:OVERLAY_NAME,
    OVERLAY_HTML:OVERLAY_HTML,
    open:open,
    openFromDialogue:openFromDialogue,
    handleHtmlEvent:handleHtmlEvent,
    getStoredStarterPath:getStoredStarterPath,
    getTypes:getTypes,
    pokeModelNBT:pokeModelNBT
  }
})()

function dc_starter_open(e, opts){
  return StarterSelectionModule.open(e, null, opts || {})
}

function dc_starter_openFromDialogue(e, opts){
  return StarterSelectionModule.openFromDialogue(e, opts || {})
}

function dc_starter_handleHtmlEvent(e){
  return StarterSelectionModule.handleHtmlEvent(e)
}

function dc_starter_getStarterPath(npc){
  return StarterSelectionModule.getStoredStarterPath(npc)
}

function jsCall(e, opts){
  return StarterSelectionModule.openFromDialogue(e, opts || {})
}
