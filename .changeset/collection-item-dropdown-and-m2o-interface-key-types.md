---
"@buildpad/ui-interfaces": patch
---

CollectionItemDropdown and SelectDropdownM2OInterface no longer corrupt numeric/non-`id` primary keys.

- CollectionItemDropdown's Combobox path stringified the selected key (Mantine's `onOptionSubmit` value), so numeric PKs were emitted as strings and lost their `active` highlight. `onOptionSubmit` now resolves the submitted string back to the matching item's raw key.
- The free-text collection input cleared the current item selection on every keystroke (`onChange` fired `handleCollectionSelect` per character). It now only commits — and clears the selection — when the typed value exactly matches an available collection, or on blur.
- SelectDropdownM2OInterface hardcoded `.id` to read the current value, so a related collection with a non-`id` PK (e.g. a slug) always showed "No item selected" despite a value being set. It now resolves the PK via `relationInfo.relatedPrimaryKeyField`, falling back to `id`. A primitive value is also now wrapped under the resolved PK field before being handed to `renderSelectedItem`, instead of being cast as an item object as-is.
