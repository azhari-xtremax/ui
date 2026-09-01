---
"@buildpad/hooks": minor
---

`useRelationM2O` now falls back to `GET /api/fields/{collection}/{field}`'s `schema.foreign_key_table` (and `foreign_key_column`) before erroring when `/api/relations` reports no matching relation. This recovers the case where a field's `options.related_collection` was saved but the relation/FK creation step failed.
