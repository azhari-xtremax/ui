---
"@buildpad/ui-interfaces": patch
"@buildpad/hooks": patch
---

ListM2M: resolve the display-template label immediately when picking an existing item, not just after save+reload.

Picking an item via "Add Existing" only ever staged `{ [junctionField]: { id } }` locally — `selectItems` never fetched the related item's own fields, so a display template referencing e.g. `name` had nothing to resolve against and rendered a blank label until the parent form was saved and the list reloaded from the server (this was most visible when adding a relation on a brand-new, unsaved parent record, where no reload ever happens automatically). `handleSelectExisting` now fetches the selected related items' own fields (whatever the display template needs) and passes them into `selectItems`, which merges them onto the staged junction entry so the label resolves right away. Falls back to id-only staging if the fetch fails.
