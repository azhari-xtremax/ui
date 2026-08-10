/**
 * useRelationM2M unit tests
 *
 * Covers the primary-key resolution fix: `relatedPrimaryKeyField` (was
 * hardcoded `{ field: "id", type: "uuid" }`) and `junctionPrimaryKeyField`
 * (was hardcoded `{ field: "id", type: "integer" }`) are now resolved per
 * collection via `apiRequest('/api/fields/{collection}')`, for both the
 * "relation found" path and the "build from field options" fallback path.
 *
 * `apiRequest` (from `./utils`, re-exported the same way other hooks
 * consume it) is mocked so no network is required.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));
vi.mock('../src/utils', () => ({ apiRequest: apiRequestMock }));
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

import { useRelationM2M } from '../src/useRelationM2M';

const M2M_FIELD = {
  field: 'tags',
  meta: { interface: 'list-m2m' },
};

function fieldsResponse(fields: unknown[]) {
  return { data: fields };
}

beforeEach(() => {
  apiRequestMock.mockReset();
});

describe('useRelationM2M primary key resolution — relation-found path', () => {
  function setupRelationsPath(opts: {
    articlesFields?: unknown[];
    junctionFields: unknown[];
    tagsFields: unknown[];
  }) {
    apiRequestMock.mockImplementation(async (path: string) => {
      if (path === '/api/fields/articles') {
        return fieldsResponse(opts.articlesFields ?? [M2M_FIELD]);
      }
      if (path === '/api/relations') {
        return {
          data: [
            {
              collection: 'articles_tags',
              field: 'article_id',
              related_collection: 'articles',
              meta: { one_field: 'tags', junction_field: 'tag_id' },
            },
            {
              collection: 'articles_tags',
              field: 'tag_id',
              related_collection: 'tags',
              meta: {},
            },
          ],
        };
      }
      if (path === '/api/fields/articles_tags') {
        return fieldsResponse(opts.junctionFields);
      }
      if (path === '/api/fields/tags') {
        return fieldsResponse(opts.tagsFields);
      }
      throw new Error(`Unexpected apiRequest call: ${path}`);
    });
  }

  it('uses the real primary key field/type for both related and junction collections', async () => {
    setupRelationsPath({
      junctionFields: [{ field: 'uuid_pk', type: 'uuid', schema: { is_primary_key: true } }],
      tagsFields: [{ field: 'slug', type: 'string', schema: { is_primary_key: true } }],
    });

    const { result } = renderHook(() => useRelationM2M('articles', 'tags'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.relationInfo?.relatedPrimaryKeyField).toEqual({
      field: 'slug',
      type: 'string',
    });
    expect(result.current.relationInfo?.junctionPrimaryKeyField).toEqual({
      field: 'uuid_pk',
      type: 'uuid',
    });
  });

  it('falls back to a field literally named "id" when no explicit PK flag exists', async () => {
    setupRelationsPath({
      junctionFields: [{ field: 'id', type: 'integer' }],
      tagsFields: [{ field: 'id', type: 'uuid' }],
    });

    const { result } = renderHook(() => useRelationM2M('articles', 'tags'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.relationInfo?.relatedPrimaryKeyField).toEqual({
      field: 'id',
      type: 'uuid',
    });
    expect(result.current.relationInfo?.junctionPrimaryKeyField).toEqual({
      field: 'id',
      type: 'integer',
    });
  });

  it('falls back to {field:"id", type:"uuid"} when neither PK flag nor "id" field exist', async () => {
    setupRelationsPath({
      junctionFields: [{ field: 'other_col', type: 'string' }],
      tagsFields: [{ field: 'other_col', type: 'string' }],
    });

    const { result } = renderHook(() => useRelationM2M('articles', 'tags'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.relationInfo?.relatedPrimaryKeyField).toEqual({
      field: 'id',
      type: 'uuid',
    });
    expect(result.current.relationInfo?.junctionPrimaryKeyField).toEqual({
      field: 'id',
      type: 'uuid',
    });
  });

  it('falls back to {field:"id", type:"uuid"} without crashing when the fields fetch throws', async () => {
    apiRequestMock.mockImplementation(async (path: string) => {
      if (path === '/api/fields/articles') return fieldsResponse([M2M_FIELD]);
      if (path === '/api/relations') {
        return {
          data: [
            {
              collection: 'articles_tags',
              field: 'article_id',
              related_collection: 'articles',
              meta: { one_field: 'tags', junction_field: 'tag_id' },
            },
            {
              collection: 'articles_tags',
              field: 'tag_id',
              related_collection: 'tags',
              meta: {},
            },
          ],
        };
      }
      // Both /api/fields/articles_tags and /api/fields/tags fail.
      throw new Error('network down');
    });

    const { result } = renderHook(() => useRelationM2M('articles', 'tags'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.relationInfo?.relatedPrimaryKeyField).toEqual({
      field: 'id',
      type: 'uuid',
    });
    expect(result.current.relationInfo?.junctionPrimaryKeyField).toEqual({
      field: 'id',
      type: 'uuid',
    });
  });
});

describe('useRelationM2M primary key resolution — field-options fallback path', () => {
  it('resolves real PKs when building relation info from field options (no relation entry)', async () => {
    const fieldWithOptions = {
      field: 'tags',
      meta: {
        interface: 'list-m2m',
        options: {
          junction_collection: 'articles_tags',
          related_collection: 'tags',
        },
      },
    };

    apiRequestMock.mockImplementation(async (path: string) => {
      if (path === '/api/fields/articles') return fieldsResponse([fieldWithOptions]);
      if (path === '/api/relations') return { data: [] };
      if (path === '/api/fields/tags') {
        return fieldsResponse([{ field: 'slug', type: 'string', schema: { is_primary_key: true } }]);
      }
      if (path === '/api/fields/articles_tags') {
        return fieldsResponse([{ field: 'id', type: 'integer' }]);
      }
      throw new Error(`Unexpected apiRequest call: ${path}`);
    });

    const { result } = renderHook(() => useRelationM2M('articles', 'tags'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.relationInfo?.relatedPrimaryKeyField).toEqual({
      field: 'slug',
      type: 'string',
    });
    expect(result.current.relationInfo?.junctionPrimaryKeyField).toEqual({
      field: 'id',
      type: 'integer',
    });
  });
});
