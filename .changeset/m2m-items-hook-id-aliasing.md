---
"@buildpad/hooks": patch
---

useRelationM2MItems: resolve the junction table's real primary key on every path, and fix the defects that surfaced once its per-row URLs started working.

The junction PK is the identity behind every per-row URL this hook builds. For a junction whose PK column isn't literally named `id`, reading `.id` resolved to `undefined` and the request silently targeted `/api/items/{collection}/undefined` — which a string-PK backend answers 2xx, so the UI reported a delete or reorder that never happened.

**The PK is now resolved once, defensively** (`relationInfo?.junctionPrimaryKeyField?.field ?? 'id'`, matching the sibling hooks) and used everywhere:

- `loadItems` aliases it onto `.id`, but **guarded**: a row whose PK column is absent from the response is passed through untouched. Writing `undefined` over a real `id` would collapse every row onto one identity and point every URL at `/undefined` — worse than the bug the alias fixes. This is the rule `useRelationMultipleM2M` already documents.
- `createJunctionItem` returns the created row aliased, and `selectItems` now returns the **server rows** rather than the request bodies it had built — those carried no primary key of any name, so a caller could never remove what it had just added, even when the PK was named `id`.
- `removeItem` and `updateSortOrder` resolve the PK themselves rather than trusting `.id`, reject a row that has none instead of requesting `/undefined`, and encode it into the path.

**Other defects fixed in the same paths:**

- `loadItems` always fetches the related collection's primary key and the sort field, not just the junction PK. Without the related PK, `selectedPrimaryKeys` came back empty whenever the caller's `fields` omitted it, so the "already linked" filter excluded nothing and the user re-linked rows the junction already had.
- `totalCount` is inferred from page fullness instead of `meta.total_count`, which on this DaaS build is the unfiltered count of the whole junction table — it reported every junction row in the database as this parent's count, producing phantom pages. The sibling hooks, FileManager and Upload all carry the same note.
- `search` is sent whenever it is supplied. It was gated behind an optional `enableSearchFilter` that defaults to undefined, so a caller passing `search` alone had it discarded with no error.
- `sortDirection` applies to the configured sort field, not only to a caller-supplied one, and a bare `sortField` is prefixed with the junction field exactly as `fields` entries are — otherwise it asked the backend to sort the junction table by a column that only exists on the related one.
- `updateSortOrder` takes a `pageOffset` (defaulting to the last load's offset). Numbering rows 1..N per page collided with the previous page's values, so a reorder on page 2 interleaved the two pages on the next sorted load.
- `selectItems` and `updateSortOrder` use `Promise.allSettled`. These are independent writes, so a rejection partway through still left the earlier rows committed while the UI reported total failure — and the retry duplicated them.
- `moveItemUp`/`moveItemDown` bound both ends of the index. An index past the end — a row removed, or the page shrunk between render and click — used to fall through, writing `undefined` into the copied array and renumbering the real rows before throwing on it.
- Mutations refresh the list, so `items`, `totalCount` and `selectedPrimaryKeys` are no longer stale behind a success toast, and newly linked rows are given a sort value instead of a NULL that made them clump.
- `selectedPrimaryKeys` keeps a related key of `0`, which `.filter(Boolean)` discarded.
- Overlapping loads are sequenced with a request-generation guard, so an older response can no longer overwrite a newer one.

**useRelationM2A** now detects the junction table's primary key instead of hardcoding `{ field: 'id' }` at both relation-info construction sites. That hardcode made the junction-PK alias already shipped for M2A a no-op on exactly the junctions it was written for, and the test covering it hand-built the relation info, bypassing the producer.

The hook's README examples are corrected: they documented `addItem` and `reorderItems`, which it does not return, and called `removeItem(tag.id)` with a bare id where the signature takes a junction row — reading `.id` off a string yields `undefined`, so the one documented path produced the very `/undefined` request this change eliminates, on every junction table.
