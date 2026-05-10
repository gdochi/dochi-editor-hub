var API = Java.type("noppes.npcs.api.NpcAPI").Instance();
var File = Java.type("java.io.File");
var Files = Java.type("java.nio.file.Files");
var Paths = Java.type("java.nio.file.Paths");
var StandardCharsets = Java.type("java.nio.charset.StandardCharsets");
var ArrayList = Java.type("java.util.ArrayList");

var GUI_ID = 9473;

var DEFAULT_ROOT_DIR = "customnpcs/JSON/item/";
var DEFAULT_PREFIX_DIR = "customnpcs/JSON/item/prefix/";
var DEFAULT_CATEGORY_FILE = "customnpcs/JSON/item/category_config.json";

var MODE_HOME="home",MODE_LORE="lore",MODE_STATS="stats",MODE_REGISTER="register",MODE_CATEGORY="category",MODE_SETTINGS="settings";

var key={
 mode:"ig_mode",
 rows:"ig_rows",
 page:"ig_page",
 prefix:{open:"ig_prefix_open",visible:"ig_prefix_visible"},
 lore:{name:"ig_lore_name",vanilla:"ig_lore_vanilla",zoom:"ig_lore_zoom",prefixPopup:"ig_lore_prefix_popup",prefixPage:"ig_lore_prefix_page",exportPopup:"ig_lore_export_popup",exportName:"ig_lore_export_name"},
 targetItem:"ig_target_item",
 restoreRows:"ig_restore_rows",

 reg:{cat:"ig_reg_cat",sub:"ig_reg_sub",file:"ig_reg_file"},
 stat:{main:"ig_stat_main",sub:"ig_stat_sub",bc:"ig_stat_bc",bcPreset:"ig_stat_bc_preset",bcPage:"ig_stat_bc_page",damage:"ig_stat_damage",speed:"ig_stat_speed",armor:"ig_stat_armor",tough:"ig_stat_tough"},
 cat:{page:"ig_cat_page",name:"ig_cat_name",subs:"ig_cat_subs",selected:"ig_cat_selected",checked:"ig_cat_checked",exportName:"ig_cat_export_name",exportNames:"ig_cat_export_names",exportPage:"ig_cat_export_page",itemsSub:"ig_cat_items_sub",edit:"ig_cat_edit",popup:"ig_cat_popup",view:"ig_cat_view",items:"ig_cat_items",itemPage:"ig_cat_item_page",subPage:"ig_cat_sub_page",presetPage:"ig_cat_preset_page"},
 path:{root:"ig_path_root",prefix:"ig_path_prefix",category:"ig_path_category"},
 settings:{}
};

var DEFAULT_CATEGORIES = {
 weapon:["melee","ranged","arrow","magic"],
 armor:["head","chest","legs","boots"],
 consumable:["food","potion","scroll","other"],
 material:["ore","part","gem","other"],
 quest:["main","side","misc"],
 recipe:["weapon","armor","consumable","misc"]
};

var STAT_MAIN_TYPES = ["weapon","armor"];

var BC_PRESETS = [
["Anchor","bettercombat:anchor"],["Axe","bettercombat:axe"],["Heavy Axe","bettercombat:heavy_axe"],["Double Axe","bettercombat:double_axe"],
["Battlestaff","bettercombat:battlestaff"],["Staff","bettercombat:staff"],["Wand","bettercombat:wand"],
["Claw","bettercombat:claw"],["Fist","bettercombat:fist"],
["Claymore","bettercombat:claymore"],["Coral Blade","bettercombat:coral_blade"],["Cutlass","bettercombat:cutlass"],
["Sword","bettercombat:sword"],["Dagger","bettercombat:dagger"],["Twin Blade","bettercombat:twin_blade"],
["Glaive","bettercombat:glaive"],["Halberd","bettercombat:halberd"],["Spear","bettercombat:spear"],["Lance","bettercombat:lance"],
["Trident","bettercombat:trident"],
["Hammer","bettercombat:hammer"],["Mace","bettercombat:mace"],
["Katana","bettercombat:katana"],["Rapier","bettercombat:rapier"],
["Pickaxe","bettercombat:pickaxe"],["Scythe","bettercombat:scythe"],["Sickle","bettercombat:sickle"],
["Soul Knife","bettercombat:soul_knife"]
];

var CFG = {
 perPage: 12,

 gui:{w:760,h:600},
 leftPanel:{x:12,y:92,w:560,h:400},
 rightPanel:{x:576,y:92,w:172,h:400},
 lineColor:0x665A8CFF,

 subUi:{
  bgTexture:"minecraft:textures/block/gray_concrete.png",
  bgTexX:0,
  bgTexY:0
 },

 modeBtn:{x:10,w:152,h:20,gap:19,y0:2},
 slot:{x:10,y:10},

 lore:{
  nameY:18,
  nameLabelX:18,
  nameLabelW:80,
  nameFieldX:112,
  nameFieldW:250,
  nameFieldH:18,
  btnVanillaX:0,
  btnVanillaW:62,
  btnIssueX:0,
  btnIssueW:44,
  issueFieldX:0,
  issueFieldW:40,

  zoomBtnW:18,
  zoomBtnGap:2,

  rowStartY:46,
  rowStep:24,
  numX:0,
  numW:14,
  prefixBtnX:56,
  prefixBtnW:18,
  prefixFieldX:78,
  prefixFieldW:120,
  fieldH:16,
  loreXHidden:78,
  loreXVisible:202,
  loreW:320,
  lineChars:92,

  btnTogglePrefix:{x:10,y:130,w:152,h:20},
  btnToggleRows:{x:10,y:156,w:152,h:20},
  btnClear:{x:10,y:182,w:72,h:20},
  btnRestore:{x:90,y:182,w:72,h:20},
  btnApply:{x:10,y:208,w:152,h:20},
  btnSavePrefix:{x:10,y:234,w:72,h:20},
  btnLoadPrefix:{x:90,y:234,w:72,h:20},
  btnPrev:{x:10,y:260,w:72,h:20},
  btnNext:{x:90,y:260,w:72,h:20},
  pageLabel:{x:10,y:286,w:152,h:20}
 },

 stats:{
  labelX:60,
  valueX:170,
  fieldX:190,
  rowY:50,
  rowGap:26,
  fieldW:130,
  fieldH:18,

  bcPanelX:378,
  bcPanelY:72,
  bcRows:6,
  bcRowStep:18,

  apply:{x:10,y:130,w:152,h:20}
 },

 reg:{
  labelX:76,
  valueX:176,
  rowY:62,
  rowGap:30,
  valueW:150,
  fileW:180,
  save:{x:10,y:130,w:152,h:20}
 },

 cat:{
  listX:22,listY:50,listW:170,rowH:18,rows:10,

  menu:{x:208,y:50,w:300,h:56},
  edit:{x:196,y:34,w:352,h:320},
  items:{x:220,y:46,w:320,h:330,cols:4,rows:3,slot:18,gapX:72,gapY:78},
  overlayBtn:{texture:"minecraft:textures/gui/widgets.png",texX:0,texY:66,w:18,h:18},

  subs:{perPage:6,fieldW:240,fieldH:18,rowStep:24,x:220,y:118,btnY:0},

  nameLX:220,nameFX:320,nameW:200,nameY:70,
  btnNew:{x:10,y:130,w:72,h:20},
  btnDelete:{x:90,y:130,w:72,h:20},
  btnSave:{x:10,y:156,w:72,h:20},
  btnImport:{x:90,y:156,w:72,h:20},
  exportLabel:{x:10,y:182,w:152,h:18},
  exportField:{x:10,y:200,w:152,h:18},
  btnPrev:{x:10,y:228,w:72,h:20},
  btnNext:{x:90,y:228,w:72,h:20},
  pageLabel:{x:10,y:254,w:152,h:20}
 },
 settings:{
  labelX:60,
  fieldX:190,
  fieldW:340,
  fieldH:18,
  rowY:50,
  rowGap:30,
  save:{x:10,y:130,w:152,h:20}
 },

 inv:{x:5,y:312,full:true}
};

var ID = {
 // Mode buttons (1..)
 MODE_HOME:1,MODE_LORE:2,MODE_STATS:3,MODE_REGISTER:4,MODE_CATEGORY:5,MODE_SETTINGS:6,

 // Main panels (borders): baseId+0..3 reserved
 LEFT_TOP:10,LEFT_RIGHT:11,LEFT_BOTTOM:12,LEFT_LEFT:13,
 RIGHT_TOP:14,RIGHT_RIGHT:15,RIGHT_BOTTOM:16,RIGHT_LEFT:17,
 UTIL_RIGHT_DIV:18,

 // Lore (20..199) - 2-split only (no segments)
 LORE_NUM_BASE:20,                 // +0..11
 LORE_PREFIX_ZOOM_BASE:40,         // +0..11 (magnifier)
 LORE_PREFIX_TOGGLE_BASE:60,       // +0..11 (+/-)
 LORE_PREFIX_FIELD_BASE:80,        // +0..11 (prefix)
 LORE_FIELD_BASE:100,              // +0..11 (lore)

 LORE_NAME_LABEL:130,LORE_ITEM_NAME:131,LORE_ISSUE_FIELD:132,
 BTN_LORE_VANILLA:133,BTN_LORE_ISSUE:134,
 BTN_TOGGLE_PREFIX:135,BTN_TOGGLE_ROWS:136,BTN_CLEAR:137,BTN_RESTORE:138,BTN_APPLY_LORE:139,BTN_SAVE_PREFIX:140,BTN_LOAD_PREFIX:141,BTN_PREV:142,BTN_NEXT:143,PAGE_LABEL:144,

 // Lore subUI (300..379)
 LORE_ZOOM_BG:300,LORE_ZOOM_TOP:304,LORE_ZOOM_TITLE:308,LORE_ZOOM_INFO:309,
 LORE_ZOOM_LBL_P:310,LORE_ZOOM_TF_P:311,
 BTN_LORE_ZOOM_SAVE:312,BTN_LORE_ZOOM_CANCEL:313,

 LORE_PREFIX_LIST_BG:330,LORE_PREFIX_LIST_TOP:334,LORE_PREFIX_LIST_TITLE:338,
 LORE_PREFIX_LIST_BTN_BASE:340,LORE_PREFIX_LIST_PREV:350,LORE_PREFIX_LIST_NEXT:351,LORE_PREFIX_LIST_CLOSE:352,LORE_PREFIX_LIST_PAGE:353,

 LORE_EXPORT_BG:360,LORE_EXPORT_TOP:364,LORE_EXPORT_TITLE:368,LORE_EXPORT_LABEL:369,LORE_EXPORT_FIELD:370,BTN_LORE_EXPORT_DO:371,BTN_LORE_EXPORT_CANCEL:372,

 // Stats (200..299)
 STAT_MAIN_L:200,STAT_MAIN_R:201,STAT_SUB_L:202,STAT_SUB_R:203,STAT_MAIN_VAL:204,STAT_SUB_VAL:205,
 STAT_DAMAGE:210,STAT_SPEED:211,STAT_ARMOR:212,STAT_TOUGH:213,BTN_APPLY_STATS:214,
 STAT_BC_TITLE:219,BTN_BC_TOGGLE:220,BTN_BC_PREV:221,BTN_BC_NEXT:222,BC_LABEL:230,BC_SPEED_MINUS:236,BC_SPEED_PLUS:237,BC_SPEED_VALUE:238,

 // Register (300..349)
 REG_CAT_L:300,REG_CAT_R:301,REG_SUB_L:302,REG_SUB_R:303,REG_CAT_VAL:304,REG_SUB_VAL:305,REG_FILE_LABEL:306,REG_FILE:307,BTN_SAVE_ITEM:308,

 // Home labels
 HOME_LINE_BASE:340, // +0..15

 // Category (400..599)
 CAT_LIST_TITLE:400,CAT_LIST_BASE:401, // +0..rows-1
 CAT_CHECK_BASE:630, // +0..rows-1 (multi-check)
 BTN_CAT_NEW:420,BTN_CAT_SAVE:421,BTN_CAT_DELETE:422,BTN_CAT_PREV:423,BTN_CAT_NEXT:424,CAT_PAGE_LABEL:425,
 CAT_EXPORT_LABEL:426,CAT_EXPORT_NAME:427,BTN_CAT_IMPORT:428,
 CAT_MENU_BG:430,CAT_MENU_TOP:434,CAT_MENU_TITLE:438,BTN_CAT_MENU_EDIT:440,BTN_CAT_MENU_ITEMS:441,BTN_CAT_MENU_EXPORT:442,BTN_CAT_MENU_IMPORT:443,BTN_CAT_MENU_CANCEL:444,
 CAT_POPUP_BG:450,CAT_POPUP_TOP:454,CAT_EDIT_TITLE:458,
 CAT_NAME_LABEL:459,CAT_NAME:460,CAT_SUBS_LABEL:461,CAT_SUB_FIELD_BASE:470, // +0..subsPerPage-1
 BTN_CAT_SUB_ADD:480,BTN_CAT_SUB_PREV:481,BTN_CAT_SUB_NEXT:482,CAT_SUB_PAGE_LABEL:483,BTN_CAT_SUB_DEL_BASE:490, // +0..subsPerPage-1
 BTN_CAT_POPUP_SAVE:498,BTN_CAT_POPUP_CANCEL:499,
 CAT_ITEMS_BG:500,CAT_ITEMS_TOP:504,CAT_ITEMS_TITLE:508,
 BTN_CAT_ITEMS_PREV:510,BTN_CAT_ITEMS_NEXT:511,BTN_CAT_ITEMS_CLOSE:512,CAT_ITEM_BTN_BASE:520,CAT_ITEM_ICON_BASE:540,CAT_ITEM_LABEL_BASE:560,CAT_ITEMS_PAGE_LABEL:580,CAT_DIVIDER_LINE:590,
 CAT_ITEMS_SUB_BASE:650, // +0..11 (sub tabs in items view)
 // Category export-names subUI (800..859)
 CAT_EXPORT_BG:800,CAT_EXPORT_TOP:804,CAT_EXPORT_TITLE:808,
 CAT_EXPORT_ROW_LABEL_BASE:810,CAT_EXPORT_ROW_FIELD_BASE:820,
 BTN_CAT_EXPORT_PREV:830,BTN_CAT_EXPORT_NEXT:831,CAT_EXPORT_PAGE:832,BTN_CAT_EXPORT_DO:833,BTN_CAT_EXPORT_CANCEL:834,
 // Category preset list (view: preset) (600..629)
 CAT_PRESET_BG:600,CAT_PRESET_TOP:604,CAT_PRESET_TITLE:608,CAT_PRESET_BTN_BASE:610,CAT_PRESET_PREV:618,CAT_PRESET_NEXT:619,CAT_PRESET_CLOSE:620,CAT_PRESET_PAGE:621,

 // Settings (700..799)
 SET_ROOT_LABEL:700,SET_ROOT:701,SET_PREFIX_LABEL:702,SET_PREFIX:703,SET_CATEGORY_LABEL:704,SET_CATEGORY:705,
 BTN_SAVE_SETTINGS:706,
};

function Lx(x){ return CFG.leftPanel.x + x; }
function Ly(y){ return CFG.leftPanel.y + y; }
function Rx(x){ return CFG.rightPanel.x + x; }
function Ry(y){ return CFG.rightPanel.y + y; }

function getRootDir(p){ return String(p.getTempdata().get(key.path.root) || DEFAULT_ROOT_DIR); }
function getPrefixDir(p){ return String(p.getTempdata().get(key.path.prefix) || DEFAULT_PREFIX_DIR); }
function getCategoryFile(p){ return String(p.getTempdata().get(key.path.category) || DEFAULT_CATEGORY_FILE); }

function ensureDefaultPaths(p){
 if(p.getTempdata().get(key.path.root) == null) p.getTempdata().put(key.path.root, DEFAULT_ROOT_DIR);
 if(p.getTempdata().get(key.path.prefix) == null) p.getTempdata().put(key.path.prefix, DEFAULT_PREFIX_DIR);
 if(p.getTempdata().get(key.path.category) == null) p.getTempdata().put(key.path.category, DEFAULT_CATEGORY_FILE);
}

