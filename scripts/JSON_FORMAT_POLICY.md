# JSON Format Policy

Dochi JSON formats are strict contracts.

## Rules

- Readers must accept only the current canonical keys for their format.
- Readers must reject or ignore invalid shapes instead of guessing from aliases.
- Writers must not duplicate the same value under legacy helper keys.
- New formats require an explicit schema update or one-time migration, not runtime fallback.
- File names are storage paths. Semantic checks must use JSON fields, for example `node.type`.

## Canonical Shapes

Dialogue node files:

```json
{
  "nodeName": "00",
  "node": {
    "type": "start",
    "text": "",
    "choice": []
  },
  "gui": {
    "guiSource": "default",
    "guiOffset": "dialogue_gui_default"
  }
}
```

GUI files:

```json
{
  "guiType": "dialogue",
  "id": "sample_gui",
  "globalStyleBase": "none",
  "themeMix": { "pixel": 0, "medieval": 0, "cyber": 0 },
  "stage": {},
  "elements": []
}
```

Script package manifests:

```json
{
  "package": "npc_editor",
  "version": "1.0.0",
  "editor": "npc_editor",
  "mc_version": "common",
  "entry": "dc_npc_editor.js",
  "player_scripts": [{ "path": "dc_npc_editor.js" }],
  "files": [
    {
      "source": "dc_npc_editor.js",
      "install_as": "dc_npc_editor.js",
      "type": "script",
      "dependencies": []
    }
  ]
}
```

NPC editor installable dcE specs:

```json
{
  "id": "dc_dialogue_trigger",
  "name": "Dialogue Trigger",
  "path": "dc_npc_util/dc_dialogue_trigger.js",
  "prefix": "dc_dialogue",
  "requires_json": true,
  "json_root": "dc_data/dc_dialogues",
  "script_deps": [],
  "html_deps": []
}
```
