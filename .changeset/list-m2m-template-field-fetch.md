---
"@buildpad/ui-interfaces": patch
---

ListM2M: fetch the fields referenced by the row-display template.

The actual API fields= query was built only from the `fields` prop (defaulting to the bootstrap `["id"]`), completely independent of the `template` prop used for rendering. A field configured with `template: "{{role_id.name}}"` (or any dotted junction-relative path) but no explicit `fields` prop fetched only `role_id.id` — the referenced `name` was never requested, so every row rendered blank. `ListO2M` and `SelectDropdownM2O` already merge template-referenced fields into the query via `resolveRelationFields`; `ListM2M` never got that fix. Extracts and merges the template's own field references (already junction-relative, unlike the `fields` prop's bare related-item names) directly into the query.
