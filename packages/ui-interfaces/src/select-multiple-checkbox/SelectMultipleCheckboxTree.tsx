/**
 * SelectMultipleCheckboxTree Interface Component
 * Tree-based multi-select checkbox with hierarchical choices
 * 
 * Based on DaaS select-multiple-checkbox-tree interface
 * Supports value combining modes: all, branch, leaf, indeterminate, exclusive
 */

'use client';

import React, { useState, useMemo, useCallback, useEffect, useId } from 'react';
import {
  Stack,
  Text,
  ActionIcon,
  Group,
  Box,
  Checkbox,
  Collapse,
  ScrollArea,
  Button,
  TextInput,
} from '@mantine/core';
import { IconChevronRight, IconChevronDown, IconSearch, IconX } from '@tabler/icons-react';
import { useDebouncedValue } from '@mantine/hooks';

// Depth cap for the recursive tree walkers (S4.10). `choices` is normally
// plain JSON, which can't encode a cycle — but a programmatic consumer could
// still hand this component a cyclic in-memory structure, which would
// otherwise overflow the stack in every recursive helper below.
const MAX_TREE_DEPTH = 100;

export interface TreeChoice {
  text: string;
  value: string | number | boolean;
  children?: TreeChoice[];
  disabled?: boolean;
}

// Internal: TreeChoice annotated with a key derived from its position in the
// *unfiltered* `choices` tree. Search/showSelectionOnly filtering changes
// which siblings appear (and therefore their index within the filtered
// array) without changing each node's identity — keying on the filtered
// index remounted every node whenever the filtered set changed size,
// resetting each TreeNode's local `expanded` state back to its default.
interface KeyedTreeChoice extends Omit<TreeChoice, 'children'> {
  __key: string;
  children?: KeyedTreeChoice[];
}

export interface SelectMultipleCheckboxTreeProps {
  value?: (string | number | boolean)[];
  onChange?: (value: (string | number | boolean)[] | null) => void;
  label?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  choices?: TreeChoice[];
  valueCombining?: 'all' | 'branch' | 'leaf' | 'indeterminate' | 'exclusive';
  width?: string;
  color?: string;
}

interface TreeNodeProps {
  choice: KeyedTreeChoice;
  selectedValues: (string | number | boolean)[];
  onToggle: (value: string | number | boolean, checked: boolean) => void;
  valueCombining: 'all' | 'branch' | 'leaf' | 'indeterminate' | 'exclusive';
  searchQuery: string;
  showSelectionOnly: boolean;
  disabled: boolean;
  level: number;
  color: string;
  /** Values whose subtree contains a search/selection match — force-expanded regardless of prior manual collapse (S4.9) */
  autoExpandValues: Set<string | number | boolean> | null;
  /** Index path from the root (e.g. "0-2-1") — scopes data-testid so stringify-colliding sibling values don't share one testid (S4.8) */
  nodePath: string;
}

// Inline SearchInput component to avoid external dependency
function SearchInput({ 
  onSearch, 
  placeholder = 'Search...', 
  showClearButton = true,
  disabled = false,
}: {
  onSearch: (value: string) => void;
  placeholder?: string;
  showClearButton?: boolean;
  disabled?: boolean;
}) {
  const [value, setValue] = useState('');
  const [debounced] = useDebouncedValue(value, 300);

  React.useEffect(() => {
    onSearch(debounced);
  }, [debounced, onSearch]);

  const handleClear = () => {
    setValue('');
    onSearch('');
  };

  return (
    <TextInput
      placeholder={placeholder}
      value={value}
      onChange={(e) => setValue(e.currentTarget.value)}
      leftSection={<IconSearch size={16} />}
      rightSection={
        showClearButton && value && (
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={handleClear}
            aria-label="Clear search"
          >
            <IconX size={12} />
          </ActionIcon>
        )
      }
      disabled={disabled}
      style={{ flex: 1 }}
    />
  );
}

