/**
 * Every field interface renders the `data-testid` it is handed.
 *
 * VForm hands each resolved interface a `data-testid` of `field-<fieldName>`
 * (see FormFieldInterface). That hook is only worth anything if the interface
 * actually puts it in the DOM, and eight of them used to drop it silently:
 * they neither declared the prop nor passed unknown props on to a DOM node,
 * so `getByTestId('field-<name>')` found nothing for a textarea, a date, a
 * colour or any of the select interfaces.
 *
 * This is a contract test over the interfaces a form renders directly, so a
 * new one cannot quietly go back to swallowing the hook.
 */
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';

import { Boolean as BooleanInterface } from '../boolean/Boolean';
import { Color } from '../color';
import { DateTime } from '../datetime/DateTime';
import { Divider } from '../divider';
import { Input } from '../input/Input';
import { InputCode } from '../input-code/InputCode';
import { InputHash } from '../input-hash/InputHash';
import { Notice } from '../notice';
import { SelectDropdown } from '../select-dropdown/SelectDropdown';
import { SelectIcon } from '../select-icon';
import {
    SelectMultipleCheckbox,
    SelectMultipleCheckboxTree,
    SelectMultipleDropdown,
} from '../select-multiple-checkbox';
import { SelectRadio } from '../select-radio/SelectRadio';
import { Slider } from '../slider/Slider';
import { SystemToken } from '../system-token/SystemToken';
import { Tags } from '../tags/Tags';
import { Textarea } from '../textarea/Textarea';
import { Toggle } from '../toggle/Toggle';

const choices = [
    { text: 'A', value: 'a' },
    { text: 'B', value: 'b' },
];

/** [name, component, the props it needs to render at all] */
const INTERFACES: Array<[string, React.ComponentType<any>, Record<string, unknown>]> = [
    ['Boolean', BooleanInterface, { value: false }],
    ['Color', Color, { value: null }],
    ['DateTime', DateTime, { value: null }],
    ['Divider', Divider, {}],
    ['Input', Input, { value: '' }],
    ['InputCode', InputCode, { value: '' }],
    ['InputHash', InputHash, { value: '' }],
    ['Notice', Notice, { text: 'hi' }],
    ['SelectDropdown', SelectDropdown, { value: null, choices }],
    ['SelectIcon', SelectIcon, { value: null }],
    ['SelectMultipleCheckbox', SelectMultipleCheckbox, { value: [], choices }],
    ['SelectMultipleCheckboxTree', SelectMultipleCheckboxTree, { value: [], choices }],
    ['SelectMultipleDropdown', SelectMultipleDropdown, { value: [], choices }],
    ['SelectRadio', SelectRadio, { value: null, choices }],
    ['Slider', Slider, { value: 1 }],
    ['SystemToken', SystemToken, { value: '' }],
    ['Tags', Tags, { value: [] }],
    ['Textarea', Textarea, { value: '' }],
    ['Toggle', Toggle, { value: false }],
];

describe('field interfaces forward data-testid', () => {
    afterEach(cleanup);

    it.each(INTERFACES)('%s renders the testid it is handed', (_name, Component, props) => {
        render(
            <MantineProvider>
                {React.createElement(Component, {
                    ...props,
                    onChange: () => {},
                    'data-testid': 'field-probe',
                })}
            </MantineProvider>,
        );

        // Exactly one element carries the id itself. Interfaces that derive
        // sub-ids from it (InputHash, SystemToken, ...) add their own suffixed
        // ids, which must not collide with the field's own hook.
        expect(document.querySelectorAll('[data-testid="field-probe"]')).toHaveLength(1);
    });

    it('keeps SelectDropdown\'s own testid when the form supplies none', () => {
        render(
            <MantineProvider>
                <SelectDropdown value={null} choices={choices} onChange={() => {}} />
            </MantineProvider>,
        );

        expect(screen.getByTestId('select-dropdown')).toBeInTheDocument();
    });
});
