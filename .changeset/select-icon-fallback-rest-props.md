---
"@buildpad/ui-interfaces": patch
"@buildpad/ui-users": patch
---

SelectIcon: forward extra props safely, accept both `autoFocus` spellings, and unify the unknown-icon fallback (S5.5, S5.7).

**Prop forwarding (S5.5).** `SelectIcon` now forwards extra props to its trigger `<Button>`, so a consumer can pass `data-*` attributes and event handlers. Note this is a *new* capability rather than parity: of the selection leaves, `SelectDropdown`, `SelectRadio`, `SelectMultipleCheckbox` and `SelectMultipleDropdown` take no rest props at all, and `Boolean`/`Toggle` forward a rest that is closed at the type level.

Because `FormFieldInterface` passes DaaS schema metadata to every leaf — `type`, `collection`, `field`, `primaryKey`, `maxLength`, `nullable`, `defaultValue` — plus admin-authored `meta.options` spread unfiltered, forwarding has to be guarded:

- Those metadata props are declared and destructured-and-discarded, mirroring the existing guard in `input/Input.tsx`, so none reach the DOM as invalid attributes.
- `type` matters most. Mantine's `UnstyledButton` applies its `type: "button"` default *before* its own rest spread, so a forwarded `type` wins — and `field.type` is a DaaS abstract type (`string`, `uuid`, …), never a valid button type. An invalid `button@type` falls back to `submit`, and `CollectionForm` renders fields inside `<form onSubmit={handleSave}>`, so the trigger would have saved the record when the user clicked merely to open the picker. `type="button"` is now pinned, and the forwarded value discarded.
- The rest spread is declared first, so component-owned props always win: rest may add, never override.
- The rest is typed (`SelectIconTriggerProps`) rather than an `[key: string]: unknown` index signature. An index signature would have disabled excess-property checking on every call site — `valeu`, `onChagne` would compile and ship to the DOM. `data-*` never needed it: TypeScript always permits non-identifier JSX attribute names.

**Autofocus (S5.5).** Both `autoFocus` and `autofocus` are accepted. The form pipeline (`VForm` → `FormField` → `FormFieldInterface`) sends the lowercase spelling, so a camelCase-only prop would never have fired for the only in-repo caller.

**Fallback glyph (S5.7).** The trigger's `renderIcon` and the read-only `IconDisplay` companion used different glyphs for the same "stored name with no `ICON_MAP` entry" condition. Both now use `DEFAULT_UNKNOWN_ICON` (`IconQuestionMark`) *with the same stroke and `aria-hidden`* — sharing the component alone still left them at different stroke weights. The constant is exported from the package barrel so the two can't drift again. The trigger also surfaces the raw stored name via the icon's own SVG `<title>` (Tabler's built-in `title` prop, which reaches assistive tech) instead of a bare `?`; the picker grid does not, since its cells already carry a formatted title.

**`@buildpad/ui-users`.** `IconDisplay`'s default fallback changed, and `RolesManager` was the one caller relying on it — every role with no icon would have rendered a question mark instead of a users-group glyph. It now passes `fallback={IconUsersGroup}` explicitly, matching how the policy surfaces already pass `fallback={IconShield}`.
