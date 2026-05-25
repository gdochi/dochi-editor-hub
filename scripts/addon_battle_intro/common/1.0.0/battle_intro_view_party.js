var Cobblemon = Java.type("com.cobblemon.mod.common.Cobblemon").INSTANCE;
var PokemonSpecies = Java.type("com.cobblemon.mod.common.api.pokemon.PokemonSpecies");
var Files = Java.type("java.nio.file.Files");
var Paths = Java.type("java.nio.file.Paths");

var PokemonBattleIntroModule = (function () {
  var OVERLAY_NAME = "pokemon_battle_intro";
  var OVERLAY_HTML = "html/addon/battle_intro_view_party.html";
  var DEFAULT_NPC_TEAM = "verdantia_trainers/gryon_city/cimon.json";
  var PLAYER_ENTITY_SLOT = 99;
  var NPC_ENTITY_SLOT = 100;
  var PLAYER_PARTY_BASE = 0;
  var NPC_PARTY_BASE = 20;
  var TARGET_NAME_KEY = "dc_battle_intro_target_name";
  var callRegistry = {};
  function resolveEventPlayer(e) {
    if (!e) return null;
    if (e.player) return e.player;
    if (!e.npc || !e.npc.getWorld || typeof e.npc.getWorld !== "function") return null;
    var td = null;
    try { td = e.npc.getTempdata ? e.npc.getTempdata() : null; } catch (err0) { td = null; }
    if (!td || typeof td.get !== "function") return null;
    var name = String(td.get(TARGET_NAME_KEY) || "");
    if (!name) return null;
    try {
      return e.npc.getWorld().getPlayer(name);
    } catch (err1) {
      return null;
    }
  }
  function closeGuiFromEvent(e) {
    var p = resolveEventPlayer(e);
    try {
      if (p && typeof p.closeGui === "function") {
        p.closeGui();
        return true;
      }
    } catch (err) {}
    try {
      if (p && typeof cnpcext !== "undefined" && cnpcext && typeof cnpcext.closeOverlay === "function") {
        cnpcext.closeOverlay(p, String(OVERLAY_NAME));
        return true;
      }
    } catch (err2) {}
    return false;
  }

  function registerCall(name, fn) {
    if (!name || typeof fn !== "function") return;
    callRegistry[String(name)] = fn;
  }

  function call(name, target, maybeNpc, maybeOpts) {
    var key = String(name || "open");
    var fn = callRegistry[key] || callRegistry.open;
    if (typeof fn !== "function") return null;
    return fn(target, maybeNpc, maybeOpts || {});
  }
  function pokeModelNBT(name) {
    var sp = "cobblemon:" + String(name || "").toLowerCase();
    return '{id:"cobblemon:pokemon_model",count:1,components:{"cobblemon:pokemon_item":{species:"' + sp + '",aspects:[]}}}';
  }

  function createPlayerModel(player, world) {
    var model = world.createEntity("customnpcs:customnpc");
    model.display.setSkinPlayer(player.getName());
    model.display.setModelScale(4, 0, 0, 0);
    return model;
  }

  function readNpcTeam(path) {
    var text = new java.lang.String(Files.readAllBytes(Paths.get(path)));
    var data = JSON.parse(text);
    var out = [];
    if (!data || !Array.isArray(data.team)) return out;
    for (var i = 0; i < data.team.length; i++) {
      if (data.team[i] && data.team[i].species) out.push(String(data.team[i].species));
    }
    return out;
  }

  function getTypes(name) {
    var species = PokemonSpecies.getByName(name);
    if (!species) return { type1: "", type2: "" };
    var form = species.getStandardForm();
    var types = form.getTypes();
    var t1 = types.size() > 0 ? String(types.get(0).getName()).toLowerCase() : "";
    var t2 = types.size() > 1 ? String(types.get(1).getName()).toLowerCase() : "";
    return { type1: t1, type2: t2 };
  }

  function playerPartyItems(player) {
    var party = Cobblemon.storage.getParty(player.getMCEntity());
    var items = [];
    for (var i = 0; i < 6; i++) {
      var mon = party.get(i);
      if (!mon) continue;
      var species = mon.getSpecies();
      var name = String(species.getName()).toLowerCase();
      var type1 = String(species.getPrimaryType().getName()).toLowerCase();
      var secondary = species.getSecondaryType();
      var type2 = secondary ? String(secondary.getName()).toLowerCase() : "";
      items.push({
        slot: PLAYER_PARTY_BASE + i,
        item: "cobblemon:pokemon_model",
        count: 1,
        scale: 2,
        name: name,
        type1: type1,
        type2: type2,
        nbt: pokeModelNBT(name)
      });
    }
    return items;
  }

  function npcPartyItems(teamPath) {
    var items = [];
    var npcTeam = readNpcTeam(teamPath || DEFAULT_NPC_TEAM);
    for (var i = 0; i < npcTeam.length; i++) {
      var name = String(npcTeam[i]).toLowerCase();
      var types = getTypes(name);
      items.push({
        slot: NPC_PARTY_BASE + i,
        item: "cobblemon:pokemon_model",
        count: 1,
        scale: 2,
        name: name,
        type1: types.type1,
        type2: types.type2,
        nbt: pokeModelNBT(name)
      });
    }
    return items;
  }

  function buildOverlayData(player, npc, opts) {
    opts = opts || {};
    var world = player.getWorld();
    var playerModel = createPlayerModel(player, world);
    var npcModel = world.createEntity("customnpcs:customnpc");
    npcModel.setEntityNbt(npc.getEntityNbt());
    npcModel.display.setModelScale(4, 0, 0, 0);

    return {
      overlayName: OVERLAY_NAME,
      playerName: player.getName(),
      npcName: npc.display.getName(),
      timelineTicks: Math.max(1, util_toInt(opts.duration, 100)),
      fadeStartRatio: 0.8,
      fadeDurationRatio: 0.2,
      overlayItems: playerPartyItems(player)
        .concat(npcPartyItems(opts.npcTeamPath || DEFAULT_NPC_TEAM)),
      overlayEntities: [
        { slot: PLAYER_ENTITY_SLOT, nbt: cnpcext.entityNbt(playerModel), rotation: 205, followCursor: false, animate: false },
        { slot: NPC_ENTITY_SLOT, nbt: cnpcext.entityNbt(npcModel), rotation: 155, followCursor: false, animate: false }
      ]
    };
  }

  function getContext(target, maybeNpc, maybeOpts) {
    if (target && target.player && target.npc) {
      return { player: target.player, npc: target.npc, event: target, opts: maybeNpc || {} };
    }
    if (target && typeof target.getMCEntity === "function") {
      return { player: target, npc: maybeNpc, event: null, opts: maybeOpts || {} };
    }
    return null;
  }

  function open(target, maybeNpc, maybeOpts) {
    var ctx = getContext(target, maybeNpc, maybeOpts);
    if (!ctx || !ctx.player || !ctx.npc) {
      return null;
    }
    try {
      if (typeof cnpcext === "undefined" || !cnpcext || typeof cnpcext.openHtmlGui !== "function") {
        return null;
      }
      var data = buildOverlayData(ctx.player, ctx.npc, ctx.opts);
      var htmlPath = ctx.opts.overlayHtml || OVERLAY_HTML;
      try {
        if (ctx.npc && typeof ctx.npc.getTempdata === "function") {
          ctx.npc.getTempdata().put(TARGET_NAME_KEY, String(ctx.player.getName()));
        }
      } catch (errName) {}
      var handle = cnpcext.openHtmlGui(ctx.player, htmlPath, 0, 0, JSON.stringify(data));
      return handle;
    } catch (err) {
      return null;
    }
  }

  function handleHtmlEvent(e) {
    if (!e) return;
    var payload = e.data;
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch (err) {
        payload = null;
      }
    }
    if (payload && payload.__overlayName && payload.__overlayName !== OVERLAY_NAME) return;
    if (e.eventName === "battle_intro_done") {
      closeGuiFromEvent(e);
      return;
    }

    if (e.eventName === "__guiClosed") {
      return;
    }
  }

  registerCall("open", function (target, maybeNpc, maybeOpts) {
    return open(target, maybeNpc, maybeOpts);
  });

  if (typeof NpcEventModule !== "undefined" && NpcEventModule && typeof NpcEventModule.registerModule === "function") {
    NpcEventModule.registerModule("dc_battle_intro_overlay", {
      events: {
        htmlGuiEvent: function (e) {
          handleHtmlEvent(e);
        }
      }
    });
  }

  return {
    OVERLAY_NAME: OVERLAY_NAME,
    OVERLAY_HTML: OVERLAY_HTML,
    buildOverlayData: buildOverlayData,
    open: open,
    registerCall: registerCall,
    call: call,
    handleHtmlEvent: handleHtmlEvent,
    pokeModelNBT: pokeModelNBT,
    createPlayerModel: createPlayerModel,
    readNpcTeam: readNpcTeam,
    getTypes: getTypes
  };
})();

function openPokemonBattleIntro(e, opts) {
  return PokemonBattleIntroModule.open(e, null, opts || {});
}

function jsCall(e, opts) {
  return PokemonBattleIntroModule.call("open", e, null, opts || {});
}

var PokemonBattleIntro = PokemonBattleIntroModule;
