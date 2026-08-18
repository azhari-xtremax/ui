/**
 * Provisionable interface catalog unit tests
 *
 * Covers the type-aware interface picker data source:
 * `provisionableInterfacesForType(type)` filters by the interface `types`, and
 * every catalog entry uses a renderer-recognized id + valid field types.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Field } from '@buildpad/types';
import {
  PROVISIONABLE_INTERFACES,
  provisionableInterfacesForType,
  CHOICE_INTERFACES,
  interfaceRequiresChoices,
  resolveChoiceLabel,
  parseChoiceValues,
  splitCsvValue,
} from '../src/interface-catalog';
import { getFieldInterface } from '../src/field-interface-mapper';

const registryJson = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../registry.json', import.meta.url)), 'utf8'),
) as {
  components?: {
    interface?: {
      id: string;
      group: string;
      types: string[];
      supported?: boolean;
    };
  }[];
};

/** Field types in the `FieldType` union (interface-types.ts). */
const VALID_FIELD_TYPES = new Set([
  'string', 'text', 'boolean', 'integer', 'bigInteger', 'float', 'decimal',
  'timestamp', 'dateTime', 'date', 'time', 'json', 'csv', 'uuid', 'hash',
  'binary', 'alias', 'geometry', 'unknown',
]);

const valuesFor = (type: string) =>
  provisionableInterfacesForType(type).map((i) => i.value);

describe('provisionableInterfacesForType', () => {
  it('returns only boolean interfaces for a boolean type', () => {
    expect(valuesFor('boolean')).toEqual(['boolean', 'toggle']);
  });

  it('returns the json-compatible interfaces (and not text-only input)', () => {
    const json = valuesFor('json');
    expect(json).toEqual(
      expect.arrayContaining([
        'input-code',
        'tags',
        'select-multiple-checkbox',
        'select-multiple-checkbox-tree',
        'select-multiple-dropdown',
      ]),
    );
    expect(json).not.toContain('input');
  });

  // csv had no assertion of its own, so the second half of every
  // `types: ['json','csv']` entry was unpinned. Exhaustive on purpose: a new
  // csv-compatible interface must be added here deliberately, because a
  // comma-string value only round-trips if that leaf normalizes it.
  it('returns exactly the csv-compatible interfaces', () => {
    expect(valuesFor('csv')).toEqual([
      'tags',
      'select-multiple-checkbox',
      'select-multiple-checkbox-tree',
      'select-multiple-dropdown',
    ]);
  });

  it('maps every temporal type to the datetime picker', () => {
    for (const t of ['dateTime', 'date', 'time', 'timestamp']) {
      expect(valuesFor(t)).toContain('datetime');
    }
  });

  it('returns [] for a type with no provisionable interface', () => {
    expect(provisionableInterfacesForType('binary')).toEqual([]);
    expect(provisionableInterfacesForType('not-a-type')).toEqual([]);
  });

  it('offers the map interface for geometry', () => {
    expect(valuesFor('geometry')).toEqual(['map']);
  });
});

describe('PROVISIONABLE_INTERFACES integrity', () => {
  // Proof that every offered interface is RECOGNIZED by the real renderer
  // resolver (`getFieldInterface`) rather than falling through to the silent
  // type-based default. Note the limit of this check: each `case` in
  // field-interface-mapper returns the same literal id it matched on, so this
  // cannot show the resolved config is correct — only that the id is known.
  //
  // Parameterized over EVERY declared type, not just `types[0]`. With only the
  // first type, half of every `['json','csv']` entry went unexercised — which
  // is exactly where the checkbox-tree csv gap lived.
  it.each(
    PROVISIONABLE_INTERFACES.flatMap((i) => i.types.map((t) => [i.value, t] as const)),
  )(
    'interface "%s" resolves to its own renderer component for type "%s"',
    (value, type) => {
      const field = {
        collection: '__preview__',
        field: 'f',
        type,
        meta: { id: -1, collection: '__preview__', field: 'f', interface: value },
      } as unknown as Field;
      expect(getFieldInterface(field).type).toBe(value);
    },
  );

  it('every entry declares at least one valid field type', () => {
    for (const i of PROVISIONABLE_INTERFACES) {
      expect(i.types.length).toBeGreaterThan(0);
      for (const t of i.types) expect(VALID_FIELD_TYPES.has(t)).toBe(true);
    }
  });

  it('has no duplicate interface ids', () => {
    const values = PROVISIONABLE_INTERFACES.map((i) => i.value);
    expect(new Set(values).size).toBe(values.length);
  });
});

