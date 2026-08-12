---
"@buildpad/ui-form": patch
---

FormFieldInterface: two fixes.

1. Passes `data-testid={`field-${field.field}`}` to every rendered interface, so leaves that accept a `data-testid` prop (InputHash, SystemToken, ...) derive stable, per-field sub-element testids (e.g. `field-token-generate`) instead of never receiving one at all.

2. Fixes `effectiveValue`'s hash/conceal synthesis to only kick in when a field's value is `undefined` (omitted from the response), not `null`. DaaS's server-side `conceal` transformer already distinguishes "no value" (`null`) from "value exists" (`'**********'`) on read — treating an explicit `null` the same as "omitted" re-masked a just-cleared system-token back to `'**********'` forever, since the client could never tell the two states apart afterward.
