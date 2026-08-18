---
"@buildpad/ui-collections": patch
"@buildpad/ui-form": patch
"@buildpad/utils": patch
---

CollectionForm: seed create-mode form data from each field's own schema `default_value`, and parse that default properly.

Create mode only ever seeded initial form data from the `defaultValues` prop and permission presets, so a field's column-level default (e.g. `status DEFAULT 'active'`) never reached the create payload — the database applied it server-side instead, and nothing the user saw reflected it. It is now seeded from the field's own schema.

**Precedence.** The schema default is the *weakest* signal and is merged last, underneath both a permission preset and an explicit `defaultValues` prop. Presets are how a role forces a value on create (`status`, `owner`, `tenant_id`), so a column default must never beat one.

**Only fields the user can write and can see are seeded.** Everything in `formData` is sent on create, so seeding a field outside the role's write permission would put that field in the payload for the role to be rejected on, and seeding a condition-hidden field would persist a value the user was never shown. Write permission is checked in its own right rather than via the `meta.readonly` flag alone, because a form definition's per-field config is overlaid afterwards and can reset `readonly` to false.

**Reuse.** The seeding calls the shared `getDefaultValuesFromFields`, which moves to `@buildpad/utils` beside the parser it wraps; `@buildpad/ui-form` re-exports it under the same name for its existing consumers. VForm already derived the same map for display, so keeping a second copy in CollectionForm meant the value the form showed and the value it submitted came from two rules that could drift.

**`handleFormUpdate` replaces rather than merges.** VForm always emits the complete model, including when it drops a key because the value returned to the field's initial/default. Merging kept the dropped key at its stale value, so re-selecting a field's own default visibly snapped the control back to the previous choice and submitted that instead. This became reachable precisely because the cast fix below makes the parsed default compare equal to what the user picked.

`getFieldDefault` is rewritten around an actual SQL-literal parse instead of substring tests, fixing a set of defects that this seeding would otherwise have written to rows:

- **Cast suffixes.** Postgres appends the column type to a literal default, and the type name is not just words: it carries length/precision (`character varying(255)`, `numeric(10,2)`), array dimensions (`text[]`), schema qualification (`public.status_enum`), quoted identifiers (`"OrderStatus"`) and multi-word spellings, and casts can chain. Everything the old `[\w\s]` match missed was returned as raw SQL text.
- **Parentheses.** The generated-default guard tested for a bare `(` anywhere, which discarded every parameterized cast *and* every ordinary literal whose text contains a parenthesis (`'Acme (US)'`). It now recognises a function call as an identifier followed by `(`, and a quoted literal is read first so a parenthesis inside the text is never syntax.
- **Keyword defaults.** `CURRENT_DATE`, `CURRENT_USER`, `LOCALTIMESTAMP`, lower-cased `current_timestamp` and `NULL` carry no parentheses, so nothing caught them and they were returned as literal strings. They are generated defaults and now yield `undefined`.
- **Quote escaping.** `''` is SQL's escape for an embedded quote; `'It''s'` returned `It''s`.
- **Falsy defaults.** Only `null`/`undefined` mean "no default" — `0`, `false` and `''` are real defaults that a falsy test dropped, so a column defaulting to `false` behaved differently from its sibling defaulting to `true`.
- **Already-parsed defaults.** `default_value` is typed `unknown`; some backends return it parsed. `String()` turned `{}` into `"[object Object]"` and `[]` into the number `0`.
- **Type-directed parsing.** The parse now consults the field's declared type instead of guessing from the shape of the text: a `json`/`jsonb` default is parsed into a value rather than left as the string `"{}"`, a numeric column yields a number even when the literal is quoted (`'-1'::integer`), and a string column keeps its string — `'007'` stayed `007` instead of becoming `7`. An integer beyond the safe range is left as text rather than silently shifted.

`FormField` and `FormFieldInterface` route the column default through the same parser instead of handing the raw SQL text to the rendered control.
