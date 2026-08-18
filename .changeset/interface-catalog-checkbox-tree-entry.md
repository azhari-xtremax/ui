---
"@buildpad/utils": patch
"@buildpad/ui-interfaces": patch
"@buildpad/ui-forms": patch
---

interface-catalog: add the missing `select-multiple-checkbox-tree` entry (S4.4/S8.4).

`PROVISIONABLE_INTERFACES` had no entry for the checkbox-tree interface even though `select-multiple-checkbox-tree` is a real, resolvable interface id (`field-interface-mapper.ts` already has a `case` for it), `registry.json` already publishes it, and the component already ships from `@buildpad/ui-interfaces`. The catalog is what drives both in-repo pickers — `AddFieldModal` (via `provisionableInterfacesForType`) and `FieldPalette` (via `CATALOG_GROUPS`) — so until now a form author simply could not create a checkbox-tree field. It is also added to `CHOICE_INTERFACES` so the choices editor and the zero-choices save guard (`interfaceRequiresChoices`) treat it like the other choice-authoring interfaces.

Both halves are new, and two limits are worth knowing rather than rediscovering later:

- **The builder can only author a flat tree.** `ChoicesInput` is a `label=value` per-line textarea whose `Choice` is `{ text, value }`, while `TreeChoice` carries `children`. A tree field created through the form builder is therefore a single-level list; nested trees still have to come from DaaS-authored or hand-written `meta.options.choices`. `valueCombining` likewise has no editor and stays `'all'`.
- **`types` mirrors `registry.json`, not the leaf's standalone capability.** That distinction is now documented in the catalog's module docstring.

Supporting fixes so the new entry is actually sound end to end:

- **`@buildpad/ui-interfaces`** — `SelectMultipleCheckboxTree` gained the `type` + normalize + re-serialize trio its two multi-select siblings already had. It is registered for `types: ['json', 'csv']` and the registry ships it standalone (`internalDependencies: []`), so a CLI-installed consumer renders it with no pipeline in front of it; a raw comma-string previously produced substring-matched reads via `String.includes`, character-spread writes, and a `TypeError: currentValue.filter is not a function` on the first uncheck. Tokens parsed out of a csv string are also mapped back to the declared choice value's type, so numeric choices on a csv column match instead of silently appending duplicates. A `null` value (the initial state of a nullable column) no longer crashes on mount, and the component now accepts a forwarded `aria-label` instead of announcing every tree field as "Tree selection".
- **`@buildpad/ui-forms`** — `FormPreview.stories.tsx` had its own stale copy of `CHOICE_INTERFACES`, which would have rendered the new entry as "Choices option configured incorrectly" in the story that exists to prove every catalogued interface renders; it now imports the shared set. `FieldPalette` gained the `IconListTree` mapping `registry.json` already names, instead of falling back to the glyph already used by rich text.
- **Tests** — the catalog is now pinned against `registry.json` in both directions, so a missing entry or a drifted `types` fails instead of shipping silently; the renderer-resolution check covers every declared type rather than only `types[0]`; and `csv` compatibility, previously unasserted, is now exhaustive.
