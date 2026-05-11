// @package npc_editor
// @version 7.0.0
// @file npc_editor_v7.js

var CFG={
HTML:"html/dc_npc_editor.html",
DEFAULT_RANGE:48,
MIN_RANGE:8,
MAX_RANGE:128,
STYLE_KEY:"npc_browser_script_style",
DC_SELECTION_KEY:"npc_browser_dc_selection",
DOCHI_LOCK_KEY:"npc_browser_dochi_lock",
DIALOGUE_JSON_PATH_KEY:"dc_dialogue_json_path",
CACHE_MAP_KEY:"npc_browser_cache_map",
CACHE_LIST_KEY:"npc_browser_cache_list",
CACHE_RANGE_KEY:"npc_browser_scan_range",
LOCALE_PREF_KEY:"npc_browser_locale_pref",
PREVIEW_ENTITY_RENDER:true,
DEBUG:false
};
var API=Java.type("noppes.npcs.api.NpcAPI").Instance();
var HashMap=Java.type("java.util.HashMap");
var ArrayList=Java.type("java.util.ArrayList");
var LANG_RESOURCE_CACHE={};

function init(e){
ensureDcAdminsRoot();
if(!loadAdminStateCache().initialized)broadcastAdminSetupHint(e);
}
function chat(e){if(String(e.message)!=="@npceditor")return;tryOpenEditor(e.player);e.setCanceled(true);}
function keyPressed(e){var p=e&&e.player?e.player:null;if(!p)return;if(matchesKeybind(p,e))tryOpenEditor(p);}

function htmlGuiEvent(e){
var data={};
 if(e.data&&String(e.data)!=="")data=JSON.parse(String(e.data));
 if(e.eventName==="debug"){onBrowserDebug(e,data);return;}
 if(e.eventName==="npc_i18n_request"){sendNpcEditorI18n(e.player,data);return;}
 if(e.eventName==="admin_bootstrap"){onAdminBootstrap(e,data);return;}
 if(e.eventName==="admin_add"){onAdminAdd(e,data);return;}
 if(e.eventName==="admin_remove"){onAdminRemove(e,data);return;}
 if(e.eventName==="admin_reset"){onAdminReset(e,data);return;}
 if(e.eventName==="keybind_save"){onKeybindSave(e,data);return;}
 if(e.eventName==="admin_refresh"){if(requireCanOpen(e,"adminState","admin_refresh"))sendAdminState(e.player);return;}
 if(e.eventName==="npc_refresh"){if(requireCanBrowse(e,"npcListUpdate","refresh"))pushNpcList(e.player,normalizeScanRange(data.range));return;}
 if(e.eventName==="npc_tp"){if(requireCanEdit(e,"npcActionResult","tp"))onNpcTp(e,data);return;}
 if(e.eventName==="npc_delete"){if(requireCanEdit(e,"npcActionResult","delete"))onNpcDelete(e,data);return;}
 if(e.eventName==="npc_script_info"){if(requireCanBrowse(e,"npcScriptData","script_info"))onNpcScriptInfo(e,data);return;}
 if(e.eventName==="npc_script_apply"){if(requireCanEdit(e,"npcScriptApplyResult","script_apply"))onNpcScriptApply(e,data);return;}
 if(e.eventName==="npc_script_enabled_toggle"){if(requireCanEdit(e,"npcScriptToggleResult","script_toggle"))onNpcScriptEnabledToggle(e,data);return;}
 if(e.eventName==="npc_script_file_list"){if(requireCanEdit(e,"npcScriptFileList","script_file_list"))onNpcScriptFileList(e,data);return;}
 if(e.eventName==="npc_dc_json_file_list"){if(requireCanEdit(e,"npcDcJsonFileList","dc_json_file_list"))onNpcDcJsonFileList(e,data);return;}
}

function tryOpenEditor(player){
try{
tryOpenEditorImpl(player);
}catch(err){
debugError(player,"tryOpenEditor",err);
throw err;
}
}
function tryOpenEditorImpl(player){
var range=normalizeScanRange(getStoredScanRange(player)),state=buildAdminBrowserState(player),initData,locale=getPlayerLocale(player),i18n=loadNpcEditorI18n(locale),payload;
 debugMsg(player,"open start range="+range+" locale="+locale);
 debugMsg(player,"admin initialized="+state.initialized+" canOpen="+state.canOpen+" canEdit="+state.canEdit);
 debugMsg(player,"i18n locale="+i18n.locale+" keys="+countObjectKeys(i18n.messages)+" error="+String(i18n.error||"none"));
 if(!state.canOpen){sendPlayerMessage(player,"NPC Editor access denied.");return;}
 if(!state.initialized){
  initData={ok:true,npcs:[],factions:[],scanRange:range,overlayEntities:[],admin:state,locale:i18n.locale,localePreference:getStoredLocalePreference(player),localeOptions:listNpcEditorLocales(),i18nError:i18n.error,debug:CFG.DEBUG};
  payload=JSON.stringify(initData);
  debugMsg(player,"openHtmlGui bootstrap payload="+payload.length+" html="+CFG.HTML);
  cnpcext.openHtmlGui(player,CFG.HTML,0,0,payload);
  debugMsg(player,"openHtmlGui bootstrap returned");
  return;
}
 debugMsg(player,"refresh cache start");
 refreshNearbyCache(player,range);
 debugMsg(player,"refresh cache done npcs="+toJsArray(getCachedNpcList(player)).length);
 initData=buildNpcBrowserInit(player,range);
 initData.locale=i18n.locale;
 initData.localePreference=getStoredLocalePreference(player);
 initData.localeOptions=listNpcEditorLocales();
 initData.i18nError=i18n.error;
 initData.debug=CFG.DEBUG;
 payload=JSON.stringify(initData);
 debugMsg(player,"openHtmlGui normal payload="+payload.length+" html="+CFG.HTML);
 cnpcext.openHtmlGui(player,CFG.HTML,0,0,payload);
 debugMsg(player,"openHtmlGui normal returned");
}

