// Minimal common config loader helpers for NPC scripts.
// Domain-specific scripts should wrap these helpers with their own cfg_* functions.

function cfg_chk_toText(v) {
  return v == null ? '' : String(v);
}

function cfg_chk_deepCopy(v) {
  return JSON.parse(JSON.stringify(v));
}

function cfg_chk_merge(dst, src) {
  for (var k in src) {
    if (src[k] !== null && typeof src[k] === 'object' && !Array.isArray(src[k])) {
      if (!dst[k]) dst[k] = {};
      cfg_chk_merge(dst[k], src[k]);
    } else {
      dst[k] = src[k];
    }
  }
  return dst;
}

function cfg_chk_resolveFile(rawPath, baseDir) {
  var File = Java.type('java.io.File');
  var txt = cfg_chk_toText(rawPath).trim();
  if (!txt) return null;
  if (txt.indexOf(':') !== -1 || txt.indexOf('/') === 0 || txt.indexOf('\\') === 0) {
    return new File(txt);
  }
  var normalized = txt.replace(/\\/g, '/');
  var startsCustomNpcs = normalized.indexOf('customnpcs/') === 0;
  var withoutCustomRoot = startsCustomNpcs ? normalized.substring('customnpcs/'.length) : '';
  if (baseDir) {
    var based = new File(baseDir, txt);
    if (based.exists()) return based;
    if (withoutCustomRoot) {
      var basedWithoutCustom = new File(baseDir, withoutCustomRoot);
      if (basedWithoutCustom.exists()) return basedWithoutCustom;
    }
  }
  var direct = new File(txt);
  if (direct.exists()) return direct;
  if (withoutCustomRoot) {
    var directWithoutCustom = new File(withoutCustomRoot);
    if (directWithoutCustom.exists()) return directWithoutCustom;
  }
  return baseDir ? new File(baseDir, txt) : direct;
}

function cfg_chk_readTextFile(file) {
  var Files = Java.type('java.nio.file.Files');
  var StandardCharsets = Java.type('java.nio.charset.StandardCharsets');
  return new java.lang.String(Files.readAllBytes(file.toPath()), StandardCharsets.UTF_8);
}

function cfg_chk_readJsonFile(file) {
  var raw = cfg_chk_readTextFile(file);
  if (raw && raw.length > 0 && raw.charCodeAt(0) === 0xFEFF) raw = raw.substring(1);
  return { raw: raw, json: JSON.parse(raw) };
}

function cfg_chk_defaultConfig(def) {
  return cfg_chk_deepCopy(def || {} );
}

function cfg_chk_loadOrDefault(defaultConfig, rawPath, fallbackPath) {
  var File = Java.type('java.io.File');
  var file = cfg_chk_resolveFile(rawPath, null);
  if (!file || !file.exists()) {
    if (fallbackPath) file = new File(fallbackPath);
  }
  if (!file || !file.exists()) {
    return cfg_chk_defaultConfig(defaultConfig);
  }
  try {
    var payload = cfg_chk_readJsonFile(file);
    var cfg = cfg_chk_defaultConfig(defaultConfig);
    cfg_chk_merge(cfg, payload.json || {});
    return cfg;
  } catch (e) {
    return cfg_chk_defaultConfig(defaultConfig);
  }
}