/**
 * The catalog is hand-maintained while `registry.json` is generated and
 * CI-gated, so the catalog can silently fall behind — which is exactly how the
 * `select-multiple-checkbox-tree` entry came to be missing. Every existing
 * integrity check walks catalog → mapper; these walk registry → catalog, the
 * direction that bug ran.
 */
describe('PROVISIONABLE_INTERFACES vs registry.json', () => {
  /** registry.json groups whose interfaces sit on a single provisionable column. */
  const PROVISIONABLE_GROUPS = new Set(['standard', 'selection']);

  /**
   * registry id → catalog id, for the documented divergence between the
   * registry/DaaS ids and the renderer ids `getFieldInterface` resolves
   * (see the interface-catalog module docstring).
   */
  const RENDERER_ID_ALIASES: Record<string, string> = {
    'input-tags': 'tags',
    'input-map': 'map',
    'input-map-gl': 'map',
  };

  /**
   * Deliberately not provisionable, with the reason. Anything else in a
   * provisionable group that is missing from the catalog is an omission.
   */
  const INTENTIONALLY_EXCLUDED: Record<string, string> = {
    // Needs meta.options.url (plus resultsPath/textPath/valuePath) pointing at
    // an external endpoint; AutocompleteApi no-ops without it and the builder
    // has no editor for those options, so it is not provisionable from a
    // column type alone.
    'input-autocomplete-api': 'requires an external API endpoint in meta.options',
  };

  const registryInterfaces = (registryJson.components ?? [])
    .map((c) => c.interface)
    .filter((i): i is NonNullable<typeof i> => Boolean(i))
    .filter((i) => i.supported !== false);

  const catalogById = new Map(PROVISIONABLE_INTERFACES.map((i) => [i.value, i]));

  it('reads a non-empty registry (guards against a silently vacuous suite)', () => {
    expect(registryInterfaces.length).toBeGreaterThan(0);
  });

  it('offers every supported registry interface in a provisionable group', () => {
    const missing = registryInterfaces
      .filter((i) => PROVISIONABLE_GROUPS.has(i.group))
      .map((i) => RENDERER_ID_ALIASES[i.id] ?? i.id)
      .filter((id) => !catalogById.has(id) && !(id in INTENTIONALLY_EXCLUDED));

    expect(missing).toEqual([]);
  });

  it('declares the same types as the registry for every shared interface', () => {
    const mismatched = registryInterfaces
      .map((i) => ({ entry: catalogById.get(RENDERER_ID_ALIASES[i.id] ?? i.id), registry: i }))
      .filter((p) => p.entry)
      .filter((p) => JSON.stringify(p.entry!.types) !== JSON.stringify(p.registry.types))
      .map((p) => `${p.registry.id}: catalog ${JSON.stringify(p.entry!.types)} vs registry ${JSON.stringify(p.registry.types)}`);

    expect(mismatched).toEqual([]);
  });
});

describe('CHOICE_INTERFACES / interfaceRequiresChoices (S4.4/S8.4)', () => {
  // Both halves of the checkbox-tree change are new: before it, neither the
  // AddFieldModal picker nor the FieldPalette (both driven by
  // PROVISIONABLE_INTERFACES) offered the interface at all, so it could not
  // have reached the choices editor either.
  it('includes select-multiple-checkbox-tree alongside the other choice-authoring interfaces', () => {
    expect(CHOICE_INTERFACES.has('select-multiple-checkbox-tree')).toBe(true);
    expect(interfaceRequiresChoices('select-multiple-checkbox-tree')).toBe(true);
  });

  // The relation nobody else asserts. A choice interface that is not
  // provisionable would make interfaceRequiresChoices gate a save for a field
  // the builder can never create; negative cases for interfaceRequiresChoices
  // are already covered in ui-forms/tests/new-field.test.ts.
  it('every choice interface is also provisionable', () => {
    const provisionable = new Set(PROVISIONABLE_INTERFACES.map((i) => i.value));
    for (const value of CHOICE_INTERFACES) {
      expect(provisionable.has(value)).toBe(true);
    }
  });
});

