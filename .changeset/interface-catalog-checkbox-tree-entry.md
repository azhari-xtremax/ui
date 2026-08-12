---
"@buildpad/utils": patch
---

interface-catalog: add the missing `select-multiple-checkbox-tree` entry (S4.4/S8.4).

`PROVISIONABLE_INTERFACES` had no entry for the checkbox-tree interface even though `select-multiple-checkbox-tree` is a real, resolvable interface id (`field-interface-mapper.ts` already has a `case` for it) and the live interface picker already offers it elsewhere — the catalog was dead code for this interface, silently excluding it from any type-aware picker built off `provisionableInterfacesForType`. Also added it to `CHOICE_INTERFACES` so the choices editor and the zero-choices save guard (`interfaceRequiresChoices`) apply to it the same as the other choice-authoring interfaces.
