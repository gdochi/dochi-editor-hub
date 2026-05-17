var ShopItemEditorAPI = Java.type("noppes.npcs.api.NpcAPI").Instance()

var ShopItemEditorModule = (function(){
  var ADDON_ID = "dc_shop_item_editor"
  var GUI_ID = 734
  var GUI_W = 430
  var GUI_H = 326
  var PAGE_SIZE = 6
  var sessions = {}

  var TEMP = {
    ADDON_ID:"npc_editor_addon_edit_id",
    NPC_UUID:"npc_editor_addon_edit_npc_uuid",
    JSON_PATH:"npc_editor_addon_edit_json_path",
    PREFIX:"npc_editor_addon_edit_prefix"
  }

  var ID = {
    BTN_SAVE:20,
    BTN_CLOSE:21,
    BTN_PREV:22,
    BTN_NEXT:23,
    BTN_ITEM_ID:30,
    BTN_ITEM_NBT:31,
    BTN_CUR_ID:32,
    BTN_CUR_NBT:33,
    BTN_ROW_START:100,
    TXT_PRICE:200,
    TXT_STOCK:201,
    TXT_RESTOCK:202
  }

  function key(player){
    return String(player.getUUID())
  }

  function toInt(value, fallback){
    var n = parseInt(String(value), 10)
    return isNaN(n) ? fallback : n
  }

  function cleanPath(path){
    var p = String(path || "").replace(/\\/g, "/").replace(/^\s+|\s+$/g, "")
    while(p.charAt(0) === "/") p = p.substring(1)
    return p.replace(/\/+/g, "/")
  }

  function normalizeShopPath(path){
    var p = cleanPath(path)
    if(!p) return ""
    if(p.indexOf("customnpcs/") === 0) return p
    if(p.indexOf("dc_data/") === 0) return "customnpcs/" + p
    if(p.indexOf("dc_shops/") === 0) return "customnpcs/dc_data/" + p
    return "customnpcs/dc_data/dc_shops/" + (/\.json$/i.test(p) ? p : p + ".json")
  }

  function resolveFile(path){
    var normalized = normalizeShopPath(path)
    if(typeof cfg_chk_resolveFile === "function") return cfg_chk_resolveFile(normalized, null)
    var File = Java.type("java.io.File")
    return new File(normalized)
  }

  function readTextFile(file){
    var Files = Java.type("java.nio.file.Files")
    var StandardCharsets = Java.type("java.nio.charset.StandardCharsets")
    var raw = new java.lang.String(Files.readAllBytes(file.toPath()), StandardCharsets.UTF_8)
    raw = String(raw || "")
    if(raw.length && raw.charCodeAt(0) === 65279) raw = raw.substring(1)
    return raw
  }

  function writeTextFile(file, text){
    var FileWriter = Java.type("java.io.FileWriter")
    var parent = file.getParentFile()
    var fw = null
    try{
      if(parent && !parent.exists()) parent.mkdirs()
      fw = new FileWriter(file, false)
      fw.write(String(text || ""))
      fw.flush()
    }finally{
      if(fw) fw.close()
    }
  }

  function readShop(path){
    var file = resolveFile(path)
    if(!file || !file.exists()) throw new Error("Shop JSON not found: " + normalizeShopPath(path))
    return { file:file, json:JSON.parse(readTextFile(file)) }
  }

  function saveShop(session){
    writeTextFile(session.file, JSON.stringify(session.shop, null, 2))
  }

  function shopId(shop){
    return String((shop && (shop.shopId || shop.id)) || "shop")
  }

  function products(shop){
    return shop && shop.products instanceof Array ? shop.products : []
  }

  function selectedProduct(session){
    var list = products(session.shop)
    if(session.index < 0) session.index = 0
    if(session.index >= list.length) session.index = Math.max(0, list.length - 1)
    return list[session.index] || null
  }

  function productItem(product){
    if(product && product.item && typeof product.item === "object") return product.item
    return { type:"id", id:"minecraft:stone", count:1 }
  }

  function itemMode(spec){
    var t = String(spec && (spec.type || spec.mode) || "").toLowerCase()
    return t === "nbt" || t === "snbt" ? "nbt" : "id"
  }

  function itemCount(product, spec){
    var raw = spec && spec.count != null ? spec.count : (spec && spec.Count != null ? spec.Count : (product && product.count != null ? product.count : 1))
    var n = toInt(raw, 1)
    if(n < 1) n = 1
    if(n > 64) n = 64
    return n
  }

  function stackNbt(stack){
    try{
      var nbt = stack.getItemNbt()
      if(nbt && typeof nbt.toJsonString === "function") return String(nbt.toJsonString())
    }catch(err1){}
    return ""
  }

  function idFromNbtText(nbt){
    var raw = String(nbt || "")
    var m = raw.match(/(?:^|[,{])\s*id\s*:\s*"([^"]+)"/)
    if(m && m[1]) return String(m[1])
    m = raw.match(/"id"\s*:\s*"([^"]+)"/)
    if(m && m[1]) return String(m[1])
    return ""
  }

  function stackItemId(stack){
    var nbt = stackNbt(stack)
    var id = idFromNbtText(nbt)
    if(id) return id
    try{ id = String(stack.getName()) }catch(err1){ id = "" }
    if(id && id.indexOf(":") >= 0) return id
    try{ id = String(stack.getItemName()) }catch(err2){ id = "" }
    return id || "minecraft:stone"
  }

  function stackCount(stack){
    try{ return Math.max(1, Math.min(64, toInt(stack.getStackSize(), 1))) }catch(err1){}
    return 1
  }

  function createStack(world, spec, count){
    spec = spec && typeof spec === "object" ? spec : {}
    var mode = itemMode(spec)
    var id = String(spec.id || "")
    var nbt = String(spec.nbt || spec.snbt || "")
    var n = Math.max(1, Math.min(64, toInt(count || spec.count || spec.Count || 1, 1)))
    try{
      if(mode === "nbt" && nbt){
        var item = world.createItemFromNbt(ShopItemEditorAPI.stringToNbt(nbt))
        if(item && typeof item.setStackSize === "function") item.setStackSize(n)
        return item
      }
      if(id) return world.createItem(id, n)
    }catch(err){}
    return null
  }

  function effectiveCurrency(shop, product){
    var c = product && product.currency && typeof product.currency === "object" ? product.currency : null
    if(c && String(c.type || "").toLowerCase() !== "global") return c
    return shop && shop.currency && typeof shop.currency === "object" ? shop.currency : { type:"item", id:"minecraft:emerald" }
  }

  function currencyItemSpec(currency){
    if(currency && currency.item && typeof currency.item === "object") return currency.item
    return currency || {}
  }

  function currencyKind(currency){
    return String(currency && currency.type || "item").toLowerCase()
  }

  function getText(gui, id, fallback){
    var c = null
    try{ c = gui.getComponent(id) }catch(err1){}
    if(c && typeof c.getText === "function"){
      try{ return String(c.getText()) }catch(err2){}
    }
    if(c && c.text != null) return String(c.text)
    return String(fallback == null ? "" : fallback)
  }

  function setText(component, value){
    try{ if(component && typeof component.setText === "function") component.setText(String(value)) }catch(err){}
  }

  function getSlotStack(gui, index){
    var slots = null
    var slot = null
    try{ slots = gui.getSlots() }catch(err1){}
    if(!slots) return null
    try{ if(slots.size() <= index) return null }catch(err2){}
    try{ slot = slots.get(index) }catch(err3){}
    if(!slot) return null
    try{ if(slot.hasStack()) return slot.getStack() }catch(err4){}
    return null
  }

  function makeItemSpecFromStack(stack, mode){
    var id = stackItemId(stack)
    var nbt = stackNbt(stack)
    var count = stackCount(stack)
    var out = { type:mode === "nbt" ? "nbt" : "id", id:id, count:count }
    if(out.type === "nbt") out.nbt = nbt
    return out
  }

  function makeCurrencyFromStack(stack, mode){
    var item = makeItemSpecFromStack(stack, mode)
    var out = { type:"item", id:item.id, item:item }
    if(item.type === "nbt") out.nbt = item.nbt
    return out
  }

  function restockTicks(shop){
    var restock = shop && shop.restock && typeof shop.restock === "object" ? shop.restock : {}
    return toInt(restock.ticks || 12000, 12000)
  }

  function setRestockTicks(shop, ticks){
    if(!shop.restock || typeof shop.restock !== "object") shop.restock = {}
    shop.restock.enabled = shop.restock.enabled !== false
    shop.restock.ticks = Math.max(1, toInt(ticks, 12000))
  }

  function stockKey(session, product){
    return "dc_shop:stock:" + shopId(session.shop) + ":" + String(product && product.id || "")
  }

  function currentStockText(session, product){
    if(!session.npc || !product) return "-"
    try{
      var v = session.npc.getStoreddata().get(stockKey(session, product))
      if(v == null || String(v) === "") return "-"
      return String(v)
    }catch(err){}
    return "-"
  }

  function open(target){
    var player = target && target.player ? target.player : null
    if(!player) return false
    var temp = player.getTempdata()
    var jsonPath = cleanPath((target && target.jsonPath) || temp.get(TEMP.JSON_PATH) || "")
    var parsed = readShop(jsonPath)
    var k = key(player)
    sessions[k] = {
      player:player,
      npc:target.npc || null,
      npcUuid:String((target && target.uuid) || temp.get(TEMP.NPC_UUID) || ""),
      jsonPath:jsonPath,
      file:parsed.file,
      shop:parsed.json,
      index:0,
      page:0,
      itemMode:"",
      currencyMode:""
    }
    showEditor(player)
    return true
  }

  function showEditor(player){
    var session = sessions[key(player)]
    if(!session) return
    var list = products(session.shop)
    var product = selectedProduct(session)
    var item = productItem(product)
    var currency = effectiveCurrency(session.shop, product)
    var curSpec = currencyItemSpec(currency)
    var start = session.page * PAGE_SIZE
    var g = ShopItemEditorAPI.createCustomGui(GUI_ID, GUI_W, GUI_H, false, player)
    var title = String(session.shop.name || session.shop.shopName || shopId(session.shop))
    var mode = session.itemMode || itemMode(item)
    var curMode = session.currencyMode || itemMode(curSpec)
    var priceField, stockField, restockField, stack, curStack, i, p, rowId, rowLabel

    g.addLabel(1, "Shop Item Editor", 8, 6, 160, 12)
    g.addLabel(2, title, 8, 20, 220, 12)
    g.addLabel(3, "JSON: " + session.jsonPath, 8, 34, 340, 12)

    for(i=0;i<PAGE_SIZE;i++){
      p = list[start + i]
      rowId = ID.BTN_ROW_START + i
      rowLabel = p ? ((start + i === session.index ? "> " : "") + String(p.name || p.id || ("item " + (start + i)))) : "-"
      g.addButton(rowId, rowLabel, 8, 54 + i * 20, 148, 18)
    }
    g.addButton(ID.BTN_PREV, "<", 8, 180, 34, 18)
    g.addButton(ID.BTN_NEXT, ">", 46, 180, 34, 18)

    if(product){
      g.addLabel(10, "Product: " + String(product.id || ""), 170, 54, 230, 12)
      g.addLabel(11, "Item Slot", 170, 70, 80, 12)
      stack = createStack(player.getWorld(), item, itemCount(product, item))
      if(stack) g.addItemSlot(170, 84, stack)
      else g.addItemSlot(170, 84)
      g.addButton(ID.BTN_ITEM_ID, mode === "id" ? "[ID]" : "ID", 198, 84, 42, 18)
      g.addButton(ID.BTN_ITEM_NBT, mode === "nbt" ? "[NBT]" : "NBT", 244, 84, 54, 18)

      g.addLabel(12, "Price", 170, 112, 70, 12)
      priceField = g.addTextField(ID.TXT_PRICE, 220, 108, 70, 18)
      setText(priceField, String(product.price != null ? product.price : 0))
      g.addLabel(13, "Base Stock", 300, 112, 80, 12)
      stockField = g.addTextField(ID.TXT_STOCK, 368, 108, 50, 18)
      setText(stockField, String(product.baseStock != null ? product.baseStock : -1))
      g.addLabel(14, "Current Stock: " + currentStockText(session, product), 170, 132, 180, 12)

      g.addLabel(15, "Restock Ticks", 170, 152, 90, 12)
      restockField = g.addTextField(ID.TXT_RESTOCK, 260, 148, 80, 18)
      setText(restockField, String(restockTicks(session.shop)))

      g.addLabel(16, "Currency Slot", 170, 176, 90, 12)
      if(currencyKind(currency) === "item") curStack = createStack(player.getWorld(), curSpec, 1)
      if(curStack) g.addItemSlot(170, 190, curStack)
      else g.addItemSlot(170, 190)
      g.addButton(ID.BTN_CUR_ID, curMode === "id" ? "[ID]" : "ID", 198, 190, 42, 18)
      g.addButton(ID.BTN_CUR_NBT, curMode === "nbt" ? "[NBT]" : "NBT", 244, 190, 54, 18)
    }else{
      g.addLabel(10, "No products in this shop.", 170, 70, 180, 12)
    }

    g.addButton(ID.BTN_SAVE, "Save", 318, 188, 48, 20)
    g.addButton(ID.BTN_CLOSE, "Close", 370, 188, 50, 20)
    g.showPlayerInventory(8, 226)
    player.showCustomGui(g)
  }

  function saveFromGui(e){
    var player = e.player
    var session = sessions[key(player)]
    var product = session ? selectedProduct(session) : null
    var itemStack, currencyStack
    if(!session || !product) return
    product.price = Math.max(0, toInt(getText(e.gui, ID.TXT_PRICE, product.price || 0), product.price || 0))
    product.baseStock = toInt(getText(e.gui, ID.TXT_STOCK, product.baseStock != null ? product.baseStock : -1), product.baseStock != null ? product.baseStock : -1)
    setRestockTicks(session.shop, getText(e.gui, ID.TXT_RESTOCK, restockTicks(session.shop)))

    itemStack = getSlotStack(e.gui, 0)
    if(itemStack) product.item = makeItemSpecFromStack(itemStack, session.itemMode || itemMode(productItem(product)))

    currencyStack = getSlotStack(e.gui, 1)
    if(currencyStack) product.currency = makeCurrencyFromStack(currencyStack, session.currencyMode || "id")

    saveShop(session)
    player.message("Shop JSON saved: " + session.jsonPath)
    showEditor(player)
  }

  function handleButton(e){
    var session = sessions[key(e.player)]
    var list = session ? products(session.shop) : []
    var idx
    if(!session || e.gui.getID() !== GUI_ID) return
    if(e.buttonId >= ID.BTN_ROW_START && e.buttonId < ID.BTN_ROW_START + PAGE_SIZE){
      idx = session.page * PAGE_SIZE + (e.buttonId - ID.BTN_ROW_START)
      if(idx >= 0 && idx < list.length){
        session.index = idx
        session.itemMode = itemMode(productItem(selectedProduct(session)))
        session.currencyMode = itemMode(currencyItemSpec(effectiveCurrency(session.shop, selectedProduct(session))))
        showEditor(e.player)
      }
      return
    }
    if(e.buttonId === ID.BTN_PREV){
      session.page = Math.max(0, session.page - 1)
      showEditor(e.player)
      return
    }
    if(e.buttonId === ID.BTN_NEXT){
      if((session.page + 1) * PAGE_SIZE < list.length) session.page++
      showEditor(e.player)
      return
    }
    if(e.buttonId === ID.BTN_ITEM_ID){ session.itemMode = "id"; showEditor(e.player); return }
    if(e.buttonId === ID.BTN_ITEM_NBT){ session.itemMode = "nbt"; showEditor(e.player); return }
    if(e.buttonId === ID.BTN_CUR_ID){ session.currencyMode = "id"; showEditor(e.player); return }
    if(e.buttonId === ID.BTN_CUR_NBT){ session.currencyMode = "nbt"; showEditor(e.player); return }
    if(e.buttonId === ID.BTN_SAVE){ saveFromGui(e); return }
    if(e.buttonId === ID.BTN_CLOSE){ delete sessions[key(e.player)]; e.player.closeGui(); return }
  }

  function handleClosed(e){
    if(!e || !e.gui || e.gui.getID() !== GUI_ID) return
  }

  function register(){
    var spec = {
      id:ADDON_ID,
      name:"NPC Shop Item Editor",
      description:"Edit selected shop JSON item slots, price, currency, base stock, and restock ticks in-game.",
      targetPrefix:"dc_shop",
      open:open,
      customGuiButton:handleButton,
      customGuiClosed:handleClosed
    }
    if(typeof dc_npc_editor_registerAddon === "function"){
      dc_npc_editor_registerAddon(spec)
      return
    }
    if(typeof DC_NPC_EDITOR_PENDING_ADDONS === "undefined" || !DC_NPC_EDITOR_PENDING_ADDONS || typeof DC_NPC_EDITOR_PENDING_ADDONS.length !== "number" || typeof DC_NPC_EDITOR_PENDING_ADDONS.push !== "function") DC_NPC_EDITOR_PENDING_ADDONS = []
    DC_NPC_EDITOR_PENDING_ADDONS.push(spec)
  }

  register()

  return {
    ADDON_ID:ADDON_ID,
    open:open,
    customGuiButton:handleButton,
    customGuiClosed:handleClosed
  }
})()
