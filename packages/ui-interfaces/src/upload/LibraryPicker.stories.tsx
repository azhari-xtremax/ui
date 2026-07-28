import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Button, Code, Group, Stack, Text } from '@mantine/core';
import { LibraryPickerModal, type FileUpload, type LibraryFolder } from './Upload';

/**
 * A stand-in for the DaaS files/folders API that reproduces the quirks the real
 * backend has, so these stories exercise the same code paths as production:
 *
 * - `search` filters server-side (the picker never filters locally).
 * - A *filtered* total is not reported, mirroring the live backend where
 *   `meta.total_count` is always the unfiltered count. The picker therefore
 *   switches from a numeric pager to Prev/Next whenever a filter is active.
 */
const mk = (
  name: string,
  type: string,
  filesize: number,
  extra: Partial<FileUpload> = {}
): FileUpload => ({
  id: `id-${name}`,
  filename_download: name,
  filename_disk: name,
  type,
  filesize,
  uploaded_on: '2026-06-22T15:11:34.172Z',
  uploaded_by: 'system',
  ...extra,
});

const ALL_FILES: FileUpload[] = [
  mk('hero-banner.png', 'image/png', 14_336, { title: 'Hero Banner' }),
  mk('promo-square.png', 'image/png', 8_712, { title: 'Promo Square' }),
  mk('product-shot.png', 'image/png', 11_264, { title: 'Product Shot' }),
  mk('teaser-clip.mp4', 'video/mp4', 2_848_208, { title: 'Teaser Clip' }),
  mk('sample-5s.mp4', 'video/mp4', 2_848_208),
  mk('intro-audio.mp3', 'audio/mpeg', 52_079, { title: 'Intro Audio' }),
  mk('spec-sheet.pdf', 'application/pdf', 13_312, { title: 'Spec Sheet' }),
  mk('adoption-guide.md', 'text/markdown', 11_197),
  mk('code-reviewer.md', 'text/markdown', 3_801),
  mk('security-auditor.md', 'text/markdown', 4_992),
  mk('test-engineer.md', 'text/markdown', 3_275),
  mk('bundle.zip', 'application/zip', 91_000),
  mk('config.json', 'application/json', 1_204),
  mk('styles.css', 'text/css', 2_048),
  ...Array.from({ length: 16 }, (_, i) =>
    mk(`report-${String(i + 1).padStart(2, '0')}.md`, 'text/markdown', 2_000 + i * 137)
  ),
];

const ALL_FOLDERS: LibraryFolder[] = [
  { id: 'folder-marketing', name: 'Marketing', parent: null },
  { id: 'folder-documents', name: 'Documents', parent: null },
  { id: 'folder-product', name: 'Product', parent: null },
  { id: 'folder-campaigns', name: 'Campaigns', parent: 'folder-marketing' },
];

/** Files that live inside a folder, keyed by folder id. */
const FOLDER_CONTENTS: Record<string, string[]> = {
  'folder-marketing': ['id-teaser-clip.mp4'],
  'folder-campaigns': ['id-hero-banner.png', 'id-promo-square.png'],
  'folder-documents': ['id-spec-sheet.pdf', 'id-adoption-guide.md'],
  'folder-product': ['id-product-shot.png'],
};

const ROOT_FILE_IDS = new Set(
  ALL_FILES.map((f) => f.id).filter(
    (id) => !Object.values(FOLDER_CONTENTS).some((ids) => ids.includes(id))
  )
);

type FetchArgs = { page: number; limit: number; search: string; folder?: string };

function makeFetchFiles(options: { delayMs?: number; failWith?: string } = {}) {
  return async ({ page, limit, search, folder }: FetchArgs) => {
    if (options.delayMs) {
      await new Promise((resolve) => setTimeout(resolve, options.delayMs));
    }
    if (options.failWith) {
      throw new Error(options.failWith);
    }

    let scope = ALL_FILES;
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      scope = ALL_FILES.filter((f) =>
        `${f.title ?? ''} ${f.filename_download}`.toLowerCase().includes(term)
      );
    } else if (folder) {
      const ids = FOLDER_CONTENTS[folder] ?? [];
      scope = ALL_FILES.filter((f) => ids.includes(f.id));
    } else {
      scope = ALL_FILES.filter((f) => ROOT_FILE_IDS.has(f.id));
    }

    const start = (page - 1) * limit;
    return {
      files: scope.slice(start, start + limit),
      // Mirrors the live backend: only the unfiltered count is meaningful.
      total: search.trim() || folder ? ALL_FILES.length : scope.length,
    };
  };
}

const fetchFolders = async ({
  parent,
  search,
}: {
  parent: string | null;
  search?: string;
}) => {
  if (search?.trim()) {
    const term = search.trim().toLowerCase();
    return ALL_FOLDERS.filter((f) => f.name.toLowerCase().includes(term));
  }
  return ALL_FOLDERS.filter((f) => (f.parent ?? null) === parent);
};

