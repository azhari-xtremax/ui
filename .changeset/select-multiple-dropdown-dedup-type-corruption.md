---
"@buildpad/ui-interfaces": patch
---

SelectMultipleDropdown: fix dedup-drop type corruption for already-selected values (S6.6).

Two choices whose values stringify identically (e.g. number `1` vs string `'1'`) only ever have the first survive the render-time dedup. `handleChange` rebuilds the *entire* selected array from Mantine's stringified selection on every toggle, so an already-selected "dropped twin" (e.g. a stored string `'1'`) was silently re-typed to the surviving choice's type (`1`) whenever the user toggled any unrelated item — not just the colliding one. Already-selected values now keep their exact stored type; only genuinely new selections resolve through the choices list.
