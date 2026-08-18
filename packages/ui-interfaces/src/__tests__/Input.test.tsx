import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { Input } from '../input';

const renderWithProvider = (component: React.ReactElement) => {
  return render(<MantineProvider>{component}</MantineProvider>);
};

/** The prop set `FormFieldInterface` forwards to every leaf. */
const containerProps = {
  collection: 'pages',
  field: 'title',
  primaryKey: 1,
  nullable: true,
  defaultValue: 'x',
} as Record<string, unknown>;

describe('Input', () => {
  it('renders a text input by default', () => {
    renderWithProvider(<Input label="Name" />);
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
  });

  // Assert on something only the numeric branch produces. `getByLabelText`
  // alone is satisfied by every branch, so it could not tell a NumberInput
  // from the TextInput the field would silently degrade to.
  it('renders a number input for numeric types', () => {
    const { container } = renderWithProvider(<Input label="Count" type="integer" />);
    expect(screen.getByLabelText('Count')).toHaveAttribute('inputmode', 'decimal');
    expect(container.querySelectorAll('.mantine-NumberInput-control').length).toBeGreaterThan(0);
  });

  it('renders a password input when masked', () => {
    renderWithProvider(<Input label="Secret" masked />);
    expect(screen.getByLabelText('Secret')).toHaveAttribute('type', 'password');
  });
});

describe('Input autofocus wiring (S2.3)', () => {
  it.each([
    ['text', { label: 'Name' }],
    ['masked', { label: 'Secret', masked: true }],
    ['numeric', { label: 'Count', type: 'integer' as const }],
  ])('focuses the %s branch on mount when autofocus is set', (_name, props) => {
    renderWithProvider(<Input {...props} autofocus />);
    expect(screen.getByLabelText(props.label)).toHaveFocus();
  });

  // A direct consumer reaches for React's camelCase spelling; the form
  // pipeline sends the lowercase one. Both must work or the feature is dead
  // on whichever path is not covered.
  it.each([
    ['lowercase autofocus (what the form pipeline sends)', { autofocus: true }],
    ['camelCase autoFocus (the React idiom)', { autoFocus: true }],
  ])('accepts %s', (_name, props) => {
    renderWithProvider(<Input label="Name" {...props} />);
    expect(screen.getByLabelText('Name')).toHaveFocus();
  });

  it('does not focus on mount when autofocus is unset', () => {
    renderWithProvider(<Input label="Name" />);
    expect(screen.getByLabelText('Name')).not.toHaveFocus();
  });

  // meta.options is unvalidated admin JSON, so a value that reads as "off" in
  // the schema editor must not behave as "on".
  it.each([['false'], ['0']])('treats the string %p as off, not truthy', (raw) => {
    renderWithProvider(<Input label="Name" {...({ autofocus: raw } as never)} />);
    expect(screen.getByLabelText('Name')).not.toHaveFocus();
  });

  // Mantine's focus trap fires after React's mount focus and targets
  // [data-autofocus]; without the marker it pulls focus to a modal's close
  // button and the feature is dead inside the O2M/M2M drawers.
  it('marks the control so a surrounding focus trap targets it', () => {
    renderWithProvider(<Input label="Name" autofocus />);
    expect(screen.getByLabelText('Name')).toHaveAttribute('data-autofocus');
  });

  it('does not mark the control when autofocus is unset', () => {
    renderWithProvider(<Input label="Name" />);
    expect(screen.getByLabelText('Name')).not.toHaveAttribute('data-autofocus');
  });
});

describe('Input — container metadata must not reach the DOM', () => {
  // The real leak, and the one the discard block exists to prevent. React
  // never writes `autofocus` as an attribute on the client, so querying for
  // it can never fail; these props do land, so assert on them instead.
  it.each([['collection'], ['field'], ['primaryKey'], ['nullable'], ['defaultValue']])(
    'does not forward %s to the input element',
    (prop) => {
      renderWithProvider(<Input label="Name" {...containerProps} />);
      const el = screen.getByLabelText('Name');
      expect(el.hasAttribute(prop)).toBe(false);
      expect(el.hasAttribute(prop.toLowerCase())).toBe(false);
    },
  );

  it('logs no React unknown-prop warning for the container prop set', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    renderWithProvider(<Input label="Name" autofocus {...containerProps} />);
    const unknownProp = spy.mock.calls
      .map((c) => String(c[0]))
      .filter((m) => /Invalid DOM property|does not recognize|non-boolean attribute/.test(m));
    spy.mockRestore();
    expect(unknownProp).toEqual([]);
  });
});