function interact(e){
 initSession(e.player);
 openGui(e.player);
}

function initSession(p){
 if(p.getTempdata().get(key.mode) == null) p.getTempdata().put(key.mode, MODE_HOME);
 if(p.getTempdata().get(key.page) == null) p.getTempdata().put(key.page, "0");
 if(p.getTempdata().get(key.prefix.visible) == null) p.getTempdata().put(key.prefix.visible, "1");
 if(p.getTempdata().get(key.prefix.open) == null) p.getTempdata().put(key.prefix.open, JSON.stringify([]));
 if(p.getTempdata().get(key.rows) == null) p.getTempdata().put(key.rows, "[]");
 if(p.getTempdata().get(key.lore.name) == null) p.getTempdata().put(key.lore.name, "");
 if(p.getTempdata().get(key.lore.vanilla) == null) p.getTempdata().put(key.lore.vanilla, "1");
 if(p.getTempdata().get(key.lore.zoom) == null) p.getTempdata().put(key.lore.zoom, "-1");
 if(p.getTempdata().get(key.lore.prefixPopup) == null) p.getTempdata().put(key.lore.prefixPopup, "0");
 if(p.getTempdata().get(key.lore.prefixPage) == null) p.getTempdata().put(key.lore.prefixPage, "0");
 if(p.getTempdata().get(key.lore.exportPopup) == null) p.getTempdata().put(key.lore.exportPopup, "0");
 if(p.getTempdata().get(key.lore.exportName) == null) p.getTempdata().put(key.lore.exportName, "prefix_set");
 // Split concept removed (2-split only)

 if(p.getTempdata().get(key.reg.cat) == null) p.getTempdata().put(key.reg.cat, "0");
 if(p.getTempdata().get(key.reg.sub) == null) p.getTempdata().put(key.reg.sub, "0");
 if(p.getTempdata().get(key.reg.file) == null) p.getTempdata().put(key.reg.file, "item_01");

 if(p.getTempdata().get(key.stat.main) == null) p.getTempdata().put(key.stat.main, "0");
 if(p.getTempdata().get(key.stat.sub) == null) p.getTempdata().put(key.stat.sub, "0");
 if(p.getTempdata().get(key.stat.bc) == null) p.getTempdata().put(key.stat.bc, "0");
 if(p.getTempdata().get(key.stat.bcPreset) == null) p.getTempdata().put(key.stat.bcPreset, "0");
 if(p.getTempdata().get(key.stat.bcPage) == null) p.getTempdata().put(key.stat.bcPage, "0");
 if(p.getTempdata().get(key.stat.damage) == null) p.getTempdata().put(key.stat.damage, "6");
 if(p.getTempdata().get(key.stat.speed) == null) p.getTempdata().put(key.stat.speed, "-1.2");
 if(p.getTempdata().get(key.stat.armor) == null) p.getTempdata().put(key.stat.armor, "0");
 if(p.getTempdata().get(key.stat.tough) == null) p.getTempdata().put(key.stat.tough, "0");

 if(p.getTempdata().get(key.cat.page) == null) p.getTempdata().put(key.cat.page, "0");
 if(p.getTempdata().get(key.cat.name) == null) p.getTempdata().put(key.cat.name, "");
 if(p.getTempdata().get(key.cat.subs) == null) p.getTempdata().put(key.cat.subs, "");
 if(p.getTempdata().get(key.cat.selected) == null) p.getTempdata().put(key.cat.selected, "");
 if(p.getTempdata().get(key.cat.edit) == null) p.getTempdata().put(key.cat.edit, "0");
 if(p.getTempdata().get(key.cat.popup) == null) p.getTempdata().put(key.cat.popup, "0");
 if(p.getTempdata().get(key.cat.view) == null) p.getTempdata().put(key.cat.view, "");
 if(p.getTempdata().get(key.cat.items) == null) p.getTempdata().put(key.cat.items, "[]");
 if(p.getTempdata().get(key.cat.itemPage) == null) p.getTempdata().put(key.cat.itemPage, "0");
 if(p.getTempdata().get(key.cat.subPage) == null) p.getTempdata().put(key.cat.subPage, "0");
 if(p.getTempdata().get(key.cat.presetPage) == null) p.getTempdata().put(key.cat.presetPage, "0");
 if(p.getTempdata().get(key.cat.checked) == null) p.getTempdata().put(key.cat.checked, "[]");
 if(p.getTempdata().get(key.cat.exportName) == null) p.getTempdata().put(key.cat.exportName, "checked");
 if(p.getTempdata().get(key.cat.itemsSub) == null) p.getTempdata().put(key.cat.itemsSub, "");
 if(p.getTempdata().get(key.cat.exportNames) == null) p.getTempdata().put(key.cat.exportNames, "{}");
 if(p.getTempdata().get(key.cat.exportPage) == null) p.getTempdata().put(key.cat.exportPage, "0");

 ensureDefaultPaths(p);
 ensureDir(getRootDir(p));
 ensureDir(getPrefixDir(p));
 ensureCategoryConfig(p);
}

function openGui(p){
 var g = API.createCustomGui(GUI_ID, CFG.gui.w, CFG.gui.h, false, p);

 addPanel(g, CFG.leftPanel.x, CFG.leftPanel.y, CFG.leftPanel.w, CFG.leftPanel.h, ID.LEFT_TOP);
 addPanel(g, CFG.rightPanel.x, CFG.rightPanel.y, CFG.rightPanel.w, CFG.rightPanel.h, ID.RIGHT_TOP);

 g.addItemSlot(Lx(CFG.slot.x), Ly(CFG.slot.y));
 restoreSlotItem(g, p);

 addModeButtons(g, p);

 addUtilitySeparators(g);

 var mode = getMode(p);
 if(mode == MODE_HOME) addHomePanel(g);
 if(mode == MODE_LORE) addLorePanel(g, p);
 if(mode == MODE_STATS) addStatsPanel(g, p);
 if(mode == MODE_REGISTER) addRegisterPanel(g, p);
 if(mode == MODE_CATEGORY) addCategoryPanel(g, p);
 if(mode == MODE_SETTINGS) addSettingsPanel(g, p);

 g.showPlayerInventory(Rx(CFG.inv.x), Ry(CFG.inv.y), CFG.inv.full);
 p.showCustomGui(g);
}

function addUtilitySeparators(g){
 g.addColoredLine(ID.UTIL_RIGHT_DIV, Rx(0), Ry(120), Rx(CFG.rightPanel.w), Ry(120), CFG.lineColor, 1);
}
function addModeButtons(g, p){
 var m = getMode(p);
 g.addButton(ID.MODE_HOME, m == MODE_HOME ? "■ Home" : "□ Home", Rx(CFG.modeBtn.x), Ry(CFG.modeBtn.y0 + CFG.modeBtn.gap * 0), CFG.modeBtn.w, CFG.modeBtn.h);
 g.addButton(ID.MODE_LORE, m == MODE_LORE ? "■ Lore" : "□ Lore", Rx(CFG.modeBtn.x), Ry(CFG.modeBtn.y0 + CFG.modeBtn.gap * 1), CFG.modeBtn.w, CFG.modeBtn.h);
 g.addButton(ID.MODE_STATS, m == MODE_STATS ? "■ Stats" : "□ Stats", Rx(CFG.modeBtn.x), Ry(CFG.modeBtn.y0 + CFG.modeBtn.gap * 2), CFG.modeBtn.w, CFG.modeBtn.h);
 g.addButton(ID.MODE_REGISTER, m == MODE_REGISTER ? "■ Register" : "□ Register", Rx(CFG.modeBtn.x), Ry(CFG.modeBtn.y0 + CFG.modeBtn.gap * 3), CFG.modeBtn.w, CFG.modeBtn.h);
 g.addButton(ID.MODE_CATEGORY, m == MODE_CATEGORY ? "■ Category" : "□ Category", Rx(CFG.modeBtn.x), Ry(CFG.modeBtn.y0 + CFG.modeBtn.gap * 4), CFG.modeBtn.w, CFG.modeBtn.h);
 g.addButton(ID.MODE_SETTINGS, m == MODE_SETTINGS ? "■ Settings" : "□ Settings", Rx(CFG.modeBtn.x), Ry(CFG.modeBtn.y0 + CFG.modeBtn.gap * 5), CFG.modeBtn.w, CFG.modeBtn.h);
}

function addHomePanel(g){
 var lines = [
  "§fItem GUI",
  "§7Put an item in the slot to edit it.",
  "§fLore §7: edit prefix/lore → Apply Lore",
  "§fStats §7: weapon/armor attributes + Better Combat",
  "§fRegister §7: save item as JSON",
  "§fCategory §7: edit categories / browse & import saved items",
  "§fSettings §7: change save paths"
 ];
 var x = Lx(24);
 var y0 = Ly(24);
 var w = CFG.leftPanel.w - 48;
 var h = 18;
 var step = 22;
 for(var i = 0; i < lines.length; i++){
  addCenteredLabel(g, ID.HOME_LINE_BASE + i, lines[i], x, y0 + i * step, w, h);
 }
}

function addLorePanel(g, p){
 var showPrefix = isPrefixVisible(p);
 var rows = getRows(p);
 var page = getPage(p);
 var start = page * CFG.perPage;
 var openArr = getPrefixOpen(p);

 // When a sub-UI is open, render only the sub-UI (prevents cursor focus on hidden fields behind).
 var zoomAbs = getInt(p, key.lore.zoom);
 var prefixPopupOpen = getBool(p, key.lore.prefixPopup);
 var exportPopupOpen = getBool(p, key.lore.exportPopup);
 if(zoomAbs >= 0 || prefixPopupOpen || exportPopupOpen){
  // Prefer showing exactly one popup at a time (extra safety against overlap)
  if(exportPopupOpen){ prefixPopupOpen = false; zoomAbs = -1; }
  else if(prefixPopupOpen){ zoomAbs = -1; }
 if(zoomAbs >= 0){
  var zRows = getRows(p);
  ensureRowIndex(zRows, zoomAbs);
  var zr = normalizeRow(zRows[zoomAbs]);
  var zw = 440;
  var zh = 150;
  var zbx = 70;
  var zby = 70;
  var innerX = zbx + 20;
  var innerW = zw - 40;

  addSubUiBackground(g, ID.LORE_ZOOM_BG, Lx(zbx), Ly(zby), zw, zh);
  addPanel(g, Lx(zbx), Ly(zby), zw, zh, ID.LORE_ZOOM_TOP);
  addCenteredLabel(g, ID.LORE_ZOOM_TITLE, "§fPrefix (zoom)", Lx(zbx), Ly(zby + 6), zw, 18);
  g.addLabel(ID.LORE_ZOOM_INFO, "§7Line: §e" + String(zoomAbs + 1), Lx(zbx + 16), Ly(zby + 26), 180, 12);

  var y0 = zby + 44;
  g.addLabel(ID.LORE_ZOOM_LBL_P, "§7Prefix", Lx(innerX), Ly(y0), 120, 14);
  var tfP = g.addTextField(ID.LORE_ZOOM_TF_P, Lx(innerX), Ly(y0 + 14), innerW, 18);
  tfP.setText(uiIssue(zr.prefix || ""));

  var btnY = zby + zh - 28;
  g.addButton(ID.BTN_LORE_ZOOM_SAVE, "Save", Lx(zbx + zw - 180), Ly(btnY), 80, 20);
  g.addButton(ID.BTN_LORE_ZOOM_CANCEL, "Cancel", Lx(zbx + zw - 92), Ly(btnY), 80, 20);
  }

  if(prefixPopupOpen){
   var files = listPrefixFiles(p);
   var pp = getInt(p, key.lore.prefixPage);
   if(pp < 0) pp = 0;
   var per = 8;
   var maxP = files.length == 0 ? 0 : Math.floor((files.length - 1) / per);
   if(pp > maxP) { pp = maxP; setInt(p, key.lore.prefixPage, pp); }
   var startP = pp * per;

   addSubUiBackground(g, ID.LORE_PREFIX_LIST_BG, Lx(90), Ly(70), 400, 220);
   addPanel(g, Lx(90), Ly(70), 400, 220, ID.LORE_PREFIX_LIST_TOP);
   addCenteredLabel(g, ID.LORE_PREFIX_LIST_TITLE, "§fLoad Prefix Set", Lx(90), Ly(76), 400, 18);

   for(var i2 = 0; i2 < per; i2++){
    var idx2 = startP + i2;
    if(idx2 >= files.length) break;
    var fn = String(files[idx2].getName());
    g.addButton(ID.LORE_PREFIX_LIST_BTN_BASE + i2, fn, Lx(110), Ly(100 + i2 * 20), 360, 18);
   }

   g.addButton(ID.LORE_PREFIX_LIST_PREV, "◀", Lx(110), Ly(268), 30, 20);
   g.addButton(ID.LORE_PREFIX_LIST_NEXT, "▶", Lx(144), Ly(268), 30, 20);
   addCenteredLabel(g, ID.LORE_PREFIX_LIST_PAGE, "§f" + String(pp + 1) + "/" + String(maxP + 1), Lx(180), Ly(270), 140, 18);
   g.addButton(ID.LORE_PREFIX_LIST_CLOSE, "Close", Lx(420), Ly(268), 50, 20);
  }

  if(exportPopupOpen){
   addSubUiBackground(g, ID.LORE_EXPORT_BG, Lx(110), Ly(90), 380, 130);
   addPanel(g, Lx(110), Ly(90), 380, 130, ID.LORE_EXPORT_TOP);
   addCenteredLabel(g, ID.LORE_EXPORT_TITLE, "§fExport Prefix Set", Lx(110), Ly(96), 380, 18);
   g.addLabel(ID.LORE_EXPORT_LABEL, "§7File name", Lx(128), Ly(118), 120, 18);
   var ef = g.addTextField(ID.LORE_EXPORT_FIELD, Lx(208), Ly(116), 262, 18);
   ef.setText(String(getStr(p, key.lore.exportName) || "prefix_set"));
   g.addButton(ID.BTN_LORE_EXPORT_DO, "Export", Lx(300), Ly(154), 80, 20);
   g.addButton(ID.BTN_LORE_EXPORT_CANCEL, "Cancel", Lx(390), Ly(154), 80, 20);
  }

  return;
 }

 // Align issue field end with the main lore field end.
 var loreEndX = CFG.lore.loreXVisible + CFG.lore.loreW;
 var issueFieldX = loreEndX - CFG.lore.issueFieldW;
 var issueBtnX = issueFieldX - 4 - CFG.lore.btnIssueW;
 var vanillaBtnX = issueBtnX - 8 - CFG.lore.btnVanillaW;

 addCenteredLabel(g, ID.LORE_NAME_LABEL, "Name", Lx(CFG.lore.nameLabelX), Ly(CFG.lore.nameY + 2), CFG.lore.nameLabelW, 18);
 var nameFieldX = CFG.lore.nameLabelX + CFG.lore.nameLabelW + 20;
 var maxNameW = vanillaBtnX - 8 - nameFieldX;
 if(maxNameW < 80) maxNameW = 80;
 var nf = g.addTextField(ID.LORE_ITEM_NAME, Lx(nameFieldX), Ly(CFG.lore.nameY), Math.min(CFG.lore.nameFieldW, maxNameW), CFG.lore.nameFieldH);
 nf.setText(uiIssue(String(getStr(p, key.lore.name) || "")));
 var vanillaOn = String(p.getTempdata().get(key.lore.vanilla) || "1") == "1";
 g.addButton(ID.BTN_LORE_VANILLA, vanillaOn ? "Vanilla" : "Hide", Lx(vanillaBtnX), Ly(CFG.lore.nameY), CFG.lore.btnVanillaW, CFG.lore.nameFieldH);
 g.addButton(ID.BTN_LORE_ISSUE, "∮", Lx(issueBtnX), Ly(CFG.lore.nameY), CFG.lore.btnIssueW, CFG.lore.nameFieldH);
 var issueField = g.addTextField(ID.LORE_ISSUE_FIELD, Lx(issueFieldX), Ly(CFG.lore.nameY), CFG.lore.issueFieldW, CFG.lore.nameFieldH);
 issueField.setText("∮");
 try{
  var vb = g.getComponent(ID.BTN_LORE_VANILLA);
  if(vb && vb.setHoverText) vb.setHoverText("Show or hide vanilla tooltip flags (enchantments/attributes).");
 }catch(err){}

 for(var i = 0; i < CFG.perPage; i++){
  var idx = start + i;
  var row = normalizeRow(rows[idx]);
  var y = CFG.lore.rowStartY + (i * CFG.lore.rowStep);

  addCenteredLabel(g, ID.LORE_NUM_BASE + i, "§f" + String(idx + 1), Lx(CFG.lore.numX), Ly(y + 2), CFG.lore.numW, 12);

  if(showPrefix){
   var opened = openArr[idx] === true;
   g.addButton(ID.LORE_PREFIX_ZOOM_BASE + i, "🔍", Lx(CFG.lore.prefixBtnX - CFG.lore.zoomBtnGap - CFG.lore.zoomBtnW), Ly(y), CFG.lore.zoomBtnW, CFG.lore.fieldH);
   g.addButton(ID.LORE_PREFIX_TOGGLE_BASE + i, opened ? "-" : "+", Lx(CFG.lore.prefixBtnX), Ly(y), CFG.lore.prefixBtnW, CFG.lore.fieldH);
   if(opened){
    var pf = g.addTextField(ID.LORE_PREFIX_FIELD_BASE + i, Lx(CFG.lore.prefixFieldX), Ly(y), CFG.lore.prefixFieldW, CFG.lore.fieldH);
    pf.setText(uiIssue(row.prefix || ""));
   }
   // Lore field is always visible (opening prefix should not hide the lore input)
   var lf0 = g.addTextField(ID.LORE_FIELD_BASE + i, Lx(CFG.lore.loreXVisible), Ly(y), CFG.lore.loreW, CFG.lore.fieldH);
   lf0.setText(uiIssue(row.lore));
  }else{
   var lf2 = g.addTextField(ID.LORE_FIELD_BASE + i, Lx(CFG.lore.loreXHidden), Ly(y), CFG.lore.loreW, CFG.lore.fieldH);
   lf2.setText(uiIssue(row.lore));
  }
 }

 g.addButton(ID.BTN_TOGGLE_PREFIX, isPrefixVisible(p) ? "Prefix On" : "Prefix Off", Rx(CFG.lore.btnTogglePrefix.x), Ry(CFG.lore.btnTogglePrefix.y), CFG.lore.btnTogglePrefix.w, CFG.lore.btnTogglePrefix.h);
 g.addButton(ID.BTN_TOGGLE_ROWS, areAllVisibleRowsOpen(p) ? "Close All Prefix" : "Open All Prefix", Rx(CFG.lore.btnToggleRows.x), Ry(CFG.lore.btnToggleRows.y), CFG.lore.btnToggleRows.w, CFG.lore.btnToggleRows.h);
 g.addButton(ID.BTN_CLEAR, "Clear", Rx(CFG.lore.btnClear.x), Ry(CFG.lore.btnClear.y), CFG.lore.btnClear.w, CFG.lore.btnClear.h);
 g.addButton(ID.BTN_RESTORE, "Restore", Rx(CFG.lore.btnRestore.x), Ry(CFG.lore.btnRestore.y), CFG.lore.btnRestore.w, CFG.lore.btnRestore.h);
 g.addButton(ID.BTN_APPLY_LORE, "Apply", Rx(CFG.lore.btnApply.x), Ry(CFG.lore.btnApply.y), CFG.lore.btnApply.w, CFG.lore.btnApply.h);
 g.addButton(ID.BTN_SAVE_PREFIX, "Export Prefix", Rx(CFG.lore.btnSavePrefix.x), Ry(CFG.lore.btnSavePrefix.y), CFG.lore.btnSavePrefix.w, CFG.lore.btnSavePrefix.h);
 g.addButton(ID.BTN_LOAD_PREFIX, "Load Prefix", Rx(CFG.lore.btnLoadPrefix.x), Ry(CFG.lore.btnLoadPrefix.y), CFG.lore.btnLoadPrefix.w, CFG.lore.btnLoadPrefix.h);
 g.addButton(ID.BTN_PREV, "◀", Rx(CFG.lore.btnPrev.x), Ry(CFG.lore.btnPrev.y), CFG.lore.btnPrev.w, CFG.lore.btnPrev.h);
 g.addButton(ID.BTN_NEXT, "▶", Rx(CFG.lore.btnNext.x), Ry(CFG.lore.btnNext.y), CFG.lore.btnNext.w, CFG.lore.btnNext.h);
 addCenteredLabel(g, ID.PAGE_LABEL, "§fPage " + String(page + 1), Rx(CFG.lore.pageLabel.x), Ry(CFG.lore.pageLabel.y), CFG.lore.pageLabel.w, CFG.lore.pageLabel.h);
}

