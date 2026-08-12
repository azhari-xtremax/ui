---
"@buildpad/ui-interfaces": patch
---

Tree, checkbox, and CollectionItemDropdown: fix six V3-7 quirks.

**SelectMultipleCheckboxTree**
- Clicking the chevron to collapse an auto-expanded ancestor (search matched a descendant) was a silent no-op — toggling `manuallyExpanded` recomputed `expanded` back to `true` anyway since the auto-expand condition still applied. An explicit click now always wins via a `userOverride` that's cleared on the next search.
- `data-testid`s were derived from each node's index in the *filtered* array, so they shifted whenever search/`showSelectionOnly` changed which siblings were visible. Now derived from the same stable `__key` already used as the React key.

**SelectMultipleCheckbox**
- The "already backed by a live row" exclusion (S7.3) matched a stored value against every row's typed text by stringified digits, regardless of whether that row was even checked. A stored *number* (e.g. `5`) was hidden entirely whenever an unrelated, unchecked row's in-progress text happened to be the *string* `"5"`. Now matches by strict value equality against only checked rows.

**CollectionItemDropdown**
- Blur committed the typed collection text as-is even when it didn't resolve to a real collection, wiping the item selection and pointing `selectedCollection` at something that doesn't exist. Now reverts the draft instead of committing an unvalidated partial string.
- A menu-item click fires its `onClick` *after* the input's `blur` (the browser dispatches blur first when focus moves to the clicked item) — blur used to commit whatever partial/stale text was typed, immediately followed by the click's own correct commit. Blur now defers entirely while the collection menu is open.
- Retyping the current collection (e.g. backspace + retype the same characters) unconditionally cleared the item selection even though the collection never actually changed. `handleCollectionSelect` now no-ops when the target collection is already the current one.
