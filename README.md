# dochi_lib

Local package library for Dochi script distribution.

## Structure

- Root `manifest.json` indexes packages!
- Root `base_path` is the shared install root: `minecraft/customnpcs/scripts/ecmascript/dc_lib`.
- Non-add-on packages may use `sub_path` to extend the shared root.
- Add-on packages install scripts directly under `dc_lib/addon` through `install_as`; they do not use package-named folders.
- Each version folder contains its own `manifest.json`.
- Source files may keep versioned names.
- Installed files can use fixed names through `install_as`.
- Only packages that must be registered in `scripts/player_scripts.json` declare `player_scripts`.
- `player_scripts` entries are relative to `dc_lib`; for example `dc_npc_editor.js` becomes `dc_lib/dc_npc_editor.js`, and add-ons use paths like `dc_lib/addon/starter_select_editor.js`.

## Example

- `scripts/npc_trainer/fabric_1_21_1/1.0.0/manifest.json`
- `scripts/npc_trainer/fabric_1_21_1/1.0.0/dc_npc_trainer.js`
- `scripts/npc_trainer/fabric_1_21_1/1.0.0/dc_battle_exclamation.html`
