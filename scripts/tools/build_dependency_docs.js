const fs = require("fs")
const path = require("path")

const rootDir = path.resolve(__dirname, "..")
const registryPath = path.join(rootDir, "dc_dependencies.json")
const mdPath = path.join(rootDir, "DEPENDENCIES.md")
const htmlPath = path.join(rootDir, "docs", "dependencies.html")
const htmlIndexPath = path.join(rootDir, "docs", "index.html")

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"))
}

function walk(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  entries.forEach((entry) => {
    if (entry.name === ".git" || entry.name === "node_modules") return
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(fullPath, out)
      return
    }
    if (entry.isFile() && entry.name === "manifest.json") out.push(fullPath)
  })
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

function getDepTarget(dep) {
  if (!dep) return ""
  return dep.path || dep.id || dep.type || ""
}

function classifyFile(file) {
  if (file.type) return file.type
  if (/\.html$/i.test(file.source || "")) return "html"
  if (/\.js$/i.test(file.source || "")) return "script"
  return "file"
}

function expandDependencyEntry(entry, registry) {
  if (!entry) return []
  if (!entry.inherits) return [Object.assign({}, entry)]
  const set = registry.dependency_sets[entry.inherits]
  if (!set) {
    return [
      {
        type: "missing",
        path: entry.inherits,
        required: true,
        note: "Missing inherited dependency set"
      }
    ]
  }
  return (set.dependencies || []).map((dep) => {
    const copy = Object.assign({}, dep)
    copy.inherited_from = entry.inherits
    return copy
  })
}

function collectData() {
  const registry = readJson(registryPath)
  const manifestPaths = []
  walk(rootDir, manifestPaths)
  manifestPaths.sort()

  const manifests = manifestPaths.map((filePath) => {
    const manifest = readJson(filePath)
    return {
      path: rel(filePath),
      dir: path.dirname(filePath),
      manifest
    }
  })

  const rows = []
  const graphEdges = []
  const dependencySets = registry.dependency_sets || {}

  manifests.forEach((item) => {
    const manifest = item.manifest
    ;(manifest.files || []).forEach((file) => {
      const dependencyEntries = file.dependencies || []
      const inheritedSets = dependencyEntries.filter((dep) => dep && dep.inherits).map((dep) => dep.inherits)
      const expandedDeps = []

      dependencyEntries.forEach((entry) => {
        expandDependencyEntry(entry, registry).forEach((dep) => expandedDeps.push(dep))
      })

      const typeCounts = {}
      expandedDeps.forEach((dep) => {
        typeCounts[dep.type || "unknown"] = (typeCounts[dep.type || "unknown"] || 0) + 1
      })

      const row = {
        package: manifest.package || "",
        version: manifest.version || "",
        mc_version: manifest.mc_version || "",
        manifest_id: manifest.id || "",
        manifest_path: item.path,
        entry: manifest.entry || "",
        source: file.source || "",
        install_as: file.install_as || "",
        file_type: classifyFile(file),
        inherited_sets: inheritedSets,
        dependencies: expandedDeps,
        dependency_count: expandedDeps.length,
        required_count: expandedDeps.filter((dep) => dep.required !== false).length,
        optional_count: expandedDeps.filter((dep) => dep.required === false).length,
        type_counts: typeCounts
      }
      rows.push(row)

      const scriptNode = "script:" + row.manifest_id + ":" + row.source
      if (!dependencyEntries.length) return
      dependencyEntries.forEach((entry) => {
        if (entry && entry.inherits) {
          const setNode = "set:" + entry.inherits
          graphEdges.push({
            from: scriptNode,
            fromLabel: row.source,
            fromType: "script",
            to: setNode,
            toLabel: entry.inherits,
            toType: "set"
          })
          const set = dependencySets[entry.inherits]
          ;((set && set.dependencies) || []).forEach((dep) => {
            graphEdges.push({
              from: setNode,
              fromLabel: entry.inherits,
              fromType: "set",
              to: "dep:" + (dep.type || "unknown") + ":" + getDepTarget(dep),
              toLabel: getDepTarget(dep),
              toType: dep.type || "dependency"
            })
          })
          return
        }
        graphEdges.push({
          from: scriptNode,
          fromLabel: row.source,
          fromType: "script",
          to: "dep:" + ((entry && entry.type) || "unknown") + ":" + getDepTarget(entry),
          toLabel: getDepTarget(entry),
          toType: (entry && entry.type) || "dependency"
        })
      })
    })
  })

  rows.sort((a, b) => {
    return [a.package, a.mc_version, a.version, a.source].join("\u0000").localeCompare(
      [b.package, b.mc_version, b.version, b.source].join("\u0000")
    )
  })

  return {
    generated_at: new Date().toISOString(),
    registry_path: rel(registryPath),
    registry,
    manifests: manifests.map((item) => ({
      path: item.path,
      id: item.manifest.id || "",
      package: item.manifest.package || "",
      version: item.manifest.version || "",
      mc_version: item.manifest.mc_version || ""
    })),
    rows,
    graph_edges: dedupeEdges(graphEdges)
  }
}