/** Opens the picker and reports the selection, so stories are interactive. */
function PickerHarness({
  startOpen = true,
  ...pickerProps
}: Partial<React.ComponentProps<typeof LibraryPickerModal>> & { startOpen?: boolean }) {
  const [opened, setOpened] = useState(startOpen);
  const [selected, setSelected] = useState<FileUpload | null>(null);

  return (
    <Stack gap="sm">
      <Group>
        <Button onClick={() => setOpened(true)}>Choose from library</Button>
        {selected && (
          <Text size="sm">
            Selected: <Code>{selected.title || selected.filename_download}</Code>
          </Text>
        )}
      </Group>

      <LibraryPickerModal
        opened={opened}
        onClose={() => setOpened(false)}
        onSelect={(file) => {
          setSelected(file);
          setOpened(false);
        }}
        onFetchFiles={makeFetchFiles()}
        {...pickerProps}
      />
    </Stack>
  );
}

const meta: Meta<typeof LibraryPickerModal> = {
  title: 'Interfaces/Upload/Library Picker',
  component: LibraryPickerModal,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `The "Choose from library" browser shared by \`Upload\`, \`File\`, \`FileImage\`, and \`Files\`.

## Features
- Server-side search (debounced 300ms — the term is a real fetch dependency)
- Pagination with a page-size selector
- Grid and list layouts
- Real thumbnails for images, per-category icons for everything else
- Optional folder browsing with a breadcrumb

## Thumbnails
Image tiles request \`/api/assets/{id}?width=…&height=…&fit=cover\`, i.e. explicit
transform params rather than a \`key=<preset>\`. DaaS silently ignores unknown
preset keys and streams the full-size original, so \`key\` neither resizes nor
saves bandwidth.

**In Storybook these image requests have no backend**, so tiles fall back to the
category icon — which is exactly the behaviour you get for a file whose binary is
missing from storage. Run the storybook-host proxy to see live thumbnails.

## Pagination
A *filtered* total cannot be obtained from DaaS (\`meta.total_count\` is always the
unfiltered count, \`meta.filter_count\` only reflects the current page, and
\`aggregate\` is ignored). So the numeric pager appears only when nothing is
filtering; with a search term or inside a folder the picker shows Prev/Next.`,
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <PickerHarness />,
  parameters: {
    docs: {
      description: {
        story:
          'Flat library, grid layout. 26 root files at 24 per page, so a numeric pager appears.',
      },
    },
  },
};

export const ListView: Story = {
  render: () => <PickerHarness defaultView="list" />,
  parameters: {
    docs: {
      description: {
        story: 'The list layout shows filename, category, and size in a table.',
      },
    },
  },
};

export const SmallPageSize: Story = {
  render: () => <PickerHarness pageSize={12} />,
  parameters: {
    docs: {
      description: {
        story:
          'A 12-item page over 26 root files. Use the pager and the page-size selector; the count reads "Showing 1–12 of 26".',
      },
    },
  },
};

export const WithFolders: Story = {
  render: () => <PickerHarness onFetchFolders={fetchFolders} pageSize={12} />,
  parameters: {
    docs: {
      description: {
        story:
          'Folder browsing enabled. Folder tiles come first, a breadcrumb tracks depth (Marketing → Campaigns), and entering a folder switches the footer to Prev/Next because no filtered total exists.',
      },
    },
  },
};

export const SearchBehaviour: Story = {
  render: () => <PickerHarness onFetchFolders={fetchFolders} pageSize={12} />,
  parameters: {
    docs: {
      description: {
        story:
          'Type `report` to see server-side search across all files (matching folders are included too). Typing is debounced, so a burst of keystrokes issues one request. Try `zzz` for the search-specific empty state.',
      },
    },
  },
};

export const CategoryIcons: Story = {
  render: () => <PickerHarness pageSize={24} />,
  parameters: {
    docs: {
      description: {
        story:
          'Every file carries a category badge and a matching icon — image, video, audio, document, archive, code. Notably a folder glyph is never used for a file, which was the original bug: videos, audio, PDFs and markdown all rendered as folders.',
      },
    },
  },
};

export const EmptyLibrary: Story = {
  render: () => (
    <PickerHarness onFetchFiles={async () => ({ files: [], total: 0 })} />
  ),
  parameters: {
    docs: { description: { story: 'No files at all.' } },
  },
};

export const LoadFailure: Story = {
  render: () => (
    <PickerHarness onFetchFiles={makeFetchFiles({ failWith: '403 Forbidden' })} />
  ),
  parameters: {
    docs: {
      description: {
        story:
          'A failed fetch surfaces the error. Previously any failure rendered as an innocuous "No files found", which hid permission problems.',
      },
    },
  },
};

export const SlowLoad: Story = {
  render: () => <PickerHarness onFetchFiles={makeFetchFiles({ delayMs: 2000 })} />,
  parameters: {
    docs: {
      description: {
        story:
          'Loading state. The search box also shows an inline spinner while a request is in flight.',
      },
    },
  },
};

export const ScopedToFolder: Story = {
  render: () => (
    <PickerHarness folder="folder-campaigns" onFetchFolders={fetchFolders} />
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Pinned to a single folder via the `folder` prop — the picker starts inside Campaigns and the breadcrumb root returns there.',
      },
    },
  },
};

export const ClosedInitially: Story = {
  render: () => <PickerHarness startOpen={false} onFetchFolders={fetchFolders} />,
  parameters: {
    docs: {
      description: {
        story:
          'Nothing is fetched until the modal opens, and opening always resets search, page, and folder depth.',
      },
    },
  },
};
