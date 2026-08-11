---
"@buildpad/ui-interfaces": patch
---

ListM2M: dedupe the load-items effect against fresh prop literals / React 18 StrictMode double-invoke (was firing an identical query twice on mount), and route the disabled batch-edit button's tooltip through the existing i18n translations system instead of a hardcoded English string.