function getPlayerLocale(player){
var pref=getStoredLocalePreference(player),candidates=[],mc=null,opts=null;
if(pref)return pref;
addLocaleCandidate(candidates,readJavaNoArgString(player,["getLanguage"]));
try{if(player&&typeof player.getMCEntity==="function")mc=player.getMCEntity();}catch(err1){}
addLocaleCandidate(candidates,readJavaNoArgString(mc,["getLanguage"]));
addLocaleCandidate(candidates,readJavaFieldString(mc,["field_46156","language","locale","clientLanguage","selectedLanguage"]));
opts=readJavaNoArgValue(mc,["method_53823","clientInformation","getClientInformation","getClientOptions"]);
if(opts)addLocaleCandidate(candidates,readJavaNoArgString(opts,["comp_1951","language","getLanguage","getLocale","locale"]));
if(opts)addLocaleCandidate(candidates,readJavaFieldString(opts,["comp_1951","language","locale"]));
return pickBestLocaleCandidate(candidates)||"en_us";
}
function getStoredLocalePreference(player){
try{return normalizeLocaleCandidate(player.getStoreddata().get(CFG.LOCALE_PREF_KEY)||"");}catch(err){}
return "";
}
function setStoredLocalePreference(player,locale){
locale=normalizeLocaleCandidate(locale);
try{player.getStoreddata().put(CFG.LOCALE_PREF_KEY,locale||"");}catch(err){}
}
function addLocaleCandidate(list,value){
var locale=normalizeLocaleCandidate(value);
if(locale)list.push(locale);
}
function normalizeLocaleCandidate(value){
var locale=String(value||"").toLowerCase().replace("-","_");
if(!/^[a-z]{2,3}_[a-z0-9_]+$/.test(locale))return "";
return locale;
}
function pickBestLocaleCandidate(list){
var i,first="";
for(i=0;i<list.length;i++){
if(!first)first=list[i];
if(list[i]&&list[i]!=="en_us")return list[i];
}
return first||"";
}
function readJavaNoArgString(obj,names){
var value=readJavaNoArgValue(obj,names);
if(value==null)return "";
return String(value||"");
}
function readJavaNoArgValue(obj,names){
var i,value,methods,empty,j,m;
if(!obj)return null;
for(i=0;i<names.length;i++){
try{if(typeof obj[names[i]]==="function"){value=obj[names[i]]();if(value!=null)return value;}}catch(err0){}
}
try{
methods=obj.getClass().getMethods();
empty=Java.to([],"java.lang.Object[]");
for(i=0;i<names.length;i++){
for(j=0;j<methods.length;j++){
m=methods[j];
try{
if(String(m.getName())===names[i]&&m.getParameterCount()===0){
try{m.setAccessible(true);}catch(err1){}
value=m.invoke(obj,empty);
if(value!=null)return value;
}
}catch(err2){}
}
}
}catch(err3){}
return null;
}
function readJavaFieldString(obj,names){
var cls=null,i,field,value;
if(!obj)return "";
try{cls=obj.getClass();}catch(err0){return "";}
while(cls){
for(i=0;i<names.length;i++){
try{
field=cls.getDeclaredField(names[i]);
field.setAccessible(true);
value=field.get(obj);
if(value!=null&&String(value)!=="")return String(value);
}catch(err1){}
}
try{cls=cls.getSuperclass();}catch(err2){cls=null;}
}
return "";
}
function loadNpcEditorI18n(locale){
var File=Java.type("java.io.File"),roots=findNpcEditorLangRoots(),queue=[normalizeLocale(locale)],i,j,file,raw,messages;
if(queue[0]!=="en_us")queue.push("en_us");
for(i=0;i<queue.length;i++){
for(j=0;j<roots.length;j++){
file=new File(roots[j],queue[i]+".json");
if(!file.exists()||!file.isFile())continue;
try{
raw=readTextFile(file);
messages=JSON.parse(raw);
return {locale:queue[i],requested:normalizeLocale(locale),messages:messages,error:""};
}catch(err){
return {locale:queue[i],requested:normalizeLocale(locale),messages:{},error:String(err)};
}
}
}
return {locale:normalizeLocale(locale),requested:normalizeLocale(locale),messages:{},error:"Missing customnpcs/dc_data/dc_lang/npc_editor/"+normalizeLocale(locale)+".json"};
}
function sendNpcEditorI18n(player,data){
var locale=data&&data.locale?String(data.locale):getPlayerLocale(player),i18n;
locale=normalizeLocaleCandidate(locale)||"en_us";
if(data&&data.persist===true)setStoredLocalePreference(player,locale);
i18n=loadNpcEditorI18n(locale);
debugMsg(player,"i18n send locale="+i18n.locale+" keys="+countObjectKeys(i18n.messages)+" error="+String(i18n.error||"none"));
pushBrowser(player,"npcI18nPack",{locale:i18n.locale,requested:i18n.requested,messages:i18n.messages,error:i18n.error||""});
}
function listNpcEditorLocales(){
var roots=findNpcEditorLangRoots(),seen={},out=[],i,dir,files,j,name,locale;
addLocaleOption(out,seen,"en_us");
for(i=0;i<roots.length;i++){
dir=roots[i];
if(!dir.exists()||!dir.isDirectory())continue;
files=dir.listFiles();
if(!files)continue;
for(j=0;j<files.length;j++){
if(!files[j].isFile())continue;
name=String(files[j].getName());
if(name.slice(-5)!==".json")continue;
locale=normalizeLocaleCandidate(name.substring(0,name.length-5));
if(locale)addLocaleOption(out,seen,locale);
}
}
out.sort(function(a,b){
if(a.locale==="en_us")return -1;
if(b.locale==="en_us")return 1;
return String(a.label).localeCompare(String(b.label));
});
return out;
}
function addLocaleOption(out,seen,locale){
locale=normalizeLocaleCandidate(locale);
if(!locale||seen[locale])return;
seen[locale]=true;
out.push({locale:locale,label:getLocaleDisplayName(locale)});
}
function getLocaleDisplayName(locale){
if(locale==="en_us")return "English";
if(locale==="ko_kr")return "Korea";
if(locale==="ja_jp")return "Japan";
if(locale==="zh_cn")return "China";
if(locale==="ru_ru")return "Russia";
var map={en_us:"English",ko_kr:"Korea",ja_jp:"Japan",zh_cn:"China",ru_ru:"Russia"};
return map[locale]||locale;
}
function normalizeLocale(locale){
locale=String(locale||"en_us").toLowerCase().replace("-","_");
return locale||"en_us";
}
function countObjectKeys(obj){
if(!obj)return 0;
return Object.keys(obj).length;
}
function translateNpcNameForPlayer(player,name){
name=String(name||"");
if(!isTranslationKeyText(name))return name;
return getLangResourceValue(getPlayerLocale(player),name)||name;
}
function isTranslationKeyText(text){
text=String(text||"");
return text.indexOf(".")>0&&/^[a-z0-9_.-]+$/.test(text);
}
function getLangResourceValue(locale,key){
var map=loadLangResourceMap(locale),fallback;
if(map[key]!=null)return String(map[key]);
if(normalizeLocale(locale)!=="en_us"){
fallback=loadLangResourceMap("en_us");
if(fallback[key]!=null)return String(fallback[key]);
}
return "";
}
function loadLangResourceMap(locale){
locale=normalizeLocale(locale);
if(LANG_RESOURCE_CACHE[locale])return LANG_RESOURCE_CACHE[locale];
LANG_RESOURCE_CACHE[locale]={};
loadLangResourcesInto(LANG_RESOURCE_CACHE[locale],locale);
return LANG_RESOURCE_CACHE[locale];
}
function loadLangResourcesInto(out,locale){
var containers=findLangResourceContainers(),i,file;
for(i=0;i<containers.length;i++){
file=containers[i];
if(file.isFile())readZipLangResources(out,file,locale);
else if(file.isDirectory())readDirLangResources(out,file,locale);
}
}
function findLangResourceContainers(){
var File=Java.type("java.io.File"),out=[],seen={},dirs=[new File("mods"),new File("./mods"),new File("minecraft/mods"),new File("./minecraft/mods"),new File("resourcepacks"),new File("./resourcepacks"),new File("minecraft/resourcepacks"),new File("./minecraft/resourcepacks")],i;
for(i=0;i<dirs.length;i++)pushResourceContainersFromDir(out,seen,dirs[i]);
return out;
}
function pushResourceContainersFromDir(out,seen,dir){
var list,i,file,name,path;
if(!dir||!dir.exists()||!dir.isDirectory())return;
list=dir.listFiles();
if(!list)return;
for(i=0;i<list.length;i++){
file=list[i];
if(!file)continue;
name=String(file.getName()).toLowerCase();
if(file.isDirectory()||name.slice(-4)===".jar"||name.slice(-4)===".zip"){
path=String(file.getAbsolutePath()).replace(/\\/g,"/");
if(!seen[path]){seen[path]=true;out.push(file);}
}
}
}
function readZipLangResources(out,file,locale){
var ZipFile=Java.type("java.util.zip.ZipFile"),zip=null,entries,entry,path,raw;
try{
zip=new ZipFile(file);
entries=zip.entries();
while(entries.hasMoreElements()){
entry=entries.nextElement();
if(entry.isDirectory())continue;
path=String(entry.getName()).toLowerCase();
if(!isLangResourcePath(path,locale))continue;
raw=readInputStreamText(zip.getInputStream(entry));
mergeLangJson(out,raw);
}
}finally{
if(zip)zip.close();
}
}
function readDirLangResources(out,dir,locale){
walkDirLangResources(out,dir,dir,locale);
}
function walkDirLangResources(out,root,dir,locale){
var list=dir.listFiles(),i,file,rel;
if(!list)return;
for(i=0;i<list.length;i++){
file=list[i];
if(file.isDirectory()){walkDirLangResources(out,root,file,locale);continue;}
rel=String(root.toURI().relativize(file.toURI()).getPath()||"").toLowerCase();
if(isLangResourcePath(rel,locale))mergeLangJson(out,readTextFile(file));
}
}
function isLangResourcePath(path,locale){
var suffix="/lang/"+normalizeLocale(locale)+".json";
path=String(path||"").toLowerCase().replace(/\\/g,"/");
return path.indexOf("assets/")===0&&path.indexOf("/lang/")>0&&path.slice(-suffix.length)===suffix;
}
function mergeLangJson(out,raw){
var text=stripBom(String(raw||"{}")).trim(),obj,keys,i,key,value;
if(!text)return;
if(text.charAt(0)!=="{")text="{"+text+"}";
try{
obj=JSON.parse(text);
}catch(err){
return;
}
keys=Object.keys(obj);
for(i=0;i<keys.length;i++){
key=keys[i];
value=obj[key];
if(value!=null)out[key]=String(value);
}
}
function readInputStreamText(input){
var InputStreamReader=Java.type("java.io.InputStreamReader"),BufferedReader=Java.type("java.io.BufferedReader"),br=null,line,parts=[];
try{
br=new BufferedReader(new InputStreamReader(input,"UTF-8"));
while((line=br.readLine())!==null)parts.push(String(line));
return stripBom(parts.join("\n"));
}finally{
if(br)br.close();
}
}
function findNpcEditorLangRoots(){
var File=Java.type("java.io.File"),out=[],seen={},baseCandidates=[
new File("customnpcs/dc_data/dc_lang/npc_editor"),
new File("minecraft/customnpcs/dc_data/dc_lang/npc_editor"),
new File("./customnpcs/dc_data/dc_lang/npc_editor"),
new File("./minecraft/customnpcs/dc_data/dc_lang/npc_editor")
],i;
for(i=0;i<baseCandidates.length;i++)pushDirIfExists(out,seen,baseCandidates[i]);
return out;
}
function findEcmaAssetRoots(){
var File=Java.type("java.io.File"),out=[],seen={},baseCandidates=[new File("customnpcs/scripts/ecmascript"),new File("minecraft/customnpcs/scripts/ecmascript"),new File("./customnpcs/scripts/ecmascript"),new File("./minecraft/customnpcs/scripts/ecmascript")],i;
for(i=0;i<baseCandidates.length;i++)pushDirIfExists(out,seen,baseCandidates[i]);
pushSaveEcmaRoots(out,seen,new File("saves"));
pushSaveEcmaRoots(out,seen,new File("minecraft/saves"));
pushSaveEcmaRoots(out,seen,new File("./saves"));
pushSaveEcmaRoots(out,seen,new File("./minecraft/saves"));
return out;
}
function pushSaveEcmaRoots(out,seen,savesDir){
var File=Java.type("java.io.File"),worlds,i,dir,ecmaDir;
if(!savesDir||!savesDir.exists()||!savesDir.isDirectory())return;
worlds=savesDir.listFiles();
if(!worlds)return;
for(i=0;i<worlds.length;i++){
dir=worlds[i];
if(!dir||!dir.isDirectory())continue;
ecmaDir=new File(dir,"customnpcs/scripts/ecmascript");
pushDirIfExists(out,seen,ecmaDir);
}
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
var data=player.getStoreddata(),v=String(data.get(CFG.CACHE_RANGE_KEY)||"");
return normalizeScanRange(v);
}
function setStoredScanRange(player,range){
player.getStoreddata().put(CFG.CACHE_RANGE_KEY,String(normalizeScanRange(range)));
}
function getStoredOpenKey(player){
var store=player.getStoreddata();
return String(store.get("npc_browser_open_key")||"");
}
function setStoredOpenKey(player,key){
var store=player.getStoreddata();
key=String(key||"").trim();
if(key)store.put("npc_browser_open_key",key);
else store.remove("npc_browser_open_key");
}
function matchesKeybind(player,e){
var wanted=getStoredOpenKey(player);
if(!wanted)return false;
return String(e.key||"")===wanted;
}

