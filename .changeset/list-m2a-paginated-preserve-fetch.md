---
"@buildpad/ui-interfaces": patch
---

ListM2A: preserve every linked junction row in the replace-mode payload.

`ListM2A`'s emit effect built its replace-mode payload straight from the current page's `displayItems`, which silently dropped every off-page junction row on save for a saved parent with more rows than fit on one page — the backend deletes all junction rows for the parent and inserts exactly the payload, so anything missing from it is gone. An active search that narrowed the on-page set had the same effect on non-matching-but-still-linked rows.

The emit now fetches every currently-linked junction row unpaginated whenever the parent is saved, and overlays the local changeset onto that full set. Specifically:

- The fetch is not gated on a row count. `totalCount` is `existingItemCount + creates - deletes`, so a count-based gate switches the safety fetch off exactly when rows are being unlinked, and `existingItemCount` is an estimated count rather than an exact one.
- The response is accepted as either a bare array or a `{data}` envelope, and `count=exact` drives a completeness check: if the server returns fewer rows than it reports linked (a clamped limit or capped page size), the emit is refused rather than shipping a payload that would unlink the difference.
- Payload order is the persisted sort, so the merged set is ordered by the staged-then-fetched sort value. Only the staged sort is applied to a fetched row; the link itself always comes from the fetched row, since a staged nested edit carries no related primary key and would make the writer deep-create a duplicate.
- The emit-dedupe key is the changeset alone and is advanced only after a successful emit, so a failed, aborted or cancelled build is retried instead of being silently deduped away.
- `isParentSaved` now uses the canonical `isNewItem` sentinels (`+`, `%2B`, `new`) rather than testing for `+` alone.

Note for the release: this overlaps `.changeset/list-m2a-mass-unlink-preserve.md`, which fixes the same defect and is still unreleased. Keep one of the two before cutting a release, or the changelog will document this fix twice.