function addStatsPanel(g, p){
 var mainType = "weapon";
 var subType = "default";
 var bcEnabled = getBool(p, key.stat.bc);

 try{
  mainType = getStatMainType(p);
 }catch(err){
  mainType = "weapon";
 }

 try{
  subType = getStatSubType(p);
 }catch(err2){
  subType = "default";
 }

 addCycleRowAt(g, 60, ID.STAT_MAIN_VAL, "Main Type", mainType, ID.STAT_MAIN_L, ID.STAT_MAIN_R, CFG.stats.rowY + CFG.stats.rowGap * 0, CFG.stats.labelX, CFG.stats.valueX);
 addCycleRowAt(g, 61, ID.STAT_SUB_VAL, "Sub Type", subType, ID.STAT_SUB_L, ID.STAT_SUB_R, CFG.stats.rowY + CFG.stats.rowGap * 1, CFG.stats.labelX, CFG.stats.valueX);

 if(mainType == "weapon"){
  addFieldAt(g, 62, "Damage", ID.STAT_DAMAGE, CFG.stats.rowY + CFG.stats.rowGap * 2, getStr(p, key.stat.damage));
  if(!bcEnabled){
   addFieldAt(g, 63, "Speed", ID.STAT_SPEED, CFG.stats.rowY + CFG.stats.rowGap * 3, getStr(p, key.stat.speed));
  }else{
   var sy = CFG.stats.rowY + CFG.stats.rowGap * 3;
   addInfoLabel(g, 63, "Speed", Lx(CFG.stats.labelX), Ly(sy), 20);
   g.addButton(ID.BC_SPEED_MINUS, "-", Lx(CFG.stats.fieldX), Ly(sy), 24, 20);
   addCenteredLabel(g, ID.BC_SPEED_VALUE, getBcSpeedLabel(getStr(p, key.stat.speed)), Lx(CFG.stats.fieldX + 24), Ly(sy + 2), CFG.stats.fieldW - 48, 18);
   g.addButton(ID.BC_SPEED_PLUS, "+", Lx(CFG.stats.fieldX + CFG.stats.fieldW - 24), Ly(sy), 24, 20);
  }
 }else{
  addFieldAt(g, 64, "Armor", ID.STAT_ARMOR, CFG.stats.rowY + CFG.stats.rowGap * 2, getStr(p, key.stat.armor));
  addFieldAt(g, 65, "Toughness", ID.STAT_TOUGH, CFG.stats.rowY + CFG.stats.rowGap * 3, getStr(p, key.stat.tough));
 }

 addCenteredLabel(g, ID.STAT_BC_TITLE, "Better Combat", Lx(CFG.stats.bcPanelX), Ly(CFG.stats.bcPanelY), 150, 16);
 g.addButton(ID.BTN_BC_TOGGLE, bcEnabled ? "BC On" : "BC Off", Lx(CFG.stats.bcPanelX), Ly(CFG.stats.bcPanelY + 20), 100, 20);

 if(bcEnabled){
  var perPage = CFG.stats.bcRows;
  var presetPage = getInt(p, key.stat.bcPage);
  var presetIndex = getInt(p, key.stat.bcPreset);
  var start = presetPage * perPage;

  for(var i = 0; i < perPage; i++){
   var idx = start + i;
   if(idx >= BC_PRESETS.length) break;
   var label = BC_PRESETS[idx][0];
   if(idx == presetIndex) label = "§e" + label;
   g.addButton(ID.BC_LABEL + i, label, Lx(CFG.stats.bcPanelX), Ly(CFG.stats.bcPanelY + 46 + (i * CFG.stats.bcRowStep)), 150, 16);
  }

  g.addButton(ID.BTN_BC_PREV, "◀", Lx(CFG.stats.bcPanelX), Ly(CFG.stats.bcPanelY + 160), 30, 20);
  g.addButton(ID.BTN_BC_NEXT, "▶", Lx(CFG.stats.bcPanelX + 34), Ly(CFG.stats.bcPanelY + 160), 30, 20);
 }

 g.addButton(ID.BTN_APPLY_STATS, "Apply Stats", Rx(CFG.stats.apply.x), Ry(CFG.stats.apply.y), CFG.stats.apply.w, CFG.stats.apply.h);
}
function addRegisterPanel(g, p){
 var cat = getRegisterCategory(p);
 var sub = getRegisterSub(p);

 addCycleRowAt(g, 70, ID.REG_CAT_VAL, "Category", cat, ID.REG_CAT_L, ID.REG_CAT_R, CFG.reg.rowY + CFG.reg.rowGap * 0, CFG.reg.labelX, CFG.reg.valueX);
 addCycleRowAt(g, 71, ID.REG_SUB_VAL, "Sub", sub, ID.REG_SUB_L, ID.REG_SUB_R, CFG.reg.rowY + CFG.reg.rowGap * 1, CFG.reg.labelX, CFG.reg.valueX);
 addFieldAtCustom(g, ID.REG_FILE_LABEL, "File", ID.REG_FILE, CFG.reg.rowY + CFG.reg.rowGap * 2, getStr(p, key.reg.file), CFG.reg.labelX, CFG.reg.valueX, CFG.reg.fileW, 18);
 g.addButton(ID.BTN_SAVE_ITEM, "Save Item JSON", Rx(CFG.reg.save.x), Ry(CFG.reg.save.y), CFG.reg.save.w, CFG.reg.save.h);
}

