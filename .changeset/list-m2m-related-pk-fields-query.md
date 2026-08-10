---
"@buildpad/ui-interfaces": patch
---

ListM2M's items query resolves the bootstrap "id" fields default to the related collection's real primary key.

The fields prop defaults to ["id"] as a placeholder meaning "the primary key", but both query-building sites prefixed it literally as `${junctionField}.id` — requesting a nonexistent column and 500ing the list for any related collection whose PK isn't named id. The bootstrap sentinel now resolves to relationInfo.relatedPrimaryKeyField (dynamic since the hardcoded-PK fix); explicitly-passed field names are untouched. Same policy as the resolveRelationFields fix that landed with the relation-hooks PK work.
