---
"@buildpad/ui-interfaces": patch
---

SelectIcon: forward `...rest`/`autoFocus`, and unify the unknown-icon fallback glyph (S5.5, S5.7).

- `SelectIconProps` had no `...rest`/`autoFocus` forwarding, unlike every other selection leaf — a consumer couldn't pass extra props (e.g. `data-*`, event handlers) through to the trigger button, and autofocusing the field wasn't possible.
- The trigger's own unknown-icon rendering (`renderIcon`) and the read-only `IconDisplay` companion used two different fallback glyphs (`IconQuestionMark` vs `IconUsersGroup`) for the exact same condition — a stored icon name with no `ICON_MAP` entry. Both now default to the same glyph (`IconQuestionMark`, exported as `DEFAULT_UNKNOWN_ICON`), and the trigger now also surfaces the raw stored name on hover instead of a bare `?` (the picker itself stays a fixed curated set — Material has thousands of icon names, mapping all of them isn't a bounded fix — S5.1).
