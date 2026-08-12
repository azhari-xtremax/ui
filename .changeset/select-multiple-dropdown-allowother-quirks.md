---
"@buildpad/ui-interfaces": patch
---

SelectMultipleDropdown: fix four `allowOther`/rendering quirks (V3-6).

- Enter with a highlighted dropdown option double-emitted `onChange` — once via the manual free-text commit, once via Mantine's own selection. The manual commit now checks `event.defaultPrevented` first, mirroring the `SelectDropdown` fix.
- `commitOtherValue` bypassed `maxValues` entirely — a manually committed custom pill could push the selection past the configured cap. It now checks the cap before committing.
- The existing-choice match check was case-sensitive, so a case-different typo of an existing choice (e.g. "REACT" vs "React") committed as a brand-new near-duplicate custom pill instead of being recognized as matching. Now case-insensitive.
- Blur right after selecting an option via click could re-commit whatever text was still sitting in the search box as an unrelated extra custom pill. Added a self-clearing ref (mirroring `SelectDropdown`'s `justSelectedRef`) that suppresses the commit for the event immediately following a real toggle.
- Selected options rendered two check marks — the custom `renderOption`'s manual `' ✓'` alongside Mantine's own built-in check icon. Disabled Mantine's via `withCheckIcon={false}`, keeping the manual one (icon/color rendering already needs the custom `renderOption` regardless).
