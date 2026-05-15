// Shop runtime for Dochi shop JSON.
// - Static shop data lives in customnpcs/dc_data/dc_shops/*.json
// - Mutable stock/restock state lives in each NPC's storeddata
// - Dialogue go_shop opens with accessPolicy "dialogue_only"

var DcShopRuntimeModule = (function(){
  var OVERLAY_NAME = "dc_gui_runtime";
  var DEFAULT_HTML = "html/dc_util/dc_gui_runtime.html";
  var DEFAULT_GUI_JSON = "customnpcs/dc_data/dc_gui/shop_gui_default.json";

  var KEY = {
    ACTIVE: "dc_shop_active",
    CFG: "dc_shop_cfg",
    LAST_RESULT: "dc_shop_last_result"
  };

  var ShopAPI = Java.type("noppes.npcs.api.NpcAPI").Instance();

  function temp(player){return player.getTempdata();}

  function cleanPath(raw){
    var p = String(raw || "").replace(/\\/g, "/").replace(/^\s+|\s+$/g, "");
    while(p.charAt(0) === "/") p = p.substring(1);
    return p.replace(/\/+/g, "/");
  }

  function ensureJsonSuffix(path){
    var p = cleanPath(path);
    if(!p) return "";
    return /\.json$/i.test(p) ? p : p + ".json";
  }

  function normalizeShopPath(raw, shopId){
    var p = cleanPath(raw);
    if(!p && shopId) p = String(shopId || "");
    p = ensureJsonSuffix(p);
    if(!p) return "";
    if(p.indexOf("customnpcs/") === 0) return p;
    if(p.indexOf("dc_data/") === 0) return "customnpcs/" + p;
    if(p.indexOf("dc_shops/") === 0) return "customnpcs/dc_data/" + p;
    return "customnpcs/dc_data/dc_shops/" + p;
  }

  function normalizeGuiPath(raw){
    var p = cleanPath(raw);
    if(!p || p === "shop_gui_default") return DEFAULT_GUI_JSON;
    p = ensureJsonSuffix(p);
    if(p.indexOf("customnpcs/") === 0) return p;
    if(p.indexOf("dc_data/") === 0) return "customnpcs/" + p;
    if(p.indexOf("dc_gui/") === 0) return "customnpcs/dc_data/" + p;
    return "customnpcs/dc_data/dc_gui/" + p;
  }

  function readJson(path){
    if(typeof cfg_chk_resolveFile !== "function" || typeof cfg_chk_readJsonFile !== "function") throw new Error("dc_cfg_checker.js must be loaded before dc_shop_runtime.js");
    var f = cfg_chk_resolveFile(path, null);
    if(!f || !f.exists()) throw new Error("JSON file not found: " + String(path || ""));
    var payload = cfg_chk_readJsonFile(f);
    if(!payload || !payload.json) throw new Error("JSON file is empty: " + String(path || ""));
    return payload.json;
  }

  function fileExists(path){
    if(typeof cfg_chk_resolveFile !== "function") throw new Error("dc_cfg_checker.js must be loaded before dc_shop_runtime.js");
    var f = cfg_chk_resolveFile(path, null);
    return !!(f && f.exists && f.exists());
  }

  function pickWorld(player, npc){
    if(npc) return npc.getWorld();
    return player.getWorld();
  }

  function playerName(player){
    return String(player.getName());
  }

  function tell(player, message){
    var msg = String(message || "");
    if(!msg || !player) return;
    player.message(msg);
  }

  function getContext(target, maybeNpc, maybeOpts){
    var eventObj = target && target.player ? target : null;
    var player = eventObj ? eventObj.player : target;
    var npc = eventObj ? (eventObj.npc || maybeNpc) : maybeNpc;
    var opts = {};
    if(eventObj && maybeNpc && typeof maybeNpc === "object") opts = maybeNpc;
    else if(maybeOpts && typeof maybeOpts === "object") opts = maybeOpts;
    return { event: eventObj, player: player, npc: npc, world: pickWorld(player, npc), opts: opts || {} };
  }

  function getShopId(shop, fallback){
    var id = String((shop && (shop.shopId || shop.id)) || fallback || "");
    if(!id) throw new Error("Shop ID is required");
    id = id.replace(/[^A-Za-z0-9_\-:.]/g, "_");
    if(!id) throw new Error("Shop ID becomes empty after normalization");
    return id;
  }

  function getCategories(shop){
    if(!shop || !Array.isArray(shop.categories) || !shop.categories.length) throw new Error("Shop categories are required");
    var arr = shop.categories;
    var out = [];
    for(var i=0;i<arr.length;i++){
      var c = arr[i] || {};
      var id = String(c.id || "");
      if(!id) throw new Error("Shop category id is required at index " + i);
      out.push({ id: id, name: String(c.name || id) });
    }
    return out;
  }

  function getProducts(shop){
    if(!shop || !Array.isArray(shop.products)) throw new Error("Shop products array is required");
    var arr = shop.products;
    var out = [];
    for(var i=0;i<arr.length;i++){
      var p = arr[i] || {};
      if(p.enabled === false) continue;
      var id = String(p.id || "");
      if(!id) throw new Error("Shop product id is required at index " + i);
      if(!p.item || typeof p.item !== "object") throw new Error("Shop product item is required: " + id);
      var price = parseInt(String(p.price != null ? p.price : ""), 10);
      if(isNaN(price)) throw new Error("Shop product price is invalid: " + id);
      var base = parseInt(String(p.baseStock != null ? p.baseStock : (p.base != null ? p.base : -1)), 10);
      if(isNaN(base)) throw new Error("Shop product baseStock is invalid: " + id);
      var categoryId = String(p.categoryId || p.cat || "");
      if(!categoryId) throw new Error("Shop product categoryId is required: " + id);
      out.push({
        id: id,
        name: String(p.name || id),
        item: p.item,
        price: Math.max(0, price),
        baseStock: base,
        categoryId: categoryId,
        currency: p.currency && typeof p.currency === "object" ? p.currency : { type:"global" },
        text: p.text
      });
    }
    return out;
  }

  function findProduct(shop, productId){
    var list = getProducts(shop);
    for(var i=0;i<list.length;i++){
      if(String(list[i].id) === String(productId || "")) return list[i];
    }
    return null;
  }

  function productsForCategory(shop, categoryId){
    var list = getProducts(shop);
    var out = [];
    for(var i=0;i<list.length;i++){
      if(String(list[i].categoryId || "") === String(categoryId || "")) out.push(list[i]);
    }
    return out;
  }

  function firstCategoryId(shop){
    var cats = getCategories(shop);
    return cats[0].id;
  }

  function categoryExists(shop, categoryId){
    var cats = getCategories(shop);
    for(var i=0;i<cats.length;i++){
      if(String(cats[i].id) === String(categoryId || "")) return true;
    }
    return false;
  }

  function productText(product){
    if(!product) return "Select an item.";
    var t = product.text;
    if(Array.isArray(t)){
      var lines = [];
      for(var i=0;i<t.length;i++) lines.push(String(t[i] || ""));
      return lines.join("\n");
    }
    if(t != null) return String(t).split("@@").join("\n");
    return product.name;
  }

  function evalOneCondition(player, npc, cond){
    if(!cond || typeof cond !== "object") return true;
    var type = String(cond.type || "stored").toLowerCase();
    var op = String(cond.op || "==").toLowerCase();
    var key = String(cond.key || cond.id || "");
    var val = cond.value;
    if(type === "tag" && op === "hasn't") op = "not";
    if(type === "item" && op === "hasn't") op = "not";
    if(type === "stored" && typeof cond_stored === "function") return !!cond_stored(npc, player, op, key, val).pass;
    if(type === "tag" && typeof cond_tag === "function") return !!cond_tag(npc, player, op, key, val).pass;
    if(type === "item" && typeof cond_item === "function") return !!cond_item(npc, player, op, key, val).pass;
    if(type === "adv" && typeof cond_adv === "function") return !!cond_adv(npc, player, op, key, val).pass;
    if(type === "faction" && typeof cond_faction === "function") return !!cond_faction(npc, player, op, key, val).pass;
    if(type === "ftb" && typeof cond_ftb === "function") return !!cond_ftb(npc, player, op, key, val).pass;
    if(type === "ftb_task" && typeof cond_ftb === "function") return !!cond_ftb(npc, player, op, key, val, cond.task).pass;
    if(type === "cobblemon_party" && typeof cond_cobblemon_party === "function") return !!cond_cobblemon_party(npc, player, op, key, val).pass;
    if(type === "cobbledollar" && typeof cond_cobbledollar === "function") return !!cond_cobbledollar(npc, player, op, key, val).pass;
    throw new Error("Unsupported or unloaded shop condition type: " + type);
  }

  function evalConditions(player, npc, owner){
    if(!owner || typeof owner !== "object") return true;
    var list = Array.isArray(owner.conditions) ? owner.conditions : [];
    if(!list.length) return true;
    var mode = String(owner.conditionMode || owner.mode || "and").toLowerCase() === "or" ? "or" : "and";
    if(mode === "or"){
      for(var i=0;i<list.length;i++){
        if(evalOneCondition(player, npc, list[i])) return true;
      }
      return false;
    }
    for(var j=0;j<list.length;j++){
      if(!evalOneCondition(player, npc, list[j])) return false;
    }
    return true;
  }

  function stockStore(ctx){
    return ctx.npc.getStoreddata();
  }

  function stockKey(shopId, productId){
    return "dc_shop:stock:" + String(shopId || "shop") + ":" + String(productId || "");
  }

  function restockKey(shopId){
    return "dc_shop:last_restock:" + String(shopId || "shop");
  }

  function storeGet(store, key){
    var v = store.get(String(key));
    return v == null ? "" : String(v);
  }

  function storePut(store, key, value){
    store.put(String(key), String(value));
  }

  function baseStock(product){
    var n = parseInt(String(product && product.baseStock != null ? product.baseStock : -1), 10);
    return isNaN(n) ? -1 : n;
  }

  function getStock(ctx, shop, product){
    var base = baseStock(product);
    if(base < 0) return -1;
    var shopId = getShopId(shop, "");
    var store = stockStore(ctx);
    var key = stockKey(shopId, product.id);
    var raw = storeGet(store, key);
    if(raw === ""){
      storePut(store, key, base);
      return base;
    }
    var n = parseInt(raw, 10);
    return isNaN(n) ? base : n;
  }

  function setStock(ctx, shop, product, value){
    if(baseStock(product) < 0) return;
    var store = stockStore(ctx);
    storePut(store, stockKey(getShopId(shop, ""), product.id), Math.max(0, parseInt(String(value), 10) || 0));
  }

  function worldTick(ctx){
    return Number(ctx.world.getTotalTime() || 0);
  }

  function checkRestock(ctx, shop){
    var restock = shop && shop.restock && typeof shop.restock === "object" ? shop.restock : {};
    if(restock.enabled === false) return;
    var ticks = Math.max(1, parseInt(String(restock.ticks || 12000), 10) || 12000);
    var store = stockStore(ctx);
    var key = restockKey(getShopId(shop, ""));
    var now = worldTick(ctx);
    var lastRaw = storeGet(store, key);
    var last = parseInt(lastRaw || "0", 10) || 0;
    var products = getProducts(shop);
    for(var i=0;i<products.length;i++) getStock(ctx, shop, products[i]);
    if(now - last < ticks) return;
    for(var j=0;j<products.length;j++){
      var base = baseStock(products[j]);
      if(base >= 0) setStock(ctx, shop, products[j], base);
    }
    storePut(store, key, now);
  }

  function currencyFor(shop, product){
    var local = product && product.currency && typeof product.currency === "object" ? product.currency : null;
    var localType = String(local && local.type || "global").toLowerCase();
    if(local && localType && localType !== "global") return local;
    if(!shop || !shop.currency || typeof shop.currency !== "object") throw new Error("Shop currency is required");
    return shop.currency;
  }

  function currencyKind(currency){
    if(!currency || currency.type == null) throw new Error("Shop currency type is required");
    var t = String(currency.type).toLowerCase();
    if(t === "storeddata" || t === "stored_data" || t === "stored") return "storedData";
    if(t === "cobbledollar" || t === "cobble_dollar") return "cobbleDollar";
    if(t === "item") return "item";
    throw new Error("Unsupported shop currency type: " + t);
  }

  function currencyItemId(currency){
    var id = String(currency && currency.id || "");
    if(!id) throw new Error("Shop item currency id is required");
    return id;
  }

  function currencyStoredKey(currency){
    var key = String(currency && currency.key || "");
    if(!key) throw new Error("Shop storedData currency key is required");
    return key;
  }

  function currencyName(currency){
    var kind = currencyKind(currency);
    if(kind === "storedData") return currencyStoredKey(currency);
    if(kind === "cobbleDollar") return "CobbleDollar";
    var id = currencyItemId(currency);
    var parts = id.split(":");
    return parts.length > 1 ? parts[1] : id;
  }

  function getMoney(ctx, currency){
    var kind = currencyKind(currency);
    if(kind === "storedData"){
      var store = ctx.player.getStoreddata();
      return parseInt(store.get(currencyStoredKey(currency)) || "0", 10) || 0;
    }
    if(kind === "cobbleDollar") throw new Error("CobbleDollar shop currency needs an explicit balance API before it can be used");
    var id = currencyItemId(currency);
    var stack = ctx.world.createItem(id, 1);
    return ctx.player.getInventory().count(stack, true, true);
  }

  function pay(ctx, currency, amount){
    var kind = currencyKind(currency);
    var n = Math.max(0, parseInt(String(amount || 0), 10) || 0);
    if(!n) return true;
    var before = getMoney(ctx, currency);
    if(kind !== "cobbleDollar" && before < n) return false;
    if(kind === "storedData"){
      var store = ctx.player.getStoreddata();
      store.put(currencyStoredKey(currency), String(before - n));
      return true;
    }
    if(kind === "cobbleDollar"){
      throw new Error("CobbleDollar shop currency needs an explicit balance API before it can be used");
    }
    ShopAPI.executeCommand(ctx.world, "clear " + playerName(ctx.player) + " " + currencyItemId(currency) + " " + n);
    return true;
  }

  function productItemId(product){
    var item = product && product.item && typeof product.item === "object" ? product.item : {};
    if(String(item.type || "id").toLowerCase() === "json"){
      var raw = item.json;
      var obj = raw && typeof raw === "object" ? raw : null;
      if(!obj && raw){
        obj = JSON.parse(String(raw));
      }
      if(obj){
        var jsonId = String(obj.id || obj.item || obj.itemId || obj.Name || "");
        if(!jsonId) throw new Error("Shop product JSON item id is required: " + product.id);
        return jsonId;
      }
    }
    var id = String(item.id || "");
    if(!id) throw new Error("Shop product item id is required: " + product.id);
    return id;
  }

  function giveProduct(ctx, product, qty){
    var id = productItemId(product);
    var count = Math.max(1, parseInt(String(qty || 1), 10) || 1);
    ctx.player.giveItem(ctx.world.createItem(id, count));
    return true;
  }

  function itemSlotCapacity(item, fallback){
    var slotBase = Math.max(Number(item.choiceWidth || 0), Number(item.choiceHeight || 0), 24);
    var slotSize = Math.max(1, Math.round(slotBase));
    var gapY = Math.max(0, Number(item.choiceGapY || 0));
    var height = Math.max(slotSize, Number(item.h || 0));
    var layout = String(item.choiceSlotLayout || "").toLowerCase();
    if(layout === "list"){
      var infoGapX = Math.max(0, Number(item.choiceGapX || 0));
      var stockPriceGapX = Math.max(0, Number(item.choicePriceGapY != null ? item.choicePriceGapY : 24));
      var stockWidth = Math.max(42, Number(item.choiceStockWidth != null ? item.choiceStockWidth : 72));
      var priceWidth = Math.max(42, Number(item.choicePriceWidth != null ? item.choicePriceWidth : 84));
      var colGapX = Math.max(0, Number(item.choiceInfoGapX != null ? item.choiceInfoGapX : 24));
      var cellW = slotSize + infoGapX + stockWidth + stockPriceGapX + priceWidth;
      var widthList = Math.max(cellW, Number(item.w || 0));
      var colsList = Math.max(1, Math.floor((widthList + colGapX) / (cellW + colGapX)));
      var rowsList = Math.max(1, Math.floor((height + gapY) / (slotSize + gapY)));
      return Math.max(1, colsList * rowsList);
    }
    var gapX = Math.max(0, Number(item.choiceGapX || 0));
    var width = Math.max(slotSize, Number(item.w || 0));
    var cols = Math.max(1, Math.floor((width + gapX) / (slotSize + gapX)));
    var rows = Math.max(1, Math.floor((height + gapY) / (slotSize + gapY)));
    return Math.max(1, cols * rows);
  }

  function roleChoiceCount(guiJson, role, fallback){
    var elements = Array.isArray(guiJson && guiJson.elements) ? guiJson.elements : [];
    for(var i=0;i<elements.length;i++){
      var item = elements[i] || {};
      if(String(item.shopRole || "") === String(role || "")){
        if(String(role || "") === "item_slots") return itemSlotCapacity(item, fallback);
        var n = parseInt(String(item.choiceCount || fallback), 10);
        return isNaN(n) || n < 1 ? fallback : n;
      }
    }
    return fallback;
  }

  function makeChoice(label, role, data, index){
    return {
      label: String(label || ""),
      role: String(role || ""),
      index: index,
      data: data || {}
    };
  }

  function stockText(ctx, shop, product){
    if(!product) return "Stock: -";
    var s = getStock(ctx, shop, product);
    return s < 0 ? "Stock: ∞" : "Stock: " + s;
  }

  function balanceText(ctx, currency){
    var money = getMoney(ctx, currency);
    return "Money: " + money + " (" + currencyName(currency) + ")";
  }

  function stockLabel(ctx, shop, product){
    var stock = getStock(ctx, shop, product);
    return stock < 0 ? "∞" : String(stock);
  }

  function productChoiceData(ctx, shop, product, action, mcSlot){
    var currency = currencyFor(shop, product);
    var kind = currencyKind(currency);
    var itemCurrency = kind === "item";
    var data = {
      shopAction: String(action || "select"),
      productId: String(product.id || ""),
      itemId: productItemId(product),
      itemCount: 1,
      itemName: String(product.name || product.id || ""),
      price: product.price,
      priceText: itemCurrency ? String(product.price) : String(product.price) + " " + currencyName(currency),
      stock: getStock(ctx, shop, product),
      stockText: stockLabel(ctx, shop, product),
      currencyType: kind,
      currencyName: currencyName(currency)
    };
    if(itemCurrency){
      data.currencyItemId = currencyItemId(currency);
      data.currencyItemCount = 1;
    }
    var slot = parseInt(String(mcSlot), 10);
    if(!isNaN(slot) && slot >= 0) data.mcSlot = slot;
    return data;
  }

  function buildBindings(ctx, shop, active){
    var cats = getCategories(shop);
    var selectedCategory = String(active.categoryId || "");
    if(!categoryExists(shop, selectedCategory)) selectedCategory = firstCategoryId(shop);
    var pageSize = Math.max(1, parseInt(String(active.pageSize || 8), 10) || 8);
    var catProducts = productsForCategory(shop, selectedCategory);
    var maxPage = Math.max(0, Math.ceil(catProducts.length / pageSize) - 1);
    var page = Math.max(0, Math.min(maxPage, parseInt(String(active.page || 0), 10) || 0));
    var selected = findProduct(shop, active.selectedProductId);
    var currency = currencyFor(shop, selected || null);
    var textMessage = String(active.message || "");
    if(!textMessage) textMessage = selected ? productText(selected) : "Select an item.";

    var categoryChoices = [];
    for(var i=0;i<cats.length;i++){
      var c = cats[i];
      var label = (String(c.id) === selectedCategory ? "> " : "") + c.name;
      categoryChoices.push(makeChoice(label, "category_buttons", { shopAction:"category", categoryId:c.id }, i));
    }

    var itemChoices = [];
    var start = page * pageSize;
    var selectedVisibleSlot = -1;
    for(var j=0;j<pageSize;j++){
      var product = catProducts[start + j];
      if(product){
        if(selected && String(product.id || "") === String(selected.id || "")) selectedVisibleSlot = j;
        itemChoices.push(makeChoice(product.name, "item_slots", productChoiceData(ctx, shop, product, "select"), start + j));
      }else{
        itemChoices.push(makeChoice("", "item_slots", { shopAction:"noop" }, start + j));
      }
    }
    var selectedChoice = selected
      ? makeChoice(selected.name, "selected_slot", productChoiceData(ctx, shop, selected, "noop", selectedVisibleSlot), 0)
      : makeChoice("", "selected_slot", { shopAction:"noop" }, 0);

    return {
      shop: {
        shopId: getShopId(shop, active.shopId),
        text: {
          title: String(shop.name || shop.shopName || getShopId(shop, active.shopId)),
          message: textMessage,
          selected_slot: selected ? selected.name : "No item",
          price: selected ? ("Price: " + selected.price + " " + currencyName(currency)) : "Price: -",
          stock: stockText(ctx, shop, selected),
          balance: balanceText(ctx, currency)
        },
        choices: {
          category_buttons: categoryChoices,
          item_slots: itemChoices,
          selected_slot: [selectedChoice],
          buy_button: [makeChoice("Buy", "buy_button", { shopAction:"buy" }, 0)],
          page_nav: [
            makeChoice("Prev", "page_nav", { shopAction:"page_prev" }, 0),
            makeChoice("Next", "page_nav", { shopAction:"page_next" }, 1)
          ]
        }
      }
    };
  }

  function setActive(player, cfgObj){
    var td = temp(player);
    td.put(KEY.ACTIVE, "1");
    td.put(KEY.CFG, JSON.stringify(cfgObj || {}));
  }

  function clearActive(player){
    var td = temp(player);
    td.remove(KEY.ACTIVE);
    td.remove(KEY.CFG);
  }

  function getActive(player){
    var td = temp(player);
    if(!td || td.get(KEY.ACTIVE) !== "1") return null;
    var raw = td.get(KEY.CFG);
    if(!raw) return null;
    return JSON.parse(String(raw));
  }

  function setLastResult(player, result){
    var td = temp(player);
    td.put(KEY.LAST_RESULT, JSON.stringify(result || {}));
  }

  function closeHtmlGui(player){
    var br = cnpcext.getClientBridge(player.getMCEntity());
    br.closeHtmlGui();
    return true;
  }

  function sendToBrowser(player, eventName, payload){
    var br = cnpcext.getClientBridge(player.getMCEntity());
    try{
      br.sendToBrowser(player.getMCEntity(), String(eventName || ""), JSON.stringify(payload || {}));
      return true;
    }catch(err0){}
    br.sendToBrowser(String(eventName || ""), JSON.stringify(payload || {}));
    return true;
  }

  function sendShopUpdate(ctx, shop, active, forceReopen){
    var guiJson = readJson(active.guiJsonPath);
    var payload = {
      __overlayName: OVERLAY_NAME,
      type: "dcDialogueUpdate",
      sessionId: String(active.sessionId || ""),
      bindings: buildBindings(ctx, shop, active)
    };
    if(typeof DcGuiRuntimeModule === "undefined" || !DcGuiRuntimeModule || typeof DcGuiRuntimeModule.buildInitData !== "function"){
      throw new Error("dc_gui_runtime.js must be loaded before dc_shop_runtime.js");
    }
    var data = DcGuiRuntimeModule.buildInitData({ player:ctx.player, npc:ctx.npc }, guiJson, {
      sessionId: active.sessionId,
      bindings: payload.bindings
    });
    if(data && typeof data === "object"){
      for(var k in data){
        if(Object.prototype.hasOwnProperty.call(data, k)) payload[k] = data[k];
      }
      payload.type = "dcDialogueUpdate";
    }
    if(!forceReopen){
      setActive(ctx.player, active);
      return sendToBrowser(ctx.player, "dcDialogueUpdate", payload);
    }
    active.reopenCloseSkips = (parseInt(String(active.reopenCloseSkips || "0"), 10) || 0) + 1;
    active.reopeningUntil = Date.now() + 5000;
    setActive(ctx.player, active);
    try{
      if(ctx && ctx.event && typeof cnpcext !== "undefined" && cnpcext && typeof cnpcext.openHtmlGui === "function"){
        var h = cnpcext.openHtmlGui(ctx.event, String(active.htmlPath || DEFAULT_HTML), 0, 0, JSON.stringify(data || payload));
        setActive(ctx.player, active);
        if(h != null) return true;
      }
    }catch(errReopen){}
    return sendToBrowser(ctx.player, "dcDialogueUpdate", payload);
  }

  function open(target, maybeNpc, maybeOpts){
    var ctx = getContext(target, maybeNpc, maybeOpts);
    if(!ctx || !ctx.player || !ctx.npc || !ctx.world) throw new Error("dc_shop_open requires player, npc, and world context");
    if(typeof openDcGuiRuntime !== "function") throw new Error("dc_gui_runtime.js must be loaded before dc_shop_runtime.js");

    var opts = ctx.opts || {};
    var shopPath = normalizeShopPath(opts.shopJsonPath || opts.path || "", opts.shopId || "");
    var shop = readJson(shopPath);

    var accessPolicy = String(opts.accessPolicy || "shop_guard");
    if(accessPolicy !== "dialogue_only"){
      var access = shop.access && typeof shop.access === "object" ? shop.access : {};
      if(!evalConditions(ctx.player, ctx.npc, access)){
        tell(ctx.player, String(access.failMessage || "You cannot use this shop yet."));
        return null;
      }
    }

    checkRestock(ctx, shop);

    var guiReq = "";
    if(opts.guiJsonPath) guiReq = opts.guiJsonPath;
    else if(shop.gui && typeof shop.gui === "object"){
      guiReq = shop.gui.guiJsonPath || shop.gui.guiOffset || shop.gui.path || "";
    }
    var guiPath = normalizeGuiPath(guiReq);
    if(!fileExists(guiPath)) throw new Error("Shop GUI JSON not found: " + guiPath);
    var guiJson = readJson(guiPath);

    var categoryId = firstCategoryId(shop);
    var pageSize = roleChoiceCount(guiJson, "item_slots", 8);
    var sessionId = String(Date.now() + "_" + Math.floor(Math.random() * 900000 + 100000));
    var active = {
      sessionId: sessionId,
      overlayName: OVERLAY_NAME,
      shopId: getShopId(shop, opts.shopId),
      shopJsonPath: shopPath,
      guiJsonPath: guiPath,
      categoryId: categoryId,
      selectedProductId: "",
      page: 0,
      pageSize: pageSize,
      htmlPath: String(opts.htmlPath || DEFAULT_HTML),
      accessPolicy: accessPolicy,
      source: String(opts.source || "shop"),
      message: "Select an item.",
      openedAt: Date.now()
    };

    closeHtmlGui(ctx.player);
    setActive(ctx.player, active);

    var openTarget = ctx.event || { player: ctx.player, npc: ctx.npc };
    var handle = openDcGuiRuntime(openTarget, {
      guiJsonPath: guiPath,
      htmlPath: String(opts.htmlPath || DEFAULT_HTML),
      sessionId: sessionId,
      bindings: buildBindings(ctx, shop, active)
    });
    if(handle == null) throw new Error("openDcGuiRuntime returned null for shop GUI: " + guiPath);
    return handle;
  }

  function handleBuy(ctx, shop, active){
    var product = findProduct(shop, active.selectedProductId);
    if(!product){
      active.message = "Select an item first.";
      return;
    }
    var stock = getStock(ctx, shop, product);
    if(stock === 0){
      active.message = "Out of stock.";
      return;
    }
    var qty = 1;
    var currency = currencyFor(shop, product);
    var cost = product.price * qty;
    var money = getMoney(ctx, currency);
    if(money < cost){
      active.message = "You don't have enough money.";
      return;
    }
    if(!pay(ctx, currency, cost)){
      active.message = "Payment failed.";
      return;
    }
    if(!giveProduct(ctx, product, qty)){
      active.message = "Item delivery failed.";
      return;
    }
    if(stock > 0) setStock(ctx, shop, product, stock - qty);
    active.message = "Purchased " + product.name + ".";
  }

  function handleHtmlEvent(e){
    if(!e || !e.player) return null;
    var player = e.player;
    var npc = e.npc || null;
    var active = getActive(player);
    if(!active) return null;

    var payload = e.data;
    if(typeof payload === "string"){
      payload = JSON.parse(String(payload));
    }
    payload = payload && typeof payload === "object" ? payload : {};
    if(payload.__overlayName && String(payload.__overlayName) !== String(active.overlayName || OVERLAY_NAME)) return null;
    if(payload.sessionId && active.sessionId && String(payload.sessionId) !== String(active.sessionId)) return null;

    var evName = String(e.eventName || payload.__event || "");
    if(evName === "__guiClosed" || evName === "done"){
      var skipClose = parseInt(String(active.reopenCloseSkips || "0"), 10) || 0;
      var reopenUntil = parseInt(String(active.reopeningUntil || "0"), 10) || 0;
      if(skipClose > 0 && reopenUntil && Date.now() < reopenUntil){
        active.reopenCloseSkips = skipClose - 1;
        setActive(player, active);
        return { handled:true, result: { done:false, reason:"refreshing" } };
      }
      if(reopenUntil && Date.now() < reopenUntil){
        return { handled:true, result: { done:false, reason:"refreshing" } };
      }
      clearActive(player);
      var closed = { done:true, reason:"closed" };
      setLastResult(player, closed);
      return { handled:true, result: closed };
    }
    if(evName !== "choice") return null;

    var dataObj = payload.data;
    if(typeof dataObj === "string"){
      dataObj = JSON.parse(String(dataObj));
    }
    dataObj = dataObj && typeof dataObj === "object" ? dataObj : {};
    var action = String(dataObj.shopAction || "");

    var ctx = { player: player, npc: npc, world: pickWorld(player, npc), event: e, opts:{} };
    var shop = readJson(String(active.shopJsonPath || ""));
    checkRestock(ctx, shop);
    var forceReopen = false;

    if(action === "category"){
      active.categoryId = String(dataObj.categoryId || firstCategoryId(shop));
      active.page = 0;
      active.selectedProductId = "";
      active.message = "Select an item.";
      forceReopen = true;
    }else if(action === "select"){
      active.selectedProductId = String(dataObj.productId || "");
      active.message = productText(findProduct(shop, active.selectedProductId));
    }else if(action === "page_prev"){
      active.page = Math.max(0, (parseInt(String(active.page || 0), 10) || 0) - 1);
      forceReopen = true;
    }else if(action === "page_next"){
      var list = productsForCategory(shop, active.categoryId);
      var pageSize = Math.max(1, parseInt(String(active.pageSize || 8), 10) || 8);
      var maxPage = Math.max(0, Math.ceil(list.length / pageSize) - 1);
      active.page = Math.min(maxPage, (parseInt(String(active.page || 0), 10) || 0) + 1);
      forceReopen = true;
    }else if(action === "buy"){
      handleBuy(ctx, shop, active);
    }

    sendShopUpdate(ctx, shop, active, forceReopen);
    var result = { done:false, reason:"shop_choice", action:action };
    setLastResult(player, result);
    return { handled:true, result: result };
  }

  return {
    open: open,
    handleHtmlEvent: handleHtmlEvent,
    getActive: getActive,
    closeHtml: closeHtmlGui
  };
})();

function dc_shop_open(e, opts){ return DcShopRuntimeModule.open(e, null, opts || {}); }
function dc_shop_handleHtmlEvent(e){ return DcShopRuntimeModule.handleHtmlEvent(e); }

function dc_shop_runtime_module(){
  return {
    events: {
      htmlGuiEvent: function(e){ dc_shop_handleHtmlEvent(e); }
    }
  };
}

if(typeof NpcEventModule !== "undefined" && NpcEventModule && typeof NpcEventModule.registerModule === "function"){
  NpcEventModule.registerModule("dc_shop_runtime", dc_shop_runtime_module());
}else{
  if(typeof __DcNpcEventPendingModules === "undefined" || !__DcNpcEventPendingModules) var __DcNpcEventPendingModules = [];
  __DcNpcEventPendingModules.push({
    name: "dc_shop_runtime",
    module: dc_shop_runtime_module()
  });
}
