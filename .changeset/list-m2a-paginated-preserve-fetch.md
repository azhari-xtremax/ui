---
"@buildpad/ui-interfaces": patch
---

ListM2A: recognise every new-item sentinel before preserve-fetching.

`isParentSaved` tested for `'+'` alone, while the canonical `isNewItem` helper — the one `useRelationM2A.loadItems` already gates on — also treats `'%2B'` and `'new'` as new. On a route like `/pages/new` the loader therefore declined to fetch while `isParentSaved` reported true, so the emit preserve-fetched against a literal `'new'` primary key. If the backend rejects that against a uuid column the emit aborts, and the new record saves with none of its staged rows.

Also adds regression coverage for behaviour the preserve-fetch already had but nothing pinned: that the fetch is scoped to this parent (without the filter it returns every parent's junction rows and the replace-mode emit re-links them onto this one), that a bare-array response is normalised rather than read as an empty relation, and that the payload still spans all pages when an active search has narrowed the visible set.
