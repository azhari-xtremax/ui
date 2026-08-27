---
"@buildpad/ui-collections": patch
---

CollectionList no longer strands users on pages that hold nothing when DaaS reports an estimated total.

DaaS defaults `meta.total` to the query planner's estimate on large collections (exact below the server's row threshold), and a stale estimate can be off by hundreds of thousands of rows in either direction — measured 5,322,335 reported against 5,002,621 real rows, which made the pager offer ~32,000 empty pages. CollectionList treated the number as exact.

- Landing on a page past the real end of the collection now steps back to the last page that exists instead of rendering an empty table beneath a footer that claims rows. The overshot page is never painted.
- A total the server proves exact (`meta.total_estimated: false` — sent by DaaS from v0.1.93) is pinned for the current query, so later estimated responses cannot resurrect the phantom page buttons the server already disproved. The pin clears whenever the matching set changes (collection, search, filters, archive mode), on deletes through the list, and on manual refresh. Against a server that never sends the flag, behavior is unchanged.
- Responses are guarded by a per-call request id, so an out-of-order response from a superseded load can no longer overwrite fresher state — which matters more now that a response can move the page.
- A non-finite `meta.total` falls back to counting the received rows instead of feeding NaN into the page math.
