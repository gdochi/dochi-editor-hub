![downloads](https://img.shields.io/github/downloads/gdochi/dochi-editor-hub/latest/total.svg)
# dochi_lib

Local package library for Dochi script distribution.

## Structure

- Root `manifest.json` indexes packages!
- Root `base_path` is the shared install root: `minecraft/customnpcs/scripts/ecmascript/dc_lib`.
- Each package manifest uses `sub_path` to extend the shared root.
- Each version folder contains its own `manifest.json`.
- Source files may keep versioned names.
- Installed files can use fixed names through `install_as`.
- Only packages that must be registered in `scripts/player_scripts.json` declare `player_scripts`.
- `player_scripts` entries are relative to the package install root; for example `dc_npc_editor.js` becomes `dc_lib/dc_npc_editor.js`.

## Example

- `scripts/npc_trainer/fabric_1_21_1/1.0.0/manifest.json`
- `scripts/npc_trainer/fabric_1_21_1/1.0.0/dc_npc_trainer.js`
- `scripts/npc_trainer/fabric_1_21_1/1.0.0/dc_battle_exclamation.html`
