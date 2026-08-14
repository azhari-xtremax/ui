---
"@buildpad/ui-interfaces": patch
---

SelectDropdown & SelectMultipleDropdown: rework the `allowOther` free-text commit path (V3-2, V3-3, N3-b and adjacent holes).

- **Enter commits are now deferred one microtask.** Mantine invokes the consumer `onKeyDown` before its own Enter handling, so nothing Mantine is about to do (preventDefault, selecting a highlighted option) is observable in the handler itself; the deferred commit instead consults a selection flag set by the chained `onOptionSubmit`, which Mantine fires synchronously in the same task. One Enter on a highlighted option now produces exactly one `onChange` with the resolved choice value — previously it double-emitted the raw search text first. A consumer `selectProps.onKeyDown` that preventDefaults Enter (the usual anti-form-submit guard) no longer affects the commit wiring.
- **`onOptionSubmit` also eagerly syncs the search text to the submitted option's label** (and fires even when re-submitting the currently-selected option, which Mantine's `onChange` skips), so a blur that lands before the controlled value echo — or after a no-op re-select — no longer commits the abandoned filter fragment over the selection.
- **`lastCommittedRef` stays in sync with the current value** (trimmed) via an effect and is also updated on every selection, so re-typing a previously committed value always commits again — including for consumers that don't echo the value back into `value`.
- **Text naming an existing choice resolves to that choice** (`onChange(choice.value)`) instead of being silently dropped — typing an exact label with no highlighted option used to be a dead keystroke whose text blur then wiped. Comparisons are trimmed-to-trimmed, so whitespace-padded values/labels can't produce spurious commits on focus traversal.
- **`readOnly`/`disabled` fields never emit** from the commit path, an Enter that confirms an IME composition (`isComposing` / keyCode 229) is ignored, and Escape restores the selected choice's label rather than exposing the raw stored value.
