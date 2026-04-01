// @package npc_editor
// @version 7.0.0
// @file npc_editor_v7.js

var CFG={
HTML:"html/npc_editor.html",
DEFAULT_RANGE:48,
MIN_RANGE:8,
MAX_RANGE:128,
STYLE_KEY:"npc_browser_script_style",
CACHE_MAP_KEY:"npc_browser_cache_map",
CACHE_LIST_KEY:"npc_browser_cache_list",
CACHE_RANGE_KEY:"npc_browser_scan_range"
};
var API=Java.type("noppes.npcs.api.NpcAPI").Instance();
var HashMap=Java.type("java.util.HashMap");
var ArrayList=Java.type("java.util.ArrayList");
var ADMIN_CACHE=null;

function init(e){
var existed=adminFileExists();
ensureAdminFile();
if(!existed&&e&&e.player){
notifyPlayer(e.player,'Initial setup: type "@npceditor" in chat to launch the NPC Editor.');
tryOpenEditor(e.player);
}
}
function chat(e){if(String(e.message)!=="@npceditor")return;tryOpenEditor(e.player);e.setCanceled(true);}
function keyPressed(e){var p=e&&e.player?e.player:null;if(!p)return;if(matchesKeybind(p,e))tryOpenEditor(p);}

function htmlGuiEvent(e){
var data={};
try{if(e.data&&String(e.data)!=="")data=JSON.parse(String(e.data));}catch(err){data={};}
if(e.eventName==="admin_bootstrap"){onAdminBootstrap(e,data);return;}
if(e.eventName==="admin_add"){onAdminAdd(e,data);return;}
if(e.eventName==="admin_remove"){onAdminRemove(e,data);return;}
if(e.eventName==="admin_reset"){onAdminReset(e,data);return;}
if(e.eventName==="keybind_save"){onKeybindSave(e,data);return;}
if(e.eventName==="admin_refresh"){pushAdminState(e.player);return;}
if(e.eventName==="npc_refresh"){pushNpcList(e.player,normalizeScanRange(data.range));return;}
if(e.eventName==="npc_tp"){onNpcTp(e,data);return;}
if(e.eventName==="npc_delete"){onNpcDelete(e,data);return;}
if(e.eventName==="npc_script_info"){onNpcScriptInfo(e,data);return;}
if(e.eventName==="npc_script_apply"){onNpcScriptApply(e,data);return;}
if(e.eventName==="npc_script_file_list"){onNpcScriptFileList(e,data);return;}
}

function tryOpenEditor(player){
var range=normalizeScanRange(getStoredScanRange(player)),guard;
if(!adminFileExists()){
refreshNearbyCache(player,range);
cnpcext.openHtmlGui(player,CFG.HTML,0,0,JSON.stringify(buildNpcBrowserInit(player,range)));
return true;
}
guard=getOpenGuard(player);
if(!guard.ok){
notifyPlayer(player,guard.error||"No permission");
return false;
}
refreshNearbyCache(player,range);
cnpcext.openHtmlGui(player,CFG.HTML,0,0,JSON.stringify(buildNpcBrowserInit(player,range)));
return true;
}

function normalizeScanRange(v){
var n=parseInt(v,10);
if(isNaN(n))n=CFG.DEFAULT_RANGE;
if(n<CFG.MIN_RANGE)n=CFG.MIN_RANGE;
if(n>CFG.MAX_RANGE)n=CFG.MAX_RANGE;
n=Math.round(n/4)*4;
if(n<CFG.MIN_RANGE)n=CFG.MIN_RANGE;
if(n>CFG.MAX_RANGE)n=CFG.MAX_RANGE;
return n;
}
function getStoredScanRange(player){
var data=player.getStoreddata(),v="";
try{v=String(data.get(CFG.CACHE_RANGE_KEY)||"");}catch(err){v="";}
return normalizeScanRange(v);
}
function setStoredScanRange(player,range){
try{player.getStoreddata().put(CFG.CACHE_RANGE_KEY,String(normalizeScanRange(range)));}catch(err){}
}
function matchesKeybind(player,e){
var store=player.getStoreddata(),wanted=String(store.get("npc_browser_open_key")||"");
if(!wanted)return false;
return String(e.key||"")===wanted;
}