function getEditorAccessState(player){
return buildAdminBrowserState(player);
}
function canOpenEditor(player){
return !!getEditorAccessState(player).canOpen;
}
function canBrowseEditor(player){
var state=getEditorAccessState(player);
return !!state.initialized&&!!state.canOpen;
}
function canEditEditor(player){
return !!getEditorAccessState(player).canEdit;
}
function requireCanOpen(e,resultEvent,action){
if(canOpenEditor(e.player))return true;
rejectBrowserEvent(e.player,resultEvent,action,"NPC Editor access denied.");
return false;
}
function requireCanBrowse(e,resultEvent,action){
if(canBrowseEditor(e.player))return true;
rejectBrowserEvent(e.player,resultEvent,action,"Register the NPC Editor owner before browsing NPCs.");
return false;
}
function requireCanEdit(e,resultEvent,action){
if(canEditEditor(e.player))return true;
rejectBrowserEvent(e.player,resultEvent,action,"Only registered NPC Editor admins can edit NPCs.");
return false;
}
function rejectBrowserEvent(player,resultEvent,action,msg){
var state=buildAdminBrowserState(player),base={ok:false,error:String(msg||"Access denied.")};
if(resultEvent==="npcActionResult"){base.action=String(action||"");pushBrowser(player,resultEvent,base);return;}
if(resultEvent==="npcListUpdate"){base.npcs=[];base.factions=[];base.scanRange=getStoredScanRange(player);base.overlayEntities=[];base.admin=state;pushBrowser(player,resultEvent,base);return;}
if(resultEvent==="npcScriptData"){base.tabs=[];base.flatFiles=[];base.flatInline=[];base.scriptEnabled=true;base.scriptStyle="general";base.dcSelection={scriptPath:"",jsonPath:"",prefix:""};base.dochiLock=defaultDochiLock();pushBrowser(player,resultEvent,base);return;}
if(resultEvent==="adminState"){pushBrowser(player,resultEvent,state);return;}
pushBrowser(player,resultEvent,base);
}

function cacheNearbyList(player,list,range){
var temp=player.getTempdata(),map=new HashMap(),arr=new ArrayList(),i,n;
for(i=0;i<list.length;i++){
n=list[i];
map.put(String(n.getUUID()),n);
arr.add(n);
}
temp.put(CFG.CACHE_MAP_KEY,map);
temp.put(CFG.CACHE_LIST_KEY,arr);
setStoredScanRange(player,range);
}
function refreshNearbyCache(player,range){
var list=getNearbyNpcList(player,range);
cacheNearbyList(player,list,range);
return list;
}
function getCachedNpcMap(player){
return player.getTempdata().get(CFG.CACHE_MAP_KEY);
}
function getCachedNpcList(player){
return player.getTempdata().get(CFG.CACHE_LIST_KEY);
}
function getCachedNpcByUuid(player,uuid){
var map=getCachedNpcMap(player),npc=null;
if(!map)return null;
npc=map.get(String(uuid||""));
return npc;
}
function getNpcByUuid(player,uuid){
var wanted=String(uuid||""),npc=null,world=null,list=[],i,n;
if(!wanted)return null;
try{
world=player&&player.world?player.world:null;
if(world&&world.getEntity){
npc=world.getEntity(wanted);
if(npc&&String(npc.getUUID())===wanted)return npc;
}
}catch(err1){}
try{
world=player&&player.getWorld?player.getWorld():null;
if(world&&world.getEntity){
npc=world.getEntity(wanted);
if(npc&&String(npc.getUUID())===wanted)return npc;
}
}catch(err2){}
try{
npc=getCachedNpcByUuid(player,wanted);
if(npc&&String(npc.getUUID())===wanted)return npc;
}catch(err3){}
try{
list=getNearbyNpcList(player,getStoredScanRange(player));
for(i=0;i<list.length;i++){
n=list[i];
if(n&&String(n.getUUID())===wanted)return n;
}
}catch(err4){}
return null;
}
function getNpcInCurrentRange(player,uuid){
var range=getStoredScanRange(player),list=getNearbyNpcList(player,range),i,n,wanted=String(uuid||""),resolved;
resolved=getNpcByUuid(player,wanted);
if(resolved)return resolved;
cacheNearbyList(player,list,range);
for(i=0;i<list.length;i++){
n=list[i];
if(String(n.getUUID())===wanted)return n;
}
return null;
}

function buildNpcBrowserInit(player,range){
var list=toJsArray(getCachedNpcList(player));
return buildNpcBrowserInitFromList(player,list,range);
}
function buildNpcBrowserInitFromList(player,list,range){
var npcs=[],factionsMap={},factions=[],i,n,name,title,faction,x,y,z,dist,style,scriptEnabled,previewSlot,previewNbt,dochiLock,overlayEntities=[];
for(i=0;i<list.length;i++){
n=list[i];
try{n=getNpcByUuid(player,String(n.getUUID()))||n;}catch(resolveErr){}
name="";title="";faction="";
name=translateNpcNameForPlayer(player,String(n.display.getName()||""));
title=String(n.display.getTitle()||"");
if(n.getFaction())faction=String(n.getFaction().getName()||"");
x=Math.floor(Number(n.x));
y=Math.floor(Number(n.y));
z=Math.floor(Number(n.z));
dist=distanceToPlayer(player,n);
style=getNpcScriptStyle(n);
dochiLock=getNpcDochiLock(n);
if(dochiLock.locked)style="dcE";
scriptEnabled=getNpcScriptEnabled(n);
previewSlot=-1;
previewNbt="";
if(CFG.PREVIEW_ENTITY_RENDER){
try{
previewNbt=buildNpcPreviewNbt(n);
if(previewNbt){
previewSlot=i;
overlayEntities.push({slot:i,nbt:previewNbt,rotation:180,followCursor:true,animate:true});
}
}catch(previewErr){
previewSlot=-1;
}
}
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
scriptEnabled:scriptEnabled,
dochiLocked:dochiLock.locked,
dochiLock:dochiLock,
previewSlot:previewSlot,
hasPreview:(previewSlot>=0)
});
}
factions.sort();
return {npcs:npcs,factions:factions,scanRange:range,overlayEntities:overlayEntities,admin:buildAdminBrowserState(player),locale:getPlayerLocale(player),localePreference:getStoredLocalePreference(player),localeOptions:listNpcEditorLocales()};
}
function buildNpcPreviewNbt(npc){
var raw=getEntityNbtSafe(npc),tabs=[{tab:1,inlineScript:"",files:[]}];
raw=replaceScriptsAndEnabled(raw,tabs,false);
raw=replacePrimitiveField(raw,"ShowName","0b");
raw=replacePrimitiveField(raw,"ShowBossBar","0b");
return raw;
}
function formatDistance(d){return (Math.round(d*10)/10)+"m";}
function distanceToPlayer(player,npc){
var dx=Number(npc.x)-Number(player.x),dy=Number(npc.y)-Number(player.y),dz=Number(npc.z)-Number(player.z);
return Math.sqrt(dx*dx+dy*dy+dz*dz);
}
function toJsArray(list){
var out=[],i,len=0;
if(!list)return out;
if(list.size&&list.get){len=list.size();for(i=0;i<len;i++)out.push(list.get(i));return out;}
if(list.length!=null){len=list.length;for(i=0;i<len;i++)out.push(list[i]);}
return out;
}
function sortNpcListByDistance(player,list){
var arr=toJsArray(list);
arr.sort(function(a,b){return distanceToPlayer(player,a)-distanceToPlayer(player,b);});
return arr;
}
function getNearbyNpcList(player,range){
var raw=[],arr=[],i,e,typeId,filtered=[];
if(player.world&&player.world.getNearbyEntities)raw=player.world.getNearbyEntities(player.getPos(),range,2);
else if(player.getSurroundingEntities)raw=player.getSurroundingEntities(range,2);
else throw new Error("No nearby entity API available");
arr=toJsArray(raw);
for(i=0;i<arr.length;i++){
e=arr[i];
if(!e)continue;
typeId=Number(e.getType());
if(typeId===2)filtered.push(e);
}
return sortNpcListByDistance(player,filtered);
}

