---
"@buildpad/ui-interfaces": patch
---

SelectMultipleDropdown: fix the `allowOther` free-text commit path and option rendering (V3-6).

- **Enter on a highlighted option no longer double-emits.** The commit is deferred one microtask and consults a flag set by a chained `onOptionSubmit`, because this component's `onKeyDown` runs *before* Mantine's own Enter handling — so `event.defaultPrevented` cannot be used to detect it. Previously one keystroke emitted twice (the raw filter text, then the resolved option), and the second emission overwrote the first, discarding the typed text. A consumer that preventDefaults Enter (the usual guard against a wrapping form submitting) no longer loses the commit, and an Enter confirming an IME composition is ignored.
- **Text naming an existing choice now selects that choice** (matched case-insensitively, so "REACT" finds "React") instead of being silently discarded. Custom values are still compared case-sensitively, so case-distinct free-text entries such as `ember` and `Ember` remain separate — on a free-text field the casing is user data.
- **`maxValues` now caps manual commits**, and a commit blocked by the cap leaves the typed text in the box instead of erasing it with no feedback.
- **Commits are suppressed while the field is `disabled` or non-`searchable`**, so disabling a focused field mid-edit (the standard "disable while saving" pattern) no longer commits its pending text on the resulting blur.
- **Clearing the selection keeps csv storage intact.** The empty selection now emits `''` rather than `null` under csv storage, and the storage-shape inference is latched, so subsequent writes stay comma-strings instead of switching to arrays.
- **Rendering:** a choice that sets both an icon and a colour now shows both (the colour was dropped whenever an icon was present), the selected-option check is a proper `IconCheck` rather than a literal `✓` character inside the option's accessible name, and `hidePickedOptions`/`limit` now work in non-searchable mode (the custom `filter` was returning the unfiltered option list).
