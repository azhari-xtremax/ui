/**
 * useRelationMultipleM2M unit tests
 *
 * Covers the pagination/reorder fix from commit 3360a12:
 * `reorderItems`/`moveItemUp`/`moveItemDown` accept an optional `pageOffset`
 * so sort values assigned on page 2+ don't collide with page 1's `1..N`.
 * `apiRequest` is mocked so no network is required.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));
vi.mock('@buildpad/services', () => ({ apiRequest: apiRequestMock }));

import { useRelationMultipleM2M } from '../src/useRelationMultipleM2M';
import type { M2MRelationInfo } from '../src/useRelationM2M';

function makeRelationInfo(sortField = 'sort'): M2MRelationInfo {
  return {
    junctionCollection: { collection: 'articles_tags', meta: {} as never },
    relatedCollection: { collection: 'tags', meta: {} as never },
    junctionField: { field: 'tag_id', type: 'm2o' },
    reverseJunctionField: { field: 'article_id', type: 'm2o' },
    relatedPrimaryKeyField: { field: 'id', type: 'integer' },
    junctionPrimaryKeyField: { field: 'id', type: 'integer' },
    sortField,
    relation: {
      field: 'tags',
      collection: 'articles_tags',
      related_collection: 'tags',
      meta: {} as never,
    },
  } as M2MRelationInfo;
}

function pageOfItems(page: number, limit: number) {
  return Array.from({ length: limit }, (_, i) => {
    const n = (page - 1) * limit + i + 1;
    return { id: n, article_id: 1, tag_id: { id: n }, sort: n };
  });
}

beforeEach(() => {
  apiRequestMock.mockReset();
});

describe('useRelationMultipleM2M reorder pageOffset', () => {
  it('reorderItems numbers sort as pageOffset + i + 1', async () => {
    const relationInfo = makeRelationInfo();
    const { result } = renderHook(() => useRelationMultipleM2M(relationInfo, 1));

    apiRequestMock.mockResolvedValueOnce({ data: pageOfItems(2, 2), meta: { total_count: 4 } });
    await act(async () => {
      await result.current.loadItems({ limit: 2, page: 2, fields: [] });
    });

    await waitFor(() => expect(result.current.fetchedItems).toHaveLength(2));

    // page 2 with limit 2 -> pageOffset = 2
    const pageOffset = 2;
    const reversed = [...result.current.displayItems].reverse();

    act(() => {
      result.current.reorderItems(reversed, pageOffset);
    });

    const changes = result.current.getChanges();
    const sorts = changes.update.map((u) => u.sort).sort((a, b) => (a as number) - (b as number));
    expect(sorts).toEqual([3, 4]);
    changes.update.forEach((u) => {
      expect(u.sort as number).toBeGreaterThan(pageOffset);
    });
  });

  it('moveItemDown on page 2 assigns sorts beyond page 1 range instead of colliding on 1..N', async () => {
    const relationInfo = makeRelationInfo();
    const { result } = renderHook(() => useRelationMultipleM2M(relationInfo, 1));

    apiRequestMock.mockResolvedValueOnce({ data: pageOfItems(2, 2), meta: { total_count: 4 } });
    await act(async () => {
      await result.current.loadItems({ limit: 2, page: 2, fields: [] });
    });

    await waitFor(() => expect(result.current.fetchedItems).toHaveLength(2));

    const pageOffset = 2; // (currentPage - 1) * currentLimit for page 2, limit 2

    act(() => {
      result.current.moveItemDown(0, pageOffset);
    });

    const changes = result.current.getChanges();
    expect(changes.update.length).toBeGreaterThan(0);
    changes.update.forEach((u) => {
      // Must not collide with page 1's 1..2 sort range.
      expect(u.sort as number).toBeGreaterThan(2);
    });
  });

  it('reorderItems defaults pageOffset to 0 (single-page behavior unchanged)', async () => {
    const relationInfo = makeRelationInfo();
    const { result } = renderHook(() => useRelationMultipleM2M(relationInfo, 1));

    apiRequestMock.mockResolvedValueOnce({ data: pageOfItems(1, 2), meta: { total_count: 2 } });
    await act(async () => {
      await result.current.loadItems({ limit: 2, page: 1, fields: [] });
    });

    await waitFor(() => expect(result.current.fetchedItems).toHaveLength(2));

    const reversed = [...result.current.displayItems].reverse();
    act(() => {
      result.current.reorderItems(reversed);
    });

    const changes = result.current.getChanges();
    const sorts = changes.update.map((u) => u.sort).sort((a, b) => (a as number) - (b as number));
    expect(sorts).toEqual([1, 2]);
  });

  it('no-ops when relationInfo has no sortField', async () => {
    const relationInfo = makeRelationInfo(undefined as unknown as string);
    relationInfo.sortField = undefined;
    const { result } = renderHook(() => useRelationMultipleM2M(relationInfo, 1));

    act(() => {
      result.current.reorderItems([{ id: 1, sort: 1 }], 5);
    });

    expect(result.current.getChanges()).toEqual({ create: [], update: [], delete: [] });
  });
});