function refreshNearbyCache(player,range){
var list=getNearbyNpcList(player,range),temp=player.getTempdata(),map=new HashMap(),arr=new ArrayList(),i,n;
for(i=0;i<list.length;i++){
n=list[i];
try{
map.put(String(n.getUUID()),n);
arr.add(n);
}catch(err){}
}
temp.put(CFG.CACHE_MAP_KEY,map);
temp.put(CFG.CACHE_LIST_KEY,arr);
setStoredScanRange(player,range);
return list;
}
function getCachedNpcMap(player){
try{return player.getTempdata().get(CFG.CACHE_MAP_KEY);}catch(err){}
return null;
}
function getCachedNpcList(player){
try{return player.getTempdata().get(CFG.CACHE_LIST_KEY);}catch(err){}
return null;
}
function getCachedNpcByUuid(player,uuid){
var map=getCachedNpcMap(player),npc=null;
if(!map)return null;
try{npc=map.get(String(uuid||""));}catch(err){npc=null;}
return npc;
}

function buildNpcBrowserInit(player,range){
var list=toJsArray(getCachedNpcList(player));
return buildNpcBrowserInitFromList(player,list,range);
}
function buildNpcBrowserInitFromList(player,list,range){
var npcs=[],factionsMap={},factions=[],i,n,name,title,faction,x,y,z,dist,style,entityId,overlayEntities=[];
for(i=0;i<list.length;i++){
n=list[i];
name="";title="";faction="";
try{name=String(n.display.getName()||"");}catch(err){}
try{title=String(n.display.getTitle()||"");}catch(err){}
try{if(n.getFaction())faction=String(n.getFaction().getName()||"");}catch(err){}
x=Math.floor(Number(n.x));
y=Math.floor(Number(n.y));
z=Math.floor(Number(n.z));
dist=distanceToPlayer(player,n);
style=getNpcScriptStyle(n);
entityId=-1;
try{entityId=Number(cnpcext.entityId(n));}catch(err){entityId=-1;}
if(entityId>=0)overlayEntities.push({slot:i,entityId:entityId,rotation:180,followCursor:true,animate:true});
if(faction&&!factionsMap[faction]){factionsMap[faction]=true;factions.push(faction);}
npcs.push({
uuid:String(n.getUUID()),
name:name,
title:title,
faction:faction,
position:x+", "+y+", "+z,
x:x,y:y,z:z,
distance:dist,
distanceText:formatDistance(dist),
scriptStyle:style,
previewSlot:(entityId>=0?i:-1),
hasPreview:(entityId>=0)
});
}
factions.sort();
return {npcs:npcs,factions:factions,scanRange:range,overlayEntities:overlayEntities,admin:getClientAdminState(player)};
}
function formatDistance(d){return (Math.round(d*10)/10)+"m";}
function distanceToPlayer(player,npc){
var dx=Number(npc.x)-Number(player.x),dy=Number(npc.y)-Number(player.y),dz=Number(npc.z)-Number(player.z);
return Math.sqrt(dx*dx+dy*dy+dz*dz);
}
function toJsArray(list){
var out=[],i,len=0;
if(!list)return out;
try{len=list.size();for(i=0;i<len;i++)out.push(list.get(i));return out;}catch(err){}
try{len=list.length;for(i=0;i<len;i++)out.push(list[i]);}catch(err2){}
return out;
}
function sortNpcListByDistance(player,list){
var arr=toJsArray(list);
arr.sort(function(a,b){return distanceToPlayer(player,a)-distanceToPlayer(player,b);});
return arr;
}
function getNearbyNpcList(player,range){
var raw=[],arr=[],i,e,typeId,filtered=[];
try{raw=player.world.getNearbyEntities(player.getPos(),range,2);}catch(err1){
try{raw=player.getSurroundingEntities(range,2);}catch(err2){raw=[];}
}
arr=toJsArray(raw);
for(i=0;i<arr.length;i++){
e=arr[i];
if(!e)continue;
try{typeId=Number(e.getType());}catch(err3){typeId=2;}
if(typeId===2)filtered.push(e);
}
return sortNpcListByDistance(player,filtered);
}

