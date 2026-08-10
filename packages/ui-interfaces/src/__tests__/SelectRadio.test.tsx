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