function pushNpcList(player,range){
debugMsg(player,"pushNpcList start range="+range);
refreshNearbyCache(player,range);
debugMsg(player,"pushNpcList cache npcs="+toJsArray(getCachedNpcList(player)).length);
pushBrowser(player,"npcListUpdate",buildNpcBrowserInit(player,range));
}
function onNpcTp(e,data){
var npc=getNpcInCurrentRange(e.player,String(data.uuid||""));
if(!npc){pushBrowser(e.player,"npcActionResult",{ok:false,action:"tp",error:"NPC is outside the current scan range. Refresh or move closer."});return;}
e.player.setPosition(Math.floor(Number(npc.x)),Math.floor(Number(npc.y)),Math.floor(Number(npc.z)));
pushBrowser(e.player,"npcActionResult",{ok:true,action:"tp"});
}
function onNpcDelete(e,data){
var npc=getNpcInCurrentRange(e.player,String(data.uuid||""));
if(!npc){pushBrowser(e.player,"npcActionResult",{ok:false,action:"delete",error:"NPC is outside the current scan range. Refresh or move closer."});return;}
try{
npc.despawn();
pushBrowser(e.player,"npcActionResult",{ok:true,action:"delete"});
pushNpcList(e.player,getStoredScanRange(e.player));
}catch(err){
pushBrowser(e.player,"npcActionResult",{ok:false,action:"delete",error:String(err)});
}
}
function onNpcScriptInfo(e,data){
var npc=getNpcInCurrentRange(e.player,String(data.uuid||"")),result;
if(!npc){pushBrowser(e.player,"npcScriptData",{ok:false,uuid:String(data.uuid||""),error:"NPC is outside the current scan range. Refresh or move closer.",tabs:[],flatFiles:[],flatInline:[],scriptEnabled:true,scriptStyle:"general",dcSelection:{scriptPath:"",jsonPath:"",prefix:""},dochiLock:defaultDochiLock()});return;}
result=buildNpcScriptDataPayload(npc);
pushBrowser(e.player,"npcScriptData",result);
}
function onNpcScriptApply(e,data){
var npc=getNpcInCurrentRange(e.player,String(data.uuid||"")),raw,existing,tabs,style,scriptEnabled,res,expectedState,lock,validation,payload;
if(!npc){pushBrowser(e.player,"npcScriptApplyResult",{ok:false,error:"NPC is outside the current scan range. Refresh or move closer."});return;}
style=String(data.scriptStyle||"general");
lock=getNpcDochiLock(npc);
if(data.styleOnly===true){
payload=applyNpcModeOnly(e.player,npc,style);
if(!payload.ok){pushBrowser(e.player,"npcScriptApplyResult",payload);return;}
pushBrowser(e.player,"npcScriptApplyResult",payload);
pushBrowser(e.player,"npcScriptData",payload);
pushNpcList(e.player,getStoredScanRange(e.player));
return;
}
raw=getEntityNbtSafe(npc);
existing=extractScriptTabsFromRaw(raw);
if(style==="dcE"){applyDochiScriptToNpc(e.player,npc,data,raw,existing);return;}
if(lock.locked&&data.confirmGeneralConvert!==true){
pushBrowser(e.player,"npcScriptApplyResult",{ok:false,error:"This NPC is locked to Dochi script mode. Use dcE mode to update it."});
return;
}
tabs=normalizeIncomingTabs(data.tabs,existing.tabs);
validation=(lock.locked&&data.confirmGeneralConvert===true)?{ok:true}:validateGeneralScriptTabs(tabs);
if(!validation.ok){pushBrowser(e.player,"npcScriptApplyResult",{ok:false,error:validation.error});return;}
scriptEnabled=(data.scriptEnabled===true||data.scriptEnabled===false)?data.scriptEnabled:existing.scriptEnabled;
expectedState=buildScriptStateFromTabs(tabs,scriptEnabled);
res=setNpcScriptsDirect(npc,tabs,scriptEnabled,expectedState);
if(!res.ok){pushBrowser(e.player,"npcScriptApplyResult",{ok:false,error:res.error||"Apply failed"});return;}
setNpcScriptStyle(npc,style);
setNpcDcSelection(npc,{});
setNpcDochiLock(npc,{locked:false});
pushBrowser(e.player,"npcScriptApplyResult",{ok:true,uuid:String(npc.getUUID()),scriptStyle:style,dcSelection:getNpcDcSelection(npc),dochiLock:defaultDochiLock()});
pushNpcList(e.player,getStoredScanRange(e.player));
}
function onNpcScriptEnabledToggle(e,data){
var npc=getNpcInCurrentRange(e.player,String(data.uuid||"")),raw,existing,next,expectedState,res,payload;
if(!npc){pushBrowser(e.player,"npcScriptToggleResult",{ok:false,error:"NPC is outside the current scan range. Refresh or move closer."});return;}
raw=getEntityNbtSafe(npc);
existing=extractScriptTabsFromRaw(raw);
next=(data.scriptEnabled===true||data.scriptEnabled===false)?data.scriptEnabled:!existing.scriptEnabled;
expectedState=buildScriptStateFromTabs(existing.tabs,next);
res=setNpcScriptEnabledDirect(npc,next,expectedState);
if(!res.ok){pushBrowser(e.player,"npcScriptToggleResult",{ok:false,uuid:String(npc.getUUID()),error:res.error||"Script toggle failed"});return;}
payload=buildNpcScriptDataPayload(npc);
payload.ok=true;
payload.action="script_toggle";
payload.scriptEnabled=next;
pushBrowser(e.player,"npcScriptToggleResult",payload);
pushBrowser(e.player,"npcScriptData",payload);
pushNpcList(e.player,getStoredScanRange(e.player));
}
function buildNpcScriptDataPayload(npc){
var raw=getEntityNbtSafe(npc),result=extractScriptTabsFromRaw(raw),lock=getNpcDochiLock(npc);
result.scriptStyle=getNpcScriptStyle(npc);
if(lock.locked)result.scriptStyle="dcE";
result.dcSelection=getNpcDcSelection(npc);
result.dochiLock=lock;
result.uuid=String(npc.getUUID());
return result;
}
function getNpcScriptEnabled(npc){
var raw,result;
try{
raw=getEntityNbtSafe(npc);
result=extractScriptTabsFromRaw(raw);
return result.scriptEnabled===true;
}catch(err){
return true;
}
}
function applyNpcModeOnly(player,npc,style){
var uuid=String(npc.getUUID()),res,payload;
try{
npc=getNpcByUuid(player,uuid)||npc;
res=clearNpcScripts(npc,true);
if(!res.ok)return {ok:false,uuid:uuid,error:res.error||"Script clear failed",styleOnly:true};
refreshNpcClient(npc);
setNpcScriptStyle(npc,style);
setNpcDcSelection(npc,{});
setNpcDochiLock(npc,{locked:false});
refreshNpcClient(npc);
npc=getNpcByUuid(player,uuid)||npc;
payload=buildNpcScriptDataPayload(npc);
payload.ok=true;
payload.styleOnly=true;
payload.uuid=uuid;
payload.scriptStyle=style;
payload.dcSelection=getNpcDcSelection(npc);
payload.dochiLock=getNpcDochiLock(npc);
return payload;
}catch(err){
return {ok:false,uuid:uuid,error:String(err),styleOnly:true};
}
}
function clearAllTabs(tabs){
var out=[],i,t;
for(i=0;i<tabs.length;i++){t=tabs[i]||{};out.push({tab:Number(t.tab||i+1),inlineScript:"",files:[]});}
return out;
}
function clearNpcScripts(npc,scriptEnabled){
var tabs,expectedState,res;
try{
tabs=[{tab:1,inlineScript:"",files:[]}];
expectedState=buildScriptStateFromTabs(tabs,scriptEnabled===true);
res=setNpcScriptsDirect(npc,tabs,scriptEnabled===true,expectedState);
if(!res.ok)return res;
refreshNpcClient(npc);
return {ok:true,tabs:tabs,scriptEnabled:scriptEnabled===true};
}catch(err){
return {ok:false,error:String(err)};
}
}
function refreshNpcClient(npc){
try{if(npc&&typeof npc.updateClient==="function")npc.updateClient();}catch(err0){}
}
function setNpcScriptsDirect(npc,tabs,scriptEnabled,expectedState){
var nbt,verify;
try{
nbt=npc.getEntityNbt();
setNbtScriptEnabled(nbt,scriptEnabled===true);
nbt.setList("Scripts",buildTabNbtObjects(tabs));
npc.setEntityNbt(nbt);
}catch(err){
return {ok:false,error:"direct script write failed: "+String(err)};
}
refreshNpcClient(npc);
verify=verifyEntityScriptWrite(npc,expectedState||buildScriptStateFromTabs(tabs,scriptEnabled===true));
if(!verify.ok)return verify;
return {ok:true};
}
function setNpcScriptEnabledDirect(npc,scriptEnabled,expectedState){
var nbt,verify;
try{
nbt=npc.getEntityNbt();
setNbtScriptEnabled(nbt,scriptEnabled===true);
npc.setEntityNbt(nbt);
}catch(err){
return {ok:false,error:"script enabled write failed: "+String(err)};
}
refreshNpcClient(npc);
verify=verifyEntityScriptWrite(npc,expectedState);
if(!verify.ok)return verify;
return {ok:true};
}
function setNbtScriptEnabled(nbt,enabled){
try{nbt.setByte("ScriptEnabled",enabled?1:0);return;}catch(err0){}
try{nbt.setBoolean("ScriptEnabled",enabled===true);return;}catch(err1){}
try{nbt.setInteger("ScriptEnabled",enabled?1:0);return;}catch(err2){}
}
function buildTabNbtObjects(tabs){
var out=[],i,t;
if(!Array.isArray(tabs)||!tabs.length)tabs=[{tab:1,inlineScript:"",files:[]}];
for(i=0;i<tabs.length;i++){
t=tabs[i]||{};
out.push(API.stringToNbt(buildOneTabNbt(t)));
}
return out;
}
function buildOneTabNbt(t){
var files=[],j,input=t&&t.files?t.files:[];
for(j=0;j<input.length;j++)files.push('{Line:"'+escapeNbtString(input[j])+'"}');
return '{Console:[],Script:"'+escapeNbtString((t&&t.inlineScript)||"")+'",ScriptList:['+files.join(",")+']}';
}
function getNpcScriptStyle(npc){
return String(npc.getStoreddata().get(CFG.STYLE_KEY)||"general");
}
function setNpcScriptStyle(npc,style){
npc.getStoreddata().put(CFG.STYLE_KEY,String(style||"general"));
}
function clearStoredDataKey(store,key){
try{store.put(String(key),"");}catch(err){}
try{store.remove(String(key));}catch(err2){}
}

