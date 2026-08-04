---
'@buildpad/ui-interfaces': patch
---

Widen `CollectionItemDropdown`'s `value` prop to accept what the component
already normalizes.

The prop was typed `CollectionItemDropdownValue | null`, but the normalization
memo also handles a raw key (`string | number`), a JSON string, and a resolved
item object. Under a strict consumer tsconfig the declared type narrowed
`typeof value === 'string'` to `never`, so `value.trim()` failed to compile with
`TS2339: Property 'trim' does not exist on type 'never'` — which broke
`pnpm build` for `@buildpad/ui-interfaces` and, with it, every CI publish run
since 1.9.2. Runtime behaviour is unchanged; only the declaration now matches
the implementation.
