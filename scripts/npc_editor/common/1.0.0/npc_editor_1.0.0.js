// @package npc_editor
// @version 1.0.0
// @file npc_editor.js

var CFG={HTML:"npc_editor.html",CMD_OPEN:"dochieditor",CMD_LIST:"dochieditorlist",CMD_ADD:"dochieditoradd",CMD_DELETE:"dochieditordelete"};
var API=Java.type("noppes.npcs.api.NpcAPI").Instance();
var ADMIN_CACHE=null;

function init(e){ensureAdminFile();resetEditorCommand();createEditorCommand();}

function htmlGuiEvent(e){var data={};try{if(e.data&&String(e.data)!=="")data=JSON.parse(String(e.data));}catch(err){print("[NPC_BROWSER] JSON parse failed: "+err);data={};}
if(e.eventName==="admin_bootstrap"){onAdminBootstrap(e,data);return;}
if(e.eventName==="admin_add"){onAdminAdd(e,data);return;}
if(e.eventName==="admin_remove"){onAdminRemove(e,data);return;}
if(e.eventName==="admin_reset"){onAdminReset(e,data);return;}
if(e.eventName==="keybind_save"){onKeybindSave(e,data);return;}
if(e.eventName==="admin_refresh"){pushAdminState(e.player);return;}
if(e.eventName==="npc_tp"){onNpcTp(e,data);return;}
if(e.eventName==="npc_delete"){onNpcDelete(e,data);return;}
if(e.eventName==="npc_script_info"){onNpcScriptInfo(e,data);return;}
if(e.eventName==="npc_script_apply"){onNpcScriptApply(e,data);return;}
if(e.eventName==="npc_script_file_list"){onNpcScriptFileList(e,data);return;}
if(e.eventName==="npc_refresh"){pushNpcList(e.player);return;}
if(e.eventName==="__guiClosed"){print("[NPC_BROWSER] gui closed");return;}}

function buildNpcBrowserInit(player){return buildNpcBrowserInitFromList(player,getWorldNpcList(player.world));}
function buildNpcBrowserInitFromList(player,list){
var npcs=[],factionsMap={},factions=[],i,n,name,title,faction,x,y,z,adminState=getClientAdminState(player);
for(i=0;i<list.length;i++){
n=list[i];
name="";
title="";
faction="";
x=Math.floor(Number(n.x));
y=Math.floor(Number(n.y));
z=Math.floor(Number(n.z));
try{name=String(n.display.getName());}catch(err){}
try{title=String(n.display.getTitle());}catch(err){}
try{if(n.getFaction())faction=String(n.getFaction().getName()||"");}catch(err){}
if(faction&&!factionsMap[faction]){
factionsMap[faction]=true;
factions.push(faction);
}
npcs.push({
uuid:String(n.getUUID()),
name:name,
title:title,
faction:faction,
position:x+", "+y+", "+z,
x:x,
y:y,
z:z
});
}
factions.sort();
return{npcs:npcs,factions:factions,admin:adminState};
}
function pushNpcList(player){pushBrowser(player,"npcListUpdate",buildNpcBrowserInit(player));}