describe('Input numeric handling', () => {
  // Postgres returns numeric/bigint columns as strings; blanking them would
  // show an empty field for a stored value and write the blank back on save.
  it.each([
    ['a string decimal', '10.50', '10.50'],
    ['a string integer', '42', '42'],
    ['a number', 7, '7'],
  ])('renders %s', (_name, value, expected) => {
    renderWithProvider(<Input label="P" type="decimal" value={value as never} />);
    expect(screen.getByLabelText('P')).toHaveValue(expected);
  });

  // `undefined` puts Mantine's useUncontrolled into uncontrolled mode, after
  // which discard and post-save refetch can never correct the field again.
  it('lets the parent reset the field after the user has typed', () => {
    const Harness = () => {
      const [v, setV] = React.useState<string | number | null>(null);
      return (
        <MantineProvider>
          <Input label="N" type="integer" value={v} onChange={setV} />
          <button type="button" data-testid="discard" onClick={() => setV(null)}>discard</button>
        </MantineProvider>
      );
    };
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('N'), { target: { value: '9' } });
    expect(screen.getByLabelText('N')).toHaveValue('9');
    fireEvent.click(screen.getByTestId('discard'));
    expect(screen.getByLabelText('N')).toHaveValue('');
  });

  it('emits null, not an empty string, when a number field is cleared', () => {
    const onChange = jest.fn();
    renderWithProvider(<Input label="Q" type="integer" value={42} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Q'), { target: { value: '' } });
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  // NumberInput renders its steppers in the right section; overriding it
  // removed them along with the arrow-key affordance.
  it('keeps the stepper controls when clear is enabled', () => {
    const { container } = renderWithProvider(<Input label="S" type="integer" value={5} clear />);
    expect(container.querySelectorAll('.mantine-NumberInput-control').length).toBeGreaterThan(0);
  });

  // maxLength caps the rendered string, which for a numeric field includes
  // the thousands separators — so a 5 there means four digits, not five.
  it('does not apply maxLength to a numeric field', () => {
    renderWithProvider(<Input label="M" type="integer" maxLength={5} />);
    expect(screen.getByLabelText('M')).not.toHaveAttribute('maxlength');
  });

  it('still applies maxLength to a text field', () => {
    renderWithProvider(<Input label="T" maxLength={5} />);
    expect(screen.getByLabelText('T')).toHaveAttribute('maxlength', '5');
  });
});

describe('Input text transforms run on blur, not per keystroke', () => {
  // Applying them on change ate the character just typed: a trimmed field
  // could never contain "John Doe", and a slug field never "hello-w".
  it('lets a trailing space survive typing in a trimmed field', () => {
    const onChange = jest.fn();
    renderWithProvider(<Input label="T" trim value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('T'), { target: { value: 'John ' } });
    expect(onChange).toHaveBeenLastCalledWith('John ');
  });

  it.each([
    ['trim', { trim: true }, 'John Doe ', 'John Doe'],
    ['slug', { slug: true }, 'hello world', 'hello-world'],
  ])('applies %s on blur', (_name, props, typed, expected) => {
    const onChange = jest.fn();
    renderWithProvider(<Input label="T" {...props} value={typed} onChange={onChange} />);
    fireEvent.blur(screen.getByLabelText('T'));
    expect(onChange).toHaveBeenLastCalledWith(expected);
  });

  it('does not emit on blur when the transform is a no-op', () => {
    const onChange = jest.fn();
    renderWithProvider(<Input label="T" trim value="John" onChange={onChange} />);
    fireEvent.blur(screen.getByLabelText('T'));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('Input clear button', () => {
  it('offers clear for a numeric zero', () => {
    renderWithProvider(<Input label="Z" value={0} clear />);
    expect(screen.getByLabelText('Clear input')).toBeInTheDocument();
  });

  it('renders both the clear button and a trailing icon', () => {
    renderWithProvider(<Input label="B" value="x" clear iconRight={<span data-testid="icon" />} />);
    expect(screen.getByLabelText('Clear input')).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});
