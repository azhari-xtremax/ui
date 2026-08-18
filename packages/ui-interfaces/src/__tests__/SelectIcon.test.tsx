import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { IconShield } from '@tabler/icons-react';
import { SelectIcon, IconDisplay } from '../select-icon/SelectIcon';

const renderWithMantine = (component: React.ReactElement) => {
  return render(
    <MantineProvider>
      {component}
    </MantineProvider>
  );
};

describe('SelectIcon', () => {
  it('renders with default props', () => {
    renderWithMantine(<SelectIcon />);
    expect(screen.getByTestId('select-icon-trigger')).toBeInTheDocument();
    expect(screen.getByText('Search for an icon...')).toBeInTheDocument();
  });

  it('renders with custom label', () => {
    renderWithMantine(<SelectIcon label="Choose Icon" />);
    expect(screen.getByText('Choose Icon')).toBeInTheDocument();
  });

  it('shows required indicator when required', () => {
    renderWithMantine(<SelectIcon label="Icon" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('displays error message', () => {
    renderWithMantine(<SelectIcon error="Icon is required" />);
    expect(screen.getByText('Icon is required')).toBeInTheDocument();
  });

  it('displays selected value', () => {
    renderWithMantine(<SelectIcon value="home" />);
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('opens dropdown when clicked', async () => {
    renderWithMantine(<SelectIcon />);
    const button = screen.getByRole('button');
    
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search icons...')).toBeInTheDocument();
    });
  });

  it('filters icons based on search', async () => {
    renderWithMantine(<SelectIcon />);
    const button = screen.getByRole('button');
    
    fireEvent.click(button);
    
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search icons...');
      fireEvent.change(searchInput, { target: { value: 'home' } });
    });
    
    await waitFor(() => {
      // Should show results with "home" and hide categories that don't contain it
      expect(screen.queryByTestId('icon-home')).toBeInTheDocument(); // 'home' lives in Action
      expect(screen.queryByText('Communication')).not.toBeInTheDocument(); // no 'home' in Communication
    });
  });

  it('calls onChange when icon is selected', async () => {
    const mockOnChange = jest.fn();
    renderWithMantine(<SelectIcon onChange={mockOnChange} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search icons...');
      fireEvent.change(searchInput, { target: { value: 'add' } });
    });
    
    await waitFor(() => {
      const addIconButton = screen.getByTestId('icon-add');
      fireEvent.click(addIconButton);
    });
    
    expect(mockOnChange).toHaveBeenCalledWith('add');
  });

  it('clears selection when clear button is clicked', () => {
    const mockOnChange = jest.fn();
    renderWithMantine(<SelectIcon value="home" onChange={mockOnChange} />);

    fireEvent.click(screen.getByTestId('clear-icon-button'));

    expect(mockOnChange).toHaveBeenCalledWith(null);
  });

  it('is disabled when disabled prop is true', () => {
    renderWithMantine(<SelectIcon disabled />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('shows no results message when search has no matches', async () => {
    renderWithMantine(<SelectIcon />);
    const button = screen.getByRole('button');
    
    fireEvent.click(button);
    
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search icons...');
      fireEvent.change(searchInput, { target: { value: 'nonexistenticon' } });
    });
    
    await waitFor(() => {
      expect(screen.getByText(/No icons found for/)).toBeInTheDocument();
    });
  });

  it('clears search when clear search button is clicked', async () => {
    renderWithMantine(<SelectIcon />);
    const button = screen.getByRole('button');
    
    fireEvent.click(button);
    
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search icons...');
      fireEvent.change(searchInput, { target: { value: 'test' } });
    });
    
    await waitFor(() => {
      // Get search input and clear it programmatically for testing
      const searchInput = screen.getByPlaceholderText('Search icons...');
      fireEvent.change(searchInput, { target: { value: '' } });
    });
    
    const searchInput = screen.getByPlaceholderText('Search icons...');
    expect(searchInput).toHaveValue('');
  });

  it('formats icon names correctly', () => {
    renderWithMantine(<SelectIcon value="arrow_back_ios" />);
    expect(screen.getByText('Arrow Back Ios')).toBeInTheDocument();
  });

  it('accepts a custom width without breaking rendering', () => {
    // Mantine 8 applies the `w` style prop through its styles engine, which
    // jsdom cannot observe (no inline style, no jsdom-visible stylesheet) —
    // so this is a smoke test of the prop path only.
    renderWithMantine(<SelectIcon width="300px" />);
    expect(screen.getByTestId('select-icon-trigger')).toBeInTheDocument();
  });

  it('renders every icon name exactly once, even ones listed in multiple categories (S5.2)', async () => {
    renderWithMantine(<SelectIcon />);
    fireEvent.click(screen.getByRole('button'));

    // 'lock' (Action + Security & Identity), 'fingerprint' (Action + Security
    // & Identity), and 'vpn_key' (Communication + Security & Identity) used
    // to render twice, sharing one data-testid and double-highlighting.
    for (const name of ['lock', 'fingerprint', 'vpn_key', 'star', 'refresh', 'share', 'bluetooth', 'wifi', 'public', 'explore']) {
      await waitFor(() => {
        expect(screen.getAllByTestId(`icon-${name}`)).toHaveLength(1);
      });
    }
  });

  // S5.5: forward extra props to the trigger.
  it('forwards arbitrary extra props to the trigger button', () => {
    renderWithMantine(<SelectIcon data-extra="probe" />);
    expect(screen.getByTestId('select-icon-trigger')).toHaveAttribute('data-extra', 'probe');
  });

  // The form pipeline (VForm → FormField → FormFieldInterface) sends the
  // lowercase spelling; a direct consumer reaches for React's camelCase one.
  // Both must work, or the feature is dead on whichever path isn't covered.
  it.each([
    ['camelCase autoFocus', { autoFocus: true }],
    ['lowercase autofocus (the spelling the form pipeline sends)', { autofocus: true }],
  ])('autofocuses the trigger via %s', (_label, props) => {
    renderWithMantine(<SelectIcon {...(props as Record<string, unknown>)} />);
    expect(screen.getByTestId('select-icon-trigger')).toHaveFocus();
  });

  // The trigger must never become a submit button. FormFieldInterface passes
  // `type: field.type` ('string', 'uuid', …) to every leaf; an invalid
  // button@type falls back to "submit", and CollectionForm renders fields
  // inside a <form onSubmit={handleSave}> — so a forwarded `type` would save
  // the record when the user merely clicks to open the picker.
  it('keeps type="button" even when the pipeline forwards a DaaS field type', () => {
    renderWithMantine(<SelectIcon {...({ type: 'string' } as Record<string, unknown>)} />);
    expect(screen.getByTestId('select-icon-trigger')).toHaveAttribute('type', 'button');
  });

  it('does not submit an enclosing form when the trigger is clicked', () => {
    const onSubmit = jest.fn((e: React.FormEvent) => e.preventDefault());
    renderWithMantine(
      <form onSubmit={onSubmit}>
        <SelectIcon {...({ type: 'string' } as Record<string, unknown>)} />
      </form>,
    );

    fireEvent.click(screen.getByTestId('select-icon-trigger'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  // DaaS schema metadata reaches every leaf from FormFieldInterface. None of it
  // is a valid DOM attribute; forwarding it produces React console errors and,
  // for `type`, the submit bug above.
  it('does not leak DaaS schema metadata onto the trigger', () => {
    renderWithMantine(
      <SelectIcon
        {...({
          collection: 'articles',
          field: 'icon',
          primaryKey: '1',
          maxLength: 255,
          nullable: true,
          defaultValue: null,
        } as Record<string, unknown>)}
      />,
    );

    const trigger = screen.getByTestId('select-icon-trigger');
    for (const attr of ['collection', 'field', 'primarykey', 'maxlength', 'nullable']) {
      expect(trigger).not.toHaveAttribute(attr);
    }
  });

  // S5.1/S5.7: a stored name outside the curated ICON_MAP can't be fixed by
  // expanding the picker (Material has thousands of names), but the trigger's
  // fallback must match IconDisplay's (S5.7) and surface the raw name rather
  // than a silent bare '?' (S5.1).
  it('surfaces the raw stored name on the fallback glyph for an unmapped value', () => {
    renderWithMantine(<SelectIcon value="not_a_real_icon" />);
    // Tabler renders `title` as a real <svg><title>, so this asserts the
    // behaviour rather than the element used to achieve it.
    expect(screen.getByTitle('not_a_real_icon')).toBeInTheDocument();
  });

  // The actual S5.7 invariant: the trigger fallback and IconDisplay's default
  // must be indistinguishable, not merely share a component. Sharing the
  // component alone still left them at different stroke weights.
  it('renders the unknown-icon fallback identically to IconDisplay', () => {
    const { container: trigger } = renderWithMantine(<SelectIcon value="not_a_real_icon" />);
    const { container: display } = renderWithMantine(
      <IconDisplay icon="not_a_real_icon" size={18} />,
    );

    const describe_ = (root: HTMLElement) => {
      const svg = root.querySelector('svg.tabler-icon-question-mark');
      return svg && {
        stroke: svg.getAttribute('stroke-width'),
        ariaHidden: svg.getAttribute('aria-hidden'),
        width: svg.getAttribute('width'),
      };
    };

    expect(describe_(trigger)).not.toBeNull();
    expect(describe_(trigger)).toEqual(describe_(display));
  });
});

describe('IconDisplay', () => {
  it('renders the mapped Tabler icon for a known Material name', () => {
    const { container } = renderWithMantine(<IconDisplay icon="shield" />);
    expect(container.querySelector('svg.tabler-icon-shield')).not.toBeNull();
  });

  it('renders the daas default role icon (supervised_user_circle)', () => {
    const { container } = renderWithMantine(<IconDisplay icon="supervised_user_circle" />);
    expect(container.querySelector('svg.tabler-icon-users-group')).not.toBeNull();
  });

  it('falls back to the provided component for unknown or empty names', () => {
    // S5.7: the default fallback is now IconQuestionMark — the same glyph
    // SelectIcon's own trigger (renderIcon) uses for the same condition, so
    // "unknown icon" looks identical everywhere it's rendered.
    const { container } = renderWithMantine(<IconDisplay icon="not_a_real_icon" />);
    expect(container.querySelector('svg.tabler-icon-question-mark')).not.toBeNull();

    const { container: second } = renderWithMantine(
      <IconDisplay icon={null} fallback={IconShield} />
    );
    expect(second.querySelector('svg.tabler-icon-shield')).not.toBeNull();
  });

  it('applies size and stroke and stays aria-hidden (decorative)', () => {
    const { container } = renderWithMantine(<IconDisplay icon="key" size={28} stroke={2} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '28');
    expect(svg).toHaveAttribute('stroke-width', '2');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
});
