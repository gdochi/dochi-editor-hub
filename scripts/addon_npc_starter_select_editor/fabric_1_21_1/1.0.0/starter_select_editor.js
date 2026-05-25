var StarterSelectEditorAPI = Java.type("noppes.npcs.api.NpcAPI").Instance()

var StarterSelectEditorModule = (function(){
  var ADDON_ID = "dc_starter_select_editor"
  var GUI_ID = 781
  var GUI_W = 620
  var GUI_H = 392
  var LIST_SIZE = 8
  var PICK_SIZE = 9
  var sessions = {}

  var TEMP = {
    NPC_UUID:"npc_editor_addon_edit_npc_uuid",
    JSON_PATH:"npc_editor_addon_edit_json_path"
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
    TXT_PICK_SEARCH:300,
    BTN_PICK_APPLY_SEARCH:301,
    BTN_PICK_PREV:302,
    BTN_PICK_NEXT:303,
    BTN_PICK_CANCEL:304,
    BTN_PICK_ROW_START:400
  }

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

  function addLabel(g, lidBox, text, x, y, w, h){
    g.addLabel(lidBox.id, String(text), x, y, w, h)
    lidBox.id++
  }

  function shortPath(path){
    var p = String(path || "")
    if(p.length <= 44) return p
    return "..." + p.substring(p.length - 41)
  }

  function gatherEditorFields(e, session){
    var c
    if(!e || !e.gui || !session || session.mode !== "edit") return
    c = activeChoice(session)
    session.json.title = getText(e.gui, ID.TXT_TITLE, session.json.title)
    session.json.subtitle = getText(e.gui, ID.TXT_SUBTITLE, session.json.subtitle)
    session.json.alreadyClaimedMessage = getText(e.gui, ID.TXT_CLAIMED, session.json.alreadyClaimedMessage)
    session.json.commandName = "pokegiveother"
    c.species = cleanToken(getText(e.gui, ID.TXT_SPECIES, c.species)) || "sylveon"
    c.pokemon = c.species
    c.id = c.species
    c.label = cap(c.species)
    c.level = Math.max(1, Math.min(100, toInt(getText(e.gui, ID.TXT_LEVEL, c.level), c.level || 5)))
    c.gender = optionalToken(getText(e.gui, ID.TXT_GENDER, c.gender))
    c.nature = optionalToken(getText(e.gui, ID.TXT_NATURE, c.nature))
    c.ability = optionalText(getText(e.gui, ID.TXT_ABILITY, c.ability))
    c.form = optionalText(getText(e.gui, ID.TXT_FORM, c.form))
    c.moveset = [
      getText(e.gui, ID.TXT_MOVE1, c.moveset[0]),
      getText(e.gui, ID.TXT_MOVE2, c.moveset[1]),
      getText(e.gui, ID.TXT_MOVE3, c.moveset[2]),
      getText(e.gui, ID.TXT_MOVE4, c.moveset[3])
    ]
    c.ivs = c.ivs || statBlock()
    c.evs = c.evs || statBlock()
    c.ivs.hp = Math.max(0, toInt(getText(e.gui, ID.TXT_IV_HP, c.ivs.hp), 0))
    c.ivs.atk = Math.max(0, toInt(getText(e.gui, ID.TXT_IV_ATK, c.ivs.atk), 0))
    c.ivs.def = Math.max(0, toInt(getText(e.gui, ID.TXT_IV_DEF, c.ivs.def), 0))
    c.ivs.spatk = Math.max(0, toInt(getText(e.gui, ID.TXT_IV_SPATK, c.ivs.spatk), 0))
    c.ivs.spdef = Math.max(0, toInt(getText(e.gui, ID.TXT_IV_SPDEF, c.ivs.spdef), 0))
    c.ivs.speed = Math.max(0, toInt(getText(e.gui, ID.TXT_IV_SPEED, c.ivs.speed), 0))
    c.evs.hp = Math.max(0, toInt(getText(e.gui, ID.TXT_EV_HP, c.evs.hp), 0))
    c.evs.atk = Math.max(0, toInt(getText(e.gui, ID.TXT_EV_ATK, c.evs.atk), 0))
    c.evs.def = Math.max(0, toInt(getText(e.gui, ID.TXT_EV_DEF, c.evs.def), 0))
    c.evs.spatk = Math.max(0, toInt(getText(e.gui, ID.TXT_EV_SPATK, c.evs.spatk), 0))
    c.evs.spdef = Math.max(0, toInt(getText(e.gui, ID.TXT_EV_SPDEF, c.evs.spdef), 0))
    c.evs.speed = Math.max(0, toInt(getText(e.gui, ID.TXT_EV_SPEED, c.evs.speed), 0))
  }

  function setField(component, value){
    setText(component, value)
  }

  function showEditor(player){
    var session = sessions[key(player)]
    var list, c, moves, g, lid, start, i, choice, rowLabel, f, x, statIds, labels, title, subtitle, claimed
    if(!session) return
    session.mode = "edit"
    list = choices(session)
    c = activeChoice(session)
    moves = normalizeMoves(c.moveset)
    c.ivs = normalizeStats(c.ivs)
    c.evs = normalizeStats(c.evs)
    if(session.page < 0) session.page = 0
    if(session.index < session.page * LIST_SIZE) session.page = Math.floor(session.index / LIST_SIZE)
    if(session.index >= (session.page + 1) * LIST_SIZE) session.page = Math.floor(session.index / LIST_SIZE)
    start = session.page * LIST_SIZE
    g = StarterSelectEditorAPI.createCustomGui(GUI_ID, GUI_W, GUI_H, false, player)
    lid = { id:1000 }

    addLabel(g, lid, tr(session, "starter_editor.title", "Starter Pokemon Editor"), 8, 6, 180, 12)
    addLabel(g, lid, shortPath(session.jsonPath), 8, 20, 230, 12)
    addLabel(g, lid, tr(session, "starter_editor.pokemon", "Pokemon") + " " + list.length, 8, 40, 130, 12)

    for(i = 0; i < LIST_SIZE; i++){
      choice = list[start + i]
      rowLabel = choice ? ((start + i === session.index ? "> " : "") + cap(choice.species || choice.id || "pokemon")) : "-"
      g.addButton(ID.BTN_ROW_START + i, rowLabel, 8, 56 + i * 20, 148, 18)
    }
    g.addButton(ID.BTN_PREV, "<", 8, 222, 34, 18)
    g.addButton(ID.BTN_NEXT, ">", 46, 222, 34, 18)
    g.addButton(ID.BTN_ADD, tr(session, "starter_editor.add", "Add"), 8, 248, 70, 20)
    g.addButton(ID.BTN_DUP, tr(session, "starter_editor.duplicate", "Duplicate"), 84, 248, 72, 20)
    g.addButton(ID.BTN_REMOVE, tr(session, "starter_editor.remove", "Remove"), 8, 272, 148, 20)

    addLabel(g, lid, tr(session, "starter_editor.list_settings", "List Settings"), 170, 40, 180, 12)
    addLabel(g, lid, tr(session, "starter_editor.title_field", "Title"), 170, 58, 46, 12)
    title = g.addTextField(ID.TXT_TITLE, 218, 54, 118, 18)
    setField(title, session.json.title || "")
    addLabel(g, lid, tr(session, "starter_editor.subtitle", "Subtitle"), 342, 58, 58, 12)
    subtitle = g.addTextField(ID.TXT_SUBTITLE, 404, 54, 142, 18)
    setField(subtitle, session.json.subtitle || "")
    g.addButton(ID.BTN_ONCE, (session.json.once ? "[X] " : "[ ] ") + tr(session, "starter_editor.once_per_player", "Once"), 170, 78, 92, 18)
    addLabel(g, lid, tr(session, "starter_editor.already_claimed", "Claimed Msg"), 270, 82, 72, 12)
    claimed = g.addTextField(ID.TXT_CLAIMED, 344, 78, 202, 18)
    setField(claimed, session.json.alreadyClaimedMessage || "")

    addLabel(g, lid, tr(session, "starter_editor.selected_pokemon", "Selected Pokemon"), 170, 106, 180, 12)
    addLabel(g, lid, tr(session, "starter_editor.species", "Species"), 170, 126, 48, 12)
    f = g.addTextField(ID.TXT_SPECIES, 220, 122, 96, 18)
    setField(f, c.species)
    g.addButton(ID.BTN_PICK_SPECIES, "...", 318, 122, 24, 18)
    addLabel(g, lid, tr(session, "starter_editor.level", "Level"), 348, 126, 36, 12)
    f = g.addTextField(ID.TXT_LEVEL, 386, 122, 34, 18)
    setField(f, String(c.level || 5))
    addLabel(g, lid, tr(session, "starter_editor.gender", "Gender"), 426, 126, 44, 12)
    f = g.addTextField(ID.TXT_GENDER, 472, 122, 48, 18)
    setField(f, c.gender || "")
    g.addButton(ID.BTN_PICK_GENDER, "...", 522, 122, 24, 18)
    g.addButton(ID.BTN_SHINY, (c.shiny ? "[X] " : "[ ] ") + tr(session, "starter_editor.shiny", "Shiny"), 472, 144, 74, 18)

    addLabel(g, lid, tr(session, "starter_editor.nature", "Nature"), 170, 150, 48, 12)
    f = g.addTextField(ID.TXT_NATURE, 220, 146, 80, 18)
    setField(f, c.nature || "")
    g.addButton(ID.BTN_PICK_NATURE, "...", 302, 146, 24, 18)
    addLabel(g, lid, tr(session, "starter_editor.ability", "Ability"), 332, 150, 46, 12)
    f = g.addTextField(ID.TXT_ABILITY, 380, 146, 80, 18)
    setField(f, c.ability || "")
    g.addButton(ID.BTN_PICK_ABILITY, "...", 462, 146, 24, 18)
    addLabel(g, lid, tr(session, "starter_editor.form", "Form"), 492, 150, 34, 12)
    f = g.addTextField(ID.TXT_FORM, 526, 146, 52, 18)
    setField(f, c.form || "")
    g.addButton(ID.BTN_PICK_FORM, "...", 580, 146, 24, 18)

    addLabel(g, lid, tr(session, "starter_editor.moves", "Moves"), 170, 178, 80, 12)
    f = g.addTextField(ID.TXT_MOVE1, 170, 194, 120, 18)
    setField(f, moves[0])
    g.addButton(ID.BTN_PICK_MOVE1, "...", 292, 194, 24, 18)
    f = g.addTextField(ID.TXT_MOVE2, 326, 194, 120, 18)
    setField(f, moves[1])
    g.addButton(ID.BTN_PICK_MOVE2, "...", 448, 194, 24, 18)
    f = g.addTextField(ID.TXT_MOVE3, 170, 216, 120, 18)
    setField(f, moves[2])
    g.addButton(ID.BTN_PICK_MOVE3, "...", 292, 216, 24, 18)
    f = g.addTextField(ID.TXT_MOVE4, 326, 216, 120, 18)
    setField(f, moves[3])
    g.addButton(ID.BTN_PICK_MOVE4, "...", 448, 216, 24, 18)

    labels = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"]
    statIds = [ID.TXT_IV_HP, ID.TXT_IV_ATK, ID.TXT_IV_DEF, ID.TXT_IV_SPATK, ID.TXT_IV_SPDEF, ID.TXT_IV_SPEED]
    addLabel(g, lid, tr(session, "starter_editor.ivs", "IVs"), 170, 246, 40, 12)
    for(i = 0; i < 6; i++){
      x = 210 + i * 55
      addLabel(g, lid, labels[i], x, 246, 28, 12)
      f = g.addTextField(statIds[i], x, 260, 44, 18)
      setField(f, String([c.ivs.hp, c.ivs.atk, c.ivs.def, c.ivs.spatk, c.ivs.spdef, c.ivs.speed][i]))
    }
    statIds = [ID.TXT_EV_HP, ID.TXT_EV_ATK, ID.TXT_EV_DEF, ID.TXT_EV_SPATK, ID.TXT_EV_SPDEF, ID.TXT_EV_SPEED]
    addLabel(g, lid, tr(session, "starter_editor.evs", "EVs"), 170, 288, 40, 12)
    for(i = 0; i < 6; i++){
      x = 210 + i * 55
      addLabel(g, lid, labels[i], x, 288, 28, 12)
      f = g.addTextField(statIds[i], x, 302, 44, 18)
      setField(f, String([c.evs.hp, c.evs.atk, c.evs.def, c.evs.spatk, c.evs.spdef, c.evs.speed][i]))
    }

    g.addButton(ID.BTN_BACK, tr(session, "starter_editor.npc_editor", "NPC Editor"), 342, 356, 92, 22)
    g.addButton(ID.BTN_SAVE, tr(session, "starter_editor.save", "Save"), 438, 356, 52, 22)
    g.addButton(ID.BTN_CLOSE, tr(session, "starter_editor.close", "Close"), 494, 356, 52, 22)
    player.showCustomGui(g)
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

  function showPicker(player){
    var session = sessions[key(player)]
    var g, lid, items, start, i, value, label, current, search
    if(!session) return
    session.mode = "picker"
    items = pickerItems(session)
    if(session.pickerPage < 0) session.pickerPage = 0
    if(session.pickerPage * PICK_SIZE >= items.length) session.pickerPage = Math.max(0, Math.floor((items.length - 1) / PICK_SIZE))
    start = session.pickerPage * PICK_SIZE
    current = currentPickerValue(session)
    g = StarterSelectEditorAPI.createCustomGui(GUI_ID, GUI_W, GUI_H, false, player)
    lid = { id:1000 }
    addLabel(g, lid, tr(session, "starter_editor.select", "Select") + ": " + pickerTitle(session), 14, 12, 220, 12)
    addLabel(g, lid, tr(session, "starter_editor.picker_current", "Current: {value}", { value:optionLabel(session, current) }), 14, 28, 260, 12)
    addLabel(g, lid, tr(session, "starter_editor.picker_direct", "Direct input is also available."), 14, 44, 260, 12)
    addLabel(g, lid, tr(session, "starter_editor.picker_search_placeholder", "Search"), 14, 68, 80, 12)
    search = g.addTextField(ID.TXT_PICK_SEARCH, 96, 64, 230, 18)
    setText(search, session.pickerSearch || "")
    g.addButton(ID.BTN_PICK_APPLY_SEARCH, tr(session, "npc_editor.apply", "Apply"), 332, 64, 58, 18)
    g.addButton(ID.BTN_PICK_CANCEL, tr(session, "npc_editor.cancel", "Cancel"), 444, 12, 82, 20)

    for(i = 0; i < PICK_SIZE; i++){
      value = items[start + i]
      label = value == null ? "-" : optionLabel(session, value)
      if(value != null && String(value) === String(current)) label = "> " + label
      g.addButton(ID.BTN_PICK_ROW_START + i, label, 14, 98 + i * 24, 300, 20)
    }
    g.addButton(ID.BTN_PICK_PREV, "<", 14, 326, 42, 20)
    g.addButton(ID.BTN_PICK_NEXT, ">", 62, 326, 42, 20)
    addLabel(g, lid, String(items.length) + " / " + String(session.pickerPage + 1), 114, 330, 120, 12)
    player.showCustomGui(g)
  }

  function openPicker(player, session, kind, target){
    session.pickerKind = kind
    session.pickerTarget = target
    session.pickerSearch = ""
    session.pickerPage = 0
    session.mode = "picker"
    showPicker(player)
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
    delete sessions[key(player)]
    player.closeGui()
    if(typeof tryOpenEditor === "function"){
      tryOpenEditor(player)
      return
    }
    player.message("NPC Editor is not loaded.")
  }

  function open(ctx){
    var player = ctx && ctx.player
    var temp, path, loaded
    if(!player) return false
    temp = player.getTempdata()
    path = cleanPath((ctx && ctx.jsonPath) || temp.get(TEMP.JSON_PATH) || "")
    if(!path){
      player.message("Starter JSON path is empty.")
      return false
    }
    loaded = readStarter(path)
    sessions[key(player)] = {
      player:player,
      npc:ctx.npc || null,
      npcUuid:String((ctx && ctx.uuid) || temp.get(TEMP.NPC_UUID) || ""),
      jsonPath:path,
      file:loaded.file,
      json:loaded.json,
      index:0,
      page:0,
      mode:"edit",
      pickerKind:"",
      pickerTarget:"",
      pickerSearch:"",
      pickerPage:0,
      i18n:buildEditorI18n(player)
    }
    showEditor(player)
    return true
  }

  function handlePickerButton(e, session){
    var items, idx
    if(e.buttonId === ID.BTN_PICK_CANCEL){
      session.mode = "edit"
      showEditor(e.player)
      return true
    }
    if(e.buttonId === ID.BTN_PICK_APPLY_SEARCH){
      session.pickerSearch = getText(e.gui, ID.TXT_PICK_SEARCH, "")
      session.pickerPage = 0
      showPicker(e.player)
      return true
    }
    if(e.buttonId === ID.BTN_PICK_PREV){
      session.pickerSearch = getText(e.gui, ID.TXT_PICK_SEARCH, session.pickerSearch)
      session.pickerPage = Math.max(0, session.pickerPage - 1)
      showPicker(e.player)
      return true
    }
    if(e.buttonId === ID.BTN_PICK_NEXT){
      session.pickerSearch = getText(e.gui, ID.TXT_PICK_SEARCH, session.pickerSearch)
      session.pickerPage++
      showPicker(e.player)
      return true
    }
    if(e.buttonId >= ID.BTN_PICK_ROW_START && e.buttonId < ID.BTN_PICK_ROW_START + PICK_SIZE){
      session.pickerSearch = getText(e.gui, ID.TXT_PICK_SEARCH, session.pickerSearch)
      items = pickerItems(session)
      idx = session.pickerPage * PICK_SIZE + (e.buttonId - ID.BTN_PICK_ROW_START)
      if(idx >= 0 && idx < items.length) applyPickerValue(session, items[idx])
      session.mode = "edit"
      showEditor(e.player)
      return true
    }
    return false
  }

  function handleButton(e){
    var session = sessions[key(e.player)]
    var list, idx, copy, c
    if(!session || !e.gui || e.gui.getID() !== GUI_ID) return
    if(session.mode === "picker"){
      handlePickerButton(e, session)
      return
    }
    gatherEditorFields(e, session)
    list = choices(session)
    if(e.buttonId >= ID.BTN_ROW_START && e.buttonId < ID.BTN_ROW_START + LIST_SIZE){
      idx = session.page * LIST_SIZE + (e.buttonId - ID.BTN_ROW_START)
      if(idx >= 0 && idx < list.length) session.index = idx
      showEditor(e.player)
      return
    }
    if(e.buttonId === ID.BTN_PREV){ session.page = Math.max(0, session.page - 1); showEditor(e.player); return }
    if(e.buttonId === ID.BTN_NEXT){ if((session.page + 1) * LIST_SIZE < list.length) session.page++; showEditor(e.player); return }
    if(e.buttonId === ID.BTN_ADD){
      list.push(defaultChoice())
      session.index = list.length - 1
      session.page = Math.floor(session.index / LIST_SIZE)
      showEditor(e.player)
      return
    }
    if(e.buttonId === ID.BTN_DUP){
      copy = JSON.parse(JSON.stringify(activeChoice(session)))
      copy.id = cleanToken(copy.id + "_copy")
      list.splice(session.index + 1, 0, copy)
      session.index++
      session.page = Math.floor(session.index / LIST_SIZE)
      showEditor(e.player)
      return
    }
    if(e.buttonId === ID.BTN_REMOVE){
      if(list.length <= 1){
        e.player.message(tr(session, "starter_editor.one_required", "At least one Pokemon is required."))
        showEditor(e.player)
        return
      }
      list.splice(session.index, 1)
      session.index = Math.max(0, Math.min(session.index, list.length - 1))
      session.page = Math.floor(session.index / LIST_SIZE)
      showEditor(e.player)
      return
    }
    if(e.buttonId === ID.BTN_ONCE){ session.json.once = !session.json.once; showEditor(e.player); return }
    if(e.buttonId === ID.BTN_SHINY){ c = activeChoice(session); c.shiny = !c.shiny; showEditor(e.player); return }
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
      showEditor(e.player)
      return
    }
    if(e.buttonId === ID.BTN_BACK){ backToNpcEditor(e.player); return }
    if(e.buttonId === ID.BTN_CLOSE){ delete sessions[key(e.player)]; e.player.closeGui(); return }
  }

  function handleClosed(e){
    if(!e || !e.gui || e.gui.getID() !== GUI_ID) return
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
    open:open,
    customGuiButton:handleButton,
    customGuiClosed:handleClosed
  }
})()