function dedupeEdges(edges) {
  const seen = {}
  const out = []
  edges.forEach((edge) => {
    const key = edge.from + "->" + edge.to
    if (seen[key]) return
    seen[key] = true
    out.push(edge)
  })
  return out
}

function makeMermaid(data) {
  const nodes = {}
  let nodeIndex = 0
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

  const lines = ["flowchart LR"]
  data.graph_edges.forEach((edge) => {
    const from = nodeId(edge.from, edge.fromLabel, edge.fromType)
    const to = nodeId(edge.to, edge.toLabel, edge.toType)
    lines.push('  ' + from + '["' + escapeMermaid(edge.fromLabel) + '"] --> ' + to + '["' + escapeMermaid(edge.toLabel) + '"]')
  })

  lines.push("  classDef script fill:#e8f2ff,stroke:#376b9f,color:#14273a")
  lines.push("  classDef set fill:#fff5dc,stroke:#ad7d17,color:#3b2a05")
  lines.push("  classDef html fill:#e7f8ef,stroke:#2c8a54,color:#0d3320")
  lines.push("  classDef mod fill:#fdecec,stroke:#b34b4b,color:#4a1515")
  lines.push("  classDef data fill:#f0edff,stroke:#6f58b8,color:#241b4a")

  Object.keys(nodes).forEach((key) => {
    const node = nodes[key]
    const type = node.type
    if (type === "script") lines.push("  class " + node.id + " script")
    else if (type === "set") lines.push("  class " + node.id + " set")
    else if (type === "html") lines.push("  class " + node.id + " html")
    else if (type === "mod") lines.push("  class " + node.id + " mod")
    else if (type === "json" || type === "json_dir" || type === "directory") lines.push("  class " + node.id + " data")
  })

  return lines.join("\n")
}

