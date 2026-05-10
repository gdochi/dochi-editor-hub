# Dochi Main Script Utility Dependencies

Generated from script-call scanning.

- Generated: `2026-05-10T06:10:29.859Z`
- Utility root: `npc_util/common/1.0.0`
- Main scripts: `6`

## Main Scripts

| Main Script | Package | Versions | Utility Scripts | Detected Symbols | Attachments |
|---|---|---|---|---|---|
| `dc_dialogue_trigger.js` | dialogue | common 1.0.0 | `dc_npc_core_module.js`<br>`dc_dialogue_util.js` | **dc_npc_core_module.js**<br>`NpcEventModule`<br><br>**dc_dialogue_util.js**<br>`dc_dialogue_handleHtmlEvent`<br>`dc_dialogue_open` | html: `html/dc_util/dc_gui_runtime.html`<br>json_dir: `customnpcs/dc_data/dc_dialogues/` |
| `dc_item_editor.js` | item_editor | forge_1_20_1 1.0.0 | - | - | json: `customnpcs/JSON/item/category_config.json`<br>json_dir: `customnpcs/JSON/item/`<br>json_dir: `customnpcs/JSON/item/category_presets/`<br>json_dir: `customnpcs/JSON/item/prefix/` |
| `dc_npc_editor.js` | npc_editor | common 1.0.0 | - | - | directory: `customnpcs/dc_admins/`<br>directory: `customnpcs/scripts/ecmascript/`<br>html: `html/dc_npc_editor.html`<br>mod: `CNPCExtended` |
| `dc_story_scroll.js` | scroll_dialogue | common 1.0.0 | - | - | json: `customnpcs/JSON/npc_dialogue/<npc_name>.json`<br>json_dir: `customnpcs/JSON/npc_dialogue/` |
| `dc_soullikemob.js` | soullikemob | forge_1_20_1 1.0.0<br>forge_1_20_1 1.0.1<br>forge_1_20_1 1.0.2 | - | - | html: `html/dc_soullikemob.html` |
| `dc_trainer.js` | trainer | fabric_1_21_1 1.0.0<br>fabric_1_21_1 1.0.1<br>fabric_1_21_1 1.0.2 | `dc_npc_core_module.js`<br>`dc_cfg_checker.js`<br>`dc_util_common.js`<br>`dc_cond_checker.js`<br>`dc_reward_checker.js`<br>`dc_sequence_core.js`<br>`dc_dialogue_util.js` | **dc_npc_core_module.js**<br>`NpcEventModule`<br><br>**dc_cfg_checker.js**<br>`cfg_chk_defaultConfig`<br>`cfg_chk_merge`<br>`cfg_chk_readJsonFile`<br>`cfg_chk_readTextFile`<br>`cfg_chk_resolveFile`<br><br>**dc_util_common.js**<br>`util_fw`<br>`util_msgPrint`<br>`util_sound`<br>`util_toF`<br>`util_toInt`<br><br>**dc_cond_checker.js**<br>`cond_adv`<br>`cond_faction`<br>`cond_item`<br>`cond_stored`<br>`cond_tag`<br><br>**dc_reward_checker.js**<br>`rew_chk_applyAdvancement`<br>`rew_chk_applyCommand`<br>`rew_chk_applyFaction`<br>`rew_chk_applyItem`<br>`rew_chk_pickList`<br><br>**dc_sequence_core.js**<br>`seq_core_calcTotal`<br>`seq_core_hasSteps`<br>`seq_core_pack`<br>`seq_core_prepareSteps`<br><br>**dc_dialogue_util.js**<br>`dc_dialogue_handleHtmlEvent`<br>`dc_dialogue_open` | html: `html/dc_trainer.html` |

## Details

### `dc_dialogue_trigger.js`

Dialogue trigger package shared for Forge and Fabric

| Utility Script | Required | Load Order | Detected Calls / References |
|---|---|---:|---|
| `dc_npc_core_module.js` | yes | 1 | `NpcEventModule` |
| `dc_dialogue_util.js` | yes | 5 | `dc_dialogue_handleHtmlEvent`<br>`dc_dialogue_open` |

### `dc_item_editor.js`

item_editor package sample for Forge 1.20.1

| Utility Script | Required | Load Order | Detected Calls / References |
|---|---|---:|---|
| - | - | - | No npc_util function call detected. |

### `dc_npc_editor.js`

NPC editor package sample shared for Forge and Fabric

| Utility Script | Required | Load Order | Detected Calls / References |
|---|---|---:|---|
| - | - | - | No npc_util function call detected. |

### `dc_story_scroll.js`

Scroll dialogue CustomNPCs GUI script

| Utility Script | Required | Load Order | Detected Calls / References |
|---|---|---:|---|
| - | - | - | No npc_util function call detected. |

### `dc_soullikemob.js`

Soullikemob package sample for Forge 1.20.1

| Utility Script | Required | Load Order | Detected Calls / References |
|---|---|---:|---|
| - | - | - | No npc_util function call detected. |

### `dc_trainer.js`

Trainer package sample for Fabric 1.21.1

| Utility Script | Required | Load Order | Detected Calls / References |
|---|---|---:|---|
| `dc_npc_core_module.js` | yes | 1 | `NpcEventModule` |
| `dc_cfg_checker.js` | yes | 2 | `cfg_chk_defaultConfig`<br>`cfg_chk_merge`<br>`cfg_chk_readJsonFile`<br>`cfg_chk_readTextFile`<br>`cfg_chk_resolveFile` |
| `dc_util_common.js` | yes | 3 | `util_fw`<br>`util_msgPrint`<br>`util_sound`<br>`util_toF`<br>`util_toInt` |
| `dc_cond_checker.js` | yes | 4 | `cond_adv`<br>`cond_faction`<br>`cond_item`<br>`cond_stored`<br>`cond_tag` |
| `dc_reward_checker.js` | yes | 5 | `rew_chk_applyAdvancement`<br>`rew_chk_applyCommand`<br>`rew_chk_applyFaction`<br>`rew_chk_applyItem`<br>`rew_chk_pickList` |
| `dc_sequence_core.js` | yes | 6 | `seq_core_calcTotal`<br>`seq_core_hasSteps`<br>`seq_core_pack`<br>`seq_core_prepareSteps` |
| `dc_dialogue_util.js` | yes | 9 | `dc_dialogue_handleHtmlEvent`<br>`dc_dialogue_open` |

