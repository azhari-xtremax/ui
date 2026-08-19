---
"@buildpad/cli": patch
---

Fix `buildpad upgrade --all` (and bare `--force`) silently skipping installed lib modules.

`--all` only populated `targetComponents`, never `targetLibModules`, so lib-module files
(`lib/buildpad/utils/index.ts`, `lib/buildpad/types/index.ts`, `design-system`, etc.) were
never re-synced no matter what flags were passed — only named components were. This is why
running `upgrade --all --force` after a barrel-export fix landed upstream did not pick up
the fix: the export lives in a lib module, and `--all` never even attempted to touch it.

`--all` and bare `--force` now also resolve `targetLibModules` from `config.installedLib`,
matching how `--design` and the default (no-flag) outdated-detection path already do.
