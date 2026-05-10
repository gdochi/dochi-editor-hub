const fs = require("fs")
const path = require("path")

const rootDir = path.resolve(__dirname, "..")
const overviewPath = path.join(rootDir, "dc_main_scripts.json")
const mdPath = path.join(rootDir, "DEPENDENCIES.md")
const htmlPath = path.join(rootDir, "docs", "dependencies.html")
const htmlIndexPath = path.join(rootDir, "docs", "index.html")

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"))
}

function rel(filePath) {
  return path.relative(rootDir, filePath).replace(/\\/g, "/")
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

function escapeMermaid(value) {
  return String(value == null ? "" : value)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, "'")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function attachmentTarget(item) {
  return item.path || item.id || ""
}

function versionLabel(version) {
  return version.mc_version + " " + version.version
}

function validateOverview(data) {
  const warnings = []
  const utilityRoot = path.join(rootDir, data.utility_root || "")

  ;(data.main_scripts || []).forEach((main) => {
    ;(main.versions || []).forEach((version) => {
      const manifestPath = path.join(rootDir, version.manifest || "")
      if (!fs.existsSync(manifestPath)) {
        warnings.push(main.script + ": missing manifest " + version.manifest)
        return
      }
      const manifest = readJson(manifestPath)
      const hasScript = (manifest.files || []).some((file) => {
        return file.source === main.script || file.install_as === main.script
      })
      if (!hasScript) warnings.push(main.script + ": manifest does not list this script in " + version.manifest)
    })

    ;(main.utilities || []).forEach((util) => {
      const utilPath = path.join(utilityRoot, util.script || "")
      if (!fs.existsSync(utilPath)) warnings.push(main.script + ": missing utility " + util.script)
    })
  })

  return warnings
}

function collectData() {
  const overview = readJson(overviewPath)
  const mains = (overview.main_scripts || []).slice().sort((a, b) => {
    return String(a.package || a.id || "").localeCompare(String(b.package || b.id || ""))
  })

  return {
    generated_at: new Date().toISOString(),
    source_path: rel(overviewPath),
    utility_root: overview.utility_root || "",
    description: overview.description || "",
    main_scripts: mains,
    warnings: validateOverview(overview)
  }
}

function makeMermaid(data) {
  const lines = ["flowchart LR"]
  let nodeIndex = 0
  const nodes = {}

  function nodeId(key, label, type) {
    if (!nodes[key]) {
      nodes[key] = {
        id: "n" + nodeIndex++,
        label,
        type
      }
    }
    return nodes[key].id
  }

  data.main_scripts.forEach((main) => {
    if (!main.utilities || !main.utilities.length) return
    const from = nodeId("main:" + main.script, main.script, "main")
    main.utilities.forEach((util) => {
      const to = nodeId("util:" + util.script, util.script, "util")
      lines.push('  ' + from + '["' + escapeMermaid(main.script) + '"] --> ' + to + '["' + escapeMermaid(util.script) + '"]')
    })
  })

  if (lines.length === 1) lines.push('  empty["No utility attachments"]')
  lines.push("  classDef main fill:#e8f2ff,stroke:#376b9f,color:#14273a")
  lines.push("  classDef util fill:#e7f8ef,stroke:#2c8a54,color:#0d3320")

  Object.keys(nodes).forEach((key) => {
    const node = nodes[key]
    lines.push("  class " + node.id + " " + node.type)
  })

  return lines.join("\n")
}

function buildMarkdown(data) {
  const lines = []
  lines.push("# Dochi Main Scripts")
  lines.push("")
  lines.push("Generated from `" + data.source_path + "`.")
  lines.push("")
  lines.push("- Generated: `" + data.generated_at + "`")
  lines.push("- Utility root: `" + data.utility_root + "`")
  lines.push("- Main scripts: `" + data.main_scripts.length + "`")
  lines.push("")
  lines.push("## Main List")
  lines.push("")
  lines.push("| Main Script | Package | Versions | Attached Utilities | Attachments | Role |")
  lines.push("|---|---|---|---|---|---|")
  data.main_scripts.forEach((main) => {
    const versions = (main.versions || []).map(versionLabel).join("<br>") || "-"
    const utilities = (main.utilities || []).map((util) => "`" + escapeMd(util.script) + "`").join("<br>") || "-"
    const attachments = (main.attachments || []).map((item) => item.type + ": `" + escapeMd(attachmentTarget(item)) + "`").join("<br>") || "-"
    lines.push("| " + [
      "`" + escapeMd(main.script) + "`",
      escapeMd(main.package || ""),
      versions,
      utilities,
      attachments,
      escapeMd(main.role || "")
    ].join(" | ") + " |")
  })
  lines.push("")
  lines.push("## Utility Map")
  lines.push("")
  lines.push("```mermaid")
  lines.push(makeMermaid(data))
  lines.push("```")
  lines.push("")
  lines.push("## Details")
  lines.push("")
  data.main_scripts.forEach((main) => {
    lines.push("### `" + main.script + "`")
    lines.push("")
    lines.push(main.role || "")
    lines.push("")
    lines.push("| Utility Script | Required | Load Order | Role |")
    lines.push("|---|---|---:|---|")
    if (!main.utilities || !main.utilities.length) {
      lines.push("| - | - | - | No utility script attachment. |")
    } else {
      main.utilities.forEach((util) => {
        lines.push("| `" + escapeMd(util.script) + "` | " + (util.required === false ? "no" : "yes") + " | " + (util.load_order == null ? "" : util.load_order) + " | " + escapeMd(util.role || "") + " |")
      })
    }
    lines.push("")
  })

  if (data.warnings.length) {
    lines.push("## Warnings")
    lines.push("")
    data.warnings.forEach((warning) => lines.push("- " + escapeMd(warning)))
    lines.push("")
  }

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
<title>Dochi Main Scripts</title>
<style>
:root{--bg:#f6f8fb;--panel:#fff;--text:#17202d;--muted:#657184;--line:#d8e0eb;--line2:#ebf0f6;--main:#e8f2ff;--util:#e7f8ef;--warn:#fff3cd}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:14px/1.45 Arial,sans-serif}
header{padding:24px 28px 18px;background:#fff;border-bottom:1px solid var(--line)}
h1{margin:0 0 6px;font-size:26px;letter-spacing:0}
h2{font-size:17px;margin:22px 0 12px}
h3{margin:0;font-size:17px}
code{background:#eef2f7;border:1px solid #dbe2ec;border-radius:4px;padding:1px 5px;font-family:Consolas,Menlo,monospace;font-size:12px}
.sub{color:var(--muted)}
.wrap{padding:18px 28px 34px}
.stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:16px}
.stat{background:#fff;border:1px solid var(--line);border-radius:8px;padding:14px}
.stat b{display:block;font-size:22px;margin-bottom:2px}
.controls{display:grid;grid-template-columns:1fr 180px;gap:10px;margin:0 0 16px}
input,select{width:100%;height:38px;border:1px solid var(--line);border-radius:6px;padding:0 10px;background:#fff;color:var(--text)}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}
.card{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:14px;margin-bottom:12px}
.card-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;border-bottom:1px solid var(--line2);padding-bottom:10px;margin-bottom:10px}
.badge{display:inline-flex;align-items:center;min-height:22px;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:700;border:1px solid transparent;margin:0 4px 4px 0}
.badge.main{background:var(--main);border-color:#b4d2ef}
.badge.util{background:var(--util);border-color:#97d9b1}
.badge.attach{background:#f1eefc;border-color:#c9bee9}
.badge.none{background:#f3f4f6;border-color:#d5d9e0;color:#545f70}
.list{display:flex;flex-direction:column;gap:8px}
.line{display:grid;grid-template-columns:180px 1fr;gap:8px;border-top:1px solid var(--line2);padding-top:8px}
.graph{background:#fff;border:1px solid var(--line);border-radius:8px;padding:14px;overflow:auto;min-height:360px}
svg{display:block;min-width:760px}
.edge{stroke:#97a4b8;stroke-width:1.2;fill:none;marker-end:url(#arrow)}
.node rect{stroke-width:1.3;rx:6}
.node text{font-size:12px;fill:#17202d}
.warn{background:var(--warn);border:1px solid #e0c66d;border-radius:8px;padding:12px;margin-bottom:16px}
@media(max-width:1000px){.grid,.stats,.controls{grid-template-columns:1fr}.wrap,header{padding-left:16px;padding-right:16px}.line{grid-template-columns:1fr}}
</style>
</head>
<body>
<header>
  <h1>Dochi Main Scripts</h1>
  <div class="sub">Simple view from <code>${escapeHtml(data.source_path)}</code>. Main scripts only, with attached utility scripts.</div>
  <div class="stats">
    <div class="stat"><b id="statMain">0</b><span>main scripts</span></div>
    <div class="stat"><b id="statUtil">0</b><span>utility attachments</span></div>
    <div class="stat"><b id="statVersion">0</b><span>version entries</span></div>
  </div>
</header>
<main class="wrap">
  <div id="warnings"></div>
  <div class="controls">
    <input id="search" type="search" placeholder="Search script, package, utility, role">
    <select id="packageFilter"><option value="">All packages</option></select>
  </div>
  <section class="grid">
    <div>
      <h2>Main List</h2>
      <div id="cards"></div>
    </div>
    <div>
      <h2>Utility Map</h2>
      <div class="graph" id="graph"></div>
    </div>
  </section>
</main>
<script>
const DATA=${payload};
const state={search:"",package:""};

function escapeHtml(value){return String(value==null?"":value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]))}
function attachmentTarget(item){return item.path||item.id||""}
function versionLabel(version){return version.mc_version+" "+version.version}

function setStats(){
  document.getElementById("statMain").textContent=DATA.main_scripts.length;
  document.getElementById("statUtil").textContent=DATA.main_scripts.reduce((sum,item)=>sum+(item.utilities||[]).length,0);
  document.getElementById("statVersion").textContent=DATA.main_scripts.reduce((sum,item)=>sum+(item.versions||[]).length,0);
}

function fillFilters(){
  const select=document.getElementById("packageFilter");
  Array.from(new Set(DATA.main_scripts.map(item=>item.package))).sort().forEach(pkg=>{
    const option=document.createElement("option");
    option.value=pkg;
    option.textContent=pkg;
    select.appendChild(option);
  });
}

function filtered(){
  const q=state.search.toLowerCase();
  return DATA.main_scripts.filter(item=>{
    if(state.package&&item.package!==state.package)return false;
    if(!q)return true;
    const text=[item.title,item.package,item.script,item.role,(item.utilities||[]).map(u=>[u.script,u.role].join(" ")).join(" "),(item.attachments||[]).map(a=>[a.type,attachmentTarget(a),a.role].join(" ")).join(" ")].join(" ").toLowerCase();
    return text.indexOf(q)!==-1;
  });
}

function renderWarnings(){
  const box=document.getElementById("warnings");
  if(!DATA.warnings||!DATA.warnings.length){box.innerHTML="";return}
  box.innerHTML='<div class="warn"><b>Warnings</b><br>'+DATA.warnings.map(escapeHtml).join("<br>")+'</div>';
}

function renderCards(items){
  const box=document.getElementById("cards");
  box.innerHTML="";
  items.forEach(item=>{
    const utilities=(item.utilities||[]).length?(item.utilities||[]).map(util=>{
      const meta=[util.required===false?"optional":"required",util.load_order!=null?"order "+util.load_order:""].filter(Boolean).join(", ");
      return '<div class="line"><div><span class="badge util">'+escapeHtml(util.script)+'</span></div><div><span class="sub">'+escapeHtml(meta)+'</span><br>'+escapeHtml(util.role||"")+'</div></div>';
    }).join(""):'<span class="badge none">No utility script attachment</span>';
    const attachments=(item.attachments||[]).map(att=>'<span class="badge attach">'+escapeHtml(att.type)+': '+escapeHtml(attachmentTarget(att))+'</span>').join("")||'<span class="badge none">No extra attachment</span>';
    const versions=(item.versions||[]).map(version=>'<span class="badge main">'+escapeHtml(versionLabel(version))+'</span>').join("");
    const card=document.createElement("article");
    card.className="card";
    card.innerHTML='<div class="card-head"><div><h3><code>'+escapeHtml(item.script)+'</code></h3><div class="sub">'+escapeHtml(item.title||item.package)+'</div></div><span class="badge main">'+escapeHtml(item.package)+'</span></div><p>'+escapeHtml(item.role||"")+'</p><div class="list"><div><b>Versions</b><br>'+versions+'</div><div><b>Utility Scripts</b>'+utilities+'</div><div><b>Attachments</b><br>'+attachments+'</div></div>';
    box.appendChild(card);
  });
}

function renderGraph(items){
  const graph=document.getElementById("graph");
  const edges=[];
  const nodes=new Map();
  function addNode(id,label,type){
    if(nodes.has(id))return nodes.get(id);
    const node={id,label,type,x:0,y:0,w:240,h:38};
    nodes.set(id,node);
    return node;
  }
  items.forEach(item=>{
    if(!(item.utilities||[]).length)return;
    const main=addNode("main:"+item.script,item.script,"main");
    (item.utilities||[]).forEach(util=>{
      const node=addNode("util:"+util.script,util.script,"util");
      edges.push({from:main.id,to:node.id});
    });
  });
  if(!edges.length){graph.innerHTML='<div class="sub">No utility attachments in this view.</div>';return}
  const mainNodes=Array.from(nodes.values()).filter(n=>n.type==="main").sort((a,b)=>a.label.localeCompare(b.label));
  const utilNodes=Array.from(nodes.values()).filter(n=>n.type==="util").sort((a,b)=>a.label.localeCompare(b.label));
  let height=120;
  mainNodes.forEach((node,i)=>{node.x=20;node.y=24+i*58;height=Math.max(height,node.y+70)});
  utilNodes.forEach((node,i)=>{node.x=360;node.y=24+i*58;height=Math.max(height,node.y+70)});
  const width=760;
  const edgeSvg=edges.map(edge=>{
    const a=nodes.get(edge.from),b=nodes.get(edge.to),x1=a.x+a.w,y1=a.y+a.h/2,x2=b.x,y2=b.y+b.h/2,mid=(x1+x2)/2;
    return '<path class="edge" d="M'+x1+' '+y1+' C'+mid+' '+y1+', '+mid+' '+y2+', '+x2+' '+y2+'"></path>';
  }).join("");
  const nodeSvg=Array.from(nodes.values()).map(node=>{
    const fill=node.type==="main"?"#e8f2ff":"#e7f8ef";
    return '<g class="node"><rect x="'+node.x+'" y="'+node.y+'" width="'+node.w+'" height="'+node.h+'" fill="'+fill+'" stroke="#9aa7ba"></rect><text x="'+(node.x+10)+'" y="'+(node.y+24)+'">'+escapeHtml(node.label)+'</text></g>';
  }).join("");
  graph.innerHTML='<svg viewBox="0 0 '+width+' '+height+'" width="'+width+'" height="'+height+'" role="img" aria-label="Main script utility map"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#97a4b8"></path></marker></defs>'+edgeSvg+nodeSvg+'</svg>';
}

function render(){
  const items=filtered();
  renderCards(items);
  renderGraph(items);
}

setStats();
fillFilters();
renderWarnings();
document.getElementById("search").addEventListener("input",event=>{state.search=event.target.value;render()});
document.getElementById("packageFilter").addEventListener("change",event=>{state.package=event.target.value;render()});
render();
</script>
</body>
</html>`
}

function main() {
  const data = collectData()
  const html = buildHtml(data) + "\n"
  fs.writeFileSync(mdPath, buildMarkdown(data) + "\n", "utf8")
  fs.writeFileSync(htmlPath, html, "utf8")
  fs.writeFileSync(htmlIndexPath, html, "utf8")
  console.log("Wrote " + rel(mdPath))
  console.log("Wrote " + rel(htmlPath))
  console.log("Wrote " + rel(htmlIndexPath))
}

main()
