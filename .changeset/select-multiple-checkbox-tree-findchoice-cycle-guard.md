---
"@buildpad/ui-interfaces": patch
---

SelectMultipleCheckboxTree: `handleToggle`'s `findChoice` helper recursed into `node.children` with no depth guard, unlike every other recursive walker in the file (all gated on `MAX_TREE_DEPTH`). A choices tree containing a cycle (a node whose descendants loop back to it — e.g. a malformed API response reusing a shared object reference) overflowed the call stack on the very first toggle instead of failing gracefully. `findChoice` now bails out past `MAX_TREE_DEPTH` like its siblings.
