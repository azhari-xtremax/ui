---
"@buildpad/utils": minor
"@buildpad/ui-interfaces": minor
---

Resolve the registry's interface ids to the interfaces they name.

`registry.json` and the DaaS `/api/interfaces` catalog name three interfaces differently from the ids the renderer resolves: `input-tags`, `input-map` and `input-map-gl`. A field saved with one of those fell through to the type-based fallback, so a `json` column configured as tags rendered as a JSON code editor, a map column did the same, and the interface's own options — presets, `allowCustom` and the rest — were dropped without a word.

All three resolve now, through one exported table that `tests/interface-catalog.test.ts` reads as well. That test used to keep its own copy of the same list, which is how the renderer came to have no entry for `input-tags` at all.

`Tags` also guards its initial value. A field whose array/string cast is not wired up, such as a `csv` column mid-migration, hands the interface a raw string, and `value.map` threw and took the surrounding form down with it. A non-array value now renders an empty tag list.
