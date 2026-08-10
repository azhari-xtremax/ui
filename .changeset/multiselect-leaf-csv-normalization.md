---
"@buildpad/ui-interfaces": patch
---

SelectMultipleDropdown and SelectMultipleCheckbox normalize csv-string values themselves.

Both are registered for json (array) and csv (comma-string) storage but assumed arrays. The FormFieldInterface pipeline already normalizes for its own leaves, but a consumer using either exported component directly still hit the raw-string failure cluster: silently dropped data in the dropdown (Array.isArray ? ... : []), and substring-match reads, character-spread corruption, uncheck TypeErrors, and an allowOther render crash in the checkbox. The leaves now accept a `type` prop ('csv' | 'json'), normalize string values on read (also inferring csv storage from an observed string), and re-serialize to a comma-string on write for csv storage — composing with the pipeline without double-joining.