function addCategoryPanel(g, p){
 var data = readCategoryConfig(p);
 var names = getCategoryNames(data);
 var page = getInt(p, key.cat.page);
 var start = page * CFG.cat.rows;
 var selected = getStr(p, key.cat.selected);
 var view = getStr(p, key.cat.view);
 var checked = readCheckedCategories(p);
 var menuOpen = view == "menu";
 var editOpen = view == "edit";
 var itemsOpen = view == "items";

 addInfoLabel(g, ID.CAT_LIST_TITLE, "Category List", Lx(CFG.cat.listX + Math.floor(CFG.cat.listW / 2)), Ly(22), 18);

 for(var i = 0; i < CFG.cat.rows; i++){
  var idx = start + i;
  if(idx >= names.length) break;
  var name = names[idx];
  var on = checked.indexOf(name) != -1;
  g.addButton(ID.CAT_CHECK_BASE + i, on ? "■" : "□", Lx(CFG.cat.listX - 18), Ly(CFG.cat.listY + i * CFG.cat.rowH), 16, 16);
  var label = name == selected ? "§e" + name : name;
  g.addButton(ID.CAT_LIST_BASE + i, label, Lx(CFG.cat.listX), Ly(CFG.cat.listY + i * CFG.cat.rowH), CFG.cat.listW, 16);
 }

 g.addButton(ID.BTN_CAT_NEW, "New", Rx(CFG.cat.btnNew.x), Ry(CFG.cat.btnNew.y), CFG.cat.btnNew.w, CFG.cat.btnNew.h);
 g.addButton(ID.BTN_CAT_SAVE, "Export", Rx(CFG.cat.btnSave.x), Ry(CFG.cat.btnSave.y), CFG.cat.btnSave.w, CFG.cat.btnSave.h);
 g.addButton(ID.BTN_CAT_DELETE, "Delete", Rx(CFG.cat.btnDelete.x), Ry(CFG.cat.btnDelete.y), CFG.cat.btnDelete.w, CFG.cat.btnDelete.h);
 g.addButton(ID.BTN_CAT_IMPORT, "Import", Rx(CFG.cat.btnImport.x), Ry(CFG.cat.btnImport.y), CFG.cat.btnImport.w, CFG.cat.btnImport.h);
 g.addButton(ID.BTN_CAT_PREV, "◀", Rx(CFG.cat.btnPrev.x), Ry(CFG.cat.btnPrev.y), CFG.cat.btnPrev.w, CFG.cat.btnPrev.h);
 g.addButton(ID.BTN_CAT_NEXT, "▶", Rx(CFG.cat.btnNext.x), Ry(CFG.cat.btnNext.y), CFG.cat.btnNext.w, CFG.cat.btnNext.h);
 addCenteredLabel(g, ID.CAT_PAGE_LABEL, "Page " + String(page + 1), Rx(CFG.cat.pageLabel.x), Ry(CFG.cat.pageLabel.y), CFG.cat.pageLabel.w, 20);

 if(menuOpen){
  addSubUiBackground(g, ID.CAT_MENU_BG, Lx(CFG.cat.menu.x), Ly(CFG.cat.menu.y), CFG.cat.menu.w, CFG.cat.menu.h);
  addPanel(g, Lx(CFG.cat.menu.x), Ly(CFG.cat.menu.y), CFG.cat.menu.w, CFG.cat.menu.h, ID.CAT_MENU_TOP);
  addCenteredLabel(g, ID.CAT_MENU_TITLE, "§fCategory: §e" + (selected || "-"), Lx(CFG.cat.menu.x), Ly(CFG.cat.menu.y + 8), CFG.cat.menu.w, 18);
  g.addButton(ID.BTN_CAT_MENU_EDIT, "Edit", Lx(CFG.cat.menu.x + 24), Ly(CFG.cat.menu.y + 34), 80, 20);
  g.addButton(ID.BTN_CAT_MENU_ITEMS, "Show Items", Lx(CFG.cat.menu.x + 112), Ly(CFG.cat.menu.y + 34), 96, 20);
  g.addButton(ID.BTN_CAT_MENU_CANCEL, "Close", Lx(CFG.cat.menu.x + 216), Ly(CFG.cat.menu.y + 34), 60, 20);
  // Export/Import live in the right panel (checked categories)
 }

 if(editOpen){
  addSubUiBackground(g, ID.CAT_POPUP_BG, Lx(CFG.cat.edit.x), Ly(CFG.cat.edit.y), CFG.cat.edit.w, CFG.cat.edit.h);
  addPanel(g, Lx(CFG.cat.edit.x), Ly(CFG.cat.edit.y), CFG.cat.edit.w, CFG.cat.edit.h, ID.CAT_POPUP_TOP);
  addCenteredLabel(g, ID.CAT_EDIT_TITLE, "§fEdit Category", Lx(CFG.cat.edit.x), Ly(CFG.cat.edit.y + 6), CFG.cat.edit.w, 18);
  addFieldAtCustom(g, ID.CAT_NAME_LABEL, "Name", ID.CAT_NAME, CFG.cat.nameY, getStr(p, key.cat.name), CFG.cat.nameLX, CFG.cat.nameFX, CFG.cat.nameW, 18);

  addInfoLabel(g, ID.CAT_SUBS_LABEL, "Subs", Lx(CFG.cat.nameLX), Ly(CFG.cat.subs.y - 18), 18);
  var subsArr = parseSubsCsv(getStr(p, key.cat.subs));
  var subPage = getInt(p, key.cat.subPage);
  if(subPage < 0) subPage = 0;
  var subPerPage = CFG.cat.subs.perPage;
  var subStart = subPage * subPerPage;
  var maxSubPage = subsArr.length == 0 ? 0 : Math.floor((subsArr.length - 1) / subPerPage);
  if(subPage > maxSubPage) { subPage = maxSubPage; setInt(p, key.cat.subPage, subPage); subStart = subPage * subPerPage; }

  for(var si = 0; si < subPerPage; si++){
   var abs = subStart + si;
   var fx = CFG.cat.subs.x;
   var fy = CFG.cat.subs.y + si * CFG.cat.subs.rowStep;
   var sf = g.addTextField(ID.CAT_SUB_FIELD_BASE + si, Lx(fx), Ly(fy), CFG.cat.subs.fieldW, CFG.cat.subs.fieldH);
   sf.setText(String(subsArr[abs] || ""));
   if(abs < subsArr.length){
    g.addButton(ID.BTN_CAT_SUB_DEL_BASE + si, "x", Lx(fx + CFG.cat.subs.fieldW + 6), Ly(fy), 18, CFG.cat.subs.fieldH);
   }
  }
 
  var subBtnY = CFG.cat.edit.y + CFG.cat.edit.h - 36;
  var saveBtnY = CFG.cat.edit.y + CFG.cat.edit.h - 64;

  g.addButton(ID.BTN_CAT_SUB_ADD, "+", Lx(CFG.cat.subs.x), Ly(subBtnY), 22, 20);
  g.addButton(ID.BTN_CAT_SUB_PREV, "◀", Lx(CFG.cat.subs.x + 28), Ly(subBtnY), 30, 20);
  g.addButton(ID.BTN_CAT_SUB_NEXT, "▶", Lx(CFG.cat.subs.x + 62), Ly(subBtnY), 30, 20);
  addCenteredLabel(g, ID.CAT_SUB_PAGE_LABEL, "§f" + String(subPage + 1) + "/" + String(maxSubPage + 1), Lx(CFG.cat.subs.x + 96), Ly(subBtnY + 2), 110, 18);
 
  g.addButton(ID.BTN_CAT_POPUP_SAVE, "Save", Lx(CFG.cat.edit.x + 112), Ly(saveBtnY), 80, 20);
  g.addButton(ID.BTN_CAT_POPUP_CANCEL, "Cancel", Lx(CFG.cat.edit.x + 200), Ly(saveBtnY), 80, 20);
 }

 if(itemsOpen){
  var cfgData = readCategoryConfig(p);
  var subsList = cfgData[selected] instanceof Array ? cfgData[selected] : ["default"];
  if(subsList.length == 0) subsList = ["default"];
  var currentSub = sanitizeFileName(getStr(p, key.cat.itemsSub));
  if(currentSub == "" || subsList.indexOf(currentSub) == -1){
   currentSub = sanitizeFileName(String(subsList[0] || "default"));
   if(currentSub == "") currentSub = "default";
   setStr(p, key.cat.itemsSub, currentSub);
  }

  var items = listItemEntriesForCategorySub(p, selected, currentSub);
  p.getTempdata().put(key.cat.items, JSON.stringify(items));
  var itemPage = getInt(p, key.cat.itemPage);
  var perPage = CFG.cat.items.cols * CFG.cat.items.rows;
  var itemStart = itemPage * perPage;

  addSubUiBackground(g, ID.CAT_ITEMS_BG, Lx(CFG.cat.items.x), Ly(CFG.cat.items.y), CFG.cat.items.w, CFG.cat.items.h);
  addPanel(g, Lx(CFG.cat.items.x), Ly(CFG.cat.items.y), CFG.cat.items.w, CFG.cat.items.h, ID.CAT_ITEMS_TOP);
  g.addColoredLine(ID.CAT_DIVIDER_LINE, Lx(CFG.cat.items.x - 12), Ly(CFG.cat.listY - 12), Lx(CFG.cat.items.x - 12), Ly(CFG.leftPanel.h - 12), CFG.lineColor, 1);
  addCenteredLabel(g, ID.CAT_ITEMS_TITLE, "§fItems: §e" + (selected || "-") + " §7/ §e" + currentSub, Lx(CFG.cat.items.x), Ly(CFG.cat.items.y + 6), CFG.cat.items.w, 18);

  var subW = 70;
  for(var sb = 0; sb < 12; sb++){
   if(sb >= subsList.length) break;
   var subName = sanitizeFileName(String(subsList[sb] || ""));
   if(subName == "") continue;
   var lbl = subName == currentSub ? "§e" + subName : subName;
   g.addButton(ID.CAT_ITEMS_SUB_BASE + sb, lbl, Lx(CFG.cat.items.x + 8), Ly(CFG.cat.items.y + 30 + sb * 18), subW - 12, 16);
  }

  var slotsBefore = g.getSlots().length;
  var added = 0;
  for(var ii = 0; ii < perPage; ii++){
   var idx2 = itemStart + ii;
   if(idx2 >= items.length) break;
   var col2 = ii % CFG.cat.items.cols;
   var row2 = Math.floor(ii / CFG.cat.items.cols);
   var sx = CFG.cat.items.x + subW + 12 + col2 * CFG.cat.items.gapX;
   var sy = CFG.cat.items.y + 32 + row2 * CFG.cat.items.gapY;
   g.addItemSlot(Lx(sx), Ly(sy));
   g.addTexturedRect(ID.CAT_ITEM_ICON_BASE + ii, CFG.cat.overlayBtn.texture, Lx(sx), Ly(sy), CFG.cat.overlayBtn.w, CFG.cat.overlayBtn.h, CFG.cat.overlayBtn.texX, CFG.cat.overlayBtn.texY);
   g.addButton(ID.CAT_ITEM_BTN_BASE + ii, "", Lx(sx), Ly(sy), CFG.cat.overlayBtn.w, CFG.cat.overlayBtn.h);
   addCenteredLabel(g, ID.CAT_ITEM_LABEL_BASE + ii, String(items[idx2].id || ""), Lx(sx - 18), Ly(sy + 18), 54, 12);
   added++;
  }
  var slotsNow = g.getSlots();
  for(var si2 = 0; si2 < added; si2++){
   var entry = items[itemStart + si2];
   if(!entry) continue;
   try{
    var it = p.getWorld().createItemFromNbt(API.stringToNbt(String(entry.nbt || "")));
    slotsNow[slotsBefore + si2].setStack(it);
    try{ if(slotsNow[slotsBefore + si2].setCanTake) slotsNow[slotsBefore + si2].setCanTake(false); }catch(err){}
   }catch(err2){}
  }

  var maxItemPage = items.length == 0 ? 0 : Math.floor((items.length - 1) / perPage);
  g.addButton(ID.BTN_CAT_ITEMS_PREV, "◀", Lx(CFG.cat.items.x + 24), Ly(CFG.cat.items.y + CFG.cat.items.h - 28), 30, 20);
  g.addButton(ID.BTN_CAT_ITEMS_NEXT, "▶", Lx(CFG.cat.items.x + 58), Ly(CFG.cat.items.y + CFG.cat.items.h - 28), 30, 20);
  addCenteredLabel(g, ID.CAT_ITEMS_PAGE_LABEL, "§fPage " + String(itemPage + 1) + "/" + String(maxItemPage + 1), Lx(CFG.cat.items.x + 92), Ly(CFG.cat.items.y + CFG.cat.items.h - 26), 120, 20);
  g.addButton(ID.BTN_CAT_ITEMS_CLOSE, "Close", Lx(CFG.cat.items.x + CFG.cat.items.w - 64), Ly(CFG.cat.items.y + CFG.cat.items.h - 28), 52, 20);
 }

 if(view == "preset"){
  var presets = listCategoryPresetFiles(p);
  var pp = getInt(p, key.cat.presetPage);
  if(pp < 0) pp = 0;
  var per = 8;
  var maxP = presets.length == 0 ? 0 : Math.floor((presets.length - 1) / per);
  if(pp > maxP) { pp = maxP; setInt(p, key.cat.presetPage, pp); }
  var startP = pp * per;

  var px = CFG.cat.edit.x;
  var py = CFG.cat.edit.y + 20;
  var pw = CFG.cat.edit.w;
  var ph = 240;

  addSubUiBackground(g, ID.CAT_PRESET_BG, Lx(px), Ly(py), pw, ph);
  addPanel(g, Lx(px), Ly(py), pw, ph, ID.CAT_PRESET_TOP);
  addCenteredLabel(g, ID.CAT_PRESET_TITLE, "§fCategory Presets", Lx(px), Ly(py + 6), pw, 18);

  for(var i3 = 0; i3 < per; i3++){
   var idx3 = startP + i3;
   if(idx3 >= presets.length) break;
   var fn = String(presets[idx3].getName());
   g.addButton(ID.CAT_PRESET_BTN_BASE + i3, fn, Lx(px + 16), Ly(py + 30 + i3 * 20), pw - 32, 18);
  }

  g.addButton(ID.CAT_PRESET_PREV, "◀", Lx(px + 16), Ly(py + ph - 28), 30, 20);
  g.addButton(ID.CAT_PRESET_NEXT, "▶", Lx(px + 50), Ly(py + ph - 28), 30, 20);
  addCenteredLabel(g, ID.CAT_PRESET_PAGE, "§f" + String(pp + 1) + "/" + String(maxP + 1), Lx(px + 86), Ly(py + ph - 26), 140, 18);
  g.addButton(ID.CAT_PRESET_CLOSE, "Close", Lx(px + pw - 66), Ly(py + ph - 28), 50, 20);
 }

 if(view == "export"){
  var checked2 = readCheckedCategories(p);
  if(checked2.length == 0){
   setStr(p, key.cat.view, "");
  }else{
   var map = readExportNameMap(p);
   for(var ci = 0; ci < checked2.length; ci++){
    var cName = checked2[ci];
    if(map[cName] == null || String(map[cName]) == "") map[cName] = cName;
   }
   writeExportNameMap(p, map);

   var perE = 6;
   var ep = getInt(p, key.cat.exportPage);
   if(ep < 0) ep = 0;
   var maxE = Math.floor((checked2.length - 1) / perE);
   if(ep > maxE) { ep = maxE; setInt(p, key.cat.exportPage, ep); }
   var startE = ep * perE;

   var ex = CFG.cat.edit.x;
   var ey = CFG.cat.edit.y + 10;
   var ew = CFG.cat.edit.w;
   var eh = 220;

   addSubUiBackground(g, ID.CAT_EXPORT_BG, Lx(ex), Ly(ey), ew, eh);
   addPanel(g, Lx(ex), Ly(ey), ew, eh, ID.CAT_EXPORT_TOP);
   addCenteredLabel(g, ID.CAT_EXPORT_TITLE, "§fExport Checked Categories", Lx(ex), Ly(ey + 6), ew, 18);

   for(var ri = 0; ri < perE; ri++){
    var idxE = startE + ri;
    if(idxE >= checked2.length) break;
    var catN = checked2[idxE];
    g.addLabel(ID.CAT_EXPORT_ROW_LABEL_BASE + ri, "§e" + catN, Lx(ex + 16), Ly(ey + 30 + ri * 28), 120, 18);
    var tf = g.addTextField(ID.CAT_EXPORT_ROW_FIELD_BASE + ri, Lx(ex + 140), Ly(ey + 30 + ri * 28), ew - 156, 18);
    tf.setText(String(map[catN] || catN));
   }

   g.addButton(ID.BTN_CAT_EXPORT_PREV, "◀", Lx(ex + 16), Ly(ey + eh - 28), 30, 20);
   g.addButton(ID.BTN_CAT_EXPORT_NEXT, "▶", Lx(ex + 50), Ly(ey + eh - 28), 30, 20);
   addCenteredLabel(g, ID.CAT_EXPORT_PAGE, "§f" + String(ep + 1) + "/" + String(maxE + 1), Lx(ex + 86), Ly(ey + eh - 26), 120, 18);
   g.addButton(ID.BTN_CAT_EXPORT_DO, "Export", Lx(ex + ew - 156), Ly(ey + eh - 28), 70, 20);
   g.addButton(ID.BTN_CAT_EXPORT_CANCEL, "Cancel", Lx(ex + ew - 80), Ly(ey + eh - 28), 70, 20);
  }
 }
}
function addSettingsPanel(g, p){
 addFieldAtCustom(g, ID.SET_ROOT_LABEL, "Root Dir", ID.SET_ROOT, CFG.settings.rowY + CFG.settings.rowGap * 0, getRootDir(p), CFG.settings.labelX, CFG.settings.fieldX, CFG.settings.fieldW, CFG.settings.fieldH);
 addFieldAtCustom(g, ID.SET_PREFIX_LABEL, "Prefix Dir", ID.SET_PREFIX, CFG.settings.rowY + CFG.settings.rowGap * 1, getPrefixDir(p), CFG.settings.labelX, CFG.settings.fieldX, CFG.settings.fieldW, CFG.settings.fieldH);
 addFieldAtCustom(g, ID.SET_CATEGORY_LABEL, "Category File", ID.SET_CATEGORY, CFG.settings.rowY + CFG.settings.rowGap * 2, getCategoryFile(p), CFG.settings.labelX, CFG.settings.fieldX, CFG.settings.fieldW, CFG.settings.fieldH);
 g.addButton(ID.BTN_SAVE_SETTINGS, "Apply Paths", Rx(CFG.settings.save.x), Ry(CFG.settings.save.y), CFG.settings.save.w, CFG.settings.save.h);
}

function addCycleRowAt(g, labelId, valueLabelId, label, value, btnL, btnR, y, labelX, valueX){
 addInfoLabel(g, labelId, label, Lx(labelX), Ly(y), 20);
 g.addButton(btnL, "◀", Lx(valueX), Ly(y), 20, 20);
 addCenteredLabel(g, valueLabelId, value, Lx(valueX + 20), Ly(y + 4), 130, 20);
 g.addButton(btnR, "▶", Lx(valueX + 150), Ly(y), 20, 20);
}

function addCycleRow(g, labelId, label, value, btnL, btnR, y){
 // legacy wrapper (register panel uses it)
 var valueId = labelId + 1;
 addCycleRowAt(g, labelId, valueId, label, value, btnL, btnR, y, CFG.reg.labelX, CFG.reg.valueX);
}

function addFieldAt(g, labelId, label, fieldId, y, value){
 addFieldAtCustom(g, labelId, label, fieldId, y, value, CFG.stats.labelX, CFG.stats.fieldX, CFG.stats.fieldW, CFG.stats.fieldH);
}

function addFieldAtCustom(g, labelId, label, fieldId, y, value, labelX, fieldX, fieldW, fieldH){
 addInfoLabel(g, labelId, label, Lx(labelX), Ly(y), 20);
 var f = g.addTextField(fieldId, Lx(fieldX), Ly(y), fieldW, fieldH);
 f.setText(value);
}

function customGuiButton(e){
 if(e.gui.getID() != GUI_ID) return;
 var g = e.gui;
 var p = e.player;
 var id = e.buttonId;

 if(id == ID.MODE_HOME || id == ID.MODE_LORE || id == ID.MODE_STATS || id == ID.MODE_REGISTER || id == ID.MODE_CATEGORY || id == ID.MODE_SETTINGS){
  saveCurrentModeState(g, p);
  if(id == ID.MODE_HOME) setMode(p, MODE_HOME);
  if(id == ID.MODE_LORE) setMode(p, MODE_LORE);
  if(id == ID.MODE_STATS) setMode(p, MODE_STATS);
  if(id == ID.MODE_REGISTER) setMode(p, MODE_REGISTER);
  if(id == ID.MODE_CATEGORY) setMode(p, MODE_CATEGORY);
  if(id == ID.MODE_SETTINGS) setMode(p, MODE_SETTINGS);
  openGui(p);
  return;
 }

 var mode = getMode(p);
 if(mode == MODE_LORE) handleLoreButtons(g, p, id);
 if(mode == MODE_STATS) handleStatsButtons(g, p, id);
 if(mode == MODE_REGISTER) handleRegisterButtons(g, p, id);
 if(mode == MODE_CATEGORY) handleCategoryButtons(g, p, id);
 if(mode == MODE_SETTINGS) handleSettingsButtons(g, p, id);
}

function customGuiTextField(e){
 if(e.gui.getID() != GUI_ID) return;
 if(getMode(e.player) != MODE_LORE) return;
 var id = getEventComponentId(e);
 if(id >= ID.LORE_FIELD_BASE && id < ID.LORE_FIELD_BASE + CFG.perPage){
  handleLoreFieldInput(e.gui, e.player, id - ID.LORE_FIELD_BASE);
 }
 if(id == ID.LORE_ITEM_NAME){
  try{
   setStr(e.player, key.lore.name, encodeIssue(String(e.gui.getComponent(ID.LORE_ITEM_NAME).getText() || "")));
  }catch(err){}
 }
}

