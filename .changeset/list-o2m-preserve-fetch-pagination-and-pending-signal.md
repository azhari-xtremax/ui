---
"@buildpad/ui-interfaces": patch
---

ListO2M: two follow-ups to the saved-parent preserve-fetch (§2 hardening gap #4, the "Minor" items).

1. The preserve-fetch requested `limit=-1&page=0` ("no limit"), but a PostgREST-fronted deployment can silently cap the actual response at its own server-side max-rows setting regardless of what was requested. Now requests `meta.total_count` alongside the first response and keeps paging with a real limit until the fetched count actually matches what the backend claims exists, instead of trusting a single unbounded request to mean "all of them".
2. Adds an optional `onPendingChange?: (pending: boolean) => void` prop, fired while the preserve-fetch is in flight. The emit that follows a staged change on a saved parent is async — if a consumer's Save button doesn't know to wait for it, a click that races ahead of the fetch can submit before the just-staged change reaches the parent's `onChange`. Consumers with a Save button can now disable it while `onPendingChange` reports `true`.