function pushNpcList(player,range){
refreshNearbyCache(player,range);
pushBrowser(player,"npcListUpdate",buildNpcBrowserInit(player,range));
}
function onNpcTp(e,data){
if(!canUseEditor(e.player)){
pushBrowser(e.player,"npcActionResult",{ok:false,action:"tp",error:"No permission"});
return;
}
var npc=getCachedNpcByUuid(e.player,String(data.uuid||""));
if(!npc){pushBrowser(e.player,"npcActionResult",{ok:false,action:"tp",error:"Cached NPC reference missing. Refresh first."});return;}
e.player.setPosition(Math.floor(Number(npc.x)),Math.floor(Number(npc.y)),Math.floor(Number(npc.z)));
pushBrowser(e.player,"npcActionResult",{ok:true,action:"tp"});
}
function onNpcDelete(e,data){
if(!canUseEditor(e.player)){
pushBrowser(e.player,"npcActionResult",{ok:false,action:"delete",error:"No permission"});
return;
}
var npc=getCachedNpcByUuid(e.player,String(data.uuid||""));
if(!npc){pushBrowser(e.player,"npcActionResult",{ok:false,action:"delete",error:"Cached NPC reference missing. Refresh first."});return;}
try{
npc.despawn();
pushBrowser(e.player,"npcActionResult",{ok:true,action:"delete"});
pushNpcList(e.player,getStoredScanRange(e.player));
}catch(err){
pushBrowser(e.player,"npcActionResult",{ok:false,action:"delete",error:String(err)});
}
}
function onNpcScriptInfo(e,data){
var npc=getCachedNpcByUuid(e.player,String(data.uuid||"")),raw="",result;
if(!canUseEditor(e.player)){
pushBrowser(e.player,"npcScriptData",{ok:false,uuid:String(data.uuid||""),error:"No permission",tabs:[],flatFiles:[],flatInline:[],scriptEnabled:true,scriptStyle:"general"});
return;
}
if(!npc){pushBrowser(e.player,"npcScriptData",{ok:false,uuid:String(data.uuid||""),error:"Cached NPC reference missing. Refresh first.",tabs:[],flatFiles:[],flatInline:[],scriptEnabled:true,scriptStyle:"general"});return;}
raw=getEntityNbtSafe(npc);
result=extractScriptTabsFromRaw(raw);
result.scriptStyle=getNpcScriptStyle(npc);
result.uuid=String(npc.getUUID());
pushBrowser(e.player,"npcScriptData",result);
}
function onNpcScriptApply(e,data){
var npc=getCachedNpcByUuid(e.player,String(data.uuid||"")),raw,existing,tabs,newRaw,style,scriptEnabled,res;
if(!canUseEditor(e.player)){
pushBrowser(e.player,"npcScriptApplyResult",{ok:false,error:"No permission"});
return;
}
if(!npc){pushBrowser(e.player,"npcScriptApplyResult",{ok:false,error:"Cached NPC reference missing. Refresh first."});return;}
raw=getEntityNbtSafe(npc);
existing=extractScriptTabsFromRaw(raw);
tabs=normalizeIncomingTabs(data.tabs,existing.tabs);
style=String(data.scriptStyle||"general");
scriptEnabled=(typeof data.scriptEnabled==="boolean")?data.scriptEnabled:existing.scriptEnabled;
if(style==="dcE")tabs=clearAllTabs(tabs);
newRaw=replaceScriptsAndEnabled(raw,tabs,scriptEnabled);
res=setEntityNbtSafe(npc,newRaw);
if(!res.ok){pushBrowser(e.player,"npcScriptApplyResult",{ok:false,error:res.error||"Apply failed"});return;}
setNpcScriptStyle(npc,style);
pushBrowser(e.player,"npcScriptApplyResult",{ok:true});
}
function clearAllTabs(tabs){
var out=[],i,t;
for(i=0;i<tabs.length;i++){t=tabs[i]||{};out.push({tab:Number(t.tab||i+1),inlineScript:"",files:[]});}
return out;
}
function getNpcScriptStyle(npc){
try{return String(npc.getStoreddata().get(CFG.STYLE_KEY)||"general");}catch(err){}
return "general";
}
function setNpcScriptStyle(npc,style){
try{npc.getStoreddata().put(CFG.STYLE_KEY,String(style||"general"));}catch(err){}
}

