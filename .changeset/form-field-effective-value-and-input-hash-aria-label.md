---
"@buildpad/ui-form": patch
"@buildpad/ui-interfaces": patch
---

Two follow-ups to the FormFieldInterface conceal/hash fixes:

1. `FormField`'s own `effectiveValue` was coercing an omitted (`undefined`) value to `null` before it ever reached `FormFieldInterface` — defeating the undefined-vs-null distinction that fix relies on to decide whether to synthesize the `'**********'` mask. Fields that are genuinely omitted from the fetched item (e.g. a write-only `password` column never round-tripped on read) never got masked as a result. `FormField` now passes `undefined` through for hash/conceal fields instead.

2. `InputHash` never declared or forwarded an `aria-label` prop, so a password-style field rendered with no visible `label` (the common case — `FormField` renders its own label separately) had no accessible name at all. `InputHash` now accepts `aria-label` and forwards it to the underlying Mantine input when no `label` is set.
