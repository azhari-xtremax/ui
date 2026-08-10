'use client';

import { useState, useCallback } from 'react';
import {
  ModuleAccessKeysService,
  buildModuleAccessTree,
  type ModuleAccessKeyInput,
} from '@buildpad/services';
import type { ModuleAccessKey } from '@buildpad/types';
import { parseDaaSError } from './parseDaaSError';

/**
 * Hook for `daas_module_access_keys` registry CRUD — the catalogue of
 * application capability flags grantable on a policy.
 *
 * Mirrors the `usePolicies` / `useRoles` conventions: `'use client'`,
 * `useState` loading/error, `useCallback` methods, service transport.
 *
 * @example
 * const { fetchKeys, createKey } = useModuleAccessKeys();
 * const { keys, tree } = await fetchKeys();
 */
export function useModuleAccessKeys() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Read the whole registry, flat and as a tree (both derived from one request). */
  const fetchKeys = useCallback(async (): Promise<{
    keys: ModuleAccessKey[];
    tree: ModuleAccessKey[];
  }> => {
    setLoading(true);
    setError(null);
    try {
      const keys = await ModuleAccessKeysService.readAll();
      return { keys, tree: buildModuleAccessTree(keys) };
    } catch (err) {
      setError(parseDaaSError(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create a leaf key or a folder (`key: null`).
   *
   * The database enforces the key format and global uniqueness — a rejection
   * here is surfaced verbatim rather than pre-empted, so uniqueness violations
   * read correctly.
   */
  const createKey = useCallback(async (
    data: ModuleAccessKeyInput,
  ): Promise<ModuleAccessKey> => {
    setLoading(true);
    setError(null);
    try {
      return await ModuleAccessKeysService.create(data);
    } catch (err) {
      setError(parseDaaSError(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateKey = useCallback(async (
    id: string,
    data: ModuleAccessKeyInput,
  ): Promise<ModuleAccessKey> => {
    setLoading(true);
    setError(null);
    try {
      return await ModuleAccessKeysService.update(id, data);
    } catch (err) {
      setError(parseDaaSError(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Delete a key or folder.
   *
   * Deleting a folder re-parents its children to root (`ON DELETE SET NULL`),
   * and nothing cascades to policies that already grant the key — warn first.
   */
  const deleteKey = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await ModuleAccessKeysService.delete(id);
    } catch (err) {
      setError(parseDaaSError(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, fetchKeys, createKey, updateKey, deleteKey };
}

export default useModuleAccessKeys;
