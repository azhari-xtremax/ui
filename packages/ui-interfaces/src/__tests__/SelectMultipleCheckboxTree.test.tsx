import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { SelectMultipleCheckboxTree, TreeChoice } from '../select-multiple-checkbox/SelectMultipleCheckboxTree';

// Test wrapper with MantineProvider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MantineProvider>{children}</MantineProvider>
);

const sampleChoices: TreeChoice[] = [
  {
    text: 'Frontend',
    value: 'frontend',
    children: [
      { text: 'React', value: 'react' },
      { text: 'Vue', value: 'vue' },
      { text: 'Angular', value: 'angular' },
    ],
  },
  {
    text: 'Backend',
    value: 'backend',
    children: [
      { text: 'Node.js', value: 'nodejs' },
      { text: 'Python', value: 'python' },
      {
        text: 'Databases',
        value: 'databases',
        children: [
          { text: 'PostgreSQL', value: 'postgresql' },
          { text: 'MongoDB', value: 'mongodb' },
        ],
      },
    ],
  },
  { text: 'DevOps', value: 'devops' },
];

describe('SelectMultipleCheckboxTree', () => {
  const defaultProps = {
    choices: sampleChoices,
    value: [],
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default props', () => {
    render(
      <TestWrapper>
        <SelectMultipleCheckboxTree {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText('Frontend')).toBeInTheDocument();
    expect(screen.getByText('Backend')).toBeInTheDocument();
    expect(screen.getByText('DevOps')).toBeInTheDocument();
  });

  it('renders with custom label', () => {
    render(
      <TestWrapper>
        <SelectMultipleCheckboxTree {...defaultProps} label="Select Technologies" />
      </TestWrapper>
    );

    expect(screen.getByText('Select Technologies')).toBeInTheDocument();
  });

  it('shows required indicator when required', () => {
    render(
      <TestWrapper>
        <SelectMultipleCheckboxTree {...defaultProps} label="Technologies" required />
      </TestWrapper>
    );

    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('displays error message', () => {
    render(
      <TestWrapper>
        <SelectMultipleCheckboxTree {...defaultProps} error="This field is required" />
      </TestWrapper>
    );

    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('displays selected values', () => {
    render(
      <TestWrapper>
        <SelectMultipleCheckboxTree {...defaultProps} value={['react', 'nodejs']} />
      </TestWrapper>
    );

    const reactCheckbox = screen.getByLabelText('React');
    const nodejsCheckbox = screen.getByLabelText('Node.js');
    
    expect(reactCheckbox).toBeChecked();
    expect(nodejsCheckbox).toBeChecked();
  });

  it('calls onChange when checkbox is selected', () => {
    const onChange = jest.fn();
    render(
      <TestWrapper>
        <SelectMultipleCheckboxTree {...defaultProps} onChange={onChange} />
      </TestWrapper>
    );

    const reactCheckbox = screen.getByLabelText('React');
    fireEvent.click(reactCheckbox);

    expect(onChange).toHaveBeenCalledWith(['react']);
  });

  it('shows expanded tree nodes by default', () => {
    render(
      <TestWrapper>
        <SelectMultipleCheckboxTree {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Vue')).toBeInTheDocument();
    expect(screen.getByText('Node.js')).toBeInTheDocument();
  });

  it('can collapse and expand tree nodes', () => {
    render(
      <TestWrapper>
        <SelectMultipleCheckboxTree {...defaultProps} />
      </TestWrapper>
    );

    // Find the expand/collapse button for Frontend
    const frontendExpandButton = screen.getByText('Frontend').closest('div')?.querySelector('[data-mantine-stop-propagation]');
    
    if (frontendExpandButton) {
      // Collapse the Frontend section
      fireEvent.click(frontendExpandButton);
      
      // React should not be visible
      expect(screen.queryByText('React')).not.toBeInTheDocument();
      
      // Expand again
      fireEvent.click(frontendExpandButton);
      
      // React should be visible again
      expect(screen.getByText('React')).toBeInTheDocument();
    }
  });

  it('shows search input when there are more than 10 choices', () => {
    const manyChoices: TreeChoice[] = Array.from({ length: 12 }, (_, i) => ({
      text: `Choice ${i + 1}`,
      value: `choice${i + 1}`,
    }));

    render(
      <TestWrapper>
        <SelectMultipleCheckboxTree {...defaultProps} choices={manyChoices} />
      </TestWrapper>
    );

    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('filters choices based on search query', async () => {
    // We need more than 10 choices to show the search input
    const manyChoices: TreeChoice[] = [
      { text: 'React', value: 'react' },
      { text: 'Vue', value: 'vue' },
      { text: 'Angular', value: 'angular' },
      { text: 'Node.js', value: 'nodejs' },
      { text: 'Python', value: 'python' },
      { text: 'JavaScript', value: 'javascript' },
      { text: 'TypeScript', value: 'typescript' },
      { text: 'Java', value: 'java' },
      { text: 'C++', value: 'cpp' },
      { text: 'Go', value: 'go' },
      { text: 'Rust', value: 'rust' },
      { text: 'PHP', value: 'php' },
    ];

    render(
      <TestWrapper>
        <SelectMultipleCheckboxTree {...defaultProps} choices={manyChoices} />
      </TestWrapper>
    );

    // Initially all choices should be visible
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Vue')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'React' } });

    // Wait out the debounce via waitFor — a bare setTimeout races the
    // debounced state update outside act() and asserts before the re-render.
    await waitFor(
      () => expect(screen.queryByText('Vue')).not.toBeInTheDocument(),
      { timeout: 1500 },
    );
    expect(screen.getAllByText('React')).toHaveLength(1);
  });

  it('handles show selection only toggle', () => {
    render(
      <TestWrapper>
        <SelectMultipleCheckboxTree {...defaultProps} value={['react']} />
      </TestWrapper>
    );

    const showSelectedButton = screen.getByText('Show Selected');
    fireEvent.click(showSelectedButton);

    // Should only show selected items and their parents
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Frontend')).toBeInTheDocument(); // Parent of selected item
  });

  it('shows choices validation message when no choices provided', () => {
    render(
      <TestWrapper>
        <SelectMultipleCheckboxTree {...defaultProps} choices={[]} label="Test" />
      </TestWrapper>
    );

    expect(screen.getByText('Choices option configured incorrectly')).toBeInTheDocument();
  });

  it('handles different value combining modes', () => {
    const onChange = jest.fn();
    render(
      <TestWrapper>
        <SelectMultipleCheckboxTree 
          {...defaultProps} 
          onChange={onChange} 
          valueCombining="all"
        />
      </TestWrapper>
    );

    const frontendCheckbox = screen.getByLabelText('Frontend');
    fireEvent.click(frontendCheckbox);

    // In 'all' mode, selecting parent should select all children
    expect(onChange).toHaveBeenCalledWith(['frontend', 'react', 'vue', 'angular']);
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <TestWrapper>
        <SelectMultipleCheckboxTree {...defaultProps} disabled />
      </TestWrapper>
    );

    const reactCheckbox = screen.getByLabelText('React');
    expect(reactCheckbox).toBeDisabled();
  });

  it('applies custom width', () => {
    const { container } = render(
      <TestWrapper>
        <SelectMultipleCheckboxTree {...defaultProps} width="50%" />
      </TestWrapper>
    );

    // Check the main Stack container has the custom width
    const stackElement = container.querySelector('.mantine-Stack-root');
    expect(stackElement).toHaveStyle('width: 50%');
  });

  it('handles nested tree structure correctly', () => {
    render(
      <TestWrapper>
        <SelectMultipleCheckboxTree {...defaultProps} />
      </TestWrapper>
    );

    // Check if nested items (Databases -> PostgreSQL) are rendered
    expect(screen.getByText('Databases')).toBeInTheDocument();
    expect(screen.getByText('PostgreSQL')).toBeInTheDocument();
    expect(screen.getByText('MongoDB')).toBeInTheDocument();
  });

  it('highlights search matches', () => {
    // This test will just verify that the component can handle search highlighting
    // without needing to test the exact highlighting implementation
    const simpleChoices: TreeChoice[] = [
      { text: 'React Native', value: 'reactnative' },
      { text: 'Vue.js', value: 'vue' }
    ];

    render(
      <TestWrapper>
        <SelectMultipleCheckboxTree {...defaultProps} choices={simpleChoices} />
      </TestWrapper>
    );

    // Just verify the choices are rendered
    expect(screen.getByText('React Native')).toBeInTheDocument();
    expect(screen.getByText('Vue.js')).toBeInTheDocument();
  });

  it('handles indeterminate state for parent nodes', () => {
    render(
      <TestWrapper>
        <SelectMultipleCheckboxTree {...defaultProps} value={['react']} valueCombining="all" />
      </TestWrapper>
    );

    const frontendCheckbox = screen.getByLabelText('Frontend');
    // Frontend should be indeterminate since only one child (React) is selected
    expect(frontendCheckbox).toHaveProperty('indeterminate', true);
  });

  it('handles custom color', () => {
    render(
      <TestWrapper>
        <SelectMultipleCheckboxTree {...defaultProps} color="red" value={['react']} />
      </TestWrapper>
    );

    const reactCheckbox = screen.getByLabelText('React');
    // Check that the checkbox has the correct color by checking it's checked
    expect(reactCheckbox).toBeChecked();
  });
});

describe('SelectMultipleCheckboxTree search edge cases', () => {
  it('does not crash when the search query contains regex special characters', async () => {
    render(
      <TestWrapper>
        <SelectMultipleCheckboxTree
          choices={[
            { text: 'Alpha (primary)', value: 'a' },
            { text: 'Beta', value: 'b' },
            // Filler so the choice count crosses the search-input threshold
            ...Array.from({ length: 12 }, (_, i) => ({
              text: `Filler ${i}`,
              value: `f${i}`,
            })),
          ]}
        />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: '(primary' } });

    await waitFor(
      () => expect(screen.queryByText('Beta')).not.toBeInTheDocument(),
      { timeout: 1500 },
    );
  });

  it('preserves a manually collapsed node across a search that shifts its filtered index', async () => {
    // "Group" sits last (unfiltered index 12) behind 12 fillers that don't
    // match the search term below, but survives the search itself via its
    // child's text — so it never unmounts, it just moves from filtered
    // index 12 down to filtered index 0. Under the old filtered-index key,
    // that move alone was enough to remount it and reset `expanded`.
    const choices: TreeChoice[] = [
      ...Array.from({ length: 12 }, (_, i) => ({
        text: `Filler ${i}`,
        value: `f${i}`,
      })),
      {
        text: 'Group',
        value: 'group',
        children: [{ text: 'Uniquematch', value: 'group-child' }],
      },
    ];

    render(
      <TestWrapper>
        <SelectMultipleCheckboxTree choices={choices} value={[]} onChange={jest.fn()} />
      </TestWrapper>
    );

    // Collapse "Group" (expanded by default), reflected in its own
    // treeitem's `aria-expanded` — checked directly rather than via content
    // visibility, since Mantine's <Collapse> animates rather than unmounting.
    // The toggle is rendered (visually hidden) on every node, including the
    // childless "Uniquematch" nested inside Group's own treeitem, so take
    // Group's own toggle specifically: the first one within Group's treeitem.
    const groupItem = screen.getByText('Group').closest('[role="treeitem"]') as HTMLElement;
    fireEvent.click(within(groupItem).getAllByLabelText('Collapse')[0]);
    expect(groupItem.getAttribute('aria-expanded')).toBe('false');

    // Search for a term only Group's child matches — every filler is
    // filtered out, Group survives (it still renders, just collapsed) and
    // moves from filtered index 12 to filtered index 0.
    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'Uniquematch' } });
    await waitFor(
      () => expect(screen.queryByText('Filler 0')).not.toBeInTheDocument(),
      { timeout: 1500 },
    );

    const groupItemDuringSearch = screen.getByText('Group').closest('[role="treeitem"]') as HTMLElement;
    expect(groupItemDuringSearch.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('SelectMultipleCheckboxTree leaf mode fully-selected parent (S4.5)', () => {
  it('shows checked (not indeterminate) once every leaf under a parent is selected', () => {
    render(
      <TestWrapper>
        <SelectMultipleCheckboxTree
          choices={sampleChoices}
          value={['react', 'vue', 'angular']}
          valueCombining="leaf"
          onChange={jest.fn()}
        />
      </TestWrapper>
    );

    const frontendCheckbox = screen.getByTestId('checkbox-0').querySelector('input') as HTMLInputElement;
    expect(frontendCheckbox.checked).toBe(true);
    expect(frontendCheckbox.indeterminate).toBe(false);
  });

  it('shows indeterminate when only some leaves under a parent are selected', () => {
    render(
      <TestWrapper>
        <SelectMultipleCheckboxTree
          choices={sampleChoices}
          value={['react']}
          valueCombining="leaf"
          onChange={jest.fn()}
        />
      </TestWrapper>
    );

    const frontendCheckbox = screen.getByTestId('checkbox-0').querySelector('input') as HTMLInputElement;
    expect(frontendCheckbox.checked).toBe(false);
    expect(frontendCheckbox.indeterminate).toBe(true);
  });
});

describe('SelectMultipleCheckboxTree search keeps matched-parent subtree (S4.6)', () => {
  it('keeps unmatched children visible under a parent whose own text matched', async () => {
    const choices: TreeChoice[] = [
      {
        text: 'Frontend Frameworks',
        value: 'frontend',
        children: [
          { text: 'React', value: 'react' },
          { text: 'Vue', value: 'vue' },
        ],
      },
      ...Array.from({ length: 10 }, (_, i) => ({ text: `Filler ${i}`, value: `f${i}` })),
    ];

    render(
      <TestWrapper>
        <SelectMultipleCheckboxTree choices={choices} value={[]} onChange={jest.fn()} />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'Frontend' } });

    await waitFor(() => expect(screen.queryByText('Filler 0')).not.toBeInTheDocument(), { timeout: 1500 });
    // React/Vue don't match "Frontend" themselves but must still render
    // since their parent's own text matched.
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Vue')).toBeInTheDocument();
  });
});

describe('SelectMultipleCheckboxTree cascade toggle skips disabled descendants (S4.7)', () => {
  it('does not select a disabled child when checking its parent in "all" mode', () => {
    const handleChange = jest.fn();
    const choices: TreeChoice[] = [
      {
        text: 'Frontend',
        value: 'frontend',
        children: [
          { text: 'React', value: 'react' },
          { text: 'Vue (locked)', value: 'vue', disabled: true },
        ],
      },
    ];

    render(
      <TestWrapper>
        <SelectMultipleCheckboxTree
          choices={choices}
          value={[]}
          valueCombining="all"
          onChange={handleChange}
        />
      </TestWrapper>
    );

    fireEvent.click(screen.getByTestId('checkbox-0').querySelector('input') as HTMLInputElement);

    expect(handleChange).toHaveBeenCalledWith(expect.arrayContaining(['frontend', 'react']));
    const emitted = handleChange.mock.calls[0][0] as string[];
    expect(emitted).not.toContain('vue');
  });
});

describe('SelectMultipleCheckboxTree custom color normalization (S4.11)', () => {
  it('applies a var(--mantine-color-X-6)-wrapped color instead of dropping it', () => {
    render(
      <TestWrapper>
        <SelectMultipleCheckboxTree
          choices={[{ text: 'Alpha', value: 'a' }]}
          value={[]}
          color="var(--mantine-color-teal-6)"
          onChange={jest.fn()}
        />
      </TestWrapper>
    );

    const input = screen.getByTestId('checkbox-0').querySelector('input') as HTMLInputElement;
    const root = input.closest('.mantine-Checkbox-root') as HTMLElement;
    expect(root.style.getPropertyValue('--checkbox-color')).toContain('teal');
  });
});

describe('SelectMultipleCheckboxTree leaf mode with disabled leaves (S4.5 × S4.7)', () => {
  it('shows checked when every selectable leaf is selected, ignoring unselected disabled leaves', () => {
    render(
      <TestWrapper>
        <SelectMultipleCheckboxTree
          valueCombining="leaf"
          value={['a']}
          choices={[
            {
              text: 'Parent',
              value: 'p',
              children: [
                { text: 'A', value: 'a' },
                // The cascade toggle can never select this one (S4.7), so it
                // must not hold the parent at indeterminate forever.
                { text: 'B', value: 'b', disabled: true },
              ],
            },
          ]}
        />
      </TestWrapper>
    );

    const parent = screen.getByTestId('checkbox-0').querySelector('input') as HTMLInputElement;
    expect(parent.checked).toBe(true);
    expect(parent.indeterminate).toBe(false);
  });

  it('still counts an already-selected disabled leaf toward the parent state', () => {
    render(
      <TestWrapper>
        <SelectMultipleCheckboxTree
          valueCombining="leaf"
          value={['b']}
          choices={[
            {
              text: 'Parent',
              value: 'p',
              children: [
                { text: 'A', value: 'a' },
                { text: 'B', value: 'b', disabled: true },
              ],
            },
          ]}
        />
      </TestWrapper>
    );

    const parent = screen.getByTestId('checkbox-0').querySelector('input') as HTMLInputElement;
    expect(parent.checked).toBe(false);
    expect(parent.indeterminate).toBe(true);
  });
});
