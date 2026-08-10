---
"@buildpad/ui-interfaces": patch
---

CollectionItemDropdown's value prop type matches the shapes its normalization already handles.

The prop was declared as CollectionItemDropdownValue | null only, but the component accepts raw string/number keys, JSON strings, and resolved item objects at runtime. Under stricter consumer tsconfigs (e.g. buildpad-daas) the mismatch narrowed string checks to never and failed the consumer build.
