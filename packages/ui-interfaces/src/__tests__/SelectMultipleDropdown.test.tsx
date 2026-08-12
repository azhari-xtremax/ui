import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { SelectMultipleDropdown } from '../select-multiple-checkbox/SelectMultipleDropdown';

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

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
  it('commits typed free text on Enter as an additional pill', () => {
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

  it('does not commit text that exactly matches an existing choice as free text', () => {
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

    // 'React' matches an existing choice's text — not committed as free text
    expect(handleChange).not.toHaveBeenCalledWith(['React']);
  });

  // V3-6: case-insensitive match — a case-different typo of an existing
  // choice used to commit as a brand-new near-duplicate custom value.
  it('does not commit text that matches an existing choice case-insensitively', () => {
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

    expect(handleChange).not.toHaveBeenCalledWith(['REACT']);
  });

  // V3-6: commitOtherValue bypassed maxValues — a manually committed custom
  // pill could push the selection past the configured cap.
  it('does not commit free text past maxValues', () => {
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

    expect(handleChange).not.toHaveBeenCalled();
  });

  // V3-6: Enter with a highlighted dropdown option used to double-emit —
  // once via the manual commit, once via Mantine's own selection.
  it('skips the manual Enter commit when the keydown was already handled elsewhere', () => {
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
    // A capture-phase native listener runs before React's bubble-phase
    // handler, so this reliably simulates Mantine having already called
    // preventDefault() on the Enter itself (React's synthetic `defaultPrevented`
    // reflects the underlying native event).
    input.addEventListener('keydown', (e) => e.preventDefault(), { capture: true });
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'Ember' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(handleChange).not.toHaveBeenCalled();
  });

  // V3-6: blur right after selecting an option via click used to re-commit
  // whatever text was still sitting in the search box as an unrelated extra
  // custom pill.
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

    await Promise.resolve();
    fireEvent.blur(input);

    expect(handleChange).not.toHaveBeenCalled();
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

    const pill = screen.getByText('React').closest('.mantine-Pill-root') as HTMLElement;
    expect(pill.style.color).toBe('rgb(255, 0, 255)');
  });
});
