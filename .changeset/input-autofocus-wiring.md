---
"@buildpad/ui-interfaces": patch
---

Input: `FormFieldInterface` forwards `autofocus` generically to every leaf interface, but `Input` (the leaf backing text/number/masked fields — the most widely used one in the library) silently discarded it, destructuring it only as `_autofocus` to stop it leaking onto the DOM as an unknown-attribute warning. A field with `meta.options.autofocus` set never actually received focus on mount. Now wired to Mantine's `autoFocus` prop on the underlying `TextInput`/`NumberInput`/`PasswordInput`.
