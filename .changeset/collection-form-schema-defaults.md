---
"@buildpad/ui-collections": patch
"@buildpad/utils": patch
---

CollectionForm: seed create-mode form data from each field's own schema `default_value`.

Create mode only ever seeded initial form data from the `defaultValues` prop and permission presets — a field's own column-level default (e.g. `status DEFAULT 'active'`) was never applied, even though it's configured and the field itself renders correctly once a value exists. Now calls `getFieldDefault` for every field, at the lowest precedence (an explicit `defaultValues` prop or permission preset still wins).

Also fixes `getFieldDefault` itself: Postgres reports a typed literal default with a `::type` cast suffix (e.g. `'active'::character varying`), which the quote-stripping and numeric-parsing checks never accounted for — a string default was returned unparsed (still quoted, still cast) and a numeric default never matched `Number()`.
