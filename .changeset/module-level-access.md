---
'@buildpad/types': minor
'@buildpad/services': minor
'@buildpad/hooks': minor
'@buildpad/ui-users': minor
'@buildpad/mcp': minor
'@buildpad/cli': minor
---

Add first-class support for **Module-Level Access** — application capability
flags that are not tied to a collection — and retire the superseded
`custom_permissions` approach.

DaaS has two independent permission dimensions. Record-Level Access
(`daas_permissions`) covers collection CRUD; Module-Level Access
(`daas_policies.module_access`, keyed by the `daas_module_access_keys` registry)
covers named capabilities like `reports:export`. The platform has shipped the
second dimension, but this repo had no support for it at all — so every
`hasModuleAccess(...)` call the agent skills instruct agents to write was a
runtime error.

**New API**

- `@buildpad/types` — `ModuleAccessKey`, `ModuleAccessMap`,
  `MODULE_ACCESS_KEY_PATTERN`, `RESERVED_MODULE_ACCESS_NAMESPACES`, and
  `Policy.module_access`.
- `@buildpad/services` — `PermissionsService.hasModuleAccess()` / `.moduleAccess`
  / `.ensureLoaded()`, plus `ModuleAccessKeysService` for registry CRUD (via the
  generic items API — DaaS exposes no dedicated route) and `buildModuleAccessTree`.
- `@buildpad/hooks` — `usePermissions()` now returns `moduleAccess` and
  `hasModuleAccess`; new `useModuleAccess(key)`, `useModuleAccessMap()`, and
  `useModuleAccessKeys()`.
- `@buildpad/ui-users` — `ModuleAccessPanel` (mounted as the "Module-Level
  Access" tab of `PolicyDetail`, beside the renamed "Record-Level Access" tab)
  and `ModuleAccessKeysManager` for the registry.
- `@buildpad/cli` — `lib/module-access/enforce.ts` server guard
  (`enforceModuleAccess` → `ModuleAccessError(403)`) and the
  `/module-access-keys` page; both registered.
- `@buildpad/mcp` — new `get_module_access_pattern` tool; `get_rbac_pattern`
  now returns a `moduleAccess` section pointing at it, so agents stop reaching
  for role-name checks on non-CRUD gates.

**`hasModuleAccess` fails closed.** It returns `false` while loading and on
error — deliberately unlike `canPerform`, which is optimistic. A capability flag
gates something the user is presumed *not* to have, so an unresolved state must
never render the gated control. Render a skeleton while `loading` if flicker
matters.

**Permission caches are now scope-keyed.** DaaS resolves `/permissions/me`
against the active Resource URI, so `PermissionsService`'s 30s cache keys on the
`daas_resource_uri` cookie and `usePermissions` refetches when it changes.
Without this a tenant switch served the previous tenant's permissions.

**Removed:** `cli/templates/lib/permissions/custom.ts` and
`cli/templates/components/CustomPermissionsEditor.tsx`. These implemented the
superseded `custom_permissions` design and were non-functional against current
DaaS — the column and the `/api/permissions/me/custom` endpoint they depend on
do not exist. They were never in the registry, so `buildpad add` could not
install them; no project can have them via tooling. Projects that copied them by
hand should migrate to Module-Level Access (keys must be lowercased to satisfy
the platform key format).
