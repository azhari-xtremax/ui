---
"@buildpad/cli": patch
---

`buildpad add/upgrade utils` was missing the `conceal.ts` module added in
the readonly/conceal-contract work: it was never registered as a lib file,
so consumers had no way to receive `isConcealedValue`/`isConcealedField`/
`concealingInterface` even though `InputHash`, `SystemToken`, and
`FormFieldInterface` already depend on them. Registered `utils/src/conceal.ts`
as a new `utils` lib file (target `lib/buildpad/conceal.ts`) and re-exported
it, along with `getDefaultValuesFromFields`, `resolveChoiceLabel`,
`parseChoiceValues`, and `InterfaceChoice`, from the CLI's hand-maintained
`lib/buildpad/utils/index.ts` barrel template, which had fallen behind the
same round of upstream additions.
