---
"@buildpad/ui-interfaces": minor
---

SelectDropdownM2O: apply the `filter` prop to the available-items request.

The prop was destructured and then discarded, so a filter set in the field's options never reached the request: the dropdown, and the select modal that lists the same items, offered every row of the related collection. The filter is now sent with that request, and when a search term is active the two are combined under `_and`, so neither one overrides the other. The selected item is still loaded unfiltered, so a current value that falls outside the filter keeps rendering.

An empty filter object counts as no filter, the way `CollectionList` already treats one, so a field whose filter builder was opened and then cleared does not put a no-op rule in every request.