function getAdminFile(){var File=Java.type("java.io.File"),dirs=findAdminRoots(true),dir=dirs.length?dirs[0]:new File("customnpcs/scripts/admin");if(!dir.exists())dir.mkdirs();return new File(dir,"admin.json");}
function adminFileExists(){return getAdminFile().exists();}
function emptyAdminEntry(){return {uuid:"",name:""};}
function defaultAdminData(){return {initialized:false,owner:emptyAdminEntry(),admins:[]};}
function ensureAdminFile(){var file=getAdminFile(),data;if(!file.exists()){data=defaultAdminData();saveAdminData(data);ADMIN_CACHE=data;return data;}return loadAdminData();}
function loadAdminData(){var file=getAdminFile(),raw="",Scanner,data;try{if(!file.exists())return ensureAdminFile();Scanner=Java.type("java.util.Scanner");raw="";var sc=new Scanner(file,"UTF-8");while(sc.hasNextLine())raw+=String(sc.nextLine())+"\n";sc.close();data=raw?JSON.parse(String(raw)):defaultAdminData();}catch(err){data=defaultAdminData();}ADMIN_CACHE=normalizeAdminData(data);return ADMIN_CACHE;}
function saveAdminData(data){var file=getAdminFile(),Writer=Java.type("java.io.OutputStreamWriter"),Out=Java.type("java.io.FileOutputStream"),writer,normalized=normalizeAdminData(data);try{writer=new Writer(new Out(file,false),"UTF-8");writer.write(JSON.stringify(normalized,null,2));writer.close();ADMIN_CACHE=normalized;return normalized;}catch(err){try{if(writer)writer.close();}catch(closeErr){}return null;}}
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
function getWorldPlayers(world){return world&&world.getAllPlayers?world.getAllPlayers()||[]:[];}
function listOnlinePlayers(world){var list=getWorldPlayers(world),out=[],seen={},i,p,uuid,name;for(i=0;i<list.length;i++){p=list[i];uuid=getPlayerUuid(p);name=safePlayerName(p);if(!uuid||seen[uuid])continue;seen[uuid]=true;out.push({uuid:uuid,name:name});}out.sort(function(a,b){return String(a.name).localeCompare(String(b.name));});return out;}

function getEntityNbtSafe(npc){
var raw=String(cnpcext.entityNbt(npc)||"");
if(!raw)throw new Error("entityNbt returned empty data");
return raw;
}
function setEntityNbtSafe(npc,raw){
var expectedState,nbtObj,verify;
if(!raw)return {ok:false,error:"Empty NBT"};
expectedState=extractScriptTabsFromRaw(raw);
try{
nbtObj=API.stringToNbt(String(raw));
}catch(err1){
return {ok:false,error:"stringToNbt failed: "+String(err1)};
}
try{
npc.setEntityNbt(nbtObj);
}catch(err2){
return {ok:false,error:"npc.setEntityNbt failed: "+String(err2)};
}
verify=verifyEntityScriptWrite(npc,expectedState);
if(!verify.ok)return verify;
return {ok:true};
}

function onNpcScriptFileList(e,data){
if(!canUseEditor(e.player)){
pushBrowser(e.player,"npcScriptFileList",{ok:false,root:"",files:[],error:"No permission"});
return;
}
var found=listEcmaScriptFiles(),files=found.files||[],root=found.root||"",query=String(data.query||"").toLowerCase(),out=[],i,s;
if(query){for(i=0;i<files.length;i++){s=files[i];if(String(s).toLowerCase().indexOf(query)>=0)out.push(s);}}else out=files;
pushBrowser(e.player,"npcScriptFileList",{ok:!found.error,root:root,files:out,error:found.error||""});
}
function onAdminBootstrap(e,data){var res=bootstrapOwner(e.player);pushBrowser(e.player,"adminBootstrapResult",res);pushAdminState(e.player);}
function onAdminAdd(e,data){var res=addAdminEntry(e.player,data);pushBrowser(e.player,"adminActionResult",res);pushAdminState(e.player);}
function onAdminRemove(e,data){var res=removeAdminEntry(e.player,data);pushBrowser(e.player,"adminActionResult",res);pushAdminState(e.player);}
function onAdminReset(e,data){var res=resetAdminFile(e.player);pushBrowser(e.player,"adminActionResult",res);pushBrowser(e.player,"adminState",buildClientAdminState(e.player,ADMIN_CACHE||defaultAdminData()));}
function onKeybindSave(e,data){var res=savePlayerKeybind(e.player,data);pushBrowser(e.player,"adminActionResult",res);pushAdminState(e.player);}
function pushAdminState(player){pushBrowser(player,"adminState",getClientAdminState(player));}
function getClientAdminState(player){return buildClientAdminState(player,touchAdminDataForPlayer(player));}
function buildClientAdminState(player,admin){admin=admin||defaultAdminData();return {initialized:!!admin.initialized,owner:admin.owner||emptyAdminEntry(),admins:admin.admins||[],players:listOnlinePlayers(player&&player.world?player.world:null),keybind:getPlayerKeybind(player),isOwner:isOwner(player,admin),isAdmin:isAdmin(player,admin),canOpen:!admin.initialized||isOwner(player,admin)||isAdmin(player,admin),canManageAdmins:isOwner(player,admin)};}
function getOpenGuard(player){if(!adminFileExists())return {ok:true,admin:defaultAdminData()};var admin=touchAdminDataForPlayer(player);if(!admin.initialized)return {ok:true,admin:admin};if(isOwner(player,admin)||isAdmin(player,admin))return {ok:true,admin:admin};return {ok:false,error:"No permission",admin:admin};}
function pushBrowser(player,eventName,obj){
try{cnpcext.getClientBridge(player.getMCEntity()).sendToBrowser(String(eventName),JSON.stringify(obj));}catch(err){}
}

