/**
 * SelectMultipleDropdown Interface Component
 * Dropdown-based multi-select with search support
 * 
 * Based on DaaS select-multiple-dropdown interface
 * Uses Mantine MultiSelect for dropdown functionality
 */

'use client';

import React, { useMemo, useState } from 'react';
import { MultiSelect, Text, Stack, ColorSwatch } from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';
import { IconDisplay } from '../select-icon/SelectIcon';

export interface DropdownChoice {
  text: string;
  value: string | number | boolean;
  disabled?: boolean;
  /** Icon name (Material Design name, resolved via the shared ICON_MAP) */
  icon?: string | null;
  /** Per-choice pill color — theme name or CSS color; overrides the global `color` prop */
  color?: string | null;
}

export interface SelectMultipleDropdownProps {
  /**
   * Registered for `types: ['json', 'csv']` — a `csv`-typed field delivers a
   * raw comma-separated string, not an array. `type` lets this component
   * normalize on read and re-serialize on write when used standalone
   * (outside the FormFieldInterface pipeline, which already normalizes this
   * for its own three multi-select leaves but can't help a direct consumer
   * of this exported component).
   */
  type?: 'csv' | 'json';
  value?: (string | number | boolean)[] | string | null;
  onChange?: (value: (string | number | boolean)[] | string | null) => void;
  label?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  choices?: DropdownChoice[];
  allowNone?: boolean;
  /** Allow committing a typed value not present in `choices` (Enter or blur) */
  allowOther?: boolean;
  placeholder?: string;
  searchable?: boolean;
  clearable?: boolean;
  maxValues?: number;
  hidePickedOptions?: boolean;
  width?: string;
  color?: string;
  'aria-label'?: string;
}

