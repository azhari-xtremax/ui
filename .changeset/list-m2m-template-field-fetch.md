---
"@buildpad/ui-interfaces": patch
---

ListM2M: fetch the fields referenced by the row-display template.

The API `fields=` query was built only from the `fields` prop (defaulting to the bootstrap `["id"]`), independent of the `template` used for rendering — so a field configured with a template but no explicit `fields` fetched only the related primary key, and every row rendered blank. `ListO2M` and `SelectDropdownM2O` already merge template-referenced fields into their queries; `ListM2M` never got the equivalent.

Template paths are normalised before use, because M2M templates arrive in both conventions: an explicit `template` prop may be junction-relative (`{{tag_id.name}}`) or related-relative (`{{name}}`), while the related collection's `display_template` and the `{{ pk }}` bootstrap are always related-relative. Related-relative paths are prefixed with the junction field for the junction query and used bare when querying the related collection directly. Sending an unprefixed path to the junction table asks it for a column it does not have, which fails the whole request rather than just rendering a blank label.

Row labels resolve against the related record with junction columns available but never shadowing it, so `{{ id }}` means the related item's key and a junction column sharing a name with a related one no longer wins.
