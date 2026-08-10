---
"@buildpad/ui-interfaces": patch
---

SelectRadio: stored falsy values (0, false) are treated as real selections, and choice matching tolerates string/number type mismatches.

- `!value`-style guards became `value == null`, so a stored `0` or `false` no longer renders as "nothing selected" (or gets misrouted to the "Other" input when allowOther is set).
- In-choices detection stringifies both sides, matching the highlight/emit logic that already did — a choice authored as `'3'` matches a stored integer `3`.
- The radio-group value no longer collapses `0`/`false` to `''` via `String(value || '')`.