function handleLoreButtons(g, p, id){

 if(getBool(p, key.lore.exportPopup)){
  if(id == ID.BTN_LORE_EXPORT_CANCEL){
   setBool(p, key.lore.exportPopup, false);
   openGui(p);
   return;
  }
  if(id == ID.BTN_LORE_EXPORT_DO){
   var ef = g.getComponent(ID.LORE_EXPORT_FIELD);
   var name = sanitizeFileName(String(ef ? ef.getText() : ""));
   if(name == "") name = "prefix_set";
   setStr(p, key.lore.exportName, name);
   savePrefixSet(p, name);
   setBool(p, key.lore.exportPopup, false);
   openGui(p);
   return;
  }
 }

 if(id == ID.BTN_LORE_VANILLA){
  saveLoreState(g, p);
  var on = String(p.getTempdata().get(key.lore.vanilla) || "1") == "1";
  var next = on ? "0" : "1";
  p.getTempdata().put(key.lore.vanilla, next);
  applyVanillaFlagsToSlot(g, p, next == "1");
  openGui(p);
  return;
 }
 if(id == ID.BTN_LORE_ISSUE){
  try{
   var f = g.getComponent(ID.LORE_ISSUE_FIELD);
   if(f) f.setText("∮");
  }catch(err){}
  p.message("§7Use §e∮§7 as '§' for color codes.");
  return;
 }
 if(id >= ID.LORE_PREFIX_ZOOM_BASE && id < ID.LORE_PREFIX_ZOOM_BASE + CFG.perPage){
  saveLoreState(g, p);
  var abs = getPage(p) * CFG.perPage + (id - ID.LORE_PREFIX_ZOOM_BASE);
  setInt(p, key.lore.zoom, abs);
  openGui(p);
  return;
 }
 if(id == ID.BTN_LORE_ZOOM_SAVE){
  var abs2 = getInt(p, key.lore.zoom);
  var rows = getRows(p);
  ensureRowIndex(rows, abs2);
  var r = normalizeRow(rows[abs2]);
  var lp2 = g.getComponent(ID.LORE_ZOOM_TF_P);
  r.prefix = encodeIssue(String(lp2 ? lp2.getText() : ""));
  rows[abs2] = r;
  writeRows(p, rows);
  setInt(p, key.lore.zoom, -1);
  openGui(p);
  return;
 }
 if(id == ID.BTN_LORE_ZOOM_CANCEL){
  setInt(p, key.lore.zoom, -1);
  openGui(p);
  return;
 }
 if(id == ID.BTN_TOGGLE_PREFIX){
  saveLoreState(g, p);
  setPrefixVisible(p, !isPrefixVisible(p));
  openGui(p);
  return;
 }
 if(id == ID.BTN_TOGGLE_ROWS){
  saveLoreState(g, p);
  toggleAllVisibleRows(p);
  openGui(p);
  return;
 }
 if(id == ID.BTN_CLEAR){
  saveRestoreSnapshot(p);
  clearCurrentLorePage(p);
  openGui(p);
  return;
 }
 if(id == ID.BTN_RESTORE){
  restoreSnapshot(p);
  openGui(p);
  return;
 }
 if(id == ID.BTN_APPLY_LORE){
  // Force GUI refresh before reading fields (prevents missing the latest client-side edits).
  try{ g.update(); }catch(err0){}
  saveLoreState(g, p);
  applyLoreToSlot(g, p);
  try{ g.update(); }catch(err1){}
  return;
 }
 if(id == ID.BTN_SAVE_PREFIX){
  saveLoreState(g, p);
  // Open export popup immediately, and ensure other popups are closed (prevents overlapping).
  setBool(p, key.lore.prefixPopup, false);
  setInt(p, key.lore.zoom, -1);
  setBool(p, key.lore.exportPopup, true);
  openGui(p);
  return;
 }
 if(id == ID.BTN_LOAD_PREFIX){
  saveLoreState(g, p);
  // Close export popup to avoid overlap.
  setBool(p, key.lore.exportPopup, false);
  setBool(p, key.lore.prefixPopup, true);
  setInt(p, key.lore.prefixPage, 0);
  openGui(p);
  return;
 }
 if(getBool(p, key.lore.prefixPopup)){
  var per = 8;
  if(id >= ID.LORE_PREFIX_LIST_BTN_BASE && id < ID.LORE_PREFIX_LIST_BTN_BASE + per){
   var idx = getInt(p, key.lore.prefixPage) * per + (id - ID.LORE_PREFIX_LIST_BTN_BASE);
   loadPrefixSetByIndex(p, idx);
   setBool(p, key.lore.prefixPopup, false);
   openGui(p);
   return;
  }
  if(id == ID.LORE_PREFIX_LIST_CLOSE){
   setBool(p, key.lore.prefixPopup, false);
   openGui(p);
   return;
  }
  if(id == ID.LORE_PREFIX_LIST_PREV){
   var pp = getInt(p, key.lore.prefixPage) - 1;
   if(pp < 0) pp = 0;
   setInt(p, key.lore.prefixPage, pp);
   openGui(p);
   return;
  }
  if(id == ID.LORE_PREFIX_LIST_NEXT){
   var files = listPrefixFiles(p);
   var maxP = files.length == 0 ? 0 : Math.floor((files.length - 1) / per);
   var pp2 = getInt(p, key.lore.prefixPage) + 1;
   if(pp2 > maxP) pp2 = maxP;
   setInt(p, key.lore.prefixPage, pp2);
   openGui(p);
   return;
  }
 }
 if(id == ID.BTN_PREV){
  saveLoreState(g, p);
  var page = getPage(p) - 1;
  if(page < 0) page = 0;
  setPage(p, page);
  openGui(p);
  return;
 }
 if(id == ID.BTN_NEXT){
  saveLoreState(g, p);
  setPage(p, getPage(p) + 1);
  openGui(p);
  return;
 }
 if(id >= ID.LORE_PREFIX_TOGGLE_BASE && id < ID.LORE_PREFIX_TOGGLE_BASE + CFG.perPage){
  saveLoreState(g, p);
  togglePrefixRow(p, getPage(p) * CFG.perPage + (id - ID.LORE_PREFIX_TOGGLE_BASE));
  openGui(p);
  return;
 }
}

function handleStatsButtons(g, p, id){
 if(id == ID.STAT_MAIN_L || id == ID.STAT_MAIN_R){
  saveSlotItem(g, p);
  cycleMainType(p, id == ID.STAT_MAIN_R ? 1 : -1);
  openGui(p);
  return;
 }
 if(id == ID.STAT_SUB_L || id == ID.STAT_SUB_R){
  saveSlotItem(g, p);
  cycleSubType(p, id == ID.STAT_SUB_R ? 1 : -1);
  openGui(p);
  return;
 }
 if(id == ID.BTN_BC_TOGGLE){
  saveSlotItem(g, p);
  setBool(p, key.stat.bc, !getBool(p, key.stat.bc));
  openGui(p);
  return;
 }
 if(id == ID.BTN_BC_PREV){
  saveSlotItem(g, p);
  var page = getInt(p, key.stat.bcPage) - 1;
  if(page < 0) page = 0;
  setInt(p, key.stat.bcPage, page);
  openGui(p);
  return;
 }
 if(id == ID.BTN_BC_NEXT){
  saveSlotItem(g, p);
  var maxPage = Math.floor((BC_PRESETS.length - 1) / CFG.stats.bcRows);
  var np = getInt(p, key.stat.bcPage) + 1;
  if(np > maxPage) np = maxPage;
  setInt(p, key.stat.bcPage, np);
  openGui(p);
  return;
 }
 if(id == ID.BC_SPEED_MINUS){
  saveSlotItem(g, p);
  var v1 = parseFloat(getStr(p, key.stat.speed) || "0");
  v1 -= 0.2;
  if(v1 < -3.6) v1 = -3.6;
  setStr(p, key.stat.speed, v1.toFixed(1));
  openGui(p);
  return;
 }
 if(id == ID.BC_SPEED_PLUS){
  saveSlotItem(g, p);
  var v2 = parseFloat(getStr(p, key.stat.speed) || "0");
  v2 += 0.2;
  if(v2 > 0) v2 = 0;
  setStr(p, key.stat.speed, v2.toFixed(1));
  openGui(p);
  return;
 }
 if(id >= ID.BC_LABEL && id < ID.BC_LABEL + CFG.stats.bcRows){
  saveSlotItem(g, p);
  var idx = getInt(p, key.stat.bcPage) * CFG.stats.bcRows + (id - ID.BC_LABEL);
  if(idx < BC_PRESETS.length) setInt(p, key.stat.bcPreset, idx);
  openGui(p);
  return;
 }
 if(id == ID.BTN_APPLY_STATS){
  if(g.getComponent(ID.STAT_DAMAGE)) setStr(p, key.stat.damage, String(g.getComponent(ID.STAT_DAMAGE).getText() || getStr(p, key.stat.damage)));
  if(g.getComponent(ID.STAT_SPEED)) setStr(p, key.stat.speed, String(g.getComponent(ID.STAT_SPEED).getText() || getStr(p, key.stat.speed)));
  if(g.getComponent(ID.STAT_ARMOR)) setStr(p, key.stat.armor, String(g.getComponent(ID.STAT_ARMOR).getText() || getStr(p, key.stat.armor)));
  if(g.getComponent(ID.STAT_TOUGH)) setStr(p, key.stat.tough, String(g.getComponent(ID.STAT_TOUGH).getText() || getStr(p, key.stat.tough)));
  applyStatsToSlot(g, p);
 }
}

function handleRegisterButtons(g, p, id){
 if(id == ID.REG_CAT_L || id == ID.REG_CAT_R){
  saveSlotItem(g, p);
  cycleRegisterCategory(p, id == ID.REG_CAT_R ? 1 : -1);
  openGui(p);
  return;
 }
 if(id == ID.REG_SUB_L || id == ID.REG_SUB_R){
  saveSlotItem(g, p);
  cycleRegisterSub(p, id == ID.REG_SUB_R ? 1 : -1);
  openGui(p);
  return;
 }
 if(id == ID.BTN_SAVE_ITEM){
  setStr(p, key.reg.file, String(g.getComponent(ID.REG_FILE).getText() || getStr(p, key.reg.file)));
  saveRegisterItem(g, p);
 }
}

function handleCategoryButtons(g, p, id){
 var view = getStr(p, key.cat.view);

 if(id >= ID.CAT_CHECK_BASE && id < ID.CAT_CHECK_BASE + CFG.cat.rows){
  var data0 = readCategoryConfig(p);
  var names0 = getCategoryNames(data0);
  var idx0 = getInt(p, key.cat.page) * CFG.cat.rows + (id - ID.CAT_CHECK_BASE);
  var name0 = names0[idx0];
  if(name0) toggleCategoryChecked(p, name0);
  openGui(p);
  return;
 }

 if(id >= ID.CAT_LIST_BASE && id < ID.CAT_LIST_BASE + CFG.cat.rows){
  var data = readCategoryConfig(p);
  var names = getCategoryNames(data);
  var idx = getInt(p, key.cat.page) * CFG.cat.rows + (id - ID.CAT_LIST_BASE);
  var name = names[idx];
  if(name){
   setStr(p, key.cat.selected, name);
   setStr(p, key.cat.name, name);
   setStr(p, key.cat.subs, (data[name] || []).join(","));
   setStr(p, key.cat.view, "menu");
   setInt(p, key.cat.itemPage, 0);
  }
  openGui(p);
  return;
 }

 if(id == ID.BTN_CAT_NEW){
  setStr(p, key.cat.selected, "");
  setStr(p, key.cat.name, "");
  setStr(p, key.cat.subs, "default");
  setInt(p, key.cat.subPage, 0);
  setStr(p, key.cat.view, "edit");
  openGui(p);
  return;
 }

 if(id == ID.BTN_CAT_SAVE){
  if(readCheckedCategories(p).length == 0){
   p.message("§cNo checked categories");
   return;
  }
  setInt(p, key.cat.exportPage, 0);
  setStr(p, key.cat.view, "export");
  openGui(p);
  return;
 }

 if(id == ID.BTN_CAT_DELETE){
  deleteCheckedCategories(p);
  openGui(p);
  return;
 }

 if(id == ID.BTN_CAT_IMPORT){
  setInt(p, key.cat.presetPage, 0);
  setStr(p, key.cat.view, "preset");
  openGui(p);
  return;
 }

 if(id == ID.BTN_CAT_PREV){
  var page = getInt(p, key.cat.page) - 1;
  if(page < 0) page = 0;
  setInt(p, key.cat.page, page);
  openGui(p);
  return;
 }
 if(id == ID.BTN_CAT_NEXT){
  var data3 = readCategoryConfig(p);
  var maxPage = Math.floor((getCategoryNames(data3).length - 1) / CFG.cat.rows);
  var np = getInt(p, key.cat.page) + 1;
  if(np > maxPage) np = maxPage;
  setInt(p, key.cat.page, np);
  openGui(p);
  return;
 }

 if(view == "menu"){
  if(id == ID.BTN_CAT_MENU_EDIT){
   var selected4 = getStr(p, key.cat.selected);
   if(selected4 == ""){ p.message("§cSelect a category first"); return; }
   var data4 = readCategoryConfig(p);
   setStr(p, key.cat.name, selected4);
   setStr(p, key.cat.subs, (data4[selected4] || []).join(","));
   setInt(p, key.cat.subPage, 0);
   setStr(p, key.cat.view, "edit");
   openGui(p);
   return;
  }
  if(id == ID.BTN_CAT_MENU_ITEMS){
   if(getStr(p, key.cat.selected) == ""){ p.message("§cSelect a category first"); return; }
   try{
    var data5 = readCategoryConfig(p);
    var subs5 = data5[getStr(p, key.cat.selected)] instanceof Array ? data5[getStr(p, key.cat.selected)] : ["default"];
    var firstSub = sanitizeFileName(String(subs5[0] || "default"));
    if(firstSub == "") firstSub = "default";
    setStr(p, key.cat.itemsSub, firstSub);
   }catch(err5){ setStr(p, key.cat.itemsSub, "default"); }
   setInt(p, key.cat.itemPage, 0);
   setStr(p, key.cat.view, "items");
   openGui(p);
   return;
  }
  if(id == ID.BTN_CAT_MENU_CANCEL){
   setStr(p, key.cat.view, "");
   openGui(p);
   return;
  }
 }

 if(view == "edit"){
  var perPageSubs = CFG.cat.subs.perPage;
  if(id == ID.BTN_CAT_SUB_ADD){
   syncCatSubsFromGui(g, p);
   var subs = parseSubsCsv(getStr(p, key.cat.subs));
   var nextIdx = subs.length + 1;
   var base = "sub_" + String(nextIdx);
   while(subs.indexOf(base) != -1){ nextIdx++; base = "sub_" + String(nextIdx); }
   subs.push(base);
   setStr(p, key.cat.subs, subs.join(","));
   var maxPage = Math.floor((subs.length - 1) / perPageSubs);
   setInt(p, key.cat.subPage, maxPage);
   openGui(p);
   return;
  }
  if(id == ID.BTN_CAT_SUB_PREV){
   syncCatSubsFromGui(g, p);
   var sp = getInt(p, key.cat.subPage) - 1;
   if(sp < 0) sp = 0;
   setInt(p, key.cat.subPage, sp);
   openGui(p);
   return;
  }
  if(id == ID.BTN_CAT_SUB_NEXT){
   syncCatSubsFromGui(g, p);
   var subs2 = parseSubsCsv(getStr(p, key.cat.subs));
   var maxPage2 = subs2.length == 0 ? 0 : Math.floor((subs2.length - 1) / perPageSubs);
   var sp2 = getInt(p, key.cat.subPage) + 1;
   if(sp2 > maxPage2) sp2 = maxPage2;
   setInt(p, key.cat.subPage, sp2);
   openGui(p);
   return;
  }
  if(id >= ID.BTN_CAT_SUB_DEL_BASE && id < ID.BTN_CAT_SUB_DEL_BASE + perPageSubs){
   syncCatSubsFromGui(g, p);
   var subs3 = parseSubsCsv(getStr(p, key.cat.subs));
   var subPage3 = getInt(p, key.cat.subPage);
   var abs = subPage3 * perPageSubs + (id - ID.BTN_CAT_SUB_DEL_BASE);
   if(abs >= 0 && abs < subs3.length) subs3.splice(abs, 1);
   setStr(p, key.cat.subs, subs3.join(","));
   var maxPage3 = subs3.length == 0 ? 0 : Math.floor((subs3.length - 1) / perPageSubs);
   if(subPage3 > maxPage3) setInt(p, key.cat.subPage, maxPage3);
   openGui(p);
   return;
  }
  if(id == ID.BTN_CAT_POPUP_SAVE){
   saveCategoryConfigFromGui(g, p);
   setStr(p, key.cat.view, "menu");
   openGui(p);
   return;
  }
  if(id == ID.BTN_CAT_POPUP_CANCEL){
   syncCatSubsFromGui(g, p);
   setStr(p, key.cat.view, "menu");
   openGui(p);
   return;
  }
 }

 if(view == "items"){
  if(id == ID.BTN_CAT_ITEMS_CLOSE){
   setStr(p, key.cat.view, "menu");
   openGui(p);
   return;
  }

  if(id >= ID.CAT_ITEMS_SUB_BASE && id < ID.CAT_ITEMS_SUB_BASE + 12){
   var dataS = readCategoryConfig(p);
   var selS = getStr(p, key.cat.selected);
   var subsS = dataS[selS] instanceof Array ? dataS[selS] : ["default"];
   var idxS = id - ID.CAT_ITEMS_SUB_BASE;
   var subS = sanitizeFileName(String(subsS[idxS] || ""));
   if(subS == "") subS = "default";
   setStr(p, key.cat.itemsSub, subS);
   setInt(p, key.cat.itemPage, 0);
   openGui(p);
   return;
  }

  var items = readCatItemsCache(p);
  var perPage = CFG.cat.items.cols * CFG.cat.items.rows;
  var maxItemPage = items.length == 0 ? 0 : Math.floor((items.length - 1) / perPage);

  if(id == ID.BTN_CAT_ITEMS_PREV){
   var ip = getInt(p, key.cat.itemPage) - 1;
   if(ip < 0) ip = 0;
   setInt(p, key.cat.itemPage, ip);
   openGui(p);
   return;
  }
  if(id == ID.BTN_CAT_ITEMS_NEXT){
   var ip2 = getInt(p, key.cat.itemPage) + 1;
   if(ip2 > maxItemPage) ip2 = maxItemPage;
   setInt(p, key.cat.itemPage, ip2);
   openGui(p);
   return;
  }

  if(id >= ID.CAT_ITEM_BTN_BASE && id < ID.CAT_ITEM_BTN_BASE + perPage){
   var btnIdx = id - ID.CAT_ITEM_BTN_BASE;
   var itemStart = getInt(p, key.cat.itemPage) * perPage;
   var entry = items[itemStart + btnIdx];
   if(entry) importItemEntryToWorkingSlot(g, p, entry);
   openGui(p);
   return;
  }
 }

 if(view == "preset"){
  var per = 8;
  if(id >= ID.CAT_PRESET_BTN_BASE && id < ID.CAT_PRESET_BTN_BASE + per){
   var idx = getInt(p, key.cat.presetPage) * per + (id - ID.CAT_PRESET_BTN_BASE);
   importCategoryPresetByIndex(p, idx);
   setStr(p, key.cat.view, "menu");
   openGui(p);
   return;
  }
  if(id == ID.CAT_PRESET_CLOSE){
   setStr(p, key.cat.view, "menu");
   openGui(p);
   return;
  }
  if(id == ID.CAT_PRESET_PREV){
   var pp = getInt(p, key.cat.presetPage) - 1;
   if(pp < 0) pp = 0;
   setInt(p, key.cat.presetPage, pp);
   openGui(p);
   return;
  }
  if(id == ID.CAT_PRESET_NEXT){
   var presets = listCategoryPresetFiles(p);
   var maxP = presets.length == 0 ? 0 : Math.floor((presets.length - 1) / per);
   var pp2 = getInt(p, key.cat.presetPage) + 1;
   if(pp2 > maxP) pp2 = maxP;
   setInt(p, key.cat.presetPage, pp2);
   openGui(p);
   return;
  }
 }

 if(view == "export"){
  var perE = 6;

  if(id == ID.BTN_CAT_EXPORT_CANCEL){
   setStr(p, key.cat.view, "");
   openGui(p);
   return;
  }

  if(id == ID.BTN_CAT_EXPORT_DO){
   var checked = readCheckedCategories(p);
   var map = readExportNameMap(p);
   var ep = getInt(p, key.cat.exportPage);
   if(ep < 0) ep = 0;
   var startE = ep * perE;
   for(var ri = 0; ri < perE; ri++){
    var idxE = startE + ri;
    if(idxE >= checked.length) break;
    var catN = checked[idxE];
    var c = g.getComponent(ID.CAT_EXPORT_ROW_FIELD_BASE + ri);
    var v = sanitizeFileName(String(c ? c.getText() : ""));
    if(v == "") v = catN;
    map[catN] = v;
   }
   writeExportNameMap(p, map);
   exportCheckedCategoriesIndividually(p, map);
   setStr(p, key.cat.view, "");
   openGui(p);
   return;
  }

  if(id == ID.BTN_CAT_EXPORT_PREV){
   var ep2 = getInt(p, key.cat.exportPage) - 1;
   if(ep2 < 0) ep2 = 0;
   setInt(p, key.cat.exportPage, ep2);
   openGui(p);
   return;
  }

  if(id == ID.BTN_CAT_EXPORT_NEXT){
   var checked2 = readCheckedCategories(p);
   var maxE = checked2.length == 0 ? 0 : Math.floor((checked2.length - 1) / perE);
   var ep3 = getInt(p, key.cat.exportPage) + 1;
   if(ep3 > maxE) ep3 = maxE;
   setInt(p, key.cat.exportPage, ep3);
   openGui(p);
   return;
  }
 }
}

