---
"@buildpad/ui-interfaces": patch
---

ListO2M: close the saved-parent mass-unlink holes around the changeset emit.

The emit effect now maintains a preserve set — the full id list of the parent's currently linked children — and appends it to every saved-parent payload, so the relation writer's authoritative handling of that payload can't deselect unrelated children. Concretely:

- Reverting a staged link (stage → un-stage) re-emits the full current id set (a no-op re-link) instead of `[]`, which the writer answers by unlinking or deleting every child.
- Emits are synchronous whenever a known-good preserve set exists (the first successful fetch seeds it, and it is re-fetched in the background after each emit, re-emitting only when the server set actually changed). The parent form is never left holding an outdated payload during a fetch round-trip, so a Save clicked mid-fetch can no longer submit a reverted change.
- Direct mutations on a saved parent (row unlink/delete, creating a child via the modal) update or invalidate the preserve set and re-emit, so a pending payload can't re-link a removed child or deselect a just-created one.
- A preserve fetch that fails — or that returns a row set not matching the server's exact count (e.g. a server-side row cap), or rows missing their primary key (e.g. stripped by field permissions) — never produces a destructive payload: with no cached set the emit is withheld and an inline error with a Retry action is shown; with a cached set the synchronous emit has already delivered the last known-good payload.
