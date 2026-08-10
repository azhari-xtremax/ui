/**
 * FormFieldInterface — csv-string/array normalization for multi-select
 * interfaces.
 *
 * Multi-select interfaces are registered for both `json` (array) and `csv`
 * (comma-string) storage, but the leaves are array-only. The pipeline must
 * coerce a csv string to an array on the way in and back to a comma-string
 * on the way out — including for fields whose backend reports the physical
 * column type (e.g. `text`) instead of `csv`, detected by observing a
 * string value.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';

// Probe leaf: records the value prop it receives and emits a fixed array on
// click, exactly like the real multi-select leaves (which always emit arrays).
const received: { value: unknown }[] = [];
jest.mock('@buildpad/ui-interfaces', () => ({
    SelectMultipleCheckbox: ({ value, onChange }: any) => {
        received.push({ value });
        return (
            <button data-testid="probe-emit" onClick={() => onChange?.(['a', 'b'])}>
                emit
            </button>
        );
    },
}));

jest.mock('@buildpad/utils', () => ({
    getFieldInterface: () => ({ type: 'select-multiple-checkbox', props: {} }),
}));

import { FormFieldInterface } from '../components/FormFieldInterface';

const wrap = (ui: React.ReactNode) => <MantineProvider>{ui}</MantineProvider>;

const baseField = {
    collection: 'articles',
    field: 'tags',
    name: 'Tags',
    meta: {},
    schema: {},
} as any;

beforeEach(() => {
    received.length = 0;
    jest.clearAllMocks();
});

describe('FormFieldInterface csv normalization', () => {
    it('delivers a csv string to the leaf as a trimmed array', () => {
        render(
            wrap(
                <FormFieldInterface
                    field={{ ...baseField, type: 'csv' }}
                    value="alpha, beta ,gamma"
                />,
            ),
        );

        expect(received.at(-1)?.value).toEqual(['alpha', 'beta', 'gamma']);
    });

    it('joins the leaf-emitted array back to a comma-string for csv fields', () => {
        const onChange = jest.fn();
        render(
            wrap(
                <FormFieldInterface
                    field={{ ...baseField, type: 'csv' }}
                    value="alpha"
                    onChange={onChange}
                />,
            ),
        );

        fireEvent.click(screen.getByTestId('probe-emit'));
        expect(onChange).toHaveBeenCalledWith('a,b');
    });

    it('round-trips string storage even when the field type is reported as text', () => {
        const onChange = jest.fn();
        render(
            wrap(
                <FormFieldInterface
                    field={{ ...baseField, type: 'text' }}
                    value="x,y"
                    onChange={onChange}
                />,
            ),
        );

        expect(received.at(-1)?.value).toEqual(['x', 'y']);
        fireEvent.click(screen.getByTestId('probe-emit'));
        expect(onChange).toHaveBeenCalledWith('a,b');
    });

    it('passes real arrays through untouched for json fields, in and out', () => {
        const onChange = jest.fn();
        render(
            wrap(
                <FormFieldInterface
                    field={{ ...baseField, type: 'json' }}
                    value={['x']}
                    onChange={onChange}
                />,
            ),
        );

        expect(received.at(-1)?.value).toEqual(['x']);
        fireEvent.click(screen.getByTestId('probe-emit'));
        expect(onChange).toHaveBeenCalledWith(['a', 'b']);
    });
});
