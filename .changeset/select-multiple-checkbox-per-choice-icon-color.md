---
"@buildpad/ui-interfaces": patch
---

SelectMultipleCheckbox: two fixes.

1. Adds per-choice `icon`/`color` support (`Option.icon`, `Option.color`), matching SelectRadio's existing S3.3 fix — a choice's icon renders before its label, or a color swatch when only `color` is set, and `choice.color` overrides the group-level `color` default on the checkbox itself (S7.2).
2. While verifying #1, found the group-level `color` prop's checked-state color was never actually rendering: the checkbox's `wrapperProps={{ style: {...} }}` gets spread onto the root element's props *after* Mantine's own computed style (which carries `--checkbox-color` and friends), so a raw `wrapperProps.style` object doesn't merge with it — it silently replaces it outright. Switched to `styles={{ root: {...} }}`, which goes through Mantine's vars resolver and merges correctly, matching how SelectRadio already styles its own per-choice parts.
