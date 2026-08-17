import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MantineProvider } from '@mantine/core';
import { SelectMultipleCheckbox, Option } from '../select-multiple-checkbox/SelectMultipleCheckbox';

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MantineProvider>{children}</MantineProvider>
);

const mockChoices: Option[] = [
  { text: 'Option 1', value: 'option1' },
  { text: 'Option 2', value: 'option2' },
  { text: 'Option 3', value: 'option3' },
  { text: 'Very Long Option Name That Exceeds Normal Length', value: 'long_option' },
];

describe('SelectMultipleCheckbox', () => {
  it('renders with default props', () => {
    render(
      <TestWrapper>
        <SelectMultipleCheckbox choices={mockChoices} />
      </TestWrapper>
    );
    
    expect(screen.getByLabelText('Option 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Option 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Option 3')).toBeInTheDocument();
  });

  it('renders with custom label', () => {
    render(
      <TestWrapper>
        <SelectMultipleCheckbox label="Select Options" choices={mockChoices} />
      </TestWrapper>
    );
    
    expect(screen.getByText('Select Options')).toBeInTheDocument();
  });

  it('shows required indicator when required', () => {
    render(
      <TestWrapper>
        <SelectMultipleCheckbox label="Select Options" choices={mockChoices} required />
      </TestWrapper>
    );
    
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('displays error message', () => {
    render(
      <TestWrapper>
        <SelectMultipleCheckbox choices={mockChoices} error="This field is required" />
      </TestWrapper>
    );
    
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('displays selected values', () => {
    render(
      <TestWrapper>
        <SelectMultipleCheckbox choices={mockChoices} value={['option1', 'option3']} />
      </TestWrapper>
    );
    
    expect(screen.getByLabelText('Option 1')).toBeChecked();
    expect(screen.getByLabelText('Option 2')).not.toBeChecked();
    expect(screen.getByLabelText('Option 3')).toBeChecked();
  });

  it('calls onChange when checkbox is selected', async () => {
    const onChange = jest.fn();
    render(
      <TestWrapper>
        <SelectMultipleCheckbox choices={mockChoices} onChange={onChange} />
      </TestWrapper>
    );
    
    fireEvent.click(screen.getByLabelText('Option 1'));
    
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(['option1']);
    });
  });

  it('calls onChange when checkbox is deselected', async () => {
    const onChange = jest.fn();
    render(
      <TestWrapper>
        <SelectMultipleCheckbox choices={mockChoices} value={['option1', 'option2']} onChange={onChange} />
      </TestWrapper>
    );
    
    fireEvent.click(screen.getByLabelText('Option 1'));
    
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(['option2']);
    });
  });

  it('calls onChange with null when all checkboxes are deselected', async () => {
    const onChange = jest.fn();
    render(
      <TestWrapper>
        <SelectMultipleCheckbox choices={mockChoices} value={['option1']} onChange={onChange} />
      </TestWrapper>
    );
    
    fireEvent.click(screen.getByLabelText('Option 1'));
    
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(null);
    });
  });

  it('shows choices validation message when no choices provided', () => {
    render(
      <TestWrapper>
        <SelectMultipleCheckbox choices={[]} label="Test Label" />
      </TestWrapper>
    );
    
    expect(screen.getByText('Choices option configured incorrectly')).toBeInTheDocument();
  });

  it('limits displayed choices when itemsShown is set', () => {
    const manyChoices = Array.from({ length: 10 }, (_, i) => ({
      text: `Option ${i + 1}`,
      value: `option${i + 1}`,
    }));

    render(
      <TestWrapper>
        <SelectMultipleCheckbox choices={manyChoices} itemsShown={5} />
      </TestWrapper>
    );
    
    expect(screen.getByLabelText('Option 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Option 5')).toBeInTheDocument();
    expect(screen.queryByLabelText('Option 6')).not.toBeInTheDocument();
    expect(screen.getByText('Show 5 more options')).toBeInTheDocument();
  });

  it('shows all choices when show more button is clicked', async () => {
    const manyChoices = Array.from({ length: 10 }, (_, i) => ({
      text: `Option ${i + 1}`,
      value: `option${i + 1}`,
    }));

    render(
      <TestWrapper>
        <SelectMultipleCheckbox choices={manyChoices} itemsShown={5} />
      </TestWrapper>
    );
    
    fireEvent.click(screen.getByText('Show 5 more options'));
    
    await waitFor(() => {
      expect(screen.getByLabelText('Option 6')).toBeInTheDocument();
      expect(screen.getByLabelText('Option 10')).toBeInTheDocument();
    });
  });

  it('renders allow other option when enabled', () => {
    render(
      <TestWrapper>
        <SelectMultipleCheckbox choices={mockChoices} allowOther />
      </TestWrapper>
    );
    
    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  it('allows adding custom values when allowOther is enabled', async () => {
    const onChange = jest.fn();
    render(
      <TestWrapper>
        <SelectMultipleCheckbox choices={mockChoices} allowOther onChange={onChange} />
      </TestWrapper>
    );
    
    // Click the "Other" button to add a custom input
    fireEvent.click(screen.getByText('Other'));
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter custom value')).toBeInTheDocument();
    });
  });

  it('shows existing other values that are selected', () => {
    render(
      <TestWrapper>
        <SelectMultipleCheckbox choices={mockChoices} value={['option1', 'custom_value']} allowOther />
      </TestWrapper>
    );

    expect(screen.getByLabelText('custom_value')).toBeInTheDocument();
    expect(screen.getByLabelText('custom_value')).toBeChecked();
  });

  it('does not render a committed custom value twice while its input row is still open (S7.3)', async () => {
    render(
      <TestWrapper>
        <SelectMultipleCheckbox choices={mockChoices} value={['option1', 'custom_value']} allowOther />
      </TestWrapper>
    );

    // Open a new "Other" row and type the SAME value that's already committed
    // in `value` — before the fix this produced both the read-only
    // "Selected custom value: custom_value" checkbox AND this row's own
    // checkbox for the same string.
    fireEvent.click(screen.getByText('Other'));
    const input = await screen.findByPlaceholderText('Enter custom value');
    fireEvent.change(input, { target: { value: 'custom_value' } });

    await waitFor(() => {
      expect(screen.queryByLabelText('Selected custom value: custom_value')).not.toBeInTheDocument();
    });
    // The live row's own checkbox is still present and checked.
    expect(screen.getByLabelText('Custom value checkbox: custom_value')).toBeChecked();
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <TestWrapper>
        <SelectMultipleCheckbox choices={mockChoices} disabled />
      </TestWrapper>
    );
    
    expect(screen.getByLabelText('Option 1')).toBeDisabled();
    expect(screen.getByLabelText('Option 2')).toBeDisabled();
  });

  it('applies custom width', () => {
    const { container } = render(
      <TestWrapper>
        <SelectMultipleCheckbox choices={mockChoices} width="300px" />
      </TestWrapper>
    );
    
    const stackElement = container.querySelector('[style*="width: 300px"]');
    expect(stackElement).toBeInTheDocument();
  });

  it('handles different value types (string, number, boolean)', async () => {
    const mixedChoices: Option[] = [
      { text: 'String Option', value: 'string_value' },
      { text: 'Number Option', value: 42 },
      { text: 'Boolean Option', value: true },
    ];
    
    const onChange = jest.fn();
    render(
      <TestWrapper>
        <SelectMultipleCheckbox choices={mixedChoices} onChange={onChange} />
      </TestWrapper>
    );
    
    fireEvent.click(screen.getByLabelText('Number Option'));
    
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith([42]);
    });
  });

  it('calculates grid columns based on text length', () => {
    const shortChoices: Option[] = [
      { text: 'A', value: 'a' },
      { text: 'B', value: 'b' },
    ];
    
    const { container } = render(
      <TestWrapper>
        <SelectMultipleCheckbox choices={shortChoices} />
      </TestWrapper>
    );
    
    // Should have more columns for short text
    const gridElement = container.querySelector('[class*="mantine-Grid-root"]');
    expect(gridElement).toBeInTheDocument();
  });

  it('adjusts grid for half width', () => {
    const { container } = render(
      <TestWrapper>
        <SelectMultipleCheckbox choices={mockChoices} width="half-width" />
      </TestWrapper>
    );

    const gridElement = container.querySelector('[class*="mantine-Grid-root"]');
    expect(gridElement).toBeInTheDocument();
  });

  describe('csv-string value normalization', () => {
    it('checks the options selected by a csv-string value', () => {
      render(
        <TestWrapper>
          <SelectMultipleCheckbox choices={mockChoices} value="option1,option3" />
        </TestWrapper>
      );

      expect(screen.getByLabelText('Option 1')).toBeChecked();
      expect(screen.getByLabelText('Option 2')).not.toBeChecked();
      expect(screen.getByLabelText('Option 3')).toBeChecked();
    });

    it('trims whitespace and drops empty entries from a csv-string value', () => {
      render(
        <TestWrapper>
          <SelectMultipleCheckbox choices={mockChoices} value=" option1 ,,option2" />
        </TestWrapper>
      );

      expect(screen.getByLabelText('Option 1')).toBeChecked();
      expect(screen.getByLabelText('Option 2')).toBeChecked();
    });

    it('emits a comma-string when toggling a checkbox with a csv-string value', async () => {
      const onChange = jest.fn();
      render(
        <TestWrapper>
          <SelectMultipleCheckbox choices={mockChoices} value="option1,option2" onChange={onChange} />
        </TestWrapper>
      );

      fireEvent.click(screen.getByLabelText('Option 1'));

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith('option2');
      });
    });

    it('emits a comma-string via type="csv" even when the array value is empty', async () => {
      const onChange = jest.fn();
      render(
        <TestWrapper>
          <SelectMultipleCheckbox choices={mockChoices} type="csv" value={[]} onChange={onChange} />
        </TestWrapper>
      );

      fireEvent.click(screen.getByLabelText('Option 1'));

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith('option1');
      });
    });

    it('does not crash and correctly identifies other values with a csv-string value and allowOther', () => {
      render(
        <TestWrapper>
          <SelectMultipleCheckbox choices={mockChoices} value="option1,custom_value" allowOther />
        </TestWrapper>
      );

      expect(screen.getByLabelText('custom_value')).toBeInTheDocument();
      expect(screen.getByLabelText('custom_value')).toBeChecked();
    });
  });
});

