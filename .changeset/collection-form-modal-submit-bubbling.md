---
"@buildpad/ui-collections": patch
"@buildpad/ui-interfaces": patch
---

Modal CollectionForm submits stay contained, and ListO2M's Create New no longer pre-fills the '+' placeholder as the child's FK.

- CollectionForm's submit handler now stops propagation: callers render it inside a portaled Mantine Modal, and React bubbles the synthetic submit along the component tree — so saving the inner form also submitted an ancestor page form with its stale changeset.
- ListO2M only pre-fills the reverse FK default when the parent is actually saved; for an unsaved parent ('+' placeholder) the link is staged into the changeset on save, as before — but the literal "+" no longer leaks into the created child's FK field.
