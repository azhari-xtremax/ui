---
"@buildpad/hooks": patch
---

useRelationM2MItems: `loadItems` now aliases the real junction primary key onto `.id` for every loaded item, matching the same fix already applied to `useRelationMultipleM2M`/`useRelationM2A` (R6.2). `removeItem` and `updateSortOrder` build their request URLs from `item.id` directly — for a junction table whose real PK column isn't literally named `id`, `.id` was `undefined`, so those requests silently targeted `/api/items/{collection}/undefined`.

Also documents that this hook isn't currently consumed by any first-party component — `ListM2M.tsx` (the shipped ListM2M interface) uses `useRelationMultipleM2M` instead. Kept correct rather than removed, since it's exported public package API and removing it would be a breaking change for any external consumer.
