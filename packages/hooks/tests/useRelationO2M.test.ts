/**
 * useRelationO2M / useRelationO2MItems unit tests
 *
 * Covers the primary-key resolution fix: `relatedPrimaryKeyField` and
 * `parentPrimaryKeyField` used to be hardcoded to `{ field: "id", type: "uuid" }`.
 * They're now resolved per-collection via `FieldsService.readAll`, and
 * `useRelationO2MItems` must key all reads/writes (remove/delete/reorder/create)
 * off the resolved field instead of assuming `.id`.
 *
 * `FieldsService` and `apiRequest` (both from `@buildpad/services`) are mocked
 * so no network is required.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const { apiRequestMock, readAllMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
  readAllMock: vi.fn(),
}));

vi.mock('@buildpad/services', () => ({
  apiRequest: apiRequestMock,
  FieldsService: vi.fn().mockImplementation(() => ({
    readAll: readAllMock,
  })),
}));

import { useRelationO2M, useRelationO2MItems, type O2MRelationInfo } from '../src/useRelationO2M';

const O2M_FIELD = {
  field: 'children',
  meta: {
    interface: 'list-o2m',
    options: {
      related_collection: 'daas_scope_items',
      foreign_key_field: 'parent_id',
    },
  },
};

beforeEach(() => {
  apiRequestMock.mockReset();
  readAllMock.mockReset();

  // Default: collections meta / FK schema lookups used by useRelationO2M
  // (called via apiRequest, not FieldsService).
  apiRequestMock.mockImplementation(async (path: string) => {
    if (path.startsWith('/api/collections/')) {
      return { data: { meta: { singleton: false } } };
    }
    if (path.startsWith('/api/fields/') && path.split('/').length > 3) {
      // /api/fields/{collection}/{field} — FK uniqueness lookup
      return { data: { schema: { is_unique: false } } };
    }
    throw new Error(`Unexpected apiRequest call: ${path}`);
  });
});

describe('useRelationO2M primary key resolution', () => {
  it('uses the real primary key field/type when the schema declares a non-"id" PK', async () => {
    readAllMock.mockImplementation(async (collection: string) => {
      if (collection === 'articles') {
        return [O2M_FIELD];
      }
      if (collection === 'daas_scope_items') {
        return [
          { field: 'uri_path', type: 'string', schema: { is_primary_key: true } },
          { field: 'label', type: 'string' },
        ];
      }
      // parent collection ("articles") itself — no explicit PK flag
      return [{ field: 'id', type: 'uuid' }];
    });

    const { result } = renderHook(() => useRelationO2M('articles', 'children'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.relationInfo?.relatedPrimaryKeyField).toEqual({
      field: 'uri_path',
      type: 'string',
    });
  });

  it('falls back to a field literally named "id" when no explicit PK flag exists', async () => {
    readAllMock.mockImplementation(async (collection: string) => {
      if (collection === 'articles') return [O2M_FIELD];
      if (collection === 'daas_scope_items') {
        return [
          { field: 'id', type: 'integer' },
          { field: 'label', type: 'string' },
        ];
      }
      return [{ field: 'id', type: 'uuid' }];
    });

    const { result } = renderHook(() => useRelationO2M('articles', 'children'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.relationInfo?.relatedPrimaryKeyField).toEqual({
      field: 'id',
      type: 'integer',
    });
  });

  it('falls back to {field:"id", type:"uuid"} when no PK flag and no "id" field exist', async () => {
    readAllMock.mockImplementation(async (collection: string) => {
      if (collection === 'articles') return [O2M_FIELD];
      if (collection === 'daas_scope_items') {
        return [{ field: 'label', type: 'string' }];
      }
      return [{ field: 'id', type: 'uuid' }];
    });

    const { result } = renderHook(() => useRelationO2M('articles', 'children'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.relationInfo?.relatedPrimaryKeyField).toEqual({
      field: 'id',
      type: 'uuid',
    });
  });

  it('falls back to {field:"id", type:"uuid"} without crashing when the fields fetch throws', async () => {
    readAllMock.mockImplementation(async (collection: string) => {
      if (collection === 'articles') return [O2M_FIELD];
      if (collection === 'daas_scope_items') {
        throw new Error('network down');
      }
      return [{ field: 'id', type: 'uuid' }];
    });

    const { result } = renderHook(() => useRelationO2M('articles', 'children'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.relationInfo?.relatedPrimaryKeyField).toEqual({
      field: 'id',
      type: 'uuid',
    });
  });

  it('resolves the parent collection PK too (parentPrimaryKeyField)', async () => {
    readAllMock.mockImplementation(async (collection: string) => {
      if (collection === 'articles') {
        // First call resolves the current field's config; second call (for
        // detectPrimaryKeyField('articles')) must also return this array so
        // it can find the PK-flagged field below.
        return [
          O2M_FIELD,
          { field: 'slug', type: 'string', schema: { is_primary_key: true } },
        ];
      }
      if (collection === 'daas_scope_items') {
        return [{ field: 'id', type: 'uuid' }];
      }
      return [];
    });

    const { result } = renderHook(() => useRelationO2M('articles', 'children'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.relationInfo?.parentPrimaryKeyField).toEqual({
      field: 'slug',
      type: 'string',
    });
  });
});

describe('useRelationO2MItems dynamic primary key usage', () => {
  function relationInfoWith(pkField: string): O2MRelationInfo {
    return {
      relatedCollection: { collection: 'daas_scope_items', meta: {} },
      reverseJunctionField: { field: 'parent_id', type: 'uuid' },
      relatedPrimaryKeyField: { field: pkField, type: 'string' },
      parentPrimaryKeyField: { field: 'id', type: 'uuid' },
      sortField: 'sort',
      relation: {
        field: 'children',
        collection: 'articles',
        related_collection: 'daas_scope_items',
      },
    };
  }

  function lastPath(): string {
    return apiRequestMock.mock.calls.at(-1)?.[0] as string;
  }

  it('removeItem PATCHes and filters using the resolved pkField, not "id"', async () => {
    apiRequestMock.mockResolvedValue({});
    const info = relationInfoWith('uri_path');
    const { result } = renderHook(() => useRelationO2MItems(info, 'parent-1'));

    const item = { uri_path: '/foo/bar', label: 'Foo' };
    act(() => {
      result.current.setItems([item, { uri_path: '/other', label: 'Other' }]);
    });

    await act(async () => {
      await result.current.removeItem(item);
    });

    expect(lastPath()).toBe('/api/items/daas_scope_items//foo/bar');
    expect(lastPath()).not.toContain('undefined');
    expect(result.current.items).toEqual([{ uri_path: '/other', label: 'Other' }]);
  });

  it('deleteItem DELETEs and filters using the resolved pkField, not "id"', async () => {
    apiRequestMock.mockResolvedValue({});
    const info = relationInfoWith('uri_path');
    const { result } = renderHook(() => useRelationO2MItems(info, 'parent-1'));

    const item = { uri_path: '/keep-me', label: 'Keep' };
    const other = { uri_path: '/drop-me', label: 'Drop' };
    act(() => {
      result.current.setItems([item, other]);
    });

    await act(async () => {
      await result.current.deleteItem(other);
    });

    expect(lastPath()).toBe('/api/items/daas_scope_items//drop-me');
    const [, opts] = apiRequestMock.mock.calls.at(-1)!;
    expect((opts as { method?: string }).method).toBe('DELETE');
    expect(result.current.items).toEqual([item]);
  });

  it('reorderItems PATCHes each item using the resolved pkField', async () => {
    apiRequestMock.mockResolvedValue({});
    const info = relationInfoWith('uri_path');
    const { result } = renderHook(() => useRelationO2MItems(info, 'parent-1'));

    const items = [
      { uri_path: '/a', label: 'A' },
      { uri_path: '/b', label: 'B' },
    ];

    await act(async () => {
      await result.current.reorderItems(items);
    });

    const paths = apiRequestMock.mock.calls.map((c) => c[0]);
    expect(paths).toContain('/api/items/daas_scope_items//a');
    expect(paths).toContain('/api/items/daas_scope_items//b');
    expect(paths.some((p) => String(p).includes('undefined'))).toBe(false);
    expect(result.current.items).toEqual(items);
  });

  it('createItem fetches the created item using the resolved pkField from the create response', async () => {
    const info = relationInfoWith('uri_path');
    apiRequestMock.mockImplementation(async (path: string, opts?: { method?: string }) => {
      if (opts?.method === 'POST') {
        return { data: { uri_path: '/new-item', label: 'New' } };
      }
      if (path === '/api/items/daas_scope_items//new-item') {
        return { data: { uri_path: '/new-item', label: 'New', extra: true } };
      }
      throw new Error(`Unexpected call: ${path}`);
    });

    const { result } = renderHook(() => useRelationO2MItems(info, 'parent-1'));

    let created: unknown;
    await act(async () => {
      created = await result.current.createItem({ label: 'New' });
    });

    expect(created).toEqual({ uri_path: '/new-item', label: 'New', extra: true });
  });

  it('falls back to "id" when relationInfo has no relatedPrimaryKeyField set (defensive default)', async () => {
    apiRequestMock.mockResolvedValue({});
    const info = { ...relationInfoWith('id') };
    const { result } = renderHook(() => useRelationO2MItems(info, 'parent-1'));

    const item = { id: 'abc', label: 'Foo' };
    act(() => {
      result.current.setItems([item]);
    });

    await act(async () => {
      await result.current.deleteItem(item);
    });

    expect(lastPath()).toBe('/api/items/daas_scope_items/abc');
  });
});
