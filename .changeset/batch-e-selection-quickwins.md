---
"@buildpad/ui-interfaces": patch
"@buildpad/ui-form": patch
---

Selection quick-wins across Radio, CheckboxTree, Icon, MultiDropdown, Checkbox, and the form pipeline.

- SelectMultipleCheckboxTree: search queries containing regex special characters no longer crash the field; label ids use useId() instead of Math.random() (SSR hydration); per-node disabled flag.
- SelectMultipleCheckbox: per-option disabled flag; the allowOther swatch detects hex/rgb/hsl colors and styles via color-mix instead of producing invalid var(--mantine-color-...) names.
- SelectMultipleDropdown: clearable is no longer gated behind allowNone; the selection-order sort copies Mantine's array instead of mutating it; aria-label is forwardable.
- SelectRadio: the "Other" option stays checked while its input is open before any text is typed; aria-label is forwardable.
- SelectIcon: formatTitle/renderIcon guard non-string values instead of throwing; aria-label forwarded to the trigger when no visible label is set.
- FormFieldInterface forwards readonly state as the camelCase readOnly prop the interfaces actually consume.
