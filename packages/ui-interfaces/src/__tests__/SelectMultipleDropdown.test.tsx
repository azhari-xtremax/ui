import React from 'react';
import { render, screen } from '@testing-library/react';
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
