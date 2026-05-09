// GeckoLib/CNPC helper for Dochi dialogue FX.
// Uses CNPC-Gecko documented calls: setSkinTexture, setGecko*, createAnimBuilder, syncAnimationsFor.

var DcGeckoUtilModule = (function(){
  function text(value){
    return value == null ? "" : String(value).trim();
  }

  function callString(target, name, value){
    var v = text(value);
    if(!target || !v) return false;
    try{
      if(typeof target[name] === "function"){
        target[name](v);
        return true;
      }
    }catch(e){}
    return false;
  }

  function npcDisplay(npc){
    if(!npc) return null;
    try{ if(typeof npc.getDisplay === "function") return npc.getDisplay(); }catch(e0){}
    try{ return npc.display || null; }catch(e1){}
    return null;
  }

  function applyNpcSkin(npc, skinTexture){
    var skin = text(skinTexture);
    if(!npc || !skin) return false;
    var display = npcDisplay(npc);
    if(callString(display, "setSkinTexture", skin)) return true;
    return callString(npc, "setSkinTexture", skin);
  }

  function applyGeckoConfig(npc, cfg){
    if(!npc || !cfg) return false;
    var changed = false;
    changed = callString(npc, "setGeckoModel", cfg.geckoModel) || changed;
    changed = callString(npc, "setGeckoTexture", cfg.geckoTexture) || changed;
    changed = callString(npc, "setGeckoAnimationFile", cfg.geckoAnimationFile) || changed;
    changed = callString(npc, "setGeckoIdleAnimation", cfg.geckoAnimation) || changed;
    return changed;
  }

  function getApi(eventObj){
    try{ if(eventObj && eventObj.API && typeof eventObj.API.createAnimBuilder === "function") return eventObj.API; }catch(e0){}
    try{ if(typeof API !== "undefined" && API && typeof API.createAnimBuilder === "function") return API; }catch(e1){}
    return null;
  }

  function addAnimation(builder, mode, animation){
    var anim = text(animation);
    if(!builder || !anim) return false;
    var m = text(mode) || "thenPlay";
    try{ if(typeof builder[m] === "function"){ builder[m](anim); return true; } }catch(e0){}
    try{
      if(m === "thenLoop" && typeof builder.loop === "function"){ builder.loop(anim); return true; }
      if(m === "thenPlayAndHold" && typeof builder.playAndHold === "function"){ builder.playAndHold(anim); return true; }
      if(typeof builder.playOnce === "function"){ builder.playOnce(anim); return true; }
    }catch(e1){}
    return false;
  }

  function playNpcAnimation(eventObj, player, npc, cfg){
    if(!npc || !cfg) return false;
    var animation = text(cfg.geckoAnimation);
    if(!animation) return false;
    var api = getApi(eventObj);
    if(!api) return false;
    try{
      var builder = api.createAnimBuilder();
      if(!addAnimation(builder, cfg.geckoPlayMode, animation)) return false;
      if(player && typeof npc.syncAnimationsFor === "function"){
        npc.syncAnimationsFor(player, builder);
        return true;
      }
      if(typeof npc.syncAnimationsForAll === "function"){
        npc.syncAnimationsForAll(builder);
        return true;
      }
    }catch(e){}
    return false;
  }

  function applyNpcFx(eventObj, player, npc, fx){
    if(!fx || typeof fx !== "object") return false;
    var changed = false;
    changed = applyNpcSkin(npc, fx.skinTexture) || changed;
    changed = applyGeckoConfig(npc, fx) || changed;
    changed = playNpcAnimation(eventObj, player, npc, fx) || changed;
    return changed;
  }

  return {
    applyNpcSkin: applyNpcSkin,
    applyGeckoConfig: applyGeckoConfig,
    playNpcAnimation: playNpcAnimation,
    applyNpcFx: applyNpcFx
  };
})();

function dc_gecko_apply_npc_skin(npc, skinTexture){ return DcGeckoUtilModule.applyNpcSkin(npc, skinTexture); }
function dc_gecko_apply_config(npc, cfg){ return DcGeckoUtilModule.applyGeckoConfig(npc, cfg || {}); }
function dc_gecko_play_npc_animation(e, player, npc, cfg){ return DcGeckoUtilModule.playNpcAnimation(e, player, npc, cfg || {}); }
function dc_gecko_apply_npc_fx(e, player, npc, fx){ return DcGeckoUtilModule.applyNpcFx(e, player, npc, fx || {}); }
