---
"@buildpad/ui-interfaces": patch
---

Tree, checkbox, and CollectionItemDropdown: fix six V3-7 quirks.

**SelectMultipleCheckboxTree**

- Clicking the chevron to collapse an auto-expanded ancestor (search matched a descendant) was a silent no-op — toggling `manuallyExpanded` recomputed `expanded` back to `true` anyway since the auto-expand condition still applied. An explicit click now wins, by storing the user's choice together with the auto-expand context it was made in. Both `searchQuery` **and** `showSelectionOnly` feed that context: keying on the search alone would leave a user-collapsed node collapsed when "Show Selected" is clicked, hiding the very selection that mode exists to reveal.
- `data-testid`s were derived from each node's index in the *filtered* array, so they shifted whenever search or `showSelectionOnly` changed which siblings were visible. They are now derived from each node's position in the **unfiltered** array. The format is unchanged (`checkbox-0`, `checkbox-0-2-1`) — only its stability — so no existing selector breaks.
- `valueCombining='all'` counted disabled descendants when deciding whether a parent is fully checked, while the cascade toggle deliberately refuses to select them (S4.7). A single disabled descendant therefore held the parent at indeterminate forever, with every further click re-emitting an identical selection. The `'leaf'` branch already carried this fix; `'all'` now matches.

**SelectMultipleCheckbox**

- The "already backed by a live row" exclusion (S7.3) matched a stored value against every row's typed text, regardless of whether that row was even checked. A stored *number* (e.g. `5`) was hidden entirely whenever an unrelated, unchecked row's in-progress text happened to be the *string* `"5"`. Only checked rows are considered now. The comparison itself stays string-based: a row's value is always its typed text, so a strict-equality test could never match a stored number or boolean, and the entry would render twice — once read-only and once as the row.

**CollectionItemDropdown**

- Blur committed the typed collection text as-is even when it didn't resolve to a real collection, wiping the item selection and pointing `selectedCollection` at something that doesn't exist. It now reverts the draft instead — but only when the collection list is actually known. The list starts empty and is filled by an async fetch that can also fail outright, and treating "we haven't loaded it yet" as "that isn't a collection" silently discarded valid typed input, removing the free-text escape hatch exactly when the menu can't offer one.
- Typing a valid collection in full committed twice: once from the change handler and again on blur, because blur compared the draft against `selectedCollection`, which a controlled prop that doesn't echo `onCollectionChange` never updates — and the form pipeline never passes that callback at all. Blur now compares against what was actually last committed.
- Retyping the current collection (e.g. backspace + retype the same characters) cleared the item selection even though the collection never changed. Only that destructive half is now skipped: the pick is still reported to the parent, since "value unchanged" and "user made no choice" are different events and a parent that has lost its collection relies on the callback to learn the user re-confirmed one.