function onNpcTp(e,data){var uuid=String(data.uuid||""),ctx,n;if(!canUseEditor(e.player)){pushBrowser(e.player,"npcActionResult",{ok:false,action:"tp",uuid:uuid,error:"No permission"});return;}ctx=getNpcContextByUuid(e.player.world,uuid);n=ctx.npc;if(!n){pushBrowser(e.player,"npcActionResult",{ok:false,action:"tp",uuid:uuid,error:"NPC not found"});return;}e.player.setPosition(Math.floor(Number(n.x)),Math.floor(Number(n.y)),Math.floor(Number(n.z)));pushBrowser(e.player,"npcActionResult",{ok:true,action:"tp",uuid:uuid});}
function onNpcDelete(e,data){var uuid=String(data.uuid||""),ctx,n;if(!canUseEditor(e.player)){pushBrowser(e.player,"npcActionResult",{ok:false,action:"delete",uuid:uuid,error:"No permission"});return;}ctx=getNpcContextByUuid(e.player.world,uuid);n=ctx.npc;if(!n){pushBrowser(e.player,"npcActionResult",{ok:false,action:"delete",uuid:uuid,error:"NPC not found"});return;}try{n.despawn();pushBrowser(e.player,"npcActionResult",{ok:true,action:"delete",uuid:uuid});pushBrowser(e.player,"npcListUpdate",buildNpcBrowserInitFromList(e.player,filterNpcListWithoutUuid(ctx.list,uuid)));}catch(err){pushBrowser(e.player,"npcActionResult",{ok:false,action:"delete",uuid:uuid,error:String(err)});}}
function onNpcScriptInfo(e,data){
var uuid=String(data.uuid||""),ctx,n,name="",rawNbt="",result;
if(!canUseEditor(e.player)){
pushBrowser(e.player,"npcScriptData",{ok:false,uuid:uuid,error:"No permission",scriptEnabled:true,tabs:[],flatFiles:[],flatInline:[]});
return;
}
ctx=getNpcContextByUuid(e.player.world,uuid);
n=ctx.npc;
if(!n){
pushBrowser(e.player,"npcScriptData",{ok:false,uuid:uuid,error:"NPC not found",scriptEnabled:true,tabs:[],flatFiles:[],flatInline:[]});
return;
}
try{name=String(n.display.getName());}catch(err){}
rawNbt=getEntityNbtSafe(n);
result=extractScriptTabsFromRaw(rawNbt);
pushBrowser(e.player,"npcScriptData",{ok:true,uuid:uuid,name:name,scriptEnabled:result.scriptEnabled,tabs:result.tabs,flatFiles:result.flatFiles,flatInline:result.flatInline});
}
function onNpcScriptApply(e,data){var uuid=String(data.uuid||""),ctx,n,raw,existing,tabs,newRaw,applyResult,scriptEnabled;if(!canUseEditor(e.player)){pushBrowser(e.player,"npcScriptApplyResult",{ok:false,uuid:uuid,error:"No permission"});return;}ctx=getNpcContextByUuid(e.player.world,uuid);n=ctx.npc;if(!n){pushBrowser(e.player,"npcScriptApplyResult",{ok:false,uuid:uuid,error:"NPC not found"});return;}raw=getEntityNbtSafe(n);existing=extractScriptTabsFromRaw(raw);tabs=normalizeIncomingTabs(data.tabs,existing.tabs);scriptEnabled=typeof data.scriptEnabled==='boolean'?data.scriptEnabled:existing.scriptEnabled;newRaw=replaceScriptsSection(raw,tabs,scriptEnabled);if(!newRaw||newRaw===raw&&(!sameTabShape(existing.tabs,tabs)||existing.scriptEnabled!==scriptEnabled)){pushBrowser(e.player,"npcScriptApplyResult",{ok:false,uuid:uuid,error:"Failed to rebuild Scripts section"});return;}applyResult=setEntityNbtSafe(n,newRaw);if(!applyResult.ok){pushBrowser(e.player,"npcScriptApplyResult",{ok:false,uuid:uuid,error:applyResult.error||"setEntityNbt failed"});return;}onNpcScriptInfo(e,{uuid:uuid});pushBrowser(e.player,"npcScriptApplyResult",{ok:true,uuid:uuid});}
function onNpcScriptFileList(e,data){var found,files,root,query,out,i,s;if(!canUseEditor(e.player)){pushBrowser(e.player,"npcScriptFileList",{ok:false,root:"",files:[],error:"No permission"});return;}found=listEcmaScriptFiles();files=found.files||[];root=found.root||"";query=String(data.query||"").toLowerCase();out=[];if(query){for(i=0;i<files.length;i++){s=files[i];if(String(s).toLowerCase().indexOf(query)>=0)out.push(s);}}else out=files;pushBrowser(e.player,"npcScriptFileList",{ok:true,root:root,files:out});}
function onAdminBootstrap(e,data){var res=bootstrapOwner(e.player);pushBrowser(e.player,"adminBootstrapResult",res);pushAdminState(e.player);}
function onAdminAdd(e,data){var res=addAdminEntry(e.player,data);pushBrowser(e.player,"adminActionResult",res);pushAdminState(e.player);}
function onAdminRemove(e,data){var res=removeAdminEntry(e.player,data);pushBrowser(e.player,"adminActionResult",res);pushAdminState(e.player);}
function onAdminReset(e,data){var res=resetAdminFile(e.player);pushBrowser(e.player,"adminActionResult",res);pushBrowser(e.player,"adminState",buildClientAdminState(e.player,ADMIN_CACHE||defaultAdminData()));}
function onKeybindSave(e,data){var res=savePlayerKeybind(e.player,data);pushBrowser(e.player,"adminActionResult",res);pushAdminState(e.player);}

