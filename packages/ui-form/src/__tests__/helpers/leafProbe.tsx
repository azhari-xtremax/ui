/**
 * Shared probe leaf for the FormField / FormFieldInterface prop-forwarding
 * tests.
 *
 * `@buildpad/ui-interfaces` has no jest moduleNameMapper entry, so these tests
 * mock the whole module down to a single fake leaf and assert on the props the
 * container hands it. Both test files previously carried their own copy of this
 * harness; keeping one copy means a new assertion (onChange suppression,
 * required, autofocus) is added in one place.
 *
 * Usage — the jest.mock factory may not close over out-of-scope variables, so
 * pull the factory in through require():
 *
 *   jest.mock('@buildpad/ui-interfaces', () =>
 *     require('./helpers/leafProbe').makeInterfacesMock());
 *   import { received, resetProbe } from './helpers/leafProbe';
 */

export interface ProbeRecord {
    disabled: unknown;
    readOnly: unknown;
    required: unknown;
    autofocus: unknown;
    /** True when the container passed a live onChange (i.e. writes are allowed). */
    hasOnChange: boolean;
    /** Calls the leaf made — populated by tests that fire an edit. */
    onChange?: (value: unknown) => void;
}

export const received: ProbeRecord[] = [];

export function resetProbe(): void {
    received.length = 0;
}

/** Props the last render handed the leaf. */
export function lastProps(): ProbeRecord | undefined {
    return received.at(-1);
}

/** The disabled/readOnly pair alone — the S2.6 assertion most tests care about. */
export function lastLockState(): { disabled: unknown; readOnly: unknown } | undefined {
    const p = received.at(-1);
    return p && { disabled: p.disabled, readOnly: p.readOnly };
}

export function makeInterfacesMock() {
    const Probe = ({ disabled, readOnly, required, autofocus, onChange }: any) => {
        received.push({
            disabled,
            readOnly,
            required,
            autofocus,
            hasOnChange: typeof onChange === 'function',
            onChange,
        });
        return (
            <input
                data-testid="probe"
                disabled={disabled}
                readOnly={readOnly}
                required={required}
                onChange={(e) => onChange?.(e.currentTarget.value)}
            />
        );
    };

    // Every interface name the tests may resolve to maps onto the same probe, so
    // a test can change field type without touching the mock.
    return new Proxy(
        { Input: Probe },
        {
            get: (target: any, prop: string) =>
                prop in target ? target[prop] : typeof prop === 'string' && /^[A-Z]/.test(prop) ? Probe : undefined,
        },
    );
}
