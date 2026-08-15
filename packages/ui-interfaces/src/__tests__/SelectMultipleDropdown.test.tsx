import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { SelectMultipleDropdown } from '../select-multiple-checkbox/SelectMultipleDropdown';

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

// The allowOther Enter commit is deferred one microtask (so it can observe
// whether Mantine's own — synchronous, but later-in-the-chain — Enter
// handling selected an option), so drain before asserting.
const flush = () => act(async () => {});

const sampleChoices = [
  { text: 'React', value: 'react' },
  { text: 'Angular', value: 'angular' },
  { text: 'Vue', value: 'vue' },
  { text: 'Svelte', value: 'svelte' },
];

describe('SelectMultipleDropdown', () => {
  it('renders with default props', () => {
    render(
      <TestWrapper>
        <SelectMultipleDropdown
          value={[]}
          onChange={() => {}}
          choices={sampleChoices}
        />
      </TestWrapper>
    );
    
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders with custom label', () => {
    render(
      <TestWrapper>
        <SelectMultipleDropdown 
          label="Select frameworks"
          value={[]}
          onChange={() => {}}
          choices={sampleChoices}
        />
      </TestWrapper>
    );
    
    expect(screen.getByText('Select frameworks')).toBeInTheDocument();
  });

  it('handles null values gracefully', () => {
    render(
      <TestWrapper>
        <SelectMultipleDropdown
          value={null}
          onChange={() => {}}
          choices={sampleChoices}
        />
      </TestWrapper>
    );

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  describe('csv-string value normalization', () => {
    it('renders pills for a csv-string value instead of dropping the data', () => {
      render(
        <TestWrapper>
          <SelectMultipleDropdown
            value="react,vue"
            onChange={() => {}}
            choices={sampleChoices}
          />
        </TestWrapper>
      );

      expect(screen.getAllByText('React').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Vue').length).toBeGreaterThan(0);
    });

    it('trims whitespace and drops empty entries from a csv-string value', () => {
      render(
        <TestWrapper>
          <SelectMultipleDropdown
            value=" react ,,angular"
            onChange={() => {}}
            choices={sampleChoices}
          />
        </TestWrapper>
      );

      expect(screen.getAllByText('React').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Angular').length).toBeGreaterThan(0);
    });

    it('renders without crashing when using type="csv" with an array value', () => {
      render(
        <TestWrapper>
          <SelectMultipleDropdown
            type="csv"
            value={[]}
            onChange={() => {}}
            choices={sampleChoices}
          />
        </TestWrapper>
      );

      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });
});

describe('SelectMultipleDropdown stringify-colliding choices', () => {
  it('renders instead of crashing when two choice values stringify identically', () => {
    render(
      <TestWrapper>
        <SelectMultipleDropdown
          choices={[
            { text: 'Number one', value: 1 },
            { text: 'String one', value: '1' },
            { text: 'Two', value: 2 },
          ]}
        />
      </TestWrapper>
    );

    expect(screen.getByText(/Two|Select/)).toBeInTheDocument();
  });

  it('preserves an already-selected dropped-twin\'s exact type when toggling an unrelated item (S6.6)', () => {
    // The current value has '1' (a string) already selected — the dropped
    // twin's own type; only { value: 1 } (number) survives the dedup and
    // is actually rendered. Toggling the unrelated "Two" must not rebuild
    // the whole array through choices.find and silently re-type '1' to 1.
    const onChange = jest.fn();
    render(
      <TestWrapper>
        <SelectMultipleDropdown
          value={['1']}
          choices={[
            { text: 'Number one', value: 1 },
            { text: 'String one', value: '1' },
            { text: 'Two', value: 2 },
          ]}
          onChange={onChange}
        />
      </TestWrapper>
    );

    fireEvent.click(screen.getByRole('textbox'));
    fireEvent.click(screen.getByText('Two'));

    expect(onChange).toHaveBeenCalled();
    const emitted = onChange.mock.calls[0][0] as unknown[];
    expect(emitted).toContain('1');
    expect(emitted).not.toContain(1);
    expect(emitted).toContain(2);
  });
});

describe('SelectMultipleDropdown allowOther (S6.2)', () => {
  it('commits typed free text on Enter as an additional pill', async () => {
    const handleChange = jest.fn();
    render(
      <TestWrapper>
        <SelectMultipleDropdown
          value={['react']}
          onChange={handleChange}
          choices={sampleChoices}
          allowOther
        />
      </TestWrapper>
    );

    const input = screen.getByRole('textbox');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'Ember' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await flush();

    expect(handleChange).toHaveBeenCalledWith(['react', 'Ember']);
  });

  it('displays an already-committed custom value instead of dropping it', () => {
    render(
      <TestWrapper>
        <SelectMultipleDropdown
          value={['react', 'Ember']}
          onChange={() => {}}
          choices={sampleChoices}
          allowOther
        />
      </TestWrapper>
    );

    expect(screen.getAllByText('Ember').length).toBeGreaterThan(0);
  });

  it('does not commit text that exactly matches an existing choice as free text', async () => {
    const handleChange = jest.fn();
    render(
      <TestWrapper>
        <SelectMultipleDropdown
          value={[]}
          onChange={handleChange}
          choices={sampleChoices}
          allowOther
        />
      </TestWrapper>
    );

    const input = screen.getByRole('textbox');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'React' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await flush();

    // 'React' names an existing choice — it resolves to that choice's value
    // rather than committing the raw label as a custom entry.
    expect(handleChange).not.toHaveBeenCalledWith(['React']);
    expect(handleChange).toHaveBeenCalledWith(['react']);
  });

  // V3-6: text naming an existing choice resolves to that choice (matched
  // case-insensitively) and selects it — it must never commit as a
  // near-duplicate custom value, nor vanish silently.
  it('resolves text matching an existing choice case-insensitively to that choice', async () => {
    const handleChange = jest.fn();
    render(
      <TestWrapper>
        <SelectMultipleDropdown
          value={[]}
          onChange={handleChange}
          choices={sampleChoices}
          allowOther
        />
      </TestWrapper>
    );

    const input = screen.getByRole('textbox');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'REACT' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await flush();

    expect(handleChange).not.toHaveBeenCalledWith(['REACT']);
    expect(handleChange).toHaveBeenCalledWith(['react']);
  });

  // Case is user-authored data on a free-text field: a custom value that
  // differs from an existing pill only in case is a distinct entry.
  it('commits a custom value that differs from an existing one only in case', async () => {
    const handleChange = jest.fn();
    render(
      <TestWrapper>
        <SelectMultipleDropdown
          value={['ember']}
          onChange={handleChange}
          choices={sampleChoices}
          allowOther
        />
      </TestWrapper>
    );

    const input = screen.getByRole('textbox');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'Ember' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await flush();

    expect(handleChange).toHaveBeenCalledWith(['ember', 'Ember']);
  });

  // V3-6: commitOtherValue bypassed maxValues — a manually committed custom
  // pill could push the selection past the configured cap. The blocked text
  // must survive so the user can see why nothing happened.
  it('does not commit free text past maxValues, and keeps the typed text', async () => {
    const handleChange = jest.fn();
    render(
      <TestWrapper>
        <SelectMultipleDropdown
          value={['react', 'vue']}
          onChange={handleChange}
          choices={sampleChoices}
          allowOther
          maxValues={2}
        />
      </TestWrapper>
    );

    const input = screen.getByRole('textbox');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'Ember' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await flush();

    expect(handleChange).not.toHaveBeenCalled();
    expect(input).toHaveValue('Ember');
  });

  // V3-6 (real path): Enter on a highlighted dropdown option must emit
  // exactly once, with the resolved option — not also the raw filter text as
  // a junk pill. Mantine's keyboard branches are gated on event.code, so the
  // events must carry it or its Enter handling never runs.
  it('emits only the selected option when Enter submits a highlighted option', async () => {
    const handleChange = jest.fn();
    render(
      <TestWrapper>
        <SelectMultipleDropdown
          value={[]}
          onChange={handleChange}
          choices={sampleChoices}
          allowOther
        />
      </TestWrapper>
    );

    const input = screen.getByRole('textbox');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'Ang' } });
    fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    await flush();

    expect(handleChange.mock.calls).toEqual([[['angular']]]);
  });

  // A consumer or ancestor preventDefaulting Enter (the standard guard
  // against a wrapping form submitting) must not disable the commit wiring.
  it('still commits free text on Enter when the keydown was preventDefaulted', async () => {
    const handleChange = jest.fn();
    render(
      <TestWrapper>
        <SelectMultipleDropdown
          value={[]}
          onChange={handleChange}
          choices={sampleChoices}
          allowOther
        />
      </TestWrapper>
    );

    const input = screen.getByRole('textbox');
    input.addEventListener('keydown', (e) => e.preventDefault(), { capture: true });
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'Ember' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await flush();

    expect(handleChange).toHaveBeenCalledWith(['Ember']);
  });

  // Enter confirming an IME composition is not a commit.
  it('does not commit half-composed text on an IME-composition Enter', async () => {
    const handleChange = jest.fn();
    render(
      <TestWrapper>
        <SelectMultipleDropdown
          value={[]}
          onChange={handleChange}
          choices={sampleChoices}
          allowOther
        />
      </TestWrapper>
    );

    const input = screen.getByRole('textbox');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'にほ' } });
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229, isComposing: true });
    await flush();

    expect(handleChange).not.toHaveBeenCalled();
  });

  // A field disabled mid-edit (the standard "disable while saving" pattern)
  // must not commit its pending text on the resulting blur.
  it('does not commit pending text after the field becomes disabled', async () => {
    const handleChange = jest.fn();
    const { rerender } = render(
      <TestWrapper>
        <SelectMultipleDropdown value={[]} onChange={handleChange} choices={sampleChoices} allowOther />
      </TestWrapper>
    );

    const input = screen.getByRole('textbox');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'Zombie' } });

    rerender(
      <TestWrapper>
        <SelectMultipleDropdown value={[]} onChange={handleChange} choices={sampleChoices} allowOther disabled />
      </TestWrapper>
    );

    fireEvent.blur(input);
    fireEvent.keyDown(input, { key: 'Enter' });
    await flush();

    expect(handleChange).not.toHaveBeenCalled();
  });

  // V3-6: blur right after selecting an option via click must not re-commit
  // leftover search text as an unrelated extra custom pill.
  it('does not commit leftover search text on blur immediately after a real selection', async () => {
    const handleChange = jest.fn();
    render(
      <TestWrapper>
        <SelectMultipleDropdown
          value={[]}
          onChange={handleChange}
          choices={sampleChoices}
          allowOther
        />
      </TestWrapper>
    );

    const input = screen.getByRole('textbox');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'Ang' } });
    fireEvent.click(screen.getByText('Angular'));
    expect(handleChange).toHaveBeenLastCalledWith(['angular']);
    handleChange.mockClear();

    await flush();
    fireEvent.blur(input);
    await flush();

    expect(handleChange).not.toHaveBeenCalled();
  });
});

