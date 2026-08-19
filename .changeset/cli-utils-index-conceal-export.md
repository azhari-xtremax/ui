---
"@buildpad/cli": patch
"@buildpad/utils": patch
---

CLI: deliver `conceal.ts`, close the stranded utils exports, and make the registry hash platform-independent.

`utils/src/conceal.ts` was never registered as a `utils` lib file, so `buildpad add/upgrade utils` had no way to deliver it. Five registry-delivered files already imported it — `InputHash`, `SystemToken`, `FormFieldInterface`, `CollectionForm` and `FormField` — and failed to build in consumer projects. It is now registered as `lib/buildpad/conceal.ts` and re-exported from the utils barrel.

The barrel had also drifted across three separate commits, not one. Alongside conceal's members it now re-exports `getDefaultValuesFromFields`, `resolveChoiceLabel`, `parseChoiceValues`, `splitCsvValue`, `InterfaceChoice`, `MISSING_FIELD_MARKER`, the auto-generation helpers, and the `interface-types` / `interface-registry` / `define-interface` modules — all of which ship to consumers but had no reachable export path.

Also fixed, because the drift was undetectable rather than unlucky:

- `computeFileSha256` now hashes line-ending-normalised content, and a `.gitattributes` pins `eol=lf`. Hashing raw bytes made the registry platform-dependent: generated on a CRLF checkout, its hashes could never match an LF checkout, so `pnpm registry:check` failed permanently and its output was pure noise. `registry:check` now passes.
- CI runs build, typecheck and unit tests *before* the registry check. Fail-fast meant the red check aborted the job before any of them ran.
- `collectUndeclaredImports` now scans `registry.lib`, resolving relative imports in target space. It previously covered components only, which is why a barrel could re-export a module that was not a registry file at all.
- `@buildpad/cli` is now a known package folder, so `cli/templates/*` files are no longer exempt from the version guard.
- `build-registry.mjs` only self-executes when invoked directly. The previous guard was always true, so importing it — as the test suite does — rewrote the checked-in `registry.json`.
- `buildpad upgrade <lib>` no longer reports "up to date" when a registered file is missing on disk. A module that gains a file could not be delivered by version comparison alone, because the version cannot move until a release.
- `buildpad add` no longer rewrites existing lib files when a module gains one. Adding a file made the "already installed" check fail, and every consumer's customised copies were silently overwritten.
- The CLI now verifies fetched sources against the registry's `sourceSha256` and warns on mismatch. The field was written but never read.
- `useModuleAccessKeys` and `module-access-keys` are registered and exported, and the types barrel re-exports `module-access`. `buildpad add users-management` previously produced a project that could not build.
