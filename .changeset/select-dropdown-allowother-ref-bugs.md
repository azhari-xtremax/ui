---
"@buildpad/ui-interfaces": patch
---

SelectDropdown: fix three `allowOther` ref bugs (V3-2, V3-3, N3-b).

- `lastCommittedRef` was only ever written by `commitOtherValue` itself, so a value committed once stayed permanently "sticky" for the rest of the mount's lifetime: commit "bar", select a different option, retype "bar" — the retype was silently dropped forever. It now stays in sync with the current `value` via an effect, so re-typing a value that isn't the current one always commits.
- `justSelectedRef` stayed `true` until the *next* `commitOtherValue` call however far in the future that was, so it also swallowed unrelated free text typed afterward: click "Foo" → type "bar" → Enter did nothing (consumed as the suppressed post-select blur); only the second Enter committed. It now self-clears on a microtask, which still suppresses Mantine's own synchronous post-select/post-Escape follow-up but no longer survives into a later, real keystroke.
- Enter with a highlighted dropdown option double-emitted `onChange` — once via the manual `commitOtherValue` (raw search text), once via Mantine's own selection (`handleChange` with the resolved choice value). The manual commit now checks `event.defaultPrevented` first, since Mantine calls `preventDefault()` when it's about to handle the Enter itself.
