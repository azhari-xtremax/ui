---
"@buildpad/ui-interfaces": patch
---

SelectDropdown renders real icon glyphs instead of raw Material names, gets a forwarded aria-label, and SelectIcon's category list no longer duplicates icon names.

- SelectDropdown's `leftSection` and option rows printed the literal icon name string (e.g. `code`) instead of a glyph — now rendered via the shared `IconDisplay` (select-icon's `ICON_MAP`).
- SelectDropdown dropped `aria-label`, leaving the Select with no accessible name beyond its placeholder. It's now accepted and forwarded to the underlying `<Select>`.
- SelectIcon's `ICON_CATEGORIES` listed 10 names in two categories each (e.g. `lock`, `vpn_key`, `fingerprint` in both "Action"/"Communication" and "Security & Identity"), producing duplicate `data-testid`s and double-highlighting a selected duplicate. Categories are now deduped so each icon name appears in exactly one category.