export function SelectMultipleCheckboxTree({
  value = [],
  onChange,
  label,
  disabled = false,
  required = false,
  error,
  choices = [],
  valueCombining = 'all',
  width,
  color = 'blue',
}: SelectMultipleCheckboxTreeProps) {
  const [search, setSearch] = useState('');
  const [showSelectionOnly, setShowSelectionOnly] = useState(false);
  const [debouncedSearch] = useDebouncedValue(search, 250);
  const labelId = useId();

  // Strip a `var(--mantine-color-X-6)` wrapper down to the bare palette name
  // before handing it to Mantine's `color` prop (S4.11) — mirrors the
  // normalization SelectMultipleCheckbox already does. Forwarding the raw
  // `var(...)` string as-is silently drops the color in Mantine v8.
  const normalizedColor = useMemo(() => {
    if (color.startsWith('var(--mantine-color-')) {
      return color.replace('var(--mantine-color-', '').replace(')', '').replace('-6', '');
    }
    return color;
  }, [color]);

  // Get children values for a specific parent. Disabled nodes are excluded
  // from cascade toggles (S4.7) — a disabled node should stay untouched
  // when its ancestor is checked/unchecked, though its own (enabled)
  // children are still collected.
  const getChildrenValues = useCallback((choice: TreeChoice): (string | number | boolean)[] => {
    if (!choice.children) {
      return [];
    }
    const collectChildValues = (nodes: TreeChoice[], depth: number): (string | number | boolean)[] => {
      if (depth > MAX_TREE_DEPTH) return [];
      const values: (string | number | boolean)[] = [];
      for (const node of nodes) {
        if (!node.disabled) values.push(node.value);
        if (node.children) {
          values.push(...collectChildValues(node.children, depth + 1));
        }
      }
      return values;
    };
    return collectChildValues(choice.children, 0);
  }, []);

  // Get leaf values from a choice, excluding disabled leaves (S4.7).
  const getLeafValues = useCallback((choice: TreeChoice, depth = 0): (string | number | boolean)[] => {
    if (depth > MAX_TREE_DEPTH) return [];
    if (!choice.children || choice.children.length === 0) {
      return choice.disabled ? [] : [choice.value];
    }

    const leafValues: (string | number | boolean)[] = [];
    for (const child of choice.children) {
      leafValues.push(...getLeafValues(child, depth + 1));
    }
    return leafValues;
  }, []);

  // Check if node matches search
  const matchesSearch = useCallback((choice: TreeChoice, query: string, depth = 0): boolean => {
    if (!query) {
      return true;
    }
    if (depth > MAX_TREE_DEPTH) return false;
    const lowerQuery = query.toLowerCase();

    // Check current node
    if (choice.text.toLowerCase().includes(lowerQuery)) {
      return true;
    }

    // Check children recursively
    if (choice.children) {
      return choice.children.some(child => matchesSearch(child, query, depth + 1));
    }

    return false;
  }, []);

  // Check if node has any selected descendants
  const hasSelectedDescendants = useCallback((choice: TreeChoice, depth = 0): boolean => {
    if (!choice.children || depth > MAX_TREE_DEPTH) {
      return false;
    }

    for (const child of choice.children) {
      if (value.includes(child.value) || hasSelectedDescendants(child, depth + 1)) {
        return true;
      }
    }
    return false;
  }, [value]);

  // Check if a node's own text (not descendants) matches the query
  const matchesOwnText = useCallback((choice: TreeChoice, query: string): boolean => {
    if (!query) return false;
    return choice.text.toLowerCase().includes(query.toLowerCase());
  }, []);

  // Filter choices based on search and show selection only. Keys are
  // derived from each node's index in the *unfiltered* `choices`/`children`
  // array (via `origIndex`, computed before the `.filter()` below), so they
  // stay stable across search/showSelectionOnly changes even though the
  // filtered array's own indices shift (see KeyedTreeChoice above).
  const filteredChoices = useMemo(() => {
    // Recursively annotate an unfiltered subtree with stable keys — used by
    // the own-text-match branch below, which keeps ALL children rather than
    // re-filtering them.
    const annotateKeys = (node: TreeChoice, origIndex: number, depth: number): KeyedTreeChoice => ({
      ...node,
      __key: `${origIndex}-${String(node.value)}`,
      children:
        depth > MAX_TREE_DEPTH
          ? undefined
          : node.children?.map((child, childIndex) => annotateKeys(child, childIndex, depth + 1)),
    });

    const filterTree = (nodes: TreeChoice[], depth: number): KeyedTreeChoice[] => {
      if (depth > MAX_TREE_DEPTH) return [];
      return nodes
        .map((choice, origIndex) => ({ choice, origIndex }))
        .filter(({ choice }) => {
          if (showSelectionOnly) {
            return value.includes(choice.value) || hasSelectedDescendants(choice);
          }
          return matchesSearch(choice, debouncedSearch);
        })
        .map(({ choice, origIndex }) => {
          // A node whose own text matched keeps ALL its children unfiltered —
          // re-filtering them with the same predicate would otherwise drop
          // every child that doesn't itself match, hiding the whole subtree
          // under a parent the user was actually searching for.
          if (!showSelectionOnly && debouncedSearch && matchesOwnText(choice, debouncedSearch)) {
            return annotateKeys(choice, origIndex, depth);
          }
          return {
            ...choice,
            __key: `${origIndex}-${String(choice.value)}`,
            children: choice.children ? filterTree(choice.children, depth + 1) : undefined,
          };
        });
    };

    return filterTree(choices, 0);
  }, [choices, debouncedSearch, showSelectionOnly, value, hasSelectedDescendants, matchesSearch, matchesOwnText]);

  // Nodes to force-expand: those on the path to a search match or a
  // showSelectionOnly match, so per-node collapsed state (which persists
  // across searches) can't hide a result under a collapsed ancestor (S4.9).
  const autoExpandValues = useMemo(() => {
    if (!debouncedSearch && !showSelectionOnly) return null;
    const expand = new Set<string | number | boolean>();
    const walk = (nodes: TreeChoice[], depth: number): boolean => {
      if (depth > MAX_TREE_DEPTH) return false;
      let anyMatch = false;
      for (const node of nodes) {
        const ownMatch = showSelectionOnly
          ? value.includes(node.value)
          : matchesSearch(node, debouncedSearch);
        const childMatch = node.children ? walk(node.children, depth + 1) : false;
        if (ownMatch || childMatch) {
          anyMatch = true;
          if (childMatch) expand.add(node.value);
        }
      }
      return anyMatch;
    };
    walk(choices, 0);
    return expand;
  }, [choices, debouncedSearch, showSelectionOnly, value, matchesSearch]);

  // Handle checkbox toggle
  const handleToggle = useCallback((toggleValue: string | number | boolean, checked: boolean) => {
    if (disabled) {
      return;
    }

    const currentValue = value || [];
    let newValue: (string | number | boolean)[];

    // Find the choice being toggled
    const findChoice = (nodes: TreeChoice[], val: string | number | boolean): TreeChoice | null => {
      for (const node of nodes) {
        if (node.value === val) {
          return node;
        }
        if (node.children) {
          const found = findChoice(node.children, val);
          if (found) {
            return found;
          }
        }
      }
      return null;
    };

    const toggledChoice = findChoice(choices, toggleValue);
    if (!toggledChoice) {
      return;
    }

    switch (valueCombining) {
      case 'all': {
        // Include/exclude the value and all its children
        const childrenValues = getChildrenValues(toggledChoice);
        const allAffectedValues = [toggleValue, ...childrenValues];
        
        if (checked) {
          // Add all values
          const valueSet = new Set([...currentValue, ...allAffectedValues]);
          newValue = Array.from(valueSet);
        } else {
          // Remove all values
          newValue = currentValue.filter(v => !allAffectedValues.includes(v));
        }
        break;
      }
      
      case 'branch': {
        // Only include/exclude the parent value, but respect children selections
        if (checked) {
          newValue = currentValue.includes(toggleValue) ? currentValue : [...currentValue, toggleValue];
        } else {
          newValue = currentValue.filter(v => v !== toggleValue);
        }
        break;
      }
      
      case 'leaf': {
        // Only include/exclude leaf nodes (nodes without children)
        if (!toggledChoice.children || toggledChoice.children.length === 0) {
          if (checked) {
            newValue = currentValue.includes(toggleValue) ? currentValue : [...currentValue, toggleValue];
          } else {
            newValue = currentValue.filter(v => v !== toggleValue);
          }
        } else {
          // For parent nodes, toggle all leaf children
          const leafChildren = getLeafValues(toggledChoice);
          if (checked) {
            const valueSet = new Set([...currentValue, ...leafChildren]);
            newValue = Array.from(valueSet);
          } else {
            newValue = currentValue.filter(v => !leafChildren.includes(v));
          }
        }
        break;
      }
      
      case 'exclusive': {
        // Only one value can be selected at a time within a parent group
        if (checked) {
          newValue = [toggleValue];
        } else {
          newValue = [];
        }
        break;
      }
      
      default: {
        // Default behavior: simple toggle
        if (checked) {
          newValue = currentValue.includes(toggleValue) ? currentValue : [...currentValue, toggleValue];
        } else {
          newValue = currentValue.filter(v => v !== toggleValue);
        }
      }
    }

    onChange?.(newValue.length > 0 ? newValue : null);
  }, [value, onChange, disabled, choices, valueCombining, getChildrenValues, getLeafValues]);

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

  return (
    <Stack gap="xs" style={{ width }}>
      {label && (
        <Text 
          size="sm" 
          fw={500}
          component="label"
          htmlFor={`checkbox-tree-${labelId}`}
        >
          {label}
          {required && <Text component="span" c="red" ml={4}>*</Text>}
        </Text>
      )}

      <Box
        style={{
          maxHeight: '300px',
          backgroundColor: 'var(--mantine-color-gray-0)',
          border: '1px solid var(--mantine-color-gray-3)',
          borderRadius: 'var(--mantine-radius-xs)',
          overflow: 'hidden',
        }}
        role="tree"
        aria-label={label ? `${label} tree` : 'Tree selection'}
      >
        {/* Search input */}
        {choices.length > 10 && (
          <Box
            p="sm"
            style={{
              borderBottom: '1px solid var(--mantine-color-gray-3)',
              backgroundColor: 'var(--mantine-color-white)',
            }}
          >
            <SearchInput
              placeholder="Search..."
              onSearch={setSearch}
              disabled={disabled}
              showClearButton
            />
          </Box>
        )}

        {/* Tree content */}
        <ScrollArea h="200px" p="sm">
          <Stack gap="xs">
            {filteredChoices.map((choice) => (
              <TreeNode
                key={choice.__key}
                choice={choice}
                selectedValues={value}
                onToggle={handleToggle}
                valueCombining={valueCombining}
                searchQuery={debouncedSearch}
                showSelectionOnly={showSelectionOnly}
                disabled={disabled}
                level={0}
                color={normalizedColor}
                autoExpandValues={autoExpandValues}
                // V3-7: derived from the stable __key (origIndex-in-the-
                // unfiltered-array + value), not the filtered position —
                // testids used to shift under search/showSelectionOnly
                // filtering even though __key itself (the React key) was
                // already stable.
                nodePath={choice.__key}
              />
            ))}
          </Stack>
        </ScrollArea>

        {/* Footer controls */}
        <Group
          justify="flex-end"
          gap="xs"
          p="xs"
          style={{
            borderTop: '1px solid var(--mantine-color-gray-3)',
            backgroundColor: 'var(--mantine-color-white)',
          }}
        >
          <Button
            variant={showSelectionOnly ? 'subtle' : 'light'}
            size="xs"
            onClick={() => setShowSelectionOnly(false)}
            disabled={disabled}
          >
            Show All
          </Button>
          <Text size="xs" c="dimmed">/</Text>
          <Button
            variant={showSelectionOnly ? 'light' : 'subtle'}
            size="xs"
            onClick={() => setShowSelectionOnly(true)}
            disabled={disabled}
          >
            Show Selected
          </Button>
        </Group>
      </Box>

      {error && (
        <Text size="xs" c="red" role="alert" aria-live="polite">
          {error}
        </Text>
      )}
    </Stack>
  );
}

