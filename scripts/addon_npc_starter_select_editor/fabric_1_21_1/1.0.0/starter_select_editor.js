var StarterSelectEditorAPI = Java.type("noppes.npcs.api.NpcAPI").Instance()

var StarterSelectEditorModule = (function(){
  var ADDON_ID = "dc_starter_select_editor"
  var GUI_ID = 781
  var GUI_W = 620
  var GUI_H = 392
  var LIST_SIZE = 9
  var PICK_SIZE = 9
  var BG_TEXTURE = "minecraft:textures/gui/options_background.png"
  var FLYOUT_TEXTURE = "minecraft:textures/block/white_concrete.png"
  var TEXT_COLOR = 0xF2F6FF
  var FLYOUT_TEXT_COLOR = 0x20242A
  var JSON_TEXT_COLOR = 0x8FEAFF
  var LINE_COLOR = 0x26E6FF
  var CENTER_LINE_COLOR = 0xFFD34D
  var FLYOUT_W = 286
  var FLYOUT_H = 310
  var FLYOUT_X = Math.floor((GUI_W - FLYOUT_W) / 2)
  var FLYOUT_Y = Math.floor((GUI_H - FLYOUT_H) / 2)

  var TEMP = {
    NPC_UUID:"npc_editor_addon_edit_npc_uuid",
    JSON_PATH:"npc_editor_addon_edit_json_path",
    SESSION:"dc_starter_select_editor_session"
  }

  var CAT = {
    LIST:"list",
    POKEMON:"pokemon",
    MOVES:"moves",
    IVS:"ivs",
    EVS:"evs"
  }

  var ID = {
    BTN_SAVE:20,
    BTN_CLOSE:21,
    BTN_BACK:22,
    BTN_ADD:23,
    BTN_DUP:24,
    BTN_REMOVE:25,
    BTN_PREV:26,
    BTN_NEXT:27,
    BTN_ONCE:28,
    BTN_SHINY:29,
    BTN_PICK_SPECIES:30,
    BTN_PICK_GENDER:31,
    BTN_PICK_NATURE:32,
    BTN_PICK_ABILITY:33,
    BTN_PICK_FORM:34,
    BTN_PICK_MOVE1:35,
    BTN_PICK_MOVE2:36,
    BTN_PICK_MOVE3:37,
    BTN_PICK_MOVE4:38,
    BTN_CAT_BASE:50,
    BTN_ROW_START:100,
    TXT_TITLE:200,
    TXT_SUBTITLE:201,
    TXT_CLAIMED:202,
    TXT_SPECIES:210,
    TXT_LEVEL:211,
    TXT_GENDER:212,
    TXT_NATURE:213,
    TXT_ABILITY:214,
    TXT_FORM:215,
    TXT_MOVE1:220,
    TXT_MOVE2:221,
    TXT_MOVE3:222,
    TXT_MOVE4:223,
    TXT_IV_HP:230,
    TXT_IV_ATK:231,
    TXT_IV_DEF:232,
    TXT_IV_SPATK:233,
    TXT_IV_SPDEF:234,
    TXT_IV_SPEED:235,
    TXT_EV_HP:240,
    TXT_EV_ATK:241,
    TXT_EV_DEF:242,
    TXT_EV_SPATK:243,
    TXT_EV_SPDEF:244,
    TXT_EV_SPEED:245,
    BTN_MODAL_BLOCKER:5000,
    FLYOUT_BG_BASE:5001,
    TXT_PICK_SEARCH:6000,
    BTN_PICK_APPLY_SEARCH:6001,
    BTN_PICK_PREV:6002,
    BTN_PICK_NEXT:6003,
    BTN_PICK_CANCEL:6004,
    BTN_PICK_ROW_START:6100,
    BG_BASE:1,
    LINE_BASE:700,
    LABEL_ROW_BASE:2000,
    LABEL_PICK_ROW_BASE:6600,
    LABEL_BASE:1000
  }

  var CATEGORIES = [
    { id:CAT.LIST, fallback:"List" },
    { id:CAT.POKEMON, fallback:"Pokemon" },
    { id:CAT.MOVES, fallback:"Moves" },
    { id:CAT.IVS, fallback:"IVs" },
    { id:CAT.EVS, fallback:"EVs" }
  ]

  var NATURES = ["", "hardy", "lonely", "brave", "adamant", "naughty", "bold", "docile", "relaxed", "impish", "lax", "timid", "hasty", "serious", "jolly", "naive", "modest", "mild", "quiet", "bashful", "rash", "calm", "gentle", "sassy", "careful", "quirky"]
  var GENDERS = ["", "random", "male", "female", "genderless"]
  var FORMS = ["", "normal", "alola", "galar", "hisui", "paldea"]
  var POKEMON = ["bulbasaur", "ivysaur", "venusaur", "charmander", "charmeleon", "charizard", "squirtle", "wartortle", "blastoise", "pikachu", "eevee", "chikorita", "cyndaquil", "totodile", "treecko", "torchic", "mudkip", "turtwig", "chimchar", "piplup", "snivy", "tepig", "oshawott", "chespin", "fennekin", "froakie", "rowlet", "litten", "popplio", "grookey", "scorbunny", "sobble", "sprigatito", "fuecoco", "quaxly", "riolu", "ralts", "gible", "bagon", "dratini", "sylveon", "psyduck", "poliwrath", "primeape"]
  var ABILITIES = ["", "overgrow", "blaze", "torrent", "shield-dust", "shed-skin", "compound-eyes", "swarm", "keen-eye", "tangled-feet", "static", "lightning-rod", "run-away", "adaptability", "anticipation", "inner-focus", "synchronize", "trace", "intimidate", "levitate", "pressure", "chlorophyll", "solar-power", "swift-swim", "rain-dish", "protean", "battle-bond", "long-reach", "liquid-voice", "grassy-surge", "libero", "sniper", "unaware"]
  var MOVES = ["", "tackle", "growl", "scratch", "tail-whip", "vine-whip", "ember", "water-gun", "razor-leaf", "quick-attack", "thunder-shock", "bubble", "pound"]

  function key(player){
    try{ return String(player.getUUID()) }catch(err){}
    try{ return String(player.getName()) }catch(err2){}
    return "player"
  }

  function playerTemp(player){
    try{ return player && typeof player.getTempdata === "function" ? player.getTempdata() : null }catch(err){}
    return null
  }

  function guiId(gui){
    var v
    if(!gui) return -1
    try{ if(typeof gui.getID === "function") return toInt(gui.getID(), -1) }catch(err0){}
    try{ if(typeof gui.getId === "function") return toInt(gui.getId(), -1) }catch(err1){}
    try{ v = gui.id }catch(err2){ v = null }
    return toInt(v, -1)
  }

  function isStarterGuiEvent(e){
    return !!(e && e.gui && guiId(e.gui) === GUI_ID)
  }

  function setSession(player, session){
    var td = playerTemp(player)
    var state
    if(!td) return
    state = {
      npcUuid:String(session.npcUuid || ""),
      jsonPath:String(session.jsonPath || ""),
      json:normalizeStarterJson(session.json || {}),
      index:toInt(session.index, 0),
      page:toInt(session.page, 0),
      category:String(session.category || CAT.LIST),
      flyoutOpen:session.flyoutOpen === true,
      pickerKind:String(session.pickerKind || ""),
      pickerTarget:String(session.pickerTarget || ""),
      pickerSearch:String(session.pickerSearch || ""),
      pickerPage:toInt(session.pickerPage, 0),
      componentIds:session.componentIds instanceof Array ? session.componentIds.slice(0) : []
    }
    try{ td.put(TEMP.SESSION, JSON.stringify(state)) }catch(err){}
  }

  function getStoredSession(player, gui){
    var td = playerTemp(player)
    var raw, saved, session
    if(!td) return null
    try{ raw = td.get(TEMP.SESSION) }catch(err){}
    if(!raw) return null
    try{ saved = JSON.parse(String(raw)) }catch(err2){ return null }
    session = {
      player:player,
      gui:gui,
      npcUuid:String(saved.npcUuid || ""),
      jsonPath:String(saved.jsonPath || ""),
      json:normalizeStarterJson(saved.json || {}),
      index:toInt(saved.index, 0),
      page:toInt(saved.page, 0),
      category:String(saved.category || CAT.LIST),
      flyoutOpen:saved.flyoutOpen === true,
      pickerKind:String(saved.pickerKind || ""),
      pickerTarget:String(saved.pickerTarget || ""),
      pickerSearch:String(saved.pickerSearch || ""),
      pickerPage:toInt(saved.pickerPage, 0),
      componentIds:saved.componentIds instanceof Array ? saved.componentIds : []
    }
    session.file = resolveFile(session.jsonPath)
    session.i18n = buildEditorI18n(player)
    return session
  }

  function clearSession(player){
    var td = playerTemp(player)
    if(!td) return
    try{ td.remove(TEMP.SESSION) }catch(err){}
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

  function optionalToken(value){
    var t = cleanToken(value)
    if(t === "default" || t === "none" || t === "-") return ""
    return t
  }

  function optionalText(value){
    var s = String(value || "").replace(/^\s+|\s+$/g, "")
    var t = cleanToken(s)
    if(t === "default" || t === "none" || t === "-") return ""
    return s
  }

  function cap(value){
    var s = String(value || "")
    return s ? s.charAt(0).toUpperCase() + s.substring(1) : s
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
    if(!file || !file.exists()) throw new Error("Starter JSON not found: " + normalizeStarterPath(path))
    return { file:file, json:normalizeStarterJson(JSON.parse(readTextFile(file))) }
  }

  function saveStarter(session){
    writeTextFile(session.file, JSON.stringify(normalizeStarterJson(session.json), null, 2))
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
      pokemon:"sylveon",
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

  function normalizeChoice(raw){
    var c = raw && typeof raw === "object" ? raw : {}
    var species = cleanToken(c.species || c.pokemon || c.key || c.id || "sylveon") || "sylveon"
    return {
      id:cleanToken(c.id || species) || species,
      label:String(c.label || c.name || cap(species)),
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
    for(i = 0; i < list.length; i++) out.choices.push(normalizeChoice(list[i]))
    if(!out.choices.length) out.choices.push(defaultChoice())
    return out
  }

  function choices(session){
    if(!session.json.choices) session.json.choices = []
    return session.json.choices
  }

  function activeChoice(session){
    var list = choices(session)
    if(!list.length) list.push(defaultChoice())
    if(session.index < 0) session.index = 0
    if(session.index >= list.length) session.index = list.length - 1
    return list[session.index]
  }

  function getText(gui, id, fallback){
    var c = null
    try{ c = gui.getComponent(id) }catch(err1){}
    if(c && typeof c.getText === "function"){
      try{ return String(c.getText()) }catch(err2){}
    }
    if(c && c.text != null) return String(c.text)
    return String(fallback == null ? "" : fallback)
  }

  function setText(component, value){
    try{ if(component && typeof component.setText === "function") component.setText(String(value)) }catch(err){}
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

  function tr(session, keyName, fallback, vars){
    var messages = session && session.i18n && session.i18n.messages ? session.i18n.messages : {}
    var text = messages[keyName] != null ? String(messages[keyName]) : String(fallback == null ? keyName : fallback)
    vars = vars || {}
    return text.replace(/\{([A-Za-z0-9_]+)\}/g, function(all, name){
      return vars[name] != null ? String(vars[name]) : all
    })
  }

  function track(session, id){
    if(!session.componentIds) session.componentIds = []
    session.componentIds.push(id)
  }

  function removeTracked(session){
    var g = session.gui
    var ids = session.componentIds || []
    var i, id
    if(!g) return
    for(i = ids.length - 1; i >= 0; i--){
      id = ids[i]
      try{ if(typeof g.removeComponent === "function") g.removeComponent(id) }catch(err0){}
      try{ if(typeof g.remove === "function") g.remove(id) }catch(err1){}
      try{ if(typeof g.deleteComponent === "function") g.deleteComponent(id) }catch(err2){}
    }
    session.componentIds = []
  }

  function updateGui(session){
    try{ session.gui.update() }catch(err0){}
  }

  function trySetDefaultBackground(g){
    try{ if(typeof g.setBackgroundTexture === "function") g.setBackgroundTexture(BG_TEXTURE) }catch(err0){}
    try{ if(typeof g.setBackground === "function") g.setBackground(BG_TEXTURE) }catch(err1){}
  }

  function addTexturedRectWithTexture(session, id, texture, x, y, w, h){
    try{
      session.gui.addTexturedRect(id, texture, x, y, w, h, 0, 0)
      track(session, id)
    }catch(err){}
  }

  function addTexturedRect(session, id, x, y, w, h){
    addTexturedRectWithTexture(session, id, BG_TEXTURE, x, y, w, h)
  }

  function addLineColor(session, id, x1, y1, x2, y2, color){
    try{
      session.gui.addColoredLine(id, x1, y1, x2, y2, color, 1.0)
      track(session, id)
    }catch(err){}
  }

  function addLine(session, id, x1, y1, x2, y2){
    addLineColor(session, id, x1, y1, x2, y2, LINE_COLOR)
  }

  function addBoxLines(session, idBase, x, y, w, h){
    addLine(session, idBase, x, y, x + w, y)
    addLine(session, idBase + 1, x, y + h, x + w, y + h)
    addLine(session, idBase + 2, x, y, x, y + h)
    addLine(session, idBase + 3, x + w, y, x + w, y + h)
  }

  function addFrame(session){
    addTexturedRect(session, ID.BG_BASE, 0, 0, GUI_W, GUI_H)
    addTexturedRect(session, ID.BG_BASE + 1, 6, 36, 154, 314)
    addTexturedRect(session, ID.BG_BASE + 2, 166, 36, 446, 314)
    addLineColor(session, ID.LINE_BASE, 164, 42, 164, 346, CENTER_LINE_COLOR)
    addLine(session, ID.LINE_BASE + 1, 176, 74, 604, 74)
    addLine(session, ID.LINE_BASE + 2, 170, 346, 604, 346)
    addBoxLines(session, ID.LINE_BASE + 10, 6, 6, GUI_W - 12, GUI_H - 12)
    addBoxLines(session, ID.LINE_BASE + 20, 8, 38, 152, 308)
    addBoxLines(session, ID.LINE_BASE + 30, 170, 30, 434, 316)
  }

  function addLabel(session, lidBox, text, x, y, w, h){
    addLabelColor(session, lidBox.id, text, x, y, w, h, TEXT_COLOR)
    lidBox.id++
  }

  function addLabelColor(session, id, text, x, y, w, h, color){
    var l = session.gui.addLabel(id, String(text), x, y, w, h)
    try{ if(l && typeof l.setColor === "function") l.setColor(color) }catch(err){}
    track(session, id)
    return l
  }

  function labelWidth(text){
    var s = String(text || "")
    var w = 0
    var i
    for(i = 0; i < s.length; i++) w += s.charCodeAt(i) > 127 ? 9 : 6
    return w
  }

  function fitButtonWidth(text, minW, maxW){
    var w = labelWidth(text) + 24
    if(w < minW) w = minW
    if(maxW && w > maxW) w = maxW
    return w
  }

  function addButton(session, id, text, x, y, w, h){
    var b = session.gui.addButton(id, String(text), x, y, w, h)
    track(session, id)
    return b
  }

  function addFitButton(session, id, text, x, y, minW, maxW, h){
    return addButton(session, id, text, x, y, fitButtonWidth(text, minW, maxW), h)
  }

  function addFlatButton(session, id, text, x, y, w, h){
    var b = addButton(session, id, text, x, y, w, h)
    try{ if(b && b.getTextureRect && b.getTextureRect()) b.getTextureRect().setVisible(false) }catch(err5){}
    try{ if(b && typeof b.setDrawBackground === "function") b.setDrawBackground(false) }catch(err0){}
    try{ if(b && typeof b.setBackground === "function") b.setBackground(false) }catch(err1){}
    try{ if(b && typeof b.setHasBackground === "function") b.setHasBackground(false) }catch(err2){}
    try{ if(b && typeof b.setTexture === "function") b.setTexture("") }catch(err3){}
    try{ if(b && typeof b.setTextureHoverOffset === "function") b.setTextureHoverOffset(0) }catch(err4){}
    return b
  }

  function addFlatFitButton(session, id, text, x, y, minW, maxW, h){
    return addFlatButton(session, id, text, x, y, fitButtonWidth(text, minW, maxW), h)
  }

  function addTextRow(session, buttonId, labelId, text, x, y, minW, maxW, color){
    var w = fitButtonWidth(text, minW, maxW)
    addFlatButton(session, buttonId, "", x, y, w, 16)
    addLabelColor(session, labelId, text, x + 8, y + 2, Math.max(20, w - 10), 12, color || TEXT_COLOR)
  }

  function addTextField(session, id, x, y, w, h, value){
    var f = session.gui.addTextField(id, x, y, w, h)
    track(session, id)
    try{ if(f && typeof f.setColor === "function") f.setColor(TEXT_COLOR) }catch(err){}
    setText(f, value)
    return f
  }

  function shortPath(path){
    var p = String(path || "")
    if(p.length <= 44) return p
    return "..." + p.substring(p.length - 41)
  }

  function categoryLabel(session, id, fallback){
    if(id === CAT.LIST) return tr(session, "starter_editor.list_settings", fallback)
    if(id === CAT.POKEMON) return tr(session, "starter_editor.selected_pokemon", fallback)
    if(id === CAT.MOVES) return tr(session, "starter_editor.moves", fallback)
    if(id === CAT.IVS) return tr(session, "starter_editor.ivs", fallback)
    if(id === CAT.EVS) return tr(session, "starter_editor.evs", fallback)
    return fallback
  }

  function gatherEditorFields(e, session){
    var c, cat
    if(!e || !e.gui || !session) return
    c = activeChoice(session)
    cat = session.category || CAT.LIST
    if(cat === CAT.LIST){
      session.json.title = getText(e.gui, ID.TXT_TITLE, session.json.title)
      session.json.subtitle = getText(e.gui, ID.TXT_SUBTITLE, session.json.subtitle)
      session.json.alreadyClaimedMessage = getText(e.gui, ID.TXT_CLAIMED, session.json.alreadyClaimedMessage)
      session.json.commandName = "pokegiveother"
    }else if(cat === CAT.POKEMON){
      c.species = cleanToken(getText(e.gui, ID.TXT_SPECIES, c.species)) || "sylveon"
      c.pokemon = c.species
      c.id = c.species
      c.label = cap(c.species)
      c.level = Math.max(1, Math.min(100, toInt(getText(e.gui, ID.TXT_LEVEL, c.level), c.level || 5)))
      c.gender = optionalToken(getText(e.gui, ID.TXT_GENDER, c.gender))
      c.nature = optionalToken(getText(e.gui, ID.TXT_NATURE, c.nature))
      c.ability = optionalText(getText(e.gui, ID.TXT_ABILITY, c.ability))
      c.form = optionalText(getText(e.gui, ID.TXT_FORM, c.form))
    }else if(cat === CAT.MOVES){
      c.moveset = [
        getText(e.gui, ID.TXT_MOVE1, normalizeMoves(c.moveset)[0]),
        getText(e.gui, ID.TXT_MOVE2, normalizeMoves(c.moveset)[1]),
        getText(e.gui, ID.TXT_MOVE3, normalizeMoves(c.moveset)[2]),
        getText(e.gui, ID.TXT_MOVE4, normalizeMoves(c.moveset)[3])
      ]
    }else if(cat === CAT.IVS){
      c.ivs = c.ivs || statBlock()
      c.ivs.hp = Math.max(0, toInt(getText(e.gui, ID.TXT_IV_HP, c.ivs.hp), 0))
      c.ivs.atk = Math.max(0, toInt(getText(e.gui, ID.TXT_IV_ATK, c.ivs.atk), 0))
      c.ivs.def = Math.max(0, toInt(getText(e.gui, ID.TXT_IV_DEF, c.ivs.def), 0))
      c.ivs.spatk = Math.max(0, toInt(getText(e.gui, ID.TXT_IV_SPATK, c.ivs.spatk), 0))
      c.ivs.spdef = Math.max(0, toInt(getText(e.gui, ID.TXT_IV_SPDEF, c.ivs.spdef), 0))
      c.ivs.speed = Math.max(0, toInt(getText(e.gui, ID.TXT_IV_SPEED, c.ivs.speed), 0))
    }else if(cat === CAT.EVS){
      c.evs = c.evs || statBlock()
      c.evs.hp = Math.max(0, toInt(getText(e.gui, ID.TXT_EV_HP, c.evs.hp), 0))
      c.evs.atk = Math.max(0, toInt(getText(e.gui, ID.TXT_EV_ATK, c.evs.atk), 0))
      c.evs.def = Math.max(0, toInt(getText(e.gui, ID.TXT_EV_DEF, c.evs.def), 0))
      c.evs.spatk = Math.max(0, toInt(getText(e.gui, ID.TXT_EV_SPATK, c.evs.spatk), 0))
      c.evs.spdef = Math.max(0, toInt(getText(e.gui, ID.TXT_EV_SPDEF, c.evs.spdef), 0))
      c.evs.speed = Math.max(0, toInt(getText(e.gui, ID.TXT_EV_SPEED, c.evs.speed), 0))
    }
  }

  function redraw(player, session, firstOpen){
    if(!session || !session.gui) return
    removeTracked(session)
    trySetDefaultBackground(session.gui)
    addFrame(session)
    renderMain(player, session)
    if(session.flyoutOpen) renderFlyout(player, session)
    setSession(player, session)
    if(firstOpen) player.showCustomGui(session.gui)
    else updateGui(session)
  }

  function renderMain(player, session){
    var list, c, lid, i, start, choice, rowLabel, cat, x, moves
    list = choices(session)
    c = activeChoice(session)
    c.ivs = normalizeStats(c.ivs)
    c.evs = normalizeStats(c.evs)
    if(session.page < 0) session.page = 0
    if(session.index < session.page * LIST_SIZE) session.page = Math.floor(session.index / LIST_SIZE)
    if(session.index >= (session.page + 1) * LIST_SIZE) session.page = Math.floor(session.index / LIST_SIZE)
    start = session.page * LIST_SIZE
    lid = { id:ID.LABEL_BASE }

    addLabel(session, lid, tr(session, "starter_editor.title", "Starter Pokemon Editor"), 10, 8, 180, 12)
    addLabelColor(session, lid.id, shortPath(session.jsonPath), 10, 22, 250, 12, JSON_TEXT_COLOR)
    lid.id++
    addLabel(session, lid, tr(session, "starter_editor.pokemon", "Pokemon") + " " + list.length, 10, 45, 130, 12)

    for(i = 0; i < LIST_SIZE; i++){
      choice = list[start + i]
      rowLabel = choice ? ((start + i === session.index ? "> " : "  ") + cap(choice.species || choice.id || "pokemon")) : "  -"
      addTextRow(session, ID.BTN_ROW_START + i, ID.LABEL_ROW_BASE + i, rowLabel, 12, 64 + i * 20, 28, 140, TEXT_COLOR)
    }
    addButton(session, ID.BTN_PREV, "<", 12, 250, 34, 18)
    addButton(session, ID.BTN_NEXT, ">", 50, 250, 34, 18)
    addButton(session, ID.BTN_ADD, tr(session, "starter_editor.add", "Add"), 12, 278, 66, 20)
    addButton(session, ID.BTN_DUP, tr(session, "starter_editor.duplicate", "Duplicate"), 84, 278, 68, 20)
    addButton(session, ID.BTN_REMOVE, tr(session, "starter_editor.remove", "Remove"), 12, 302, 140, 20)

    x = 170
    for(i = 0; i < CATEGORIES.length; i++){
      cat = CATEGORIES[i]
      rowLabel = categoryLabel(session, cat.id, cat.fallback)
      rowLabel = session.category === cat.id ? "[" + rowLabel + "]" : rowLabel
      addButton(session, ID.BTN_CAT_BASE + i, rowLabel, x, 38, fitButtonWidth(rowLabel, 46, 150), 18)
      x += fitButtonWidth(rowLabel, 46, 150) + 8
    }
    addLabel(session, lid, categoryLabel(session, session.category, "Settings"), 176, 84, 180, 12)

    if(session.category === CAT.LIST) renderListCategory(session, lid)
    else if(session.category === CAT.POKEMON) renderPokemonCategory(session, lid, c)
    else if(session.category === CAT.MOVES){
      moves = normalizeMoves(c.moveset)
      renderMovesCategory(session, lid, moves)
    }else if(session.category === CAT.IVS) renderStatsCategory(session, lid, c.ivs, true)
    else if(session.category === CAT.EVS) renderStatsCategory(session, lid, c.evs, false)

    addButton(session, ID.BTN_BACK, tr(session, "starter_editor.npc_editor", "NPC Editor"), 326, 356, 94, 22)
    addButton(session, ID.BTN_SAVE, tr(session, "starter_editor.save", "Save"), 426, 356, 58, 22)
    addButton(session, ID.BTN_CLOSE, tr(session, "starter_editor.close", "Close"), 490, 356, 58, 22)
  }

  function renderListCategory(session, lid){
    addLabel(session, lid, tr(session, "starter_editor.title_field", "Title"), 180, 96, 70, 12)
    addTextField(session, ID.TXT_TITLE, 250, 92, 210, 18, session.json.title || "")
    addLabel(session, lid, tr(session, "starter_editor.subtitle", "Subtitle"), 180, 122, 70, 12)
    addTextField(session, ID.TXT_SUBTITLE, 250, 118, 300, 18, session.json.subtitle || "")
    addButton(session, ID.BTN_ONCE, (session.json.once ? "[X] " : "[ ] ") + tr(session, "starter_editor.once_per_player", "Once Per Player"), 250, 148, 148, 20)
    addLabel(session, lid, tr(session, "starter_editor.already_claimed", "Already Claimed Message"), 180, 184, 170, 12)
    addTextField(session, ID.TXT_CLAIMED, 180, 202, 370, 18, session.json.alreadyClaimedMessage || "")
    addLabel(session, lid, tr(session, "starter_editor.command", "Command") + ": pokegiveother", 180, 236, 220, 12)
  }

  function renderPokemonCategory(session, lid, c){
    addLabel(session, lid, tr(session, "starter_editor.species", "Species"), 180, 96, 58, 12)
    addTextField(session, ID.TXT_SPECIES, 240, 92, 120, 18, c.species)
    addButton(session, ID.BTN_PICK_SPECIES, "...", 364, 92, 24, 18)
    addLabel(session, lid, tr(session, "starter_editor.level", "Level"), 400, 96, 48, 12)
    addTextField(session, ID.TXT_LEVEL, 448, 92, 48, 18, String(c.level || 5))
    addLabel(session, lid, tr(session, "starter_editor.gender", "Gender"), 180, 126, 58, 12)
    addTextField(session, ID.TXT_GENDER, 240, 122, 90, 18, c.gender || "")
    addButton(session, ID.BTN_PICK_GENDER, "...", 334, 122, 24, 18)
    addButton(session, ID.BTN_SHINY, (c.shiny ? "[X] " : "[ ] ") + tr(session, "starter_editor.shiny", "Shiny"), 400, 122, 80, 18)
    addLabel(session, lid, tr(session, "starter_editor.nature", "Nature"), 180, 156, 58, 12)
    addTextField(session, ID.TXT_NATURE, 240, 152, 100, 18, c.nature || "")
    addButton(session, ID.BTN_PICK_NATURE, "...", 344, 152, 24, 18)
    addLabel(session, lid, tr(session, "starter_editor.ability", "Ability"), 180, 186, 58, 12)
    addTextField(session, ID.TXT_ABILITY, 240, 182, 130, 18, c.ability || "")
    addButton(session, ID.BTN_PICK_ABILITY, "...", 374, 182, 24, 18)
    addLabel(session, lid, tr(session, "starter_editor.form", "Form"), 180, 216, 58, 12)
    addTextField(session, ID.TXT_FORM, 240, 212, 100, 18, c.form || "")
    addButton(session, ID.BTN_PICK_FORM, "...", 344, 212, 24, 18)
  }

  function renderMovesCategory(session, lid, moves){
    addLabel(session, lid, tr(session, "starter_editor.move_1", "Move 1"), 180, 96, 70, 12)
    addTextField(session, ID.TXT_MOVE1, 250, 92, 190, 18, moves[0])
    addButton(session, ID.BTN_PICK_MOVE1, "...", 444, 92, 24, 18)
    addLabel(session, lid, tr(session, "starter_editor.move_2", "Move 2"), 180, 126, 70, 12)
    addTextField(session, ID.TXT_MOVE2, 250, 122, 190, 18, moves[1])
    addButton(session, ID.BTN_PICK_MOVE2, "...", 444, 122, 24, 18)
    addLabel(session, lid, tr(session, "starter_editor.move_3", "Move 3"), 180, 156, 70, 12)
    addTextField(session, ID.TXT_MOVE3, 250, 152, 190, 18, moves[2])
    addButton(session, ID.BTN_PICK_MOVE3, "...", 444, 152, 24, 18)
    addLabel(session, lid, tr(session, "starter_editor.move_4", "Move 4"), 180, 186, 70, 12)
    addTextField(session, ID.TXT_MOVE4, 250, 182, 190, 18, moves[3])
    addButton(session, ID.BTN_PICK_MOVE4, "...", 444, 182, 24, 18)
  }

  function renderStatsCategory(session, lid, stats, isIv){
    var ids, values, labels, i, x, y
    labels = [
      tr(session, "starter_editor.hp", "HP"),
      tr(session, "starter_editor.atk", "Atk"),
      tr(session, "starter_editor.def", "Def"),
      tr(session, "starter_editor.spatk", "SpA"),
      tr(session, "starter_editor.spdef", "SpD"),
      tr(session, "starter_editor.speed", "Spe")
    ]
    ids = isIv ? [ID.TXT_IV_HP, ID.TXT_IV_ATK, ID.TXT_IV_DEF, ID.TXT_IV_SPATK, ID.TXT_IV_SPDEF, ID.TXT_IV_SPEED] : [ID.TXT_EV_HP, ID.TXT_EV_ATK, ID.TXT_EV_DEF, ID.TXT_EV_SPATK, ID.TXT_EV_SPDEF, ID.TXT_EV_SPEED]
    values = [stats.hp, stats.atk, stats.def, stats.spatk, stats.spdef, stats.speed]
    for(i = 0; i < 6; i++){
      x = 180 + (i % 3) * 120
      y = 96 + Math.floor(i / 3) * 48
      addLabel(session, lid, labels[i], x, y, 40, 12)
      addTextField(session, ids[i], x, y + 16, 70, 18, String(values[i]))
    }
    addLabel(session, lid, isIv ? "0 - 31" : "0 - 252", 180, 210, 160, 12)
  }

  function currentPickerValue(session){
    var c = activeChoice(session)
    if(session.pickerTarget === "species") return c.species || ""
    if(session.pickerTarget === "gender") return c.gender || ""
    if(session.pickerTarget === "nature") return c.nature || ""
    if(session.pickerTarget === "ability") return c.ability || ""
    if(session.pickerTarget === "form") return c.form || ""
    if(session.pickerTarget === "move1") return normalizeMoves(c.moveset)[0]
    if(session.pickerTarget === "move2") return normalizeMoves(c.moveset)[1]
    if(session.pickerTarget === "move3") return normalizeMoves(c.moveset)[2]
    if(session.pickerTarget === "move4") return normalizeMoves(c.moveset)[3]
    return ""
  }

  function pushUnique(out, seen, value){
    var v = String(value == null ? "" : value)
    var k = v.toLowerCase()
    if(seen[k]) return
    seen[k] = true
    out.push(v)
  }

  function allMoveValues(session){
    var out = []
    var list = choices(session)
    var i, j, moves
    for(i = 0; i < list.length; i++){
      moves = normalizeMoves(list[i].moveset)
      for(j = 0; j < moves.length; j++) out.push(moves[j])
    }
    return out
  }

  function pickerItems(session){
    var base = []
    var out = []
    var seen = {}
    var list = choices(session)
    var i, q, text
    if(session.pickerKind === "species"){
      base = POKEMON.slice()
      for(i = 0; i < list.length; i++) base.push(list[i].species || "")
    }else if(session.pickerKind === "gender"){
      base = GENDERS.slice()
    }else if(session.pickerKind === "nature"){
      base = NATURES.slice()
    }else if(session.pickerKind === "ability"){
      base = ABILITIES.slice()
      for(i = 0; i < list.length; i++) base.push(list[i].ability || "")
    }else if(session.pickerKind === "form"){
      base = FORMS.slice()
      for(i = 0; i < list.length; i++) base.push(list[i].form || "")
    }else if(session.pickerKind === "move"){
      base = MOVES.concat(allMoveValues(session))
    }
    base.push(currentPickerValue(session))
    q = String(session.pickerSearch || "").toLowerCase()
    for(i = 0; i < base.length; i++){
      text = String(base[i] || "Default").toLowerCase()
      if(!q || text.indexOf(q) >= 0) pushUnique(out, seen, base[i])
    }
    return out
  }

  function pickerTitle(session){
    if(session.pickerKind === "species") return tr(session, "starter_editor.species", "Species")
    if(session.pickerKind === "gender") return tr(session, "starter_editor.gender", "Gender")
    if(session.pickerKind === "nature") return tr(session, "starter_editor.nature", "Nature")
    if(session.pickerKind === "ability") return tr(session, "starter_editor.ability", "Ability")
    if(session.pickerKind === "form") return tr(session, "starter_editor.form", "Form")
    return tr(session, "starter_editor.moves", "Moves")
  }

  function optionLabel(session, value){
    var v = String(value || "")
    return v ? v : tr(session, "starter_editor.default", "Default")
  }

  function renderFlyout(player, session){
    var lid, items, start, i, value, label, current, x, y
    items = pickerItems(session)
    if(session.pickerPage < 0) session.pickerPage = 0
    if(session.pickerPage * PICK_SIZE >= items.length) session.pickerPage = Math.max(0, Math.floor((items.length - 1) / PICK_SIZE))
    start = session.pickerPage * PICK_SIZE
    current = currentPickerValue(session)
    lid = { id:ID.LABEL_BASE + 6000 }
    x = FLYOUT_X + 16
    y = FLYOUT_Y + 14
    addFlatButton(session, ID.BTN_MODAL_BLOCKER, "", 0, 0, GUI_W, GUI_H)
    addTexturedRectWithTexture(session, ID.FLYOUT_BG_BASE, FLYOUT_TEXTURE, FLYOUT_X, FLYOUT_Y, FLYOUT_W, FLYOUT_H)
    addLine(session, ID.FLYOUT_BG_BASE + 1, FLYOUT_X + 12, y + 30, FLYOUT_X + FLYOUT_W - 12, y + 30)
    addLine(session, ID.FLYOUT_BG_BASE + 2, FLYOUT_X + 12, y + 82, FLYOUT_X + FLYOUT_W - 12, y + 82)
    addBoxLines(session, ID.FLYOUT_BG_BASE + 10, FLYOUT_X + 4, FLYOUT_Y + 4, FLYOUT_W - 8, FLYOUT_H - 8)
    addLabelColor(session, lid.id, tr(session, "starter_editor.select", "Select") + ": " + pickerTitle(session), x, y, 170, 12, FLYOUT_TEXT_COLOR)
    lid.id++
    addFitButton(session, ID.BTN_PICK_CANCEL, tr(session, "npc_editor.cancel", "Cancel"), FLYOUT_X + FLYOUT_W - 76, y - 4, 56, 78, 18)
    addLabelColor(session, lid.id, tr(session, "starter_editor.picker_current", "Current: {value}", { value:optionLabel(session, current) }), x, y + 20, 210, 12, FLYOUT_TEXT_COLOR)
    lid.id++
    addTextField(session, ID.TXT_PICK_SEARCH, x, y + 48, 170, 18, session.pickerSearch || "")
    addFitButton(session, ID.BTN_PICK_APPLY_SEARCH, tr(session, "npc_editor.apply", "Apply"), x + 176, y + 48, 54, 76, 18)
    for(i = 0; i < PICK_SIZE; i++){
      value = items[start + i]
      label = value == null ? "-" : optionLabel(session, value)
      if(value != null && String(value) === String(current)) label = "> " + label
      addTextRow(session, ID.BTN_PICK_ROW_START + i, ID.LABEL_PICK_ROW_BASE + i, label, x, y + 92 + i * 20, 34, FLYOUT_W - 44, value != null && String(value) === String(current) ? JSON_TEXT_COLOR : FLYOUT_TEXT_COLOR)
    }
    addButton(session, ID.BTN_PICK_PREV, "<", x, y + 274, 34, 18)
    addButton(session, ID.BTN_PICK_NEXT, ">", x + 38, y + 274, 34, 18)
    addLabelColor(session, lid.id, String(items.length) + " / " + String(session.pickerPage + 1), x + 86, y + 278, 90, 12, FLYOUT_TEXT_COLOR)
    lid.id++
  }

  function openPicker(player, session, kind, target){
    session.pickerKind = kind
    session.pickerTarget = target
    session.pickerSearch = ""
    session.pickerPage = 0
    session.flyoutOpen = true
    redraw(player, session, false)
  }

  function applyPickerValue(session, value){
    var c = activeChoice(session)
    var moves = normalizeMoves(c.moveset)
    if(session.pickerTarget === "species"){
      c.species = cleanToken(value) || "sylveon"
      c.pokemon = c.species
      c.id = c.species
      c.label = cap(c.species)
    }else if(session.pickerTarget === "gender"){
      c.gender = optionalToken(value)
    }else if(session.pickerTarget === "nature"){
      c.nature = optionalToken(value)
    }else if(session.pickerTarget === "ability"){
      c.ability = optionalText(value)
    }else if(session.pickerTarget === "form"){
      c.form = optionalText(value)
    }else if(session.pickerTarget === "move1"){
      moves[0] = String(value || "")
      c.moveset = moves
    }else if(session.pickerTarget === "move2"){
      moves[1] = String(value || "")
      c.moveset = moves
    }else if(session.pickerTarget === "move3"){
      moves[2] = String(value || "")
      c.moveset = moves
    }else if(session.pickerTarget === "move4"){
      moves[3] = String(value || "")
      c.moveset = moves
    }
  }

  function backToNpcEditor(player){
    clearSession(player)
    player.closeGui()
    if(typeof tryOpenEditor === "function"){
      tryOpenEditor(player)
      return
    }
    player.message("NPC Editor is not loaded.")
  }

  function open(ctx){
    var player = ctx && ctx.player
    var temp, path, loaded, g, session
    if(!player) return false
    temp = player.getTempdata()
    path = cleanPath((ctx && ctx.jsonPath) || temp.get(TEMP.JSON_PATH) || "")
    if(!path){
      player.message("Starter JSON path is empty.")
      return false
    }
    loaded = readStarter(path)
    g = StarterSelectEditorAPI.createCustomGui(GUI_ID, GUI_W, GUI_H, false, player)
    session = {
      player:player,
      gui:g,
      componentIds:[],
      npc:ctx.npc || null,
      npcUuid:String((ctx && ctx.uuid) || temp.get(TEMP.NPC_UUID) || ""),
      jsonPath:path,
      file:loaded.file,
      json:loaded.json,
      index:0,
      page:0,
      category:CAT.LIST,
      flyoutOpen:false,
      pickerKind:"",
      pickerTarget:"",
      pickerSearch:"",
      pickerPage:0,
      i18n:buildEditorI18n(player)
    }
    setSession(player, session)
    redraw(player, session, true)
    return true
  }

  function handleFlyoutButton(e, session){
    var items, idx
    if(!session.flyoutOpen) return false
    if(e.buttonId === ID.BTN_MODAL_BLOCKER) return true
    if(e.buttonId === ID.BTN_PICK_CANCEL){
      session.flyoutOpen = false
      redraw(e.player, session, false)
      return true
    }
    if(e.buttonId === ID.BTN_PICK_APPLY_SEARCH){
      session.pickerSearch = getText(e.gui, ID.TXT_PICK_SEARCH, "")
      session.pickerPage = 0
      redraw(e.player, session, false)
      return true
    }
    if(e.buttonId === ID.BTN_PICK_PREV){
      session.pickerSearch = getText(e.gui, ID.TXT_PICK_SEARCH, session.pickerSearch)
      session.pickerPage = Math.max(0, session.pickerPage - 1)
      redraw(e.player, session, false)
      return true
    }
    if(e.buttonId === ID.BTN_PICK_NEXT){
      session.pickerSearch = getText(e.gui, ID.TXT_PICK_SEARCH, session.pickerSearch)
      session.pickerPage++
      redraw(e.player, session, false)
      return true
    }
    if(e.buttonId >= ID.BTN_PICK_ROW_START && e.buttonId < ID.BTN_PICK_ROW_START + PICK_SIZE){
      session.pickerSearch = getText(e.gui, ID.TXT_PICK_SEARCH, session.pickerSearch)
      items = pickerItems(session)
      idx = session.pickerPage * PICK_SIZE + (e.buttonId - ID.BTN_PICK_ROW_START)
      if(idx >= 0 && idx < items.length) applyPickerValue(session, items[idx])
      session.flyoutOpen = false
      redraw(e.player, session, false)
      return true
    }
    return false
  }

  function handleButton(e){
    var session = getStoredSession(e.player, e.gui)
    var list, idx, copy, c, i
    if(!session || !isStarterGuiEvent(e)) return
    if(handleFlyoutButton(e, session)) return
    if(session.flyoutOpen) return
    gatherEditorFields(e, session)
    list = choices(session)
    for(i = 0; i < CATEGORIES.length; i++){
      if(e.buttonId === ID.BTN_CAT_BASE + i){
        session.category = CATEGORIES[i].id
        session.flyoutOpen = false
        redraw(e.player, session, false)
        return
      }
    }
    if(e.buttonId >= ID.BTN_ROW_START && e.buttonId < ID.BTN_ROW_START + LIST_SIZE){
      idx = session.page * LIST_SIZE + (e.buttonId - ID.BTN_ROW_START)
      if(idx >= 0 && idx < list.length) session.index = idx
      session.flyoutOpen = false
      redraw(e.player, session, false)
      return
    }
    if(e.buttonId === ID.BTN_PREV){ session.page = Math.max(0, session.page - 1); redraw(e.player, session, false); return }
    if(e.buttonId === ID.BTN_NEXT){ if((session.page + 1) * LIST_SIZE < list.length) session.page++; redraw(e.player, session, false); return }
    if(e.buttonId === ID.BTN_ADD){
      list.push(defaultChoice())
      session.json.choices = list
      session.index = list.length - 1
      session.page = Math.floor(session.index / LIST_SIZE)
      redraw(e.player, session, false)
      return
    }
    if(e.buttonId === ID.BTN_DUP){
      copy = JSON.parse(JSON.stringify(activeChoice(session)))
      copy.id = cleanToken(copy.id + "_copy")
      list.splice(session.index + 1, 0, copy)
      session.json.choices = list
      session.index++
      session.page = Math.floor(session.index / LIST_SIZE)
      redraw(e.player, session, false)
      return
    }
    if(e.buttonId === ID.BTN_REMOVE){
      if(list.length <= 1){
        e.player.message(tr(session, "starter_editor.one_required", "At least one Pokemon is required."))
        redraw(e.player, session, false)
        return
      }
      list.splice(session.index, 1)
      session.json.choices = list
      session.index = Math.max(0, Math.min(session.index, list.length - 1))
      session.page = Math.floor(session.index / LIST_SIZE)
      redraw(e.player, session, false)
      return
    }
    if(e.buttonId === ID.BTN_ONCE){ session.json.once = !session.json.once; redraw(e.player, session, false); return }
    if(e.buttonId === ID.BTN_SHINY){ c = activeChoice(session); c.shiny = !c.shiny; redraw(e.player, session, false); return }
    if(e.buttonId === ID.BTN_PICK_SPECIES){ openPicker(e.player, session, "species", "species"); return }
    if(e.buttonId === ID.BTN_PICK_GENDER){ openPicker(e.player, session, "gender", "gender"); return }
    if(e.buttonId === ID.BTN_PICK_NATURE){ openPicker(e.player, session, "nature", "nature"); return }
    if(e.buttonId === ID.BTN_PICK_ABILITY){ openPicker(e.player, session, "ability", "ability"); return }
    if(e.buttonId === ID.BTN_PICK_FORM){ openPicker(e.player, session, "form", "form"); return }
    if(e.buttonId === ID.BTN_PICK_MOVE1){ openPicker(e.player, session, "move", "move1"); return }
    if(e.buttonId === ID.BTN_PICK_MOVE2){ openPicker(e.player, session, "move", "move2"); return }
    if(e.buttonId === ID.BTN_PICK_MOVE3){ openPicker(e.player, session, "move", "move3"); return }
    if(e.buttonId === ID.BTN_PICK_MOVE4){ openPicker(e.player, session, "move", "move4"); return }
    if(e.buttonId === ID.BTN_SAVE){
      session.json = normalizeStarterJson(session.json)
      saveStarter(session)
      e.player.message(tr(session, "starter_editor.saved_path", "Saved {path}", { path:session.jsonPath }))
      redraw(e.player, session, false)
      return
    }
    if(e.buttonId === ID.BTN_BACK){ backToNpcEditor(e.player); return }
    if(e.buttonId === ID.BTN_CLOSE){ clearSession(e.player); e.player.closeGui(); return }
  }

  function handleClosed(e){
    if(!isStarterGuiEvent(e)) return
    clearSession(e.player)
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
      customGuiButton:handleButton,
      customGuiClosed:handleClosed
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
    GUI_ID:GUI_ID,
    isStarterGuiEvent:isStarterGuiEvent,
    open:open,
    customGuiButton:handleButton,
    customGuiClosed:handleClosed
  }
})()

var __dcStarterPrevCustomGuiButton = typeof customGuiButton === "function" && customGuiButton.__dcStarterDirect !== true ? customGuiButton : null
var __dcStarterPrevCustomGuiClosed = typeof customGuiClosed === "function" && customGuiClosed.__dcStarterDirect !== true ? customGuiClosed : null

var customGuiButton = function(e){
  if(StarterSelectEditorModule.isStarterGuiEvent(e)){
    try{
      StarterSelectEditorModule.customGuiButton(e)
    }catch(err){
      try{ if(e && e.player) e.player.message("Starter editor button error: " + String(err)) }catch(ignore){}
    }
    return
  }
  if(typeof __dcStarterPrevCustomGuiButton === "function") __dcStarterPrevCustomGuiButton(e)
}

var customGuiClosed = function(e){
  if(StarterSelectEditorModule.isStarterGuiEvent(e)){
    try{
      StarterSelectEditorModule.customGuiClosed(e)
    }catch(err){
      try{ if(e && e.player) e.player.message("Starter editor close error: " + String(err)) }catch(ignore){}
    }
    return
  }
  if(typeof __dcStarterPrevCustomGuiClosed === "function") __dcStarterPrevCustomGuiClosed(e)
}

try{ customGuiButton.__dcStarterDirect = true }catch(err0){}
try{ customGuiClosed.__dcStarterDirect = true }catch(err1){}