function listEcmaScriptFiles(){
var roots=findEcmaScriptRoots(),out=[],seen={},i,j,root,files,path,primaryRoot="";
if(!roots.length)return {root:"",files:[],error:"No ecmascript folder found."};
for(i=0;i<roots.length;i++){
root=roots[i];
if(!primaryRoot)primaryRoot=String(root.getAbsolutePath()).replace(/\\/g,"/");
files=[];walkJsFiles(root,root,files);
for(j=0;j<files.length;j++){
path=String(files[j]||"");
if(!path||seen[path])continue;
seen[path]=true;
out.push(path);
}
}
out.sort();
return {root:primaryRoot,files:out};
}
function findEcmaScriptRoots(){
var File=Java.type("java.io.File"),out=[],seen={},baseCandidates=[new File("customnpcs/scripts/ecmascript"),new File("./customnpcs/scripts/ecmascript")],savesCandidates=[new File("saves"),new File("./saves")],i,j,dir,list,child;
for(i=0;i<baseCandidates.length;i++)pushDirIfExists(out,seen,baseCandidates[i]);
for(i=0;i<savesCandidates.length;i++){
dir=savesCandidates[i];
if(!dir.exists()||!dir.isDirectory())continue;
list=dir.listFiles();
if(!list)continue;
for(j=0;j<list.length;j++){
child=list[j];
if(child&&child.isDirectory())pushDirIfExists(out,seen,new File(child,"customnpcs/scripts/ecmascript"));
}
}
for(i=0;i<savesCandidates.length;i++){
dir=savesCandidates[i];
if(dir.exists()&&dir.isDirectory())scanForEcmaRoots(dir,0,4,out,seen);
}
return out;
}
function pushDirIfExists(out,seen,dir){
var p;
if(!dir||!dir.exists()||!dir.isDirectory())return;
p=String(dir.getAbsolutePath()).replace(/\\/g,"/");
if(seen[p])return;
seen[p]=true;
out.push(dir);
}
function scanForEcmaRoots(dir,depth,maxDepth,out,seen){
var list,i,f,p;
if(depth>maxDepth||!dir||!dir.exists()||!dir.isDirectory())return;
list=dir.listFiles();
if(!list)return;
for(i=0;i<list.length;i++){
f=list[i];
if(!f||!f.isDirectory())continue;
p=String(f.getAbsolutePath()).replace(/\\/g,"/");
if(/\/customnpcs\/scripts\/ecmascript$/i.test(p)){pushDirIfExists(out,seen,f);continue;}
scanForEcmaRoots(f,depth+1,maxDepth,out,seen);
}
}
function walkJsFiles(root,dir,out){
var list=dir.listFiles(),i,f,rel;
if(!list)return;
for(i=0;i<list.length;i++){
f=list[i];
if(f.isDirectory())walkJsFiles(root,f,out);
else if(String(f.getName()).toLowerCase().slice(-3)===".js"){
rel=String(root.toURI().relativize(f.toURI()).getPath()||"");
if(rel)out.push(rel.replace(/\\/g,"/").replace(/\/$/,""));
}
}
}

