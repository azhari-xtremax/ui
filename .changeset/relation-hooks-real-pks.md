---
"@buildpad/hooks": patch
"@buildpad/ui-interfaces": patch
---

useRelationM2M/useRelationO2M resolve real primary keys instead of hardcoding "id", and ListO2M keys rows by the resolved PK.

- `relatedPrimaryKeyField`, `junctionPrimaryKeyField` (M2M) and `relatedPrimaryKeyField`, `parentPrimaryKeyField` (O2M) were hardcoded to `id`/`uuid` (junction: `id`/`integer`). They are now detected from the collection schema (`is_primary_key`), the same way useRelationM2A already does, with the old values as a graceful fallback when the schema can't be read.
- `useRelationO2MItems` and ListO2M now key every read/write off the resolved PK field. Hardcoded `.id` made removeItem/deleteItem/reorderItems hit `/api/items/{collection}/undefined` (silent no-ops) and corrupted staged-change matching, React keys, and checkbox selection for any related collection whose PK isn't literally `id`.
- `resolveRelationFields` drops the bootstrap `"id"` default from `fields=` queries when the resolved PK isn't `id` — that placeholder referenced a column that doesn't exist on such collections and 500'd the request. (Overlaps in intent with PR #99's M2M-side fix; reconcile when both land.)
- Known limit, unchanged here: ListO2M's emitted link/update/delete payload entries still key items by a literal `id` property; whether DaaS accepts that shape for non-`id`-PK collections needs a backend-contract check.