function handleSettingsButtons(g, p, id){
 if(id != ID.BTN_SAVE_SETTINGS) return;

 var root = g.getComponent(ID.SET_ROOT) ? String(g.getComponent(ID.SET_ROOT).getText() || "").trim() : "";
 var prefix = g.getComponent(ID.SET_PREFIX) ? String(g.getComponent(ID.SET_PREFIX).getText() || "").trim() : "";
 var catFile = g.getComponent(ID.SET_CATEGORY) ? String(g.getComponent(ID.SET_CATEGORY).getText() || "").trim() : "";

 setStr(p, key.path.root, root !== "" ? root : DEFAULT_ROOT_DIR);
 setStr(p, key.path.prefix, prefix !== "" ? prefix : DEFAULT_PREFIX_DIR);
 setStr(p, key.path.category, catFile !== "" ? catFile : DEFAULT_CATEGORY_FILE);

 // Split removed (2-split only)

 ensureDir(getRootDir(p));
 ensureDir(getPrefixDir(p));
 ensureCategoryConfig(p);
 p.message("§aPaths applied");
 openGui(p);
}
function saveCurrentModeState(g, p){
 if(getMode(p) == MODE_LORE) saveLoreState(g, p);
 if(getMode(p) == MODE_REGISTER && g.getComponent(ID.REG_FILE)) setStr(p, key.reg.file, String(g.getComponent(ID.REG_FILE).getText() || ""));
 if(getMode(p) == MODE_CATEGORY){
  if(g.getComponent(ID.CAT_NAME)) setStr(p, key.cat.name, String(g.getComponent(ID.CAT_NAME).getText() || ""));
  if(getStr(p, key.cat.view) == "export"){
   try{
    var checked = readCheckedCategories(p);
    var map = readExportNameMap(p);
    var perE = 6;
    var ep = getInt(p, key.cat.exportPage);
    if(ep < 0) ep = 0;
    var startE = ep * perE;
    for(var ri = 0; ri < perE; ri++){
     var idxE = startE + ri;
     if(idxE >= checked.length) break;
     var catN = checked[idxE];
     var c = g.getComponent(ID.CAT_EXPORT_ROW_FIELD_BASE + ri);
     if(!c) continue;
     var v = sanitizeFileName(String(c.getText() || ""));
     if(v == "") v = catN;
     map[catN] = v;
    }
    writeExportNameMap(p, map);
   }catch(errE){}
  }
  try{
   if(getStr(p, key.cat.view) == "edit") syncCatSubsFromGui(g, p);
  }catch(err){}
 }
 if(getMode(p) == MODE_SETTINGS){
  if(g.getComponent(ID.SET_ROOT)) setStr(p, key.path.root, String(g.getComponent(ID.SET_ROOT).getText() || ""));
  if(g.getComponent(ID.SET_PREFIX)) setStr(p, key.path.prefix, String(g.getComponent(ID.SET_PREFIX).getText() || ""));
  if(g.getComponent(ID.SET_CATEGORY)) setStr(p, key.path.category, String(g.getComponent(ID.SET_CATEGORY).getText() || ""));
 }
 saveSlotItem(g, p);
}

function saveLoreState(g, p){
 var rows = getRows(p);
 var page = getPage(p);
 var start = page * CFG.perPage;
 var openArr = getPrefixOpen(p);

 for(var i = 0; i < CFG.perPage; i++){
  ensureRowIndex(rows, start + i);
  var lf = g.getComponent(ID.LORE_FIELD_BASE + i);
  rows[start + i].lore = encodeIssue(String(lf ? (lf.getText() || "") : (rows[start + i].lore || "")));
  if(isPrefixVisible(p) && openArr[start + i] === true){
   var pf = g.getComponent(ID.LORE_PREFIX_FIELD_BASE + i);
   rows[start + i].prefix = encodeIssue(String(pf ? pf.getText() : (rows[start + i].prefix || "")));
  }
 }
 trimRows(rows);
 writeRows(p, rows);

 try{
  if(g.getComponent(ID.LORE_ITEM_NAME)) setStr(p, key.lore.name, encodeIssue(String(g.getComponent(ID.LORE_ITEM_NAME).getText() || "")));
 }catch(err){}
 saveSlotItem(g, p);
}

function handleLoreFieldInput(g, p, rowInPage){
 var field = g.getComponent(ID.LORE_FIELD_BASE + rowInPage);
 if(!field) return;

 var raw = String(field.getText() || "");
 if(raw.indexOf("\n") == -1 && raw.indexOf("\r") == -1) return;

 saveLoreState(g, p);

 var rows = getRows(p);
 var absIndex = getPage(p) * CFG.perPage + rowInPage;
 var parts = splitLines(raw, null);
 if(parts.length == 0) parts = [""];

 ensureRowIndex(rows, absIndex);
 rows[absIndex].lore = encodeIssue(parts[0]);

 if(parts.length > 1){
  var extra = [];
  for(var i = 1; i < parts.length; i++){
   extra.push(createRow("", parts[i]));
  }
  insertRowsAfter(rows, absIndex, extra);
 }

 writeRows(p, rows);
 openGui(p);
}

function clearCurrentLorePage(p){
 var rows = getRows(p);
 var start = getPage(p) * CFG.perPage;
 for(var i = 0; i < CFG.perPage; i++) rows[start + i] = blankRow();
 trimRows(rows);
 writeRows(p, rows);
}

function saveRestoreSnapshot(p){
 p.getTempdata().put(key.restoreRows, JSON.stringify(getRows(p)));
}

function restoreSnapshot(p){
 var raw = p.getTempdata().get(key.restoreRows);
 if(raw == null || String(raw) == "") return;
 try{
  var arr = JSON.parse(String(raw));
  writeRows(p, arr instanceof Array ? arr : []);
 }catch(err){}
}

function applyLoreToSlot(g, p){
 var slots = g.getSlots();
 if(!slots || slots.length == 0){ p.message("§cNo slot found"); return; }
 var item = slots[0].getStack();
 if(!item || item.isEmpty && item.isEmpty()){ p.message("§cPut target item in the slot"); return; }

 var rows = getRows(p);
 var out = [];
 for(var i = 0; i < rows.length; i++) out.push(buildFinalLine(normalizeRow(rows[i])));
 while(out.length > 0 && String(out[out.length - 1] || "") == "") out.pop();

 item.setLore(out);

 // Custom name
 var nm = "";
 try{
  if(g.getComponent(ID.LORE_ITEM_NAME)) nm = String(g.getComponent(ID.LORE_ITEM_NAME).getText() || "");
 }catch(err){}
 nm = decodeIssue(nm);
 if(nm != ""){
  try{ item.setCustomName(nm); }catch(err2){}
 }

 // Vanilla tooltip flags
 var vanillaOn = String(p.getTempdata().get(key.lore.vanilla) || "1") == "1";
 try{
  var nbt2 = item.getItemNbt();
  if(!nbt2.has("tag")) nbt2.setCompound("tag", API.stringToNbt("{}"));
  var tag2 = nbt2.getCompound("tag");
  if(vanillaOn){
   try{ if(tag2.has("HideFlags")) tag2.remove("HideFlags"); }catch(err4){}
  }else{
   try{
    if(tag2.putInt) tag2.putInt("HideFlags", 63);
    else if(tag2.putInteger) tag2.putInteger("HideFlags", 63);
    else if(tag2.setInteger) tag2.setInteger("HideFlags", 63);
   }catch(err5){}
  }
  nbt2.setCompound("tag", tag2);
  item = p.getWorld().createItemFromNbt(nbt2);
 }catch(err6){}

 slots[0].setStack(item);
 saveSlotItem(g, p);
 try{ g.update(); }catch(err7){}
 p.message("§aLore applied");
}

function applyVanillaFlagsToSlot(g, p, vanillaOn){
 try{
  var slots = g.getSlots();
  if(!slots || slots.length == 0) return;
  var item = slots[0].getStack();
  if(!item || item.isEmpty && item.isEmpty()) return;
  var nbt = item.getItemNbt();
  if(!nbt.has("tag")) nbt.setCompound("tag", API.stringToNbt("{}"));
  var tag = nbt.getCompound("tag");
  if(vanillaOn){
   try{ if(tag.has("HideFlags")) tag.remove("HideFlags"); }catch(err2){}
  }else{
   try{
    if(tag.putInt) tag.putInt("HideFlags", 63);
    else if(tag.putInteger) tag.putInteger("HideFlags", 63);
    else if(tag.setInteger) tag.setInteger("HideFlags", 63);
   }catch(err3){}
  }
  nbt.setCompound("tag", tag);
  var it2 = p.getWorld().createItemFromNbt(nbt);
  slots[0].setStack(it2);
  saveSlotItem(g, p);
 }catch(err){}
}

function applyStatsToSlot(g, p){
 var slots = g.getSlots();
 if(!slots || slots.length == 0){ p.message("§cNo slot found"); return; }
 var item = slots[0].getStack();
 if(!item || item.isEmpty && item.isEmpty()){ p.message("§cPut target item in the slot"); return; }

 var mainType = getStatMainType(p);
 var dmg = parseFloat(getStr(p, key.stat.damage) || "0");
 var spd = parseFloat(getStr(p, key.stat.speed) || "0");
 var arm = parseFloat(getStr(p, key.stat.armor) || "0");
 var tough = parseFloat(getStr(p, key.stat.tough) || "0");

 if(mainType == "weapon"){
  item = applyWeaponNbtStats(item, p, isNaN(dmg) ? 0 : dmg, isNaN(spd) ? 0 : spd);
 }else{
  var slotId = getArmorSlotFromSub(getStatSubType(p));
  item.setAttribute("minecraft:generic.armor", isNaN(arm) ? 0 : arm, slotId);
  item.setAttribute("minecraft:generic.armor_toughness", isNaN(tough) ? 0 : tough, slotId);
 }

 slots[0].setStack(item);
 saveSlotItem(g, p);
 try{ g.update(); }catch(err){}
 p.message("§aStats applied");
}

