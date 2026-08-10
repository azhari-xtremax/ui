---
"@buildpad/ui-interfaces": patch
---

Choices whose values stringify identically (e.g. number 1 vs string '1') no longer crash SelectDropdown/SelectMultipleDropdown or warn in SelectMultipleCheckbox(Tree).

- The dropdowns build Mantine data arrays that require globally-unique string values; a colliding pair hard-crashed the field ("Duplicate options are not supported"). The second occurrence is now skipped, matching the existing first-match selection resolution — the dropped choice was never independently selectable.
- The checkbox and tree leaves key rows by index + stringified value instead of the stringified value alone, eliminating React's duplicate-key warning; selection state already compared real typed values and is unchanged.
