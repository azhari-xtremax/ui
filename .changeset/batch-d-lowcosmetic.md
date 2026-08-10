---
"@buildpad/hooks": patch
"@buildpad/ui-interfaces": patch
"@buildpad/ui-collections": patch
"@buildpad/utils": patch
---

Batch of low/medium audit fixes across the relational stack.

- All four relation item hooks (M2A, M2O, MultipleM2M, O2M) guard loadItems with a per-call request id, so an out-of-order response from a superseded call can no longer overwrite state with stale data.
- ListO2M: editing a staged-created ($temp_) row merges into its changeset.create entry instead of staging an update the backend can't resolve.
- ListM2MInterface: the render-prop placeholder resolves {{field}} templates via the shared renderTemplate instead of printing the raw template string.
- useRelationM2MItems requests the resolved junction PK field instead of a literal "id".
- field-interface-mapper reads M2A allowed collections from snake_case `allowed_collections` (real DaaS storage) with camelCase fallback.
- CollectionForm passes the loaded item's initial data (not schema defaults) as VForm initialValues.
- ListM2M: header comment now documents that only junction-level operations are local-first; related-item edits persist immediately.
