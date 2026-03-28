# dochi_lib

Local package library for Dochi script distribution.

## Structure

- Root `manifest.json` indexes packages!
- Each version folder contains its own `manifest.json`.
- Source files may keep versioned names.
- Installed files can use fixed names through `install_as`.

## Example

- `scripts/trainer/fabric_1_21_1/1.0.0/manifest.json`
- `scripts/trainer/fabric_1_21_1/1.0.0/trainer_1.0.0.js`
- `scripts/trainer/fabric_1_21_1/1.0.0/trainer_1.0.0.html`
