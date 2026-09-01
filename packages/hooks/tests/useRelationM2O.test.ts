/**
 * useRelationM2O unit tests
 *
 * Covers the field-schema fallback: `/api/relations` only reports a relation
 * when a live Postgres FK constraint exists (or `daas_relations` metadata
 * resolved via one). If that DDL step silently failed or was never run —
 * e.g. a mismatched FK target type, or a scope/M2O metadata collision — the
 * field can still carry its intended target on `daas_fields` (physical FK,
 * `daas_relations`, or `meta.options.related_collection`, in that order —
 * see `FieldsService.readOne`'s own fallback chain, mirrored by
 * `GET /api/fields/{collection}/{field}`).
 *
 * Before this fallback, any field left in that "configured but relation
 * creation failed" state would hard-error with "No M2O relation found for
 * X.Y", even when the target collection was fully recoverable from the
 * field's own schema/options.
 *
 * `apiRequest` (from `./utils`) is mocked so no network is required.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const { apiRequestMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
}));

vi.mock('../src/utils', () => ({
  apiRequest: apiRequestMock,
  isValidPrimaryKey: (v: unknown) => v !== null && v !== undefined && v !== '+' && v !== '',
}));

import { useRelationM2O } from '../src/useRelationM2O';

beforeEach(() => {
  apiRequestMock.mockReset();
});

describe('useRelationM2O', () => {
  it('resolves normally when /api/relations reports the relation (no fallback needed)', async () => {
    apiRequestMock.mockImplementation(async (path: string) => {
      if (path === '/api/relations') {
        return {
          data: [
            {
              many_collection: 'xtr_cms_teams',
              many_field: 'service',
              one_collection: 'xtr_cms_services',
              one_primary: 'id',
            },
          ],
        };
      }
      if (path.startsWith('/api/collections/')) {
        return { data: { meta: {} } };
      }
      throw new Error(`Unexpected apiRequest call: ${path}`);
    });

    const { result } = renderHook(() => useRelationM2O('xtr_cms_teams', 'service'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.relationInfo?.relatedCollection.collection).toBe('xtr_cms_services');
    expect(result.current.relationInfo?.relatedPrimaryKeyField.field).toBe('id');
    // Fallback endpoint should never be hit when /api/relations already resolves.
    expect(apiRequestMock.mock.calls.some(([p]) => String(p).startsWith('/api/fields/'))).toBe(false);
  });

  it('falls back to /api/fields/{collection}/{field} when no relation is found', async () => {
    apiRequestMock.mockImplementation(async (path: string) => {
      if (path === '/api/relations') {
        return { data: [] };
      }
      if (path === '/api/fields/xtr_cms_teams/service4') {
        return {
          data: {
            schema: {
              foreign_key_table: 'xtr_cms_services',
              foreign_key_column: 'id',
            },
          },
        };
      }
      if (path.startsWith('/api/collections/')) {
        return { data: { meta: {} } };
      }
      throw new Error(`Unexpected apiRequest call: ${path}`);
    });

    const { result } = renderHook(() => useRelationM2O('xtr_cms_teams', 'service4'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.relationInfo?.relatedCollection.collection).toBe('xtr_cms_services');
    expect(result.current.relationInfo?.relatedPrimaryKeyField.field).toBe('id');
  });

  it('errors with "No M2O relation found" when both /api/relations and the field-schema fallback come up empty', async () => {
    apiRequestMock.mockImplementation(async (path: string) => {
      if (path === '/api/relations') {
        return { data: [] };
      }
      if (path === '/api/fields/xtr_cms_teams/service3') {
        return {
          data: {
            schema: { foreign_key_table: null, foreign_key_column: null },
            meta: { interface: 'select-dropdown-m2o', options: null },
          },
        };
      }
      throw new Error(`Unexpected apiRequest call: ${path}`);
    });

    const { result } = renderHook(() => useRelationM2O('xtr_cms_teams', 'service3'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.relationInfo).toBeNull();
    expect(result.current.error).toBe(
      'No M2O relation found for xtr_cms_teams.service3. Ensure a relation is configured in DaaS.',
    );
  });

  it('errors gracefully (no crash) when the field-schema fallback request itself throws', async () => {
    apiRequestMock.mockImplementation(async (path: string) => {
      if (path === '/api/relations') {
        return { data: [] };
      }
      if (path === '/api/fields/xtr_cms_teams/service3') {
        throw new Error('network down');
      }
      throw new Error(`Unexpected apiRequest call: ${path}`);
    });

    const { result } = renderHook(() => useRelationM2O('xtr_cms_teams', 'service3'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.relationInfo).toBeNull();
    expect(result.current.error).toBe(
      'No M2O relation found for xtr_cms_teams.service3. Ensure a relation is configured in DaaS.',
    );
  });

  it('prefers /api/relations metadata over the field-schema fallback when both are present', async () => {
    apiRequestMock.mockImplementation(async (path: string) => {
      if (path === '/api/relations') {
        return {
          data: [
            {
              many_collection: 'xtr_cms_teams',
              many_field: 'service',
              one_collection: 'xtr_cms_services',
              one_primary: 'id',
            },
          ],
        };
      }
      if (path.startsWith('/api/collections/')) {
        return { data: { meta: {} } };
      }
      // Fallback must not be reached — /api/relations already resolved.
      throw new Error(`Unexpected apiRequest call: ${path}`);
    });

    const { result } = renderHook(() => useRelationM2O('xtr_cms_teams', 'service'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.relationInfo?.relatedCollection.collection).toBe('xtr_cms_services');
  });
});
