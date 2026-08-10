---
"@buildpad/ui-interfaces": patch
---

SelectRadio: a choice missing `text` no longer crashes the field, and choices whose values stringify identically no longer collide on React keys.

- The width-measurement reducer read `val.text.length` unguarded, so one malformed/seeded choice without `text` threw during render. It now treats missing text as `''`, and the radio label falls back to the choice's value.
- Row keys are index-qualified; the native radio `value` stays unqualified — two choices stringifying identically still share one native selection slot, which is audit 3.7's separately-documented limitation.
