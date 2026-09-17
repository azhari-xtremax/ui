---
"@buildpad/ui-collections": minor
---

CollectionList: bulk actions receive the selected rows as `selectedRows`, including rows selected before a page, search or filter change.

`selectedRows` held the selection's primary keys cast as rows, so the "Add Existing" picker in `ListM2M` linked items without their display data and showed each one as a "NEW" row with no label. The list now keeps the selected rows themselves, in the same order as `selectedIds`.
