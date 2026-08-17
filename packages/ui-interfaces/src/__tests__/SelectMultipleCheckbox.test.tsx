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

  // V3-7: the S7.3 exclusion matched a row against a stored value by
  // stringified digits (`rowValues.has(String(v))`), not by actual value
  // identity. A stored NUMBER 5 was hidden entirely whenever an unrelated
  // new row's in-progress (unchecked) text happened to be the STRING "5" —
  // neither the row itself (checked via strict equality, so "5" !== 5 never
  // matched) nor the read-only fallback (wrongly excluded) rendered it.
  it('does not hide a stored numeric custom value when an unrelated row is mid-typing the same digits', async () => {
    render(
      <TestWrapper>
        <SelectMultipleCheckbox choices={mockChoices} value={[5]} allowOther />
      </TestWrapper>
    );

    expect(screen.getByLabelText('Selected custom value: 5')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Other'));
    const input = await screen.findByPlaceholderText('Enter custom value');
    fireEvent.change(input, { target: { value: '5' } });

    // The stored number 5 must still render — the new row is a different,
    // unchecked, string-typed entry, not the thing backing it.
    expect(screen.getByLabelText('Selected custom value: 5')).toBeInTheDocument();
  });

  // The other half of the same predicate: once the row IS checked, it is the
  // thing backing that entry and the read-only copy must disappear. Comparing
  // by strict equality alone cannot see this — a row's typed text is always a
  // string, so it can never strictly equal a stored NUMBER, and the value
  // would render twice (once read-only, once as the row).
  it('hides the read-only copy once a row backing the same value is checked', async () => {
    const Host = () => {
      const [value, setValue] = React.useState<(string | number | boolean)[]>([5]);
      return (
        <SelectMultipleCheckbox
          choices={mockChoices}
          value={value}
          onChange={(v) => setValue(v as (string | number | boolean)[])}
          allowOther
        />
      );
    };

    render(
      <TestWrapper>
        <Host />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Other'));
    const input = await screen.findByPlaceholderText('Enter custom value');
    fireEvent.change(input, { target: { value: '5' } });

    // Check the row — it now owns the "5" entry.
    fireEvent.click(screen.getByLabelText('Custom value checkbox: 5'));

    expect(screen.queryByLabelText('Selected custom value: 5')).not.toBeInTheDocument();
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
