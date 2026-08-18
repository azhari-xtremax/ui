---
"@buildpad/ui-collections": patch
"@buildpad/utils": patch
---

CollectionList: resolve select/radio/multi-select values to their configured choice label (S8.3).

`fieldTypeRenderCell` had no case for a choice-authoring field's `meta.options.choices` — a scalar select-dropdown/radio field showed its raw stored value (e.g. `"draft"` instead of the configured label `"Draft"`), and an array/csv-stored multi-select value fell through to the generic JSON-badge case, showing a content-less `"JSON"` badge instead of the selected labels. Now resolves scalar and array values through the field's choices, falling back to the raw value only when no configured choice matches.

The resolution dispatches on the field's **interface**, a different axis from the column type the rest of `fieldTypeRenderCell` switches on, so it runs ahead of the type chain rather than inside it: `select-dropdown` is declared for `integer`, `bigInteger`, `float` and `decimal` as well as `string`, and from inside the chain a numeric choice field never reached it — the numeric branch re-formatted the value through `toLocaleString()`, so a choice valued `1000` rendered as `"1,000"`: neither its label nor its stored value. A field is treated as a choice field only when its interface is one of `CHOICE_INTERFACES`, so a non-choice field that happens to carry `options.choices` keeps its own rendering, and an unresolvable `json` payload keeps its JSON badge.

`@buildpad/utils` gains `resolveChoiceLabel`, `parseChoiceValues` and `splitCsvValue`. Matching a stored value against a choice, and reading the three shapes a multi-select is persisted in (a real array, a JSON array still encoded as a string, and csv), are shared rules rather than list-rendering details — the form and the list have to agree on what a stored value means. `resolveChoiceLabel` matches exactly before falling back to a stringified comparison, so a value stored as `1` resolves to the choice authored as `1` and not to an earlier one authored as `"1"`.
