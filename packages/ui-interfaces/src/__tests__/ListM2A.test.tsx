/**
 * ListM2A — inline "Create New" staging & replace-mode payload flattening.
 *
 * Regression tests for the two coupled bugs where an inline-created item was
 * emitted with the collection-discriminator string as its item value:
 *
 * - the Create New modal's onSave must feed createItemWithData only the nested
 *   related-item fields (itemData) plus junction-level edits (additionalData);
 *   passing JunctionItemForm's whole combined payload double-wraps it under
 *   junctionField
 * - the replace-mode payload builder must resolve a nested row's id via the
 *   collection's actual PK field (relationPrimaryKeyFields), never "first
 *   object value"
 * - an inline-created row with no PK yet must pass its whole nested object
 *   through so DaaS deep-creates the related item
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";

jest.mock("@buildpad/hooks", () => ({
    useRelationM2A: jest.fn(),
    useRelationM2AItems: jest.fn(),
    useRelationPermissionsM2A: jest.fn(),
}));

jest.mock("@buildpad/services", () => ({
    apiRequest: jest.fn(),
}));

// The select modal renders a full CollectionList; not under test here.
jest.mock("@buildpad/ui-collections", () => ({
    CollectionList: () => null,
}));

// JunctionItemForm loads field definitions over the API and renders two VForm
// sections. Stub it to a save button that fires onSave with the same shape the
// real handleSave builds for a new item:
//   { ...junctionEdits, [collectionField]: targetCollection, [junctionField]: relatedEdits }
// (keys 'collection'/'item' match RELATION_INFO below)
jest.mock("../list-m2a/JunctionItemForm", () => {
    const R = require("react");
    return {
        JunctionItemForm: ({ targetCollection, onSave }: any) =>
            R.createElement(
                "button",
                {
                    "data-testid": "mock-junction-save",
                    onClick: () =>
                        onSave({
                            ...((globalThis as any).__junctionEdits ?? {}),
                            collection: targetCollection,
                            item: (globalThis as any).__relatedEdits ?? {},
                        }),
                },
                "save",
            ),
    };
});

import {
    useRelationM2A,
    useRelationM2AItems,
    useRelationPermissionsM2A,
} from "@buildpad/hooks";
import { apiRequest } from "@buildpad/services";
import { ListM2A } from "../list-m2a/ListM2A";

const RELATION_INFO = {
    junctionCollection: { collection: "pages_blocks" },
    allowedCollections: [
        { collection: "headings", name: "Headings", meta: {} },
        { collection: "paragraphs", name: "Paragraphs", meta: {} },
    ],
    collectionField: { field: "collection", type: "string" },
    junctionField: { field: "item", type: "string" },
    reverseJunctionField: { field: "page_id", type: "uuid" },
    junctionPrimaryKeyField: { field: "id", type: "integer" },
    relationPrimaryKeyFields: {
        headings: { field: "id", type: "uuid" },
        // deliberately not named "id" — guards the hardcoded-PK regression
        paragraphs: { field: "code", type: "string" },
    },
    sortField: "sort",
    relation: { field: "page_id", collection: "pages_blocks" },
};

const wrap = (ui: React.ReactNode) => <MantineProvider>{ui}</MantineProvider>;

const BASE_PROPS = {
    collection: "pages",
    field: "blocks",
    primaryKey: "page-1",
    layout: "list" as const,
};

function setItemsHook(overrides: Record<string, unknown> = {}) {
    const hook = {
        displayItems: [] as Record<string, unknown>[],
        totalCount: 0,
        loading: false,
        loadItems: jest.fn(),
        createItem: jest.fn(),
        createItemWithData: jest.fn(),
        removeItem: jest.fn(),
        updateItem: jest.fn(),
        selectItems: jest.fn(),
        moveItemUp: jest.fn(),
        moveItemDown: jest.fn(),
        getSelectedPrimaryKeysByCollection: jest.fn().mockReturnValue({}),
        getChanges: jest.fn().mockReturnValue({ create: [], update: [], delete: [] }),
        hasChanges: false,
        resetChanges: jest.fn(),
        ...overrides,
    };
    (useRelationM2AItems as jest.Mock).mockReturnValue(hook);
    return hook;
}

beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as any).__relatedEdits = { title: "Hello" };
    (globalThis as any).__junctionEdits = {};
    (useRelationM2A as jest.Mock).mockReturnValue({
        relationInfo: RELATION_INFO,
        loading: false,
        error: null,
    });
    (useRelationPermissionsM2A as jest.Mock).mockReturnValue({
        createAllowed: { headings: true, paragraphs: true },
        selectAllowed: true,
        updateAllowed: { headings: true, paragraphs: true },
        deleteAllowed: { headings: true, paragraphs: true },
    });
    setItemsHook();
});

describe("ListM2A inline create — staging wiring", () => {
    it("feeds createItemWithData only the nested related fields, with junction-level edits as additionalData", async () => {
        (globalThis as any).__relatedEdits = { title: "Hello", body: "World" };
        (globalThis as any).__junctionEdits = { note: "pinned" };
        const hook = setItemsHook();

        render(wrap(<ListM2A {...(BASE_PROPS as any)} />));

        fireEvent.click(screen.getByTestId("m2a-create-btn"));
        fireEvent.click(await screen.findByTestId("m2a-create-headings"));
        fireEvent.click(await screen.findByTestId("mock-junction-save"));

        expect(hook.createItemWithData).toHaveBeenCalledTimes(1);
        expect(hook.createItemWithData).toHaveBeenCalledWith(
            "headings",
            { title: "Hello", body: "World" },
            { note: "pinned" },
        );
    });

    it("never re-nests the collection discriminator inside the staged item data", async () => {
        const hook = setItemsHook();

        render(wrap(<ListM2A {...(BASE_PROPS as any)} />));

        fireEvent.click(screen.getByTestId("m2a-create-btn"));
        fireEvent.click(await screen.findByTestId("m2a-create-paragraphs"));
        fireEvent.click(await screen.findByTestId("mock-junction-save"));

        const [, itemData, additionalData] = hook.createItemWithData.mock.calls[0];
        expect(itemData).not.toHaveProperty("collection");
        expect(itemData).not.toHaveProperty("item");
        expect(additionalData ?? {}).not.toHaveProperty("collection");
    });
});

describe("ListM2A onChange payload — junction value flattening", () => {
    // Unsaved parent: the flattening rule is shared by both baselines (one
    // `toPayload` mapper), so exercising it on the path that needs no
    // preserve-fetch keeps these focused on flattening alone.
    it("passes the whole nested object through for an inline-created item with no PK yet", async () => {
        const onChange = jest.fn();
        setItemsHook({
            hasChanges: true,
            displayItems: [
                {
                    id: "temp-1",
                    $type: "created",
                    collection: "headings",
                    item: { title: "Hello" },
                },
            ],
        });

        render(wrap(<ListM2A {...(BASE_PROPS as any)} primaryKey="+" onChange={onChange} />));

        await waitFor(() => expect(onChange).toHaveBeenCalled());
        expect(onChange).toHaveBeenLastCalledWith([
            { collection: "headings", item: { title: "Hello" } },
        ]);
    });

    it("flattens a fetched row via the collection's actual PK field, not the first object value", async () => {
        const onChange = jest.fn();
        setItemsHook({
            hasChanges: true,
            displayItems: [
                {
                    id: 7,
                    // non-PK key deliberately first: "first object value" would pick it
                    collection: "paragraphs",
                    item: { title: "Nine", code: "para-9" },
                },
            ],
        });

        render(wrap(<ListM2A {...(BASE_PROPS as any)} primaryKey="+" onChange={onChange} />));

        await waitFor(() => expect(onChange).toHaveBeenCalled());
        expect(onChange).toHaveBeenLastCalledWith([
            { collection: "paragraphs", item: "para-9" },
        ]);
    });

    it("still flattens id-keyed rows to their id", async () => {
        const onChange = jest.fn();
        setItemsHook({
            hasChanges: true,
            displayItems: [
                { id: 3, collection: "headings", item: { id: "u-1", title: "T" } },
            ],
        });

        render(wrap(<ListM2A {...(BASE_PROPS as any)} primaryKey="+" onChange={onChange} />));

        await waitFor(() => expect(onChange).toHaveBeenCalled());
        expect(onChange).toHaveBeenLastCalledWith([
            { collection: "headings", item: "u-1" },
        ]);
    });
});

describe("ListM2A drag gating — paginated sets", () => {
    const rows = (n: number) =>
        Array.from({ length: n }, (_, i) => ({
            id: `j${i}`,
            collection: "headings",
            item: `u${i}`,
            sort: i + 1,
        }));

    it("disables drag and shows the explanatory notice when totalCount exceeds one page", () => {
        // 15 visible rows (a full page) of a 30-row set: the old
        // visibleItems-based conditions left drag enabled with no notice.
        setItemsHook({ totalCount: 30, displayItems: rows(15) });

        render(wrap(<ListM2A {...(BASE_PROPS as any)} />));

        expect(screen.getByTestId("m2a-drag-disabled-notice")).toBeInTheDocument();
        expect(screen.queryAllByTestId(/^m2a-drag-handle-/)).toHaveLength(0);
    });

    it("enables drag with no notice when all items fit on one page", () => {
        setItemsHook({ totalCount: 3, displayItems: rows(3) });

        render(wrap(<ListM2A {...(BASE_PROPS as any)} />));

        expect(screen.queryByTestId("m2a-drag-disabled-notice")).toBeNull();
        expect(screen.queryAllByTestId(/^m2a-drag-handle-/)).toHaveLength(3);
    });
});

describe("ListM2A onChange payload — paginated preserve-fetch", () => {
    // A saved parent (primaryKey="page-1") with a 30-row junction set, page
    // size 15. hookDisplayItems only ever holds the current page's 15 rows —
    // emitting straight from it drops the other 15 from the replace-mode
    // payload on save.
    const onPageRows = (n: number) =>
        Array.from({ length: n }, (_, i) => ({
            id: `j${i}`,
            collection: "headings",
            item: `u${i}`,
            sort: i + 1,
        }));

    // A real changeset: `hasChanges` is derived from these arrays being
    // non-empty, so pairing hasChanges:true with an empty changeset is a
    // state the hook cannot produce — and it leaves the overlay untested.
    const CHANGES = {
        create: [{ collection: "headings", item: "u-new" }],
        update: [],
        delete: ["j5"],
    };

    it("fetches the full junction set and preserves off-page rows instead of dropping them", async () => {
        (apiRequest as jest.Mock).mockResolvedValue({
            data: Array.from({ length: 30 }, (_, i) => ({
                id: `j${i}`,
                collection: "headings",
                item: `u${i}`,
                sort: i + 1,
            })),
            meta: { total_count: 30 },
        });
        const onChange = jest.fn();
        setItemsHook({
            hasChanges: true,
            totalCount: 30,
            displayItems: onPageRows(15),
            getChanges: jest.fn().mockReturnValue(CHANGES),
        });

        render(wrap(<ListM2A {...(BASE_PROPS as any)} onChange={onChange} />));

        await waitFor(() => expect(onChange).toHaveBeenCalled());
        const payload = onChange.mock.calls.at(-1)![0] as Record<string, unknown>[];
        // 30 fetched - 1 staged delete + 1 staged create
        expect(payload).toHaveLength(30);
        expect(payload.some((e) => e.item === "u5")).toBe(false);
        expect(payload.some((e) => e.item === "u-new")).toBe(true);

        // The query itself must be pinned: without the parent filter the fetch
        // returns every parent's rows and the emit re-links them onto this one.
        const url = (apiRequest as jest.Mock).mock.calls[0][0] as string;
        expect(url).toContain("/api/items/pages_blocks");
        expect(decodeURIComponent(url)).toContain('{"page_id":{"_eq":"page-1"}}');
        expect(url).toContain("limit=-1");
        expect(url).toContain("page=0");
        expect(url).toContain("count=exact");
        expect(url).toContain("sort=sort");
    });

    it("refuses to emit when the preserve-fetch comes back incomplete", async () => {
        // 200 OK, but the server returned fewer rows than it says are linked
        // (a clamped limit or capped page size). Emitting these as
        // authoritative would unlink the difference.
        (apiRequest as jest.Mock).mockResolvedValue({
            data: onPageRows(10),
            meta: { total_count: 30 },
        });
        const onChange = jest.fn();
        setItemsHook({
            hasChanges: true,
            totalCount: 30,
            displayItems: onPageRows(15),
            getChanges: jest.fn().mockReturnValue(CHANGES),
        });

        render(wrap(<ListM2A {...(BASE_PROPS as any)} onChange={onChange} />));

        await waitFor(() => expect(apiRequest).toHaveBeenCalled());
        await new Promise((r) => setTimeout(r, 0));
        expect(onChange).not.toHaveBeenCalled();
    });

    it("normalizes a bare-array response instead of reading it as an empty relation", async () => {
        (apiRequest as jest.Mock).mockResolvedValue(onPageRows(30));
        const onChange = jest.fn();
        setItemsHook({
            hasChanges: true,
            totalCount: 30,
            displayItems: onPageRows(15),
            getChanges: jest.fn().mockReturnValue({ create: [], update: [], delete: ["j5"] }),
        });

        render(wrap(<ListM2A {...(BASE_PROPS as any)} onChange={onChange} />));

        await waitFor(() => expect(onChange).toHaveBeenCalled());
        const payload = onChange.mock.calls.at(-1)![0] as unknown[];
        // 30 fetched - 1 staged delete; `resp.data || []` would have emitted []
        expect(payload).toHaveLength(29);
    });

    it("orders the payload by the staged sort so a reorder survives the save", async () => {
        (apiRequest as jest.Mock).mockResolvedValue({
            data: [
                { id: "j0", collection: "headings", item: "u0", sort: 1 },
                { id: "j1", collection: "headings", item: "u1", sort: 2 },
                { id: "j2", collection: "headings", item: "u2", sort: 3 },
            ],
            meta: { total_count: 3 },
        });
        const onChange = jest.fn();
        setItemsHook({
            hasChanges: true,
            totalCount: 3,
            displayItems: onPageRows(3),
            // drag the last row to the front
            getChanges: jest.fn().mockReturnValue({
                create: [],
                update: [{ id: "j2", sort: 0 }],
                delete: [],
            }),
        });

        render(wrap(<ListM2A {...(BASE_PROPS as any)} onChange={onChange} />));

        await waitFor(() => expect(onChange).toHaveBeenCalled());
        const payload = onChange.mock.calls.at(-1)![0] as Record<string, unknown>[];
        // payload order IS the persisted sort, so u2 must lead
        expect(payload.map((e) => e.item)).toEqual(["u2", "u0", "u1"]);
    });

    it("also fetches the full set when a search is active on a single page", async () => {
        (apiRequest as jest.Mock).mockResolvedValue({
            data: [
                { id: "j0", collection: "headings", item: "u0", sort: 1 },
                { id: "j1", collection: "headings", item: "u1", sort: 2 },
            ],
            meta: { total_count: 2 },
        });
        const onChange = jest.fn();
        // totalCount <= limit (search-filtered), but the full set has 2 rows
        // — one of which doesn't match the active search and would be
        // dropped if the payload were built from the filtered page alone.
        setItemsHook({
            hasChanges: true,
            totalCount: 1,
            displayItems: [{ id: "j0", collection: "headings", item: "u0", sort: 1 }],
            getChanges: jest.fn().mockReturnValue({ create: [], update: [], delete: [] }),
        });

        render(
            wrap(<ListM2A {...(BASE_PROPS as any)} onChange={onChange} enableSearchFilter layout="table" />),
        );

        fireEvent.change(screen.getByTestId("m2a-search"), { target: { value: "abc" } });

        await waitFor(() => expect(apiRequest).toHaveBeenCalled());
        await waitFor(() => expect(onChange).toHaveBeenCalled());
        const payload = onChange.mock.calls.at(-1)![0] as unknown[];
        // both junction rows preserved, not just the one on the filtered page
        expect(payload).toHaveLength(2);
    });

    it("aborts the emit instead of falling back to the page-scoped payload when the preserve-fetch fails", async () => {
        (apiRequest as jest.Mock).mockRejectedValue(new Error("network error"));
        const onChange = jest.fn();
        setItemsHook({
            hasChanges: true,
            totalCount: 30,
            displayItems: onPageRows(15),
            getChanges: jest.fn().mockReturnValue(CHANGES),
        });

        render(wrap(<ListM2A {...(BASE_PROPS as any)} onChange={onChange} />));

        await waitFor(() => expect(apiRequest).toHaveBeenCalled());
        // give the rejected promise's catch handler a tick to run
        await new Promise((r) => setTimeout(r, 0));

        expect(onChange).not.toHaveBeenCalled();
    });
});
