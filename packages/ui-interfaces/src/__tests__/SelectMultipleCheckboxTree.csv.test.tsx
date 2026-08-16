/**
 * SelectMultipleCheckboxTree — standalone csv/null handling.
 *
 * The interface catalog registers this component for `types: ['json', 'csv']`,
 * and the registry ships this file on its own (`internalDependencies: []`), so
 * a CLI-installed consumer renders it directly with no FormFieldInterface in
 * front of it to normalize the value. Its two siblings already carry the
 * `type` + normalize + re-serialize trio; this pins the same contract here.
 *
 * Every case below fails against the pre-fix component.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { SelectMultipleCheckboxTree } from '../select-multiple-checkbox/SelectMultipleCheckboxTree';

const wrap = (ui: React.ReactElement) => render(<MantineProvider>{ui}</MantineProvider>);

const boxes = (c: HTMLElement) =>
    Array.from(c.querySelectorAll('input[type=checkbox]')) as HTMLInputElement[];

// Values chosen so that a naive String.includes() substring match would give a
// different (wrong) answer than a real array membership test.
const overlapping = [
    { text: 'apple', value: 'apple' },
    { text: 'app', value: 'app' },
    { text: 'p', value: 'p' },
    { text: 'banana', value: 'banana' },
];

describe('SelectMultipleCheckboxTree — csv storage', () => {
    it('reads a comma-string without substring false-positives', () => {
        const { container } = wrap(
            <SelectMultipleCheckboxTree type="csv" value={'apple'} choices={overlapping} />,
        );

        // Only "apple" is stored. "app" and "p" are substrings of it, so a
        // String.includes() read would mark all three checked.
        expect(boxes(container).map((b) => b.checked)).toEqual([true, false, false, false]);
    });

    it('re-serializes to a comma-string on change', () => {
        const onChange = jest.fn();
        const { container } = wrap(
            <SelectMultipleCheckboxTree type="csv" value={'apple'} choices={overlapping} onChange={onChange} />,
        );

        fireEvent.click(boxes(container)[3]); // tick "banana"

        expect(onChange).toHaveBeenCalledWith('apple,banana');
    });

    it('does not throw when unchecking (the .filter-on-a-string crash)', () => {
        const onChange = jest.fn();
        const { container } = wrap(
            <SelectMultipleCheckboxTree type="csv" value={'apple,banana'} choices={overlapping} onChange={onChange} />,
        );

        expect(() => fireEvent.click(boxes(container)[0])).not.toThrow();
        expect(onChange).toHaveBeenCalledWith('banana');
    });

    it('restores the original type of numeric choice values parsed out of csv', () => {
        const numeric = [
            { text: 'React', value: 1 },
            { text: 'Node', value: 2 },
            { text: 'NodeJS', value: 3 },
        ];
        const onChange = jest.fn();
        const { container } = wrap(
            <SelectMultipleCheckboxTree type="csv" value={'1,3'} choices={numeric} onChange={onChange} />,
        );

        // A csv column stores text, so a naive split yields the strings '1','3'
        // while the choices carry numbers — SameValueZero would never match.
        expect(boxes(container).map((b) => b.checked)).toEqual([true, false, true]);

        // ...and the click must not append a duplicate of an already-set value.
        fireEvent.click(boxes(container)[1]); // tick "Node"
        expect(onChange).toHaveBeenCalledWith('1,3,2');
    });

    it('infers csv storage from an observed string even without the type prop', () => {
        const onChange = jest.fn();
        const { container } = wrap(
            <SelectMultipleCheckboxTree value={'apple'} choices={overlapping} onChange={onChange} />,
        );

        expect(boxes(container).map((b) => b.checked)).toEqual([true, false, false, false]);
        fireEvent.click(boxes(container)[3]);
        expect(onChange).toHaveBeenCalledWith('apple,banana');
    });
});

describe('SelectMultipleCheckboxTree — array storage is unchanged', () => {
    it('reads an array and emits an array', () => {
        const onChange = jest.fn();
        const { container } = wrap(
            <SelectMultipleCheckboxTree type="json" value={['apple']} choices={overlapping} onChange={onChange} />,
        );

        expect(boxes(container).map((b) => b.checked)).toEqual([true, false, false, false]);
        fireEvent.click(boxes(container)[3]);
        expect(onChange).toHaveBeenCalledWith(['apple', 'banana']);
    });
});

describe('SelectMultipleCheckboxTree — nullish value', () => {
    it('renders with a null value (the initial state of a nullable column)', () => {
        // `value = []` is a destructuring default and fires only for undefined,
        // so a null used to reach selectedValues.includes() and crash on mount.
        expect(() => wrap(<SelectMultipleCheckboxTree value={null} choices={overlapping} />)).not.toThrow();
    });

    it('renders with an undefined value', () => {
        expect(() => wrap(<SelectMultipleCheckboxTree choices={overlapping} />)).not.toThrow();
    });
});
