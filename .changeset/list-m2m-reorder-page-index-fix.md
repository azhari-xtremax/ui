---
"@buildpad/hooks": patch
"@buildpad/ui-interfaces": patch
---

Fix ListM2M arrow-reorder misalignment with staged creates (N2).

`moveItemUp`/`moveItemDown` in `useRelationMultipleM2M` recomputed their own "visible" array from the hook's unfiltered `displayItems` (includes every staged create, globally sorted), while `ListM2M` passed an `index` from its own page-local `visibleItems` (staged creates hidden on any page that isn't the last). Whenever a staged create existed, the two arrays disagreed and the arrow reorder moved the wrong item. Both functions now take the caller's exact page-local array instead of an index they re-derive differently — this is a breaking change to their signature (`(pageItems, index, pageOffset?)` instead of `(index, pageOffset?)`).
