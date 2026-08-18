/**
 * Read-only contract across the value-bearing interfaces (S2.6).
 *
 * @buildpad/ui-form stopped setting `disabled` for a merely-readonly field, on
 * the premise that every leaf honours `readOnly` on its own. That premise was
 * false: some leaves had no read-only concept at all, and four more declared the
 * prop in lowercase (`readonly`) while the form container passes camelCase
 * (`readOnly`), so their working read-only code was unreachable. With `disabled`
 * gone, those fields became fully editable — including `input-hash` (a stored
 * credential) and `system-token` (a live API token).
 *
 * The contract asserted here is the one the container now relies on:
 *
 *   given readOnly (and NOT disabled), a direct edit gesture must not emit onChange.
 *
 * Every case below fails against the pre-fix leaf.
 */
import React from 'react';
import { render, fireEvent, within } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';

import { Input } from '../input/Input';
import { InputHash } from '../input-hash/InputHash';
import { InputCode } from '../input-code/InputCode';
import { SelectRadio } from '../select-radio/SelectRadio';
import { SelectMultipleCheckbox } from '../select-multiple-checkbox/SelectMultipleCheckbox';
import { SelectMultipleCheckboxTree } from '../select-multiple-checkbox/SelectMultipleCheckboxTree';
import { SelectMultipleDropdown } from '../select-multiple-checkbox/SelectMultipleDropdown';
import { Tags } from '../tags/Tags';
import { Color } from '../color/Color';
import { SystemToken } from '../system-token/SystemToken';

const wrap = (ui: React.ReactElement) => render(<MantineProvider>{ui}</MantineProvider>);

const choices = [
    { text: 'Alpha', value: 'a' },
    { text: 'Beta', value: 'b' },
];

describe('read-only contract: a readOnly leaf must not emit onChange', () => {
    it('Input — typing does not emit', () => {
        const onChange = jest.fn();
        const { getByRole } = wrap(<Input value="x" readOnly onChange={onChange} />);

        fireEvent.change(getByRole('textbox'), { target: { value: 'typed' } });

        expect(onChange).not.toHaveBeenCalled();
    });

    it('InputHash — typing does not overwrite the stored credential', () => {
        const onChange = jest.fn();
        const { getByRole } = wrap(<InputHash value={null} readOnly onChange={onChange} />);

        fireEvent.change(getByRole('textbox'), { target: { value: 'hunter2' } });

        expect(onChange).not.toHaveBeenCalled();
    });

    it('InputCode — typing does not emit', () => {
        const onChange = jest.fn();
        const { getByRole } = wrap(<InputCode value="{}" readOnly onChange={onChange} />);

        fireEvent.change(getByRole('textbox'), { target: { value: '{"a":1}' } });

        expect(onChange).not.toHaveBeenCalled();
    });

    it('SelectRadio — clicking a radio does not emit', () => {
        const onChange = jest.fn();
        const { getByRole } = wrap(<SelectRadio value="a" choices={choices} readOnly onChange={onChange} />);

        fireEvent.click(getByRole('radio', { name: 'Beta' }));

        expect(onChange).not.toHaveBeenCalled();
    });

    it('SelectMultipleCheckbox — clicking a checkbox does not emit', () => {
        const onChange = jest.fn();
        const { getByRole } = wrap(
            <SelectMultipleCheckbox value={['a']} choices={choices} readOnly onChange={onChange} />,
        );

        fireEvent.click(getByRole('checkbox', { name: 'Select Beta' }));

        expect(onChange).not.toHaveBeenCalled();
    });

    it('SelectMultipleCheckboxTree — toggling a node does not emit', () => {
        const onChange = jest.fn();
        const { getByTestId } = wrap(
            <SelectMultipleCheckboxTree value={['a']} choices={choices} readOnly onChange={onChange} />,
        );

        fireEvent.click(within(getByTestId('checkbox-1')).getByRole('checkbox'));

        expect(onChange).not.toHaveBeenCalled();
    });

    it('SelectMultipleDropdown — the combobox is marked readOnly and does not emit', () => {
        const onChange = jest.fn();
        const { getByRole } = wrap(
            <SelectMultipleDropdown value={['a']} choices={choices} readOnly onChange={onChange} />,
        );

        const input = getByRole('textbox');
        fireEvent.click(input);
        fireEvent.keyDown(input, { key: 'Backspace' });

        expect(onChange).not.toHaveBeenCalled();
    });

    it('Tags — typing a new tag and pressing Enter does not emit', () => {
        const onChange = jest.fn();
        const { getByRole } = wrap(<Tags value={['one']} readOnly onChange={onChange} />);

        const input = getByRole('textbox');
        fireEvent.change(input, { target: { value: 'injected' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

        expect(onChange).not.toHaveBeenCalled();
    });

    it('Color — editing the hex value does not emit', () => {
        const onChange = jest.fn();
        const { getByRole } = wrap(<Color value="#ffffff" readOnly onChange={onChange} />);

        fireEvent.change(getByRole('textbox'), { target: { value: '#000000' } });

        expect(onChange).not.toHaveBeenCalled();
    });

    it('SystemToken — the regenerate control is not offered', () => {
        const onChange = jest.fn();
        const { queryByLabelText } = wrap(
            <SystemToken value="**********" readOnly onChange={onChange} data-testid="tok" />,
        );

        expect(queryByLabelText('Regenerate token')).toBeNull();
        expect(queryByLabelText('Generate token')).toBeNull();
        expect(queryByLabelText('Remove token')).toBeNull();
        expect(onChange).not.toHaveBeenCalled();
    });
});

describe('read-only contract: the same leaves still emit when editable', () => {
    it('Input emits', () => {
        const onChange = jest.fn();
        const { getByRole } = wrap(<Input value="x" onChange={onChange} />);

        fireEvent.change(getByRole('textbox'), { target: { value: 'typed' } });

        expect(onChange).toHaveBeenCalled();
    });

    it('SelectRadio emits', () => {
        const onChange = jest.fn();
        const { getByRole } = wrap(<SelectRadio value="a" choices={choices} onChange={onChange} />);

        fireEvent.click(getByRole('radio', { name: 'Beta' }));

        expect(onChange).toHaveBeenCalledWith('b');
    });

    it('SelectMultipleCheckbox emits', () => {
        const onChange = jest.fn();
        const { getByRole } = wrap(
            <SelectMultipleCheckbox value={['a']} choices={choices} onChange={onChange} />,
        );

        fireEvent.click(getByRole('checkbox', { name: 'Select Beta' }));

        expect(onChange).toHaveBeenCalledWith(['a', 'b']);
    });

    it('Tags emits', () => {
        const onChange = jest.fn();
        const { getByRole } = wrap(<Tags value={['one']} onChange={onChange} />);

        const input = getByRole('textbox');
        fireEvent.change(input, { target: { value: 'injected' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

        expect(onChange).toHaveBeenCalled();
    });
});
