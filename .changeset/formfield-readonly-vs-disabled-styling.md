---
"@buildpad/ui-form": patch
---

FormFieldInterface: stop setting `disabled` for a merely-readonly field (S2.6).

`interfaceProps.disabled` was `disabled || isEffectivelyReadonly`, so any readonly field also rendered with disabled styling even though every leaf already receives `readOnly` separately. Readonly and disabled are visually and semantically distinct (readonly: value visible, not editable; disabled: greyed out, inert) — a readonly field should look and behave like a readonly field, not a disabled one. `nonEditable` (stronger than readonly — no interaction at all) still sets both.
