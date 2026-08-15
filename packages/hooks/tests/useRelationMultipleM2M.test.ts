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
      result.current.moveItemDown(result.current.displayItems, 0, pageOffset);
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

  it('moveItemDown reorders exactly the caller-supplied array, ignoring an out-of-sync staged create in displayItems', async () => {
    // Regression for the page/staged-create index mismatch: the caller
    // (ListM2M) hides staged creates from a non-last page's visible list,
    // so `displayItems` (which always includes every staged create) can
    // disagree with what the caller actually passes in. moveItemUp/Down
    // must resolve `index` against the array the caller supplies, not
    // recompute their own view from `displayItems` — otherwise the same
    // `index` picks a different item in each array.
    const relationInfo = makeRelationInfo();
    const { result } = renderHook(() => useRelationMultipleM2M(relationInfo, 1));

    apiRequestMock.mockResolvedValueOnce({ data: pageOfItems(1, 2), meta: { total_count: 2 } });
    await act(async () => {
      await result.current.loadItems({ limit: 2, page: 1, fields: [] });
    });
    await waitFor(() => expect(result.current.fetchedItems).toHaveLength(2));

    // Stage a create — displayItems now has 3 entries (2 fetched + 1
    // created), but a caller hiding staged creates on this page would still
    // pass only the 2 fetched items.
    act(() => {
      result.current.createItem({ id: 99 });
    });
    expect(result.current.displayItems).toHaveLength(3);

    const pageLocalItems = result.current.displayItems.filter((i) => i.$type !== 'created');
    expect(pageLocalItems).toHaveLength(2);

    act(() => {
      result.current.moveItemDown(pageLocalItems, 0);
    });

    const changes = result.current.getChanges();
    // Only the two page-local (fetched) items should have staged sort
    // updates — the created item's own sort must be untouched.
    expect(changes.update).toHaveLength(2);
    expect(changes.create[0].sort).toBe(3); // unchanged from createItem's auto-assignment
  });
});

describe('useRelationMultipleM2M display order', () => {
  it('reorders displayItems to follow the staged sort values', async () => {
    const relationInfo = makeRelationInfo();
    const { result } = renderHook(() => useRelationMultipleM2M(relationInfo, 1));

    apiRequestMock.mockResolvedValueOnce({ data: pageOfItems(1, 3), meta: { total_count: 3 } });
    await act(async () => {
      await result.current.loadItems({ limit: 3, page: 1, fields: [] });
    });
    await waitFor(() => expect(result.current.fetchedItems).toHaveLength(3));

    const items = result.current.displayItems;
    act(() => {
      result.current.reorderItems([items[1], items[2], items[0]]);
    });

    // Without displayItems ordering by the staged sort, the list keeps fetch
    // order and the reorder is invisible until a server round-trip.
    await waitFor(() =>
      expect(result.current.displayItems.map((i) => i.id)).toEqual([2, 3, 1]),
    );
  });
});

describe('useRelationMultipleM2M out-of-order responses', () => {
  it('ignores a superseded loadItems response that resolves after a newer call', async () => {
    const relationInfo = makeRelationInfo();
    const { result } = renderHook(() => useRelationMultipleM2M(relationInfo, 1));

    let resolveFirst!: (v: unknown) => void;
    const first = new Promise((r) => {
      resolveFirst = r;
    });
    apiRequestMock.mockReturnValueOnce(first);
    apiRequestMock.mockResolvedValueOnce({ data: pageOfItems(2, 2), meta: { total_count: 4 } });

    let firstCall!: Promise<void>;
    act(() => {
      firstCall = result.current.loadItems({ limit: 2, page: 1, fields: [] });
    });
    await act(async () => {
      await result.current.loadItems({ limit: 2, page: 2, fields: [] });
    });

    expect(result.current.fetchedItems.map((i) => i.id)).toEqual([3, 4]);

    // The stale first call resolves late with page 1 data — it must not win.
    await act(async () => {
      resolveFirst({ data: pageOfItems(1, 2), meta: { total_count: 4 } });
      await firstCall;
    });

    expect(result.current.fetchedItems.map((i) => i.id)).toEqual([3, 4]);
    expect(result.current.loading).toBe(false);
  });
});

describe('useRelationMultipleM2M displayItems .id alias (R6.2)', () => {
  it('aliases the real junction PK onto .id for fetched items, not just locally-created ones', async () => {
    // Junction PK deliberately not named "id" — matches the M2A fix
    // (useRelationM2A.ts's `{...item, id: pk}`) so a table whose junction
    // PK column isn't literally "id" doesn't leave `.id` undefined for
    // every fetched row (React keys, DnD sortable ids, data-testids, and
    // drag-end matching in ListM2M all read `item.id` directly).
    const relationInfo = {
      ...makeRelationInfo(),
      junctionPrimaryKeyField: { field: 'uuid', type: 'uuid' },
    } as M2MRelationInfo;
    const { result } = renderHook(() => useRelationMultipleM2M(relationInfo, 1));

    apiRequestMock.mockResolvedValueOnce({
      data: [{ uuid: 'j-1', article_id: 1, tag_id: { id: 9 }, sort: 1 }],
      meta: { total_count: 1 },
    });
    await act(async () => {
      await result.current.loadItems({ limit: 10, page: 1, fields: [] });
    });

    await waitFor(() => expect(result.current.displayItems).toHaveLength(1));
    expect(result.current.displayItems[0].id).toBe('j-1');
    // the real junction PK field itself is untouched
    expect(result.current.displayItems[0].uuid).toBe('j-1');
  });
});

