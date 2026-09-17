---
"@buildpad/cli": minor
"@buildpad/mcp": minor
"@buildpad/hooks": minor
"@buildpad/services": minor
"@buildpad/types": minor
"@buildpad/ui-collections": minor
"@buildpad/ui-files": minor
"@buildpad/ui-form": minor
"@buildpad/ui-forms": minor
"@buildpad/ui-interfaces": minor
"@buildpad/ui-table": minor
"@buildpad/ui-users": minor
"@buildpad/utils": minor
---

Fix the bugs and code smells reported by a SonarQube scan.

Most of the changes are refactors with no change in behavior: unused imports, variables and callbacks removed; `Number.parseInt`/`Number.isNaN`, `RegExp#exec`, `Set` lookups and `??=` used where they apply; `node:` imports for Node built-ins (including the CLI's `lib/oauth/pkce.ts` template); and the two most complex functions, the MCP server's tool dispatcher and the CLI's `upgrade`, split into smaller functions. The changes you can see:

- **`generateToken`** (`@buildpad/ui-users`) throws when `crypto.getRandomValues` is unavailable, instead of falling back to the predictable `Math.random()`.
- **Keyboard access:** the header context-menu items in `CollectionList`, and the inline "all / none" and "reset" links in `SystemPermissions`, now respond to Enter and Space.
- **Editable rows keep their input:** removing a scope-pattern row in `RoleDetail` or a condition row in `ConditionsEditor` no longer moves the cursor into another row's field.
- **No more `[object Object]`:** an object value renders as JSON in `CollectionList`'s choice, uuid and collection-item-dropdown cells and in `formatFieldValue`. `ListM2M` builds no item link for an object key, `ListO2M` substitutes `null` for an object in a filter template, and `AutocompleteAPI` no longer gives every result the same value when `textPath` or `valuePath` resolves to an object.
- **Sorting:** the `Tags` interface sorts alphabetically with `localeCompare`, so mixed-case and accented tags sort correctly.
- **Relation hooks** use `isExistingItem` instead of the deprecated `isValidPrimaryKey`.
- **Errors:** three failure paths log the caught error before they show their failure message.
- **MCP server:** importing the module no longer starts the stdio server (`node dist/index.js` still does), and the tool handler is exported as `handleCallToolRequest`.

Also adds tests, and `test:coverage` scripts with lcov output for SonarQube.