// Tree Node Component
function TreeNode({
  choice,
  selectedValues,
  onToggle,
  valueCombining,
  searchQuery,
  showSelectionOnly,
  disabled,
  level,
  color,
  autoExpandValues,
  nodePath,
}: TreeNodeProps) {
  const [manuallyExpanded, setManuallyExpanded] = useState(true);
  const hasChildren = choice.children && choice.children.length > 0;
  // V3-7: an explicit chevron click must always visibly toggle, even on an
  // auto-expanded ancestor. Previously toggleExpanded only flipped
  // `manuallyExpanded`, so clicking to collapse an auto-expanded node
  // (autoExpandValues still has it) recomputed `expanded` back to true via
  // the OR below — a silent no-op. `userOverride` wins whenever set, and is
  // cleared on a new search so the next query's own auto-expand isn't
  // permanently suppressed by a stale collapse.
  const [userOverride, setUserOverride] = useState<boolean | null>(null);
  useEffect(() => {
    setUserOverride(null);
  }, [searchQuery]);
  // Force-expanded while this node's subtree holds a search/selection match,
  // regardless of a prior manual collapse — otherwise the match stays hidden
  // under a collapsed ancestor (S4.9).
  const expanded =
    userOverride !== null ? userOverride : autoExpandValues?.has(choice.value) || manuallyExpanded;

  // Calculate checkbox state based on selection and children
  const { checked, indeterminate } = useMemo(() => {
    const isSelected = selectedValues.includes(choice.value);
    
    if (!hasChildren) {
      return { checked: isSelected, indeterminate: false };
    }

    // For parent nodes, check children state
    const allChildValues: (string | number | boolean)[] = [];
    const collectChildValues = (nodes: TreeChoice[], depth: number) => {
      if (depth > MAX_TREE_DEPTH) return;
      for (const node of nodes) {
        allChildValues.push(node.value);
        if (node.children) {
          collectChildValues(node.children, depth + 1);
        }
      }
    };
    collectChildValues(choice.children!, 0);

    const selectedChildrenCount = allChildValues.filter(val => selectedValues.includes(val)).length;

    if (valueCombining === 'all') {
      if (selectedChildrenCount === 0) {
        return { checked: isSelected, indeterminate: false };
      } else if (selectedChildrenCount === allChildValues.length) {
        return { checked: true, indeterminate: false };
      }
      return { checked: false, indeterminate: true };
    }

    if (valueCombining === 'leaf') {
      // In leaf mode a parent's own value is never stored (only leaves are
      // toggled), so `isSelected` is always false and this fell through to
      // indeterminate even when every descendant leaf was selected (S4.5).
      // Derive checked/indeterminate from leaf selection instead.
      const leafValues: (string | number | boolean)[] = [];
      const collectLeafValues = (nodes: TreeChoice[], depth: number) => {
        if (depth > MAX_TREE_DEPTH) return;
        for (const node of nodes) {
          if (!node.children || node.children.length === 0) {
            // Count only leaves the user can actually affect: enabled ones,
            // plus disabled ones that are already selected (stored data).
            // The cascade toggle skips disabled leaves (S4.7), so counting
            // an unselected disabled leaf in the denominator would make
            // "all leaves selected" unreachable — an indeterminate state no
            // interaction can ever resolve, the same stuck-state class S4.5
            // fixed for the plain case.
            if (!node.disabled || selectedValues.includes(node.value)) {
              leafValues.push(node.value);
            }
          } else {
            collectLeafValues(node.children, depth + 1);
          }
        }
      };
      collectLeafValues(choice.children!, 0);
      const selectedLeafCount = leafValues.filter(val => selectedValues.includes(val)).length;
      if (selectedLeafCount === 0) return { checked: false, indeterminate: false };
      if (selectedLeafCount === leafValues.length) return { checked: true, indeterminate: false };
      return { checked: false, indeterminate: true };
    }

    return { checked: isSelected, indeterminate: selectedChildrenCount > 0 && !isSelected };
  }, [selectedValues, choice, hasChildren, valueCombining]);

  // Highlight search matches
  const highlightedText = useMemo(() => {
    if (!searchQuery) {
      return choice.text;
    }
    
    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = choice.text.split(new RegExp(`(${escapedQuery})`, 'gi'));
    return (
      <span>
        {parts.map((part, index) =>
          part.toLowerCase() === searchQuery.toLowerCase() ? (
            <mark key={index}>
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  }, [choice.text, searchQuery]);

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onToggle(choice.value, event.currentTarget.checked);
  };

  const toggleExpanded = () => {
    if (hasChildren) {
      setUserOverride(!expanded);
      setManuallyExpanded(!expanded);
    }
  };

  return (
    <Box role="treeitem" aria-expanded={hasChildren ? expanded : undefined}>
      <Group gap="xs" wrap="nowrap" align="flex-start">
        {/* Expansion toggle */}
        <ActionIcon
          variant="subtle"
          size="sm"
          onClick={toggleExpanded}
          style={{
            visibility: hasChildren ? 'visible' : 'hidden',
            marginLeft: level * 16,
          }}
          disabled={disabled}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
        </ActionIcon>

        {/* Checkbox */}
        <Checkbox
          checked={checked}
          indeterminate={indeterminate}
          onChange={handleCheckboxChange}
          disabled={disabled || choice.disabled}
          color={color}
          size="sm"
          label={highlightedText}
          aria-label={choice.text}
          wrapperProps={{
            'data-testid': `checkbox-${nodePath}`,
          }}
          styles={{
            label: {
              cursor: disabled ? 'default' : 'pointer',
            },
          }}
        />
      </Group>

      {/* Children */}
      {hasChildren && (
        <Collapse in={expanded}>
          <Stack gap="xs" ml="md" mt="xs">
            {choice.children!.map((child) => (
              <TreeNode
                key={child.__key}
                choice={child}
                selectedValues={selectedValues}
                onToggle={onToggle}
                valueCombining={valueCombining}
                searchQuery={searchQuery}
                showSelectionOnly={showSelectionOnly}
                disabled={disabled}
                level={level + 1}
                color={color}
                autoExpandValues={autoExpandValues}
                // V3-7: same stable child.__key used for the React key, not
                // the filtered-position childIndex.
                nodePath={`${nodePath}-${child.__key}`}
              />
            ))}
          </Stack>
        </Collapse>
      )}
    </Box>
  );
}

export default SelectMultipleCheckboxTree;