function tryOpenEditor(player){var guard,payload;guard=getOpenGuard(player);if(!guard.ok){notifyPlayer(player,guard.error||"No permission");return false;}payload=JSON.stringify(buildNpcBrowserInit(player));return openHtmlGuiForPlayer(player,payload);}
function getOpenGuard(player){var admin=touchAdminDataForPlayer(player);if(!admin.initialized)return {ok:true,admin:admin};if(isOwner(player,admin)||isAdmin(player,admin))return {ok:true,admin:admin};return {ok:false,error:"No permission",admin:admin};}
function pushAdminState(player){pushBrowser(player,"adminState",getClientAdminState(player));}
function getClientAdminState(player){return buildClientAdminState(player,touchAdminDataForPlayer(player));}
function buildClientAdminState(player,admin){admin=admin||defaultAdminData();return {initialized:!!admin.initialized,owner:admin.owner||emptyAdminEntry(),admins:admin.admins||[],players:listOnlinePlayers(player&&player.world?player.world:null),keybind:getPlayerKeybind(player),isOwner:isOwner(player,admin),isAdmin:isAdmin(player,admin),canOpen:!admin.initialized||isOwner(player,admin)||isAdmin(player,admin),canManageAdmins:isOwner(player,admin)};}
function resetEditorCommand(){
var worlds=API.getIWorlds(),world=worlds&&worlds.length?worlds[0]:null;
if(!world)return;
API.executeCommand(world,"/cnpcext command delete "+CFG.CMD_OPEN);
API.executeCommand(world,"/cnpcext command delete "+CFG.CMD_LIST);
API.executeCommand(world,"/cnpcext command delete "+CFG.CMD_ADD);
API.executeCommand(world,"/cnpcext command delete "+CFG.CMD_DELETE);
}
function createEditorCommand(){
var worlds=API.getIWorlds(),world=worlds&&worlds.length?worlds[0]:null;
if(!world)return;
API.executeCommand(world,"/cnpcext command create "+CFG.CMD_OPEN);
API.executeCommand(world,"/cnpcext command create "+CFG.CMD_LIST);
API.executeCommand(world,"/cnpcext command create "+CFG.CMD_ADD+" player:target");
API.executeCommand(world,"/cnpcext command create "+CFG.CMD_DELETE+" string:target");
}
function customCommand(e){handleEditorCommand(e);}
function handleEditorCommand(e){
var name=safeCommandName(e),args=safeCommandArgs(e),player=e&&e.player?e.player:null;
if(name===CFG.CMD_OPEN){
tryOpenEditor(player);
return;
}
if(name===CFG.CMD_LIST){handleListCommand(player);return;}
if(name===CFG.CMD_ADD){handleAddCommand(player,args);return;}
if(name===CFG.CMD_DELETE){handleDeleteCommand(player,args);return;}
}
function handleListCommand(player){
var admin=touchAdminDataForPlayer(player);
if(!admin.initialized){notifyPlayer(player,"Owner is not initialized. Open the editor and bootstrap owner first.");return;}
if(!isOwner(player,admin)){notifyPlayer(player,"Owner only");return;}
showAdminOverview(player,admin);
}
function handleAddCommand(player,args){
var token=args.length?String(args[0]):"",admin=touchAdminDataForPlayer(player),entry,res;
if(!admin.initialized){notifyPlayer(player,"Owner is not initialized. Open the editor and bootstrap owner first.");return;}
if(!isOwner(player,admin)){notifyPlayer(player,"Owner only");return;}
if(!token){showServerPlayerList(player);return;}
entry=resolveOnlinePlayerTarget(player,token);
if(!entry||!entry.uuid){notifyPlayer(player,"Usage: /"+CFG.CMD_ADD+" <player>");return;}
res=addAdminEntry(player,entry);
notifyPlayer(player,res.ok?"Admin added: "+(entry.name||entry.uuid):String(res.error||"Admin add failed"));
}
function handleDeleteCommand(player,args){
var token=args.length?String(args[0]):"",admin=touchAdminDataForPlayer(player),entry,res;
if(!admin.initialized){notifyPlayer(player,"Owner is not initialized. Open the editor and bootstrap owner first.");return;}
if(!isOwner(player,admin)){notifyPlayer(player,"Owner only");return;}
if(!token){showRemovableAdminList(player,admin);return;}
entry=resolveExistingAdminTarget(token,admin);
if(!entry||!entry.uuid){notifyPlayer(player,"Usage: /"+CFG.CMD_DELETE+" <adminName>");return;}
res=removeAdminEntry(player,{uuid:entry.uuid});
notifyPlayer(player,res.ok?"Admin deleted: "+(entry.name||entry.uuid):String(res.error||"Admin delete failed"));
}
function showAdminOverview(player,admin){
showAdminList(player,admin);
showServerPlayerList(player);
}
function showAdminList(player,admin){
var i,entry;
notifyPlayer(player,"[dochieditor] Owner: "+formatAdminEntry(admin.owner));
if(admin.admins.length<=1){notifyPlayer(player,"[dochieditor] Admins: none");return;}
notifyPlayer(player,"[dochieditor] Admins:");
for(i=0;i<admin.admins.length;i++){
entry=admin.admins[i];
if(String(entry.uuid||"")===String(admin.owner.uuid||""))continue;
notifyPlayer(player," - "+formatAdminEntry(entry));
}
}
function showServerPlayerList(player){
var list=getAddablePlayers(player),i,entry;
if(!list.length){notifyPlayer(player,"[dochieditor] Addable players: none");return;}
notifyPlayer(player,"[dochieditor] Addable players:");
for(i=0;i<list.length;i++){
entry=list[i];
notifyPlayer(player," - "+formatAdminEntry(entry));
}
}
function showRemovableAdminList(player,admin){
var i,entry,hasAny=false;
notifyPlayer(player,"[dochieditor] Removable admins:");
for(i=0;i<admin.admins.length;i++){
entry=admin.admins[i];
if(String(entry.uuid||"")===String(admin.owner.uuid||""))continue;
hasAny=true;
notifyPlayer(player," - "+formatAdminEntry(entry));
}
if(!hasAny)notifyPlayer(player,"[dochieditor] Removable admins: none");
}
function formatAdminEntry(entry){var name=entry&&entry.name?String(entry.name):"",uuid=entry&&entry.uuid?String(entry.uuid):"";if(name&&uuid)return name+" ("+uuid+")";return name||uuid||"(empty)";}
function getAddablePlayers(player){
var list=getWorldPlayers(player.world),admin=touchAdminDataForPlayer(player),out=[],i,cur,uuid;
for(i=0;i<list.length;i++){
cur=list[i];
uuid=getPlayerUuid(cur);
if(!uuid)continue;
if(hasAdminUuid(admin.admins,uuid))continue;
out.push({uuid:uuid,name:safePlayerName(cur)});
}
return out;
}
function resolveOnlinePlayerTarget(player,token){
var out=null,list,i;
token=String(token||"").replace(/^\s+|\s+$/g,"");
if(!token)return null;
list=getAddablePlayers(player);
for(i=0;i<list.length;i++)if(String(list[i].uuid)===token)return list[i];
for(i=0;i<list.length;i++)if(String(list[i].name||"").toLowerCase()===token.toLowerCase())return list[i];
return null;
}
function resolveExistingAdminTarget(token,admin){
var out=null;
token=String(token||"").replace(/^\s+|\s+$/g,"");
if(!token)return null;
out=findAdminEntryByUuid(admin,token);if(out&&String(out.uuid)!==String(admin.owner.uuid||""))return out;
out=findAdminEntryByName(admin,token);if(out&&String(out.uuid)!==String(admin.owner.uuid||""))return out;
return null;
}
function findAdminEntryByUuid(admin,uuid){var list=admin&&admin.admins?admin.admins:[],i;for(i=0;i<list.length;i++)if(String(list[i].uuid)===String(uuid))return {uuid:String(list[i].uuid),name:String(list[i].name||"")};if(admin&&admin.owner&&String(admin.owner.uuid)===String(uuid))return {uuid:String(admin.owner.uuid),name:String(admin.owner.name||"")};return null;}
function findAdminEntryByName(admin,name){var list=admin&&admin.admins?admin.admins:[],needle=String(name).toLowerCase(),i;for(i=0;i<list.length;i++)if(String(list[i].name||"").toLowerCase()===needle)return {uuid:String(list[i].uuid),name:String(list[i].name||"")};if(admin&&admin.owner&&String(admin.owner.name||"").toLowerCase()===needle)return {uuid:String(admin.owner.uuid),name:String(admin.owner.name||"")};return null;}
function keyPressed(e){var player=e&&e.player?e.player:null;if(!player)return;if(matchesKeybind(player,e))tryOpenEditor(player);}
function openHtmlGuiForPlayer(player,payload){cnpcext.openHtmlGui(player,CFG.HTML,0,0,payload);return true;}