function applyWeaponNbtStats(item, p, damage, speed){
 try{
  var bcOn = getBool(p, key.stat.bc);
  var parent = "";
  if(bcOn){
   var presetIndex = getInt(p, key.stat.bcPreset);
   if(presetIndex >= 0 && presetIndex < BC_PRESETS.length) parent = String(BC_PRESETS[presetIndex][1]);
  }

  var nbt = item.getItemNbt();
  if(!nbt.has("tag")) nbt.setCompound("tag", API.stringToNbt("{}"));
  var tag = nbt.getCompound("tag");

  var list = [];
  list.push(API.stringToNbt('{AttributeName:"minecraft:generic.attack_damage",Name:"bc_dmg",Amount:' + damage + ',Operation:0,Slot:"mainhand",UUID:[I;1,2,3,4]}'));
  list.push(API.stringToNbt('{AttributeName:"minecraft:generic.attack_speed",Name:"bc_spd",Amount:' + speed + ',Operation:0,Slot:"mainhand",UUID:[I;5,6,7,8]}'));
  tag.setList("AttributeModifiers", list);

  if(bcOn && parent != ""){
   tag.putString("weapon_attributes", '{"parent":"' + parent + '"}');
  }else{
   try{ if(tag.has("weapon_attributes")) tag.remove("weapon_attributes"); }catch(err2){}
  }

  nbt.setCompound("tag", tag);
  return p.getWorld().createItemFromNbt(nbt);
 }catch(err){}
 return item;
}