function extractScriptTabsFromRaw(raw){
var out={scriptEnabled:true,tabs:[],flatFiles:[],flatInline:[]},scriptsField,body,items,i,item,tabInfo,j,fileSeen={},inlineSeen={},globalEnabled;
if(!raw)return out;
globalEnabled=extractPrimitiveField(raw,"ScriptEnabled");
if(globalEnabled!==null)out.scriptEnabled=String(globalEnabled)!=="0b"&&String(globalEnabled)!=="false";
scriptsField=findTopLevelField(raw,"Scripts");
if(!scriptsField||scriptsField.valueType!=="list")return out;
body=scriptsField.inner;
items=splitTopLevelCompounds(body);
for(i=0;i<items.length;i++){
item=items[i];
tabInfo=extractOneTabInfo(item,i+1);
out.tabs.push(tabInfo);
for(j=0;j<tabInfo.files.length;j++)if(!fileSeen[tabInfo.files[j]]){fileSeen[tabInfo.files[j]]=true;out.flatFiles.push(tabInfo.files[j]);}
if(tabInfo.inlineScript!==null&&tabInfo.inlineScript!==""&&!inlineSeen[tabInfo.inlineScript]){
inlineSeen[tabInfo.inlineScript]=true;
out.flatInline.push({tab:tabInfo.tab,code:tabInfo.inlineScript});
}
}
return out;
}
function extractOneTabInfo(raw,tabNumber){
var out={tab:tabNumber,hasInline:false,inlineScript:"",files:[]},scriptVal=extractQuotedField(raw,"Script"),scriptListBody,listItems,i,line;
if(scriptVal!==null){out.inlineScript=normalizeInlineScriptText(scriptVal);out.hasInline=out.inlineScript!=="";}
scriptListBody=extractListBody(raw,"ScriptList");
if(scriptListBody!==null&&scriptListBody!==""){
listItems=splitTopLevelCompounds(scriptListBody);
for(i=0;i<listItems.length;i++){
line=extractQuotedField(listItems[i],"Line");
if(line!==null&&line!=="")out.files.push(line);
}
}
return out;
}
function normalizeIncomingTabs(incoming,existing){
var arr=[],count=Math.max(Array.isArray(incoming)?incoming.length:0,Array.isArray(existing)?existing.length:0),i,src;
if(count<=0)count=1;
for(i=0;i<count;i++){
src=(Array.isArray(incoming)&&incoming[i])?incoming[i]:((Array.isArray(existing)&&existing[i])?existing[i]:{});
arr.push({tab:i+1,inlineScript:normalizeInlineScriptText(src.inlineScript),files:cleanFileList(src.files)});
}
return arr;
}
function cleanFileList(files){
var out=[],seen={},i,s;
if(!Array.isArray(files))return out;
for(i=0;i<files.length;i++){
s=String(files[i]||"").replace(/^\s+|\s+$/g,"");
if(!s||seen[s])continue;
seen[s]=true;
out.push(s);
}
return out;
}
function normalizeInlineScriptText(s){
var out=String(s==null?"":s).replace(/\r\n/g,"\n").replace(/\r/g,"");
if(out.indexOf("\n")<0&&out.indexOf("\\n")>=0)out=out.replace(/\\n/g,"\n");
return out;
}

