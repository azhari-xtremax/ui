---
"@buildpad/ui-interfaces": minor
---

Every field interface now renders the `data-testid` it is handed.

VForm hands each interface a `data-testid` of `field-<fieldName>`, but eight interfaces dropped it silently: they neither declared the prop nor passed unknown props to a DOM node, so `getByTestId('field-<name>')` found nothing for a textarea, a date, a colour, or any of the select interfaces. `Textarea`, `DateTime`, `SelectDropdown`, `SelectRadio`, `SelectMultipleCheckbox`, `SelectMultipleCheckboxTree`, `SelectMultipleDropdown` and `Color` now accept it.

Where it lands follows what a test would target: the control itself for a single-control interface (`Textarea`, `DateTime`, `SelectDropdown`, `SelectMultipleDropdown`), and the interface's own container for the composite ones (`SelectRadio`, both checkbox interfaces, `Color`), so a query can be scoped to the field and still reach every option inside it. The container also carries the id in the "no choices configured" state, so a misconfigured field can still be found.

`SelectDropdown` keeps its own `data-testid="select-dropdown"` when nothing is handed to it, so existing selectors against a standalone dropdown still work; a testid from the form wins over it.
