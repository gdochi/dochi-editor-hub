// @version 1.0.0
// @file script_library.js

var DcScriptLibraryAddon = (function(){
  var ADDON_ID = "dc_script_library"
  var HTML = "html/addon_script_library/script_library.html"
  var REPO_OWNER = "gdochi"
  var REPO_NAME = "dochi-editor-hub"
  var REPO_BRANCH = "main"
  var USER_AGENT = "DochiScriptLibrary/1.0"
  var DEFAULT_BASE_PATH = "minecraft/customnpcs/scripts/ecmascript/dc_lib"
  var API = Java.type("noppes.npcs.api.NpcAPI").Instance()
  var Thread = Java.type("java.lang.Thread")
  var File = Java.type("java.io.File")
  var FileWriter = Java.type("java.io.FileWriter")
  var BufferedReader = Java.type("java.io.BufferedReader")
  var InputStreamReader = Java.type("java.io.InputStreamReader")
  var URL = Java.type("java.net.URL")
  var Files = Java.type("java.nio.file.Files")
  var StandardCharsets = Java.type("java.nio.charset.StandardCharsets")
  var sessions = {}
  var sharedCache = null

  function runAsync(fn){
    new (Java.extend(Thread,{run:fn}))().start()
  }

  function key(player){
    try{return String(player.getUUID())}catch(err){}
    return String(player.getName())
  }

  function trim(value){
    return String(value == null ? "" : value).replace(/^\s+|\s+$/g,"")
  }

  function lower(value){
    return String(value || "").toLowerCase()
  }

  function starts(value,prefix){
    return lower(value).indexOf(lower(prefix)) === 0
  }

  function lastSeg(path){
    var parts = String(path || "").replace(/\\/g,"/").split("/")
    return parts.length ? parts[parts.length - 1] : String(path || "")
  }

  function dirname(path){
    var p = String(path || "").replace(/\\/g,"/")
    var idx = p.lastIndexOf("/")
    return idx >= 0 ? p.substring(0,idx) : ""
  }

  function joinRel(a,b){
    a = trim(a).replace(/\\/g,"/").replace(/\/+$/,"")
    b = trim(b).replace(/\\/g,"/").replace(/^\/+/,"")
    if(!a)return b
    if(!b)return a
    return a + "/" + b
  }

  function normalizeRepoPath(path){
    var raw = trim(path).replace(/\\/g,"/").replace(/\/+/g,"/")
    var parts = raw.split("/")
    var out = []
    var i,part
    for(i=0;i<parts.length;i++){
      part = parts[i]
      if(!part || part === ".")continue
      if(part === ".."){
        if(!out.length)throw new Error("Repo path escapes root: " + path)
        out.pop()
      }else{
        out.push(part)
      }
    }
    return out.join("/")
  }

  function normalizeTargetRel(path){
    var raw = trim(path).replace(/\\/g,"/").replace(/^\/+/,"").replace(/\/+/g,"/")
    var parts = raw.split("/")
    var out = []
    var i,part
    for(i=0;i<parts.length;i++){
      part = trim(parts[i])
      if(!part || part === ".")continue
      if(part === "..")throw new Error("Unsafe target path: " + path)
      if(part.indexOf(":") >= 0)throw new Error("Unsafe target path: " + path)
      out.push(part)
    }
    return out.join("/")
  }

  function stripRootPrefix(path){
    var p = normalizeTargetRel(path)
    var parts = p.split("/")
    var changed = true
    var head
    while(changed && parts.length){
      changed = false
      head = lower(parts[0])
      if(head === "minecraft" || head === ".minecraft" || head === "world" || head === "save" || head === "instance"){
        parts.shift()
        changed = true
        continue
      }
      if(head === "customnpcs"){
        parts.shift()
        changed = true
      }
    }
    return parts.join("/")
  }

  function pathHead(path){
    var p = normalizeTargetRel(path)
    return lower(p.split("/")[0] || "")
  }

  function looksLikeTarget(path,type){
    var head = pathHead(path)
    var t = lower(type)
    if(head === "minecraft" || head === ".minecraft" || head === "customnpcs" || head === "scripts" || head === "dc_lib" || head === "world" || head === "save" || head === "instance")return true
    if(t === "html" && head === "html")return true
    if((t === "json" || t === "json_dir") && (head === "dc_data" || head === "scripts"))return true
    return false
  }

  function getFileType(file){
    var t = lower(file && file.type)
    var installAs = trim(file && file.installAs)
    var source = trim(file && file.source)
    if(t === "html" || t === "htm")return "html"
    if(t === "json" || t === "json_dir")return t
    if(/\.html?$/i.test(installAs) || /\.html?$/i.test(source))return "html"
    return "script"
  }

  function customNpcsRoot(){
    var candidates = ["customnpcs","minecraft/customnpcs","./customnpcs","./minecraft/customnpcs"]
    var i,file
    for(i=0;i<candidates.length;i++){
      file = new File(candidates[i])
      if(file.exists())return file.getCanonicalFile()
    }
    return new File("customnpcs").getCanonicalFile()
  }

  function fileInside(file,root){
    var f = file.getCanonicalFile().getPath()
    var r = root.getCanonicalFile().getPath()
    return f === r || f.indexOf(r + File.separator) === 0
  }

  function resolveTargetFile(relative){
    var root = customNpcsRoot()
    var rel = normalizeTargetRel(relative).replace(/\//g,File.separator)
    var file = new File(root,rel).getCanonicalFile()
    if(!fileInside(file,root))throw new Error("Target escapes customnpcs: " + relative)
    return file
  }

  function resolveTargetRelative(path,type){
    var p = stripRootPrefix(path)
    var t = lower(type)
    if(t === "html"){
      if(starts(p,"scripts/ecmascript/"))return normalizeTargetRel(p)
      if(starts(p,"html/"))return normalizeTargetRel("scripts/ecmascript/" + p)
      return normalizeTargetRel("scripts/ecmascript/html/" + p)
    }
    if(t === "script" || t === "js"){
      if(starts(p,"scripts/ecmascript/"))return normalizeTargetRel(p)
      return normalizeTargetRel("scripts/ecmascript/" + p)
    }
    return normalizeTargetRel(p)
  }

  function resolveInstallRelative(entry,file){
    var installAs = normalizeTargetRel(file.installAs || file.source || "")
    var type = getFileType(file)
    var base
    if(looksLikeTarget(installAs,type))return resolveTargetRelative(installAs,type)
    if(type === "html")return resolveTargetRelative(installAs,"html")
    base = entry.installDir || sharedBasePath()
    if(!entry.installDir && entry.subPath)base = joinRel(base,entry.subPath)
    return resolveTargetRelative(joinRel(base,installAs),type)
  }

  function sharedBasePath(){
    return sharedCache && sharedCache.basePath ? sharedCache.basePath : DEFAULT_BASE_PATH
  }

  function canonicalKey(path){
    return normalizeTargetRel(path).toLowerCase()
  }

  function dependencyKey(path){
    var p = stripRootPrefix(path)
    if(starts(p,"scripts/ecmascript/"))p = p.substring("scripts/ecmascript/".length)
    return canonicalKey(p)
  }

  function addProvider(index,keyValue,record){
    var k = dependencyKey(keyValue)
    if(k && !index[k])index[k] = record
  }

  function readTextFile(file){
    var raw = new java.lang.String(Files.readAllBytes(file.toPath()), StandardCharsets.UTF_8)
    raw = String(raw || "")
    if(raw.length && raw.charCodeAt(0) === 65279)raw = raw.substring(1)
    return raw
  }

  function writeTextFile(file,text){
    var parent = file.getParentFile()
    var fw = null
    try{
      if(parent && !parent.exists())parent.mkdirs()
      fw = new FileWriter(file,false)
      fw.write(String(text || ""))
      fw.flush()
    }finally{
      if(fw)fw.close()
    }
  }

  function fetchText(path){
    var url = "https://raw.githubusercontent.com/" + REPO_OWNER + "/" + REPO_NAME + "/" + REPO_BRANCH + "/" + normalizeRepoPath(path)
    var conn = null
    var br = null
    var line
    var out = []
    conn = new URL(url).openConnection()
    conn.setConnectTimeout(9000)
    conn.setReadTimeout(18000)
    conn.setRequestProperty("User-Agent",USER_AGENT)
    try{
      if(typeof conn.getResponseCode === "function" && conn.getResponseCode() >= 400)throw new Error("HTTP " + conn.getResponseCode() + " for " + path)
    }catch(codeErr){
      if(String(codeErr).indexOf("HTTP ") === 0)throw codeErr
    }
    try{
      br = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))
      while((line = br.readLine()) !== null)out.push(String(line))
    }finally{
      if(br)br.close()
    }
    return out.join("\n")
  }

  function fetchJson(path){
    return JSON.parse(fetchText(path))
  }

  function normalizeDependency(dep){
    dep = dep || {}
    return {
      type:trim(dep.type || "file").toLowerCase(),
      path:trim(dep.path || ""),
      id:trim(dep.id || ""),
      required:dep.required !== false,
      note:trim(dep.note || "")
    }
  }

  function normalizeFile(file){
    file = file || {}
    var deps = []
    var sourceDeps = file.dependencies instanceof Array ? file.dependencies : []
    var i
    for(i=0;i<sourceDeps.length;i++)deps.push(normalizeDependency(sourceDeps[i]))
    return {
      source:trim(file.source || file.path || ""),
      installAs:trim(file.install_as || file.installAs || file.source || file.path || ""),
      type:trim(file.type || ""),
      dependencies:deps
    }
  }

  function normalizePlayerScripts(value){
    var arr = value instanceof Array ? value : []
    var out = []
    var i,item,line,path
    for(i=0;i<arr.length;i++){
      item = arr[i] || {}
      line = trim(item.line || "")
      path = trim(item.path || "")
      if(line || path)out.push({line:line,path:path})
    }
    return out
  }

  function normalizeManifest(data,manifestPath,rootPackage){
    var files = []
    var sourceFiles = data && data.files instanceof Array ? data.files : []
    var i
    for(i=0;i<sourceFiles.length;i++)files.push(normalizeFile(sourceFiles[i]))
    return {
      key:[trim(data.package),trim(data.editor),trim(data.mc_version)].join("|").toLowerCase(),
      id:trim(data.id || rootPackage.id || ""),
      package:trim(data.package || rootPackage.package || ""),
      version:trim(data.version || rootPackage.latest || ""),
      editor:trim(data.editor || rootPackage.editor || ""),
      mcVersion:trim(data.mc_version || rootPackage.mc_version || ""),
      description:trim(data.description || ""),
      entry:trim(data.entry || ""),
      installDir:trim(data.install_dir || rootPackage.install_dir || ""),
      subPath:trim(data.sub_path || rootPackage.sub_path || ""),
      manifestPath:manifestPath,
      files:files,
      playerScripts:normalizePlayerScripts(data.player_scripts)
    }
  }

  function rootPackages(root){
    var arr = root && root.packages instanceof Array ? root.packages : []
    var out = []
    var i,p
    for(i=0;i<arr.length;i++){
      p = arr[i] || {}
      out.push({
        id:trim(p.id || ""),
        package:trim(p.package || ""),
        editor:trim(p.editor || ""),
        mc_version:trim(p.mc_version || ""),
        sub_path:trim(p.sub_path || ""),
        install_dir:trim(p.install_dir || ""),
        latest:trim(p.latest || ""),
        versions:p.versions instanceof Array ? p.versions : []
      })
    }
    return out
  }

  function loadLibrary(force){
    if(sharedCache && !force)return sharedCache
    var root = fetchJson("manifest.json")
    var packages = rootPackages(root)
    var entries = []
    var errors = []
    var i,j,p,manifestPath,data,entry
    for(i=0;i<packages.length;i++){
      p = packages[i]
      for(j=0;j<p.versions.length;j++){
        manifestPath = normalizeRepoPath(String(p.versions[j] || ""))
        if(!manifestPath)continue
        try{
          data = fetchJson(manifestPath)
          entry = normalizeManifest(data,manifestPath,p)
          entries.push(entry)
        }catch(loadErr){
          errors.push(manifestPath + ": " + String(loadErr))
        }
      }
    }
    if(!entries.length)throw new Error(errors.length ? errors.join(" / ") : "No package manifests were found.")
    sharedCache = {
      loadedAt:new Date().toISOString(),
      basePath:trim(root.base_path || DEFAULT_BASE_PATH),
      entries:entries,
      packages:buildGroups(entries),
      providers:buildProviderIndex(entries),
      errors:errors
    }
    return sharedCache
  }

  function buildGroups(entries){
    var groups = []
    var byKey = {}
    var i,e,g
    for(i=0;i<entries.length;i++){
      e = entries[i]
      if(!e.key)continue
      g = byKey[e.key]
      if(!g){
        g = {key:e.key,package:e.package,editor:e.editor,mcVersion:e.mcVersion,description:e.description,latest:e.version,installedVersion:"",versions:[]}
        byKey[e.key] = g
        groups.push(g)
      }
      g.versions.push(entrySummary(e))
      if(!g.latest || e.version > g.latest)g.latest = e.version
    }
    groups.sort(function(a,b){return String(a.package).localeCompare(String(b.package))})
    for(i=0;i<groups.length;i++){
      groups[i].versions.sort(function(a,b){return String(b.version).localeCompare(String(a.version))})
      if(groups[i].versions.length)groups[i].latest = groups[i].versions[0].version
    }
    return groups
  }

  function entrySummary(e){
    return {
      version:e.version,
      description:e.description,
      manifestPath:e.manifestPath,
      fileCount:e.files.length,
      playerScriptCount:e.playerScripts.length,
      dependencies:dependencySummaries(e)
    }
  }

  function dependencySummaries(e){
    var out = []
    var seen = {}
    var i,j,file,dep,k
    for(i=0;i<e.files.length;i++){
      file = e.files[i]
      for(j=0;j<file.dependencies.length;j++){
        dep = file.dependencies[j]
        k = dep.type + ":" + (dep.path || dep.id)
        if(seen[k])continue
        seen[k] = true
        out.push({type:dep.type,path:dep.path,id:dep.id,required:dep.required,note:dep.note})
      }
    }
    return out
  }

  function buildProviderIndex(entries){
    var index = {}
    var i,j,e,file,rel,record
    for(i=0;i<entries.length;i++){
      e = entries[i]
      for(j=0;j<e.files.length;j++){
        file = e.files[j]
        rel = resolveInstallRelative(e,file)
        record = {entry:e,file:file,sourceKind:"dependency"}
        addProvider(index,rel,record)
        if(starts(rel,"scripts/ecmascript/"))addProvider(index,rel.substring("scripts/ecmascript/".length),record)
      }
    }
    return index
  }

  function findEntry(groupKey,version){
    var cache = sharedCache || loadLibrary(false)
    var i,e
    for(i=0;i<cache.entries.length;i++){
      e = cache.entries[i]
      if(e.key === groupKey && e.version === version)return e
    }
    return null
  }

  function push(player,eventName,data){
    try{
      if(typeof cnpcext === "undefined" || !cnpcext || typeof cnpcext.getClientBridge !== "function")return
      cnpcext.getClientBridge(player.getMCEntity()).sendToBrowser(String(eventName), JSON.stringify(data || {}))
    }catch(err){}
  }

  function registryFile(){
    return resolveTargetFile("dc_data/dc_script_library_installs.json")
  }

  function loadRegistry(){
    var file = registryFile()
    if(!file.exists())return {}
    try{return JSON.parse(readTextFile(file))}catch(err){}
    return {}
  }

  function saveRegistry(registry){
    writeTextFile(registryFile(), JSON.stringify(registry || {}, null, 2))
  }

  function registryKey(entry){
    return [entry.package,entry.editor,entry.mcVersion].join("|").toLowerCase()
  }

  function applyInstalledVersions(groups,registry){
    var i,g,rec
    for(i=0;i<groups.length;i++){
      g = groups[i]
      rec = registry[g.key]
      g.installedVersion = rec && rec.version ? String(rec.version) : ""
    }
  }

  function statePayload(){
    var cache = sharedCache || loadLibrary(false)
    var registry = loadRegistry()
    var groups = JSON.parse(JSON.stringify(cache.packages))
    applyInstalledVersions(groups,registry)
    return {
      ok:true,
      loadedAt:cache.loadedAt,
      repo:REPO_OWNER + "/" + REPO_NAME,
      branch:REPO_BRANCH,
      customNpcsRoot:String(customNpcsRoot().getPath()),
      packages:groups,
      errors:cache.errors || []
    }
  }

  function pushState(player){
    push(player,"scriptLibraryState",statePayload())
  }

  function open(player){
    if(!player)return false
    if(typeof cnpcext === "undefined" || !cnpcext || typeof cnpcext.openHtmlGui !== "function"){
      player.message("CNPCExtended HTML GUI is required.")
      return false
    }
    sessions[key(player)] = {player:player,pending:null,busy:false}
    cnpcext.openHtmlGui(player,HTML,0,0,JSON.stringify({
      title:"Script Library",
      repo:REPO_OWNER + "/" + REPO_NAME,
      branch:REPO_BRANCH
    }))
    runAsync(function(){
      try{
        push(player,"scriptLibraryProgress",{status:"loading",message:"Loading package manifests..."})
        loadLibrary(false)
        pushState(player)
        push(player,"scriptLibraryProgress",{status:"ready",message:"Ready"})
      }catch(err){
        push(player,"scriptLibraryState",{ok:false,error:String(err)})
      }
    })
    return true
  }

  function collectDependencies(entry){
    var out = []
    var i,j,file
    for(i=0;i<entry.files.length;i++){
      file = entry.files[i]
      for(j=0;j<file.dependencies.length;j++)out.push(file.dependencies[j])
    }
    return out
  }

  function createRecord(entry,file,kind){
    var rel = resolveInstallRelative(entry,file)
    return {
      entry:entry,
      file:file,
      kind:kind,
      targetRel:rel,
      targetFile:resolveTargetFile(rel),
      repoPath:normalizeRepoPath(joinRel(dirname(entry.manifestPath),file.source))
    }
  }

  function buildPlan(entry){
    var cache = sharedCache || loadLibrary(false)
    var records = []
    var seen = {}
    var deps = collectDependencies(entry)
    var i,dep,provider,record,file,k
    for(i=0;i<deps.length;i++){
      dep = deps[i]
      if(dep.type === "script" || dep.type === "html"){
        provider = cache.providers[dependencyKey(dep.path)]
        if(!provider && dep.required)throw new Error("Dependency source not found: " + dep.type + " " + dep.path)
        if(provider){
          record = createRecord(provider.entry,provider.file,"dependency")
          k = canonicalKey(record.targetRel)
          if(!seen[k]){
            seen[k] = true
            records.push(record)
          }
        }
      }
    }
    for(i=0;i<entry.files.length;i++){
      file = entry.files[i]
      record = createRecord(entry,file,"selected")
      k = canonicalKey(record.targetRel)
      if(!seen[k]){
        seen[k] = true
        records.push(record)
      }
    }
    return {entry:entry,records:records,dependencies:deps}
  }

  function comparePlan(plan,player){
    var states = []
    var i,record,remote,local,state
    for(i=0;i<plan.records.length;i++){
      record = plan.records[i]
      push(player,"scriptLibraryProgress",{status:"checking",message:lastSeg(record.targetRel),current:i + 1,total:plan.records.length})
      remote = fetchText(record.repoPath)
      record.remoteText = remote
      state = "new"
      if(record.targetFile.exists()){
        local = readTextFile(record.targetFile)
        state = local === remote ? "same" : "changed"
      }
      states.push({
        key:canonicalKey(record.targetRel),
        name:lastSeg(record.targetRel),
        path:record.targetRel,
        state:state,
        kind:record.kind
      })
    }
    return states
  }

  function ensureDependencyDirectories(deps){
    var count = 0
    var i,dep,rel,file
    for(i=0;i<deps.length;i++){
      dep = deps[i]
      if(dep.type !== "json_dir")continue
      rel = resolveTargetRelative(dep.path,"json_dir")
      file = resolveTargetFile(rel)
      if(!file.exists() && file.mkdirs())count++
    }
    return count
  }

  function writePlan(player,pending,selectedKeys){
    var plan = pending.plan
    var states = pending.states
    var selected = selectedKeys || {}
    var written = 0
    var skipped = 0
    var i,record,state,keyValue,existsAlready,parent,registry,regKey
    ensureDependencyDirectories(plan.dependencies)
    for(i=0;i<plan.records.length;i++){
      record = plan.records[i]
      state = states[i]
      keyValue = canonicalKey(record.targetRel)
      existsAlready = state && state.state !== "new"
      if(existsAlready && selected[keyValue] !== true){
        skipped++
        push(player,"scriptLibraryProgress",{status:"skipping",message:lastSeg(record.targetRel),current:i + 1,total:plan.records.length})
        continue
      }
      push(player,"scriptLibraryProgress",{status:"writing",message:lastSeg(record.targetRel),current:i + 1,total:plan.records.length})
      parent = record.targetFile.getParentFile()
      if(parent && !parent.exists())parent.mkdirs()
      writeTextFile(record.targetFile,record.remoteText)
      written++
    }
    ensurePlayerScriptEntries(plan.entry)
    registry = loadRegistry()
    regKey = registryKey(plan.entry)
    registry[regKey] = {
      package:plan.entry.package,
      editor:plan.entry.editor,
      mc_version:plan.entry.mcVersion,
      version:plan.entry.version,
      installed_at:new Date().toISOString(),
      files:states
    }
    saveRegistry(registry)
    push(player,"scriptLibraryInstallResult",{ok:true,package:plan.entry.package,version:plan.entry.version,written:written,skipped:skipped})
    pushState(player)
  }

  function playerScriptsPath(){
    return resolveTargetFile("scripts/player_scripts.json")
  }

  function buildDefaultPlayerScriptsText(lineValue){
    var first = lineValue ? "\n                {\n                    \"Line\": \"" + lineValue + "\"\n                }\n" : "\n"
    return "{\n    \"Scripts\": [\n        {\n            \"Script\": \"\",\n            \"Console\": [\n            ],\n            \"ScriptList\": [" + first + "            ]\n        },\n        {\n            \"Script\": \"\",\n            \"Console\": [\n            ],\n            \"ScriptList\": [\n            ]\n        }\n    ],\n    \"ScriptLanguage\": \"ECMAScript\",\n    \"ScriptConsole\": [\n    ],\n    \"ScriptEnabled\": 1b\n}\n"
  }

  function injectPlayerScriptLine(text,lineValue){
    var target = trim(lineValue)
    var pattern = /("ScriptList"\s*:\s*\[)([\s\S]*?)(\s*\])/
    var replaced = false
    if(!target)return {text:text,changed:false}
    if(String(text || "").indexOf("\"Line\": \"" + target + "\"") >= 0)return {text:text,changed:false}
    if(!pattern.test(String(text || "")))return {text:buildDefaultPlayerScriptsText(target),changed:true}
    text = String(text || "").replace(pattern,function(full,start,inner,close){
      var trimmed
      if(replaced)return full
      replaced = true
      trimmed = trim(inner)
      if(!trimmed)return start + "\n                {\n                    \"Line\": \"" + target + "\"\n                }\n            " + close
      return start + String(inner || "").replace(/\s*$/,"") + ",\n                {\n                    \"Line\": \"" + target + "\"\n                }\n            " + close
    })
    return {text:text,changed:replaced}
  }

  function playerScriptBasePrefix(entry){
    var base = entry.installDir || sharedBasePath()
    if(!entry.installDir && entry.subPath)base = joinRel(base,entry.subPath)
    base = stripRootPrefix(base)
    if(starts(base,"scripts/ecmascript/"))base = base.substring("scripts/ecmascript/".length)
    return normalizeTargetRel(base || "dc_lib")
  }

  function normalizePlayerScriptLine(spec,entry){
    var raw = trim((spec && (spec.line || spec.path)) || "")
    var rel
    if(!raw)return ""
    rel = stripRootPrefix(raw)
    if(starts(rel,"scripts/ecmascript/"))rel = rel.substring("scripts/ecmascript/".length)
    if(starts(rel,"dc_lib/"))return normalizeTargetRel(rel)
    return normalizeTargetRel(joinRel(playerScriptBasePrefix(entry),rel))
  }

  function ensurePlayerScriptEntries(entry){
    var specs = entry.playerScripts || []
    var file = playerScriptsPath()
    var text = ""
    var next
    var changed = 0
    var i,line,patched
    if(!specs.length)return 0
    try{
      text = file.exists() ? readTextFile(file) : buildDefaultPlayerScriptsText("")
    }catch(err){
      text = buildDefaultPlayerScriptsText("")
    }
    next = text
    for(i=0;i<specs.length;i++){
      line = normalizePlayerScriptLine(specs[i],entry)
      patched = injectPlayerScriptLine(next,line)
      next = patched.text
      if(patched.changed)changed++
    }
    if(changed)writeTextFile(file,next)
    return changed
  }

  function onRefresh(player){
    runAsync(function(){
      try{
        push(player,"scriptLibraryProgress",{status:"loading",message:"Refreshing package manifests..."})
        loadLibrary(true)
        pushState(player)
        push(player,"scriptLibraryProgress",{status:"ready",message:"Refreshed"})
      }catch(err){
        push(player,"scriptLibraryState",{ok:false,error:String(err)})
      }
    })
  }

  function onInstall(player,data){
    runAsync(function(){
      var session = sessions[key(player)] || {}
      var entry,plan,states,existing,requestId
      try{
        if(session.busy)return
        session.busy = true
        loadLibrary(false)
        entry = findEntry(String(data.key || ""), String(data.version || ""))
        if(!entry)throw new Error("Package version not found.")
        plan = buildPlan(entry)
        states = comparePlan(plan,player)
        existing = []
        var i
        for(i=0;i<states.length;i++)if(states[i].state !== "new")existing.push(states[i])
        requestId = String(new Date().getTime()) + "_" + Math.floor(Math.random() * 100000)
        session.pending = {id:requestId,plan:plan,states:states}
        sessions[key(player)] = session
        if(existing.length){
          push(player,"scriptLibraryOverwrite",{requestId:requestId,files:existing})
        }else{
          writePlan(player,session.pending,{})
          session.pending = null
        }
      }catch(err){
        push(player,"scriptLibraryInstallResult",{ok:false,error:String(err)})
      }finally{
        session.busy = false
      }
    })
  }

  function onInstallConfirm(player,data){
    runAsync(function(){
      var session = sessions[key(player)] || {}
      var pending = session.pending
      var selected = {}
      var arr = data && data.selectedKeys instanceof Array ? data.selectedKeys : []
      var i
      try{
        if(!pending || pending.id !== String(data.requestId || ""))throw new Error("Install confirmation expired.")
        for(i=0;i<arr.length;i++)selected[canonicalKey(arr[i])] = true
        session.pending = null
        writePlan(player,pending,selected)
      }catch(err){
        push(player,"scriptLibraryInstallResult",{ok:false,error:String(err)})
      }
    })
  }

  function onInstallCancel(player,data){
    var session = sessions[key(player)] || {}
    if(session.pending && session.pending.id === String(data.requestId || ""))session.pending = null
    push(player,"scriptLibraryInstallResult",{ok:false,cancelled:true,error:"Install cancelled."})
  }

  function handleHtmlEvent(e){
    var player = e.player
    var data = {}
    if(!player)return false
    if(e.data && String(e.data) !== "")data = JSON.parse(String(e.data))
    if(e.eventName === "__guiClosed"){
      delete sessions[key(player)]
      return true
    }
    if(e.eventName === "script_library_ready"){
      if(sharedCache)pushState(player)
      else push(player,"scriptLibraryProgress",{status:"loading",message:"Loading package manifests..."})
      return true
    }
    if(e.eventName === "script_library_refresh"){
      onRefresh(player)
      return true
    }
    if(e.eventName === "script_library_install"){
      onInstall(player,data)
      return true
    }
    if(e.eventName === "script_library_install_confirm"){
      onInstallConfirm(player,data)
      return true
    }
    if(e.eventName === "script_library_install_cancel"){
      onInstallCancel(player,data)
      return true
    }
    return false
  }

  return {
    ADDON_ID:ADDON_ID,
    open:open,
    htmlGuiEvent:handleHtmlEvent
  }
})()

/**
 * @param {Object} e
 */
function htmlGuiEvent(e){
  try{ DcScriptLibraryAddon.htmlGuiEvent(e) }catch(err){ try{ if(e && e.player)e.player.message("Script Library error: " + String(err)) }catch(ignore){} }
}
