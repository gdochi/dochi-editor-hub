# dochi_lib

Local package library for Dochi script distribution.

## Structure

- Root `manifest.json` indexes packages!
- Root `base_path` is the shared install root: `minecraft/customnpcs/scripts/ecmascript/dc_lib`.
- Each package manifest uses `sub_path` to extend the shared root.
- Each version folder contains its own `manifest.json`.
- Source files may keep versioned names.
- Installed files can use fixed names through `install_as`.

## Example

- `scripts/trainer/fabric_1_21_1/1.0.0/manifest.json`
- `scripts/trainer/fabric_1_21_1/1.0.0/trainer_1.0.0.js`
- `scripts/trainer/fabric_1_21_1/1.0.0/trainer_1.0.0.html`
