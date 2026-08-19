---
"@buildpad/cli": patch
---

CLI: fix a broken relative import the transformer never rewrote, and an implicit-`any` in the external-OAuth callback template.

`normalizeImportPaths` only rewrote relative imports whose *first* path
segment was PascalCase (e.g. `../Upload/Upload` → `./upload`). A sibling
import like `../select-icon/SelectIcon` — where the folder is already
kebab-case but the filename is still PascalCase — never matched, so it
shipped unrewritten even though `select-icon` is delivered as the flat
sibling `components/ui/select-icon.tsx`, not a `select-icon/SelectIcon.tsx`
directory. This broke every component that imports from `select-icon`:
`select-dropdown`, `select-multiple-checkbox`, `select-multiple-dropdown`,
and `select-radio` all shipped a `TS2307: Cannot find module
'../select-icon/SelectIcon'` on a fresh install. Both the static
`from '../select-icon/SelectIcon'` and dynamic
`import('../select-icon/SelectIcon')` forms are now flattened to
`./select-icon`.

`auth-callback-oauth-route.ts` (installed by the `external-oauth` lib
module) left `setAll(cookiesToSet)` without the parameter type its sibling
templates (`lib/supabase/server.ts`, `lib/supabase/middleware.ts`) already
carry, producing three `TS7006`/`TS7031` implicit-`any` errors under strict
mode.
