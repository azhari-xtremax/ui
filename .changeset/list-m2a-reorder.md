---
"@buildpad/hooks": patch
"@buildpad/ui-interfaces": patch
---

ListM2A: drag reorder now works end-to-end and paginated sets are handled safely.

- Multi-position drags previously looped moveItemUp/moveItemDown against stale state within one tick, staging only a single-position swap. handleDragEnd now computes the full reordered array once (arrayMove) and stages it with a single reorderItems call.
- `useRelationM2AItems.displayItems` now orders items by the (possibly locally-staged) sort value. Staged reorders previously changed nothing observable: the list snapped back to fetch order and the emitted replace-mode payload — whose order is what the backend persists — kept the old order.
- reorderItems/moveItemUp/moveItemDown accept a `pageOffset` so any future cross-page reorder writes global sort values instead of page-local 1..N.
- Drag is now gated on `totalCount <= limit` (all pages, not the current page's row count) — reordering a paginated M2A emits a payload containing only the loaded page, which replace-mode would persist by deleting the other pages' junction rows. The drag-disabled notice uses the same condition, so paginated lists explain why drag is off instead of silently hiding the handles.
