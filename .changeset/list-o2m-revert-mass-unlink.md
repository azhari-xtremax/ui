---
"@buildpad/ui-interfaces": patch
---

ListO2M: fix a mass-unlink hole in the saved-parent preserve-fetch.

The preserve-fetch that keeps a saved parent's other linked children out of the deselect path only ran while `changeset.link.length > 0`. Staging a link and then removing it again (change of mind) leaves the changeset empty, so the emit effect sent `[]` — the relation writer's empty-array branch then unlinks or deletes every child, not just the reverted one. The preserve-fetch now also runs on any emit after the first (`hasEmittedRef.current`), so a stage→unstage→save reverts to a no-op re-link of the full current id set instead of a payload that wipes the relation. A failed preserve-fetch now aborts the emit instead of falling through to a links-only payload, since an incomplete payload here is destructive, not just incomplete.
