---
"@buildpad/ui-form": patch
---

Multi-select interfaces on csv-stored fields no longer receive raw comma-strings.

The three multi-select interfaces are registered for both json (array) and csv (comma-string) storage, but the leaves are array-only — a csv field delivered a raw string into array logic (substring-match reads, character-spread corruption on toggle, TypeErrors on .filter/.map). FormFieldInterface now normalizes once in the pipeline: csv strings are split to arrays on the way in, and leaf-emitted arrays are joined back to comma-strings on the way out — including for fields whose backend reports the physical column type (e.g. text) instead of csv, detected by observing string storage. Known residual: an empty csv-as-text field has nothing to observe, so its first-ever write emits an array.

Also bootstraps jest for @buildpad/ui-form (config, script, devDependencies) — this package had no test infrastructure at all.
