/**
 * Field Interface Mapper Unit Tests
 *
 * Covers the explicit `"input"` interface mapping: it must not inject a
 * hardcoded `type: "string"` prop, so the `type: field.type` passed by
 * FormFieldInterface survives and numeric fields render as number inputs.
 */

import { describe, it, expect } from 'vitest';
import { getFieldInterface, getFieldDefault } from '../src/field-interface-mapper';
import type { Field } from '@buildpad/types';

function makeField(overrides: Partial<Field> = {}): Field {
  return {
    collection: 'test_collection',
    field: 'test_field',
    type: 'string',
    ...overrides,
  };
}

describe('getFieldInterface — explicit "input" interface', () => {
  it('does not override the field type with a hardcoded "string" prop', () => {
    const field = makeField({
      type: 'integer',
      meta: { interface: 'input' } as Field['meta'],
    });

    const config = getFieldInterface(field);

    expect(config.type).toBe('input');
    expect(config.props?.type).toBeUndefined();
  });

  it('still allows meta.options to override the type prop', () => {
    const field = makeField({
      type: 'integer',
      meta: { interface: 'input', options: { type: 'string' } } as Field['meta'],
    });

    const config = getFieldInterface(field);

    expect(config.type).toBe('input');
    expect(config.props?.type).toBe('string');
  });

  it('passes through other meta.options as props', () => {
    const field = makeField({
      type: 'decimal',
      meta: { interface: 'input', options: { placeholder: 'Amount' } } as Field['meta'],
    });

    const config = getFieldInterface(field);

    expect(config.type).toBe('input');
    expect(config.props?.placeholder).toBe('Amount');
    expect(config.props?.type).toBeUndefined();
  });

  it('keeps the string fallback for fields without an explicit interface', () => {
    const field = makeField({ type: 'string' });

    const config = getFieldInterface(field);

    expect(config.type).toBe('input');
    expect(config.props?.type).toBe('string');
  });
});

describe('getFieldDefault', () => {
  // Postgres reports a typed literal default with a `::type` cast suffix
  // (e.g. `'active'::character varying`) — the cast must be stripped before
  // the quote/number parsing, or a string default is returned unparsed
  // (still wrapped in quotes and the cast) and a numeric default never
  // matches Number().
  it('strips the ::type cast suffix from a quoted string default', () => {
    const field = makeField({
      schema: { default_value: "'active'::character varying" } as Field['schema'],
    });

    expect(getFieldDefault(field)).toBe('active');
  });

  it('strips the ::type cast suffix from a numeric default', () => {
    const field = makeField({
      type: 'integer',
      schema: { default_value: '0::integer' } as Field['schema'],
    });

    expect(getFieldDefault(field)).toBe(0);
  });

  it('still handles an unquoted, uncast string default', () => {
    const field = makeField({
      schema: { default_value: 'auto' } as Field['schema'],
    });

    expect(getFieldDefault(field)).toBe('auto');
  });

  it('still handles a plain quoted string default with no cast', () => {
    const field = makeField({
      schema: { default_value: "'en-US'" } as Field['schema'],
    });

    expect(getFieldDefault(field)).toBe('en-US');
  });

  it('returns undefined for function-generated defaults', () => {
    const field = makeField({
      schema: { default_value: 'gen_random_uuid()' } as Field['schema'],
    });

    expect(getFieldDefault(field)).toBeUndefined();
  });

  it('returns undefined when there is no default', () => {
    const field = makeField({ schema: { default_value: null } as Field['schema'] });

    expect(getFieldDefault(field)).toBeUndefined();
  });
});