describe('useRelationMultipleM2M alias robustness (R6.2)', () => {
  it('keeps the row\'s own id when the junction PK field is missing from the response', async () => {
    // junctionPKField resolves to 'uuid' (schema says so) but the rows come
    // back without it — e.g. field-level read permissions stripping the
    // column. Writing `id: undefined` over the real id would collapse every
    // row onto one identity: duplicate React keys, one checkbox selecting
    // all rows, and drag-end always resolving row 0.
    const relationInfo = {
      ...makeRelationInfo(),
      junctionPrimaryKeyField: { field: 'uuid', type: 'uuid' },
    } as M2MRelationInfo;
    const { result } = renderHook(() => useRelationMultipleM2M(relationInfo, 1));

    apiRequestMock.mockResolvedValueOnce({
      data: [
        { id: 101, article_id: 1, tag_id: { id: 9 }, sort: 1 },
        { id: 102, article_id: 1, tag_id: { id: 8 }, sort: 2 },
      ],
      meta: {},
    });
    await act(async () => {
      await result.current.loadItems({ limit: 10, page: 1, fields: [] });
    });

    await waitFor(() => expect(result.current.displayItems).toHaveLength(2));
    expect(result.current.displayItems.map((i) => i.id)).toEqual([101, 102]);
  });

  it('does not let a staged edit clobber the junction PK alias', async () => {
    const relationInfo = {
      ...makeRelationInfo(),
      junctionPrimaryKeyField: { field: 'uuid', type: 'uuid' },
    } as M2MRelationInfo;
    const { result } = renderHook(() => useRelationMultipleM2M(relationInfo, 1));

    apiRequestMock.mockResolvedValueOnce({
      data: [{ uuid: 'j-1', article_id: 1, tag_id: { id: 9 }, sort: 1 }],
      meta: {},
    });
    await act(async () => {
      await result.current.loadItems({ limit: 10, page: 1, fields: [] });
    });
    await waitFor(() => expect(result.current.displayItems).toHaveLength(1));

    // A consumer spreading a display item into its edits carries `.id` along;
    // the overlay must not let that overwrite the junction PK alias.
    act(() => {
      result.current.updateItem(result.current.displayItems[0], { id: 999, sort: 5 });
    });

    await waitFor(() => expect(result.current.displayItems[0].sort).toBe(5));
    expect(result.current.displayItems[0].id).toBe('j-1');
  });

  it('discards the previous record\'s staged changes when the parent key changes', async () => {
    const relationInfo = makeRelationInfo();
    const { result, rerender } = renderHook(
      ({ pk }) => useRelationMultipleM2M(relationInfo, pk),
      { initialProps: { pk: 1 as string | number } },
    );

    apiRequestMock.mockResolvedValueOnce({
      data: [{ id: 71, article_id: 1, tag_id: { id: 9 }, sort: 1 }],
      meta: {},
    });
    await act(async () => {
      await result.current.loadItems({ limit: 10, page: 1, fields: [] });
    });
    await waitFor(() => expect(result.current.displayItems).toHaveLength(1));

    act(() => {
      result.current.selectItems([55]);
      result.current.removeItem(result.current.displayItems[0]);
    });
    expect(result.current.getChanges().create).toHaveLength(1);
    expect(result.current.getChanges().delete).toHaveLength(1);

    // Navigating to another record must not carry record 1's staged
    // mutations onto record 2 — saving record 2 would otherwise also
    // create/delete junction rows belonging to record 1.
    rerender({ pk: 2 });
    await waitFor(() => expect(result.current.getChanges().create).toHaveLength(0));
    expect(result.current.getChanges().delete).toHaveLength(0);
    expect(result.current.getChanges().update).toHaveLength(0);
  });

  it('assigns distinct sort values across one multi-select batch', async () => {
    const relationInfo = makeRelationInfo();
    const { result } = renderHook(() => useRelationMultipleM2M(relationInfo, 1));

    apiRequestMock.mockResolvedValueOnce({
      data: [
        { id: 1, article_id: 1, tag_id: { id: 1 }, sort: 1 },
        { id: 2, article_id: 1, tag_id: { id: 2 }, sort: 2 },
      ],
      meta: {},
    });
    await act(async () => {
      await result.current.loadItems({ limit: 10, page: 1, fields: [] });
    });
    await waitFor(() => expect(result.current.displayItems).toHaveLength(2));

    act(() => {
      result.current.selectItems([30, 40]);
    });

    const sorts = result.current.getChanges().create.map((c) => c.sort);
    expect(sorts).toEqual([3, 4]);
  });

  it('does not strand loading when a guarded call follows an in-flight one', async () => {
    const relationInfo = makeRelationInfo();
    const { result, rerender } = renderHook(
      ({ pk }) => useRelationMultipleM2M(relationInfo, pk),
      { initialProps: { pk: 1 as string | number } },
    );

    apiRequestMock.mockResolvedValueOnce({
      data: [{ id: 1, article_id: 1, tag_id: { id: 1 }, sort: 1 }],
      meta: {},
    });
    await act(async () => {
      await result.current.loadItems({ limit: 10, page: 1, fields: [] });
    });

    // A guarded (new-item) call must not bump the request generation, which
    // would orphan the settled fetch and leave `loading` true forever.
    rerender({ pk: '+' });
    await act(async () => {
      await result.current.loadItems({ limit: 10, page: 1, fields: [] });
    });

    expect(result.current.loading).toBe(false);
  });
});
