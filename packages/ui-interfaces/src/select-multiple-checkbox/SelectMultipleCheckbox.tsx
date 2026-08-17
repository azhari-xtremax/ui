'use client';

import React, { useState, useMemo } from 'react';
import {
  Stack,
  Text,
  Checkbox,
  Grid,
  Button,
  Group,
  ActionIcon,
  TextInput,
  ColorSwatch,
} from '@mantine/core';
import { IconPlus, IconX } from '@tabler/icons-react';
import { IconDisplay } from '../select-icon/SelectIcon';

export interface Option {
  text: string;
  value: string | number | boolean;
  disabled?: boolean;
  /** Icon name (Material Design name, resolved via the shared ICON_MAP), shown before the label */
  icon?: string | null;
  /** Theme color name or CSS color, applied to the checked state and an optional swatch */
  color?: string | null;
}

// Strips a `var(--mantine-color-X-6)`-wrapped color down to the bare Mantine
// palette name `X` so it can be passed to props like `Checkbox`'s `color`
// that expect a palette name, not a CSS var() expression. Shared by both the
// group-level `color` prop and each choice's own `icon`/`color` override.
function normalizeColor(color: string): string {
  if (color.startsWith('var(--mantine-color-')) {
    return color.replace('var(--mantine-color-', '').replace(')', '').replace('-6', '');
  }
  return color;
}

export interface SelectMultipleCheckboxProps {
  /**
   * Registered for `types: ['json', 'csv']` — a `csv`-typed field delivers a
   * raw comma-separated string, not an array. `type` lets this component
   * normalize on read and re-serialize on write when used standalone
   * (outside the FormFieldInterface pipeline, which already normalizes this
   * for its own three multi-select leaves but can't help a direct consumer
   * of this exported component). Without normalization a csv string breaks
   * every operation below: substring-match reads via String.includes,
   * character-spread on add ([...str, v]), TypeError on remove
   * (str.filter is not a function), and a render crash in
   * otherValuesInSelection's str.filter call.
   */
  type?: 'csv' | 'json';
  value?: (string | number | boolean)[] | string;
  onChange?: (value: (string | number | boolean)[] | string | null) => void;
  label?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  choices?: Option[];
  allowOther?: boolean;
  width?: string;
  iconOn?: string;
  iconOff?: string;
  color?: string;
  itemsShown?: number;
  /**
   * Value is visible but not editable. Mantine's Checkbox has no native
   * readOnly, so it is enforced at the `emit` chokepoint below plus pointer
   * suppression — deliberately not by setting `disabled`, which would grey the
   * control out and drop it from the tab order.
   */
  readOnly?: boolean;
}

