---
"@buildpad/ui-interfaces": patch
---

SelectDropdownM2O: clearing the value now resets the shown item, and picked options emit their real (typed) key.

- The item-load effect only handled the truthy branch, so a value going non-null → null (clear button, or an external reset) kept the previously-loaded item on screen — the field showed a stale label while its value was empty. The effect now calls clearItem() in the else branch.
- onOptionSubmit forwarded Mantine's always-stringified option value straight to onChange, storing numeric foreign keys as strings and breaking the `active` highlight (a raw comparison that never matches a re-stringified value). The submitted string is now resolved back to the matching item and its real key is emitted; the table-layout path already did this.