// These two are the shared half of the choice-label resolution: the list, the
// form and any consumer that installs them from the registry must all agree on
// what a stored value means, so they are pinned here rather than only through
// the component that happens to call them today.
describe('resolveChoiceLabel', () => {
  const choices = [
    { text: 'Draft', value: 'draft' },
    { text: 'Number one', value: 1 },
    { text: 'Enabled', value: true },
  ];

  it('resolves a value to its configured label', () => {
    expect(resolveChoiceLabel(choices, 'draft')).toBe('Draft');
    expect(resolveChoiceLabel(choices, 1)).toBe('Number one');
    expect(resolveChoiceLabel(choices, true)).toBe('Enabled');
  });

  // Backends report the same column as a number or a string depending on the
  // driver, so a stored 1 has to find a choice authored as "1" and vice versa.
  it('falls back to a stringified comparison', () => {
    expect(resolveChoiceLabel(choices, '1')).toBe('Number one');
    expect(resolveChoiceLabel([{ text: 'One', value: '1' }], 1)).toBe('One');
  });

  // The loose pass must never pre-empt an exact one, or two choices that
  // stringify alike resolve to whichever was authored first.
  it('prefers an exact match over a stringified match earlier in the list', () => {
    const ambiguous = [
      { text: 'String one', value: '1' },
      { text: 'Number one', value: 1 },
    ];
    expect(resolveChoiceLabel(ambiguous, 1)).toBe('Number one');
    expect(resolveChoiceLabel(ambiguous, '1')).toBe('String one');
  });

  it('returns undefined when nothing matches, so callers can tell it apart from an empty label', () => {
    expect(resolveChoiceLabel(choices, 'archived')).toBeUndefined();
    expect(resolveChoiceLabel([{ text: '', value: 'x' }], 'x')).toBe('');
  });
});

describe('parseChoiceValues', () => {
  const choices = [
    { text: 'Draft', value: 'draft' },
    { text: 'In review', value: 'review' },
  ];

  it('reads every storage shape a multi-select arrives in', () => {
    expect(parseChoiceValues(['draft', 'review'], choices)).toEqual(['draft', 'review']);
    expect(parseChoiceValues('["draft","review"]', choices)).toEqual(['draft', 'review']);
    expect(parseChoiceValues('draft,review', choices)).toEqual(['draft', 'review']);
    expect(parseChoiceValues(' draft , review ', choices)).toEqual(['draft', 'review']);
  });

  it('returns null for a single choice rather than a one-entry array', () => {
    expect(parseChoiceValues('draft', choices)).toBeNull();
    expect(parseChoiceValues(1, choices)).toBeNull();
    expect(parseChoiceValues(null, choices)).toBeNull();
  });

  // A configured value may itself contain a comma; splitting before matching
  // would make that choice permanently unresolvable.
  it('does not split a value that is itself a configured choice', () => {
    const withComma = [{ text: 'Amsterdam', value: 'Amsterdam, NL' }];
    expect(parseChoiceValues('Amsterdam, NL', withComma)).toBeNull();
  });

  it('falls back to csv when a bracketed string is not valid json', () => {
    expect(parseChoiceValues('[draft,review', choices)).toEqual(['[draft', 'review']);
  });

  // A json object is not a collection of choices, and must not be mistaken
  // for one just because it parses.
  it('returns null for json that is not an array', () => {
    expect(parseChoiceValues('{"a":1}', choices)).toBeNull();
  });

  it('preserves an empty array so callers can distinguish it from a single value', () => {
    expect(parseChoiceValues([], choices)).toEqual([]);
  });
});

describe('splitCsvValue', () => {
  it('trims entries and drops empty ones', () => {
    expect(splitCsvValue('a, b ,,c,')).toEqual(['a', 'b', 'c']);
    expect(splitCsvValue('')).toEqual([]);
    expect(splitCsvValue(' , ')).toEqual([]);
  });
});
