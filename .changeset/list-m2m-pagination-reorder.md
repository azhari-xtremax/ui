---
"@buildpad/hooks": patch
"@buildpad/ui-interfaces": patch
---

ListM2M: paginated reorder writes global sort values, staged creates render only on the last page, and the broken batch-edit trigger is disabled.

- `reorderItems`/`moveItemUp`/`moveItemDown` in useRelationMultipleM2M accept a `pageOffset` (ListM2M passes `(currentPage - 1) * limit`), so reordering on page 2+ no longer collides with every other page's 1..N sorts. The staged updates are emitted in the ChangesItem and persist on save.
- `displayItems` now orders by the (possibly staged) sort value, so an arrow reorder is visible immediately instead of only after a server round-trip.
- Locally staged creates previously rendered on every page (the hook appends all of `changes.create` to whatever page is fetched); ListM2M now shows them only on the last page, where totalCount already accounts for them.
- The batch-edit button opened `CollectionForm(mode='edit', id=undefined)` — an empty broken form with no batch-apply logic behind it. It is now disabled with an explanatory tooltip until a real batch-edit flow exists.