function normalizeRelPath(path){
var p=String(path||"").replace(/\\/g,"/").replace(/^\s+|\s+$/g,"");
while(p.charAt(0)==="/")p=p.substring(1);
return p.replace(/\/+/g,"/");
}
function stripDcLibPrefix(path){
var p=normalizeRelPath(path);
if(p.toLowerCase().indexOf("dc_lib/")===0)return p.substring(7);
return p;
}
function toDcScriptListPath(path){
var p=normalizeRelPath(path);
if(p.toLowerCase().indexOf("dc_lib/")===0)return p;
return "dc_lib/"+p;
}
function isDochiScriptPath(path){
return normalizeRelPath(path).toLowerCase().indexOf("dc_lib/")===0;
}
function validateGeneralScriptTabs(tabs){
var i,j,files;
for(i=0;i<tabs.length;i++){
files=tabs[i].files||[];
for(j=0;j<files.length;j++){
if(isDochiScriptPath(files[j]))return {ok:false,error:"dc_lib scripts are locked to dcE mode and cannot be added through general ScriptList editing."};
}
}
return {ok:true};
}
function listContainsPath(list,path){
var i,wanted=normalizeRelPath(path).toLowerCase();
for(i=0;i<list.length;i++)if(normalizeRelPath(list[i]).toLowerCase()===wanted)return true;
return false;
}
function normalizeDcSelection(selection){
var sel=selection||{},scriptPath=normalizeRelPath(sel.scriptPath),jsonPath=normalizeRelPath(sel.jsonPath),prefix=String(sel.prefix||""),paths=[],rawPaths=sel.scriptPaths,i,p;
if(rawPaths instanceof Array){
for(i=0;i<rawPaths.length;i++){
p=normalizeRelPath(rawPaths[i]);
if(p)paths.push(p);
}
}
if(!paths.length&&scriptPath)paths.push(scriptPath);
return {scriptPath:scriptPath,scriptPaths:paths,jsonPath:jsonPath,prefix:prefix};
}
function inferDcPrefix(path){
var name=fileNameOnly(path).replace(/\.js$/i,"").toLowerCase();
if(!name)return "";
if(name==="dc_dialogue_trigger"||name.indexOf("dialogue")>=0)return "dc_dialogue";
if(name.indexOf("dc_trainer")===0||name.indexOf("trainer")>=0)return "dc_trainer";
if(name.indexOf("dc_soulmob")===0||name.indexOf("soulmob")>=0)return "dc_soulMob";
if(name.indexOf("dc_taczmob")===0||name.indexOf("taczmob")>=0)return "dc_taczMob";
return "";
}
function fileNameOnly(path){
var p=normalizeRelPath(path),parts=p.split("/");
return parts[parts.length-1]||p;
}
function getDcEntrySpecs(){
return loadDcEntrySpecsFromFiles();
}
function findDcEntrySpecRoots(){
var File=Java.type("java.io.File"),out=[],seen={},roots=findCustomNpcsRoots(),i;
for(i=0;i<roots.length;i++)pushDirIfExists(out,seen,new File(roots[i],"dc_data/dc_installable_scripts"));
return out;
}
function loadDcEntrySpecsFromFiles(){
var roots=findDcEntrySpecRoots(),out=[],seen={},i;
for(i=0;i<roots.length;i++)walkDcEntrySpecFiles(roots[i],roots[i],out,seen);
out.sort(function(a,b){return String(a.name||a.path).localeCompare(String(b.name||b.path));});
return out;
}
function walkDcEntrySpecFiles(root,dir,out,seen){
var list=dir.listFiles(),i,file,name;
if(!list)return;
for(i=0;i<list.length;i++){
file=list[i];
if(file.isDirectory()){walkDcEntrySpecFiles(root,file,out,seen);continue;}
name=String(file.getName()).toLowerCase();
if(name.slice(-5)!==".json")continue;
pushDcEntrySpecsFromFile(out,seen,file);
}
}
function pushDcEntrySpecsFromFile(out,seen,file){
var raw,obj;
try{
raw=readTextFile(file);
obj=JSON.parse(raw);
pushDcEntrySpecsFromValue(out,seen,obj,file);
}catch(err){
return;
}
}
function pushDcEntrySpecsFromValue(out,seen,value,file){
var i,list,spec,key;
if(value instanceof Array){
for(i=0;i<value.length;i++)pushDcEntrySpecsFromValue(out,seen,value[i],file);
return;
}
if(value&&value.entries instanceof Array){
list=value.entries;
for(i=0;i<list.length;i++)pushDcEntrySpecsFromValue(out,seen,list[i],file);
return;
}
spec=normalizeDcEntrySpec(value,file);
if(!spec)return;
key=normalizeRelPath(spec.path).toLowerCase();
if(!key||seen[key])return;
seen[key]=true;
out.push(spec);
}
function normalizeDcEntrySpec(raw,file){
var path,id,name,prefix,jsonRoot;
if(!raw||typeof raw!=="object")return null;
path=stripDcLibPrefix(raw.path||raw.script||raw.source||raw.file||"");
path=normalizeRelPath(path);
if(!path)return null;
id=String(raw.id||fileNameOnly(path).replace(/\.js$/i,"")).replace(/^\s+|\s+$/g,"");
name=String(raw.name||id||fileNameOnly(path)).replace(/^\s+|\s+$/g,"");
prefix=String(raw.prefix||inferDcPrefix(path)||"").replace(/^\s+|\s+$/g,"");
jsonRoot=normalizeRelPath(raw.json_root||raw.jsonRoot||raw.json_dir||raw.jsonDir||"");
return {
id:id,
name:name,
path:path,
prefix:prefix,
requiresJson:raw.requires_json===true||raw.requiresJson===true,
jsonRoot:jsonRoot,
scriptDeps:normalizeDcSpecPathList(raw.script_deps||raw.scriptDeps||raw.dependencies||raw.deps),
htmlDeps:normalizeDcSpecPathList(raw.html_deps||raw.htmlDeps)
};
}
function normalizeDcSpecPathList(list){
var arr=list instanceof Array?list:[],out=[],i,item,path,type;
for(i=0;i<arr.length;i++){
item=arr[i];
type="";
if(typeof item==="string")path=item;
else if(item&&typeof item==="object"){
type=String(item.type||"").toLowerCase();
if(type&&type!=="script"&&type!=="html"&&type!=="js")continue;
path=item.path||item.script||item.file||item.source||"";
}else path="";
path=stripDcLibPrefix(path);
path=normalizeRelPath(path);
if(path)out.push(path);
}
return out;
}
function getDcEntrySpecForPrefix(prefix){
var specs=getDcEntrySpecs(),i,wanted=String(prefix||"");
for(i=0;i<specs.length;i++)if(String(specs[i].prefix||"")===wanted)return specs[i];
return null;
}
function listDcInstallableScripts(){
var scriptRoots=findEcmaScriptRoots("dcE"),htmlRoots=findHtmlRoots(),specs=getDcEntrySpecs(),out=[],i,candidate,primaryRoot="";
if(scriptRoots.length)primaryRoot=String(scriptRoots[0].getAbsolutePath()).replace(/\\/g,"/");
if(!scriptRoots.length)return {root:"",label:"dc_lib",files:[],error:"No dc_lib folder found."};
for(i=0;i<specs.length;i++){
candidate=buildDcInstallableCandidate(specs[i],scriptRoots,htmlRoots);
out.push(candidate);
}
out.sort(function(a,b){return String(a.name||a.path).localeCompare(String(b.name||b.path));});
return {root:primaryRoot,label:"dc_lib",files:out};
}
function findDcInstallableCandidate(path){
var wanted=stripDcLibPrefix(path),scriptRoots=findEcmaScriptRoots("dcE"),htmlRoots=findHtmlRoots(),specs=getDcEntrySpecs(),i,spec;
for(i=0;i<specs.length;i++){
spec=specs[i];
if(normalizeRelPath(spec.path).toLowerCase()===normalizeRelPath(wanted).toLowerCase())return buildDcInstallableCandidate(spec,scriptRoots,htmlRoots);
}
return null;
}
function buildDcInstallableCandidate(spec,scriptRoots,htmlRoots){
var scriptDeps=copyStringArray(spec.scriptDeps),htmlDeps=copyStringArray(spec.htmlDeps),applyScripts=[],missing=[],i,path;
for(i=0;i<scriptDeps.length;i++){
path=normalizeRelPath(scriptDeps[i]);
pushUniquePath(applyScripts,path);
if(!pathExistsInRoots(scriptRoots,path))missing.push("script:"+path);
}
path=normalizeRelPath(spec.path);
pushUniquePath(applyScripts,path);
if(!pathExistsInRoots(scriptRoots,path))missing.push("script:"+path);
for(i=0;i<htmlDeps.length;i++){
path=normalizeRelPath(htmlDeps[i]);
if(!pathExistsInRoots(htmlRoots,path))missing.push("html:"+path);
}
return {id:String(spec.id||spec.path),name:String(spec.name||fileNameOnly(spec.path)),path:normalizeRelPath(spec.path),prefix:String(spec.prefix||inferDcPrefix(spec.path)),requiresJson:spec.requiresJson===true,jsonRoot:normalizeRelPath(spec.jsonRoot||""),scriptDeps:scriptDeps,htmlDeps:htmlDeps,applyScripts:applyScripts,available:missing.length<1,missing:missing};
}
function copyStringArray(list){
var arr=list instanceof Array?list:[],out=[],i,p;
for(i=0;i<arr.length;i++){
p=normalizeRelPath(arr[i]);
if(p)out.push(p);
}
return out;
}
function pushUniquePath(out,path){
var p=normalizeRelPath(path),i;
if(!p)return;
for(i=0;i<out.length;i++)if(normalizeRelPath(out[i]).toLowerCase()===p.toLowerCase())return;
out.push(p);
}
function pathExistsInRoots(roots,relPath){
var File=Java.type("java.io.File"),p=normalizeRelPath(relPath),i,f;
if(!p)return false;
for(i=0;i<roots.length;i++){
f=new File(roots[i],p);
if(f.exists()&&f.isFile())return true;
}
return false;
}
function validateDcApplySelection(selection){
var sel=normalizeDcSelection(selection),candidate=findDcInstallableCandidate(sel.scriptPath),jsons;
if(!sel.scriptPath)return {ok:false,error:"dcE apply requires a dc_lib script path."};
if(!candidate)return {ok:false,error:"Selected dcE script is not an installable entry: "+sel.scriptPath};
if(!candidate.available)return {ok:false,error:"dcE requirements missing: "+candidate.missing.join(", ")};
if(sel.prefix&&sel.prefix!==candidate.prefix)return {ok:false,error:"Selected JSON prefix does not match the dcE script."};
sel.prefix=candidate.prefix;
sel.scriptPaths=candidate.applyScripts;
if(candidate.requiresJson&&!sel.jsonPath)return {ok:false,error:"dcE apply requires a JSON path."};
if(candidate.requiresJson){
jsons=listDcJsonFiles(sel.prefix);
if(jsons.error)return {ok:false,error:jsons.error};
if(!listContainsPath(jsons.files,sel.jsonPath)){
if(sel.prefix==="dc_dialogue")return {ok:false,error:"Dialogue Trigger requires a JSON file with type=start: "+sel.jsonPath};
return {ok:false,error:"Selected JSON file is not installed: "+sel.jsonPath};
}
}
return {ok:true,selection:sel};
}
function applyDochiScriptToNpc(player,npc,data,raw,existing){
var check=validateDcApplySelection(data.dcSelection||{}),selection,tabs,scriptEnabled,expectedState,res,lock,files=[],i;
if(!check.ok){pushBrowser(player,"npcScriptApplyResult",{ok:false,error:check.error});return;}
selection=check.selection;
scriptEnabled=(data.scriptEnabled===true||data.scriptEnabled===false)?data.scriptEnabled:existing.scriptEnabled;
for(i=0;i<selection.scriptPaths.length;i++)files.push(toDcScriptListPath(selection.scriptPaths[i]));
tabs=[{tab:1,inlineScript:"",files:files}];
expectedState=buildScriptStateFromTabs(tabs,scriptEnabled);
res=setNpcScriptsDirect(npc,tabs,scriptEnabled,expectedState);
if(!res.ok){pushBrowser(player,"npcScriptApplyResult",{ok:false,error:res.error||"Dochi apply failed"});return;}
lock=buildDochiLock(selection);
setNpcScriptStyle(npc,"dcE");
setNpcDcSelection(npc,selection);
setNpcDochiLock(npc,lock);
pushBrowser(player,"npcScriptApplyResult",{ok:true,uuid:String(npc.getUUID()),scriptStyle:"dcE",dcSelection:selection,dochiLock:lock});
pushNpcList(player,getStoredScanRange(player));
}

