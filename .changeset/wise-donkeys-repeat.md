---
"@buildpad/cli": major
"@buildpad/mcp": major
---

Versioning and upgrade redesign: content-based staleness, pinned fetches, manifest v3.

**Breaking: `buildpad.json` moves to schema v3.** Run `npx buildpad migrate` once
after upgrading the CLI. An older CLI refuses to read a v3 manifest rather than
silently dropping fields it does not understand.

The CLI used to decide that a component was stale by comparing version numbers
(`installed.version >= component.lastChangedIn`). That made correctness depend on
`lastChangedIn`, which the registry build derives from full git history plus the
tags present at build time — so a missing tag, a shallow clone, or a release-PR
step done in the wrong order produced wrong answers. It now compares content.

### What changed

- **Staleness is a hash comparison.** The registry has always recorded each
  file's `sourceSha256`; the manifest now records the same hash at install time.
  A file is stale when the two differ, or when a previous upgrade left it
  unwritten. No version, tag, or git history is consulted, so the same inputs
  give the same answer on any machine on any day.

- **Every remote fetch is pinned to `v<cli version>`,** not to `main`. Between
  `1.10.0` and `1.11.1`, 119 source files changed on `main` while the registry
  still declared `1.10.0` — so `add` copied post-release content and recorded it
  under the previous release, and `upgrade --three-way` then merged against an
  ancestor older than what was actually installed. `npx @buildpad/cli@X.Y.Z` now
  resolves the same bytes on any day. `--ref <git-ref>` (or `BUILDPAD_REF`)
  overrides it for development, and whatever a fetch resolved to is recorded.

- **The diff3 base is exact.** Each file records the ref it was fetched from,
  and `upgrade` fetches the base from that ref instead of guessing a tag from a
  version number. When the ref is unreachable the CLI writes a `.new` file and
  marks the entry `pending` rather than merging against the wrong ancestor.

- **A partial upgrade is no longer recorded as complete.** Skipping a file or
  writing a `.new` keeps the file's old upstream hash and marks it `pending`, so
  `outdated` keeps reporting it. Previously the component version was advanced
  regardless and the skipped file never surfaced again.

- **No prompt when upstream did not move.** A locally-modified file whose
  upstream hash is unchanged is left alone. It used to be offered for overwrite
  with byte-identical content whenever any sibling file in the component changed.

- **Files removed upstream are kept and reported,** not deleted — they are the
  consumer's code — and are dropped from tracking so they stop reporting stale.

- **`outdated` reports per file** (`changed upstream`, `pending`, `new file`,
  `removed upstream`) and hints when the CLI itself is behind npm's `latest`,
  since a pinned CLI is otherwise honestly "up to date" against its own registry
  forever. The npm check is advisory and skipped when npm is unreachable.

- **`buildpad migrate` converts v2 to v3** by fetching the registry at
  `v<recorded version>` and copying out the real upstream hashes. Where that tag
  is unreachable it falls back to the current hashes and marks the files
  `pending`, so a guessed baseline cannot pass unnoticed.

### Release pipeline

- `publish.yml` regenerates `registry.json` inside the changesets `version` step,
  so the bot's commit carries a registry that matches the bumped versions. This
  was a manual step in the release PR; forgetting it failed `registry:check`,
  and doing it before the bump wrote wrong `lastChangedIn` values.
- Each publish now pushes one plain `v<version>` tag. Without it a release is
  unreachable to the pinned CLI. `scripts/backfill-release-tags.sh` creates the
  tags for the 17 historical releases.
- The "quick publish (skip changesets)" procedure is removed. It is how
  `@buildpad/cli@1.11.0` reached npm with no tag, no changelog, and no commit.

### Other

- Repository URLs point at `buildpad-ai/ui`; fetches no longer rely on the
  GitHub rename redirect from `microbuild-ui/ui`.
- The CLI's duplicate `inferSourcePackage` is removed — it had already drifted
  from the registry generator's copy (missing `ui-forms/` and `ui-users/`). The
  CLI reads `sourcePackage` from the registry.
- `lastChangedIn` remains in the registry as display data; no decision reads it.
  The "never release below 1.1.0" version floor is no longer needed.
