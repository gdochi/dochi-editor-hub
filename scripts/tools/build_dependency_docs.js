const fs = require("fs")
const path = require("path")

const rootDir = path.resolve(__dirname, "..")
const utilityRootRel = "npc_util/common/1.0.0"
const utilityRoot = path.join(rootDir, utilityRootRel)
const jsonPath = path.join(rootDir, "dc_main_scripts.json")
const mdPath = path.join(rootDir, "DEPENDENCIES.md")
const htmlPath = path.join(rootDir, "docs", "dependencies.html")
const htmlIndexPath = path.join(rootDir, "docs", "index.html")

const utilityNamePattern = /^(cfg_chk_|cond_|cond_chk_|rew_chk_|seq_core_|util_|dc_gecko_|dc_dialogue_|dc_dialogue_trigger_|dc_shop_|openDcGuiRuntime$|NpcEventModule$|DcGuiRuntimeModule$)/
const ignoredMainPackages = { npc_util: true }

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8")
}

function readJson(filePath) {
  return JSON.parse(readText(filePath))
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8")
}

function rel(filePath) {
  return path.relative(rootDir, filePath).replace(/\\/g, "/")
}

function normalizePath(value) {
  return String(value == null ? "" : value).replace(/\\/g, "/")
}

function baseName(value) {
  const parts = normalizePath(value).split("/")
  return parts[parts.length - 1] || ""
}

function escapeMd(value) {
  return String(value == null ? "" : value).replace(/\|/g, "\\|").replace(/\n/g, " ")
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function walk(dir, out, fileName) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  entries.forEach((entry) => {
    if (entry.name === ".git" || entry.name === "node_modules") return
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(fullPath, out, fileName)
      return
    }
    if (entry.isFile() && (!fileName || entry.name === fileName)) out.push(fullPath)
  })
}

function stripCommentsAndStrings(text) {
  const out = text.split("")
  let i = 0
  let mode = "code"
  let quote = ""

  while (i < text.length) {
    const ch = text[i]
    const next = text[i + 1]

    if (mode === "code") {
      if (ch === "/" && next === "/") {
        out[i] = " "
        out[i + 1] = " "
        i += 2
        mode = "lineComment"
        continue
      }
      if (ch === "/" && next === "*") {
        out[i] = " "
        out[i + 1] = " "
        i += 2
        mode = "blockComment"
        continue
      }
      if (ch === "\"" || ch === "'") {
        quote = ch
        i++
        mode = "string"
        continue
      }
      i++
      continue
    }

    if (mode === "lineComment") {
      if (ch === "\r" || ch === "\n") {
        mode = "code"
        i++
        continue
      }
      out[i] = " "
      i++
      continue
    }

    if (mode === "blockComment") {
      if (ch === "*" && next === "/") {
        out[i] = " "
        out[i + 1] = " "
        i += 2
        mode = "code"
        continue
      }
      if (ch !== "\r" && ch !== "\n") out[i] = " "
      i++
      continue
    }

    if (mode === "string") {
      if (ch === "\\") {
        i += 2
        continue
      }
      if (ch === quote) {
        i++
        mode = "code"
        continue
      }
      i++
    }
  }

  return out.join("")
}

function getLineNumber(text, index) {
  return text.slice(0, index).split(/\r\n|\r|\n/).length
}

function uniqueSorted(list) {
  return Array.from(new Set(list.filter(Boolean))).sort()
}

