import React from 'react';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
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

// The allowOther Enter commit is deferred one microtask (so it can observe
// whether Mantine's own — synchronous, but later-in-the-handler-chain —
// Enter handling selected an option). Tests must drain microtasks inside
// act before asserting on Enter commits.
const flush = () => act(async () => {});

// jsdom has no scrollIntoView; Mantine's keyboard option navigation calls
// it, and without the stub any ArrowDown/Enter test of Mantine's real
// (code-gated) keyboard path throws instead of selecting.
beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
});

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

  it('commits typed free text on Enter', async () => {
    const onChange = jest.fn();
    renderWithProvider(<SelectDropdown choices={choices} allowOther onChange={onChange} />);

    const input = screen.getByTestId('select-dropdown');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'Custom Value' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await flush();

    expect(onChange).toHaveBeenCalledWith('Custom Value');
  });

  it('displays an already-committed custom value instead of showing blank', () => {
    renderWithProvider(<SelectDropdown choices={choices} allowOther value="my-custom" />);

    expect(screen.getByTestId('select-dropdown')).toHaveValue('my-custom');
  });

  it('resolves text that exactly matches an existing choice to that choice instead of free text', () => {
    const onChange = jest.fn();
    renderWithProvider(<SelectDropdown choices={choices} allowOther onChange={onChange} />);

    const input = screen.getByTestId('select-dropdown');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'Alpha' } });
    fireEvent.blur(input);

    // Never the raw label as free text — the typed value of the choice.
    expect(onChange).not.toHaveBeenCalledWith('Alpha');
    expect(onChange).toHaveBeenCalledWith('alpha');
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

  // V3-2: lastCommittedRef used to only ever be written by commitOtherValue
  // itself, so a value already committed once stayed permanently "sticky"
  // even after the value moved on to something else.
  it('re-commits the same free text after the value has since changed to something else (V3-2)', async () => {
    const onEmit = jest.fn();
    function Controlled() {
      const [val, setVal] = React.useState<string | number | boolean | null>(null);
      return (
        <SelectDropdown
          choices={choices}
          allowOther
          value={val}
          onChange={(v) => {
            setVal(v);
            onEmit(v);
          }}
        />
      );
    }
    renderWithProvider(<Controlled />);

    const input = screen.getByTestId('select-dropdown');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'bar' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await flush();
    expect(onEmit).toHaveBeenLastCalledWith('bar');

    fireEvent.click(input);
    fireEvent.click(screen.getByText('Alpha'));
    expect(onEmit).toHaveBeenLastCalledWith('alpha');
    await flush();

    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'bar' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await flush();
    expect(onEmit).toHaveBeenLastCalledWith('bar');
  });

  // Same sticky-dedupe class for consumers that never echo the value back
  // into the `value` prop (uncontrolled usage, e.g. the AllowCustomValues
  // story): handleChange syncs the dedupe key on selection, so an
  // intervening pick must un-stick an earlier free-text commit.
  it('re-commits the same free text after an intervening selection, without value echo', async () => {
    const onChange = jest.fn();
    renderWithProvider(<SelectDropdown choices={choices} allowOther onChange={onChange} />);

    const input = screen.getByTestId('select-dropdown');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'bar' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await flush();
    expect(onChange).toHaveBeenLastCalledWith('bar');

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(input);
    fireEvent.click(screen.getByText('Alpha'));
    expect(onChange).toHaveBeenLastCalledWith('alpha');
    await flush();

    fireEvent.change(input, { target: { value: 'bar' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await flush();
    expect(onChange.mock.calls.filter(([v]) => v === 'bar')).toHaveLength(2);
  });

  // V3-3: justSelectedRef used to stay `true` until the *next*
  // commitOtherValue call however far in the future that was, so it also
  // swallowed a completely unrelated free-text commit typed sometime later.
  it('commits free text typed immediately after selecting an option, on the first Enter (V3-3)', async () => {
    const onChange = jest.fn();
    renderWithProvider(<SelectDropdown choices={choices} allowOther onChange={onChange} />);

    const input = screen.getByTestId('select-dropdown');
    fireEvent.click(input);
    fireEvent.click(screen.getByText('Alpha'));
    expect(onChange).toHaveBeenLastCalledWith('alpha');
    onChange.mockClear();

    // let the post-select microtask clear justSelectedRef, same as a real
    // browser would before the next physical keystroke arrives
    await flush();

    fireEvent.change(input, { target: { value: 'bar' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await flush();

    expect(onChange).toHaveBeenCalledWith('bar');
  });

  // N3-b, real Mantine path: Enter on a highlighted option must produce
  // exactly ONE emission, with the resolved choice value — not a second,
  // earlier emission of the raw search text. Mantine's keyboard branches
  // are gated on event.code, so the events must carry it (jsdom defaults
  // code to '', which would leave Mantine's Enter handling unreachable and
  // this test vacuous).
  it('emits exactly once with the resolved value when Enter selects a highlighted option (N3-b)', async () => {
    const onChange = jest.fn();
    renderWithProvider(<SelectDropdown choices={choices} allowOther onChange={onChange} />);

    const input = screen.getByTestId('select-dropdown');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'Alp' } });
    fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    await flush();

    expect(onChange.mock.calls).toEqual([['alpha']]);
  });

  // A consumer preventDefaulting Enter (the standard way to stop a wrapping
  // <form> from submitting, since Mantine doesn't preventDefault free-text
  // Enter) must NOT disable the free-text commit — the chained handlers are
  // documented as additive, not replacing the commit wiring.
  it('still commits free text on Enter when a consumer onKeyDown calls preventDefault', async () => {
    const onChange = jest.fn();
    renderWithProvider(
      <SelectDropdown
        choices={choices}
        allowOther
        onChange={onChange}
        selectProps={{
          onKeyDown: (e) => {
            if (e.key === 'Enter') e.preventDefault();
          },
        }}
      />
    );

    const input = screen.getByTestId('select-dropdown');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'Custom Value' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await flush();

    expect(onChange).toHaveBeenCalledWith('Custom Value');
  });

  // Enter that confirms an IME composition (isComposing / Safari keyCode
  // 229) is not a commit — it must not emit the half-composed fragment.
  it('does not commit half-composed text on an IME-composition Enter', async () => {
    const onChange = jest.fn();
    renderWithProvider(<SelectDropdown choices={choices} allowOther onChange={onChange} />);

    const input = screen.getByTestId('select-dropdown');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'にほ' } });
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229, isComposing: true });
    await flush();

    expect(onChange).not.toHaveBeenCalled();
  });

  // Typing a choice's exact label with no highlighted option (typing resets
  // Mantine's highlight) used to be a dead keystroke: Mantine declined the
  // Enter and the choice-match guard silently dropped the manual commit,
  // then blur wiped the text. It must resolve to the choice instead.
  it('resolves a typed exact choice label to that choice on Enter', async () => {
    const onChange = jest.fn();
    renderWithProvider(<SelectDropdown choices={choices} allowOther onChange={onChange} />);

    const input = screen.getByTestId('select-dropdown');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'Beta' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await flush();

    expect(onChange.mock.calls).toEqual([['beta']]);
  });

  // readOnly fields must never emit: Mantine only gates its own keyboard
  // logic on readOnly, not the chained commit wiring, so text left in the
  // box when the field flips to readOnly (save-in-flight, permission
  // change) used to commit on blur/Enter.
  it('does not commit on blur or Enter after the field becomes readOnly', async () => {
    const onChange = jest.fn();
    const { rerender } = renderWithProvider(
      <SelectDropdown choices={choices} allowOther onChange={onChange} />
    );

    const input = screen.getByTestId('select-dropdown');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'dirty text' } });

    rerender(
      <MantineProvider>
        <SelectDropdown choices={choices} allowOther onChange={onChange} readOnly />
      </MantineProvider>
    );

    fireEvent.blur(input);
    fireEvent.keyDown(input, { key: 'Enter' });
    await flush();

    expect(onChange).not.toHaveBeenCalled();
  });

  // Selecting an option must survive a blur that lands BEFORE the parent's
  // value echo (async form stores): the chained onOptionSubmit eagerly
  // syncs the search text to the submitted option's label, so the stale
  // filter fragment can't be committed over the selection.
  it('does not commit the stale filter text on a blur before the value echo lands', async () => {
    const onChange = jest.fn();
    // Parent that never applies the value (worst-case echo lag).
    renderWithProvider(<SelectDropdown choices={choices} allowOther value={null} onChange={onChange} />);

    const input = screen.getByTestId('select-dropdown');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'Alp' } });
    fireEvent.click(screen.getByText('Alpha'));
    await flush();
    fireEvent.blur(input);
    await flush();

    expect(onChange.mock.calls).toEqual([['alpha']]);
  });

  // Re-submitting the currently-selected option emits nothing from Mantine
  // (unchanged value), but must still consume the typed filter text so the
  // next blur doesn't commit the abandoned fragment as a new value.
  it('does not commit leftover filter text after re-selecting the current option', async () => {
    const onEmit = jest.fn();
    function Controlled() {
      const [val, setVal] = React.useState<string | number | boolean | null>('alpha');
      return (
        <SelectDropdown
          choices={choices}
          allowOther
          value={val}
          onChange={(v) => {
            setVal(v);
            onEmit(v);
          }}
        />
      );
    }
    renderWithProvider(<Controlled />);

    const input = screen.getByTestId('select-dropdown');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'Alp' } });
    fireEvent.click(screen.getByText('Alpha'));
    await flush();
    fireEvent.blur(input);
    await flush();

    expect(onEmit).not.toHaveBeenCalled();
    expect(input).toHaveValue('Alpha');
  });

  // Trim asymmetries: the dedupe key and the choice-match guard compare
  // trimmed-to-trimmed, so padded stored values / padded choice labels
  // can't produce spurious commits on unedited focus traversal.
  it('does not emit on focus traversal over a whitespace-padded stored value', async () => {
    const onChange = jest.fn();
    renderWithProvider(
      <SelectDropdown choices={choices} allowOther value={'  bar  '} onChange={onChange} />
    );

    const input = screen.getByTestId('select-dropdown');
    fireEvent.focus(input);
    fireEvent.blur(input);
    await flush();

    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not commit a whitespace-padded choice label over its value after selection', async () => {
    const padded: SelectOption[] = [{ text: 'Alpha ', value: 'alpha' }];
    const onEmit = jest.fn();
    function Controlled() {
      const [val, setVal] = React.useState<string | number | boolean | null>(null);
      return (
        <SelectDropdown
          choices={padded}
          allowOther
          value={val}
          onChange={(v) => {
            setVal(v);
            onEmit(v);
          }}
        />
      );
    }
    renderWithProvider(<Controlled />);

    const input = screen.getByTestId('select-dropdown');
    fireEvent.click(input);
    fireEvent.click(screen.getByText('Alpha'));
    await flush();
    fireEvent.blur(input);
    await flush();

    expect(onEmit.mock.calls).toEqual([['alpha']]);
  });

  // Escape restores the selected choice's LABEL, not the raw stored value —
  // a numeric FK must not be exposed in the input until the next blur.
  it('restores the choice label, not the raw value, on Escape', () => {
    const choicesWithNumericValue: SelectOption[] = [{ text: 'Answer', value: 42 }];
    renderWithProvider(
      <SelectDropdown choices={choicesWithNumericValue} allowOther value={42} onChange={jest.fn()} />
    );

    const input = screen.getByTestId('select-dropdown');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'junk' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(input).toHaveValue('Answer');
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

  it('shows both the icon glyph and the color swatch for an option that has both', async () => {
    renderWithProvider(<SelectDropdown choices={iconAndColorChoices} onChange={jest.fn()} />);

    fireEvent.click(screen.getByTestId('select-dropdown'));
    const option = await screen.findByRole('option', { name: /React/ });

    // Icons render as Tabler glyphs (never the raw Material name — see the
    // Icon rendering (S2.2) suite above); the swatch renders alongside.
    // The dropdown portals outside the render container, so scope to the
    // option row itself.
    expect(screen.queryByText('code')).not.toBeInTheDocument();
    expect(option.querySelector('.tabler-icon-code')).toBeInTheDocument();
    expect(option.querySelector('.mantine-ColorSwatch-root')).toBeInTheDocument();
  });

  it("shows the selected choice's own icon and swatch in the closed input instead of going blank", () => {
    renderWithProvider(
      <SelectDropdown value="react" choices={iconAndColorChoices} onChange={jest.fn()} />
    );

    const wrapper = screen.getByTestId('select-dropdown').closest('.mantine-Input-wrapper') as HTMLElement;
    expect(wrapper.querySelector('.tabler-icon-code')).toBeInTheDocument();
    expect(wrapper.querySelector('.mantine-ColorSwatch-root')).toBeInTheDocument();
  });

  it("shows the selected choice's own icon instead of the global icon prop", () => {
    renderWithProvider(
      <SelectDropdown value="react" icon="home" choices={iconAndColorChoices} onChange={jest.fn()} />
    );

    // The input's immediate wrapper only contains leftSection + input +
    // chevron (no hidden option markup), so scoping there is reliable.
    const wrapper = screen.getByTestId('select-dropdown').closest('.mantine-Input-wrapper') as HTMLElement;
    expect(wrapper.querySelector('.tabler-icon-code')).toBeInTheDocument();
    expect(wrapper.querySelector('.tabler-icon-home')).not.toBeInTheDocument();
  });
});
