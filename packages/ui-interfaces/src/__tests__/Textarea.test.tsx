import React from 'react';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { Textarea } from '../textarea';

const renderWithProvider = (component: React.ReactElement) => {
  return render(<MantineProvider>{component}</MantineProvider>);
};

// FormFieldInterface renders the visible label itself and deliberately
// withholds `label` from the leaf, forwarding an accessible name instead.
// Textarea declared none of the container's props and has no rest spread, so
// every long-text field shipped with no programmatic name at all.
describe('Textarea — the container prop contract', () => {
  it('uses aria-label as the accessible name when no label is rendered', () => {
    renderWithProvider(<Textarea aria-label="Body" />);
    expect(screen.getByLabelText('Body')).toBeInTheDocument();
  });

  it('prefers a visible label over aria-label when both are given', () => {
    renderWithProvider(<Textarea label="Body" aria-label="Ignored" />);
    expect(screen.getByLabelText('Body')).toBeInTheDocument();
  });

  it('enforces the schema max length', () => {
    renderWithProvider(<Textarea aria-label="Body" maxLength={40} />);
    expect(screen.getByLabelText('Body')).toHaveAttribute('maxlength', '40');
  });

  it.each([
    ['lowercase autofocus (what the form pipeline sends)', { autofocus: true }],
    ['camelCase autoFocus (the React idiom)', { autoFocus: true }],
  ])('focuses on mount via %s', (_name, props) => {
    renderWithProvider(<Textarea aria-label="Body" {...props} />);
    expect(screen.getByLabelText('Body')).toHaveFocus();
  });

  it('does not focus on mount when autofocus is unset', () => {
    renderWithProvider(<Textarea aria-label="Body" />);
    expect(screen.getByLabelText('Body')).not.toHaveFocus();
  });

  it('treats a truthy non-boolean as off', () => {
    renderWithProvider(<Textarea aria-label="Body" {...({ autofocus: 'false' } as never)} />);
    expect(screen.getByLabelText('Body')).not.toHaveFocus();
  });

  it('marks the control so a surrounding focus trap targets it', () => {
    renderWithProvider(<Textarea aria-label="Body" autofocus />);
    expect(screen.getByLabelText('Body')).toHaveAttribute('data-autofocus');
  });
});
