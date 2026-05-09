var GUI_ID=7201,BTN_CLOSE=3;
var TMP_DATA="npc_dialogue_book_data";
var JSON_DIR="customnpcs/JSON/npc_dialogue/";
var SND_BUTTON={id:"minecraft:ui.button.click",vol:0.7,pit:1.0};

function interact(e){
    var p=e.player,d=loadDialogueData(e);
    p.getTempdata().put(TMP_DATA,JSON.stringify(d));
    playSoundCfg(p,d.sounds.open);
    openBookGui(e,p,d);
}

function customGuiButton(e){
    if(e.gui.getID()!=GUI_ID)return;
    var p=e.player,td=p.getTempdata();
    var d=JSON.parse(String(td.get(TMP_DATA)||"{}"));
    if(!d.pages)d=loadDialogueData(e);

    playSoundCfg(p,SND_BUTTON);

    if(e.buttonId==BTN_CLOSE){
        playSoundCfg(p,d.sounds.close);
        p.closeGui();
        return;
    }
}

function openBookGui(e,p,d){
    var gui=e.API.createCustomGui(GUI_ID,256,240,false,p);
    var title=d.title||"Dialogue";
    var lines=collectLines(d);

    gui.addLabel(1000,title,104,12,100,16,0xD6B46A);

    var panel=gui.getScrollingPanel();
    panel.init(32,34,200,160);

    for(var i=0,y=0;i<lines.length;i++,y+=12){
        var text=String(lines[i]);
        var color=isChapterLine(text)?0xD6B46A:0xE8E0C8;
        panel.addLabel(1100+i,text,6,y,184,12,color);
    }

    gui.addButton(BTN_CLOSE,"Close",39,210,180,20);
    p.showCustomGui(gui);
}

function collectLines(d){
    var out=[];
    if(!d.pages||!Array.isArray(d.pages))return ["No dialogue data."];

    for(var i=0;i<d.pages.length;i++){
        var p=d.pages[i];
        if(!p||!p.lines)continue;

        if(i>0)out.push("");

        for(var j=0;j<p.lines.length;j++){
            out.push(String(p.lines[j]));
        }
    }

    if(out.length<1)out.push("No dialogue lines.");
    return out;
}

function loadDialogueData(e){
    var name=safeFileName(e.npc.getName());
    var path=JSON_DIR+name+".json";
    var text=readFile(path);
    if(!text)return makeErrorData(name,path,"File missing");

    try{
        return normalizeData(JSON.parse(text),name);
    }catch(err){
        return makeErrorData(name,path,err);
    }
}

function normalizeData(d,name){
    if(!d)d={};
    if(!d.title)d.title=name;
    if(!d.sounds)d.sounds={};
    if(!d.sounds.open)d.sounds.open={id:"minecraft:item.book.page_turn",vol:0.7,pit:0.8};
    if(!d.sounds.close)d.sounds.close={id:"minecraft:block.barrel.close",vol:0.7,pit:0.8};
    if(!d.pages||!Array.isArray(d.pages)||!d.pages.length)d.pages=[{lines:["No pages found."]}];

    for(var i=0;i<d.pages.length;i++){
        if(!d.pages[i])d.pages[i]={};
        if(!d.pages[i].lines)d.pages[i].lines=["Empty page."];
        if(!Array.isArray(d.pages[i].lines))d.pages[i].lines=[String(d.pages[i].lines)];
    }

    return d;
}

function makeErrorData(name,path,msg){
    return {
        title:name,
        sounds:{open:{id:"minecraft:block.note_block.bass",vol:0.8,pit:0.7},close:{id:"minecraft:block.barrel.close",vol:0.7,pit:0.8}},
        pages:[{lines:["Dialogue file error.","","NPC: "+name,"Path: "+path,String(msg||"")]}]
    };
}

function readFile(path){
    try{
        var File=Java.type("java.io.File");
        var Files=Java.type("java.nio.file.Files");
        var Charset=Java.type("java.nio.charset.StandardCharsets");
        var f=new File(path);
        if(!f.exists())return null;
        return new java.lang.String(Files.readAllBytes(f.toPath()),Charset.UTF_8);
    }catch(err){
        return null;
    }
}

function playSoundCfg(p,s){
    if(!s||!s.id)return;
    p.playSound(String(s.id),s.vol!=null?s.vol:1,s.pit!=null?s.pit:1);
}

function safeFileName(s){
    return String(s).replace(/[\\\/:*?"<>|]/g,"_");
}

function isChapterLine(s){
    s=String(s);
    return s.indexOf("Chapter ")==0||s=="Jar-Fist"||s=="World Umbilicus";
}