function buildMarkdown(data) {
  const lines = []
  lines.push("# Dochi Script Dependencies")
  lines.push("")
  lines.push("Generated from `" + data.registry_path + "` and package manifests.")
  lines.push("")
  lines.push("- Generated: `" + data.generated_at + "`")
  lines.push("- Manifests: `" + data.manifests.length + "`")
  lines.push("- Files: `" + data.rows.length + "`")
  lines.push("- Dependency sets: `" + Object.keys(data.registry.dependency_sets || {}).length + "`")
  lines.push("")
  lines.push("## Overview")
  lines.push("")
  lines.push("| Package | MC | Version | Source | Install As | Inherits | Deps | Required | Optional |")
  lines.push("|---|---|---:|---|---|---|---:|---:|---:|")
  data.rows.forEach((row) => {
    lines.push("| " +
      [
        escapeMd(row.package),
        escapeMd(row.mc_version),
        escapeMd(row.version),
        "`" + escapeMd(row.source) + "`",
        "`" + escapeMd(row.install_as) + "`",
        row.inherited_sets.map((set) => "`" + escapeMd(set) + "`").join("<br>") || "-",
        row.dependency_count,
        row.required_count,
        row.optional_count
      ].join(" | ") + " |"
    )
  })
  lines.push("")
  lines.push("## Dependency Sets")
  lines.push("")
  lines.push("| Set | Description | Dependencies |")
  lines.push("|---|---|---:|")
  Object.keys(data.registry.dependency_sets || {}).sort().forEach((name) => {
    const set = data.registry.dependency_sets[name]
    lines.push("| `" + escapeMd(name) + "` | " + escapeMd(set.description || "") + " | " + ((set.dependencies || []).length) + " |")
  })
  lines.push("")
  lines.push("## Graph")
  lines.push("")
  lines.push("```mermaid")
  lines.push(makeMermaid(data))
  lines.push("```")
  lines.push("")
  lines.push("## Expanded Dependencies")
  lines.push("")
  data.rows.filter((row) => row.dependencies.length).forEach((row) => {
    lines.push("### " + row.package + " " + row.version + " - `" + row.source + "`")
    lines.push("")
    lines.push("| Type | Target | Required | Load Order | Inherited From | Note |")
    lines.push("|---|---|---|---:|---|---|")
    row.dependencies.forEach((dep) => {
      lines.push("| " +
        [
          escapeMd(dep.type || ""),
          "`" + escapeMd(getDepTarget(dep)) + "`",
          dep.required === false ? "no" : "yes",
          dep.load_order == null ? "" : dep.load_order,
          dep.inherited_from ? "`" + escapeMd(dep.inherited_from) + "`" : "",
          escapeMd(dep.note || "")
        ].join(" | ") + " |"
      )
    })
    lines.push("")
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
:root {
  --bg: #f6f8fb;
  --panel: #ffffff;
  --text: #18202b;
  --muted: #657184;
  --line: #d7dee9;
  --line2: #e8edf4;
  --accent: #2563eb;
  --script: #dceeff;
  --set: #fff2c7;
  --html: #dcf8e8;
  --mod: #ffe0e0;
  --data: #eee8ff;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 14px/1.45 Arial, sans-serif; }
header { padding: 24px 28px 16px; border-bottom: 1px solid var(--line); background: #fff; }
h1 { margin: 0 0 6px; font-size: 26px; letter-spacing: 0; }
h2 { margin: 22px 0 12px; font-size: 17px; }
h3 { margin: 0; font-size: 15px; }
.sub { color: var(--muted); }
.wrap { padding: 18px 28px 34px; }
.stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: 16px; }
.stat { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 14px; }
.stat b { display: block; font-size: 22px; margin-bottom: 2px; }
.controls { display: grid; grid-template-columns: 1fr 180px 180px; gap: 10px; margin: 16px 0; }
input, select { width: 100%; height: 38px; border: 1px solid var(--line); border-radius: 6px; padding: 0 10px; background: #fff; color: var(--text); }
.grid { display: grid; grid-template-columns: 1.05fr .95fr; gap: 16px; align-items: start; }
.panel { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
.panel-head { padding: 13px 14px; border-bottom: 1px solid var(--line2); display: flex; justify-content: space-between; gap: 12px; align-items: center; }
.table-wrap { overflow: auto; }
table { width: 100%; border-collapse: collapse; min-width: 860px; }
th, td { padding: 10px 12px; border-bottom: 1px solid var(--line2); text-align: left; vertical-align: top; }
th { font-size: 12px; color: var(--muted); background: #f9fbfe; position: sticky; top: 0; z-index: 1; }
code { background: #eef2f7; border: 1px solid #dbe2ec; border-radius: 4px; padding: 1px 5px; font-family: Consolas, Menlo, monospace; font-size: 12px; }
.badge { display: inline-flex; align-items: center; height: 22px; padding: 0 8px; border-radius: 999px; font-size: 12px; font-weight: 700; border: 1px solid transparent; margin: 0 4px 4px 0; }
.badge.script { background: var(--script); border-color: #b4d2ef; }
.badge.set { background: var(--set); border-color: #e0c66d; }
.badge.html { background: var(--html); border-color: #97d9b1; }
.badge.mod { background: var(--mod); border-color: #edaaaa; }
.badge.data { background: var(--data); border-color: #c6bbeb; }
.badge.optional { background: #f3f4f6; border-color: #d5d9e0; color: #545f70; }
.details { display: flex; flex-direction: column; gap: 10px; }
details { border: 1px solid var(--line); border-radius: 8px; background: #fff; overflow: hidden; }
summary { cursor: pointer; padding: 12px 14px; font-weight: 700; }
.dep-list { padding: 0 14px 14px; }
.dep { display: grid; grid-template-columns: 92px 1fr 84px; gap: 8px; padding: 8px 0; border-top: 1px solid var(--line2); align-items: start; }
.dep .note { grid-column: 2 / 4; color: var(--muted); font-size: 12px; }
.graph { padding: 14px; overflow: auto; min-height: 420px; }
svg { display: block; min-width: 960px; }
.node rect { stroke-width: 1.3; rx: 6; }
.node text { font-size: 12px; fill: #18202b; }
.edge { stroke: #97a4b8; stroke-width: 1.2; fill: none; marker-end: url(#arrow); }
.empty { padding: 16px; color: var(--muted); }
@media (max-width: 1100px) {
  .grid, .stats, .controls { grid-template-columns: 1fr; }
  header, .wrap { padding-left: 16px; padding-right: 16px; }
}
</style>
</head>
<body>
<header>
  <h1>Dochi Script Dependencies</h1>
  <div class="sub">Generated from <code>${escapeHtml(data.registry_path)}</code> at <code>${escapeHtml(data.generated_at)}</code></div>
  <div class="stats">
    <div class="stat"><b id="statPackages">0</b><span>packages</span></div>
    <div class="stat"><b id="statFiles">0</b><span>files</span></div>
    <div class="stat"><b id="statSets">0</b><span>dependency sets</span></div>
    <div class="stat"><b id="statDeps">0</b><span>expanded dependencies</span></div>
  </div>
</header>
<main class="wrap">
  <section class="panel">
    <div class="panel-head">
      <h3>Script Table</h3>
      <span class="sub" id="rowCount"></span>
    </div>
    <div class="controls">
      <input id="search" type="search" placeholder="Search package, script, dependency, path">
      <select id="packageFilter"><option value="">All packages</option></select>
      <select id="typeFilter"><option value="">All dependency types</option></select>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Package</th>
            <th>MC</th>
            <th>Version</th>
            <th>Source</th>
            <th>Install As</th>
            <th>Inherits</th>
            <th>Deps</th>
            <th>Types</th>
          </tr>
        </thead>
        <tbody id="tbody"></tbody>
      </table>
    </div>
  </section>
  <section class="grid">
    <div class="panel">
      <div class="panel-head"><h3>Visual Graph</h3><span class="sub">script -> inherited set -> dependency</span></div>
      <div class="graph" id="graph"></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>Expanded Dependencies</h3><span class="sub">click to inspect</span></div>
      <div class="details" id="details"></div>
    </div>
  </section>
</main>
<script>
const DATA = ${payload};
const state = { search: "", package: "", type: "" };

function depTarget(dep) {
  return dep.path || dep.id || dep.type || "";
}

function depTypeClass(type) {
  if (type === "script") return "script";
  if (type === "html") return "html";
  if (type === "mod") return "mod";
  if (type === "json" || type === "json_dir" || type === "directory") return "data";
  return "optional";
}

function typeSummary(row) {
  return Object.keys(row.type_counts).sort().map(type => {
    return '<span class="badge ' + depTypeClass(type) + '">' + type + ': ' + row.type_counts[type] + '</span>';
  }).join("");
}

function setStats() {
  const packages = new Set(DATA.rows.map(row => row.package));
  document.getElementById("statPackages").textContent = packages.size;
  document.getElementById("statFiles").textContent = DATA.rows.length;
  document.getElementById("statSets").textContent = Object.keys(DATA.registry.dependency_sets || {}).length;
  document.getElementById("statDeps").textContent = DATA.rows.reduce((sum, row) => sum + row.dependency_count, 0);
}

function fillFilters() {
  const pkg = document.getElementById("packageFilter");
  Array.from(new Set(DATA.rows.map(row => row.package))).sort().forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    pkg.appendChild(opt);
  });

  const types = new Set();
  DATA.rows.forEach(row => row.dependencies.forEach(dep => types.add(dep.type || "unknown")));
  const typeFilter = document.getElementById("typeFilter");
  Array.from(types).sort().forEach(type => {
    const opt = document.createElement("option");
    opt.value = type;
    opt.textContent = type;
    typeFilter.appendChild(opt);
  });
}

function getFilteredRows() {
  const q = state.search.toLowerCase();
  return DATA.rows.filter(row => {
    if (state.package && row.package !== state.package) return false;
    if (state.type && !row.dependencies.some(dep => (dep.type || "unknown") === state.type)) return false;
    if (!q) return true;
    const haystack = [
      row.package, row.mc_version, row.version, row.source, row.install_as,
      row.inherited_sets.join(" "),
      row.dependencies.map(dep => [dep.type, depTarget(dep), dep.note, dep.inherited_from].join(" ")).join(" ")
    ].join(" ").toLowerCase();
    return haystack.indexOf(q) !== -1;
  });
}

function renderTable(rows) {
  const tbody = document.getElementById("tbody");
  tbody.innerHTML = "";
  rows.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = [
      '<td>' + escapeHtml(row.package) + '</td>',
      '<td>' + escapeHtml(row.mc_version) + '</td>',
      '<td>' + escapeHtml(row.version) + '</td>',
      '<td><code>' + escapeHtml(row.source) + '</code></td>',
      '<td><code>' + escapeHtml(row.install_as) + '</code></td>',
      '<td>' + (row.inherited_sets.map(set => '<span class="badge set">' + escapeHtml(set) + '</span>').join("") || '<span class="sub">none</span>') + '</td>',
      '<td>' + row.dependency_count + ' <span class="sub">(' + row.required_count + ' req, ' + row.optional_count + ' opt)</span></td>',
      '<td>' + typeSummary(row) + '</td>'
    ].join("");
    tbody.appendChild(tr);
  });
  document.getElementById("rowCount").textContent = rows.length + " visible";
}

function renderDetails(rows) {
  const box = document.getElementById("details");
  box.innerHTML = "";
  const withDeps = rows.filter(row => row.dependencies.length);
  if (!withDeps.length) {
    box.innerHTML = '<div class="empty">No dependencies match the current filters.</div>';
    return;
  }
  withDeps.forEach((row, index) => {
    const el = document.createElement("details");
    if (index < 3) el.open = true;
    const deps = row.dependencies.map(dep => {
      const required = dep.required === false ? '<span class="badge optional">optional</span>' : '<span class="badge script">required</span>';
      const note = dep.note ? '<div class="note">' + escapeHtml(dep.note) + '</div>' : "";
      return '<div class="dep"><span class="badge ' + depTypeClass(dep.type) + '">' + escapeHtml(dep.type || "unknown") + '</span><code>' + escapeHtml(depTarget(dep)) + '</code>' + required + note + '</div>';
    }).join("");
    el.innerHTML = '<summary>' + escapeHtml(row.package + " " + row.version + " - " + row.source) + '</summary><div class="dep-list">' + deps + '</div>';
    box.appendChild(el);
  });
}

function renderGraph(rows) {
  const graph = document.getElementById("graph");
  const visibleScripts = new Set(rows.map(row => "script:" + row.manifest_id + ":" + row.source));
  const edges = DATA.graph_edges.filter(edge => visibleScripts.has(edge.from) || edge.from.indexOf("set:") === 0);
  const scriptNodes = [];
  const setNodes = [];
  const depNodes = [];
  const nodeMap = new Map();

  function addNode(id, label, type) {
    if (nodeMap.has(id)) return nodeMap.get(id);
    const node = { id, label, type, x: 0, y: 0, w: 230, h: 34 };
    nodeMap.set(id, node);
    if (type === "script") scriptNodes.push(node);
    else if (type === "set") setNodes.push(node);
    else depNodes.push(node);
    return node;
  }

  edges.forEach(edge => {
    addNode(edge.from, edge.fromLabel, edge.fromType);
    addNode(edge.to, edge.toLabel, edge.toType);
  });

  const columns = [scriptNodes, setNodes, depNodes];
  const colX = [20, 330, 640];
  let height = 120;
  columns.forEach((nodes, col) => {
    nodes.sort((a, b) => a.label.localeCompare(b.label));
    nodes.forEach((node, i) => {
      node.x = colX[col];
      node.y = 24 + i * 48;
      height = Math.max(height, node.y + 58);
    });
  });

  const width = 920;
  const nodeClass = type => {
    if (type === "script") return "#dceeff";
    if (type === "set") return "#fff2c7";
    if (type === "html") return "#dcf8e8";
    if (type === "mod") return "#ffe0e0";
    if (type === "json" || type === "json_dir" || type === "directory") return "#eee8ff";
    return "#eef2f7";
  };

  const edgeLines = edges.map(edge => {
    const a = nodeMap.get(edge.from);
    const b = nodeMap.get(edge.to);
    if (!a || !b) return "";
    const x1 = a.x + a.w;
    const y1 = a.y + a.h / 2;
    const x2 = b.x;
    const y2 = b.y + b.h / 2;
    const mid = (x1 + x2) / 2;
    return '<path class="edge" d="M' + x1 + ' ' + y1 + ' C' + mid + ' ' + y1 + ', ' + mid + ' ' + y2 + ', ' + x2 + ' ' + y2 + '"></path>';
  }).join("");

  const nodeEls = Array.from(nodeMap.values()).map(node => {
    const label = node.label.length > 30 ? node.label.slice(0, 27) + "..." : node.label;
    return '<g class="node"><rect x="' + node.x + '" y="' + node.y + '" width="' + node.w + '" height="' + node.h + '" fill="' + nodeClass(node.type) + '" stroke="#9aa7ba"></rect><text x="' + (node.x + 10) + '" y="' + (node.y + 22) + '">' + escapeHtml(label) + '</text><title>' + escapeHtml(node.label) + '</title></g>';
  }).join("");

  graph.innerHTML = '<svg viewBox="0 0 ' + width + ' ' + height + '" width="' + width + '" height="' + height + '" role="img" aria-label="Dependency graph"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#97a4b8"></path></marker></defs>' + edgeLines + nodeEls + '</svg>';
}

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

function render() {
  const rows = getFilteredRows();
  renderTable(rows);
  renderDetails(rows);
  renderGraph(rows);
}

setStats();
fillFilters();
document.getElementById("search").addEventListener("input", event => { state.search = event.target.value; render(); });
document.getElementById("packageFilter").addEventListener("change", event => { state.package = event.target.value; render(); });
document.getElementById("typeFilter").addEventListener("change", event => { state.type = event.target.value; render(); });
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