function getEntityNbtSafe(npc){
var raw=String(cnpcext.entityNbt(npc)||"");
if(!raw)throw new Error("entityNbt returned empty data");
return raw;
}
function setEntityNbtSafe(npc,raw,expectedState){
var nbtObj,verify;
if(!raw)return {ok:false,error:"Empty NBT"};
if(!expectedState)expectedState=extractScriptTabsFromRaw(raw);
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
var mode=String(data.mode||"general"),found=mode==="dcE"?listDcInstallableScripts():listEcmaScriptFiles(mode),files=found.files||[],root=found.root||"",query=String(data.query||"").toLowerCase(),out=[],i,s,text;
if(!query)out=files;
else if(mode==="dcE"){
for(i=0;i<files.length;i++){
s=files[i];
text=String((s&&s.path)||s||"")+" "+String((s&&s.name)||"")+" "+String((s&&s.id)||"");
if(text.toLowerCase().indexOf(query)>=0)out.push(s);
}
}else{
for(i=0;i<files.length;i++){s=files[i];if(String(s).toLowerCase().indexOf(query)>=0)out.push(s);}
}
pushBrowser(e.player,"npcScriptFileList",{ok:!found.error,root:root,mode:mode,files:out,error:found.error||""});
}
function ensureDcAdminsRoot(){
var File=Java.type("java.io.File"),roots=[
new File("customnpcs/dc_data"),
new File("./customnpcs/dc_data"),
new File("minecraft/customnpcs/dc_data"),
new File("./minecraft/customnpcs/dc_data"),
new File(".minecraft/customnpcs/dc_data"),
new File("./.minecraft/customnpcs/dc_data")
],i,dir;
for(i=0;i<roots.length;i++){
dir=new File(roots[i],"dc_admins");
if(dir.exists()||dir.mkdirs())return dir;
}
dir=new File("minecraft/customnpcs/dc_data/dc_admins");
if(dir.exists()||dir.mkdirs())return dir;
dir=new File("customnpcs/dc_data/dc_admins");
if(dir.exists()||dir.mkdirs())return dir;
return null;
}
function getAdminFile(){
var dir=ensureDcAdminsRoot(),File=Java.type("java.io.File"),file;
if(!dir)return null;
file=new File(dir,"dc_admins.json");
migrateLegacyAdminFile(file);
return file;
}
function migrateLegacyAdminFile(target){
var File=Java.type("java.io.File"),legacy=[
new File("customnpcs/dc_admins/dc_admins.json"),
new File("./customnpcs/dc_admins/dc_admins.json"),
new File("minecraft/customnpcs/dc_admins/dc_admins.json"),
new File("./minecraft/customnpcs/dc_admins/dc_admins.json"),
new File(".minecraft/customnpcs/dc_admins/dc_admins.json"),
new File("./.minecraft/customnpcs/dc_admins/dc_admins.json")
],i;
if(!target||target.exists())return;
for(i=0;i<legacy.length;i++){
try{
if(legacy[i].exists()&&legacy[i].isFile()){
writeTextFile(target,readTextFile(legacy[i]));
return;
}
}catch(err){}
}
}
function defaultAdminState(){
return {initialized:false,owner:{uuid:"",name:""},admins:[],players:[],keybind:"",canOpen:false,canManageAdmins:false,canEdit:false};
}
function normalizeAdminEntry(entry){
entry=entry||{};
return {uuid:String(entry.uuid||""),name:String(entry.name||"")};
}
function normalizeAdminState(state){
var out=defaultAdminState(),admins=[],players=[],i;
state=state||{};
out.initialized=!!state.initialized;
out.owner=normalizeAdminEntry(state.owner);
if(Array.isArray(state.admins)){for(i=0;i<state.admins.length;i++)admins.push(normalizeAdminEntry(state.admins[i]));}
if(Array.isArray(state.players)){for(i=0;i<state.players.length;i++)players.push(normalizeAdminEntry(state.players[i]));}
out.admins=admins;
out.players=players;
out.keybind=String(state.keybind||"");
out.canOpen=state.canOpen===true;
out.canManageAdmins=state.canManageAdmins===true;
out.canEdit=state.canEdit===true;
return out;
}
function getPlayerIdentity(player){
var name="",uuid="";
if(!player)return {name:"",uuid:""};
name=String(player.getName()||"");
uuid=String(player.getUUID()||"");
return {name:name,uuid:uuid};
}
function sameUuid(a,b){
return String(a||"").trim().toLowerCase()===String(b||"").trim().toLowerCase();
}
function getOnlinePlayers(player){
var out=[],raw=[],i,p,id;
if(!player)return out;
if(player.world&&player.world.getAllPlayers)raw=toJsArray(player.world.getAllPlayers());
if(!raw.length&&API.getAllPlayers)raw=toJsArray(API.getAllPlayers());
for(i=0;i<raw.length;i++){
p=raw[i];
id=getPlayerIdentity(p);
if(!id.uuid&&!id.name)continue;
out.push(id);
}
out.sort(function(a,b){return String(a.name||"").localeCompare(String(b.name||""));});
return out;
}
function loadAdminStateCache(){
var file=getAdminFile(),raw="",state;
if(!file||!file.exists())return normalizeAdminState(defaultAdminState());
raw=readTextFile(file);
if(!raw)return normalizeAdminState(defaultAdminState());
state=JSON.parse(raw);
return normalizeAdminState(state);
}
function saveAdminStateCache(state){
var file=getAdminFile(),text;
if(!file)return {ok:false,error:"Admin storage path unavailable."};
state=normalizeAdminState(state);
text=JSON.stringify(state,null,2);
try{
writeTextFile(file,text);
return {ok:true,file:String(file.getAbsolutePath()).replace(/\\/g,"/"),state:state};
}catch(err){
return {ok:false,error:String(err)};
}
}
function readTextFile(file){
var FileInputStream=Java.type("java.io.FileInputStream"),InputStreamReader=Java.type("java.io.InputStreamReader"),BufferedReader=Java.type("java.io.BufferedReader"),br=null,line,parts=[];
try{
br=new BufferedReader(new InputStreamReader(new FileInputStream(file),"UTF-8"));
while((line=br.readLine())!==null)parts.push(String(line));
return stripBom(parts.join("\n"));
}finally{
if(br)br.close();
}
}
function stripBom(text){
text=String(text||"");
if(text.length&&text.charCodeAt(0)===65279)return text.substring(1);
return text;
}
function writeTextFile(file,text){
var FileWriter=Java.type("java.io.FileWriter"),fw=null,parent=file.getParentFile();
try{
if(parent&&!parent.exists())parent.mkdirs();
fw=new FileWriter(file,false);
fw.write(String(text||""));
fw.flush();
}finally{
if(fw)fw.close();
}
}
function isAdminOwner(player,state){
var id=getPlayerIdentity(player);
state=normalizeAdminState(state||loadAdminStateCache());
return !!state.initialized&&sameUuid(state.owner.uuid,id.uuid);
}
function isAdminMember(player,state){
var id=getPlayerIdentity(player),i,list;
state=normalizeAdminState(state||loadAdminStateCache());
if(!state.initialized)return false;
if(isAdminOwner(player,state))return true;
list=state.admins||[];
for(i=0;i<list.length;i++)if(sameUuid(list[i].uuid,id.uuid))return true;
return false;
}
function buildAdminBrowserState(player){
var state=loadAdminStateCache();
state.players=getOnlinePlayers(player);
state.isOwner=isAdminOwner(player,state);
state.isAdmin=isAdminMember(player,state);
state.canOpen=!state.initialized||state.isOwner||state.isAdmin||state.canOpen;
state.canManageAdmins=!state.initialized||state.isOwner;
state.canEdit=!!state.initialized&&(state.isOwner||state.isAdmin);
state.keybind=getStoredOpenKey(player)||state.keybind||"";
return state;
}
function sendAdminState(player){
if(!player)return;
pushBrowser(player,"adminState",buildAdminBrowserState(player));
}
function broadcastAdminSetupHint(e){
var msg="dc_admins.json is missing. Register admins using @npceditor.";
if(e&&e.player){sendPlayerMessage(e.player,msg);return;}
var players=toJsArray(API.getAllPlayers ? API.getAllPlayers() : []),i;
for(i=0;i<players.length;i++)sendPlayerMessage(players[i],msg);
}
function sendPlayerMessage(player,msg){
if(player&&player.message)player.message(String(msg||""));
else if(player&&player.sendMessage)player.sendMessage(String(msg||""));
else throw new Error("Player message API unavailable");
}
function debugMsg(player,msg){
if(!CFG.DEBUG)return;
sendPlayerMessage(player,"[NPC_EDITOR_DEBUG] "+String(msg||""));
}
function debugError(player,step,err){
debugMsg(player,String(step||"error")+" ERROR: "+String(err&&err.stack||err&&err.message||err));
}
function onBrowserDebug(e,data){
debugMsg(e.player,"HTML "+String(data.step||"event")+" "+String(data.msg||""));
}
function onAdminBootstrap(e){
var player=e.player,id=getPlayerIdentity(player),state=loadAdminStateCache(),saved;
if(state.initialized){pushBrowser(player,"adminBootstrapResult",{ok:false,error:"Admin file already exists."});return;}
state.initialized=true;
state.owner={uuid:id.uuid,name:id.name};
state.admins=[{uuid:id.uuid,name:id.name}];
state.keybind="";
state.canOpen=false;
state.canManageAdmins=true;
state.canEdit=true;
saved=saveAdminStateCache(state);
if(!saved.ok){pushBrowser(player,"adminBootstrapResult",{ok:false,error:saved.error||"Save failed"});return;}
pushBrowser(player,"adminBootstrapResult",{ok:true});
sendAdminState(player);
}
function onAdminAdd(e,data){
var player=e.player,state=loadAdminStateCache(),uuid=String(data.uuid||"").trim(),name=String(data.name||"").trim(),i,saved,exists=false;
if(!isAdminOwner(player,state)){pushBrowser(player,"adminActionResult",{ok:false,action:"admin_add",error:"Only the owner can add admins."});return;}
if(!uuid){pushBrowser(player,"adminActionResult",{ok:false,action:"admin_add",error:"Missing admin uuid."});return;}
state.admins=Array.isArray(state.admins)?state.admins:[];
for(i=0;i<state.admins.length;i++)if(sameUuid(state.admins[i].uuid,uuid)){exists=true;break;}
if(!exists)state.admins.push({uuid:uuid,name:name});
if(sameUuid(state.owner.uuid,uuid)&&name)state.owner.name=name;
saved=saveAdminStateCache(state);
if(!saved.ok){pushBrowser(player,"adminActionResult",{ok:false,action:"admin_add",error:saved.error||"Save failed"});return;}
pushBrowser(player,"adminActionResult",{ok:true,action:"admin_add"});
sendAdminState(player);
}
function onAdminRemove(e,data){
var player=e.player,state=loadAdminStateCache(),uuid=String(data.uuid||"").trim(),i,next=[],saved;
if(!isAdminOwner(player,state)){pushBrowser(player,"adminActionResult",{ok:false,action:"admin_remove",error:"Only the owner can remove admins."});return;}
if(!uuid){pushBrowser(player,"adminActionResult",{ok:false,action:"admin_remove",error:"Missing admin uuid."});return;}
if(sameUuid(state.owner.uuid,uuid)){pushBrowser(player,"adminActionResult",{ok:false,action:"admin_remove",error:"Owner cannot be removed."});return;}
state.admins=Array.isArray(state.admins)?state.admins:[];
for(i=0;i<state.admins.length;i++)if(!sameUuid(state.admins[i].uuid,uuid))next.push(state.admins[i]);
state.admins=next;
saved=saveAdminStateCache(state);
if(!saved.ok){pushBrowser(player,"adminActionResult",{ok:false,action:"admin_remove",error:saved.error||"Save failed"});return;}
pushBrowser(player,"adminActionResult",{ok:true,action:"admin_remove"});
sendAdminState(player);
}
function onAdminReset(e){
var player=e.player,file=getAdminFile();
if(!isAdminOwner(player,loadAdminStateCache())){pushBrowser(player,"adminActionResult",{ok:false,action:"admin_reset",error:"Only the owner can reset admins."});return;}
try{
if(file&&file.exists()&&!file.delete()){pushBrowser(player,"adminActionResult",{ok:false,action:"admin_reset",error:"Admin file delete failed."});return;}
}catch(err){
pushBrowser(player,"adminActionResult",{ok:false,action:"admin_reset",error:String(err)});
return;
}
pushBrowser(player,"adminActionResult",{ok:true,action:"admin_reset"});
sendAdminState(player);
}
function onKeybindSave(e,data){
var player=e.player,state=loadAdminStateCache(),key=String(data.key||"").trim(),saved;
if(!isAdminOwner(player,state)){pushBrowser(player,"adminActionResult",{ok:false,action:"keybind_save",error:"Only the owner can change the keybind."});return;}
state.keybind=key;
setStoredOpenKey(player,key);
saved=saveAdminStateCache(state);
if(!saved.ok){pushBrowser(player,"adminActionResult",{ok:false,action:"keybind_save",error:saved.error||"Save failed"});return;}
pushBrowser(player,"adminActionResult",{ok:true,action:"keybind_save"});
sendAdminState(player);
}
function pushBrowser(player,eventName,obj){
var payload=JSON.stringify(obj);
debugMsg(player,"sendToBrowser "+String(eventName)+" payload="+payload.length);
cnpcext.getClientBridge(player.getMCEntity()).sendToBrowser(String(eventName),payload);
}

