---
"@buildpad/ui-interfaces": patch
---

ListM2A: stop the replace-mode payload from mass-unlinking off-page junction rows.

The emitted M2A payload was built from `displayItems`, which is page-scoped (`useRelationM2AItems.loadItems` always sends `limit`/`page`), while the DaaS relation writer treats the payload as the complete set: it deletes every junction row for the parent, then re-inserts only what it received. With more junction rows than one page, staging any single change and saving deleted every off-page row. Bare-primitive entries can't patch over this the way ListO2M's preserve does — `processM2AField` ignores primitive entries entirely — so the emit now preserve-fetches every junction row for the parent (`limit=-1&page=0`, `count=exact`) at build time, drops staged deletes, applies staged sort updates to the payload order (payload order is what the backend persists as sort), appends staged creates, and emits the full `{ collection, item }` set. A failed or incomplete preserve-fetch (returned rows ≠ the server's exact count) aborts the emit instead of falling through, since an incomplete replace payload is destructive rather than merely incomplete. The fetch runs fresh per emit (not a mount-time snapshot), and emit dedupe now keys on *successful* emits so an aborted build retries on the next change.
