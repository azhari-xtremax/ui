---
"@buildpad/ui-collections": patch
"@buildpad/ui-form": patch
"@buildpad/ui-interfaces": patch
"@buildpad/utils": patch
---

Concealed and hashed fields: one contract, and the three states told apart correctly.

DaaS never returns a stored secret. Its read transformer sends a run of asterisks when a value exists, `null` when the column is empty, and omits write-only columns entirely — three states the UI has to distinguish. That rule was re-derived in four places with three different spellings (`/^\*+$/` twice, a truthy-length test that could not tell a mask from a real password, and a hardcoded ten-character literal), so `@buildpad/utils` now owns it: `CONCEALED_PLACEHOLDER`, `isConcealedValue`, `isConcealedField` and `concealingInterface`. The mask is a display only; nothing compares against its width, which the server chooses.

**`FormFieldInterface`** decides the whole thing in one place, from the field, the resolved interface and the primary key it already receives:

- An explicit `null` from a `conceal` field passes through. The server distinguishes its own empty state, so re-masking a just-cleared token stranded it as "still set" forever — that is the bug this change set out to fix.
- A `hash` field keeps its mask on `null`. That path is not the server's: a hash column is never round-tripped on read, so the only producer of `null` is the leaf itself when the user types and then erases. Treating it as "no credential" flipped the padlock open and told the operator the account had no password while the stored hash was untouched.
- A record that does not exist yet gets no mask. Create forms were showing a closed padlock and "Value securely stored", and users saved accounts with no credential at all.
- A secret field rendered by a text interface gets no mask either, and is normalised back to `null` rather than `undefined` — a literal row of asterisks in a text box is something the user can submit as their password.

**`FormField`** forwards the omitted signal for secret fields, and does so *ahead* of the column default. A DDL default on a secret column is not the secret: taking that branch first rendered the literal default as "Value securely stored" and would have submitted it as the credential.

**`InputHash`** resets its local value when the incoming value is the mask, not only on `null`/`undefined`. The mask is the steady state for a stored credential, so the old condition could never fire for the case it existed to handle — typed plaintext survived Discard, stayed visible, and was re-submitted on the next save. `isHashed` is also now a string test, so a non-string value cannot silently report "no credential stored".

**`SystemToken`** accepts and forwards `aria-label`. `FormField` renders the visible label itself and withholds `label` from the leaf, so without this the token input had no accessible name at all — an axe `label` failure on the one field this work is about. Its empty-state placeholder no longer names the Generate control when that control is hidden (disabled or read-only), and says "No token set" instead of rendering a blank box. Clearing a token after generating one now also clears the fresh-token flag, which otherwise left the credential input as `type="text"`.

**`CollectionForm`** drops concealed values from a Save-as-Copy payload. `formData` holds the server's mask verbatim, so copying a row wrote the literal asterisks into the new row's secret column — a guessable static token, or a password hashed from `**********`.

The accessible name is now declared *after* the `meta.options` spread, alongside the lock props, because admin-authored options JSON reaches the leaf unfiltered and an `aria-label` key in it silently erased the name.

The per-field `data-testid` broadcast is not included. `FormField` already emits `data-field={field.field}` on every field wrapper and the Playwright suite already selects on it, so it duplicated a working hook; being derived from the field name alone it was also not unique once a nested `CollectionForm` was open (ListO2M, ListM2M, and JunctionItemForm which mounts two forms at once). Sub-element ids can be scoped within `[data-field]`.

Registry: the `vform` component now declares `input-hash` and `system-token`, which `FormFieldInterface` maps but which were missing from its 35 interface dependencies, so `buildpad add vform` produced a form that fell through to "Interface component not found" for both. `input-hash` and `system-token` declare their new `utils` dependency.