function extractOwnDeclarations(text) {
  const clean = stripCommentsAndStrings(text)
  const names = []
  let match
  const fnRe = /\bfunction\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g
  while ((match = fnRe.exec(clean))) names.push(match[1])
  const assignedFnRe = /\b(?:var\s+)?([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*function\s*\(/g
  while ((match = assignedFnRe.exec(clean))) names.push(match[1])
  return new Set(names)
}

function extractUtilitySymbols(filePath) {
  const text = readText(filePath)
  const clean = stripCommentsAndStrings(text)
  const symbols = []
  const seen = {}

  function add(name, kind) {
    if (!utilityNamePattern.test(name)) return
    if (seen[name]) return
    seen[name] = true
    symbols.push({ name, kind })
  }

  let match
  const fnRe = /\bfunction\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g
  while ((match = fnRe.exec(clean))) add(match[1], "function")

  const assignedFnRe = /\b(?:var\s+)?([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*function\s*\(/g
  while ((match = assignedFnRe.exec(clean))) add(match[1], "function")

  const varRe = /\bvar\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=/g
  while ((match = varRe.exec(clean))) add(match[1], "global")

  return {
    script: path.basename(filePath),
    path: rel(filePath),
    symbols
  }
}

function buildUtilityIndex() {
  const order = {}
  const manifestPath = path.join(utilityRoot, "manifest.json")
  if (fs.existsSync(manifestPath)) {
    const manifest = readJson(manifestPath)
    ;(manifest.files || []).forEach((file, index) => {
      if (fileType(file) !== "script") return
      order[file.install_as || file.source] = index + 1
    })
  }

  const files = fs.readdirSync(utilityRoot)
    .filter((name) => name.endsWith(".js"))
    .sort()
    .map((name) => path.join(utilityRoot, name))

  return files.map((filePath) => {
    const item = extractUtilitySymbols(filePath)
    item.default_order = order[item.script] || null
    return item
  })
}

function findSymbolMatches(text, ownDeclarations, symbol) {
  if (ownDeclarations.has(symbol.name)) return []
  const clean = stripCommentsAndStrings(text)
  const escaped = symbol.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const pattern = symbol.kind === "function"
    ? new RegExp("\\b" + escaped + "\\s*\\(", "g")
    : new RegExp("\\b" + escaped + "\\b", "g")
  const matches = []
  let match
  while ((match = pattern.exec(clean))) {
    matches.push({
      symbol: symbol.name,
      kind: symbol.kind,
      line: getLineNumber(text, match.index)
    })
  }
  return matches
}

function collectManifests() {
  const manifestPaths = []
  walk(rootDir, manifestPaths, "manifest.json")
  return manifestPaths.sort().map((filePath) => ({
    path: rel(filePath),
    dir: path.dirname(filePath),
    manifest: readJson(filePath)
  }))
}

function fileType(file) {
  if (file.type) return file.type
  if (/\.js$/i.test(file.source || "")) return "script"
  if (/\.html$/i.test(file.source || "")) return "html"
  return "file"
}

function attachmentTarget(dep) {
  return dep.path || dep.id || dep.type || ""
}

function findManifestUtilityDep(main, utilScript) {
  const targets = []
  ;(main.versions || []).forEach((version) => {
    ;(version.dependencies || []).forEach((dep) => {
      if (dep.type !== "script") return
      if (baseName(dep.path) !== utilScript) return
      targets.push(dep)
    })
  })
  if (!targets.length) return null
  targets.sort((a, b) => {
    const ao = a.load_order == null ? 9999 : Number(a.load_order)
    const bo = b.load_order == null ? 9999 : Number(b.load_order)
    return ao - bo
  })
  return targets[0]
}

function collectMainScripts(manifests) {
  const map = {}

  manifests.forEach((item) => {
    const manifest = item.manifest
    if (ignoredMainPackages[manifest.package]) return
    ;(manifest.files || []).forEach((file) => {
      if (fileType(file) !== "script") return
      const installAs = file.install_as || file.source
      const key = manifest.package + ":" + installAs
      const sourcePath = path.join(item.dir, file.source)
      if (!map[key]) {
        map[key] = {
          id: manifest.package,
          title: manifest.editor || manifest.package || installAs,
          package: manifest.package || "",
          script: installAs,
          description: manifest.description || "",
          versions: [],
          utilities: [],
          attachments: []
        }
      }
      map[key].versions.push({
        mc_version: manifest.mc_version || "",
        version: manifest.version || "",
        manifest: item.path,
        source: file.source || "",
        source_path: rel(sourcePath),
        dependencies: file.dependencies || []
      })
    })
  })

  return Object.keys(map).sort().map((key) => map[key])
}

function detectUtilityDependencies(mainScripts, utilityIndex) {
  const utilityByScript = {}
  utilityIndex.forEach((util) => {
    utilityByScript[util.script] = util
  })

  mainScripts.forEach((main) => {
    const utilityMap = {}
    const htmlMap = {}

    function addUtility(util, dep) {
      if (!util || utilityMap[util.script]) return
      utilityMap[util.script] = {
        script: util.script,
        path: util.path,
        required: dep ? dep.required !== false : true,
        load_order: dep && dep.load_order != null ? dep.load_order : util.default_order
      }
    }

    main.versions.forEach((version) => {
      ;(version.dependencies || []).forEach((dep) => {
        if (dep.type !== "html") return
        const target = attachmentTarget(dep)
        if (!target) return
        if (!htmlMap[target]) {
          htmlMap[target] = {
            path: target,
            required: dep.required !== false
          }
        }
      })

      ;(version.dependencies || []).forEach((dep) => {
        if (dep.type !== "script") return
        addUtility(utilityByScript[baseName(dep.path)], dep)
      })

      const filePath = path.join(rootDir, version.source_path)
      if (!fs.existsSync(filePath)) return
      const text = readText(filePath)
      const ownDeclarations = extractOwnDeclarations(text)

      utilityIndex.forEach((util) => {
        const matched = []
        util.symbols.forEach((symbol) => {
          findSymbolMatches(text, ownDeclarations, symbol).forEach((item) => matched.push(item))
        })
        if (!matched.length) return

        addUtility(util, findManifestUtilityDep(main, util.script))
      })
    })

    main.script_dependencies = Object.keys(utilityMap).sort((a, b) => {
      const ao = utilityMap[a].load_order == null ? 9999 : Number(utilityMap[a].load_order)
      const bo = utilityMap[b].load_order == null ? 9999 : Number(utilityMap[b].load_order)
      if (ao !== bo) return ao - bo
      return a.localeCompare(b)
    }).map((key) => utilityMap[key])

    main.html_dependencies = Object.keys(htmlMap).sort().map((key) => htmlMap[key])
    main.versions = main.versions.map((version) => ({
      mc_version: version.mc_version,
      version: version.version,
      manifest: version.manifest,
      source_path: version.source_path
    }))
    delete main.title
    delete main.description
    delete main.utilities
    delete main.attachments
  })
}

function buildData() {
  const manifests = collectManifests()
  const utilityIndex = buildUtilityIndex()
  const mainScripts = collectMainScripts(manifests)
  detectUtilityDependencies(mainScripts, utilityIndex)

  return {
    schema: 3,
    generated_at: new Date().toISOString(),
    detection: "Lists script and HTML dependencies for each main script.",
    utility_root: utilityRootRel,
    main_scripts: mainScripts
  }
}

function versionLabel(version) {
  return version.mc_version + " " + version.version
}

function buildMarkdown(data) {
  const lines = []
  lines.push("# Dochi Script Dependencies")
  lines.push("")
  lines.push("- Generated: `" + data.generated_at + "`")
  lines.push("- Utility root: `" + data.utility_root + "`")
  lines.push("- Main scripts: `" + data.main_scripts.length + "`")
  lines.push("")
  lines.push("| Main Script | Script Dependencies | HTML Dependencies |")
  lines.push("|---|---|---|")
  data.main_scripts.forEach((main) => {
    const utilities = main.script_dependencies.map((dep) => "`" + escapeMd(dep.script) + "`").join("<br>") || "-"
    const html = main.html_dependencies.map((dep) => "`" + escapeMd(dep.path) + "`").join("<br>") || "-"
    lines.push("| " + [
      "`" + escapeMd(main.script) + "`",
      utilities,
      html
    ].join(" | ") + " |")
  })
  return lines.join("\n")
}

function buildHtml(data) {
  const payload = JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Dochi Script Dependencies</title>
<style>
:root{--bg:#f6f8fb;--panel:#fff;--text:#17202d;--muted:#657184;--line:#d8e0eb;--line2:#ebf0f6;--main:#e8f2ff;--util:#e7f8ef;--html:#f1eefc}
*{box-sizing:border-box}
html,body{min-width:2200px}
body{margin:0;background:var(--bg);color:var(--text);font:14px/1.45 Arial,sans-serif}
header{padding:24px 32px 18px;background:#fff;border-bottom:1px solid var(--line)}
h1{margin:0 0 6px;font-size:26px;letter-spacing:0}
h2{font-size:17px;margin:0 0 12px}
code{background:#eef2f7;border:1px solid #dbe2ec;border-radius:4px;padding:1px 5px;font-family:Consolas,Menlo,monospace;font-size:12px;overflow-wrap:anywhere}
.sub{color:var(--muted)}
.wrap{width:2200px;padding:18px 32px 34px}
.stats{display:grid;grid-template-columns:repeat(3,220px);gap:12px;margin-top:16px}
.stat{background:#fff;border:1px solid var(--line);border-radius:8px;padding:14px}
.stat b{display:block;font-size:22px;margin-bottom:2px}
.controls{display:grid;grid-template-columns:1fr;gap:10px;margin:0 0 16px;width:680px}
input{width:100%;height:38px;border:1px solid var(--line);border-radius:6px;padding:0 10px;background:#fff;color:var(--text)}
table{width:2136px;border-collapse:collapse;background:#fff;border:1px solid var(--line);table-layout:fixed}
th,td{border-bottom:1px solid var(--line2);border-right:1px solid var(--line2);padding:10px 12px;text-align:left;vertical-align:top}
th{font-size:12px;color:var(--muted);background:#f9fbfe}
tr:nth-child(even) td{background:#f8fafc}
th:nth-child(1),td:nth-child(1){width:420px}
th:nth-child(2),td:nth-child(2){width:1080px}
th:nth-child(3),td:nth-child(3){width:636px}
.badge{display:inline-flex;align-items:center;min-height:22px;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:700;border:1px solid transparent;margin:0 4px 4px 0;white-space:nowrap}
.badge.main{background:var(--main);border-color:#b4d2ef}
.badge.util{background:var(--util);border-color:#97d9b1}
.badge.html{background:var(--html);border-color:#c9bee9}
.badge.none{background:#f3f4f6;border-color:#d5d9e0;color:#545f70}
.deps{display:flex;flex-wrap:wrap;gap:4px}
</style>
</head>
<body>
<header>
  <h1>Dochi Script Dependencies</h1>
  <div class="stats">
    <div class="stat"><b id="statMain">0</b><span>main scripts</span></div>
    <div class="stat"><b id="statScript">0</b><span>script links</span></div>
    <div class="stat"><b id="statHtml">0</b><span>html links</span></div>
  </div>
</header>
<main class="wrap">
  <div class="controls">
    <input id="search" type="search" placeholder="Search script or html">
  </div>
  <h2>Main List</h2>
  <table>
    <thead>
      <tr>
        <th>Main Script</th>
        <th>Script Dependencies</th>
        <th>HTML Dependencies</th>
      </tr>
    </thead>
    <tbody id="tbody"></tbody>
  </table>
</main>
<script>
const DATA=${payload};
const state={search:""};
function escapeHtml(value){return String(value==null?"":value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]))}
function setStats(){
  document.getElementById("statMain").textContent=DATA.main_scripts.length;
  document.getElementById("statScript").textContent=DATA.main_scripts.reduce((sum,item)=>sum+(item.script_dependencies||[]).length,0);
  document.getElementById("statHtml").textContent=DATA.main_scripts.reduce((sum,item)=>sum+(item.html_dependencies||[]).length,0);
}
function filtered(){
  const q=state.search.toLowerCase();
  return DATA.main_scripts.filter(item=>{
    if(!q)return true;
    const text=[item.script,(item.script_dependencies||[]).map(dep=>dep.script).join(" "),(item.html_dependencies||[]).map(dep=>dep.path).join(" ")].join(" ").toLowerCase();
    return text.indexOf(q)!==-1;
  });
}
function badges(items, cls, empty){
  if(!items.length)return '<span class="badge none">'+empty+'</span>';
  return items.map(item=>'<span class="badge '+cls+'">'+escapeHtml(item)+'</span>').join("");
}
function renderTable(items){
  const tbody=document.getElementById("tbody");
  tbody.innerHTML="";
  items.forEach(item=>{
    const scripts=(item.script_dependencies||[]).map(dep=>dep.script);
    const html=(item.html_dependencies||[]).map(dep=>dep.path);
    const tr=document.createElement("tr");
    tr.innerHTML='<td><code>'+escapeHtml(item.script)+'</code></td><td><div class="deps">'+badges(scripts,'util','-')+'</div></td><td><div class="deps">'+badges(html,'html','-')+'</div></td>';
    tbody.appendChild(tr);
  });
}
function render(){renderTable(filtered())}
setStats();render();
document.getElementById("search").addEventListener("input",e=>{state.search=e.target.value;render()});
</script>
</body>
</html>`
}

function main() {
  const data = buildData()
  writeJson(jsonPath, data)
  const html = buildHtml(data) + "\n"
  fs.writeFileSync(mdPath, buildMarkdown(data) + "\n", "utf8")
  fs.writeFileSync(htmlPath, html, "utf8")
  fs.writeFileSync(htmlIndexPath, html, "utf8")
  console.log("Wrote " + rel(jsonPath))
  console.log("Wrote " + rel(mdPath))
  console.log("Wrote " + rel(htmlPath))
  console.log("Wrote " + rel(htmlIndexPath))
}

main()
