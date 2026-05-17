var StarterSelectAPI = Java.type("noppes.npcs.api.NpcAPI").Instance()
var StarterSelectCobblemon = Java.type("com.cobblemon.mod.common.Cobblemon").INSTANCE
var StarterSelectPokemonSpecies = Java.type("com.cobblemon.mod.common.api.pokemon.PokemonSpecies")

var StarterSelectionModule = (function(){
  var OVERLAY_NAME = "starter_selection"
  var OVERLAY_HTML = "html/addon_select_starting/select_starting.html"
  var DEFAULT_POKEMON = "sylveon"
  var DEFAULT_LEVEL = 5

  function toInt(value, fallback){
    var n = parseInt(String(value), 10)
    return isNaN(n) ? fallback : n
  }

  function cleanPokemonName(value){
    var name = String(value || DEFAULT_POKEMON).replace(/[^A-Za-z0-9_:-]/g, "").toLowerCase()
    return name || DEFAULT_POKEMON
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

  function normalizeOpts(opts){
    opts = opts && typeof opts === "object" ? opts : {}
    var level = Math.max(1, Math.min(100, toInt(opts.level != null ? opts.level : opts.lvl, DEFAULT_LEVEL)))
    return {
      pokemon:cleanPokemonName(opts.pokemon || opts.species || DEFAULT_POKEMON),
      level:level,
      htmlPath:String(opts.htmlPath || opts.overlayHtml || OVERLAY_HTML)
    }
  }

  function getTypes(name){
    var species = StarterSelectPokemonSpecies.getByName(name)
    if(!species) return { type1:"", type2:"" }
    var types = species.getStandardForm().getTypes()
    return {
      type1:types.size() > 0 ? String(types.get(0).getName()).toLowerCase() : "",
      type2:types.size() > 1 ? String(types.get(1).getName()).toLowerCase() : ""
    }
  }

  function pokeModelNBT(name){
    return '{id:"cobblemon:pokemon_model",count:1,components:{"cobblemon:pokemon_item":{species:"cobblemon:' + cleanPokemonName(name) + '",aspects:[]}}}'
  }

  function buildInitData(opts){
    var types = getTypes(opts.pokemon)
    var items = [{
      slot:0,
      item:"cobblemon:pokemon_model",
      count:1,
      scale:6,
      name:opts.pokemon,
      type1:types.type1,
      type2:types.type2,
      nbt:pokeModelNBT(opts.pokemon)
    }]
    return {
      overlayName:OVERLAY_NAME,
      pokemon:opts.pokemon,
      level:opts.level,
      lvl:opts.level,
      type1:types.type1,
      type2:types.type2,
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

  function open(target, maybeNpc, maybeOpts){
    var ctx = getContext(target, maybeNpc, maybeOpts)
    if(!ctx || !ctx.player) return null
    var opts = normalizeOpts(ctx.opts)
    try{
      if(typeof cnpcext === "undefined" || !cnpcext || typeof cnpcext.openHtmlGui !== "function") return null
      var initData = JSON.stringify(buildInitData(opts))
      var handle = cnpcext.openHtmlGui(ctx.player, opts.htmlPath, 0.5, 0.5, initData)
      playCry(ctx.player, opts.pokemon, 0.6)
      return handle
    }catch(err){
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
    if(!e || !e.player) return
    var payload = parsePayload(e.data)
    var overlay = String(payload.overlayName || payload.__overlayName || "")
    if(overlay && overlay !== OVERLAY_NAME) return
    if(e.eventName === "pokeCry"){
      playCry(e.player, payload.pokemon || DEFAULT_POKEMON, 0.4)
      return
    }
    if(e.eventName === "select"){
      var pokemon = cleanPokemonName(payload.pokemon || DEFAULT_POKEMON)
      var level = Math.max(1, Math.min(100, toInt(payload.level != null ? payload.level : payload.lvl, DEFAULT_LEVEL)))
      StarterSelectAPI.executeCommand(e.player.getWorld(), "/pokegiveother " + e.player.getName() + " " + pokemon + " lvl=" + level)
      e.player.message("You selected: " + pokemon)
      return
    }
  }

  if(typeof NpcEventModule !== "undefined" && NpcEventModule && typeof NpcEventModule.registerModule === "function"){
    NpcEventModule.registerModule("starter_selection_overlay", {
      events:{
        htmlGuiEvent:function(e){
          handleHtmlEvent(e)
        }
      }
    })
  }

  return {
    OVERLAY_NAME:OVERLAY_NAME,
    OVERLAY_HTML:OVERLAY_HTML,
    open:open,
    handleHtmlEvent:handleHtmlEvent,
    getTypes:getTypes,
    pokeModelNBT:pokeModelNBT
  }
})()

function interact(e){
  return StarterSelectionModule.open(e, null, {})
}

function htmlGuiEvent(e){
  return StarterSelectionModule.handleHtmlEvent(e)
}

function jsCall(e, opts){
  return StarterSelectionModule.open(e, null, opts || {})
}
