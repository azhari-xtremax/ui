---
"@buildpad/ui-interfaces": minor
---

CollectionItemDropdown: emit the scalar key when the target collection is fixed.

Selecting an item always emitted a `{key, collection}` object. Written into a schema-typed foreign-key column, the database rejects it outright (`invalid input syntax for type uuid`), or a `text` column silently stores a stringified JSON blob that no foreign key can resolve. The envelope is now emitted only with `showCollectionSelect`, the polymorphic picker where the key alone is ambiguous without the collection beside it. A relation the schema already pins to one collection — the common Many-to-One case — emits the key itself, so it matches the column's storage type. `onChange`'s value type widens accordingly, to the key or the envelope.

Behavior change for a fixed-relation field whose column already holds `{key, collection}` values: new selections store the bare key, so one column can end up holding both shapes. Both are read correctly — the interface still accepts an envelope, a JSON string, a resolved item object or a bare key, and `CollectionList` renders either — but consumer code or display templates that read `value.key` find nothing on newly saved rows.
