---
"@buildpad/ui-form": minor
---

VForm: hand each field interface a `data-testid` of `field-<fieldName>`.

The container never passed one, so `getByTestId('field-password')` and friends found nothing in a consuming app's end-to-end suite, even though several interfaces already accept the prop and derive sub-ids from it, such as `field-token-generate` and `field-token-container`. The testid is declared after the `meta.options` spread, so an admin-authored `data-testid` option cannot take the container's place — the same ordering `aria-label` already relies on.

Every field interface renders it, the eight that used to drop it included — see the `@buildpad/ui-interfaces` entry in this release. `InputHash` and `SystemToken` also derive their sub-ids from it.

Note that `field-<fieldName>` describes a field, not one element: the same field name rendered twice at once, such as a nested form in a drawer above its parent form, produces the id twice. Scope the query to the form under test.
