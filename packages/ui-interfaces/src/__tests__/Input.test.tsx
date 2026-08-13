import React from 'react';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { Input } from '../input';

const renderWithProvider = (component: React.ReactElement) => {
  return render(<MantineProvider>{component}</MantineProvider>);
};

describe('Input', () => {
  it('renders a text input by default', () => {
    renderWithProvider(<Input label="Name" />);
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
  });

  it('renders a number input for numeric types', () => {
    renderWithProvider(<Input label="Count" type="integer" />);
    expect(screen.getByLabelText('Count')).toBeInTheDocument();
  });

  it('renders a password input when masked', () => {
    renderWithProvider(<Input label="Secret" masked />);
    const input = screen.getByLabelText('Secret');
    expect(input).toHaveAttribute('type', 'password');
  });
});

describe('Input autofocus wiring (S2.3)', () => {
  it('focuses the text input on mount when autofocus is set', () => {
    renderWithProvider(<Input label="Name" autofocus />);
    expect(screen.getByLabelText('Name')).toHaveFocus();
  });

  it('does not focus the text input on mount when autofocus is unset', () => {
    renderWithProvider(<Input label="Name" />);
    expect(screen.getByLabelText('Name')).not.toHaveFocus();
  });

  it('focuses a masked (password) input on mount when autofocus is set', () => {
    renderWithProvider(<Input label="Secret" masked autofocus />);
    expect(screen.getByLabelText('Secret')).toHaveFocus();
  });

  it('focuses a numeric input on mount when autofocus is set', () => {
    renderWithProvider(<Input label="Count" type="integer" autofocus />);
    expect(screen.getByLabelText('Count')).toHaveFocus();
  });

  it('does not leak autofocus as an unknown DOM attribute', () => {
    const { container } = renderWithProvider(<Input label="Name" autofocus />);
    expect(container.querySelector('[autofocus]')).toBeNull();
  });
});