function getAdminFile(){var File=Java.type("java.io.File"),dirs=findAdminRoots(true),dir=dirs.length?dirs[0]:new File("customnpcs/scripts/admin");if(!dir.exists())dir.mkdirs();return new File(dir,"admin.json");}
function emptyAdminEntry(){return {uuid:"",name:""};}
function defaultAdminData(){return {initialized:false,owner:emptyAdminEntry(),admins:[]};}
function ensureAdminFile(){var file=getAdminFile(),data;if(!file.exists()){data=defaultAdminData();saveAdminData(data);ADMIN_CACHE=data;return data;}return loadAdminData();}
function loadAdminData(){var file=getAdminFile(),raw="",Scanner,data;try{if(!file.exists())return ensureAdminFile();Scanner=Java.type("java.util.Scanner");raw="";var sc=new Scanner(file,"UTF-8");while(sc.hasNextLine())raw+=String(sc.nextLine())+"\n";sc.close();data=raw?JSON.parse(String(raw)):defaultAdminData();}catch(err){print("[NPC_BROWSER] admin.json load failed: "+err);data=defaultAdminData();}ADMIN_CACHE=normalizeAdminData(data);return ADMIN_CACHE;}
function saveAdminData(data){var file=getAdminFile(),FileWriter=Java.type("java.io.OutputStreamWriter"),FileOut=Java.type("java.io.FileOutputStream"),writer,normalized=normalizeAdminData(data);try{writer=new FileWriter(new FileOut(file,false),"UTF-8");writer.write(JSON.stringify(normalized,null,2));writer.close();ADMIN_CACHE=normalized;return normalized;}catch(err){try{if(writer)writer.close();}catch(closeErr){}print("[NPC_BROWSER] admin.json save failed: "+err);return null;}}
function findAdminRoots(includeCreateTarget){var File=Java.type("java.io.File"),out=[],seen={},savesCandidates=[new File("saves"),new File("./saves")],baseCandidates=[new File("customnpcs/scripts/admin"),new File("./customnpcs/scripts/admin")],i,j,dir,list,child;for(i=0;i<savesCandidates.length;i++){dir=savesCandidates[i];if(!dir.exists()||!dir.isDirectory())continue;list=dir.listFiles();if(!list)continue;for(j=0;j<list.length;j++){child=list[j];if(child&&child.isDirectory())pushDirCandidate(out,seen,new File(child,"customnpcs/scripts/admin"),includeCreateTarget);}}for(i=0;i<savesCandidates.length;i++){dir=savesCandidates[i];if(dir.exists()&&dir.isDirectory())scanForAdminRoots(dir,0,4,out,seen,includeCreateTarget);}for(i=0;i<baseCandidates.length;i++)pushDirCandidate(out,seen,baseCandidates[i],includeCreateTarget);return out;}
function pushDirCandidate(out,seen,dir,includeMissing){var p;if(!dir)return;if(!includeMissing&&(!dir.exists()||!dir.isDirectory()))return;p=String(dir.getAbsolutePath()).replace(/\\/g,"/");if(seen[p])return;seen[p]=true;out.push(dir);}
function scanForAdminRoots(dir,depth,maxDepth,out,seen,includeMissing){var File=Java.type("java.io.File"),list,i,f,p;if(depth>maxDepth||!dir||!dir.exists()||!dir.isDirectory())return;list=dir.listFiles();if(!list)return;for(i=0;i<list.length;i++){f=list[i];if(!f||!f.isDirectory())continue;p=String(f.getAbsolutePath()).replace(/\\/g,"/");if(/\/customnpcs\/scripts$/i.test(p)){pushDirCandidate(out,seen,new File(f,"admin"),includeMissing);continue;}scanForAdminRoots(f,depth+1,maxDepth,out,seen,includeMissing);}}
function normalizeAdminData(data){var out=data||defaultAdminData();if(typeof out.initialized!=="boolean")out.initialized=!!out.initialized;out.owner=normalizeAdminEntry(out.owner);out.admins=normalizeAdminList(out.admins);if(out.initialized&&out.owner.uuid&&!hasAdminUuid(out.admins,out.owner.uuid))out.admins.unshift({uuid:out.owner.uuid,name:out.owner.name});return out;}
function normalizeAdminEntry(entry){entry=entry||{};return {uuid:String(entry.uuid||""),name:String(entry.name||"")};}
function normalizeAdminList(list){var out=[],seen={},i,cur;if(!Array.isArray(list))return out;for(i=0;i<list.length;i++){cur=normalizeAdminEntry(list[i]);if(!cur.uuid||seen[cur.uuid])continue;seen[cur.uuid]=true;out.push(cur);}return out;}
function touchAdminDataForPlayer(player){var admin=ADMIN_CACHE||loadAdminData(),changed=false,uuid=getPlayerUuid(player),name=safePlayerName(player),i;if(admin.owner.uuid&&admin.owner.uuid===uuid&&admin.owner.name!==name){admin.owner.name=name;changed=true;}for(i=0;i<admin.admins.length;i++)if(admin.admins[i].uuid===uuid&&admin.admins[i].name!==name){admin.admins[i].name=name;changed=true;}if(changed)admin=saveAdminData(admin)||admin;return admin;}
function isOwner(player,admin){admin=admin||ADMIN_CACHE||loadAdminData();return !!player&&!!admin.initialized&&String(admin.owner.uuid||"")===getPlayerUuid(player);}
function isAdmin(player,admin){admin=admin||ADMIN_CACHE||loadAdminData();return hasAdminUuid(admin.admins,getPlayerUuid(player));}
function hasAdminUuid(list,uuid){var i;for(i=0;i<(list?list.length:0);i++)if(String(list[i].uuid||"")===String(uuid||""))return true;return false;}
function bootstrapOwner(player){var admin=loadAdminData();if(admin.initialized)return {ok:false,error:"Admin system already initialized"};admin.initialized=true;admin.owner={uuid:getPlayerUuid(player),name:safePlayerName(player)};admin.admins=normalizeAdminList([admin.owner]);return saveAdminData(admin)?{ok:true,owner:admin.owner}:{ok:false,error:"Failed to save admin.json"};}
function addAdminEntry(player,data){var admin=touchAdminDataForPlayer(player),entry=normalizeAdminEntry(data),saved;if(!isOwner(player,admin))return {ok:false,error:"Owner only"};if(!entry.uuid)return {ok:false,error:"Admin uuid is required"};if(entry.uuid===String(admin.owner.uuid||""))return {ok:false,error:"Owner is already registered"};if(hasAdminUuid(admin.admins,entry.uuid))return {ok:false,error:"Admin already exists"};admin.admins.push(entry);saved=saveAdminData(admin);return saved?{ok:true,entry:entry}:{ok:false,error:"Failed to save admin.json"};}
function removeAdminEntry(player,data){var admin=touchAdminDataForPlayer(player),uuid=String((data&&data.uuid)||""),out=[],i,saved;if(!isOwner(player,admin))return {ok:false,error:"Owner only"};if(!uuid)return {ok:false,error:"Admin uuid is required"};if(uuid===String(admin.owner.uuid||""))return {ok:false,error:"Owner cannot be removed"};for(i=0;i<admin.admins.length;i++)if(String(admin.admins[i].uuid||"")!==uuid)out.push(admin.admins[i]);if(out.length===admin.admins.length)return {ok:false,error:"Admin not found"};admin.admins=out;saved=saveAdminData(admin);return saved?{ok:true,uuid:uuid}:{ok:false,error:"Failed to save admin.json"};}
function resetAdminFile(player){var file=getAdminFile();if(!isOwner(player,touchAdminDataForPlayer(player)))return {ok:false,error:"Owner only"};ADMIN_CACHE=defaultAdminData();try{if(file.exists()&&!file.delete())return {ok:false,error:"Failed to delete admin.json"};}catch(err){return {ok:false,error:String(err)};}return {ok:true};}
function canUseEditor(player){var admin=touchAdminDataForPlayer(player);return !admin.initialized||isOwner(player,admin)||isAdmin(player,admin);}
function savePlayerKeybind(player,data){var store=getPlayerStore(player),value=normalizeKeybindValue(data&&data.key),current;if(!store)return {ok:false,error:"Player store unavailable"};if(value&&!/^\d+$/.test(value))return {ok:false,error:"Key code must be numeric"};if(!value){clearPlayerStoreValue(store,"npc_browser_open_key");return {ok:true,key:""};}current=getPlayerStoreValue(store,"npc_browser_open_key");if(current===value)return {ok:true,key:value};setPlayerStoreValue(store,"npc_browser_open_key",value);return {ok:true,key:value};}
function getPlayerKeybind(player){var store=getPlayerStore(player),value=store?String(getPlayerStoreValue(store,"npc_browser_open_key")||""):"";return normalizeKeybindValue(value);}
function matchesKeybind(player,e){var wanted=getPlayerKeybind(player),pressed=normalizeKeybindValue(e&&e.key);if(!wanted||!pressed)return false;return pressed===wanted;}
function normalizeKeybindValue(v){v=String(v==null?"":v).replace(/^\s+|\s+$/g,"").toUpperCase();if(!v)return "";return v;}
function getPlayerStore(player){return player.getStoreddata();}
function getPlayerStoreValue(store,key){return store.get(String(key));}
function setPlayerStoreValue(store,key,value){store.put(String(key),String(value));return true;}
function clearPlayerStoreValue(store,key){store.remove(String(key));return true;}
function notifyPlayer(player,msg){if(!player||!msg)return;player.message(String(msg));}
function getPlayerUuid(player){return String(player.getUUID());}
function safePlayerName(player){return String(player.getName());}
function safeCommandName(e){return String(e.command||"");}
function safeCommandArgs(e){
var parsed,out=[];
if(!e||e.args==null)return out;
parsed=JSON.parse(String(e.args));
if(Array.isArray(parsed))return parsed;
if(parsed&&typeof parsed==="object"){
if(parsed.action!=null&&String(parsed.action)!=="")out.push(String(parsed.action));
if(parsed.target!=null&&String(parsed.target)!=="")out.push(String(parsed.target));
return out;
}
if(parsed==null||parsed==="")return out;
out.push(parsed);
return out;
}
function getWorldPlayers(world){return world.getAllPlayers()||[];}
function listOnlinePlayers(world){var list=getWorldPlayers(world),out=[],seen={},i,p,uuid,name;for(i=0;i<list.length;i++){p=list[i];uuid=getPlayerUuid(p);name=safePlayerName(p);if(!uuid||seen[uuid])continue;seen[uuid]=true;out.push({uuid:uuid,name:name});}out.sort(function(a,b){return String(a.name).localeCompare(String(b.name));});return out;}

