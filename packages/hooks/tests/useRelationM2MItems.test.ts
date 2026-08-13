/**
 * useRelationM2MItems unit tests
 *
 * Covers the R6.5 fix: `loadItems` now aliases the real junction primary key
 * onto `.id` for every loaded item. Before the fix, `removeItem` and
 * `updateSortOrder` built their request URLs from `item.id` directly — for
 * any junction table whose real PK column isn't literally named "id" (e.g.
 * "uuid"), `.id` was `undefined`, so those requests silently targeted
 * `/api/items/{collection}/undefined`.
 *
 * `apiRequest` (from `./utils`) is mocked so no network is required.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));
vi.mock('../src/utils', () => ({
  apiRequest: apiRequestMock,
  isValidPrimaryKey: (pk: unknown) => pk !== null && pk !== undefined && pk !== '',
}));
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

import { useRelationM2MItems } from '../src/useRelationM2MItems';
import type { M2MRelationInfo } from '../src/useRelationM2M';

// A junction table whose real PK column is "uuid", not "id" — the case that
// was silently broken before the fix.
const relationInfo: M2MRelationInfo = {
  junctionCollection: { collection: 'articles_tags', meta: {} },
  relatedCollection: { collection: 'tags', meta: {} },
  junctionField: { field: 'tag_id', type: 'uuid' },
  reverseJunctionField: { field: 'article_id', type: 'uuid' },
  relatedPrimaryKeyField: { field: 'id', type: 'uuid' },
  junctionPrimaryKeyField: { field: 'uuid', type: 'uuid' },
};

beforeEach(() => {
  apiRequestMock.mockReset();
});

describe('useRelationM2MItems load-items PK aliasing (R6.5)', () => {
  it('aliases the real junction PK field onto .id for each loaded item', async () => {
    apiRequestMock.mockResolvedValue({
      data: [{ uuid: 'junction-uuid-1', tag_id: { id: 'tag-1', name: 'Tag One' } }],
      meta: { total_count: 1 },
    });

    const { result } = renderHook(() => useRelationM2MItems(relationInfo, 'article-1'));

    await act(async () => {
      await result.current.loadItems({ limit: 10, page: 1, fields: ['id'] });
    });

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.items[0].id).toBe('junction-uuid-1');
  });

  it('builds the removeItem request URL from the aliased .id, not a missing raw id', async () => {
    apiRequestMock.mockResolvedValueOnce({
      data: [{ uuid: 'junction-uuid-1', tag_id: { id: 'tag-1', name: 'Tag One' } }],
      meta: { total_count: 1 },
    });

    const { result } = renderHook(() => useRelationM2MItems(relationInfo, 'article-1'));

    await act(async () => {
      await result.current.loadItems({ limit: 10, page: 1, fields: ['id'] });
    });
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    apiRequestMock.mockResolvedValueOnce(undefined);
    await act(async () => {
      await result.current.removeItem(result.current.items[0]);
    });

    expect(apiRequestMock).toHaveBeenLastCalledWith(
      '/api/items/articles_tags/junction-uuid-1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
