import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ListM2M } from '../list-m2m/ListM2M';

// ListM2M consumes @buildpad/hooks directly (useRelationM2M / useRelationPermissionsM2M /
// useRelationMultipleM2M / useFieldMetadata). Mock the whole module so tests are
// deterministic and don't hit the network.
//
// useRelationMultipleM2M is given a small *stateful* fake implementation (built with
// real React state) rather than a static jest.fn() return value, because the two
// behaviors under test here — the revert-to-empty notification and "Create New"
// junction linking — are both driven by ListM2M reacting to `changes` transitioning
// between states across renders. A static mock can't express that transition.
const mockUseRelationM2M = jest.fn();
const mockUseRelationPermissionsM2M = jest.fn();
const mockSelectItems = jest.fn();
const mockRemoveItem = jest.fn();

jest.mock('@buildpad/hooks', () => {
    const ReactActual = require('react');

    return {
        isValidPrimaryKey: (pk: unknown) => pk !== undefined && pk !== null && pk !== '' && pk !== '+',
        useRelationM2M: (...args: unknown[]) => mockUseRelationM2M(...args),
        useRelationPermissionsM2M: (...args: unknown[]) => mockUseRelationPermissionsM2M(...args),
        useFieldMetadata: () => ({ getDisplayName: (f: string) => f, loading: false }),
        useRelationMultipleM2M: (relationInfo: unknown, _pk: unknown) => {
            const [changes, setChanges] = ReactActual.useState({
                create: [] as Record<string, unknown>[],
                update: [] as Record<string, unknown>[],
                delete: [] as (string | number)[],
            });

            const selectItems = ReactActual.useCallback((ids: (string | number)[]) => {
                mockSelectItems(ids);
                setChanges((prev: any) => ({
                    ...prev,
                    create: [...prev.create, ...ids.map((id: string | number) => ({ $type: 'created', id }))],
                }));
            }, []);

            const removeItem = ReactActual.useCallback((item: any) => {
                mockRemoveItem(item);
                setChanges((prev: any) => ({
                    ...prev,
                    create: prev.create.filter((c: any) => c.id !== item.id),
                }));
            }, []);

            const resetChanges = ReactActual.useCallback(() => {
                setChanges({ create: [], update: [], delete: [] });
            }, []);

            const loadItems = ReactActual.useRef(jest.fn()).current;
            const createItem = ReactActual.useRef(jest.fn()).current;
            const updateItem = ReactActual.useRef(jest.fn()).current;
            const reorderItems = ReactActual.useRef(jest.fn()).current;
            const moveItemUp = ReactActual.useRef(jest.fn()).current;
            const moveItemDown = ReactActual.useRef(jest.fn()).current;
            const getSelectedRelatedPKs = ReactActual.useCallback(() => new Set(), []);
            const getChanges = ReactActual.useCallback(() => changes, [changes]);

            const displayItems = changes.create.map((c: any) => ({ ...c }));

            return {
                displayItems,
                fetchedItems: [],
                totalCount: displayItems.length,
                loading: false,
                error: null,
                loadItems,
                createItem,
                selectItems,
                removeItem,
                updateItem,
                reorderItems,
                moveItemUp,
                moveItemDown,
                getSelectedRelatedPKs,
                getChanges,
                hasChanges: changes.create.length > 0 || changes.update.length > 0 || changes.delete.length > 0,
                setLocalChanges: setChanges,
                resetChanges,
                changes,
            };
        },
    };
});

jest.mock('@buildpad/ui-collections', () => ({
    CollectionForm: ({ onSuccess }: any) => (
        <div data-testid="collection-form">
            <button onClick={() => onSuccess?.({ id: 'new-tag-id', name: 'Brand new tag' })}>
                Save Form
            </button>
        </div>
    ),
    CollectionList: ({ bulkActions }: any) => (
        <div data-testid="collection-list">
            {bulkActions && (
                <button onClick={() => bulkActions[0].action([42])}>Add Selected</button>
            )}
        </div>
    ),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <MantineProvider>
        <Notifications />
        {children}
    </MantineProvider>
);

const RELATION_INFO = {
    relatedCollection: { collection: 'tags', meta: {} },
    junctionCollection: { collection: 'articles_tags' },
    junctionField: { field: 'tag_id', type: 'integer' },
    reverseJunctionField: { field: 'article_id', type: 'integer' },
    relatedPrimaryKeyField: { field: 'id', type: 'integer' },
    junctionPrimaryKeyField: { field: 'id', type: 'integer' },
    sortField: undefined,
};

const defaultProps = {
    collection: 'articles',
    field: 'tags',
    primaryKey: 1,
    enableCreate: true,
    enableSelect: true,
    mockRelationInfo: RELATION_INFO,
};

beforeEach(() => {
    jest.clearAllMocks();
    mockUseRelationM2M.mockReturnValue({ relationInfo: RELATION_INFO, loading: false, error: null });
    mockUseRelationPermissionsM2M.mockReturnValue({
        createAllowed: true,
        selectAllowed: true,
        updateAllowed: true,
        deleteAllowed: true,
    });
});

describe('ListM2M revert-to-empty notification', () => {
    it('notifies the parent with an empty changeset after every staged change is undone', async () => {
        const onChange = jest.fn();
        const { container } = render(
            <TestWrapper>
                <ListM2M {...defaultProps} onChange={onChange} />
            </TestWrapper>,
        );

        const selectBtn = await screen.findByText('Add Existing');
        fireEvent.click(selectBtn);
        const addSelectedBtn = await screen.findByText('Add Selected');
        fireEvent.click(addSelectedBtn);

        // A non-empty changeset was staged and reported.
        await waitFor(() => {
            expect(onChange).toHaveBeenCalledWith(
                expect.objectContaining({
                    create: expect.arrayContaining([expect.objectContaining({ id: 42 })]),
                }),
            );
        });
        onChange.mockClear();

        // Undo it — remove the item that was just added (the row's trash icon
        // button — the component doesn't expose a data-testid/aria-label for it,
        // so target it via the tabler trash icon rendered inside).
        await waitFor(() => {
            expect(container.querySelector('svg.tabler-icon-trash')).toBeTruthy();
        });
        const trashIcon = container.querySelector('svg.tabler-icon-trash')!;
        const removeBtn = trashIcon.closest('button')!;
        fireEvent.click(removeBtn);

        // Parent must be told the changeset is empty again, not left holding
        // the previous non-empty payload.
        await waitFor(() => {
            expect(onChange).toHaveBeenCalledWith({ create: [], update: [], delete: [] });
        });
    });
});

describe('ListM2M "Create New" junction linking', () => {
    it('links the newly created related item via selectItems, not just closing the drawer', async () => {
        render(
            <TestWrapper>
                <ListM2M {...defaultProps} />
            </TestWrapper>,
        );

        const createBtn = await screen.findByText('Create New');
        fireEvent.click(createBtn);

        const saveBtn = await screen.findByText('Save Form');
        fireEvent.click(saveBtn);

        // handleEditFormSuccess must call selectItems([data.id]) to stage a
        // junction row linking the newly created item — not silently drop it.
        await waitFor(() => {
            expect(mockSelectItems).toHaveBeenCalledWith(['new-tag-id']);
        });
    });
});