export function SelectMultipleCheckbox({
  type,
  value = [],
  onChange,
  label,
  disabled = false,
  readOnly = false,
  required = false,
  error,
  choices = [],
  allowOther = false,
  width,
  iconOn: _iconOn = 'check_box',
  iconOff: _iconOff = 'check_box_outline_blank',
  color = 'blue',
  itemsShown = 8,
}: SelectMultipleCheckboxProps) {
  const [showAll, setShowAll] = useState(false);
  const [otherValues, setOtherValues] = useState<{ key: string; value: string }[]>([]);

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
  // Emit an array or, for csv storage, join it back to a comma-string.
  const emit = (next: (string | number | boolean)[] | null) => {
    // Single chokepoint for every mutation path (checkbox, "other" text, "other"
    // checkbox, clear). Gating here rather than per-handler means a new call
    // site cannot silently bypass the read-only guard.
    if (disabled || readOnly) return;
    if (isCsvStorage && Array.isArray(next)) {
      onChange?.(next.join(','));
    } else {
      onChange?.(next);
    }
  };

  // Parse color prop to work with Mantine's color system
  const mantineColor = useMemo(() => normalizeColor(color), [color]);

  // `mantineColor` is only a real Mantine palette name when it's not a raw
  // hex/CSS-color literal — interpolating a hex into `var(--mantine-color-*)`
  // produces an invalid custom-property name and silently drops the style.
  const isHexOrRawColor = /^#|^rgb|^hsl/.test(mantineColor);

  // Handle displaying limited choices or all choices
  const hideChoices = useMemo(() => choices.length > itemsShown, [choices.length, itemsShown]);
  
  const choicesDisplayed = useMemo(() => {
    if (showAll || !hideChoices) {
      return choices;
    }
    return choices.slice(0, itemsShown);
  }, [choices, showAll, hideChoices, itemsShown]);

  const hiddenCount = useMemo(() => choices.length - itemsShown, [choices.length, itemsShown]);

  // Calculate grid columns based on text length and width
  const gridColumns = useMemo(() => {
    if (!choices.length) {
      return 1;
    }

    const widestOptionLength = choices.reduce((acc, val) => {
      return val.text.length > acc ? val.text.length : acc;
    }, 0);

    if (width?.startsWith('half')) {
      return widestOptionLength <= 10 ? 2 : 1;
    }

    if (widestOptionLength <= 10) {
      return 4;
    }
    if (widestOptionLength > 10 && widestOptionLength <= 15) {
      return 3;
    }
    if (widestOptionLength > 15 && widestOptionLength <= 25) {
      return 2;
    }
    return 1;
  }, [choices, width]);

  // Handle checkbox change for predefined choices
  const handleCheckboxChange = (optionValue: string | number | boolean, checked: boolean) => {
    if (disabled) {
      return;
    }

    const currentValue = normalizedValue;
    let newValue: (string | number | boolean)[];

    if (checked) {
      // Add value if checked and not already present
      if (!currentValue.includes(optionValue)) {
        newValue = [...currentValue, optionValue];
      } else {
        newValue = currentValue;
      }
    } else {
      // Remove value if unchecked
      newValue = currentValue.filter(v => v !== optionValue);
    }

    emit(newValue.length > 0 ? newValue : null);
  };

  // Handle other value changes
  const handleOtherValueChange = (key: string, newValue: string) => {
    setOtherValues(prev => 
      prev.map(item => 
        item.key === key ? { ...item, value: newValue } : item
      )
    );
  };

  // Handle other value checkbox change
  const handleOtherCheckboxChange = (otherValue: string, checked: boolean) => {
    if (disabled) {
      return;
    }

    const currentValue = normalizedValue;
    let newValue: (string | number | boolean)[];

    if (checked) {
      if (!currentValue.includes(otherValue)) {
        newValue = [...currentValue, otherValue];
      } else {
        newValue = currentValue;
      }
    } else {
      newValue = currentValue.filter(v => v !== otherValue);
    }

    emit(newValue.length > 0 ? newValue : null);
  };

  // Add new other value input
  const addOtherValue = () => {
    const newKey = `other_${Date.now()}`;
    setOtherValues(prev => [...prev, { key: newKey, value: '' }]);
  };

  // Remove other value input
  const removeOtherValue = (key: string) => {
    setOtherValues(prev => prev.filter(item => item.key !== key));
  };

  // Get other values that are in the current selection. Excludes any value
  // already backed by a live `otherValues` input row (S7.3) — without this,
  // committing a custom value via that row made it match here too, so it
  // rendered a second time as a separate read-only checked checkbox above
  // the row that still owned it.
  const otherValuesInSelection = useMemo(() => {
    if (!allowOther) {
      return [];
    }

    const choiceValues = choices.map(c => c.value);
    const rowValues = new Set(otherValues.map(item => item.value));
    return normalizedValue.filter(v => !choiceValues.includes(v) && !rowValues.has(String(v)));
  }, [normalizedValue, choices, allowOther, otherValues]);

  // Show choices validation message
  if (!choices || choices.length === 0) {
    return (
      <Stack gap="xs" style={{ width }}>
        {label && (
          <Text size="sm" fw={500}>
            {label}
            {required && <Text component="span" c="red">*</Text>}
          </Text>
        )}
        <Text size="sm" c="orange">
          Choices option configured incorrectly
        </Text>
        {error && (
          <Text size="xs" c="red">
            {error}
          </Text>
        )}
      </Stack>
    );
  }

  return (
    <Stack
      gap="xs"
      style={{ width, ...(readOnly && { pointerEvents: 'none' as const, opacity: 0.8 }) }}
      {...(readOnly && { 'aria-readonly': true })}
    >
      {label && (
        <Text size="sm" fw={500}>
          {label}
          {required && <Text component="span" c="red">*</Text>}
        </Text>
      )}

      <Grid gutter="md">
        {choicesDisplayed.map((item, index) => (
          // Index-qualified: choices whose values stringify identically
          // (e.g. number 1 vs string '1') would otherwise collide on
          // key={String(item.value)} — a React "duplicate key" warning.
          // Selection state itself is unaffected (checked/onChange below
          // compare item.value directly, not its string form).
          <Grid.Col span={12 / gridColumns} key={`${index}-${String(item.value)}`}>
            <Checkbox
              label={
                item.icon || item.color ? (
                  <Group gap={6} wrap="nowrap">
                    {item.icon && <IconDisplay icon={item.icon} size={14} />}
                    {item.color && !item.icon && (
                      <ColorSwatch color={normalizeColor(item.color)} size={12} />
                    )}
                    <Text size="sm" span>{item.text}</Text>
                  </Group>
                ) : (
                  item.text
                )
              }
              checked={normalizedValue.includes(item.value)}
              onChange={(event) => handleCheckboxChange(item.value, event.currentTarget.checked)}
              disabled={disabled || item.disabled}
              size="sm"
              // choice.color overrides the group default, matching SelectRadio's
              // per-choice color resolution (S3.3/S7.2).
              color={item.color ? normalizeColor(item.color) : mantineColor}
              aria-label={`Select ${item.text}`}
              // `wrapperProps.style` is spread directly onto the root element's
              // props *after* Mantine's own computed `style` (which carries
              // `--checkbox-color` and friends), so a raw wrapperProps.style
              // object doesn't merge with it — it replaces it outright,
              // silently discarding the resolved color CSS vars regardless of
              // whether `color` came from the group default or a per-choice
              // override. `styles={{ root: {...} }}` goes through Mantine's
              // own vars resolver instead, which does merge.
              styles={{
                root: {
                  width: '100%',
                  padding: '12px',
                  backgroundColor: 'var(--mantine-color-gray-0)',
                  border: '1px solid var(--mantine-color-gray-3)',
                  borderRadius: 'var(--mantine-radius-xs)', // Tokenized border radius
                  transition: 'all 200ms ease',
                  cursor: disabled || item.disabled ? 'not-allowed' : 'pointer',
                },
              }}
            />
          </Grid.Col>
        ))}
      </Grid>

      {/* Show more button */}
      {hideChoices && !showAll && (
        <Button
          variant="subtle"
          size="xs"
          onClick={() => setShowAll(true)}
          disabled={disabled}
        >
          Show {hiddenCount} more option{hiddenCount !== 1 ? 's' : ''}
        </Button>
      )}

      {/* Other values section */}
      {allowOther && (
        <Stack gap="xs" mt="sm">
          {/* Existing other values that are selected */}
          {otherValuesInSelection.map((otherVal) => (
            <Checkbox
              key={String(otherVal)}
              label={String(otherVal)}
              checked
              onChange={(event) => handleOtherCheckboxChange(String(otherVal), event.currentTarget.checked)}
              disabled={disabled}
              size="sm"
              color={mantineColor}
              aria-label={`Selected custom value: ${String(otherVal)}`}
              wrapperProps={{
                style: {
                  padding: '12px',
                  // color-mix works for hex AND rgb()/hsl() — a bare `\u0024{color}22`
                  // alpha suffix is only valid for hex literals.
                  backgroundColor: isHexOrRawColor ? `color-mix(in srgb, ${mantineColor} 13%, transparent)` : `var(--mantine-color-${mantineColor}-light)`,
                  border: isHexOrRawColor ? `1px solid ${mantineColor}` : `1px solid var(--mantine-color-${mantineColor}-6)`,
                  borderRadius: 'var(--mantine-radius-sm)',
                },
              }}
            />
          ))}

          {/* Dynamic other value inputs */}
          {otherValues.map((otherItem) => (
            <Group key={otherItem.key} gap="xs" align="flex-end">
              <Checkbox
                checked={normalizedValue.includes(otherItem.value)}
                onChange={(event) => handleOtherCheckboxChange(otherItem.value, event.currentTarget.checked)}
                disabled={disabled || !otherItem.value.trim()}
                size="sm"
                color={mantineColor}
                aria-label={`Custom value checkbox: ${otherItem.value || 'empty'}`}
              />
              <TextInput
                placeholder="Enter custom value"
                value={otherItem.value}
                onChange={(event) => handleOtherValueChange(otherItem.key, event.currentTarget.value)}
                disabled={disabled}
                size="sm"
                style={{ flex: 1 }}
              />
              <ActionIcon
                variant="subtle"
                color="red"
                size="sm"
                onClick={() => removeOtherValue(otherItem.key)}
                disabled={disabled}
              >
                <IconX size={16} />
              </ActionIcon>
            </Group>
          ))}

          {/* Add other button */}
          <Button
            variant="default"
            size="sm"
            leftSection={<IconPlus size={16} />}
            onClick={addOtherValue}
            disabled={disabled}
            style={{
              justifyContent: 'flex-start',
              border: '2px dashed var(--mantine-color-gray-4)',
              backgroundColor: 'transparent',
              color: 'var(--mantine-color-gray-6)',
            }}
          >
            Other
          </Button>
        </Stack>
      )}

      {error && (
        <Text size="xs" c="red">
          {error}
        </Text>
      )}
    </Stack>
  );
}

export default SelectMultipleCheckbox;
