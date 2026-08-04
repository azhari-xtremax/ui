/**
 * ModuleAccessKeysService — CRUD for the `daas_module_access_keys` registry.
 *
 * The registry is the catalogue of application capability flags that can be
 * granted on a policy (`daas_policies.module_access`). It is a hierarchy: a row
 * with `key === null` is a folder that groups leaves; only leaves are grantable.
 *
 * DaaS exposes no dedicated REST route for this table — it is reached through
 * the generic items API, exactly as the platform's own registry page and policy
 * editor do:
 *
 *   GET    /api/items/daas_module_access_keys?sort=sort&limit=500
 *   POST   /api/items/daas_module_access_keys
 *   PATCH  /api/items/daas_module_access_keys/{id}
 *   DELETE /api/items/daas_module_access_keys/{id}
 *
 * @package @buildpad/services
 */

import type { ModuleAccessKey } from "@buildpad/types";
import { apiRequest } from "./api-request";

/** The collection backing the module access key registry. */
export const MODULE_ACCESS_KEYS_COLLECTION = "daas_module_access_keys";

/** Fields a caller may write. Server-managed columns are excluded. */
export type ModuleAccessKeyInput = Partial<
  Pick<ModuleAccessKey, "parent_id" | "display_name" | "description" | "key" | "sort">
>;

/**
 * Build a `parent_id` tree from a flat registry list.
 *
 * Rows whose `parent_id` is missing from the list become roots, so an orphan
 * (its parent deleted — `parent_id` is `ON DELETE SET NULL`, which re-parents
 * to root anyway) still renders instead of vanishing. Siblings are ordered by
 * `sort` at every level.
 *
 * Pure and dependency-free so it can be unit-tested without a DaaS instance.
 */
export function buildModuleAccessTree(items: ModuleAccessKey[]): ModuleAccessKey[] {
  const byId = new Map<string, ModuleAccessKey>();
  const roots: ModuleAccessKey[] = [];

  for (const item of items) {
    byId.set(item.id, { ...item, children: [] });
  }

  for (const node of byId.values()) {
    const parent = node.parent_id ? byId.get(node.parent_id) : undefined;
    if (parent) {
      parent.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortRecursive = (nodes: ModuleAccessKey[]): void => {
    nodes.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    for (const node of nodes) {
      if (node.children?.length) sortRecursive(node.children);
    }
  };
  sortRecursive(roots);

  return roots;
}

/** Every grantable (leaf) key in a registry list. */
export function leafModuleAccessKeys(items: ModuleAccessKey[]): ModuleAccessKey[] {
  return items.filter((item) => item.key !== null);
}

/**
 * Module Access Keys Service — registry CRUD.
 */
export class ModuleAccessKeysService {
  /** Read the whole registry, ordered by `sort`. */
  static async readAll(): Promise<ModuleAccessKey[]> {
    const response = await apiRequest<{ data: ModuleAccessKey[] }>(
      `/api/items/${MODULE_ACCESS_KEYS_COLLECTION}?sort=sort&limit=500`,
    );
    return response.data ?? [];
  }

  /** Read the whole registry already assembled into a tree. */
  static async readTree(): Promise<ModuleAccessKey[]> {
    return buildModuleAccessTree(await this.readAll());
  }

  static async readOne(id: string): Promise<ModuleAccessKey> {
    const response = await apiRequest<{ data: ModuleAccessKey }>(
      `/api/items/${MODULE_ACCESS_KEYS_COLLECTION}/${id}`,
    );
    return response.data;
  }

  /**
   * Create a key or a folder.
   *
   * Pass `key: null` (or omit it) for a folder node. The database enforces
   * both the key format and global uniqueness — surface its error rather than
   * assuming a client-side check is sufficient.
   */
  static async create(data: ModuleAccessKeyInput): Promise<ModuleAccessKey> {
    const response = await apiRequest<{ data: ModuleAccessKey }>(
      `/api/items/${MODULE_ACCESS_KEYS_COLLECTION}`,
      { method: "POST", body: JSON.stringify(data) },
    );
    return response.data;
  }

  static async update(id: string, data: ModuleAccessKeyInput): Promise<ModuleAccessKey> {
    const response = await apiRequest<{ data: ModuleAccessKey }>(
      `/api/items/${MODULE_ACCESS_KEYS_COLLECTION}/${id}`,
      { method: "PATCH", body: JSON.stringify(data) },
    );
    return response.data;
  }

  /**
   * Delete a key or folder.
   *
   * `parent_id` is `ON DELETE SET NULL`, so deleting a folder **re-parents its
   * children to root** rather than removing them. Warn before calling.
   *
   * Nothing cascades to `daas_policies.module_access`: a policy that granted
   * the deleted key keeps the now-dangling entry. Check usage first.
   */
  static async delete(id: string): Promise<void> {
    await apiRequest<void>(`/api/items/${MODULE_ACCESS_KEYS_COLLECTION}/${id}`, {
      method: "DELETE",
    });
  }
}

/** Factory mirroring the other services in this package. */
export function createModuleAccessKeysService(): typeof ModuleAccessKeysService {
  return ModuleAccessKeysService;
}