describe('SelectMultipleDropdown csv storage', () => {
  // Clearing the selection must not erase the csv storage shape: the
  // inference is `typeof value === 'string'`, so emitting null for an empty
  // selection made every subsequent write go out as an array.
  it('keeps emitting comma-strings after the selection is cleared', () => {
    const handleChange = jest.fn();
    function Controlled() {
      const [val, setVal] = React.useState<string | (string | number | boolean)[] | null>(
        'react,angular'
      );
      return (
        <SelectMultipleDropdown
          value={val as never}
          onChange={(v) => {
            setVal(v as never);
            handleChange(v);
          }}
          choices={sampleChoices}
          allowNone
        />
      );
    }
    render(
      <TestWrapper>
        <Controlled />
      </TestWrapper>
    );

    const input = screen.getByRole('textbox');
    fireEvent.click(input);
    fireEvent.click(screen.getByText('Vue'));

    // Every emission stays a comma-string, never an array.
    for (const [emitted] of handleChange.mock.calls) {
      expect(typeof emitted).toBe('string');
    }
  });
});

describe('SelectMultipleDropdown per-choice icon/color (S6.3)', () => {
  it('renders a mapped glyph for a choice icon in the dropdown, not the raw name', () => {
    render(
      <TestWrapper>
        <SelectMultipleDropdown
          value={[]}
          onChange={() => {}}
          choices={[{ text: 'Locked', value: 'locked', icon: 'lock' }]}
        />
      </TestWrapper>
    );

    fireEvent.click(screen.getByRole('textbox'));
    expect(screen.queryByText('lock')).not.toBeInTheDocument();
  });

  it('does not break pill styling when color is a raw hex value', () => {
    render(
      <TestWrapper>
        <SelectMultipleDropdown
          value={['react']}
          onChange={() => {}}
          choices={sampleChoices}
          color="#ff00ff"
        />
      </TestWrapper>
    );

    // Scope to the pill: the dropdown option for the same choice also reads
    // "React" now that the selected-state check is an icon rather than a
    // ' ✓' appended to the label.
    const pill = document.querySelector('.mantine-Pill-root') as HTMLElement;
    expect(pill).toHaveTextContent('React');
    expect(pill.style.color).toBe('rgb(255, 0, 255)');
  });
});
