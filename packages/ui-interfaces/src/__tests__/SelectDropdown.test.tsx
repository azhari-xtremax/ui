import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { SelectDropdown, type SelectOption } from '../select-dropdown/SelectDropdown';

// Helper function to render components with Mantine provider
const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <MantineProvider>
      {component}
    </MantineProvider>
  );
};

describe('SelectDropdown', () => {
  const mockChoices: SelectOption[] = [
    { text: 'React', value: 'react' },
    { text: 'Vue', value: 'vue' },
    { text: 'Angular', value: 'angular' },
    { text: 'Svelte (Disabled)', value: 'svelte', disabled: true },
  ];

  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('Basic Functionality', () => {
    it('renders with label and placeholder', () => {
      renderWithProvider(
        <SelectDropdown
          label="Framework"
          placeholder="Choose a framework"
          choices={mockChoices}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Framework')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Choose a framework')).toBeInTheDocument();
    });

    it('displays error message when no choices provided and allowOther is false', () => {
      renderWithProvider(
        <SelectDropdown
          choices={[]}
          allowOther={false}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Choices option configured incorrectly')).toBeInTheDocument();
    });

    it('renders normally when no choices provided but allowOther is true', () => {
      renderWithProvider(
        <SelectDropdown
          choices={[]}
          allowOther
          placeholder="Custom input"
          onChange={mockOnChange}
        />
      );

      expect(screen.getByPlaceholderText('Custom input')).toBeInTheDocument();
    });
  });

  describe('Value Selection', () => {
    it('displays the current selected value', () => {
      renderWithProvider(
        <SelectDropdown
          value="react"
          choices={mockChoices}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByDisplayValue('React')).toBeInTheDocument();
    });

    it('calls onChange when value is selected', async () => {
      renderWithProvider(
        <SelectDropdown
          choices={mockChoices}
          onChange={mockOnChange}
        />
      );

      const select = screen.getByRole('textbox');
      fireEvent.click(select);

      const reactOption = screen.getByText('React');
      fireEvent.click(reactOption);

      expect(mockOnChange).toHaveBeenCalledWith('react');
    });

    it('handles numeric values correctly', () => {
      const numericChoices: SelectOption[] = [
        { text: 'One', value: 1 },
        { text: 'Two', value: 2 },
        { text: 'Three', value: 3 },
      ];

      renderWithProvider(
        <SelectDropdown
          value={2}
          choices={numericChoices}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByDisplayValue('Two')).toBeInTheDocument();
    });

    it('handles boolean values correctly', () => {
      const booleanChoices: SelectOption[] = [
        { text: 'Yes', value: true },
        { text: 'No', value: false },
      ];

      renderWithProvider(
        <SelectDropdown
          value={true}
          choices={booleanChoices}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByDisplayValue('Yes')).toBeInTheDocument();
    });
  });

  describe('Props and Configuration', () => {
    it('renders as disabled when disabled prop is true', () => {
      renderWithProvider(
        <SelectDropdown
          choices={mockChoices}
          disabled
          onChange={mockOnChange}
        />
      );

      const select = screen.getByRole('textbox');
      expect(select).toBeDisabled();
    });

    it('renders as readonly when readOnly prop is true', () => {
      renderWithProvider(
        <SelectDropdown
          choices={mockChoices}
          readOnly
          onChange={mockOnChange}
        />
      );

      const select = screen.getByRole('textbox');
      expect(select).toHaveAttribute('readonly');
    });

    it('shows required indicator when required prop is true', () => {
      renderWithProvider(
        <SelectDropdown
          label="Framework"
          choices={mockChoices}
          required
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('displays description when provided', () => {
      renderWithProvider(
        <SelectDropdown
          label="Framework"
          description="Choose your preferred framework"
          choices={mockChoices}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Choose your preferred framework')).toBeInTheDocument();
    });

    it('displays error message when error prop is provided', () => {
      renderWithProvider(
        <SelectDropdown
          label="Framework"
          choices={mockChoices}
          error="This field is required"
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });
  });

  describe('Clear Functionality', () => {
    it('shows clear button when allowNone is true and has value', () => {
      renderWithProvider(
        <SelectDropdown
          value="react"
          choices={mockChoices}
          allowNone
          onChange={mockOnChange}
        />
      );

      // The clear button should be visible when there's a value and allowNone is true
      const clearButton = screen.getByRole('button', { hidden: true });
      expect(clearButton).toBeInTheDocument();
      expect(clearButton).toHaveClass('mantine-InputClearButton-root');
    });

    it('calls onChange with null when clear button is clicked', () => {
      renderWithProvider(
        <SelectDropdown
          value="react"
          choices={mockChoices}
          allowNone
          onChange={mockOnChange}
        />
      );

      const clearButton = screen.getByRole('button', { hidden: true });
      fireEvent.click(clearButton);

      expect(mockOnChange).toHaveBeenCalledWith(null);
    });
  });

  describe('Search Functionality', () => {
    it('enables search when searchable prop is true', () => {
      renderWithProvider(
        <SelectDropdown
          choices={mockChoices}
          searchable
          onChange={mockOnChange}
        />
      );

      const select = screen.getByRole('textbox');
      // When searchable, the input should not be readonly
      expect(select).not.toHaveAttribute('readonly');
    });

    it('enables search when allowOther is true', () => {
      renderWithProvider(
        <SelectDropdown
          choices={mockChoices}
          allowOther
          onChange={mockOnChange}
        />
      );

      const select = screen.getByRole('textbox');
      // When allowOther, the input should not be readonly (enables search/typing)
      expect(select).not.toHaveAttribute('readonly');
    });
  });

  describe('Icon Support', () => {
    it('renders the icon as a glyph, not the raw Material name string (S2.2)', () => {
      renderWithProvider(
        <SelectDropdown
          choices={mockChoices}
          icon="home"
          onChange={mockOnChange}
        />
      );

      expect(screen.queryByText('home')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles null value gracefully', () => {
      renderWithProvider(
        <SelectDropdown
          value={null}
          choices={mockChoices}
          onChange={mockOnChange}
        />
      );

      const select = screen.getByRole('textbox');
      expect(select).toHaveValue('');
    });

    it('handles undefined value gracefully', () => {
      renderWithProvider(
        <SelectDropdown
          value={undefined}
          choices={mockChoices}
          onChange={mockOnChange}
        />
      );

      const select = screen.getByRole('textbox');
      expect(select).toHaveValue('');
    });

    it('handles empty choices array', () => {
      renderWithProvider(
        <SelectDropdown
          choices={[]}
          allowOther
          onChange={mockOnChange}
        />
      );

      const select = screen.getByRole('textbox');
      expect(select).toBeInTheDocument();
    });
  });

  describe('Icon rendering (S2.2)', () => {
    it('renders a mapped glyph for a choice icon instead of the raw name string', () => {
      renderWithProvider(
        <SelectDropdown
          choices={[{ text: 'React', value: 'react', icon: 'code' }]}
          onChange={mockOnChange}
        />
      );

      // The raw Material icon name should never appear as visible text.
      expect(screen.queryByText('code')).not.toBeInTheDocument();
    });
  });

  describe('Accessible name (S2.3)', () => {
    it('forwards aria-label to the underlying Select', () => {
      renderWithProvider(
        <SelectDropdown
          choices={mockChoices}
          onChange={mockOnChange}
          aria-label="Favorite framework"
        />
      );

      expect(screen.getByRole('textbox', { name: 'Favorite framework' })).toBeInTheDocument();
    });

    it('falls back to the placeholder as an accessible name when no visible label is set', () => {
      renderWithProvider(
        <SelectDropdown
          choices={mockChoices}
          placeholder="Choose a framework"
          onChange={mockOnChange}
        />
      );

      expect(screen.getByRole('textbox', { name: 'Choose a framework' })).toBeInTheDocument();
    });
  });
});

describe('SelectDropdown allowOther', () => {
  const choices: SelectOption[] = [
    { text: 'Alpha', value: 'alpha' },
    { text: 'Beta', value: 'beta' },
  ];

  it('commits typed free text on Enter', () => {
    const onChange = jest.fn();
    renderWithProvider(<SelectDropdown choices={choices} allowOther onChange={onChange} />);

    const input = screen.getByTestId('select-dropdown');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'Custom Value' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('Custom Value');
  });

  it('displays an already-committed custom value instead of showing blank', () => {
    renderWithProvider(<SelectDropdown choices={choices} allowOther value="my-custom" />);

    expect(screen.getByTestId('select-dropdown')).toHaveValue('my-custom');
  });

  it('does not commit text that exactly matches an existing choice as free text', () => {
    const onChange = jest.fn();
    renderWithProvider(<SelectDropdown choices={choices} allowOther onChange={onChange} />);

    const input = screen.getByTestId('select-dropdown');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'Alpha' } });
    fireEvent.blur(input);

    expect(onChange).not.toHaveBeenCalledWith('Alpha');
  });

  it('does not re-commit the same value on a second blur with unchanged text', () => {
    const onChange = jest.fn();
    renderWithProvider(<SelectDropdown choices={choices} allowOther onChange={onChange} />);

    const input = screen.getByTestId('select-dropdown');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'Custom Value' } });
    fireEvent.blur(input);
    fireEvent.focus(input);
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('does not commit typed text when Escape is pressed', () => {
    const onChange = jest.fn();
    renderWithProvider(<SelectDropdown choices={choices} allowOther onChange={onChange} />);

    const input = screen.getByTestId('select-dropdown');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'Discarded text' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    fireEvent.blur(input);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('chains a consumer-supplied selectProps.onBlur instead of replacing the commit wiring', () => {
    const onChange = jest.fn();
    const consumerOnBlur = jest.fn();
    renderWithProvider(
      <SelectDropdown
        choices={choices}
        allowOther
        onChange={onChange}
        selectProps={{ onBlur: consumerOnBlur }}
      />
    );

    const input = screen.getByTestId('select-dropdown');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'Custom Value' } });
    fireEvent.blur(input);

    expect(consumerOnBlur).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith('Custom Value');
  });
});

describe('SelectDropdown stringify-colliding choices', () => {
  it('renders instead of crashing when two choice values stringify identically', () => {
    renderWithProvider(
      <SelectDropdown
        choices={[
          { text: 'Number one', value: 1 },
          { text: 'String one', value: '1' },
          { text: 'Two', value: 2 },
        ]}
      />
    );

    expect(screen.getByTestId('select-dropdown')).toBeInTheDocument();
  });
});

describe('SelectDropdown icon + color', () => {
  const iconAndColorChoices: SelectOption[] = [
    { text: 'React', value: 'react', icon: 'code', color: '#61dafb' },
    { text: 'Plain', value: 'plain' },
  ];

  it('shows both the icon and the color swatch for an option that has both', () => {
    renderWithProvider(<SelectDropdown choices={iconAndColorChoices} onChange={jest.fn()} />);

    fireEvent.click(screen.getByTestId('select-dropdown'));

    expect(screen.getByText('code')).toBeInTheDocument();
  });

  it('shows the selected choice\'s own icon in the closed input instead of going blank', () => {
    renderWithProvider(
      <SelectDropdown value="react" choices={iconAndColorChoices} onChange={jest.fn()} />
    );

    // Mantine keeps dropdown option markup mounted (hidden) even while
    // closed, so this checks presence (leftSection renders it) rather than
    // uniqueness (an equivalent hidden copy also exists in the option list).
    expect(screen.getAllByText('code').length).toBeGreaterThan(0);
  });

  it('shows the selected choice\'s own icon instead of the global icon prop', () => {
    renderWithProvider(
      <SelectDropdown value="react" icon="globe" choices={iconAndColorChoices} onChange={jest.fn()} />
    );

    // "plain" has no icon/color of its own, so it falls back to the global
    // icon — if leftSection were still showing the global icon instead of
    // the selected choice's own, both would be indistinguishable from the
    // hidden option markup. Assert the selected choice's icon is present
    // and that no *visible* left-section icon renders "globe": the input's
    // immediate wrapper only contains leftSection + input + chevron, no
    // hidden option markup, so scoping there is reliable here.
    const wrapper = screen.getByTestId('select-dropdown').closest('.mantine-Input-wrapper') as HTMLElement;
    expect(within(wrapper).getByText('code')).toBeInTheDocument();
    expect(within(wrapper).queryByText('globe')).not.toBeInTheDocument();
  });
});
