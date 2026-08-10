---
"@buildpad/ui-collections": patch
---

CollectionForm's edit fetch no longer requests O2M/M2M/M2A fields bare.

readOne(id) with no fields argument fell back to the backend's select-everything default, which includes relational alias fields bare — some DaaS backends 500 resolving these without explicit nested syntax, making the edit form unopenable for any collection with such a field (confirmed against a live instance: fields=id,title succeeds, fields=* 500s on a pages record with an M2A blocks field). The fetch now passes an explicit fields list built from editableFields with O2M/M2M/M2A fields excluded (matched by meta.special or interface, same signal as CollectionList; M2O keeps its real FK column) and the primary key force-included. The relational interfaces load their own data via their hooks, so nothing is lost.
