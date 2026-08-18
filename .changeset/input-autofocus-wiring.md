---
"@buildpad/ui-collections": patch
"@buildpad/ui-form": patch
"@buildpad/ui-interfaces": patch
---

Autofocus works end to end, and `Input`'s numeric branch stops losing values.

`FormFieldInterface` forwards `autofocus` to every leaf, but `Input` destructured it only as `_autofocus` and discarded it, so the field never received focus on mount. Wiring it up exposed the rest of the path, which is fixed here too.

**`Input`** now applies it as Mantine's `autoFocus`, accepting both spellings (`autofocus` from the form pipeline, `autoFocus` for a direct consumer) and comparing strictly — `meta.options` is unvalidated admin JSON, and a truthy string like `"false"` was turning focus on. It is declared *after* the rest spread, so an `autoFocus` key in that JSON can no longer override or erase the container's decision. The control also carries `data-autofocus` when focused: Mantine's focus trap fires from a `setTimeout` after React's mount focus and targets that marker, so without it the trap pulled focus to the modal close button and the feature was dead inside the O2M/M2M drawers, which is where nested create forms actually live.

**`FormFieldInterface`** moves `autofocus` and `required` below the `meta.options` spread, alongside the lock props. Both sat above it, so an admin-authored `autofocus: true` on a readonly field defeated "never steal initial focus into a field that cannot be edited" — and a readonly input is still focusable.

**`VForm`** resolves the field *key* to focus rather than an index. The old predicate (`!meta.readonly`) was much weaker than the rule enforced downstream by `isFieldReadOnly`, ignored permission-readonly fields, and counted dividers, notices and group headers — so on the commonest schema shape, an auto-increment `id` first, index 0 won, `FormFieldInterface` then zeroed the flag, and nothing in the form was focused. Resolving to a key also lets the group branch forward it, so a form whose fields live inside a section can focus at all; `FormGroupField` passes it to its children.

**`CollectionForm`** no longer drives VForm's `loading` with `saving`. VForm renders a skeleton while loading, which unmounted every field and remounted them when the save resolved — re-firing mount-time focus and scrolling the user back to that field. `disabled` already blocks input during a save.

**`Textarea`** accepts `aria-label`, `maxLength` and `autofocus`. It declared none of them and has no rest spread, and since the container renders the visible label itself and withholds `label` from the leaf, every long-text field shipped with no programmatic accessible name at all — an axe `label` violation, and unreachable by role or label queries. Its `max_length` was also silently unenforced.

Fixed in `Input` while wiring the above, all in the block or object the change touches:

- The numeric branch passed `undefined` for any non-`number` value. Postgres returns `numeric` and `bigint` as strings, so a stored price rendered as an empty box and saving the untouched form wrote that blank back — and `undefined` puts Mantine's `useUncontrolled` into uncontrolled mode, after which discard and post-save refetch could never correct the field again. The value is now always controlled, and a numeric string passes through intact so trailing zeros such as `10.50` survive.
- Emptying a number field emitted `""`, which PATCHed a nullable numeric column with an empty string instead of `null`.
- `trim` and `slug` ran on every keystroke, rewriting the value before the next character arrived: a trimmed field could never contain `"John Doe"` and a slug field could never reach `"hello-w"`. They now run on blur.
- `clear` overrode the right section that `NumberInput` uses for its increment/decrement controls, removing them and the arrow-key affordance; and `iconRight || clearButton` meant a field with both rendered no clear button. A numeric field is cleared by emptying it, and the text branches now render both.
- The clear button was gated on a truthy value, so a numeric field holding `0` never offered one.
- `maxLength` reached `NumberInput`, where it caps the rendered string including thousands separators — a schema limit of 5 allowed only four digits.
- `collection` and `field` were forwarded to the DOM as real attributes; they are now discarded like the other container metadata, which is what that block exists to do.
