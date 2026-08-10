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

        render(wrap(<ListM2A {...(BASE_PROPS as any)} onChange={onChange} />));

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

        render(wrap(<ListM2A {...(BASE_PROPS as any)} onChange={onChange} />));

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

        render(wrap(<ListM2A {...(BASE_PROPS as any)} onChange={onChange} />));

        await waitFor(() => expect(onChange).toHaveBeenCalled());
        expect(onChange).toHaveBeenLastCalledWith([
            { collection: "headings", item: "u-1" },
        ]);
    });
});
