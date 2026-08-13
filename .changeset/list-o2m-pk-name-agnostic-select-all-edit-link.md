---
"@buildpad/ui-interfaces": patch
---

ListO2M: closes the three real bugs behind R6.1 — `.id` assumptions for related collections whose real PK column isn't literally named `"id"`.

1. The "select all" header checkbox built `selectedIds` from `displayItems.map((i) => i.id)`, but every per-row checkbox is keyed by `getPk(item)` (the resolved real PK). For a non-`"id"`-PK collection this mismatch meant select-all populated the set with `undefined`, so no row ever showed as checked and batch actions silently targeted nothing.
2. The edit modal opened `CollectionForm` with `id={currentlyEditing?.id}` instead of the resolved PK — for a non-`"id"`-PK collection this was always `undefined`, so clicking "Edit" on an existing row silently opened the form in create mode instead.
3. Staged link/update payload entries were keyed by a literal `"id"` property. `relation-writer.ts` (the DaaS backend) looks a record up via `itemObj[manyPrimary]` — its own resolved PK column name, not a hardcoded `"id"` — so a literal `id:` key was never found server-side for a non-`"id"`-PK collection, and "select existing" silently created a duplicate record instead of linking the one picked.

All three now resolve through `getPk`/the same `relatedPrimaryKeyField`-derived field name the rest of the component already uses, matching the R6.2/R6.5 `.id`-aliasing fixes shipped earlier in this same audit-fix wave. (The delete-changeset's `$delete` marker, the other item the audit flagged in this cluster, was investigated separately and found to be unreachable dead code in practice — a saved parent's deletion already goes through a different, PK-safe path — so it was deliberately left as-is.)
