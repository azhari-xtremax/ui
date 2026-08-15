---
"@buildpad/hooks": patch
"@buildpad/ui-interfaces": patch
"@buildpad/ui-collections": patch
---

M2M: alias the junction PK onto `.id`, fix the junction save path, and make ListM2M refetch on a record switch.

- **Junction updates are no longer silently dropped on save.** `CollectionForm`'s M2M flush read the junction row's PK as a hardcoded `entry.id`, while the hook keys its staged update entries by the junction's real PK column. For any junction table whose PK isn't named `id`, every staged update (reorder, junction-field edit) was skipped and the save still reported success. The junction PK is now resolved from the schema and read by name, and a key mismatch throws instead of skipping.
- **`useRelationMultipleM2M` aliases the junction PK onto `.id` for fetched items** (previously only locally-created ones got it), so `ListM2M`'s React keys, DnD sortable ids and drag-end matching work for junctions whose PK isn't `id`. The alias is applied after local edits are overlaid (a staged edit can carry its own `id`) and falls back to the row's existing `id` when the PK column is absent from the response, rather than overwriting every row's identity with `undefined`.
- **Staged changes are discarded when the parent record changes.** Previously they survived, so navigating between records without a remount let record 1's staged links and deletions ride onto record 2 — and saving record 2 also mutated record 1.
- **`existingItemCount` is inferred from page fullness** instead of `meta.total_count`, which on this backend is the unfiltered collection count. It reported the whole junction table as one parent's count, which disabled drag-and-drop entirely, hid staged creates behind a bogus page count, and rendered phantom pagination.
- **`ListM2M` refetches when `primaryKey` switches to another record** (the load-signature dedupe omitted it, so the previous record's rows stayed on screen), and clears them when switching to an unsaved parent. `refreshKey` is compared separately from the signature so a record switch that also clears `value` doesn't fire the same query twice. Page, search and selection reset on the switch, and a failed load no longer poisons the dedupe permanently.
- **Multi-select assigns distinct sort values.** Every id in one batch previously got the same value, losing the chosen order on save.
- **The select modal's "already linked" exclusion covers every page**, not just the loaded one — it was offering items already linked elsewhere, staging duplicate links.
- Smaller fixes: a guarded load no longer strands the loading state, and the junction-fields form is hidden for not-yet-saved rows rather than fetching a `$new-` sentinel id.
