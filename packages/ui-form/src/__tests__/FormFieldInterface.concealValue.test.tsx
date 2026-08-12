/**
 * FormFieldInterface — effectiveValue synthesis for hash/conceal fields.
 *
 * DaaS's server-side `conceal` transformer already distinguishes "no value"
 * (`null`) from "value exists" (`'**********'`) on read for conceal fields
 * (e.g. a system-token's `token` column). The synthesis here used to treat
 * an explicit `null` the same as an omitted (`undefined`) field and
 * unconditionally re-mask it to `'**********'` — so a just-cleared token
 * looked like it still existed, forever, since the client could never tell
 * the two states apart afterward.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';

const received: { value: unknown }[] = [];
jest.mock('@buildpad/ui-interfaces', () => ({
    SystemToken: ({ value }: any) => {
        received.push({ value });
        return <div data-testid="probe" />;
    },
    InputHash: ({ value }: any) => {
        received.push({ value });
        return <div data-testid="probe" />;
    },
}));

jest.mock('@buildpad/utils', () => ({
    getFieldInterface: (field: any) => ({ type: field.meta?.interface, props: {} }),
}));

import { FormFieldInterface } from '../components/FormFieldInterface';

const wrap = (ui: React.ReactNode) => <MantineProvider>{ui}</MantineProvider>;

const tokenField = {
    collection: 'daas_users',
    field: 'token',
    name: 'Token',
    meta: { interface: 'system-token', special: ['conceal'] },
    schema: {},
} as any;

const passwordField = {
    collection: 'daas_users',
    field: 'password',
    name: 'Password',
    meta: { interface: 'input-hash', special: ['hash'] },
    schema: {},
} as any;

beforeEach(() => {
    received.length = 0;
    jest.clearAllMocks();
});

describe('FormFieldInterface conceal-field value synthesis', () => {
    it('passes an explicit null straight through for a conceal field (no token set)', () => {
        render(wrap(<FormFieldInterface field={tokenField} value={null} />));
        expect(received.at(-1)?.value).toBeNull();
    });

    it('passes the masked value straight through for a conceal field (token set)', () => {
        render(wrap(<FormFieldInterface field={tokenField} value="**********" />));
        expect(received.at(-1)?.value).toBe('**********');
    });

    it('synthesizes the masked placeholder only when the field is omitted entirely', () => {
        render(wrap(<FormFieldInterface field={tokenField} value={undefined} />));
        expect(received.at(-1)?.value).toBe('**********');
    });

    it('still synthesizes the masked placeholder for an omitted hash field', () => {
        render(wrap(<FormFieldInterface field={passwordField} value={undefined} />));
        expect(received.at(-1)?.value).toBe('**********');
    });
});