function saveRegisterItem(g, p){
 var slots = g.getSlots();
 if(!slots || slots.length == 0){ p.message("§cNo slot found"); return; }
 var item = slots[0].getStack();
 if(!item || item.isEmpty && item.isEmpty()){ p.message("§cPut target item in the slot"); return; }

 var category = getRegisterCategory(p);
 var sub = getRegisterSub(p);
 // Use the text field name as-is (only replace forbidden filename chars).
 var fileNameRaw = String(getStr(p, key.reg.file) || "").trim();
 if(fileNameRaw == ""){ p.message("§cFile is required"); return; }
 var fileName = fileNameRaw.replace(/[\\/:*?"<>|]/g, "_");
 if(!fileName.toLowerCase().endsWith(".json")) fileName = fileName + ".json";

 var dir = getRootDir(p) + sanitizeFileName(category) + "/" + sanitizeFileName(sub) + "/";
 ensureDir(dir);

 // Save the item's full NBT as-is. This preserves lore/custom name and makes re-import simple via createItemFromNbt().
 var snbt = item.getItemNbt().toJsonString();
 var path = dir + fileName;
 Files.write(Paths.get(path), new java.lang.String(String(snbt)).getBytes(StandardCharsets.UTF_8));
 p.message("§aSaved: " + path);
}

function listItemEntriesForCategory(p, category){
 category = sanitizeFileName(category);
 if(category == "") return [];

 var data = readCategoryConfig(p);
 var subs = data[category] instanceof Array ? data[category] : ["default"];
 var out = [];
 for(var si = 0; si < subs.length; si++){
  var sub = sanitizeFileName(subs[si]);
  if(sub == "") sub = "default";
  var dir = new File(getRootDir(p) + category + "/" + sub + "/");
  walkJsonFiles(dir, out);
 }
 out.sort(function(a, b){ return String(a.id || "").localeCompare(String(b.id || "")); });
 return out;
}

function listItemEntriesForCategorySub(p, category, sub){
 category = sanitizeFileName(category);
 sub = sanitizeFileName(sub);
 if(category == "" || sub == "") return [];
 var dir = new File(getRootDir(p) + category + "/" + sub + "/");
 var out = [];
 walkJsonFiles(dir, out);
 out.sort(function(a, b){ return String(a.id || "").localeCompare(String(b.id || "")); });
 return out;
}

function walkJsonFiles(dir, out){
 try{
  if(!dir || !dir.exists() || !dir.isDirectory()) return;
  var arr = dir.listFiles();
  if(arr == null) return;
  for(var i = 0; i < arr.length; i++){
   var f = arr[i];
   if(f.isDirectory()){
    walkJsonFiles(f, out);
    continue;
   }
   if(!f.isFile()) continue;
   if(!String(f.getName()).toLowerCase().endsWith(".json")) continue;
   try{
    var txt = new java.lang.String(Files.readAllBytes(Paths.get(f.getPath())), StandardCharsets.UTF_8);
    var str = String(txt || "").trim();
    if(str == "") continue;
    try{
     // Legacy format: JSON wrapper with {nbt:"..."} and optional loreRows/id/itemId.
     var obj = JSON.parse(str);
     if(obj && typeof obj == "object" && obj.nbt != null && String(obj.nbt) != ""){
      out.push({
       id:String(obj.id || f.getName().replace(/\\.json$/i, "")),
       itemId:String(obj.itemId || ""),
       nbt:String(obj.nbt || ""),
       path:String(f.getPath()),
       loreRows:(obj.loreRows instanceof Array ? obj.loreRows : null)
      });
      continue;
     }
    }catch(parseErr){
     // New simple format: file content is the NBT SNBT string itself.
    }
    out.push({
     id:String(f.getName().replace(/\\.json$/i, "")),
     itemId:"",
     nbt:str,
     path:String(f.getPath()),
     loreRows:null
    });
   }catch(err2){}
  }
 }catch(err){}
}

function getCategoryPresetDir(p){
 try{
  var cf = new File(getCategoryFile(p));
  var parent = cf.getParent();
  if(parent == null || String(parent) == "") return "customnpcs/JSON/item/category_presets/";
  return String(parent) + File.separator + "category_presets" + File.separator;
 }catch(err){
  return "customnpcs/JSON/item/category_presets/";
 }
}

function listCategoryPresetFiles(p){
 try{
  var dirPath = getCategoryPresetDir(p);
  ensureDir(dirPath);
  var dir = new File(dirPath);
  var arr = dir.listFiles();
  var out = [];
  if(arr == null) return out;
  for(var i = 0; i < arr.length; i++){
   var f = arr[i];
   if(f.isFile() && String(f.getName()).toLowerCase().endsWith(".json")) out.push(f);
  }
  out.sort(function(a, b){ return String(a.getName()).compareToIgnoreCase(String(b.getName())); });
  return out;
 }catch(err){ return []; }
}

function exportCategoryPreset(p){
 try{
  var dirPath = getCategoryPresetDir(p);
  ensureDir(dirPath);
  var data = readCategoryConfig(p);
  var name = "preset_" + String(new java.util.Date().getTime()) + ".json";
  var path = dirPath + name;
  Files.write(Paths.get(path), new java.lang.String(JSON.stringify(data, null, 1)).getBytes(StandardCharsets.UTF_8));
  p.message("§aExported: " + path);
 }catch(err){
  try{ p.message("§cExport failed"); }catch(err2){}
 }
}

function importCategoryPresetByIndex(p, index){
 try{
  var files = listCategoryPresetFiles(p);
  var f = files[index];
  if(!f) return;
  var txt = new java.lang.String(Files.readAllBytes(Paths.get(f.getPath())), StandardCharsets.UTF_8);
  var obj = JSON.parse(String(txt));
  if(!obj || typeof obj != "object"){ p.message("§cInvalid preset"); return; }
  writeCategoryConfig(p, obj);
  p.message("§aImported preset: " + String(f.getName()));
 }catch(err){
  try{ p.message("§cImport failed"); }catch(err2){}
 }
}

function saveCategoryConfigFromGui(g, p){
 var data = readCategoryConfig(p);
 var name = sanitizeFileName(String(g.getComponent(ID.CAT_NAME).getText() || ""));
 if(name == ""){ p.message("§cCategory name required"); return; }

 var subs = syncCatSubsFromGui(g, p);
 if(subs.length == 0) subs = ["default"];
 data[name] = subs;
 writeCategoryConfig(p, data);
 setStr(p, key.cat.selected, name);
 setStr(p, key.cat.name, name);
 setStr(p, key.cat.subs, subs.join(","));
 p.message("§aCategory saved");
}

function deleteCategoryConfigFromGui(g, p){
 var data = readCategoryConfig(p);
 var name = "";
 try{
  var c = g.getComponent(ID.CAT_NAME);
  name = sanitizeFileName(String(c ? c.getText() : getStr(p, key.cat.selected)));
 }catch(err){
  name = sanitizeFileName(getStr(p, key.cat.selected));
 }
 if(name == "" || !data.hasOwnProperty(name)){ p.message("§cCategory not found"); return; }
 delete data[name];
 writeCategoryConfig(p, data);
 setStr(p, key.cat.selected, "");
 setStr(p, key.cat.name, "");
 setStr(p, key.cat.subs, "");
 p.message("§aCategory deleted");
}

function readCheckedCategories(p){
 try{
  var raw = getStr(p, key.cat.checked);
  var arr = JSON.parse(raw == "" ? "[]" : raw);
  if(!(arr instanceof Array)) return [];
  var out = [];
  for(var i = 0; i < arr.length; i++){
   var t = sanitizeFileName(String(arr[i] || ""));
   if(t != "" && out.indexOf(t) == -1) out.push(t);
  }
  return out;
 }catch(err){ return []; }
}

function writeCheckedCategories(p, arr){
 try{
  p.getTempdata().put(key.cat.checked, JSON.stringify(arr instanceof Array ? arr : []));
 }catch(err){}
}

function isCategoryChecked(p, name){
 var t = sanitizeFileName(name);
 if(t == "") return false;
 return readCheckedCategories(p).indexOf(t) != -1;
}

function toggleCategoryChecked(p, name){
 var t = sanitizeFileName(name);
 if(t == "") return;
 var arr = readCheckedCategories(p);
 var idx = arr.indexOf(t);
 if(idx == -1) arr.push(t);
 else arr.splice(idx, 1);
 writeCheckedCategories(p, arr);
}

function clearCheckedCategories(p){
 writeCheckedCategories(p, []);
}

function exportCheckedCategories(p, fileBase){
 var checked = readCheckedCategories(p);
 if(checked.length == 0){ p.message("§cNo checked categories"); return; }
 try{
  var dirPath = getCategoryPresetDir(p);
  ensureDir(dirPath);
  var data = readCategoryConfig(p);
  var out = {};
  for(var i = 0; i < checked.length; i++){
   var k = checked[i];
   if(data.hasOwnProperty(k)) out[k] = data[k];
  }
  var base = sanitizeFileName(String(fileBase || "").trim());
  if(base == "") base = "checked_" + String(new java.util.Date().getTime());
  if(!base.toLowerCase().endsWith(".json")) base = base + ".json";

  var path = dirPath + base;
  try{
   var f = new File(path);
   if(f.exists()){
    var ts = String(new java.util.Date().getTime());
    var alt = base.replace(/\\.json$/i, "_" + ts + ".json");
    path = dirPath + alt;
   }
  }catch(err0){}
  Files.write(Paths.get(path), new java.lang.String(JSON.stringify(out, null, 1)).getBytes(StandardCharsets.UTF_8));
  p.message("§aExported checked: " + path);
 }catch(err){
  try{ p.message("§cExport failed"); }catch(err2){}
 }
}

function readExportNameMap(p){
 try{
  var raw = getStr(p, key.cat.exportNames);
  var obj = JSON.parse(raw == "" ? "{}" : raw);
  return obj && typeof obj == "object" ? obj : {};
 }catch(err){ return {}; }
}

function writeExportNameMap(p, obj){
 try{
  p.getTempdata().put(key.cat.exportNames, JSON.stringify(obj && typeof obj == "object" ? obj : {}));
 }catch(err){}
}

function exportCheckedCategoriesIndividually(p, nameMap){
 var checked = readCheckedCategories(p);
 if(checked.length == 0){ p.message("짠cNo checked categories"); return; }

 try{
  var dirPath = getCategoryPresetDir(p);
  ensureDir(dirPath);
  var data = readCategoryConfig(p);
  var ok = 0;

  for(var i = 0; i < checked.length; i++){
   var cat = checked[i];
   if(!data.hasOwnProperty(cat)) continue;

   var base = "";
   try{ base = String((nameMap && nameMap[cat]) || ""); }catch(err0){ base = ""; }
   base = sanitizeFileName(base);
   if(base == "") base = cat;
   if(!base.toLowerCase().endsWith(".json")) base = base + ".json";

   var path = dirPath + base;
   try{
    var f = new File(path);
    if(f.exists()){
     var ts = String(new java.util.Date().getTime());
     var alt = base.replace(/\\.json$/i, "_" + ts + ".json");
     path = dirPath + alt;
    }
   }catch(err1){}

   var out = {};
   out[cat] = data[cat];
   Files.write(Paths.get(path), new java.lang.String(JSON.stringify(out, null, 1)).getBytes(StandardCharsets.UTF_8));
   ok++;
  }

  p.message("짠aExported: " + String(ok));
 }catch(err2){
  try{ p.message("짠cExport failed"); }catch(err3){}
 }
}

function deleteCheckedCategories(p){
 var checked = readCheckedCategories(p);
 if(checked.length == 0){ deleteCategoryConfigBySelected(p); return; }
 var data = readCategoryConfig(p);
 var deleted = 0;
 for(var i = 0; i < checked.length; i++){
  var k = checked[i];
  if(data.hasOwnProperty(k)){ delete data[k]; deleted++; }
 }
 writeCategoryConfig(p, data);
 clearCheckedCategories(p);
 var sel = sanitizeFileName(getStr(p, key.cat.selected));
 if(sel != "" && !data.hasOwnProperty(sel)){
  setStr(p, key.cat.selected, "");
  setStr(p, key.cat.name, "");
  setStr(p, key.cat.subs, "");
  setStr(p, key.cat.view, "");
 }
 p.message("§aDeleted: " + String(deleted));
}

function deleteCategoryConfigBySelected(p){
 var selected = sanitizeFileName(getStr(p, key.cat.selected));
 if(selected == ""){ p.message("§cSelect a category first"); return; }
 var data = readCategoryConfig(p);
 if(!data.hasOwnProperty(selected)){ p.message("§cCategory not found"); return; }
 delete data[selected];
 writeCategoryConfig(p, data);
 setStr(p, key.cat.selected, "");
 setStr(p, key.cat.name, "");
 setStr(p, key.cat.subs, "");
 p.message("§aCategory deleted");
}

function readCatItemsCache(p){
 try{
  var raw = getStr(p, key.cat.items);
  var arr = JSON.parse(raw == "" ? "[]" : raw);
  return arr instanceof Array ? arr : [];
 }catch(err){ return []; }
}

function syncCatSubsFromGui(g, p){
 var subs = parseSubsCsv(getStr(p, key.cat.subs));
 var subPage = getInt(p, key.cat.subPage);
 if(subPage < 0) subPage = 0;
 var perPage = CFG.cat.subs.perPage;
 var start = subPage * perPage;

 for(var i = 0; i < perPage; i++){
  var c = g.getComponent(ID.CAT_SUB_FIELD_BASE + i);
  if(!c) continue;
  var v = sanitizeFileName(String(c.getText() || ""));
  if(v == "") continue;
  var abs = start + i;
  if(abs < subs.length) subs[abs] = v;
  else if(abs == subs.length) subs.push(v);
 }

 var out = [];
 for(var j = 0; j < subs.length; j++){
  var t = sanitizeFileName(subs[j]);
  if(t != "" && out.indexOf(t) == -1) out.push(t);
 }
 setStr(p, key.cat.subs, out.join(","));
 return out;
}

function giveItemToPlayerSafe(p, item){
 if(!item || item.isEmpty && item.isEmpty()) return;
 try{
  if(p.giveItem){ p.giveItem(item); return; }
 }catch(err){}
 try{
  var inv = p.getInventory ? p.getInventory() : null;
  if(inv && inv.addItem){ inv.addItem(item); return; }
 }catch(err2){}
 try{
  if(p.dropItem){ p.dropItem(item); return; }
 }catch(err3){}
}

function importItemEntryToWorkingSlot(g, p, entry){
 try{
  var slots = g.getSlots();
  if(!slots || slots.length == 0) return;
  var old = slots[0].getStack();
  var nbt = String(entry.nbt || "");
  if(nbt == "") return;
  var it = p.getWorld().createItemFromNbt(API.stringToNbt(nbt));
  slots[0].setStack(it);
  if(old && !(old.isEmpty && old.isEmpty())) giveItemToPlayerSafe(p, old);
  if(entry.loreRows && entry.loreRows instanceof Array) writeRows(p, entry.loreRows);
  saveSlotItem(g, p);
  p.message("§aImported: " + String(entry.id || ""));
 }catch(err){}
}

function ensureCategoryConfig(p){
 var f = new File(getCategoryFile(p));
 if(f.exists()) return;
 writeCategoryConfig(p, cloneDefaultCategories());
}

function readCategoryConfig(p){
 ensureCategoryConfig(p);
 try{
  var txt = new java.lang.String(Files.readAllBytes(Paths.get(getCategoryFile(p))), StandardCharsets.UTF_8);
  var data = JSON.parse(String(txt));
  if(data && typeof data == "object") return data;
 }catch(err){}
 return cloneDefaultCategories();
}

function writeCategoryConfig(p, data){
 ensureDir(getRootDir(p));
 Files.write(Paths.get(getCategoryFile(p)), new java.lang.String(JSON.stringify(data, null, 1)).getBytes(StandardCharsets.UTF_8));
}

function cloneDefaultCategories(){
 var out = {};
 for(var k in DEFAULT_CATEGORIES) out[k] = DEFAULT_CATEGORIES[k].slice(0);
 return out;
}

function getCategoryNames(data){
 var out = [];
 for(var k in data) out.push(String(k));
 out.sort();
 return out;
}

function parseSubsCsv(s){
 var arr = String(s || "").split(",");
 var out = [];
 for(var i = 0; i < arr.length; i++){
  var t = sanitizeFileName(arr[i]);
  if(t != "" && out.indexOf(t) == -1) out.push(t);
 }
 return out;
}

function savePrefixSet(p, name){
 ensureDir(getPrefixDir(p));
 var rows = getRows(p);
 var prefixes = [];
 
 for(var i = 0; i < rows.length; i++){
  var r = normalizeRow(rows[i]);
  prefixes.push(String(r.prefix || ""));
 }
 var data = {id:String(name || ""), prefixes:prefixes};
 var path = getPrefixDir(p) + sanitizeFileName(name) + ".json";
 Files.write(Paths.get(path), new java.lang.String(JSON.stringify(data, null, 1)).getBytes(StandardCharsets.UTF_8));
 p.message("§aSaved prefix set");
}

function loadPrefixSetByIndex(p, index){
 ensureDir(getPrefixDir(p));
 var files = listPrefixFiles(p);
 var f = files[index];
 if(!f) return;
 try{
  // Read fresh each time. Some editors write via temp-file replace; also handle BOM / partial writes.
  var data = null;
  for(var attempt = 0; attempt < 3; attempt++){
   try{
    var txt = new java.lang.String(Files.readAllBytes(Paths.get(f.getPath())), StandardCharsets.UTF_8);
    var s = String(txt || "").replace(/^\uFEFF/, "").trim();
    if(s == "") throw "empty";
    data = JSON.parse(s);
    break;
   }catch(errTry){
    data = null;
    try{ java.lang.Thread.sleep(50); }catch(sleepErr){}
   }
  }
  if(data == null || typeof data != "object"){
   try{ p.message("§cLoad failed: invalid JSON (" + String(f.getName()) + ")"); }catch(msgErr){}
   return;
  }
  var segList = data && data.segments instanceof Array ? data.segments : null;
  var list = data && data.prefixes instanceof Array ? data.prefixes : [];
  // split/segments concept removed (2-split only). Keep segList compat for old exports.
  var rows = getRows(p);
  var max = rows.length;
  if(segList && segList.length > max) max = segList.length;
  else if(list.length > max) max = list.length;
  for(var i = 0; i < max; i++){
   ensureRowIndex(rows, i);
   var pref = "";
   if(segList){
    var o = segList[i];
    pref = String(o && o.segL != null ? o.segL : "");
   }else{
    pref = String(list[i] || "");
   }
   rows[i].prefix = pref;
  }
  trimRows(rows);
  writeRows(p, rows);
 }catch(err){}
}

function buildFinalLine(r){
 var prefix = decodeIssue(r && r.prefix != null ? r.prefix : "");
 var lore = decodeIssue(r && r.lore ? r.lore : "");
 return prefix + lore;
}

function decodeIssue(s){
 // Stored text uses ∮ (\u222e) for section sign. Convert to § (\u00a7) for final apply.
 return String(s || "").replace(/\u222e/g, "\u00a7");
}

function encodeIssue(s){
 // Convert § to ∮ when saving into tempdata/rows JSON.
 return String(s || "").replace(/\u00a7/g, "\u222e");
}

function uiIssue(s){
 // UI always shows ∮. § is only used internally on apply.
 return String(s || "").replace(/\u00a7/g, "\u222e");
}

function visibleLen(s){
 // Approximate: strip color codes (§x) then count chars
 return String(s || "").replace(/\u00a7./g, "").length;
}

function repeatSpace(n){
 if(n <= 0) return "";
 var out = "";
 for(var i = 0; i < n; i++) out += " ";
 return out;
}

function setMode(p, mode){ p.getTempdata().put(key.mode, mode); }
function getMode(p){ return String(p.getTempdata().get(key.mode) || MODE_HOME); }

function togglePrefixRow(p, absIndex){
 var arr = getPrefixOpen(p);
 arr[absIndex] = !(arr[absIndex] === true);
 p.getTempdata().put(key.prefix.open, JSON.stringify(arr));
}

function toggleAllVisibleRows(p){
 var arr = getPrefixOpen(p);
 var page = getPage(p);
 var start = page * CFG.perPage;
 var allOpen = true;
 for(var i = 0; i < CFG.perPage; i++) if(arr[start + i] !== true) { allOpen = false; break; }
 for(var j = 0; j < CFG.perPage; j++) arr[start + j] = !allOpen;
 p.getTempdata().put(key.prefix.open, JSON.stringify(arr));
}

function areAllVisibleRowsOpen(p){
 var arr = getPrefixOpen(p);
 var start = getPage(p) * CFG.perPage;
 for(var i = 0; i < CFG.perPage; i++) if(arr[start + i] !== true) return false;
 return true;
}

function getPrefixOpen(p){
 var raw = p.getTempdata().get(key.prefix.open);
 if(raw == null || String(raw) == "") return [];
 try{
  var arr = JSON.parse(String(raw));
  return arr instanceof Array ? arr : [];
 }catch(err){
  return [];
 }
}

function setPrefixOpen(p, arr){
 try{
  p.getTempdata().put(key.prefix.open, JSON.stringify(arr instanceof Array ? arr : []));
 }catch(err){}
}

function setPrefixVisible(p, flag){ p.getTempdata().put(key.prefix.visible, flag ? "1" : "0"); }
function isPrefixVisible(p){ return String(p.getTempdata().get(key.prefix.visible) || "1") == "1"; }

function blankRow(){ return createRow("", ""); }
function createRow(prefix, lore){
 return {prefix:encodeIssue(prefix), lore:encodeIssue(lore)};
}
function normalizeRow(r){
 if(!r || typeof r != "object") return blankRow();
 // Backward-compat: old objects may have segL/prefix + lore
 var prefix = r.prefix != null ? r.prefix : (r.segL != null ? r.segL : "");
 var lore = r.lore != null ? r.lore : "";
 return createRow(prefix, lore);
}

function ensureRowIndex(rows, idx){ while(rows.length <= idx) rows.push(blankRow()); }

function insertRowsAfter(rows, idx, extraRows){
 if(!extraRows || extraRows.length == 0) return;
 var args = [idx + 1, 0];
 for(var i = 0; i < extraRows.length; i++) args.push(extraRows[i]);
 Array.prototype.splice.apply(rows, args);
}

function trimRows(rows){
 while(rows.length > 0){
  var r = normalizeRow(rows[rows.length - 1]);
  if(buildFinalLine(r) == "") rows.pop();
  else break;
 }
}

// Split removed -> use trimRows() only.

function splitLines(text, maxCount){
 text = String(text || "").replace(/\r/g, "");
 if(text === "") return [];
 var arr = text.split("\n");
 if(maxCount != null && arr.length > maxCount) arr = arr.slice(0, maxCount);
 return arr;
}

function getEventComponentId(e){
 if(e.componentId != null) return e.componentId;
 if(e.textFieldId != null) return e.textFieldId;
 if(e.textfieldId != null) return e.textfieldId;
 if(e.id != null) return e.id;
 return -1;
}

function getRows(p){
 var raw = p.getTempdata().get(key.rows);
 if(raw == null || String(raw) == "") return [];
 try{
  var arr = JSON.parse(String(raw));
  return arr instanceof Array ? arr : [];
 }catch(err){
  return [];
 }
}

function writeRows(p, rows){ p.getTempdata().put(key.rows, JSON.stringify(rows || [])); }

// Split concept removed (2-split only).
// Split concept removed (2-split only).

function setPage(p, page){ p.getTempdata().put(key.page, String(page)); }
function getPage(p){ var raw = p.getTempdata().get(key.page); return raw == null ? 0 : (parseInt(String(raw), 10) || 0); }

function saveSlotItem(g, p){
 var slots = g.getSlots();
 if(!slots || slots.length == 0) return;
 var item = slots[0].getStack();
 if(!item || item.isEmpty && item.isEmpty()){
  p.getTempdata().remove(key.targetItem);
  return;
 }
 p.getTempdata().put(key.targetItem, item.getItemNbt().toJsonString());
}

function restoreSlotItem(g, p){
 var raw = p.getTempdata().get(key.targetItem);
 if(raw == null || String(raw) == "") return;
 var slots = g.getSlots();
 if(!slots || slots.length == 0) return;
 try{
  var item = p.getWorld().createItemFromNbt(API.stringToNbt(String(raw)));
  slots[0].setStack(item);
 }catch(err){}
}

function ensureDir(path){
 var f = new File(path);
 if(!f.exists()) f.mkdirs();
}

function listPrefixFiles(p){
 ensureDir(getPrefixDir(p));
 var dir = new File(getPrefixDir(p));
 var arr = dir.listFiles();
 var out = [];
 if(arr == null) return out;
 for(var i = 0; i < arr.length; i++){
  var f = arr[i];
  if(f.isFile() && String(f.getName()).toLowerCase().endsWith(".json")) out.push(f);
 }
 out.sort(function(a, b){ return String(a.getName()).compareToIgnoreCase(String(b.getName())); });
 return out;
}

function getRegisterCategory(p){
 var data = readCategoryConfig(p);
 var names = getCategoryNames(data);
 var idx = getInt(p, key.reg.cat);
 if(idx < 0 || idx >= names.length) idx = 0;
 return names.length > 0 ? names[idx] : "default";
}

function getRegisterSub(p){
 var data = readCategoryConfig(p);
 var cat = getRegisterCategory(p);
 var list = data[cat] instanceof Array ? data[cat] : ["default"];
 var idx = getInt(p, key.reg.sub);
 if(idx < 0 || idx >= list.length) idx = 0;
 return list[idx];
}

function cycleRegisterCategory(p, delta){
 var data = readCategoryConfig(p);
 var names = getCategoryNames(data);
 if(names.length == 0) return;
 var idx = getInt(p, key.reg.cat) + delta;
 if(idx < 0) idx = names.length - 1;
 if(idx >= names.length) idx = 0;
 setInt(p, key.reg.cat, idx);
 setInt(p, key.reg.sub, 0);
}

function cycleRegisterSub(p, delta){
 var data = readCategoryConfig(p);
 var cat = getRegisterCategory(p);
 var list = data[cat] instanceof Array ? data[cat] : ["default"];
 var idx = getInt(p, key.reg.sub) + delta;
 if(idx < 0) idx = list.length - 1;
 if(idx >= list.length) idx = 0;
 setInt(p, key.reg.sub, idx);
}

function getStatMainType(p){
 return STAT_MAIN_TYPES[getInt(p, key.stat.main)] || STAT_MAIN_TYPES[0];
}

function getStatSubIndex(p){
 var idx = getInt(p, key.stat.sub);
 var data = readCategoryConfig(p);
 var list = data[getStatMainType(p)] instanceof Array ? data[getStatMainType(p)] : (STAT_SUB_TYPES[getStatMainType(p)] || ["default"]);
 if(idx < 0) idx = 0;
 if(idx >= list.length) idx = 0;
 return idx;
}

function getStatSubType(p){
 var data = readCategoryConfig(p);
 var list = data[getStatMainType(p)] instanceof Array ? data[getStatMainType(p)] : (STAT_SUB_TYPES[getStatMainType(p)] || ["default"]);
 return list[getStatSubIndex(p)] || list[0];
}

function cycleMainType(p, delta){
 var idx = getInt(p, key.stat.main) + delta;
 if(idx < 0) idx = STAT_MAIN_TYPES.length - 1;
 if(idx >= STAT_MAIN_TYPES.length) idx = 0;
 setInt(p, key.stat.main, idx);
 setInt(p, key.stat.sub, 0);
}

function cycleSubType(p, delta){
 var data = readCategoryConfig(p);
 var list = data[getStatMainType(p)] instanceof Array ? data[getStatMainType(p)] : (STAT_SUB_TYPES[getStatMainType(p)] || ["default"]);
 var idx = getInt(p, key.stat.sub) + delta;
 if(idx < 0) idx = list.length - 1;
 if(idx >= list.length) idx = 0;
 setInt(p, key.stat.sub, idx);
}

function getArmorSlotFromSub(sub){
 if(sub == "head") return 5;
 if(sub == "chest") return 4;
 if(sub == "legs") return 3;
 if(sub == "boots") return 2;
 return 4;
}

function getBcSpeedLabel(v){
 var n = parseFloat(v || "0");
 if(isNaN(n)) n = -1.2;
 if(n <= -3.2) return "§8" + n.toFixed(1) + " §7(Very Slow)";
 if(n <= -2.4) return "§7" + n.toFixed(1) + " §7(Slow)";
 if(n <= -1.6) return "§f" + n.toFixed(1) + " §7(Normal)";
 if(n <= -1.0) return "§a" + n.toFixed(1) + " §7(Fast)";
 if(n <= -0.5) return "§6" + n.toFixed(1) + " §7(Very Fast)";
 return "§c" + n.toFixed(1) + " §7(Extreme)";
}

function sanitizeFileName(name){
 name = String(name || "").trim();
 name = name.replace(/[\\/:*?"<>|]/g, "_");
 return name;
}

function sanitizeFileNameOr(name, fallback){
 var s = sanitizeFileName(name);
 return s === "" ? String(fallback || "") : s;
}

function getInt(p, key){
 var raw = p.getTempdata().get(key);
 if(raw == null) return 0;
 return parseInt(String(raw), 10) || 0;
}

function setInt(p, key, v){ p.getTempdata().put(key, String(v)); }
function getStr(p, key){ return String(p.getTempdata().get(key) || ""); }
function setStr(p, key, v){ p.getTempdata().put(key, String(v)); }
function getBool(p, key){ return String(p.getTempdata().get(key) || "0") == "1"; }
function setBool(p, key, v){ p.getTempdata().put(key, v ? "1" : "0"); }

// Split concept removed (2-split only).

function addPanel(g, x, y, w, h, baseId){
 g.addColoredLine(baseId + 0, x, y, x + w, y, CFG.lineColor, 1);
 g.addColoredLine(baseId + 1, x + w, y, x + w, y + h, CFG.lineColor, 1);
 g.addColoredLine(baseId + 2, x, y + h, x + w, y + h, CFG.lineColor, 1);
 g.addColoredLine(baseId + 3, x, y, x, y + h, CFG.lineColor, 1);
}

function addSubUiBackground(g, id, x, y, w, h){
 try{
  g.addTexturedRect(id, CFG.subUi.bgTexture, x, y, w, h, CFG.subUi.bgTexX, CFG.subUi.bgTexY);
 }catch(err){}
}

function addInfoLabel(g, id, text, centerX, y, h){
 var x = Math.floor((centerX || 0) - CFG.gui.w / 2);
 addCenteredLabel(g, id, text, x, y, CFG.gui.w, h || 20);
}

function addCenteredLabel(g, id, text, x, y, w, h){
 var s = String(text || "");
 var out = s;
 if(out.length > 0 && out.charAt(0) != "§") out = "§f" + out;
 var lbl = g.addLabel(id, out, x, y, w, h);
 try{
  if(lbl && typeof lbl.setCentered === "function") lbl.setCentered(true);
 }catch(err){}
}
// Split concept removed (2-split only).