function replaceScriptsAndEnabled(raw,tabs,scriptEnabled){
var raw2=replacePrimitiveField(raw,"ScriptEnabled",scriptEnabled?"1b":"0b"),field,built;
field=findTopLevelField(raw2,"Scripts");
if(!field||field.valueType!=="list")return raw2;
built="Scripts:["+buildTabsNbt(tabs)+"]";
return raw2.substring(0,field.start)+built+raw2.substring(field.end);
}
function buildTabsNbt(tabs){
var out=[],i,t,j,files;
for(i=0;i<tabs.length;i++){
t=tabs[i]||{};
files=[];
for(j=0;j<(t.files?t.files.length:0);j++)files.push('{Line:"'+escapeNbtString(t.files[j])+'"}');
out.push('{Console:[],Script:"'+escapeNbtString(t.inlineScript||"")+'",ScriptList:['+files.join(",")+']}');
}
return out.join(",");
}
function escapeNbtString(s){
return String(s==null?"":s).replace(/\\/g,"\\\\").replace(/\r/g,"").replace(/\n/g,"\\n").replace(/\t/g,"\\t").replace(/"/g,'\\"');
}
function replacePrimitiveField(raw,key,newVal){
var field=findTopLevelField(raw,key);
if(!field||field.valueType!=="primitive")return raw;
return raw.substring(0,field.valueStart)+String(newVal)+raw.substring(field.valueEnd);
}

function extractPrimitiveField(raw,key){
var field=findTopLevelField(raw,key);
if(!field||field.valueType!=="primitive")return null;
return raw.substring(field.valueStart,field.valueEnd);
}
function extractQuotedField(raw,key){
var marker1=key+':"',marker2=key+":'",start=raw.indexOf(marker1),quoteIdx,end;
if(start>=0)quoteIdx=start+key.length+1;
else{
start=raw.indexOf(marker2);
if(start<0)return null;
quoteIdx=start+key.length+1;
}
end=findClosingQuote(raw,quoteIdx);
if(end<0)return null;
return unescapeNbtString(raw.substring(quoteIdx+1,end),raw.charAt(quoteIdx));
}
function extractListBody(raw,key){
var marker=key+":[",start=raw.indexOf(marker),openIdx,closeIdx;
if(start<0)return null;
openIdx=raw.indexOf("[",start);
if(openIdx<0)return null;
closeIdx=findMatchingBracket(raw,openIdx,"[","]");
if(closeIdx<0)return null;
return raw.substring(openIdx+1,closeIdx);
}
function splitTopLevelCompounds(body){
var out=[],i,ch,depthBrace=0,depthBracket=0,inQuote=false,quoteCh="",start=-1;
for(i=0;i<body.length;i++){
ch=body.charAt(i);
if(inQuote){if(ch===quoteCh&&(countBackslashesBefore(body,i)%2)===0){inQuote=false;quoteCh="";}continue;}
if(ch==='"'||ch==="'"){inQuote=true;quoteCh=ch;continue;}
if(ch==="{"){if(depthBrace===0&&depthBracket===0)start=i;depthBrace++;continue;}
if(ch==="}"){depthBrace--;if(depthBrace===0&&depthBracket===0&&start>=0){out.push(body.substring(start,i+1));start=-1;}continue;}
if(ch==="[")depthBracket++;
if(ch==="]")depthBracket--;
}
return out;
}
function findClosingQuote(str,quoteIdx){
var q=str.charAt(quoteIdx),i;
for(i=quoteIdx+1;i<str.length;i++)if(str.charAt(i)===q&&(countBackslashesBefore(str,i)%2)===0)return i;
return -1;
}
function countBackslashesBefore(str,idx){
var c=0,i=idx-1;
while(i>=0&&str.charAt(i)==="\\"){c++;i--;}
return c;
}
function findMatchingBracket(str,openIdx,openChar,closeChar){
var depth=0,inQuote=false,quoteCh="",i,ch;
for(i=openIdx;i<str.length;i++){
ch=str.charAt(i);
if(inQuote){if(ch===quoteCh&&(countBackslashesBefore(str,i)%2)===0){inQuote=false;quoteCh="";}continue;}
if(ch==='"'||ch==="'"){inQuote=true;quoteCh=ch;continue;}
if(ch===openChar)depth++;
if(ch===closeChar){depth--;if(depth===0)return i;}
}
return -1;
}
function unescapeNbtString(s,quoteChar){
var out=String(s||"");
try{
out=out.replace(/\\\\/g,"\\");
if(quoteChar==="'")out=out.replace(/\\'/g,"'");
else out=out.replace(/\\"/g,'"');
out=out.replace(/\\n/g,"\n");
out=out.replace(/\\r/g,"\r");
out=out.replace(/\\t/g,"\t");
}catch(err){}
return out;
}
function findTopLevelField(raw,key){
var i=0,len=raw?raw.length:0,ch,depthBrace=0,depthBracket=0,inQuote=false,quoteCh="",keyStart,keyEnd,colonIdx,valueStart,valueEnd,openIdx,closeIdx;
for(i=0;i<len;i++){
ch=raw.charAt(i);
if(inQuote){if(ch===quoteCh&&(countBackslashesBefore(raw,i)%2)===0){inQuote=false;quoteCh="";}continue;}
if(ch==='"'||ch==="'"){inQuote=true;quoteCh=ch;continue;}
if(ch==="{"){depthBrace++;continue;}
if(ch==="}"){depthBrace--;continue;}
if(ch==="["){depthBracket++;continue;}
if(ch==="]"){depthBracket--;continue;}
if(depthBrace===1&&depthBracket===0&&isKeyStart(raw,i)){
keyStart=i;
keyEnd=readKeyEnd(raw,keyStart);
if(keyEnd<=keyStart)continue;
if(raw.substring(keyStart,keyEnd)!==key)continue;
colonIdx=skipWhitespace(raw,keyEnd);
if(raw.charAt(colonIdx)!==":")continue;
valueStart=skipWhitespace(raw,colonIdx+1);
if(valueStart>=len)continue;
if(raw.charAt(valueStart)==="["){
openIdx=valueStart;
closeIdx=findMatchingBracket(raw,openIdx,"[","]");
if(closeIdx<0)return null;
return {start:keyStart,valueStart:valueStart,valueEnd:closeIdx+1,end:closeIdx+1,inner:raw.substring(openIdx+1,closeIdx),valueType:"list"};
}
valueEnd=findPrimitiveEnd(raw,valueStart);
return {start:keyStart,valueStart:valueStart,valueEnd:valueEnd,end:valueEnd,valueType:"primitive"};
}
}
return null;
}
function isKeyStart(raw,idx){
var ch=raw.charAt(idx),prev=idx>0?raw.charAt(idx-1):"";
if(!/[A-Za-z_]/.test(ch))return false;
return idx===0||prev==="{"||prev===","||/\s/.test(prev);
}
function readKeyEnd(raw,start){
var i=start,ch;
for(i=start;i<raw.length;i++){ch=raw.charAt(i);if(!/[A-Za-z0-9_]/.test(ch))break;}
return i;
}
function skipWhitespace(raw,idx){while(idx<raw.length&&/\s/.test(raw.charAt(idx)))idx++;return idx;}
function findPrimitiveEnd(raw,start){
var i,ch,depthBrace=0,depthBracket=0,inQuote=false,quoteCh="";
for(i=start;i<raw.length;i++){
ch=raw.charAt(i);
if(inQuote){if(ch===quoteCh&&(countBackslashesBefore(raw,i)%2)===0){inQuote=false;quoteCh="";}continue;}
if(ch==='"'||ch==="'"){inQuote=true;quoteCh=ch;continue;}
if(ch==="{"){depthBrace++;continue;}
if(ch==="}"){if(depthBrace===0&&depthBracket===0)return i;depthBrace--;continue;}
if(ch==="["){depthBracket++;continue;}
if(ch==="]"){if(depthBrace===0&&depthBracket===0)return i;depthBracket--;continue;}
if(ch===","&&depthBrace===0&&depthBracket===0)return i;
}
return raw.length;
}
function verifyEntityScriptWrite(npc,expectedState){
var current=getEntityNbtSafe(npc),actual;
if(!current)return {ok:false,error:"Unable to re-read Scripts after write"};
actual=extractScriptTabsFromRaw(current);
if(!sameScriptState(actual,expectedState))return {ok:false,error:"Scripts verification failed after write"};
return {ok:true};
}
function sameTabShape(a,b){
var i,j;
if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length)return false;
for(i=0;i<a.length;i++){
if(String((a[i]&&a[i].inlineScript)||"")!==String((b[i]&&b[i].inlineScript)||""))return false;
if(((a[i]&&a[i].files)||[]).length!==((b[i]&&b[i].files)||[]).length)return false;
for(j=0;j<((a[i]&&a[i].files)||[]).length;j++)if(String(a[i].files[j])!==String(b[i].files[j]))return false;
}
return true;
}
function sameFlatInline(a,b){
var i;
if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length)return false;
for(i=0;i<a.length;i++){
if(Number(a[i].tab)!==Number(b[i].tab))return false;
if(String(a[i].code||"")!==String(b[i].code||""))return false;
}
return true;
}
function sameStringArray(a,b){
var i;
if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length)return false;
for(i=0;i<a.length;i++)if(String(a[i])!==String(b[i]))return false;
return true;
}
function sameScriptState(a,b){
return !!a&&!!b&&!!Array.isArray(a.tabs)&&!!Array.isArray(b.tabs)&&!!sameTabShape(a.tabs,b.tabs)&&!!sameFlatInline(a.flatInline,b.flatInline)&&!!sameStringArray(a.flatFiles,b.flatFiles)&&!!Boolean(a.scriptEnabled)===!!Boolean(b.scriptEnabled);
}
