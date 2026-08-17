import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { CollectionItemDropdown } from '../collection-item-dropdown/CollectionItemDropdown';

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <MantineProvider>
      {component}
    </MantineProvider>
  );
};

describe('CollectionItemDropdown', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe('Basic Rendering', () => {
    it('renders with label and placeholder', () => {
      renderWithProvider(
        <CollectionItemDropdown
          label="Select Item"
          placeholder="Choose from collection"
          selectedCollection="users"
        />
      );

      expect(screen.getByText('Select Item')).toBeInTheDocument();
      expect(screen.getByTestId('collection-item-dropdown-placeholder')).toHaveTextContent('Choose from collection');
    });
  });

  describe('Value Normalization', () => {
    it('normalizes standard value object', async () => {
      const mockItems = [{ id: 'user-1', name: 'Alice' }];
      renderWithProvider(
        <CollectionItemDropdown
          value={{ key: 'user-1', collection: 'users' }}
          mockItems={mockItems}
          selectedCollection="users"
          template="{{name}}"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('collection-item-dropdown-selected-value')).toHaveTextContent('Alice');
      });
    });

    it('normalizes parsable JSON string value', async () => {
      const mockItems = [{ id: 'user-1', name: 'Alice' }];
      renderWithProvider(
        <CollectionItemDropdown
          value={'{"key":"user-1","collection":"users"}' as any}
          mockItems={mockItems}
          selectedCollection="users"
          template="{{name}}"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('collection-item-dropdown-selected-value')).toHaveTextContent('Alice');
      });
    });

    it('normalizes primitive string value using selectedCollection', async () => {
      const mockItems = [{ id: 'user-2', name: 'Bob' }];
      renderWithProvider(
        <CollectionItemDropdown
          value={'user-2' as any}
          mockItems={mockItems}
          selectedCollection="users"
          template="{{name}}"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('collection-item-dropdown-selected-value')).toHaveTextContent('Bob');
      });
    });

    it('normalizes full item object using primaryKey or id', async () => {
      const mockItems = [{ id: 'user-3', name: 'Charlie' }];
      renderWithProvider(
        <CollectionItemDropdown
          value={{ id: 'user-3', name: 'Charlie' } as any}
          mockItems={mockItems}
          selectedCollection="users"
          template="{{name}}"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('collection-item-dropdown-selected-value')).toHaveTextContent('Charlie');
      });
    });

    it('normalizes full item object using custom primaryKey', async () => {
      const mockItems = [{ custom_id: 'custom-1', name: 'Charlie' }];
      renderWithProvider(
        <CollectionItemDropdown
          value={{ custom_id: 'custom-1', name: 'Charlie' } as any}
          mockItems={mockItems}
          primaryKey="custom_id"
          selectedCollection="users"
          template="{{name}}"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('collection-item-dropdown-selected-value')).toHaveTextContent('Charlie');
      });
    });
  });

  describe('Display Item Resolution and Fetching', () => {
    it('fetches display item from API when not found in memory', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 'user-9', name: 'Fetched User' } })
      });
      global.fetch = mockFetch;

      renderWithProvider(
        <CollectionItemDropdown
          value={{ key: 'user-9', collection: 'users' }}
          selectedCollection="users"
          template="{{name}}"
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/items/users/user-9');
      });

      await waitFor(() => {
        expect(screen.getByTestId('collection-item-dropdown-selected-value')).toHaveTextContent('Fetched User');
      });
    });

    it('handles api fetch error gracefully and shows ID/Key', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        text: async () => 'Not Found'
      });
      global.fetch = mockFetch;

      renderWithProvider(
        <CollectionItemDropdown
          value={{ key: 'user-99', collection: 'users' }}
          selectedCollection="users"
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/items/users/user-99');
      });

      await waitFor(() => {
        expect(screen.getByTestId('collection-item-dropdown-selected-value')).toHaveTextContent('user-99');
      });
    });
  });

  describe('Numeric key selection (R5.3)', () => {
    it('emits the raw numeric key, not a stringified one, when an option is picked', async () => {
      const mockItems = [
        { id: 5, name: 'Five' },
        { id: 10, name: 'Ten' },
      ];
      const handleChange = jest.fn();

      renderWithProvider(
        <CollectionItemDropdown
          mockItems={mockItems}
          selectedCollection="items"
          template="{{name}}"
          onChange={handleChange}
        />
      );

      fireEvent.click(screen.getByTestId('collection-item-dropdown-input'));

      const option = await screen.findByTestId('collection-item-dropdown-option-1');
      fireEvent.click(option);

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith({ key: 10, collection: 'items' });
      });
      // Not the Mantine-stringified '10'
      expect(handleChange).not.toHaveBeenCalledWith({ key: '10', collection: 'items' });
    });

    it('highlights the active option by raw (non-string) key equality', async () => {
      const mockItems = [
        { id: 5, name: 'Five' },
        { id: 10, name: 'Ten' },
      ];

      renderWithProvider(
        <CollectionItemDropdown
          value={{ key: 10, collection: 'items' }}
          mockItems={mockItems}
          selectedCollection="items"
          template="{{name}}"
        />
      );

      fireEvent.click(await screen.findByTestId('collection-item-dropdown-input'));

      const activeOption = await screen.findByTestId('collection-item-dropdown-option-1');
      expect(activeOption).toHaveAttribute('data-combobox-active', 'true');
    });
  });

  describe('Free-text collection input (R5.4)', () => {
    it('does not clear the item selection on every keystroke', async () => {
      const mockItems = [{ id: 'user-1', name: 'Alice' }];
      const handleChange = jest.fn();
      const handleCollectionChange = jest.fn();

      renderWithProvider(
        <CollectionItemDropdown
          value={{ key: 'user-1', collection: 'users' }}
          mockItems={mockItems}
          showCollectionSelect
          selectedCollection="users"
          template="{{name}}"
          onChange={handleChange}
          onCollectionChange={handleCollectionChange}
        />
      );

      const input = screen.getByTestId('collection-select-input');
      fireEvent.change(input, { target: { value: 'u' } });
      fireEvent.change(input, { target: { value: 'us' } });

      expect(handleChange).not.toHaveBeenCalled();
      expect(handleCollectionChange).not.toHaveBeenCalled();
    });

    it('commits (and clears the selection) on blur when the typed text resolves to a real collection', async () => {
      // V3-7: blur only commits a value that actually resolves to a known
      // collection now — it needs /api/collections to have loaded 'orders'
      // as a real option, unlike the old unvalidated-commit behavior this
      // test used to (incorrectly) exercise.
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ collection: 'users' }, { collection: 'orders' }] }),
      });
      global.fetch = mockFetch;

      const mockItems = [{ id: 'user-1', name: 'Alice' }];
      const handleChange = jest.fn();
      const handleCollectionChange = jest.fn();

      renderWithProvider(
        <CollectionItemDropdown
          value={{ key: 'user-1', collection: 'users' }}
          mockItems={mockItems}
          showCollectionSelect
          selectedCollection="users"
          template="{{name}}"
          onChange={handleChange}
          onCollectionChange={handleCollectionChange}
        />
      );

      await waitFor(() => expect(mockFetch).toHaveBeenCalledWith('/api/collections'));

      const input = screen.getByTestId('collection-select-input');
      fireEvent.change(input, { target: { value: 'orders' } });
      fireEvent.blur(input);

      expect(handleCollectionChange).toHaveBeenCalledWith('orders');
      expect(handleChange).toHaveBeenCalledWith(null);
    });

    // V3-7: an unvalidated partial string used to commit as-is on blur,
    // wiping the item selection and leaving selectedCollection pointed at a
    // collection that doesn't exist.
    it('does not commit an unvalidated partial collection name on blur', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ collection: 'users' }, { collection: 'orders' }] }),
      });
      global.fetch = mockFetch;

      const mockItems = [{ id: 'user-1', name: 'Alice' }];
      const handleChange = jest.fn();
      const handleCollectionChange = jest.fn();

      renderWithProvider(
        <CollectionItemDropdown
          value={{ key: 'user-1', collection: 'users' }}
          mockItems={mockItems}
          showCollectionSelect
          selectedCollection="users"
          template="{{name}}"
          onChange={handleChange}
          onCollectionChange={handleCollectionChange}
        />
      );

      await waitFor(() => expect(mockFetch).toHaveBeenCalledWith('/api/collections'));

      const input = screen.getByTestId('collection-select-input');
      fireEvent.change(input, { target: { value: 'ord' } });
      fireEvent.blur(input);

      expect(handleCollectionChange).not.toHaveBeenCalled();
      expect(handleChange).not.toHaveBeenCalled();
      // the draft reverts to the last real collection instead of leaving
      // the partial text in place
      expect(input).toHaveValue('users');
    });

    // V3-7: a menu-item click fires its onClick AFTER the input's blur (the
    // browser dispatches blur first when focus moves to the clicked item).
    // Committing on blur while the menu was still open meant blur committed
    // whatever partial/stale text was typed, immediately followed by the
    // click's own (correct) commit — a double-commit.
    // Replaces a test that drove a browser-impossible sequence: it blurred an
    // input that never held focus while the menu was open, to simulate a
    // "blur fires before the menu item's click" ordering that Mantine does not
    // produce — MenuItem calls preventDefault() on mousedown, so clicking an
    // item moves no focus and fires no blur at all.
    //
    // The real double-commit is this one: a valid name typed in full commits
    // once through the change handler, and blur must not commit it again.
    it('commits a fully-typed valid collection exactly once', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ collection: 'users' }, { collection: 'orders' }] }),
      });
      global.fetch = mockFetch;

      const handleChange = jest.fn();
      const handleCollectionChange = jest.fn();

      renderWithProvider(
        <CollectionItemDropdown
          value={{ key: 'user-1', collection: 'users' }}
          mockItems={[{ id: 'user-1', name: 'Alice' }]}
          showCollectionSelect
          selectedCollection="users"
          template="{{name}}"
          onChange={handleChange}
          onCollectionChange={handleCollectionChange}
        />
      );

      await waitFor(() => expect(mockFetch).toHaveBeenCalledWith('/api/collections'));

      const input = screen.getByTestId('collection-select-input');
      fireEvent.change(input, { target: { value: 'orders' } });
      fireEvent.blur(input);

      expect(handleCollectionChange).toHaveBeenCalledTimes(1);
      expect(handleCollectionChange).toHaveBeenCalledWith('orders');
      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    // The collection list is empty until an async fetch resolves, and the
    // fetch can fail outright. Rejecting a typed name against a list we have
    // not loaded conflates "that is not a collection" with "we do not know
    // yet", and removes the free-text escape hatch exactly when the menu
    // cannot offer one.
    it('still commits a typed collection when the collection list never loaded', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('offline'));

      const handleCollectionChange = jest.fn();

      renderWithProvider(
        <CollectionItemDropdown
          value={null}
          mockItems={[]}
          showCollectionSelect
          selectedCollection="users"
          template="{{name}}"
          onChange={jest.fn()}
          onCollectionChange={handleCollectionChange}
        />
      );

      await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/collections'));

      const input = screen.getByTestId('collection-select-input');
      fireEvent.change(input, { target: { value: 'orders' } });
      fireEvent.blur(input);

      expect(handleCollectionChange).toHaveBeenCalledWith('orders');
      expect((input as HTMLInputElement).value).toBe('orders');
    });

    // V3-7: retyping the CURRENT collection unconditionally cleared the item
    // selection, even though the collection itself never actually changed.
    it('does not clear the item selection when retyping the current collection', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ collection: 'users' }, { collection: 'orders' }] }),
      });
      global.fetch = mockFetch;

      const mockItems = [{ id: 'user-1', name: 'Alice' }];
      const handleChange = jest.fn();
      const handleCollectionChange = jest.fn();

      renderWithProvider(
        <CollectionItemDropdown
          value={{ key: 'user-1', collection: 'users' }}
          mockItems={mockItems}
          showCollectionSelect
          selectedCollection="users"
          template="{{name}}"
          onChange={handleChange}
          onCollectionChange={handleCollectionChange}
        />
      );

      await waitFor(() => expect(mockFetch).toHaveBeenCalledWith('/api/collections'));

      const input = screen.getByTestId('collection-select-input');
      // Backspace the last character and retype it — ends up back at "users".
      fireEvent.change(input, { target: { value: 'user' } });
      fireEvent.change(input, { target: { value: 'users' } });

      // The DESTRUCTIVE half is what must not happen: the item selection
      // survives, because the collection never actually changed.
      expect(handleChange).not.toHaveBeenCalled();
      // The pick is still reported. "Value unchanged" and "user made no
      // choice" are different events, and a parent that has lost its
      // collection relies on this to learn the user re-confirmed one.
      expect(handleCollectionChange).toHaveBeenCalledWith('users');
    });
  });
});
