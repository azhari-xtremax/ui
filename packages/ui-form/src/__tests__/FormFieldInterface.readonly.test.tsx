/**
 * FormFieldInterface — readonly-vs-disabled styling (S2.6).
 *
 * `readonly` and `disabled` are visually and semantically distinct: readonly
 * means the value is visible but not editable; disabled means the control is
 * greyed out and inert. A merely-readonly field must not also receive
 * disabled=true — every leaf already receives `readOnly` separately.
 * `nonEditable` is stronger (no interaction at all) and keeps disabled on
 * top of readOnly.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';

const received: { disabled: unknown; readOnly: unknown }[] = [];
jest.mock('@buildpad/ui-interfaces', () => ({
    Input: ({ disabled, readOnly }: any) => {
        received.push({ disabled, readOnly });
        return <input data-testid="probe" disabled={disabled} readOnly={readOnly} />;
    },
}));

jest.mock('@buildpad/utils', () => ({
    getFieldInterface: () => ({ type: 'input', props: {} }),
}));

import { FormFieldInterface } from '../components/FormFieldInterface';

const wrap = (ui: React.ReactNode) => <MantineProvider>{ui}</MantineProvider>;

const baseField = {
    collection: 'articles',
    field: 'title',
    name: 'Title',
    type: 'string',
    meta: {},
    schema: {},
} as any;

beforeEach(() => {
    received.length = 0;
});

describe('FormFieldInterface readonly-vs-disabled (S2.6)', () => {
    it('does not set disabled when only readonly is true', () => {
        render(wrap(<FormFieldInterface field={baseField} value="x" readonly />));

        expect(received.at(-1)).toEqual({ disabled: false, readOnly: true });
    });

    it('still sets disabled when the disabled prop is explicitly passed', () => {
        render(wrap(<FormFieldInterface field={baseField} value="x" disabled />));

        expect(received.at(-1)).toEqual({ disabled: true, readOnly: false });
    });

    it('sets both disabled and readOnly when nonEditable', () => {
        render(wrap(<FormFieldInterface field={baseField} value="x" nonEditable />));

        expect(received.at(-1)).toEqual({ disabled: true, readOnly: true });
    });

    it('sets neither when the field is fully editable', () => {
        render(wrap(<FormFieldInterface field={baseField} value="x" />));

        expect(received.at(-1)).toEqual({ disabled: false, readOnly: false });
    });
});
