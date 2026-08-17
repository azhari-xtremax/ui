---
"@buildpad/ui-interfaces": patch
---

SelectMultipleCheckboxTree: survive a cyclic choices tree, and make the toggle lookup O(1) (S4.10).

A choices tree containing a cycle — a node whose descendants loop back to it, e.g. a malformed API response reusing a shared object reference — could take the component down. `handleToggle` resolved the clicked node with an unguarded depth-first search, so a cycle reached before the target overflowed the stack on the first toggle.

Rather than add a depth cap to that one search, the lookup is now a `Map` from value to node, memoized on `choices` and built with a `WeakSet` of visited nodes. Three things follow:

- **Cycles are detected, not merely bounded.** A depth cap only limits how long a cycle spins, and does not survive a node listed *twice* in its own children: that fans out 2^depth and exhausts memory long before any cap bites — a frozen tab rather than an empty branch. Visited-node detection terminates on any cycle shape. The same treatment is applied to the two walkers that rebuild the tree for rendering, which cycle independently of the toggle; there it is an ancestor-chain check, since a node is only cyclic if it appears within its own subtree.
- **No false negatives on deep data.** A cap silently stops resolving nodes that are still on screen: the render-side walker keeps one level more than a capped search would reach, so a node at that boundary rendered but its click did nothing. An exact lookup has no boundary to disagree about.
- **The traversal is no longer duplicated.** The component already walked the identical tree with identical dependencies to collect `choiceValues` for csv normalization; that list is now derived from the same map, and the per-toggle re-walk is gone.

First occurrence wins, preserving the depth-first ordering the previous search had.
