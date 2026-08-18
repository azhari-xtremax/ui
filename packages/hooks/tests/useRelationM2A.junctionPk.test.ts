/**
 * useRelationM2A must resolve the junction table's real primary key.
 *
 * Both `M2ARelationInfo` construction sites used to hardcode
 * `{ field: 'id' }`, so every downstream alias keyed on it was a no-op on
 * exactly the junctions it was written for — and the test that covered the
 * alias hand-built the relation info, bypassing the producer entirely.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));
// `useRelationM2A` imports apiRequest from @buildpad/services directly, which
// is also where ./utils re-exports it from — the idiom the sibling tests use.
vi.mock('@buildpad/services', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@buildpad/services')>()),
  apiRequest: apiRequestMock,
}));
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

import { useRelationM2A } from '../src/useRelationM2A';

beforeEach(() => apiRequestMock.mockReset());

describe('useRelationM2A junction primary key', () => {
  it('detects the junction PK instead of assuming "id"', async () => {
    apiRequestMock.mockImplementation((url?: string) => {
      if (!url) return Promise.resolve({ data: [] });
      if (url.startsWith('/api/relations')) {
        return Promise.resolve({
          data: [
            {
              collection: 'articles_blocks',
              field: 'articles_id',
              related_collection: 'articles',
              meta: { one_field: 'blocks', junction_field: 'item', one_allowed_collections: ['headings'] },
            },
            {
              collection: 'articles_blocks',
              field: 'item',
              related_collection: null,
              meta: { one_allowed_collections: ['headings'], one_collection_field: 'collection' },
            },
          ],
        });
      }
      // The parent field must declare the list-m2a interface or discovery bails.
      if (url === '/api/fields/articles') {
        return Promise.resolve({
          data: [
            { field: 'id', type: 'integer', schema: { is_primary_key: true } },
            { field: 'blocks', type: 'alias', meta: { interface: 'list-m2a' } },
          ],
        });
      }
      // The junction's PK is NOT named "id" — the case the hardcode broke.
      if (url === '/api/fields/articles_blocks') {
        return Promise.resolve({ data: [{ field: 'row_uuid', type: 'uuid', schema: { is_primary_key: true } }] });
      }
      if (url.startsWith('/api/fields/')) {
        return Promise.resolve({ data: [{ field: 'id', type: 'integer', schema: { is_primary_key: true } }] });
      }
      if (url.startsWith('/api/collections')) {
        return Promise.resolve({ data: [{ collection: 'headings', meta: {} }] });
      }
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(() => useRelationM2A('articles', 'blocks'));

    await waitFor(() => expect(result.current.relationInfo).not.toBeNull());
    expect(result.current.relationInfo?.junctionPrimaryKeyField?.field).toBe('row_uuid');
  });
});
