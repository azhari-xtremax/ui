---
'@buildpad/ui-interfaces': patch
'@buildpad/ui-files': patch
---

Fix the file library picker and file thumbnails across the file interfaces.

**The library picker's search box did nothing.** `Upload`'s fetch effect
deliberately excluded the search term from its dependencies
(`}, [libraryOpen]); // Only trigger on libraryOpen change, not on search`), so
typing updated the input and re-rendered but never refetched, and there was no
client-side filtering either — the term had no effect through any path. Search is
now a real fetch dependency, debounced 300ms via `useDebouncedValue`, with
filtering done server-side through the DaaS `search` parameter. A second, dormant
copy of the fetch logic that *did* close over the search term was only reachable
from the open handler, which also flipped `libraryOpen`, so opening the picker
fired two competing requests; that duplication is gone.

**Thumbnails requested a preset DaaS ignores.** `?key=system-small-cover` (and
`system-large-*`) is silently discarded by DaaS, which then streams the
**full-size original** — so no resizing happened and the browser downloaded
multi-megabyte images to paint 40–120px squares. All asset URLs now pass explicit
`width`/`height`/`fit` transform params, which do resize. In `FileImage` this was
worse than wasteful: originals were base64-encoded behind a 5 MB guard, so a
large photo reported "Image too large to preview" for an image rendering at
220px.

**Files were drawn as folders.** Every non-image fell back to `IconFolderOpen`,
and `Files` rendered `IconFolder` for *every* attached file with no thumbnail at
all — videos, audio, PDFs and Markdown all looked like directories. Thumbnails
now fall back to a per-category icon (image / video / audio / document / archive /
code) matching `FileCard` in `@buildpad/ui-files`, and never to a folder glyph.
The fallback also triggers on image load failure, so a file record whose binary is
missing from storage still shows what kind of file it is instead of a broken
image.

**New exports, one shared picker.** The browser is extracted as
`LibraryPickerModal` and the thumbnail as `FileThumbnail` (both exported from
`@buildpad/ui-interfaces/upload`, along with the `LibraryFolder` type). `Files`
had its own parallel library modal; it now renders the shared one and inherits
search, pagination, thumbnails and layouts. The picker gains:

- pagination with a page-size selector (12/24/48/96) and a result count
- grid and list layouts, toggled by an icon control with visually-hidden labels
- optional folder browsing with a breadcrumb, enabled by passing the new
  `onFetchLibraryFolders` prop (omit it for the previous flat library — no folder
  UI is rendered). `File`, `FileImage` and `Files` wire it through `useFolders`.
- a distinct error state — a failed fetch previously rendered as an innocuous
  "No files found", hiding permission problems
- keyboard-operable tiles (`role="button"`, Enter/Space) and a token-based focus
  ring
- cancellation of superseded requests, so a slow earlier response can no longer
  overwrite a newer one

New `Upload` props: `libraryPageSize`, `libraryDefaultView`,
`onFetchLibraryFolders`.

**Pagination no longer invents pages.** DaaS cannot report a *filtered* total:
`meta.total_count` is always the unfiltered collection count, `meta.filter_count`
only ever equals the number of rows in the current page, and `aggregate[count]`
is ignored. Trusting it produced clickable pages that were always empty — in
`FileManager`, searching a 32-file library returned 18 rows but rendered a second
page from `ceil(32/24)`. Note this also affects the folder root, which is itself a
filtered query (`folder._null`). Both surfaces now only show a numeric total when
nothing narrows the query: `LibraryPickerModal` falls back to Prev/Next, and
`FileManager` derives its page count from observation (a full page implies at
least one more, a short page is the last), so the pager may understate how many
pages exist until you walk forward but never offers one that isn't there. Both
step back automatically if a page comes back empty, which also covers deleting
the last item on a page. `FileManager` gains a result count that omits the total
while filtering rather than displaying a wrong one.

**Registry metadata.** Three pre-existing declaration gaps that would break
`buildpad add` installs: `file` and `file-image` import `@buildpad/hooks` and
`@mantine/notifications` without declaring them, and `files` imports
`@buildpad/utils` undeclared. `upload` also now declares its `types` lib
dependency and its `@mantine/hooks` / `@mantine/notifications` /
`@tabler/icons-react` packages.

`File` now uses the shared `formatFileSize` from `@buildpad/types` instead of a
local copy, so sizes render as `1.5 KB` / `0 B` rather than `1.5 KB` / `0 Bytes`.
