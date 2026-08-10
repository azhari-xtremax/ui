/**
 * useRelationM2AItems — reorder staging & display order.
 *
 * Exercises the REAL hook (moduleNameMapper resolves @buildpad/hooks to
 * source; only the API layer is mocked). Lives in ui-interfaces because the
 * hooks package has no jest setup — same placement precedent as
 * useWorkflow.test.ts.
 *
 * Covers the reorder contract end-to-end at the hook boundary:
 * - displayItems must follow the staged sort values (the interface's emitted
 *   replace-mode payload carries no sort — payload order IS display order,
 *   so an unsorted displayItems makes drag reorder snap back and never
 *   persist)
 * - a single reorderItems call stages every changed sort (multi-position
 *   drags), skipping unchanged rows
 * - pageOffset makes staged sorts global (page 2+ writes offset+i+1)
 */
import { renderHook, act, waitFor } from "@testing-library/react";

jest.mock("@buildpad/services", () => ({
    apiRequest: jest.fn(),
}));
jest.mock("@buildpad/utils", () => ({
    isNewItem: (v: unknown) => v === null || v === undefined || v === "+",
}));
jest.mock("@mantine/notifications", () => ({
    notifications: { show: jest.fn() },
}));

import { apiRequest } from "@buildpad/services";
import { useRelationM2AItems, type M2ARelationInfo } from "@buildpad/hooks";

const RELATION_INFO = {
    junctionCollection: { collection: "pages_blocks" },
    allowedCollections: [
        { collection: "heading_blocks", meta: {} },
        { collection: "text_blocks", meta: {} },
    ],
    collectionField: { field: "collection", type: "string" },
    junctionField: { field: "item", type: "string" },
    reverseJunctionField: { field: "page_id", type: "uuid" },
    junctionPrimaryKeyField: { field: "id", type: "uuid" },
    relationPrimaryKeyFields: {
        heading_blocks: { field: "id", type: "uuid" },
        text_blocks: { field: "id", type: "uuid" },
    },
    sortField: "sort",
    relation: { field: "page_id", collection: "pages_blocks" },
} as unknown as M2ARelationInfo;

const JUNCTION_ROWS = [
    { id: "j1", page_id: "p1", collection: "heading_blocks", item: "h1", sort: 1 },
    { id: "j2", page_id: "p1", collection: "text_blocks", item: "t1", sort: 2 },
    { id: "j3", page_id: "p1", collection: "heading_blocks", item: "h2", sort: 3 },
];

beforeEach(() => {
    jest.clearAllMocks();
    (apiRequest as jest.Mock).mockImplementation((path: string) => {
        if (path.startsWith("/api/items/pages_blocks")) {
            return Promise.resolve({ data: JUNCTION_ROWS, meta: { total_count: 3 } });
        }
        if (path.startsWith("/api/items/heading_blocks")) {
            return Promise.resolve({ data: [{ id: "h1" }, { id: "h2" }] });
        }
        if (path.startsWith("/api/items/text_blocks")) {
            return Promise.resolve({ data: [{ id: "t1" }] });
        }
        return Promise.resolve({ data: [] });
    });
});

async function loadedHook() {
    const hook = renderHook(() => useRelationM2AItems(RELATION_INFO, "p1"));
    await act(async () => {
        await hook.result.current.loadItems();
    });
    await waitFor(() =>
        expect(hook.result.current.displayItems.map((i) => i.id)).toEqual(["j1", "j2", "j3"]),
    );
    return hook;
}

describe("useRelationM2AItems reorder", () => {
    it("reorders displayItems to follow the staged sort values", async () => {
        const { result } = await loadedHook();
        const items = result.current.displayItems;

        act(() => {
            result.current.reorderItems([items[1], items[2], items[0]]);
        });

        await waitFor(() =>
            expect(result.current.displayItems.map((i) => i.id)).toEqual(["j2", "j3", "j1"]),
        );
    });

    it("stages every changed sort in one call and skips unchanged rows", async () => {
        const { result } = await loadedHook();
        const items = result.current.displayItems;

        act(() => {
            result.current.reorderItems([items[1], items[2], items[0]]);
        });

        const update = result.current.getChanges().update;
        expect(update).toHaveLength(3);
        expect(update).toEqual(
            expect.arrayContaining([
                { id: "j2", sort: 1 },
                { id: "j3", sort: 2 },
                { id: "j1", sort: 3 },
            ]),
        );
    });

    it("stages nothing when the order is unchanged", async () => {
        const { result } = await loadedHook();
        const items = result.current.displayItems;

        act(() => {
            result.current.reorderItems([items[0], items[1], items[2]]);
        });

        expect(result.current.getChanges().update).toHaveLength(0);
    });

    it("writes global sorts when given a page offset", async () => {
        const { result } = await loadedHook();
        const items = result.current.displayItems;

        act(() => {
            result.current.reorderItems([items[1], items[2], items[0]], 15);
        });

        const update = result.current.getChanges().update;
        expect(update).toEqual(
            expect.arrayContaining([
                { id: "j2", sort: 16 },
                { id: "j3", sort: 17 },
                { id: "j1", sort: 18 },
            ]),
        );
        await waitFor(() =>
            expect(result.current.displayItems.map((i) => i.id)).toEqual(["j2", "j3", "j1"]),
        );
    });
});
