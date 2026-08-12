---
"@buildpad/hooks": patch
"@buildpad/ui-interfaces": patch
---

M2M: alias the junction PK onto `.id` for fetched items, and fold `primaryKey` into ListM2M's load-signature dedupe.

- `useRelationMultipleM2M`'s `displayItems` aliased the real junction PK onto `.id` for locally-created items only; fetched items kept `{ ...item }` with no alias, leaving `.id` `undefined` for any junction table whose PK isn't literally named `id`. `ListM2M` reads `item.id` directly at 15+ call sites (React keys, DnD sortable ids, data-testids, drag-end matching). Now matches the M2A fix (`useRelationM2A.ts`'s `{...item, id: pk}`), closing the M2M half of R6.2.
- `ListM2M`'s load-effect signature dedupe omitted `primaryKey`/`isParentSaved`. A mounted `ListM2M` whose `primaryKey` switches to a different saved record without a remount (e.g. navigating between records in a single-page detail view) kept the same query params and `refreshKey`, so the dedupe skipped the refetch and the previous record's rows stayed on screen until some other param changed (V3-5).