function listEcmaScriptFiles(mode){
var roots=findEcmaScriptRoots(mode),out=[],seen={},i,j,root,files,path,primaryRoot="",label=mode==="dcE"?"dc_lib":"ecmascript";
if(!roots.length)return {root:"",files:[],error:"No ecmascript folder found."};
for(i=0;i<roots.length;i++){
root=roots[i];
if(!primaryRoot)primaryRoot=String(root.getAbsolutePath()).replace(/\\/g,"/");
files=[];walkJsFiles(root,root,files);
for(j=0;j<files.length;j++){
path=String(files[j]||"");
if(!path||seen[path])continue;
if(mode!=="dcE"&&isDochiScriptPath(path))continue;
seen[path]=true;
out.push(path);
}
}
out.sort();
return {root:primaryRoot,label:label,files:out};
}
function findEcmaScriptRoots(mode){
var File=Java.type("java.io.File"),out=[],seen={},baseCandidates=mode==="dcE"?
[new File("customnpcs/scripts/ecmascript/dc_lib"),new File("minecraft/customnpcs/scripts/ecmascript/dc_lib"),new File("./customnpcs/scripts/ecmascript/dc_lib"),new File("./minecraft/customnpcs/scripts/ecmascript/dc_lib")] :
[new File("customnpcs/scripts/ecmascript"),new File("minecraft/customnpcs/scripts/ecmascript"),new File("./customnpcs/scripts/ecmascript"),new File("./minecraft/customnpcs/scripts/ecmascript")],i;
for(i=0;i<baseCandidates.length;i++)pushDirIfExists(out,seen,baseCandidates[i]);
return out;
}
function findHtmlRoots(){
var File=Java.type("java.io.File"),out=[],seen={},baseCandidates=[new File("customnpcs/scripts/ecmascript/html"),new File("minecraft/customnpcs/scripts/ecmascript/html"),new File("./customnpcs/scripts/ecmascript/html"),new File("./minecraft/customnpcs/scripts/ecmascript/html")],i;
for(i=0;i<baseCandidates.length;i++)pushDirIfExists(out,seen,baseCandidates[i]);
pushSaveHtmlRoots(out,seen,new File("saves"));
pushSaveHtmlRoots(out,seen,new File("minecraft/saves"));
pushSaveHtmlRoots(out,seen,new File("./saves"));
pushSaveHtmlRoots(out,seen,new File("./minecraft/saves"));
return out;
}
function pushSaveHtmlRoots(out,seen,savesDir){
var File=Java.type("java.io.File"),worlds,i,dir,htmlDir;
if(!savesDir||!savesDir.exists()||!savesDir.isDirectory())return;
worlds=savesDir.listFiles();
if(!worlds)return;
for(i=0;i<worlds.length;i++){
dir=worlds[i];
if(!dir||!dir.isDirectory())continue;
htmlDir=new File(dir,"customnpcs/scripts/ecmascript/html");
pushDirIfExists(out,seen,htmlDir);
}
}
function pushDirIfExists(out,seen,dir){
var p;
if(!dir||!dir.exists()||!dir.isDirectory())return;
p=String(dir.getAbsolutePath()).replace(/\\/g,"/");
if(seen[p])return;
seen[p]=true;
out.push(dir);
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

function buildScriptStateFromTabs(tabs,scriptEnabled){
var out={scriptEnabled:!!scriptEnabled,tabs:[],flatFiles:[],flatInline:[]},seenFiles={},seenInline={},i,j,tab,files,inline,tabNum;
if(!Array.isArray(tabs))tabs=[];
for(i=0;i<tabs.length;i++){
tab=tabs[i]||{};
tabNum=Number(tab.tab||i+1);
files=cleanFileList(tab.files);
inline=normalizeInlineScriptText(tab.inlineScript);
out.tabs.push({tab:tabNum,inlineScript:inline,files:files.slice()});
for(j=0;j<files.length;j++)if(!seenFiles[files[j]]){seenFiles[files[j]]=true;out.flatFiles.push(files[j]);}
if(inline!==""&&!seenInline[inline]){seenInline[inline]=true;out.flatInline.push({tab:tabNum,code:inline});}
}
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
out=out.replace(/\\\\/g,"\\");
if(quoteChar==="'")out=out.replace(/\\'/g,"'");
else out=out.replace(/\\"/g,'"');
out=out.replace(/\\n/g,"\n");
out=out.replace(/\\r/g,"\r");
out=out.replace(/\\t/g,"\t");
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



function defaultDochiLock(){
return {locked:false,mode:"general",scriptPath:"",scriptPaths:[],jsonPath:"",prefix:""};
}
function buildDochiLock(selection){
var sel=normalizeDcSelection(selection);
return {locked:true,mode:"dcE",scriptPath:sel.scriptPath,scriptPaths:sel.scriptPaths,jsonPath:sel.jsonPath,prefix:sel.prefix};
}
function normalizeDochiLock(lock){
var raw=lock||{},out=defaultDochiLock(),paths=raw.scriptPaths,i,p;
out.locked=raw.locked===true||String(raw.locked||"")==="true";
out.mode=String(raw.mode||"general");
out.scriptPath=normalizeRelPath(raw.scriptPath);
if(paths instanceof Array){
for(i=0;i<paths.length;i++){
p=normalizeRelPath(paths[i]);
if(p)out.scriptPaths.push(p);
}
}
if(!out.scriptPaths.length&&out.scriptPath)out.scriptPaths.push(out.scriptPath);
out.jsonPath=normalizeRelPath(raw.jsonPath);
out.prefix=String(raw.prefix||"");
if(out.locked&&!out.mode)out.mode="dcE";
return out;
}
function getNpcDochiLock(npc){
var store=npc.getStoreddata(),raw=String(store.get(CFG.DOCHI_LOCK_KEY)||""),state;
if(raw){
state=normalizeDochiLock(JSON.parse(raw));
if(state.locked&&!state.scriptPath&&!state.scriptPaths.length)return defaultDochiLock();
return state;
}
return defaultDochiLock();
}
function setNpcDochiLock(npc,lock){
var store=npc.getStoreddata(),state=normalizeDochiLock(lock);
if(!state.locked){clearStoredDataKey(store,CFG.DOCHI_LOCK_KEY);return;}
store.put(CFG.DOCHI_LOCK_KEY,JSON.stringify(state));
}
function getNpcDcSelection(npc){
var raw=String(npc.getStoreddata().get(CFG.DC_SELECTION_KEY)||"");
if(!raw)return {scriptPath:"",jsonPath:"",prefix:""};
return JSON.parse(raw);
}
function setNpcDcSelection(npc,selection){
var store=npc.getStoreddata();
var sel=normalizeDcSelection(selection||{});
if(!sel.scriptPath&&!sel.jsonPath&&!sel.prefix&&!sel.scriptPaths.length){
clearStoredDataKey(store,CFG.DC_SELECTION_KEY);
clearStoredDataKey(store,CFG.DIALOGUE_JSON_PATH_KEY);
return;
}
store.put(CFG.DC_SELECTION_KEY,JSON.stringify({scriptPath:String(sel.scriptPath||""),scriptPaths:sel.scriptPaths,jsonPath:String(sel.jsonPath||""),prefix:String(sel.prefix||"")}));
if(sel.prefix==="dc_dialogue"&&sel.jsonPath)store.put(CFG.DIALOGUE_JSON_PATH_KEY,String(sel.jsonPath||""));
else clearStoredDataKey(store,CFG.DIALOGUE_JSON_PATH_KEY);
}
function onNpcDcJsonFileList(e,data){
var prefix=String(data.prefix||"");
var found=listDcJsonFiles(prefix),files=found.files||[],root=found.root||"",query=String(data.query||"").toLowerCase(),out=[],i,s;
if(query){for(i=0;i<files.length;i++){s=files[i];if(String(s).toLowerCase().indexOf(query)>=0)out.push(s);}}else out=files;
pushBrowser(e.player,"npcDcJsonFileList",{ok:!found.error,root:root,label:getDcJsonRootLabel(prefix),prefix:prefix,files:out,error:found.error||""});
}
function listDcJsonFiles(prefix){
var root=resolveDcJsonRoot(prefix),out=[],seen={},checked,rootPath;
if(!root)return {root:"",files:[],error:"No JSON root found."};
rootPath=String(root.getAbsolutePath()).replace(/\\/g,"/");
walkJsonFiles(root,root,out,seen);
if(prefix==="dc_dialogue"){
checked=filterDialogueStartJsonFiles(root,out);
if(!checked.ok)return {root:rootPath,files:[],error:checked.error};
out=checked.files;
}
out.sort();
return {root:rootPath,files:out};
}
function filterDialogueStartJsonFiles(root,files){
var out=[],i,rel,check;
for(i=0;i<files.length;i++){
rel=String(files[i]||"");
check=isDialogueStartJsonFile(root,rel);
if(!check.ok)return check;
if(check.start)out.push(rel);
}
return {ok:true,files:out};
}
function isDialogueStartJsonFile(root,rel){
var File=Java.type("java.io.File"),file=new File(root,rel),raw,obj,type;
try{
raw=readTextFile(file);
obj=JSON.parse(raw);
type=String(obj.node&&obj.node.type||"").toLowerCase();
return {ok:true,start:type==="start"};
}catch(err){
return {ok:false,error:"Invalid dialogue JSON: "+rel+" / "+String(err&&err.message||err)};
}
}
function resolveDcJsonRoot(prefix){
var File=Java.type("java.io.File"),roots=findCustomNpcsRoots(),segments=getDcJsonSegments(prefix),i,j,root;
if(!roots.length||!segments)return null;
for(i=0;i<roots.length;i++){
root=new File(roots[i],segments[0]);
for(j=1;j<segments.length;j++)root=new File(root,segments[j]);
if(!root.exists())root.mkdirs();
if(root.exists()&&root.isDirectory())return root;
}
root=new File(roots[0],segments[0]);
for(j=1;j<segments.length;j++)root=new File(root,segments[j]);
if(!root.exists())root.mkdirs();
return root;
}
function getDcJsonSegments(prefix){
var spec=getDcEntrySpecForPrefix(prefix),segments;
if(spec&&spec.jsonRoot){
segments=splitDcJsonRoot(spec.jsonRoot);
if(segments&&segments.length)return segments;
}
if(prefix==="dc_dialogue")return ["dc_data","dc_dialogues"];
if(prefix==="dc_trainer")return ["dc_data","dc_trainers","spec"];
if(prefix==="dc_soulMob")return ["dc_mob","soulmob"];
if(prefix==="dc_taczMob")return ["dc_mob","taczmob"];
return null;
}
function getDcJsonRootLabel(prefix){
var spec=getDcEntrySpecForPrefix(prefix);
if(spec&&spec.jsonRoot)return spec.jsonRoot;
if(prefix==="dc_dialogue")return "dc_data/dc_dialogues";
if(prefix==="dc_trainer")return "dc_data/dc_trainers/spec";
if(prefix==="dc_soulMob")return "dc_mob/soulmob";
if(prefix==="dc_taczMob")return "dc_mob/taczmob";
return String(prefix||"dc_json");
}
function splitDcJsonRoot(path){
var p=normalizeRelPath(path),parts,out=[],i;
if(!p)return null;
parts=p.split("/");
for(i=0;i<parts.length;i++){
if(!parts[i])continue;
if(i===0&&parts[i].toLowerCase()==="customnpcs")continue;
out.push(parts[i]);
}
return out;
}
function walkJsonFiles(root,dir,out,seen){
var list=dir.listFiles(),i,f,rel;
if(!list)return;
for(i=0;i<list.length;i++){
f=list[i];
if(f.isDirectory())walkJsonFiles(root,f,out,seen);
else if(String(f.getName()).toLowerCase().slice(-5)===".json"){
rel=String(root.toURI().relativize(f.toURI()).getPath()||"");
if(rel&&!seen[rel]){seen[rel]=true;out.push(rel.replace(/\\/g,"/").replace(/\/$/,""));}
}
}
}
function getBestWorldDir(){
var roots=findCustomNpcsRoots();
return roots.length?roots[0]:null;
}
function findCustomNpcsRoots(){
var File=Java.type("java.io.File"),out=[],seen={},baseCandidates=[new File("customnpcs"),new File("./customnpcs"),new File("minecraft/customnpcs"),new File("./minecraft/customnpcs"),new File(".minecraft/customnpcs"),new File("./.minecraft/customnpcs")],i;
for(i=0;i<baseCandidates.length;i++)pushDirIfExists(out,seen,baseCandidates[i]);
return out;
}
