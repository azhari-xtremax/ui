/**
 * Module-Level Access Types
 *
 * DaaS has two independent permission dimensions:
 *
 *   Record-Level Access — `daas_permissions` rows. Which collections a user
 *                         may CRUD, with which fields and item filters.
 *   Module-Level Access — `daas_policies.module_access` (JSONB). Whether a user
 *                         holds a named application capability that is not tied
 *                         to any collection, e.g. `reports:export`.
 *
 * Keys live in the hierarchical `daas_module_access_keys` registry. A key is
 * granted by setting it `true` on a policy; a user holds it if ANY of their
 * effective policies grants it (OR-merge). Admin users hold every key.
 *
 * Mirrors the platform definitions in buildpad-daas
 * (`lib/types/index.ts`, `supabase/migrations/20260519000001_module_level_access.sql`).
 */

/**
 * A node in the `daas_module_access_keys` registry.
 *
 * The tree is built from `parent_id`; `key === null` marks a folder node that
 * groups leaves in the UI and cannot itself be granted.
 */
export interface ModuleAccessKey {
  id: string;

  /** Parent node, or `null` for a root node. */
  parent_id: string | null;

  /** Label shown in the registry and the Policy editor. */
  display_name: string;

  description?: string | null;

  /**
   * Unique capability key (e.g. `system:logs`). `null` means this node is a
   * folder and only exists to group its children.
   */
  key: string | null;

  /** Display order within siblings. `NOT NULL DEFAULT 0` in the database. */
  sort: number;

  created_at: string;
  updated_at: string;

  /** Populated client-side by `buildModuleAccessTree`; never returned by the API. */
  children?: ModuleAccessKey[];
}

/**
 * Resolved capability flags for the current user, as returned in the
 * `moduleAccess` field of `GET /api/permissions/me`.
 *
 * The server drops `false` during the OR-merge, so in practice this map
 * contains granted keys only — `Object.keys(map)` is the grant list. Check with
 * `=== true` regardless, so the client stays correct if that ever changes.
 */
export type ModuleAccessMap = Record<string, boolean>;

/**
 * Platform key-format constraint, mirroring the database CHECK on
 * `daas_module_access_keys.key`:
 *
 *   CHECK (key IS NULL OR key ~ '^[a-z][a-z0-9_:./-]*$')
 *
 * Lowercase only. Validate in the UI for a good error message; the database is
 * the real backstop.
 */
export const MODULE_ACCESS_KEY_PATTERN = /^[a-z][a-z0-9_:./-]*$/;

/**
 * Namespaces reserved by the platform. Applications should register keys under
 * their own prefix (`<domain>:<capability>`, e.g. `reports:export`).
 */
export const RESERVED_MODULE_ACCESS_NAMESPACES = ['system:', 'workflow:'] as const;

/** True when `key` satisfies the platform key format. */
export function isValidModuleAccessKey(key: string): boolean {
  return MODULE_ACCESS_KEY_PATTERN.test(key);
}

/** True when `key` sits in a namespace reserved by the platform. */
export function isReservedModuleAccessKey(key: string): boolean {
  return RESERVED_MODULE_ACCESS_NAMESPACES.some((ns) => key.startsWith(ns));
}
