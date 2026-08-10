/**
 * Module-Level Access — Server-Side Enforcement
 *
 * Checks application capability flags (`daas_policies.module_access`) in Server
 * Components and API route handlers. This is the **security boundary**; the
 * client-side `usePermissions().hasModuleAccess()` only decides what to render.
 *
 * Pairs with the collection-permission guard in
 * `lib/buildpad/services/auth/enforcer.ts` — a route that gates both a
 * capability and a data operation should call both:
 *
 *   await enforceModuleAccess('reports:export');
 *   await enforcePermission({ collection: 'reports', action: 'read' });
 *
 * Requires a Supabase client with database access (the same setup
 * `enforcer.ts` uses). Applications that proxy a remote DaaS instead should
 * gate on the proxied `/api/permissions/me` response.
 *
 * @buildpad/origin: lib/module-access/enforce
 * @buildpad/version: 1.0.0
 */

import { createClient } from '@/lib/supabase/server';

/** Thrown when the current user does not hold a required capability key. */
export class ModuleAccessError extends Error {
  public readonly statusCode: number;
  public readonly keys: string[];

  constructor(keys: string[], statusCode = 403) {
    super(`Module access denied: ${keys.join(' or ')}`);
    this.name = 'ModuleAccessError';
    this.statusCode = statusCode;
    this.keys = keys;
  }
}

/**
 * Resolve the current user's merged module access keys.
 *
 * OR-merged across every policy the user holds, matching the platform's
 * `/api/permissions/me` semantics: a key is granted if ANY policy sets it true.
 *
 * Returns `{ isAdmin: true }` for admins without enumerating keys — admins hold
 * every key, so the map is not the thing to check.
 */
export async function getModuleAccess(): Promise<{
  isAdmin: boolean;
  moduleAccess: Record<string, boolean>;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { isAdmin: false, moduleAccess: {} };

  const { data: policyIds, error: policyError } = await supabase.rpc('get_user_policies', {
    user_id: user.id,
  });

  if (policyError || !Array.isArray(policyIds) || policyIds.length === 0) {
    return { isAdmin: false, moduleAccess: {} };
  }

  const ids = policyIds.map((id: unknown) => (typeof id === 'string' ? id : String(id)));

  const { data: policies, error } = await supabase
    .from('daas_policies')
    .select('module_access, admin_access')
    .in('id', ids);

  if (error || !policies) return { isAdmin: false, moduleAccess: {} };

  const rows = policies as Array<{
    module_access: Record<string, boolean> | null;
    admin_access: boolean | null;
  }>;

  // Admin short-circuit. Checking this is not optional: without it an admin is
  // denied every capability server-side while the UI happily shows the control.
  if (rows.some((p) => p.admin_access === true)) {
    return { isAdmin: true, moduleAccess: {} };
  }

  const merged: Record<string, boolean> = {};
  for (const row of rows) {
    for (const [key, value] of Object.entries(row.module_access ?? {})) {
      if (value === true) merged[key] = true;
    }
  }

  return { isAdmin: false, moduleAccess: merged };
}

/**
 * Whether the current user holds at least one of the given capability keys.
 *
 * Multiple keys are OR'd, matching the workflow-command gate. Fails closed:
 * returns `false` for an unauthenticated user or on any error.
 *
 * @example
 * if (!(await hasModuleAccess('reports:export'))) redirect('/403');
 */
export async function hasModuleAccess(key: string | string[]): Promise<boolean> {
  const keys = Array.isArray(key) ? key : [key];
  if (keys.length === 0) return false;

  try {
    const { isAdmin, moduleAccess } = await getModuleAccess();
    if (isAdmin) return true;
    return keys.some((k) => moduleAccess[k] === true);
  } catch (err) {
    console.error('[module-access] check failed:', err);
    return false;
  }
}

/**
 * Enforce a capability key, throwing `ModuleAccessError` (403) when absent.
 *
 * @example
 * // app/api/reports/export/route.ts
 * export async function GET() {
 *   await enforceModuleAccess('reports:export');
 *   // ...
 * }
 */
export async function enforceModuleAccess(key: string | string[]): Promise<void> {
  const keys = Array.isArray(key) ? key : [key];
  if (!(await hasModuleAccess(keys))) {
    throw new ModuleAccessError(keys);
  }
}
