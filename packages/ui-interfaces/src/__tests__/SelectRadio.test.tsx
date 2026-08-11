import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { SelectRadio } from '../select-radio/SelectRadio';

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

const sampleChoices = [
  { text: 'React', value: 'react' },
  { text: 'Vue', value: 'vue' },
  { text: 'Angular', value: 'angular' },
];

describe('SelectRadio', () => {
  it('renders with default props', () => {
    render(
      <TestWrapper>
        <SelectRadio choices={sampleChoices} />
      </TestWrapper>
    );

    expect(screen.getByLabelText('React')).toBeInTheDocument();
    expect(screen.getByLabelText('Vue')).toBeInTheDocument();
    expect(screen.getByLabelText('Angular')).toBeInTheDocument();
  });

  it('renders with custom label', () => {
    render(
      <TestWrapper>
        <SelectRadio 
          label="Select Framework" 
          choices={sampleChoices} 
        />
      </TestWrapper>
    );

    expect(screen.getByText('Select Framework')).toBeInTheDocument();
  });

  it('handles value selection', () => {
    const mockOnChange = jest.fn();
    
    render(
      <TestWrapper>
        <SelectRadio 
          choices={sampleChoices}
          onChange={mockOnChange}
        />
      </TestWrapper>
    );

    const reactRadio = screen.getByLabelText('React');
    fireEvent.click(reactRadio);

    expect(mockOnChange).toHaveBeenCalledWith('react');
  });

  it('handles other option when allowOther is true', () => {
    const mockOnChange = jest.fn();
    
    render(
      <TestWrapper>
        <SelectRadio 
          choices={sampleChoices}
          allowOther
          onChange={mockOnChange}
        />
      </TestWrapper>
    );

    expect(screen.getByLabelText('Other')).toBeInTheDocument();
  });

  it('handles null values gracefully', () => {
    const mockOnChange = jest.fn();
    
    render(
      <TestWrapper>
        <SelectRadio 
          choices={sampleChoices}
          value={null}
          onChange={mockOnChange}
        />
      </TestWrapper>
    );

    expect(screen.getByLabelText('React')).toBeInTheDocument();
  });

  it('shows error when no choices provided', () => {
    render(
      <TestWrapper>
        <SelectRadio choices={[]} />
      </TestWrapper>
    );

    expect(screen.getByText('Choices option configured incorrectly')).toBeInTheDocument();
  });
});

describe('SelectRadio falsy and type-mismatched values', () => {
  const numericChoices = [
    { text: 'Zero', value: 0 },
    { text: 'One', value: 1 },
  ];

  it('treats a stored 0 as a real selection, not "no value"', () => {
    render(
      <TestWrapper>
        <SelectRadio choices={numericChoices} value={0} />
      </TestWrapper>
    );

    expect(screen.getByLabelText('Zero')).toBeChecked();
  });

  it('treats a stored false as a real selection', () => {
    render(
      <TestWrapper>
        <SelectRadio
          choices={[
            { text: 'Yes', value: true },
            { text: 'No', value: false },
          ]}
          value={false}
        />
      </TestWrapper>
    );

    expect(screen.getByLabelText('No')).toBeChecked();
  });

  it('matches a stored number against a string-authored choice value', () => {
    render(
      <TestWrapper>
        <SelectRadio
          choices={[
            { text: 'Three', value: '3' },
            { text: 'Four', value: '4' },
          ]}
          value={3}
        />
      </TestWrapper>
    );

    expect(screen.getByLabelText('Three')).toBeChecked();
  });

  it('does not misroute an in-choices 0 to the "Other" input when allowOther is set', () => {
    render(
      <TestWrapper>
        <SelectRadio choices={numericChoices} value={0} allowOther />
      </TestWrapper>
    );

    expect(screen.getByLabelText('Zero')).toBeChecked();
    expect(screen.queryByPlaceholderText(/other/i)).not.toBeInTheDocument();
  });
});

describe('SelectRadio malformed choices', () => {
  it('renders instead of crashing when a choice is missing text, labeling it by value', () => {
    render(
      <TestWrapper>
        <SelectRadio
          choices={[
            { text: 'Named', value: 'named' },
            { value: 'unnamed' } as { text: string; value: string },
          ]}
        />
      </TestWrapper>
    );

    expect(screen.getByLabelText('Named')).toBeInTheDocument();
    expect(screen.getByLabelText('unnamed')).toBeInTheDocument();
  });

  it('drops the second choice whose value stringifies identically instead of merging both onto one radio (S3.7)', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <TestWrapper>
        <SelectRadio
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
    // Radio.Group's native `value` is globally-unique per <Radio>; two
    // choices stringifying to the same value ('1') would otherwise share
    // one native radio, so selecting either checked both. The first
    // occurrence renders; the second (never independently selectable
    // anyway — handleChange resolves the first match) is dropped rather
    // than silently sharing state with it.
    expect(screen.getByLabelText('Number one')).toBeInTheDocument();
    expect(screen.queryByLabelText('String one')).not.toBeInTheDocument();
    consoleError.mockRestore();
  });
});

describe('SelectRadio per-choice icon and color (S3.3)', () => {
  it('renders a choice icon as a glyph and still exposes the label text', () => {
    render(
      <TestWrapper>
        <SelectRadio
          choices={[
            { text: 'Locked', value: 'locked', icon: 'lock' },
            { text: 'Open', value: 'open' },
          ]}
        />
      </TestWrapper>
    );

    expect(screen.getByLabelText('Locked')).toBeInTheDocument();
    expect(screen.getByLabelText('Open')).toBeInTheDocument();
    // The raw icon name is never printed as text.
    expect(screen.queryByText('lock')).not.toBeInTheDocument();
  });

  it('renders a color swatch for a choice with color but no icon', () => {
    render(
      <TestWrapper>
        <SelectRadio
          choices={[{ text: 'Red', value: 'red', color: '#ff0000' }]}
        />
      </TestWrapper>
    );

    const radio = screen.getByLabelText('Red');
    const label = radio.closest('.mantine-Radio-root');
    expect(label?.querySelector('.mantine-ColorSwatch-root')).toBeInTheDocument();
  });

  it('applies per-choice color to the Radio itself, overriding the group default', () => {
    render(
      <TestWrapper>
        <SelectRadio
          color="blue"
          choices={[{ text: 'Custom', value: 'custom', color: 'red' }]}
        />
      </TestWrapper>
    );

    const radio = screen.getByLabelText('Custom') as HTMLInputElement;
    // Mantine sets the resolved color as a CSS custom property on the root.
    const root = radio.closest('.mantine-Radio-root') as HTMLElement;
    expect(root.style.getPropertyValue('--radio-color')).toContain('red');
  });
});
