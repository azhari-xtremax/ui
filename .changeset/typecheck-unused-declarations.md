---
"@buildpad/ui-interfaces": patch
---

Remove unused declarations that failed the workspace typecheck.

`pnpm -r typecheck` reported 41 errors, all in `ui-interfaces` sources, and CI has been failing on them: unused `React` default imports (the package builds with the automatic JSX runtime), unused Mantine/Tabler named imports, unused destructured props and hook bindings, a write-only class field, and two dead type declarations. `@editorjs/checklist`'s ambient declaration already existed but was invisible to dependents, so it is now pulled in with a reference directive.

None of this changes behaviour — every removed binding was provably unread. The props removed from `ListM2MInterface`/`ListO2MInterface` destructures remain part of their public prop types; they were simply never used by those components.

Note on why these were invisible: `@buildpad/ui-interfaces` publishes `"types": "./src/index.ts"`, so dependents typecheck its raw sources under *their* compiler options. `ui-form` extends `tsconfig.base.json` (`noUnusedLocals`/`noUnusedParameters`) while `ui-interfaces`' own tsconfig does not, so the package's own `typecheck` script stays green while its dependents' fails.
