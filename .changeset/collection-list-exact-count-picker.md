---
"@buildpad/ui-collections": patch
"@buildpad/ui-interfaces": patch
---

CollectionList: add an opt-in `exactCount` prop, and use it for the relation pickers.

The list fetch relies on the server's default `estimated` count mode, which is cheap but can report a wildly inflated total on a full first page when the table has stale or absent `ANALYZE` statistics — small, rarely-mutated collections are exactly what autovacuum's threshold skips. The server reconciles an *under*-count as soon as a page contradicts it, but an over-count on a full page is only a lower bound, so nothing corrects it until pagination reaches a short page. The visible symptom is a pager offering pages that hold nothing.

`exactCount` (default `false`) sends `count=exact`, which makes the server return a real count with `meta.total_estimated: false` — the flag `CollectionList` already pins on. It stays off for primary collection views, where `estimated` is what keeps the component cheap.

The "Add Existing" pickers in `ListM2M` and `ListO2M` opt in: they are always small, human-browsed modals, so a real count is worth the marginal cost.
