---
"@buildpad/ui-interfaces": patch
---

SelectDropdown and SelectMultipleCheckboxTree edge-case fixes (N3/N4).

- SelectDropdown: `selectProps` no longer silently disables the `allowOther` commit wiring (consumer-supplied onBlur/onKeyDown/onSearchChange now compose instead of overwrite); blur/Enter no longer re-commit an unchanged value; Enter on a highlighted option no longer double-emits; Escape now discards typed-but-uncommitted text instead of letting the following blur commit it.
- SelectMultipleCheckboxTree: tree node collapse/expand state no longer resets when a search query changes which siblings are filtered out — keys are now derived from each node's position in the unfiltered choices tree instead of the filtered array's own index.

Reconciled with the earlier auto-expand fix (S4.9): node identity is stable across searches, so a manual collapse survives filtered-index shifts — but a query matching a collapsed branch's descendant still force-expands it, since a match hidden under a collapsed ancestor reads as "no results".
