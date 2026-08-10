---
"@buildpad/ui-collections": patch
---

CollectionList no longer requests O2M/M2M/M2A fields as bare columns.

The default-visible-fields filter only excluded fields whose column type is "alias", but some DaaS backends report the physical type (e.g. text) for relational fields — their bare name then landed in the list view's fields= query and 500'd the backend ("column pages_blocks_1.undefined does not exist"). Fields are now also excluded when meta.special contains m2a/m2m/o2m or the interface is list-m2a/m2m/o2m — the backend-agnostic signal, same policy as CollectionForm's edit-fetch exclusion. M2O fields keep their real FK column and remain visible.
