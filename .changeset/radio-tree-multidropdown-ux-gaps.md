---
"@buildpad/ui-interfaces": patch
---

Radio per-choice icon/color, checkbox-tree UX fixes, multi-dropdown allowOther/icons, and a checkbox allowOther double-render fix.

- SelectRadio (S3.3): `RadioChoice` now supports `icon`/`color`, rendered next to the label. As a side effect, per-choice (and group-default) checked-state color is now applied via Mantine's native `color` prop instead of a `styles`-prop `&[data-checked]` selector that does nothing in Mantine v8 (S3.4).
- SelectMultipleCheckboxTree: a fully-selected parent in `leaf` mode now shows checked instead of stuck indeterminate (S4.5); searching a parent's own text no longer hides all its children (S4.6); cascade toggles ('all'/'leaf' modes) now skip disabled descendants (S4.7, on top of the existing per-node `disabled` support); `data-testid` is now scoped by index path instead of the raw (possibly colliding) value (S4.8 residual); nodes on the path to a search/selection match now force-expand past a prior manual collapse (S4.9); recursive walkers now cap at a depth of 100 as a defensive guard against cyclic input (S4.10); `color` now gets the same `var(--mantine-color-X-6)` normalization as its sibling checkbox (S4.11).
- SelectMultipleDropdown: `allowOther` is now implemented (Enter/blur commits typed free text, mirroring SelectDropdown's manual creatable pattern) instead of silently doing nothing (S6.2); `DropdownChoice` now supports `icon`/`color`, rendered in the option list, and the global pill `color` is normalized for hex/rgb/hsl the same way `SelectMultipleCheckbox` already does (S6.3).
- SelectMultipleCheckbox (S7.3): a custom "other" value committed via its own input row no longer also renders as a second, separate read-only checked checkbox — the live row now takes precedence.