function getWorldNpcList(world){try{return world.getAllEntities(2)||[];}catch(err){return [];}}
function getNpcContextByUuid(world,uuid){var n=null,list=[],i,cur;if(!uuid)return {npc:null,list:list};try{n=world.getEntity(uuid);if(n)return {npc:n,list:[n]};}catch(err){}list=getWorldNpcList(world);for(i=0;i<list.length;i++){cur=list[i];try{if(String(cur.getUUID())===uuid)return {npc:cur,list:list};}catch(err){}}return {npc:null,list:list};}
function filterNpcListWithoutUuid(list,uuid){var out=[],i,n;for(i=0;i<list.length;i++){n=list[i];try{if(String(n.getUUID())!==uuid)out.push(n);}catch(err){out.push(n);}}return out;}
function pushBrowser(player,eventName,obj){try{cnpcext.getClientBridge(player.getMCEntity()).sendToBrowser(String(eventName),JSON.stringify(obj));}catch(err){print("[NPC_BROWSER] push failed: "+err);}}

function getEntityNbtSafe(npc){var raw=String(cnpcext.entityNbt(npc));if(!raw)throw new Error("entityNbt returned empty data");if(raw.indexOf("Scripts")<0)throw new Error("Scripts section not found in entity NBT");return raw;}
function setEntityNbtSafe(npc,raw){var fields=extractWritableScriptFields(raw),expectedState,verification;if(!raw||!fields.ok)return {ok:false,error:fields.error||"Missing Scripts section"};expectedState=extractScriptTabsFromRaw(raw);cnpcext.setEntityNbt(npc,String(raw));verification=verifyEntityScriptWrite(npc,expectedState);if(!verification.ok)return verification;return {ok:true};}
function uuidToEntitySelector(uuid){var UUID=Java.type("java.util.UUID"),u=UUID.fromString(String(uuid)),msb=u.getMostSignificantBits(),lsb=u.getLeastSignificantBits();return '@e[limit=1,sort=nearest,nbt={UUID:[I;'+toSignedInt(msb>>32)+','+toSignedInt(msb)+','+toSignedInt(lsb>>32)+','+toSignedInt(lsb)+']}]';}
function toSignedInt(v){var x=Number(v&0xffffffff);if(x>2147483647)x-=4294967296;return String(Math.floor(x));}

