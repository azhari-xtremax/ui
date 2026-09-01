---
"@buildpad/hooks": minor
---

`useRelationM2O` now recovers the relation from the field's own record before erroring, when `/api/relations` reports no matching relation.

`/api/relations` only reports a relation when a live Postgres FK constraint exists (or `daas_relations` metadata resolved via one). When that DDL step failed or was never run — a mismatched FK target type, a scope/M2O metadata collision — a field configured as `select-dropdown-m2o` hard-errored with "No M2O relation found for X.Y", even though its target was fully recoverable. One request to `GET /api/fields/{collection}/{field}` now resolves it, in two tiers:

1. `schema.foreign_key_table` — the physical FK. Authoritative when present, and it carries the related PK column (`foreign_key_column`) with it.
2. `meta.options.related_collection` — what the admin configured. This is the tier that matters when FK creation is the step that failed: no constraint exists, so there is no `foreign_key_table` to read.

Both come from the same response, so the second tier costs no extra request and does not depend on the backend folding options into the schema block. `useRelationM2M` already resolves its own broken-relation case from `meta.options` the same way.

A live relation still wins over both tiers, and the fallback is best-effort: if the field request itself fails, the original "No M2O relation found" error is preserved rather than masked.