export function SelectMultipleDropdown({
  type,
  value = [],
  onChange,
  label,
  disabled = false,
  required = false,
  error,
  choices = [],
  allowNone = false,
  allowOther = false,
  placeholder,
  searchable = true,
  clearable = true,
  maxValues,
  hidePickedOptions = false,
  width,
  color = 'blue',
  'aria-label': ariaLabel,
}: SelectMultipleDropdownProps) {
  // Normalize a raw csv-string value to an array before anything below reads
  // it. `type === 'csv'` is the documented signal, but also trust what was
  // actually observed (a string) — some backends report the underlying
  // column type instead of the abstract 'csv' interface type.
  const normalizedValue = useMemo(() => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      return value.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return value ?? [];
  }, [value]);
  const isCsvStorage = type === 'csv' || typeof value === 'string';
  // Transform choices for Mantine MultiSelect
  const data = useMemo(() => {
    if (!choices || choices.length === 0) {
      return [];
    }

    // Mantine's <MultiSelect> requires globally-unique string `value`s in
    // `data` and throws "Duplicate options are not supported" otherwise.
    // Choices with different typed values that stringify identically (e.g.
    // number 1 vs string '1') would collide here — drop the second
    // occurrence so the field renders, same fix as SelectDropdown.
    const seen = new Set<string>();
    const result: { value: string; label: string; disabled: boolean; icon?: string | null; color?: string | null }[] = [];
    for (const choice of choices) {
      const strValue = String(choice.value);
      if (seen.has(strValue)) continue;
      seen.add(strValue);
      result.push({
        value: strValue,
        label: choice.text,
        disabled: choice.disabled || false,
        icon: choice.icon,
        color: choice.color,
      });
    }

    // allowOther: already-committed custom values (from a previous session)
    // aren't in `choices`, so Mantine's <MultiSelect> — which only
    // renders/highlights pills for values present in `data` — would show
    // them blank. Inject them as synthetic options, mirroring SelectDropdown.
    if (allowOther) {
      for (const v of normalizedValue) {
        const strValue = String(v);
        if (!seen.has(strValue)) {
          seen.add(strValue);
          result.push({ value: strValue, label: strValue, disabled: false });
        }
      }
    }

    return result;
  }, [choices, allowOther, normalizedValue]);

  // Emit an array or, for csv storage, join it back to a comma-string —
  // Mantine's MultiSelect always hands us an array regardless of how the
  // value is actually stored.
  const emit = (next: (string | number | boolean)[] | null) => {
    if (isCsvStorage && Array.isArray(next)) {
      onChange?.(next.join(','));
    } else {
      onChange?.(next);
    }
  };

  // Handle value changes with proper sorting
  const handleChange = (newValue: string[]) => {
    justToggledRef.current = true;
    clearJustToggledSoon();

    if (!newValue || newValue.length === 0) {
      emit(allowNone ? null : []);
      return;
    }

    // If no choices available, just pass through the values
    if (!choices || choices.length === 0) {
      emit(newValue);
      return;
    }

    // Sort values based on their position in the original choices array
    // (copy first — Array.prototype.sort mutates in place, and this is
    // Mantine's own array reference)
    const sortedValue = [...newValue].sort((a, b) => {
      const indexA = choices.findIndex(choice => String(choice.value) === a);
      const indexB = choices.findIndex(choice => String(choice.value) === b);

      // If not found in choices (custom values), put them at the end
      if (indexA === -1 && indexB === -1) {
        return 0;
      }
      if (indexA === -1) {
        return 1;
      }
      if (indexB === -1) {
        return -1;
      }

      return indexA - indexB;
    });

    // Convert back to original value types. Preserve the exact
    // previously-stored value for anything already selected instead of
    // re-resolving it through `choices.find` — this whole array gets
    // rebuilt from Mantine's stringified selection on *every* toggle, so
    // resolving fresh here would silently re-type an already-selected
    // "dropped twin" (e.g. a stored string '1' becoming number 1, since
    // dedup above only keeps the first colliding choice) whenever the user
    // toggles any unrelated item (S6.6).
    const currentByString = new Map(normalizedValue.map(v => [String(v), v] as const));
    const convertedValue = sortedValue.map(stringValue => {
      if (currentByString.has(stringValue)) {
        return currentByString.get(stringValue)!;
      }
      const originalChoice = choices.find(choice => String(choice.value) === stringValue);
      return originalChoice ? originalChoice.value : stringValue;
    });

    emit(convertedValue);
  };

  // allowOther: Mantine's <MultiSelect> has no built-in creatable mode —
  // typed text with no matching option never reaches onChange. Track the
  // live search text and commit it as an additional pill on Enter or blur,
  // mirroring SelectDropdown's manual creatable pattern (S6.2).
  const [otherSearchValue, setOtherSearchValue] = useState('');

  // V3-6: mirrors SelectDropdown's justSelectedRef — set whenever Mantine
  // resolves a real toggle (handleChange), self-clears on a microtask.
  // Without it, blur/Enter right after clicking an option in the dropdown
  // (which doesn't always clear the leftover search text synchronously)
  // re-commits whatever text is still sitting in the search box as an
  // unrelated extra custom pill.
  const justToggledRef = React.useRef(false);
  const clearJustToggledSoon = () => {
    queueMicrotask(() => {
      justToggledRef.current = false;
    });
  };

  const commitOtherValue = () => {
    if (!allowOther) return;
    if (justToggledRef.current) {
      justToggledRef.current = false;
      return;
    }
    const trimmed = otherSearchValue.trim();
    if (!trimmed) return;
    // V3-6: case-insensitive match — "Alpha" typed against a choice text of
    // "alpha" used to be treated as a brand-new custom value (a
    // near-duplicate of an existing choice) instead of being recognized as
    // matching it.
    const lowerTrimmed = trimmed.toLowerCase();
    const matchesExistingChoice = choices.some(
      (choice) =>
        choice.text.toLowerCase() === lowerTrimmed || String(choice.value).toLowerCase() === lowerTrimmed,
    );
    const alreadySelected = normalizedValue.some((v) => String(v).toLowerCase() === lowerTrimmed);
    // V3-6: commitOtherValue bypassed maxValues entirely — a manually
    // committed custom pill could push the selection past the configured cap.
    const atMax = typeof maxValues === 'number' && normalizedValue.length >= maxValues;
    if (!matchesExistingChoice && !alreadySelected && !atMax) {
      emit([...normalizedValue, trimmed]);
    }
    setOtherSearchValue('');
  };

  // Show choices validation message
  if (!choices || choices.length === 0) {
    return (
      <Stack gap="xs" style={{ width }}>
        {label && (
          <Text size="sm" fw={500}>
            {label}
            {required && <Text component="span" c="red" ml={4}>*</Text>}
          </Text>
        )}
        <Text size="sm" c="orange" role="alert">
          Choices option configured incorrectly
        </Text>
        {error && (
          <Text size="xs" c="red" role="alert" aria-live="polite">
            {error}
          </Text>
        )}
      </Stack>
    );
  }

  // Convert value to string array for Mantine
  const stringValue = normalizedValue.map(v => String(v));

  // Normalize the global pill color the same way SelectMultipleCheckbox
  // does: a `var(--mantine-color-X-6)` wrapper resolves to its bare palette
  // name, and a raw hex/rgb/hsl color is detected so it's interpolated via
  // color-mix instead of into an (invalid) `var(--mantine-color-<hex>-light)`
  // custom property, which silently drops the pill's background (S6.3).
  const mantineColor = color.startsWith('var(--mantine-color-')
    ? color.replace('var(--mantine-color-', '').replace(')', '').replace('-6', '')
    : color;
  const isHexOrRawColor = /^#|^rgb|^hsl/.test(mantineColor);

  return (
    <Stack gap="xs" style={{ width }}>
      <MultiSelect
        label={label}
        placeholder={placeholder}
        data={data}
        value={stringValue}
        onChange={handleChange}
        disabled={disabled}
        error={error}
        required={required}
        searchable={searchable}
        clearable={clearable}
        maxValues={maxValues}
        hidePickedOptions={hidePickedOptions}
        withAsterisk={required}
        nothingFoundMessage={allowOther ? undefined : 'No options found'}
        maxDropdownHeight={300}
        comboboxProps={{
          transitionProps: { transition: 'pop', duration: 200 },
          shadow: 'var(--mantine-shadow-md)',
        }}
        rightSection={<IconChevronDown size={16} />}
        aria-label={ariaLabel || label || 'Multiple select dropdown'}
        // V3-6: a custom renderOption doesn't suppress Mantine's own
        // built-in check icon, so the manual ' ✓' below rendered alongside
        // it as a second, redundant check mark on every selected option.
        // Disable Mantine's, keep the manual one (icon/color rendering
        // already needs the custom renderOption regardless).
        withCheckIcon={false}
        renderOption={({ option, checked }) => {
          const choice = data.find((d) => d.value === option.value);
          return (
            <Text component="span" size="sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {choice?.icon && <IconDisplay icon={choice.icon} size={14} />}
              {choice?.color && !choice.icon && <ColorSwatch color={choice.color} size={12} />}
              {option.label}
              {checked && ' ✓'}
            </Text>
          );
        }}
        styles={{
          input: {
            cursor: disabled ? 'not-allowed' : 'pointer',
          },
          pill: isHexOrRawColor
            ? {
                backgroundColor: `color-mix(in srgb, ${mantineColor} 13%, transparent)`,
                color: mantineColor,
              }
            : {
                backgroundColor: `var(--mantine-color-${mantineColor}-light)`,
                color: `var(--mantine-color-${mantineColor}-filled)`,
              },
        }}
        filter={searchable ? undefined : () => data} // Disable filtering if not searchable
        {...(allowOther
          ? {
              searchValue: otherSearchValue,
              onSearchChange: setOtherSearchValue,
              onBlur: commitOtherValue,
              onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
                // V3-6: Enter with a highlighted dropdown option double-
                // emitted — once via the manual commitOtherValue (raw
                // search text), once via Mantine's own selection
                // (handleChange). Mantine calls preventDefault() when it's
                // about to handle the Enter itself; only run the manual
                // commit when it hasn't.
                if (event.key === 'Enter' && !event.defaultPrevented) commitOtherValue();
              },
            }
          : {})}
      />
    </Stack>
  );
}

export default SelectMultipleDropdown;
