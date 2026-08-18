---
"@buildpad/ui-interfaces": patch
"@buildpad/ui-collections": patch
"@buildpad/hooks": patch
---

ListM2M: resolve the display-template label immediately when picking or creating an item, not just after save+reload.

Picking an item via "Add Existing" only ever staged `{ [junctionField]: { id } }` locally, so a display template referencing e.g. `name` had nothing to resolve against and rendered a blank label until the parent form was saved and the list reloaded — most visible when adding a relation on a brand-new, unsaved parent, where no reload ever happens.

The select modal has already loaded the rows it is showing, so `BulkAction.action` now receives them alongside the selected ids (`(selectedIds, selectedRows?)` — a new optional parameter, so existing bulk actions are unaffected), and the modal's list is asked for whatever fields the display template needs. `ListM2M` passes those rows to `selectItems`, which keeps them in display-only state so the label resolves immediately, with no extra request and no await between the click and the modal closing. "Create New" does the same with the record `CollectionForm` just returned.

The staged junction payload deliberately stays reference-only (exactly the related primary key): `CollectionForm` distinguishes "link this existing row" from "deep-create a new one" by that object carrying nothing else, so display fields must never be merged into it. A regression test in `@buildpad/hooks` now pins that contract against the same flatten logic the save path uses.