function listEcmaScriptFiles(){var File=Java.type('java.io.File'),root=new File('customnpcs/scripts/ecmascript'),out=[];if(!root.exists()||!root.isDirectory())throw new Error("customnpcs/scripts/ecmascript not found");walkJsFiles(root,root,out);out.sort();return {root:String(root.getAbsolutePath()).replace(/\\/g,'/'),files:out};}
function findEcmaScriptRoots(){var File=Java.type('java.io.File'),out=[],seen={},baseCandidates=[new File('customnpcs/scripts/ecmascript'),new File('./customnpcs/scripts/ecmascript')],savesCandidates=[new File('saves'),new File('./saves')],i,j,dir,list,child;for(i=0;i<baseCandidates.length;i++)pushDirIfExists(out,seen,baseCandidates[i]);for(i=0;i<savesCandidates.length;i++){dir=savesCandidates[i];if(!dir.exists()||!dir.isDirectory())continue;list=dir.listFiles();if(!list)continue;for(j=0;j<list.length;j++){child=list[j];if(child&&child.isDirectory())pushDirIfExists(out,seen,new File(child,'customnpcs/scripts/ecmascript'));}}for(i=0;i<savesCandidates.length;i++){dir=savesCandidates[i];if(dir.exists()&&dir.isDirectory())scanForEcmaRoots(dir,0,4,out,seen);}return out;}
function pushDirIfExists(out,seen,dir){var p;if(!dir||!dir.exists()||!dir.isDirectory())return;p=String(dir.getAbsolutePath()).replace(/\\/g,'/');if(seen[p])return;seen[p]=true;out.push(dir);}
function scanForEcmaRoots(dir,depth,maxDepth,out,seen){var list,i,f,p;if(depth>maxDepth||!dir||!dir.exists()||!dir.isDirectory())return;list=dir.listFiles();if(!list)return;for(i=0;i<list.length;i++){f=list[i];if(!f||!f.isDirectory())continue;p=String(f.getAbsolutePath()).replace(/\\/g,'/');if(/\/customnpcs\/scripts\/ecmascript$/i.test(p)){pushDirIfExists(out,seen,f);continue;}scanForEcmaRoots(f,depth+1,maxDepth,out,seen);}}
function walkJsFiles(root,dir,out){var list=dir.listFiles(),i,f,rel;if(!list)return;for(i=0;i<list.length;i++){f=list[i];if(f.isDirectory())walkJsFiles(root,f,out);else if(String(f.getName()).toLowerCase().slice(-3)==='.js'){rel=String(root.toURI().relativize(f.toURI()).getPath()||'');if(rel)out.push(rel.replace(/\\/g,'/').replace(/\/$/,''));}}}

function extractScriptTabsFromRaw(raw){var out={scriptEnabled:true,tabs:[],flatFiles:[],flatInline:[]},scriptsField,body,items,i,item,tabInfo,j,fileSeen={},inlineSeen={},globalEnabled;if(!raw)return out;globalEnabled=extractPrimitiveField(raw,'ScriptEnabled');if(globalEnabled!==null)out.scriptEnabled=String(globalEnabled)!=='0b'&&String(globalEnabled)!=='false';scriptsField=findTopLevelField(raw,'Scripts');if(!scriptsField||scriptsField.valueType!=='list')return out;body=scriptsField.inner;items=splitTopLevelCompounds(body);for(i=0;i<items.length;i++){item=items[i];tabInfo=extractOneTabInfo(item,i+1);out.tabs.push(tabInfo);for(j=0;j<tabInfo.files.length;j++)if(!fileSeen[tabInfo.files[j]]){fileSeen[tabInfo.files[j]]=true;out.flatFiles.push(tabInfo.files[j]);}if(tabInfo.inlineScript!==null&&tabInfo.inlineScript!==''&&!inlineSeen[tabInfo.inlineScript]){inlineSeen[tabInfo.inlineScript]=true;out.flatInline.push({tab:tabInfo.tab,code:tabInfo.inlineScript});}}return out;}
function extractOneTabInfo(raw,tabNumber){var out={tab:tabNumber,hasInline:false,inlineScript:'',files:[]},scriptVal=extractQuotedField(raw,'Script'),scriptListBody,listItems,i,line;if(scriptVal!==null){out.inlineScript=normalizeInlineScriptText(scriptVal);out.hasInline=out.inlineScript!=='';}scriptListBody=extractListBody(raw,'ScriptList');if(scriptListBody!==null&&scriptListBody!==''){listItems=splitTopLevelCompounds(scriptListBody);for(i=0;i<listItems.length;i++){line=extractQuotedField(listItems[i],'Line');if(line!==null&&line!=='')out.files.push(line);}}return out;}
function normalizeIncomingTabs(incoming,existing){var arr=[],count=Math.max(Array.isArray(incoming)?incoming.length:0,Array.isArray(existing)?existing.length:0),i,src;if(count<=0)count=1;for(i=0;i<count;i++){src=(Array.isArray(incoming)&&incoming[i])?incoming[i]:((Array.isArray(existing)&&existing[i])?existing[i]:{});arr.push({tab:i+1,inlineScript:normalizeInlineScriptText(src.inlineScript),files:cleanFileList(src.files)});}return arr;}
function cleanFileList(files){var out=[],seen={},i,s;if(!Array.isArray(files))return out;for(i=0;i<files.length;i++){s=String(files[i]||'').replace(/^\s+|\s+$/g,'');if(!s||seen[s])continue;seen[s]=true;out.push(s);}return out;}
function normalizeInlineScriptText(s){var out=String(s==null?'':s).replace(/\r\n/g,'\n').replace(/\r/g,'');if(out.indexOf('\n')<0&&out.indexOf('\\n')>=0)out=out.replace(/\\n/g,'\n');return out;}