describe('SelectMultipleCheckbox stringify-colliding choices', () => {
  it('does not log a duplicate-key warning when two choice values stringify identically', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <TestWrapper>
        <SelectMultipleCheckbox
          choices={[
            { text: 'Number one', value: 1 },
            { text: 'String one', value: '1' },
          ]}
        />
      </TestWrapper>
    );

    const dupKeyWarnings = consoleError.mock.calls.filter((args) =>
      String(args[0]).includes('same key'),
    );
    expect(dupKeyWarnings).toHaveLength(0);
    consoleError.mockRestore();
  });
});

describe('SelectMultipleCheckbox per-option disabled', () => {
  it('disables only the flagged option', () => {
    render(
      <TestWrapper>
        <SelectMultipleCheckbox
          choices={[
            { text: 'Open', value: 'open' },
            { text: 'Locked', value: 'locked', disabled: true },
          ]}
        />
      </TestWrapper>
    );

    expect(screen.getByLabelText('Locked')).toBeDisabled();
    expect(screen.getByLabelText('Open')).not.toBeDisabled();
  });
});

describe('SelectMultipleCheckbox per-choice icon and color (S7.2)', () => {
  it('renders a choice icon as a glyph and still exposes the label text', async () => {
    const { container } = render(
      <TestWrapper>
        <SelectMultipleCheckbox
          choices={[
            { text: 'Locked', value: 'locked', icon: 'lock' },
            { text: 'Open', value: 'open' },
          ]}
        />
      </TestWrapper>
    );

    // Assert the GLYPH, not just the label: the aria-label is derived from
    // item.text and is present with or without icon support, so asserting on
    // it alone passes against a component that renders no icon at all.
    // The icon module is loaded on demand, hence findBy.
    await waitFor(() =>
      expect(container.querySelector('svg.tabler-icon-lock')).not.toBeNull()
    );
    expect(screen.getByLabelText('Select Locked')).toBeInTheDocument();
    expect(screen.getByLabelText('Select Open')).toBeInTheDocument();
    // The raw icon name is never printed as text.
    expect(screen.queryByText('lock')).not.toBeInTheDocument();
  });

  it('renders a color swatch for a choice with color but no icon', () => {
    const { container } = render(
      <TestWrapper>
        <SelectMultipleCheckbox choices={[{ text: 'Red', value: 'red', color: '#ff0000' }]} />
      </TestWrapper>
    );

    const overlay = container.querySelector(
      '.mantine-ColorSwatch-root [class*="colorOverlay"]'
    ) as HTMLElement | null;
    expect(overlay).not.toBeNull();
    // jsdom normalizes hex to rgb().
    expect(overlay!.style.backgroundColor).toBe('rgb(255, 0, 0)');
  });

  // ColorSwatch assigns `color` straight to backgroundColor with no theme
  // resolution, so a palette-normalized `var(--mantine-color-blue-6)` arrives
  // as the bare name `blue` — which is a CSS named colour (#0000FF), a
  // visibly different blue from the Mantine one the adjacent checkbox uses.
  //
  // Asserted in the negative because jsdom refuses to store a var() in
  // backgroundColor at all: the raw value leaves the style empty, while the
  // normalized one leaves a literal `blue`. Seeing `blue` here therefore means
  // the value was normalized on its way to the swatch.
  it('does not palette-normalize the colour it hands the swatch', () => {
    const { container } = render(
      <TestWrapper>
        <SelectMultipleCheckbox
          choices={[{ text: 'Blue', value: 'blue', color: 'var(--mantine-color-blue-6)' }]}
        />
      </TestWrapper>
    );

    const overlay = container.querySelector(
      '.mantine-ColorSwatch-root [class*="colorOverlay"]'
    ) as HTMLElement | null;
    expect(overlay).not.toBeNull();
    expect(overlay!.style.backgroundColor).not.toBe('blue');
  });

  it('applies per-choice color to the Checkbox itself, overriding the group default', () => {
    render(
      <TestWrapper>
        <SelectMultipleCheckbox
          color="blue"
          choices={[{ text: 'Custom', value: 'custom', color: 'red' }]}
        />
      </TestWrapper>
    );

    const checkbox = screen.getByLabelText('Select Custom') as HTMLInputElement;
    // Mantine sets the resolved color as a CSS custom property on the root.
    const root = checkbox.closest('.mantine-Checkbox-root') as HTMLElement;
    expect(root.style.getPropertyValue('--checkbox-color')).toContain('red');
  });

  // A non-6 shade must survive to the DOM as valid CSS. Palette-normalizing it
  // yields `blue-3`, which is neither a Mantine palette reference nor a valid
  // colour, so the checked box computes to transparent.
  it('preserves a non-shade-6 choice colour as valid CSS', () => {
    render(
      <TestWrapper>
        <SelectMultipleCheckbox
          choices={[{ text: 'Shade', value: 'shade', color: 'var(--mantine-color-blue-3)' }]}
        />
      </TestWrapper>
    );

    const root = (screen.getByLabelText('Select Shade') as HTMLInputElement)
      .closest('.mantine-Checkbox-root') as HTMLElement;
    expect(root.style.getPropertyValue('--checkbox-color')).toBe('var(--mantine-color-blue-3)');
  });

  // The fix the changeset leads with is the GROUP-level colour, which was
  // being wiped entirely by wrapperProps.style clobbering Mantine's computed
  // style. Pinned directly so it cannot regress if the per-choice feature
  // above is ever reworked.
  it('applies the group-level color prop to the checkbox root', () => {
    render(
      <TestWrapper>
        <SelectMultipleCheckbox color="grape" choices={[{ text: 'Alpha', value: 'a' }]} />
      </TestWrapper>
    );

    const root = (screen.getByLabelText('Select Alpha') as HTMLInputElement)
      .closest('.mantine-Checkbox-root') as HTMLElement;
    expect(root.style.getPropertyValue('--checkbox-color')).toBe('var(--mantine-color-grape-filled)');
  });
});
