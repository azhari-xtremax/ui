---
"@buildpad/cli": patch
---

CLI: install `@tiptap/core` alongside `rich-text-markdown`, fixing a build-blocking TypeScript error.

`rich-text-markdown.tsx` declares a module augmentation (`declare module '@tiptap/core' { ... }`) to add the `markdown` property to TipTap's `Storage` type, but `@tiptap/core` was never listed as a direct dependency for the component — only pulled in transitively via `@tiptap/react`/`@tiptap/starter-kit`. A transitive dependency isn't enough for TypeScript to resolve the module for augmentation, so every project that installed `rich-text-markdown` (including via `bootstrap`, which installs all components) failed `next build` with:

```
error TS2664: Invalid module name in augmentation, module '@tiptap/core' cannot be found.
error TS2339: Property 'markdown' does not exist on type 'Storage'.
```

`@tiptap/core` is now registered as a direct dependency of `rich-text-markdown` in the registry, pinned in the CLI's `DEPENDENCY_VERSIONS` map, and recognized by `fix`'s known-package list.