function replaceScriptsSection(raw,tabs,scriptEnabled){var raw2=replacePrimitiveField(raw,'ScriptEnabled',scriptEnabled?'1b':'0b'),field,built;if(!raw2)return raw2;field=findTopLevelField(raw2,'Scripts');if(!field||field.valueType!=='list')return raw2;built='Scripts:['+buildTabsNbt(tabs)+']';return raw2.substring(0,field.start)+built+raw2.substring(field.end);}
function buildTabsNbt(tabs){var out=[],i,t,j,files;for(i=0;i<tabs.length;i++){t=tabs[i]||{};files=[];for(j=0;j<(t.files?t.files.length:0);j++)files.push('{Line:"'+escapeNbtString(t.files[j])+'"}');out.push('{Console:[],Script:"'+escapeNbtString(t.inlineScript||'')+'",ScriptList:['+files.join(',')+']}');}return out.join(',');}
function escapeNbtString(s){return String(s==null?'':s).replace(/\\/g,'\\\\').replace(/\r/g,'').replace(/\n/g,'\\n').replace(/\t/g,'\\t').replace(/"/g,'\\"');}
function replacePrimitiveField(raw,key,newVal){var field=findTopLevelField(raw,key);if(!field||field.valueType!=='primitive')return raw;return raw.substring(0,field.valueStart)+String(newVal)+raw.substring(field.valueEnd);}

function extractPrimitiveField(raw,key){var field=findTopLevelField(raw,key);if(!field||field.valueType!=='primitive')return null;return raw.substring(field.valueStart,field.valueEnd);}
function extractQuotedField(raw,key){var marker1=key+':"',marker2=key+":'",start=raw.indexOf(marker1),quoteIdx,end;if(start>=0)quoteIdx=start+key.length+1;else{start=raw.indexOf(marker2);if(start<0)return null;quoteIdx=start+key.length+1;}end=findClosingQuote(raw,quoteIdx);if(end<0)return null;return unescapeNbtString(raw.substring(quoteIdx+1,end),raw.charAt(quoteIdx));}
function extractListBody(raw,key){var marker=key+':[',start=raw.indexOf(marker),openIdx,closeIdx;if(start<0)return null;openIdx=raw.indexOf('[',start);if(openIdx<0)return null;closeIdx=findMatchingBracket(raw,openIdx,'[',']');if(closeIdx<0)return null;return raw.substring(openIdx+1,closeIdx);}
function splitTopLevelCompounds(body){var out=[],i,ch,depthBrace=0,depthBracket=0,inQuote=false,quoteCh='',start=-1;for(i=0;i<body.length;i++){ch=body.charAt(i);if(inQuote){if(ch===quoteCh&&(countBackslashesBefore(body,i)%2)===0){inQuote=false;quoteCh='';}continue;}if(ch==='"'||ch==="'"){inQuote=true;quoteCh=ch;continue;}if(ch==='{'){if(depthBrace===0&&depthBracket===0)start=i;depthBrace++;continue;}if(ch==='}'){depthBrace--;if(depthBrace===0&&depthBracket===0&&start>=0){out.push(body.substring(start,i+1));start=-1;}continue;}if(ch==='[')depthBracket++;if(ch===']')depthBracket--;}return out;}
function findClosingQuote(str,quoteIdx){var q=str.charAt(quoteIdx),i;for(i=quoteIdx+1;i<str.length;i++)if(str.charAt(i)===q&&(countBackslashesBefore(str,i)%2)===0)return i;return -1;}
function countBackslashesBefore(str,idx){var c=0,i=idx-1;while(i>=0&&str.charAt(i)==='\\'){c++;i--;}return c;}
function findMatchingBracket(str,openIdx,openChar,closeChar){var depth=0,inQuote=false,quoteCh='',i,ch;for(i=openIdx;i<str.length;i++){ch=str.charAt(i);if(inQuote){if(ch===quoteCh&&(countBackslashesBefore(str,i)%2)===0){inQuote=false;quoteCh='';}continue;}if(ch==='"'||ch==="'"){inQuote=true;quoteCh=ch;continue;}if(ch===openChar)depth++;if(ch===closeChar){depth--;if(depth===0)return i;}}return -1;}
function unescapeNbtString(s,quoteChar){var out=String(s||'');try{out=out.replace(/\\\\/g,'\\');if(quoteChar==="'")out=out.replace(/\\'/g,"'");else out=out.replace(/\\"/g,'"');out=out.replace(/\\n/g,'\n');out=out.replace(/\\r/g,'\r');out=out.replace(/\\t/g,'\t');}catch(err){}return out;}
function findTopLevelField(raw,key){var i=0,len=raw?raw.length:0,ch,depthBrace=0,depthBracket=0,inQuote=false,quoteCh='',keyStart,keyEnd,colonIdx,valueStart,valueEnd,openIdx,closeIdx;for(i=0;i<len;i++){ch=raw.charAt(i);if(inQuote){if(ch===quoteCh&&(countBackslashesBefore(raw,i)%2)===0){inQuote=false;quoteCh='';}continue;}if(ch==='"'||ch==="'"){inQuote=true;quoteCh=ch;continue;}if(ch==='{'){depthBrace++;continue;}if(ch==='}'){depthBrace--;continue;}if(ch==='['){depthBracket++;continue;}if(ch===']'){depthBracket--;continue;}if(depthBrace===1&&depthBracket===0&&isKeyStart(raw,i)){keyStart=i;keyEnd=readKeyEnd(raw,keyStart);if(keyEnd<=keyStart)continue;if(raw.substring(keyStart,keyEnd)!==key)continue;colonIdx=skipWhitespace(raw,keyEnd);if(raw.charAt(colonIdx)!==':')continue;valueStart=skipWhitespace(raw,colonIdx+1);if(valueStart>=len)continue;if(raw.charAt(valueStart)==='['){openIdx=valueStart;closeIdx=findMatchingBracket(raw,openIdx,'[',']');if(closeIdx<0)return null;return {start:keyStart,valueStart:valueStart,valueEnd:closeIdx+1,end:closeIdx+1,inner:raw.substring(openIdx+1,closeIdx),valueType:'list'};}valueEnd=findPrimitiveEnd(raw,valueStart);return {start:keyStart,valueStart:valueStart,valueEnd:valueEnd,end:valueEnd,valueType:'primitive'};}}return null;}
function isKeyStart(raw,idx){var ch=raw.charAt(idx),prev=idx>0?raw.charAt(idx-1):'';if(!/[A-Za-z_]/.test(ch))return false;return idx===0||prev==='{'||prev===','||/\s/.test(prev);}
function readKeyEnd(raw,start){var i=start,ch;for(i=start;i<raw.length;i++){ch=raw.charAt(i);if(!/[A-Za-z0-9_]/.test(ch))break;}return i;}
function skipWhitespace(raw,idx){while(idx<raw.length&&/\s/.test(raw.charAt(idx)))idx++;return idx;}
function findPrimitiveEnd(raw,start){var i,ch,depthBrace=0,depthBracket=0,inQuote=false,quoteCh='';for(i=start;i<raw.length;i++){ch=raw.charAt(i);if(inQuote){if(ch===quoteCh&&(countBackslashesBefore(raw,i)%2)===0){inQuote=false;quoteCh='';}continue;}if(ch==='"'||ch==="'"){inQuote=true;quoteCh=ch;continue;}if(ch==='{'){depthBrace++;continue;}if(ch==='}'){if(depthBrace===0&&depthBracket===0)return i;depthBrace--;continue;}if(ch==='['){depthBracket++;continue;}if(ch===']'){if(depthBrace===0&&depthBracket===0)return i;depthBracket--;continue;}if(ch===','&&depthBrace===0&&depthBracket===0)return i;}return raw.length;}
function extractWritableScriptFields(raw){var scriptsField=findTopLevelField(raw,'Scripts');return {ok:!!scriptsField&&scriptsField.valueType==='list',scriptsBody:scriptsField&&scriptsField.valueType==='list'?scriptsField.inner:null,scriptEnabled:extractPrimitiveField(raw,'ScriptEnabled'),error:scriptsField&&scriptsField.valueType==='list'?'':"Top-level Scripts field not found"};}
function verifyEntityScriptWrite(npc,expectedState){var current=getEntityNbtSafe(npc),actual;if(!current)return {ok:false,error:"Unable to re-read Scripts after write"};actual=extractScriptTabsFromRaw(current);if(!sameScriptState(actual,expectedState))return {ok:false,error:"Scripts verification failed after write"};return {ok:true};}
function verifyCommandWrite(npc,expectedState,commandResult){if(commandResult===false||commandResult===0||commandResult==="0"||String(commandResult).toLowerCase()==='false')return {ok:false,error:"Command execution reported failure"};return verifyEntityScriptWrite(npc,expectedState);}
function sameTabShape(a,b){var i,j;if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length)return false;for(i=0;i<a.length;i++){if(String((a[i]&&a[i].inlineScript)||'')!==String((b[i]&&b[i].inlineScript)||''))return false;if(((a[i]&&a[i].files)||[]).length!==((b[i]&&b[i].files)||[]).length)return false;for(j=0;j<((a[i]&&a[i].files)||[]).length;j++)if(String(a[i].files[j])!==String(b[i].files[j]))return false;}return true;}
function sameScriptState(a,b){return !!a&&!!b&&!!Array.isArray(a.tabs)&&!!Array.isArray(b.tabs)&&!!sameTabShape(a.tabs,b.tabs)&&!!sameFlatInline(a.flatInline,b.flatInline)&&!!sameStringArray(a.flatFiles,b.flatFiles)&&!!Boolean(a.scriptEnabled)===!!Boolean(b.scriptEnabled);}
function sameFlatInline(a,b){var i;if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length)return false;for(i=0;i<a.length;i++){if(Number(a[i].tab)!==Number(b[i].tab))return false;if(String(a[i].code||'')!==String(b[i].code||''))return false;}return true;}
function sameStringArray(a,b){var i;if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length)return false;for(i=0;i<a.length;i++)if(String(a[i])!==String(b[i]))return false;return true;}
