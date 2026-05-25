var StarterSelectEditorAPI = Java.type("noppes.npcs.api.NpcAPI").Instance()

var StarterSelectEditorModule = (function(){
  var ADDON_ID = "dc_starter_select_editor"
  var GUI_ID = 735
  var GUI_W = 440
  var GUI_H = 270
  var PAGE_SIZE = 6
  var sessions = {}

  var ID = {
    BTN_SAVE:20,
    BTN_CLOSE:21,
    BTN_PREV:22,
    BTN_NEXT:23,
    BTN_BACK:24,
    BTN_ADD:25,
    BTN_REMOVE:26,
    BTN_SHINY:27,
    BTN_ROW_START:100,
    TXT_SPECIES:200,
    TXT_LABEL:201,
    TXT_LEVEL:202,
    TXT_GENDER:203,
    TXT_NATURE:204,
    TXT_ABILITY:205
  }

  function key(player){
    return String(player.getUUID())
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
    var FileWriter = Java.type("java.io.FileWriter")
    var parent = file.getParentFile()
    var fw = null
    try{
      if(parent && !parent.exists()) parent.mkdirs()
      fw = new FileWriter(file, false)
      fw.write(String(text || ""))
      fw.flush()
    }finally{
      if(fw) fw.close()
    }
  }

  function readStarter(path){
    var file = resolveFile(path)
    var json
    if(!file || !file.exists()) throw new Error("Starter JSON not found: " + normalizeStarterPath(path))
    json = JSON.parse(readTextFile(file))
    if(!json || typeof json !== "object") json = {}
    if(!(json.choices instanceof Array)) json.choices = []
    return { file:file, json:json }
  }

  function saveStarter(session){
    writeTextFile(session.file, JSON.stringify(session.json, null, 2))
  }

  function statBlock(maxValue){
    return { hp:0, atk:0, def:0, spatk:0, spdef:0, speed:0 }
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
      ivs:statBlock(31),
      evs:statBlock(252)
    }
  }

  function choices(session){
    if(!session.json.choices || !(session.json.choices instanceof Array)) session.json.choices = []
    return session.json.choices
  }

  function selectedChoice(session){
    var list = choices(session)
    if(!list.length) list.push(defaultChoice())
    if(session.index < 0) session.index = 0
    if(session.index >= list.length) session.index = Math.max(0, list.length - 1)
    return list[session.index] || null
  }

  function choiceLabel(choice, index){
    if(!choice) return "(empty)"
    return String(index + 1) + ". " + String(choice.label || choice.species || "pokemon") + " Lv." + String(choice.level || 1)
  }

  function setText(field, value){
    if(field && typeof field.setText === "function") field.setText(String(value == null ? "" : value))
  }

  function getText(gui, id, fallback){
    var c
    try{
      c = gui.getComponent(id)
      if(c && typeof c.getText === "function") return String(c.getText())
    }catch(err){}
    return String(fallback == null ? "" : fallback)
  }

  function applyFields(gui, session){
    var choice = selectedChoice(session)
    var species, level
    if(!choice || !gui) return
    species = cleanToken(getText(gui, ID.TXT_SPECIES, choice.species || "sylveon")) || "sylveon"
    level = Math.max(1, Math.min(100, toInt(getText(gui, ID.TXT_LEVEL, choice.level || 5), choice.level || 5)))
    choice.species = species
    choice.pokemon = species
    choice.id = cleanToken(choice.id || species) || species
    choice.label = String(getText(gui, ID.TXT_LABEL, choice.label || species) || species)
    choice.level = level
    choice.gender = cleanToken(getText(gui, ID.TXT_GENDER, choice.gender || ""))
    choice.nature = cleanToken(getText(gui, ID.TXT_NATURE, choice.nature || ""))
    choice.ability = cleanToken(getText(gui, ID.TXT_ABILITY, choice.ability || ""))
    if(!(choice.moveset instanceof Array)) choice.moveset = ["", "", "", ""]
    if(!choice.ivs || typeof choice.ivs !== "object") choice.ivs = statBlock(31)
    if(!choice.evs || typeof choice.evs !== "object") choice.evs = statBlock(252)
  }

  function showEditor(player){
    var session = sessions[key(player)]
    var list, choice, g, i, idx, btn, speciesField, labelField, levelField, genderField, natureField, abilityField
    if(!session) return
    list = choices(session)
    choice = selectedChoice(session)
    g = StarterSelectEditorAPI.createCustomGui(GUI_ID, GUI_W, GUI_H, false, player)
    g.addLabel(1, "Starter Pokemon List", 10, 8, 180, 12)
    g.addLabel(2, session.jsonPath, 10, 22, 260, 12)
    g.addLabel(3, "Choices", 10, 44, 90, 12)
    for(i = 0; i < PAGE_SIZE; i++){
      idx = session.page * PAGE_SIZE + i
      btn = g.addButton(ID.BTN_ROW_START + i, idx < list.length ? choiceLabel(list[idx], idx) : "-", 10, 60 + i * 22, 150, 18)
      if(idx === session.index) btn.setLabel("[" + btn.getLabel() + "]")
      if(idx >= list.length) btn.setEnabled(false)
    }
    g.addButton(ID.BTN_PREV, "Prev", 10, 196, 45, 18)
    g.addButton(ID.BTN_NEXT, "Next", 60, 196, 45, 18)
    g.addButton(ID.BTN_ADD, "Add", 110, 196, 50, 18)
    g.addButton(ID.BTN_REMOVE, "Remove", 10, 218, 70, 18)

    g.addLabel(10, "Species", 180, 58, 80, 12)
    speciesField = g.addTextField(ID.TXT_SPECIES, 250, 54, 150, 18)
    setText(speciesField, choice.species || "")
    g.addLabel(11, "Label", 180, 82, 80, 12)
    labelField = g.addTextField(ID.TXT_LABEL, 250, 78, 150, 18)
    setText(labelField, choice.label || "")
    g.addLabel(12, "Level", 180, 106, 80, 12)
    levelField = g.addTextField(ID.TXT_LEVEL, 250, 102, 50, 18)
    setText(levelField, choice.level || 5)
    g.addLabel(13, "Gender", 180, 130, 80, 12)
    genderField = g.addTextField(ID.TXT_GENDER, 250, 126, 90, 18)
    setText(genderField, choice.gender || "")
    g.addLabel(14, "Nature", 180, 154, 80, 12)
    natureField = g.addTextField(ID.TXT_NATURE, 250, 150, 90, 18)
    setText(natureField, choice.nature || "")
    g.addLabel(15, "Ability", 180, 178, 80, 12)
    abilityField = g.addTextField(ID.TXT_ABILITY, 250, 174, 120, 18)
    setText(abilityField, choice.ability || "")
    g.addButton(ID.BTN_SHINY, choice.shiny === true ? "Shiny: On" : "Shiny: Off", 180, 202, 90, 18)

    g.addButton(ID.BTN_SAVE, "Save", 280, 228, 50, 20)
    g.addButton(ID.BTN_BACK, "NPC Editor", 334, 228, 82, 20)
    g.addButton(ID.BTN_CLOSE, "Close", 334, 8, 72, 20)
    player.showCustomGui(g)
  }

  function open(ctx){
    var player = ctx && ctx.player
    var path = ctx ? cleanPath(ctx.jsonPath || "") : ""
    var loaded
    if(!player) return false
    if(!path){
      player.message("Starter JSON path is empty.")
      return false
    }
    loaded = readStarter(path)
    sessions[key(player)] = {
      npc:ctx.npc || null,
      jsonPath:path,
      file:loaded.file,
      json:loaded.json,
      index:0,
      page:0
    }
    showEditor(player)
    return true
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

  function handleButton(e){
    var session = sessions[key(e.player)]
    var list, idx
    if(!session || e.gui.getID() !== GUI_ID) return
    list = choices(session)
    if(e.buttonId >= ID.BTN_ROW_START && e.buttonId < ID.BTN_ROW_START + PAGE_SIZE){
      applyFields(e.gui, session)
      idx = session.page * PAGE_SIZE + (e.buttonId - ID.BTN_ROW_START)
      if(idx >= 0 && idx < list.length){
        session.index = idx
        showEditor(e.player)
      }
      return
    }
    if(e.buttonId === ID.BTN_PREV){
      applyFields(e.gui, session)
      session.page = Math.max(0, session.page - 1)
      showEditor(e.player)
      return
    }
    if(e.buttonId === ID.BTN_NEXT){
      applyFields(e.gui, session)
      if((session.page + 1) * PAGE_SIZE < list.length) session.page++
      showEditor(e.player)
      return
    }
    if(e.buttonId === ID.BTN_ADD){
      applyFields(e.gui, session)
      list.push(defaultChoice())
      session.index = list.length - 1
      session.page = Math.floor(session.index / PAGE_SIZE)
      showEditor(e.player)
      return
    }
    if(e.buttonId === ID.BTN_REMOVE){
      if(list.length > 1){
        list.splice(session.index, 1)
        session.index = Math.min(session.index, list.length - 1)
      }
      showEditor(e.player)
      return
    }
    if(e.buttonId === ID.BTN_SHINY){
      applyFields(e.gui, session)
      selectedChoice(session).shiny = selectedChoice(session).shiny === true ? false : true
      showEditor(e.player)
      return
    }
    if(e.buttonId === ID.BTN_SAVE){
      applyFields(e.gui, session)
      saveStarter(session)
      e.player.message("Starter JSON saved: " + session.jsonPath)
      showEditor(e.player)
      return
    }
    if(e.buttonId === ID.BTN_BACK){
      backToNpcEditor(e.player)
      return
    }
    if(e.buttonId === ID.BTN_CLOSE){
      delete sessions[key(e.player)]
      e.player.closeGui()
      return
    }
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
