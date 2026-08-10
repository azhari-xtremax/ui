---
"@buildpad/ui-interfaces": patch
---

ListO2M: fix three ways pending relational changes were lost.

- Mounting the field with an existing value no longer emits `onChange([])`, which silently wiped the O2M value on the next save.
- "Add Existing" on an unsaved parent now stages into a dedicated `link` bucket, so the picked item renders in the list and is emitted with the parent FK on save. It previously staged into `update`, which only patches items already loaded from the server, so the selection disappeared and was never saved. Links are emitted as a reference (`id` + FK) rather than the fetched display fields — echoing those back makes the API drop the entry when the display template contains a nested path such as `{{author_id.name}}`.
- Staged creates now take their `$index` from a ref, so an interleaved create → edit → create no longer hands the same `$temp_` id to two rows (which made both disappear when either was removed).

Un-staging the last pending change still emits `[]`, so the parent form drops the field edit instead of saving an item the user removed.
