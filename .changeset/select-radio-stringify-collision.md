---
"@buildpad/ui-interfaces": patch
---

SelectRadio: choices whose values stringify identically (e.g. number `1` vs string `'1'`) no longer share one native radio group value (S3.7) — previously selecting either one visually checked both. The second occurrence is dropped, matching the treatment `SelectDropdown` already got for the same collision (the dropped choice was never independently selectable anyway, since `handleChange` already resolved to the first match).
