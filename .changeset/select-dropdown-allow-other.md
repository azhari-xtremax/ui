---
"@buildpad/ui-interfaces": patch
---

SelectDropdown: allowOther can now actually commit a custom value.

Mantine v8's Select has no creatable mode and its onChange never fires for text matching no option, so the old allowOther branch was unreachable — typed values could never be committed. Free text is now committed manually on Enter or blur (unless it matches an existing choice), and an already-committed custom value is injected as a synthetic option so the field displays it instead of blank.
