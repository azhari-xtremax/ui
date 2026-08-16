---
"@buildpad/ui-form": patch
"@buildpad/ui-interfaces": patch
---

Separate readonly from disabled across the form pipeline (S2.6).

Readonly and disabled are visually and semantically distinct — readonly means the value is visible but not editable and the control stays focusable and un-greyed; disabled means greyed out and inert. The form pipeline conflated the two, and untangling it needed changes at three layers:

**`FormField`** computed `isDisabled = disabled || isFieldReadOnly(field, ...)` and passed the result down as `disabled`. Everything `isFieldReadOnly()` reports — `meta.readonly`, auto-increment columns, auto-generated UUID primary keys, generated defaults — is semantically read-only, not disabled, so a readonly field reached the interface as `disabled=true`/`readOnly=false`. That is now routed to `readonly` instead, which is what actually fixes the reported symptom.

**`FormFieldInterface`** no longer sets `disabled` for a merely-readonly field. It also now suppresses `onChange` for readonly (not just `nonEditable`), drops `required` and `autofocus` on a locked field, and re-asserts the `onChange`/`disabled`/`readOnly` trio *after* the `meta.options` spread so admin-authored options JSON cannot unlock a locked control. `nonEditable` remains stronger and still sets both.

**`@buildpad/ui-interfaces`** — because `disabled` is no longer set for readonly fields, each leaf has to honour `readOnly` itself, and many did not. Fixed across `input`, `input-hash`, `input-code`, `file`, `file-image`, `files`, `select-radio`, `select-icon`, `select-multiple-checkbox`, `select-multiple-checkbox-tree`, `select-multiple-dropdown`, `tags`, `color`, `rich-text-html`, `rich-text-md`, `system-token`, `system-permissions`, `workflow-button` and `list-m2a`. Two distinct causes: several leaves had no read-only concept at all, and `input`, `input-hash`, `file`, `file-image` and `files` declared the prop in lowercase (`readonly`) while the form container passes camelCase (`readOnly`), so their existing read-only code was unreachable. Those five now accept either casing. `list-m2a` accepted `readOnly` and discarded it; it now uses the same `isEffectivelyDisabled` flag as `list-m2m` and `list-o2m`.

Without the leaf changes, dropping `disabled` would have made readonly fields fully editable — including `input-hash` (a stored credential) and `system-token` (a live API token).
