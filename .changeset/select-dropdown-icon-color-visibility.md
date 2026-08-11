---
"@buildpad/ui-interfaces": patch
---

SelectDropdown: fix icon visibility when a choice has both `icon` and `color` set (S2.5).

- `renderOption` previously hid the icon whenever a color was also present, showing only the color swatch.
- The closed input's `leftSection` never showed the selected choice's own icon/color at all — once a value was picked, `showGlobalIcon` correctly turned off the global fallback, but nothing filled that gap, so the input went blank instead of showing the selection's own icon.

Both now mirror each other: a choice with both `icon` and `color` shows both, in the option list and in the closed input.
