---
"@buildpad/ui-interfaces": patch
---

ListM2A: fix a paginated/search-filtered replace-mode data-loss trio.

`ListM2A`'s emit effect built its replace-mode payload straight from the current page's `displayItems`, which silently dropped every off-page junction row on save for a saved parent with more rows than fit on one page (v1 §6.1) — the backend deletes-all-then-inserts, so anything missing from the payload is gone. It also dropped non-matching rows when an active search narrowed the on-page count below the limit, and rewrote the junction sort order from payload insertion order since the preserve-fetch requested no `sort`.

Ports a full-set preserve-fetch (fetch every currently-linked junction row unpaginated, overlay local create/update/delete, request/carry the sort field through) upstream — `ui`'s `ListM2A.tsx` never had this mechanism at all; DaaS had it as a local hand-patch. Also: the fetch gate now triggers on an active search, not just `totalCount > limit`; a failed preserve-fetch aborts the emit instead of falling back to the destructive page-scoped payload; and the emit-dedupe key now includes `totalCount`/`limit`/`search` so a context change alone (not just a changeset change) re-evaluates which baseline to use.
