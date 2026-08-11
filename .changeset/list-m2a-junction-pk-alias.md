---
"@buildpad/hooks": patch
---

useRelationM2AItems: alias the real junction primary key onto `.id` for fetched items, not just locally-created ones (R6.1/R6.2/R6.5).

`displayItems` already aliased the real junction PK onto `.id` for locally-created items, but fetched items just spread the raw junction row through — so for any junction table whose PK isn't literally a column named `id`, `.id` was `undefined` on every fetched row. `ListM2A`'s React keys, drag-and-drop sortable ids, data-testids, and `JunctionItemForm`'s `junctionPrimaryKey` all read `.id` directly, so this silently broke React reconciliation and drag/drop for any non-`id`-named junction PK while leaving the actual save path unaffected (`removeItem`/`updateItem`/reorder already correctly resolved the real PK via `junctionPrimaryKeyField`, never `.id`).
