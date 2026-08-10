---
"@buildpad/ui-interfaces": patch
---

ListM2A: inline "Create New" now emits real item data instead of the collection name as the id.

- The Create New modal's onSave passed JunctionItemForm's whole combined payload into `createItemWithData`, which re-nests its argument under the junction field — so the staged junction value was doubly wrapped and its first key was the collection discriminator. It now passes only the nested related-item fields as `itemData`, with remaining junction-level edits as `additionalData`.
- The replace-mode payload builder resolved a nested row's id as `nested.id ?? Object.values(nested)[0]`, which returned the collection name for inline-created items (and the wrong field for collections whose PK isn't named `id`). It now resolves via `relationPrimaryKeyFields`, and when no PK exists yet (inline create) passes the whole nested object through so DaaS deep-creates the related item.
