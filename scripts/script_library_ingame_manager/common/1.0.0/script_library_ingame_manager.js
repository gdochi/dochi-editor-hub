// ============================================================================
// Dochi Script Library In-game Manager
// Script Type: Player script or NPC script
// Requires: CNPCExtended + MCEF
// Open: chat dce, or attach to an NPC and interact with it
// ============================================================================

var DochiScriptLibraryIngameManager = (function(){
  var HTML_PATH = "html/script_library_ingame_manager.html"
  var REPO_OWNER = "gdochi"
  var REPO_NAME = "dochi-editor-hub"
  var REPO_BRANCH = "main"
  var ROOT_MANIFEST = "manifest.json"
  var USER_AGENT = "DochiScriptLibraryIngameManager/1.0"
  var DEFAULT_BASE_PATH = "minecraft/customnpcs/scripts/ecmascript/dc_lib"
  var LANG_DIR = "dc_data/dc_lang/script_library"
  var LANG_DIRS = [LANG_DIR, "scripts/ecmascript/dc_lang/script_library"]
  var LOCALE_PREF_KEY = "dochi_script_library_locale"

  var Thread = Java.type("java.lang.Thread")
  var File = Java.type("java.io.File")
  var FileInputStream = Java.type("java.io.FileInputStream")
  var FileOutputStream = Java.type("java.io.FileOutputStream")
  var InputStreamReader = Java.type("java.io.InputStreamReader")
  var OutputStreamWriter = Java.type("java.io.OutputStreamWriter")
  var BufferedReader = Java.type("java.io.BufferedReader")
  var URL = Java.type("java.net.URL")
  var StandardCharsets = Java.type("java.nio.charset.StandardCharsets")

  var cache = null
  var sessions = {}

  function runAsync(fn){
    new (Java.extend(Thread, { run: fn }))().start()
  }

  function trim(value){
    return String(value == null ? "" : value).replace(/^\s+|\s+$/g, "")
  }

  function lower(value){
    return String(value == null ? "" : value).toLowerCase()
  }

  function startsWith(value, prefix){
    return lower(value).indexOf(lower(prefix)) === 0
  }

  function playerKey(player){
    try{ return String(player.getUUID()) }catch(err){}
    try{ return String(player.getName()) }catch(err2){}
    return "unknown"
  }

  function lastSegment(path){
    var parts = String(path || "").replace(/\\/g, "/").split("/")
    return parts.length ? parts[parts.length - 1] : String(path || "")
  }

  function dirname(path){
    var p = String(path || "").replace(/\\/g, "/")
    var idx = p.lastIndexOf("/")
    return idx >= 0 ? p.substring(0, idx) : ""
  }

  function joinRel(a, b){
    a = trim(a).replace(/\\/g, "/").replace(/\/+$/g, "")
    b = trim(b).replace(/\\/g, "/").replace(/^\/+/g, "")
    if(!a) return b
    if(!b) return a
    return a + "/" + b
  }

  function normalizeRepoPath(path){
    var raw = trim(path).replace(/\\/g, "/").replace(/\/+/g, "/")
    var parts = raw.split("/")
    var out = []
    var i, part
    for(i = 0; i < parts.length; i++){
      part = trim(parts[i])
      if(!part || part === ".") continue
      if(part === ".."){
        if(!out.length) throw new Error("Repo path escapes root: " + path)
        out.pop()
      }else{
        out.push(part)
      }
    }
    return out.join("/")
  }

  function normalizeTargetRel(path){
    var raw = trim(path).replace(/\\/g, "/").replace(/^\/+/g, "").replace(/\/+/g, "/")
    var parts = raw.split("/")
    var out = []
    var i, part
    for(i = 0; i < parts.length; i++){
      part = trim(parts[i])
      if(!part || part === ".") continue
      if(part === "..") throw new Error("Unsafe target path: " + path)
      if(part.indexOf(":") >= 0) throw new Error("Unsafe target path: " + path)
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
      }else if(head === "customnpcs"){
        parts.shift()
        changed = true
      }
    }
    return parts.join("/")
  }

  function looksLikeTargetPath(path, type){
    var p = normalizeTargetRel(path)
    var head = lower(p.split("/")[0] || "")
    var t = lower(type)
    if(head === "minecraft" || head === ".minecraft" || head === "customnpcs" || head === "scripts" || head === "dc_lib") return true
    if(head === "dc_data" || head === "dc_mob") return true
    if(t === "html" && head === "html") return true
    return false
  }

  function customNpcsRoot(){
    var candidates = ["customnpcs", "minecraft/customnpcs", "./customnpcs", "./minecraft/customnpcs"]
    var i, f
    for(i = 0; i < candidates.length; i++){
      f = new File(candidates[i])
      if(f.exists()) return f.getCanonicalFile()
    }
    return new File("customnpcs").getCanonicalFile()
  }

  function saveCustomNpcsRoot(){
    var candidates = ["saves", "minecraft/saves", "./saves", "./minecraft/saves"]
    var best = null
    var bestScore = -1
    var i, savesDir, worlds, j, worldDir, customDir, htmlDir, score
    for(i = 0; i < candidates.length; i++){
      savesDir = new File(candidates[i])
      if(!savesDir.exists() || !savesDir.isDirectory()) continue
      worlds = savesDir.listFiles()
      if(!worlds) continue
      for(j = 0; j < worlds.length; j++){
        worldDir = worlds[j]
        if(!worldDir || !worldDir.isDirectory()) continue
        customDir = new File(worldDir, "customnpcs")
        if(!customDir.exists() && !worldDir.exists()) continue
        htmlDir = new File(customDir, "scripts/ecmascript/html")
        score = (customDir.exists() ? customDir.lastModified() : worldDir.lastModified())
        if(htmlDir.exists()) score += 1000000000000
        if(score > bestScore){
          bestScore = score
          best = customDir
        }
      }
    }
    if(best) return best.getCanonicalFile()
    throw new Error("HTML install requires a world save customnpcs folder")
  }

  function targetRootFor(relativePath){
    var rel = normalizeTargetRel(relativePath)
    if(rel === "scripts/ecmascript/html" || startsWith(rel, "scripts/ecmascript/html/")) return saveCustomNpcsRoot()
    return customNpcsRoot()
  }

  function isInside(file, root){
    var f = String(file.getCanonicalFile().getPath())
    var r = String(root.getCanonicalFile().getPath())
    return f === r || f.indexOf(r + File.separator) === 0
  }

  function resolveTargetFile(relativePath){
    var root = targetRootFor(relativePath)
    var rel = normalizeTargetRel(relativePath).replace(/\//g, File.separator)
    var file = new File(root, rel).getCanonicalFile()
    if(!isInside(file, root)) throw new Error("Target escapes customnpcs: " + relativePath)
    return file
  }

  function readLocalText(file){
    var input = null
    var reader = null
    var br = null
    var line
    var out = []
    try{
      input = new FileInputStream(file)
      reader = new InputStreamReader(input, StandardCharsets.UTF_8)
      br = new BufferedReader(reader)
      while((line = br.readLine()) !== null) out.push(String(line))
    }finally{
      if(br) br.close()
      else if(reader) reader.close()
      else if(input) input.close()
    }
    var text = out.join("\n")
    if(text.length && text.charCodeAt(0) === 65279) text = text.substring(1)
    return text
  }

  function writeLocalText(file, text){
    var parent = file.getParentFile()
    var output = null
    var writer = null
    try{
      if(parent && !parent.exists()) parent.mkdirs()
      output = new FileOutputStream(file, false)
      writer = new OutputStreamWriter(output, StandardCharsets.UTF_8)
      writer.write(String(text || ""))
      writer.flush()
    }finally{
      if(writer) writer.close()
      else if(output) output.close()
    }
  }

  function normalizeLocale(value){
    var locale = String(value || "en_us").toLowerCase().replace("-", "_")
    if(!/^[a-z]{2,3}_[a-z0-9_]+$/.test(locale)) return "en_us"
    return locale || "en_us"
  }

  function normalizeLocaleCandidate(value){
    var locale = String(value || "").toLowerCase().replace("-", "_")
    if(!/^[a-z]{2,3}_[a-z0-9_]+$/.test(locale)) return ""
    return locale
  }

  function getStoredLocalePreference(player){
    try{ return normalizeLocaleCandidate(player.getStoreddata().get(LOCALE_PREF_KEY) || "") }catch(err){}
    return ""
  }

  function setStoredLocalePreference(player, locale){
    locale = normalizeLocaleCandidate(locale)
    try{ player.getStoreddata().put(LOCALE_PREF_KEY, locale || "") }catch(err){}
  }

  function addLocaleCandidate(list, value){
    var locale = normalizeLocaleCandidate(value)
    if(locale) list.push(locale)
  }

  function readJavaNoArgString(obj, names){
    var value = readJavaNoArgValue(obj, names)
    if(value == null) return ""
    return String(value || "")
  }

  function readJavaNoArgValue(obj, names){
    var i, value, methods, empty, j, m
    if(!obj) return null
    for(i = 0; i < names.length; i++){
      try{
        if(typeof obj[names[i]] === "function"){
          value = obj[names[i]]()
          if(value != null) return value
        }
      }catch(err0){}
    }
    try{
      methods = obj.getClass().getMethods()
      empty = Java.to([], "java.lang.Object[]")
      for(i = 0; i < names.length; i++){
        for(j = 0; j < methods.length; j++){
          m = methods[j]
          try{
            if(String(m.getName()) === names[i] && m.getParameterCount() === 0){
              try{ m.setAccessible(true) }catch(err1){}
              value = m.invoke(obj, empty)
              if(value != null) return value
            }
          }catch(err2){}
        }
      }
    }catch(err3){}
    return null
  }

  function readJavaFieldString(obj, names){
    var cls = null
    var i, field, value
    if(!obj) return ""
    try{ cls = obj.getClass() }catch(err0){ return "" }
    while(cls){
      for(i = 0; i < names.length; i++){
        try{
          field = cls.getDeclaredField(names[i])
          field.setAccessible(true)
          value = field.get(obj)
          if(value != null && String(value) !== "") return String(value)
        }catch(err1){}
      }
      try{ cls = cls.getSuperclass() }catch(err2){ cls = null }
    }
    return ""
  }

  function pickBestLocaleCandidate(list){
    var i, first = ""
    for(i = 0; i < list.length; i++){
      if(!first) first = list[i]
      if(list[i] && list[i] !== "en_us") return list[i]
    }
    return first || ""
  }

  function getPlayerLocale(player){
    var pref = getStoredLocalePreference(player)
    var candidates = []
    var mc = null
    var opts = null
    if(pref) return pref
    addLocaleCandidate(candidates, readJavaNoArgString(player, ["getLanguage"]))
    try{ if(player && typeof player.getMCEntity === "function") mc = player.getMCEntity() }catch(err1){}
    addLocaleCandidate(candidates, readJavaNoArgString(mc, ["getLanguage"]))
    addLocaleCandidate(candidates, readJavaFieldString(mc, ["field_46156", "language", "locale", "clientLanguage", "selectedLanguage"]))
    opts = readJavaNoArgValue(mc, ["method_53823", "clientInformation", "getClientInformation", "getClientOptions"])
    if(opts) addLocaleCandidate(candidates, readJavaNoArgString(opts, ["comp_1951", "language", "getLanguage", "getLocale", "locale"]))
    if(opts) addLocaleCandidate(candidates, readJavaFieldString(opts, ["comp_1951", "language", "locale"]))
    return pickBestLocaleCandidate(candidates) || "en_us"
  }

  function langRoot(){
    return resolveTargetFile(LANG_DIR)
  }

  function langRoots(){
    var out = []
    var seen = {}
    var i, file, key
    for(i = 0; i < LANG_DIRS.length; i++){
      file = resolveTargetFile(LANG_DIRS[i])
      key = String(file.getPath())
      if(seen[key]) continue
      seen[key] = true
      out.push(file)
    }
    return out
  }

  function getLocaleDisplayName(locale){
    locale = normalizeLocale(locale)
    if(locale === "en_us") return "English"
    if(locale === "ko_kr") return "Korea"
    if(locale === "ja_jp") return "Japan"
    if(locale === "zh_cn") return "China"
    if(locale === "ru_ru") return "Russia"
    return locale
  }

  function addLocaleOption(out, seen, locale){
    locale = normalizeLocaleCandidate(locale)
    if(!locale || seen[locale]) return
    seen[locale] = true
    out.push({ locale: locale, label: getLocaleDisplayName(locale) })
  }

  function listScriptLibraryLocales(){
    var roots = langRoots()
    var seen = {}
    var out = []
    var files, i, j, dir, name, locale
    addLocaleOption(out, seen, "en_us")
    for(i = 0; i < roots.length; i++){
      dir = roots[i]
      if(!dir.exists() || !dir.isDirectory()) continue
      files = dir.listFiles()
      if(files){
        for(j = 0; j < files.length; j++){
          if(!files[j].isFile()) continue
          name = String(files[j].getName())
          if(name.slice(-5) !== ".json") continue
          locale = normalizeLocaleCandidate(name.substring(0, name.length - 5))
          if(locale) addLocaleOption(out, seen, locale)
        }
      }
    }
    out.sort(function(a, b){
      if(a.locale === "en_us") return -1
      if(b.locale === "en_us") return 1
      return String(a.label).localeCompare(String(b.label))
    })
    return out
  }

  function loadScriptLibraryI18n(locale){
    var requested = normalizeLocale(locale)
    var queue = [requested]
    var roots = langRoots()
    var i, j, file, raw, messages
    if(queue[0] !== "en_us") queue.push("en_us")
    for(i = 0; i < queue.length; i++){
      for(j = 0; j < roots.length; j++){
        file = new File(roots[j], queue[i] + ".json")
        if(!file.exists() || !file.isFile()) continue
        try{
          raw = readLocalText(file)
          messages = JSON.parse(raw)
          return { locale: queue[i], requested: requested, messages: messages, error: "" }
        }catch(err){
          return { locale: queue[i], requested: requested, messages: {}, error: String(err) }
        }
      }
    }
    return { locale: requested, requested: requested, messages: {}, error: "Missing customnpcs/" + LANG_DIR + "/" + requested + ".json" }
  }

  function fetchText(repoPath){
    var path = normalizeRepoPath(repoPath)
    var url = "https://raw.githubusercontent.com/" + REPO_OWNER + "/" + REPO_NAME + "/" + REPO_BRANCH + "/" + path
    var conn = new URL(url).openConnection()
    var br = null
    var line
    var out = []
    conn.setConnectTimeout(10000)
    conn.setReadTimeout(20000)
    conn.setRequestProperty("User-Agent", USER_AGENT)
    try{
      if(typeof conn.getResponseCode === "function" && conn.getResponseCode() >= 400){
        throw new Error("HTTP " + conn.getResponseCode() + " for " + path)
      }
    }catch(codeErr){
      if(String(codeErr).indexOf("HTTP ") === 0) throw codeErr
    }
    try{
      br = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))
      while((line = br.readLine()) !== null) out.push(String(line))
    }finally{
      if(br) br.close()
    }
    return out.join("\n")
  }

  function fetchJson(repoPath){
    return JSON.parse(fetchText(repoPath))
  }

  function normalizeDependency(dep){
    dep = dep || {}
    return {
      type: lower(dep.type || "file"),
      path: trim(dep.path || ""),
      id: trim(dep.id || ""),
      required: dep.required !== false,
      note: trim(dep.note || "")
    }
  }

  function normalizeFileSpec(file){
    file = file || {}
    var deps = []
    var sourceDeps = file.dependencies instanceof Array ? file.dependencies : []
    var i
    for(i = 0; i < sourceDeps.length; i++) deps.push(normalizeDependency(sourceDeps[i]))
    return {
      source: trim(file.source || file.path || ""),
      installAs: trim(file.install_as || file.installAs || file.source || file.path || ""),
      type: lower(file.type || ""),
      dependencies: deps
    }
  }

  function normalizePlayerScripts(value){
    var arr = value instanceof Array ? value : []
    var out = []
    var i, item, line, path
    for(i = 0; i < arr.length; i++){
      item = arr[i] || {}
      line = trim(item.line || "")
      path = trim(item.path || "")
      if(line || path) out.push({ line: line, path: path })
    }
    return out
  }

  function normalizeManifest(data, manifestPath, rootPkg){
    var files = []
    var rawFiles = data && data.files instanceof Array ? data.files : []
    var i
    rootPkg = rootPkg || {}
    for(i = 0; i < rawFiles.length; i++) files.push(normalizeFileSpec(rawFiles[i]))
    return {
      key: [trim(data.package || rootPkg.pkgName || ""), trim(data.editor || rootPkg.editor || ""), trim(data.mc_version || rootPkg.mcVersion || "")].join("|").toLowerCase(),
      pkgName: trim(data.package || rootPkg.pkgName || ""),
      version: trim(data.version || rootPkg.latest || ""),
      editor: trim(data.editor || rootPkg.editor || ""),
      mcVersion: trim(data.mc_version || rootPkg.mcVersion || ""),
      description: trim(data.description || ""),
      entry: trim(data.entry || ""),
      installDir: trim(data.install_dir || ""),
      subPath: trim(data.sub_path || rootPkg.subPath || ""),
      manifestPath: manifestPath,
      files: files,
      playerScripts: normalizePlayerScripts(data.player_scripts)
    }
  }

  function rootPackages(root){
    var arr = root && root.packages instanceof Array ? root.packages : []
    var out = []
    var i, item
    for(i = 0; i < arr.length; i++){
      item = arr[i] || {}
      out.push({
        pkgName: trim(item.package || ""),
        editor: trim(item.editor || ""),
        mcVersion: trim(item.mc_version || ""),
        subPath: trim(item.sub_path || ""),
        latest: trim(item.latest || ""),
        versions: item.versions instanceof Array ? item.versions : []
      })
    }
    return out
  }

  function sharedBasePath(){
    return cache && cache.basePath ? cache.basePath : DEFAULT_BASE_PATH
  }

  function fileInstallType(file){
    var t = lower(file && file.type)
    var installAs = lower(file && file.installAs)
    var source = lower(file && file.source)
    if(t === "html" || t === "htm") return "html"
    if(t === "json" || t === "json_dir") return t
    if(t === "data") return "data"
    if(installAs.indexOf(".html") >= 0 || source.indexOf(".html") >= 0) return "html"
    return "script"
  }

  function isAddonEntry(entry){
    var pkg = lower(entry && entry.package)
    var editor = lower(entry && entry.editor)
    return startsWith(pkg, "addon_") || editor.indexOf("addon") >= 0
  }

  function resolveManifestTarget(path, type){
    var p = stripRootPrefix(path)
    var t = lower(type)
    if(t === "html"){
      if(startsWith(p, "scripts/ecmascript/")) return normalizeTargetRel(p)
      if(startsWith(p, "html/")) return normalizeTargetRel("scripts/ecmascript/" + p)
      return normalizeTargetRel("scripts/ecmascript/html/" + p)
    }
    if(t === "script" || t === "js"){
      if(startsWith(p, "scripts/ecmascript/")) return normalizeTargetRel(p)
      return normalizeTargetRel("scripts/ecmascript/" + p)
    }
    if(t === "data") return normalizeTargetRel(p)
    return normalizeTargetRel(p)
  }

  function installBase(entry){
    var base = entry.installDir || sharedBasePath()
    if(!entry.installDir && entry.subPath && !isAddonEntry(entry)) base = joinRel(base, entry.subPath)
    return base || DEFAULT_BASE_PATH
  }

  function installedRelPath(entry, file){
    var installAs = normalizeTargetRel(file.installAs || file.source || "")
    var type = fileInstallType(file)
    if(looksLikeTargetPath(installAs, type)) return resolveManifestTarget(installAs, type)
    if(type === "html") return resolveManifestTarget(installAs, "html")
    return resolveManifestTarget(joinRel(installBase(entry), installAs), type)
  }

  function dependencyKey(path){
    var p = stripRootPrefix(path)
    if(startsWith(p, "scripts/ecmascript/")) p = p.substring("scripts/ecmascript/".length)
    return normalizeTargetRel(p).toLowerCase()
  }

  function canonicalTargetKey(path){
    return normalizeTargetRel(path).toLowerCase()
  }

  function addProvider(index, keyValue, record){
    var key = dependencyKey(keyValue)
    if(key && !index[key]) index[key] = record
  }

  function buildProviderIndex(entries){
    var index = {}
    var i, j, entry, file, rel, record
    for(i = 0; i < entries.length; i++){
      entry = entries[i]
      for(j = 0; j < entry.files.length; j++){
        file = entry.files[j]
        rel = installedRelPath(entry, file)
        record = { entry: entry, file: file }
        addProvider(index, rel, record)
        if(startsWith(rel, "scripts/ecmascript/")) addProvider(index, rel.substring("scripts/ecmascript/".length), record)
      }
    }
    return index
  }

  function entrySummary(entry){
    var deps = []
    var seen = {}
    var i, j, file, dep, key
    for(i = 0; i < entry.files.length; i++){
      file = entry.files[i]
      for(j = 0; j < file.dependencies.length; j++){
        dep = file.dependencies[j]
        key = dep.type + ":" + (dep.path || dep.id)
        if(seen[key]) continue
        seen[key] = true
        deps.push({ type: dep.type, path: dep.path, id: dep.id, required: dep.required, note: dep.note })
      }
    }
    return {
      version: entry.version,
      description: entry.description,
      manifestPath: entry.manifestPath,
      fileCount: entry.files.length,
      playerScriptCount: entry.playerScripts.length,
      dependencies: deps
    }
  }

  function buildGroups(entries){
    var map = {}
    var groups = []
    var i, entry, group
    for(i = 0; i < entries.length; i++){
      entry = entries[i]
      if(!entry.key) continue
      group = map[entry.key]
      if(!group){
        group = {
          key: entry.key,
          packageName: entry.pkgName,
          editor: entry.editor,
          mcVersion: entry.mcVersion,
          description: entry.description,
          latest: entry.version,
          installedVersion: "",
          versions: []
        }
        map[entry.key] = group
        groups.push(group)
      }
      group.versions.push(entrySummary(entry))
      if(String(entry.version) > String(group.latest)) group.latest = entry.version
    }
    groups.sort(function(a, b){ return String(a.packageName).localeCompare(String(b.packageName)) })
    for(i = 0; i < groups.length; i++){
      groups[i].versions.sort(function(a, b){ return String(b.version).localeCompare(String(a.version)) })
      if(groups[i].versions.length) groups[i].latest = groups[i].versions[0].version
    }
    return groups
  }

  function loadLibrary(force){
    if(cache && !force) return cache
    var root = fetchJson(ROOT_MANIFEST)
    var pkgs = rootPackages(root)
    var entries = []
    var errors = []
    var i, j, rootPkg, manifestPath, manifest
    for(i = 0; i < pkgs.length; i++){
      rootPkg = pkgs[i]
      for(j = 0; j < rootPkg.versions.length; j++){
        manifestPath = normalizeRepoPath(String(rootPkg.versions[j] || ""))
        if(!manifestPath) continue
        try{
          manifest = fetchJson(manifestPath)
          entries.push(normalizeManifest(manifest, manifestPath, rootPkg))
        }catch(err){
          errors.push(manifestPath + ": " + String(err))
        }
      }
    }
    if(!entries.length) throw new Error(errors.length ? errors.join(" / ") : "No package manifests found.")
    cache = {
      loadedAt: String(new Date().toISOString()),
      basePath: trim(root.base_path || DEFAULT_BASE_PATH),
      entries: entries,
      groups: buildGroups(entries),
      providers: buildProviderIndex(entries),
      errors: errors
    }
    return cache
  }

  function registryFile(){
    return resolveTargetFile("dc_data/dc_script_library_ingame_manager_installs.json")
  }

  function loadRegistry(){
    var file = registryFile()
    if(!file.exists()) return {}
    try{ return JSON.parse(readLocalText(file)) }catch(err){}
    return {}
  }

  function saveRegistry(registry){
    writeLocalText(registryFile(), JSON.stringify(registry || {}, null, 2))
  }

  function registryKey(entry){
    return [entry.pkgName, entry.editor, entry.mcVersion].join("|").toLowerCase()
  }

  function applyInstalledVersions(groups){
    var registry = loadRegistry()
    var i, group, rec
    for(i = 0; i < groups.length; i++){
      group = groups[i]
      rec = registry[group.key]
      group.installedVersion = rec && rec.version ? String(rec.version) : ""
    }
  }

  function statePayload(){
    var lib = loadLibrary(false)
    var groups = JSON.parse(JSON.stringify(lib.groups))
    applyInstalledVersions(groups)
    return {
      ok: true,
      repo: REPO_OWNER + "/" + REPO_NAME,
      branch: REPO_BRANCH,
      loadedAt: lib.loadedAt,
      basePath: lib.basePath,
      customNpcsRoot: String(customNpcsRoot().getPath()),
      packages: groups,
      errors: lib.errors || []
    }
  }

  function findEntry(groupKey, version){
    var lib = loadLibrary(false)
    var i, entry
    for(i = 0; i < lib.entries.length; i++){
      entry = lib.entries[i]
      if(entry.key === groupKey && entry.version === version) return entry
    }
    return null
  }

  function push(player, name, payload){
    var bridge
    try{
      if(typeof cnpcext === "undefined" || !cnpcext || typeof cnpcext.getClientBridge !== "function") return
      bridge = cnpcext.getClientBridge(player.getMCEntity())
      bridge.sendToBrowser(String(name), JSON.stringify(payload || {}))
    }catch(err){}
  }

  function pushState(player){
    push(player, "scriptLibraryState", statePayload())
  }

  function open(ctx, player){
    var locale, i18n
    if(!player) return false
    if(typeof cnpcext === "undefined" || !cnpcext || typeof cnpcext.openHtmlGui !== "function"){
      player.message("CNPCExtended is required for Script Library.")
      return false
    }
    locale = getPlayerLocale(player)
    i18n = loadScriptLibraryI18n(locale)
    sessions[playerKey(player)] = { pending: null, busy: false }
    cnpcext.openHtmlGui(ctx, HTML_PATH, 0, 0, JSON.stringify({
      title: "Script Library",
      repo: REPO_OWNER + "/" + REPO_NAME,
      branch: REPO_BRANCH,
      locale: i18n.locale,
      localePreference: getStoredLocalePreference(player),
      localeOptions: listScriptLibraryLocales(),
      i18n: i18n
    }))
    runAsync(function(){
      try{
        push(player, "scriptLibraryProgress", { status: "loading", message: "Loading package manifests..." })
        loadLibrary(false)
        pushState(player)
        push(player, "scriptLibraryProgress", { status: "ready", message: "Ready" })
      }catch(err){
        push(player, "scriptLibraryState", { ok: false, error: String(err) })
      }
    })
    return true
  }

  function createRecord(entry, file, kind){
    var rel = installedRelPath(entry, file)
    return {
      entry: entry,
      file: file,
      kind: kind,
      targetRel: rel,
      targetFile: resolveTargetFile(rel),
      repoPath: normalizeRepoPath(joinRel(dirname(entry.manifestPath), file.source))
    }
  }

  function collectDependencies(entry){
    var out = []
    var i, j, file
    for(i = 0; i < entry.files.length; i++){
      file = entry.files[i]
      for(j = 0; j < file.dependencies.length; j++) out.push(file.dependencies[j])
    }
    return out
  }

  function buildPlan(entry){
    var lib = loadLibrary(false)
    var deps = collectDependencies(entry)
    var records = []
    var seen = {}
    var i, dep, provider, record, file, key
    for(i = 0; i < deps.length; i++){
      dep = deps[i]
      if(dep.type === "script" || dep.type === "html"){
        provider = lib.providers[dependencyKey(dep.path)]
        if(!provider && dep.required) throw new Error("Dependency source not found: " + dep.type + " " + dep.path)
        if(provider){
          record = createRecord(provider.entry, provider.file, "dependency")
          key = canonicalTargetKey(record.targetRel)
          if(!seen[key]){
            seen[key] = true
            records.push(record)
          }
        }
      }
    }
    for(i = 0; i < entry.files.length; i++){
      file = entry.files[i]
      record = createRecord(entry, file, "selected")
      key = canonicalTargetKey(record.targetRel)
      if(!seen[key]){
        seen[key] = true
        records.push(record)
      }
    }
    return { entry: entry, records: records, dependencies: deps }
  }

  function comparePlan(plan, player){
    var states = []
    var i, record, remoteText, localText, state
    for(i = 0; i < plan.records.length; i++){
      record = plan.records[i]
      push(player, "scriptLibraryProgress", { status: "checking", message: lastSegment(record.targetRel), current: i + 1, total: plan.records.length })
      remoteText = fetchText(record.repoPath)
      record.remoteText = remoteText
      state = "new"
      if(record.targetFile.exists()){
        localText = readLocalText(record.targetFile)
        state = localText === remoteText ? "same" : "changed"
      }
      states.push({
        key: canonicalTargetKey(record.targetRel),
        name: lastSegment(record.targetRel),
        path: record.targetRel,
        state: state,
        kind: record.kind
      })
    }
    return states
  }

  function ensureDependencyDirectories(deps){
    var i, dep, rel, file
    for(i = 0; i < deps.length; i++){
      dep = deps[i]
      if(dep.type !== "json_dir") continue
      rel = resolveManifestTarget(dep.path, "json_dir")
      file = resolveTargetFile(rel)
      if(!file.exists()) file.mkdirs()
    }
  }

  function playerScriptsFile(){
    return resolveTargetFile("scripts/player_scripts.json")
  }

  function defaultPlayerScriptsText(line){
    var first = line ? "\n                {\n                    \"Line\": \"" + line + "\"\n                }\n" : "\n"
    return "{\n    \"Scripts\": [\n        {\n            \"Script\": \"\",\n            \"Console\": [\n            ],\n            \"ScriptList\": [" + first + "            ]\n        },\n        {\n            \"Script\": \"\",\n            \"Console\": [\n            ],\n            \"ScriptList\": [\n            ]\n        }\n    ],\n    \"ScriptLanguage\": \"ECMAScript\",\n    \"ScriptConsole\": [\n    ],\n    \"ScriptEnabled\": 1b\n}\n"
  }

  function injectPlayerScriptLine(text, line){
    var target = trim(line)
    var pattern = /("ScriptList"\s*:\s*\[)([\s\S]*?)(\s*\])/
    var replaced = false
    if(!target) return { text: text, changed: false }
    if(String(text || "").indexOf("\"Line\": \"" + target + "\"") >= 0) return { text: text, changed: false }
    if(!pattern.test(String(text || ""))) return { text: defaultPlayerScriptsText(target), changed: true }
    text = String(text || "").replace(pattern, function(full, start, inner, close){
      var inserted
      if(replaced) return full
      replaced = true
      inserted = "\n                {\n                    \"Line\": \"" + target + "\"\n                }"
      if(!trim(inner)) return start + inserted + "\n            " + close
      return start + String(inner || "").replace(/\s*$/g, "") + "," + inserted + "\n            " + close
    })
    return { text: text, changed: replaced }
  }

  function playerScriptBase(entry){
    var base = installBase(entry)
    base = stripRootPrefix(base)
    if(startsWith(base, "scripts/ecmascript/")) base = base.substring("scripts/ecmascript/".length)
    return normalizeTargetRel(base || "dc_lib")
  }

  function playerScriptLine(spec, entry){
    var raw = trim((spec && (spec.line || spec.path)) || "")
    var rel
    if(!raw) return ""
    rel = stripRootPrefix(raw)
    if(startsWith(rel, "scripts/ecmascript/")) rel = rel.substring("scripts/ecmascript/".length)
    if(startsWith(rel, "dc_lib/")) return normalizeTargetRel(rel)
    return normalizeTargetRel(joinRel(playerScriptBase(entry), rel))
  }

  function ensurePlayerScriptEntries(entry){
    var specs = entry.playerScripts || []
    var file = playerScriptsFile()
    var text = ""
    var next, i, line, patched
    var changed = 0
    if(!specs.length) return 0
    try{
      text = file.exists() ? readLocalText(file) : defaultPlayerScriptsText("")
    }catch(err){
      text = defaultPlayerScriptsText("")
    }
    next = text
    for(i = 0; i < specs.length; i++){
      line = playerScriptLine(specs[i], entry)
      patched = injectPlayerScriptLine(next, line)
      next = patched.text
      if(patched.changed) changed++
    }
    if(changed) writeLocalText(file, next)
    return changed
  }

  function writePlan(player, pending, selectedKeys){
    var plan = pending.plan
    var states = pending.states
    var selected = selectedKeys || {}
    var written = 0
    var skipped = 0
    var i, record, state, key, existsAlready, parent
    var registry, regKey
    ensureDependencyDirectories(plan.dependencies)
    for(i = 0; i < plan.records.length; i++){
      record = plan.records[i]
      state = states[i]
      key = canonicalTargetKey(record.targetRel)
      existsAlready = state && state.state !== "new"
      if(existsAlready && selected[key] !== true){
        skipped++
        push(player, "scriptLibraryProgress", { status: "skipping", message: lastSegment(record.targetRel), current: i + 1, total: plan.records.length })
        continue
      }
      push(player, "scriptLibraryProgress", { status: "writing", message: lastSegment(record.targetRel), current: i + 1, total: plan.records.length })
      parent = record.targetFile.getParentFile()
      if(parent && !parent.exists()) parent.mkdirs()
      writeLocalText(record.targetFile, record.remoteText)
      written++
    }
    ensurePlayerScriptEntries(plan.entry)
    registry = loadRegistry()
    regKey = registryKey(plan.entry)
    registry[regKey] = {
      package: plan.entry.pkgName,
      editor: plan.entry.editor,
      mc_version: plan.entry.mcVersion,
      version: plan.entry.version,
      installed_at: String(new Date().toISOString()),
      files: states
    }
    saveRegistry(registry)
    push(player, "scriptLibraryInstallResult", { ok: true, packageName: plan.entry.pkgName, version: plan.entry.version, written: written, skipped: skipped })
    pushState(player)
  }

  function onRefresh(player){
    runAsync(function(){
      try{
        push(player, "scriptLibraryProgress", { status: "loading", message: "Refreshing package manifests..." })
        loadLibrary(true)
        pushState(player)
        push(player, "scriptLibraryProgress", { status: "ready", message: "Refreshed" })
      }catch(err){
        push(player, "scriptLibraryState", { ok: false, error: String(err) })
      }
    })
  }

  function onInstall(player, data){
    runAsync(function(){
      var session = sessions[playerKey(player)] || { pending: null, busy: false }
      var entry, plan, states, existing, requestId
      var i
      try{
        if(session.busy) return
        session.busy = true
        sessions[playerKey(player)] = session
        entry = findEntry(String(data.key || ""), String(data.version || ""))
        if(!entry) throw new Error("Package version not found.")
        plan = buildPlan(entry)
        states = comparePlan(plan, player)
        existing = []
        for(i = 0; i < states.length; i++){
          if(states[i].state !== "new") existing.push(states[i])
        }
        requestId = String(new Date().getTime()) + "_" + Math.floor(Math.random() * 100000)
        session.pending = { id: requestId, plan: plan, states: states }
        if(existing.length){
          push(player, "scriptLibraryOverwrite", { requestId: requestId, files: existing })
        }else{
          writePlan(player, session.pending, {})
          session.pending = null
        }
      }catch(err){
        push(player, "scriptLibraryInstallResult", { ok: false, error: String(err) })
      }finally{
        session.busy = false
      }
    })
  }

  function onConfirm(player, data){
    runAsync(function(){
      var session = sessions[playerKey(player)] || {}
      var pending = session.pending
      var arr = data && data.selectedKeys instanceof Array ? data.selectedKeys : []
      var selected = {}
      var i
      try{
        if(!pending || pending.id !== String(data.requestId || "")) throw new Error("Install confirmation expired.")
        for(i = 0; i < arr.length; i++) selected[canonicalTargetKey(arr[i])] = true
        session.pending = null
        writePlan(player, pending, selected)
      }catch(err){
        push(player, "scriptLibraryInstallResult", { ok: false, error: String(err) })
      }
    })
  }

  function onCancel(player, data){
    var session = sessions[playerKey(player)] || {}
    if(session.pending && session.pending.id === String(data.requestId || "")) session.pending = null
    push(player, "scriptLibraryInstallResult", { ok: false, cancelled: true, error: "Install cancelled." })
  }

  function onI18nRequest(player, data){
    var locale = data && data.locale ? String(data.locale) : getPlayerLocale(player)
    var i18n
    locale = normalizeLocaleCandidate(locale) || "en_us"
    if(data && data.persist === true) setStoredLocalePreference(player, locale)
    i18n = loadScriptLibraryI18n(locale)
    push(player, "scriptLibraryI18nPack", {
      locale: i18n.locale,
      requested: i18n.requested,
      messages: i18n.messages,
      error: i18n.error || "",
      localeOptions: listScriptLibraryLocales()
    })
  }

  function handleHtmlEvent(e){
    var player = e.player
    var data = {}
    if(!player) return false
    if(e.data && String(e.data) !== "") data = JSON.parse(String(e.data))
    if(e.eventName === "__guiClosed"){
      delete sessions[playerKey(player)]
      return true
    }
    if(e.eventName === "script_library_ready"){
      if(cache) pushState(player)
      else push(player, "scriptLibraryProgress", { status: "loading", message: "Loading package manifests..." })
      return true
    }
    if(e.eventName === "script_library_refresh"){
      onRefresh(player)
      return true
    }
    if(e.eventName === "script_library_install"){
      onInstall(player, data)
      return true
    }
    if(e.eventName === "script_library_install_confirm"){
      onConfirm(player, data)
      return true
    }
    if(e.eventName === "script_library_install_cancel"){
      onCancel(player, data)
      return true
    }
    if(e.eventName === "script_library_i18n_request"){
      onI18nRequest(player, data)
      return true
    }
    return false
  }

  return {
    open: open,
    htmlGuiEvent: handleHtmlEvent
  }
})()

/**
 * @param {PlayerEvent.ChatEvent} e
 */
function chat(e){
  var msg = String(e.message || "")
  if(msg !== "dce") return
  DochiScriptLibraryIngameManager.open(e, e.player)
  try{ e.setCanceled(true) }catch(err){}
}

/**
 * @param {NpcEvent.InteractEvent} e
 */
function interact(e){
  if(!e || !e.player || !e.npc) return
  DochiScriptLibraryIngameManager.open(e, e.player)
}

/**
 * @param {Object} e
 */
function htmlGuiEvent(e){
  try{
    DochiScriptLibraryIngameManager.htmlGuiEvent(e)
  }catch(err){
    try{ if(e && e.player) e.player.message("Script Library error: " + String(err)) }catch(ignore){}
  }
}
