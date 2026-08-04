'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Drawer,
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconChevronDown,
  IconChevronRight,
  IconFolder,
  IconKey,
  IconPlus,
} from '@tabler/icons-react';
import { useModuleAccessKeys, usePermissions } from '@buildpad/hooks';
import type { ModuleAccessKey } from '@buildpad/types';
import {
  MODULE_ACCESS_KEY_PATTERN,
  RESERVED_MODULE_ACCESS_NAMESPACES,
} from '@buildpad/types';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { ListEmptyState } from './ListEmptyState';
import { RowActionsMenu } from './RowActionsMenu';
import { SearchInput } from './SearchInput';
import './ManagerTable.css';

/**
 * ModuleAccessKeysManager — CRUD for the `daas_module_access_keys` registry.
 *
 * The registry is the catalogue of application capability flags; policies grant
 * them via `ModuleAccessPanel`. A row with `key === null` is a folder that only
 * groups its children.
 *
 * Port of the platform's `app/module-access-keys/page.tsx`.
 */

interface FormState {
  display_name: string;
  key: string;
  description: string;
  parent_id: string | null;
  sort: number;
  isFolder: boolean;
}

const EMPTY_FORM: FormState = {
  display_name: '',
  key: '',
  description: '',
  parent_id: null,
  sort: 0,
  isFolder: false,
};

/** Validate a leaf key against the platform format and reserved namespaces. */
function validateKey(key: string): string | null {
  if (!key.trim()) return 'Key is required for a capability (leave the type as Folder to group instead)';
  if (!MODULE_ACCESS_KEY_PATTERN.test(key)) {
    return 'Lowercase letters, digits and : _ . / - only, starting with a letter';
  }
  const reserved = RESERVED_MODULE_ACCESS_NAMESPACES.find((ns) => key.startsWith(ns));
  if (reserved) {
    return `The "${reserved}" namespace is reserved by the platform — use your own prefix`;
  }
  return null;
}

/** Depth-first flatten of a tree, carrying indent depth for rendering. */
function flattenTree(
  nodes: ModuleAccessKey[],
  depth = 0,
  collapsed: Set<string> = new Set(),
): Array<{ node: ModuleAccessKey; depth: number }> {
  const out: Array<{ node: ModuleAccessKey; depth: number }> = [];
  for (const node of nodes) {
    out.push({ node, depth });
    if (node.children?.length && !collapsed.has(node.id)) {
      out.push(...flattenTree(node.children, depth + 1, collapsed));
    }
  }
  return out;
}

export interface ModuleAccessKeysManagerProps {
  /** Hide the built-in heading + subtitle for embedded surfaces. Default: false. */
  hideHeader?: boolean;
  /** DaaS collection used for RBAC checks. Default: 'daas_module_access_keys'. */
  keysCollection?: string;
}

export const ModuleAccessKeysManager: React.FC<ModuleAccessKeysManagerProps> = ({
  hideHeader = false,
  keysCollection = 'daas_module_access_keys',
}) => {
  const { canPerform, isAdmin, loading: permsLoading } = usePermissions({
    collections: [keysCollection],
  });
  const createAllowed = permsLoading || isAdmin || canPerform(keysCollection, 'create');
  const updateAllowed = permsLoading || isAdmin || canPerform(keysCollection, 'update');
  const deleteAllowed = permsLoading || isAdmin || canPerform(keysCollection, 'delete');

  const { fetchKeys, createKey, updateKey, deleteKey } = useModuleAccessKeys();

  const [items, setItems] = useState<ModuleAccessKey[]>([]);
  const [tree, setTree] = useState<ModuleAccessKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 250);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [keyError, setKeyError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ModuleAccessKey | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { keys, tree: built } = await fetchKeys();
      setItems(keys);
      setTree(built);
      setLoadError(null);
    } catch {
      setLoadError('Failed to load module access keys');
    } finally {
      setLoading(false);
    }
  }, [fetchKeys]);

  useEffect(() => {
    load();
  }, [load]);

  /** Folder options for the parent selector — leaves cannot have children. */
  const folderOptions = useMemo(
    () =>
      items
        .filter((i) => i.key === null && i.id !== editingId)
        .map((i) => ({ value: i.id, label: i.display_name })),
    [items, editingId],
  );

  /**
   * Search filters to matching rows only (flat), because hiding a parent would
   * hide its matching children. With no search, render the tree.
   */
  const rows = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    if (!term) return flattenTree(tree, 0, collapsed);
    return items
      .filter(
        (i) =>
          i.display_name.toLowerCase().includes(term) ||
          (i.key ?? '').toLowerCase().includes(term) ||
          (i.description ?? '').toLowerCase().includes(term),
      )
      .map((node) => ({ node, depth: 0 }));
  }, [debouncedSearch, tree, items, collapsed]);

  const openCreate = (isFolder: boolean) => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, isFolder });
    setKeyError(null);
    setDrawerOpen(true);
  };

  const openEdit = (node: ModuleAccessKey) => {
    setEditingId(node.id);
    setForm({
      display_name: node.display_name,
      key: node.key ?? '',
      description: node.description ?? '',
      parent_id: node.parent_id,
      sort: node.sort ?? 0,
      isFolder: node.key === null,
    });
    setKeyError(null);
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!form.display_name.trim()) {
      notifications.show({ title: 'Error', message: 'Display name is required', color: 'red' });
      return;
    }

    if (!form.isFolder) {
      const err = validateKey(form.key.trim());
      if (err) {
        setKeyError(err);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        display_name: form.display_name.trim(),
        description: form.description.trim() || null,
        key: form.isFolder ? null : form.key.trim(),
        parent_id: form.parent_id,
        sort: form.sort,
      };

      if (editingId) {
        await updateKey(editingId, payload);
      } else {
        await createKey(payload);
      }

      notifications.show({
        title: 'Saved',
        message: editingId ? 'Key updated' : 'Key created',
        color: 'green',
      });
      setDrawerOpen(false);
      await load();
    } catch (err) {
      // Surface the server error verbatim — a UNIQUE violation on `key` is the
      // common case and its message is the useful one.
      notifications.show({
        title: 'Save failed',
        message: err instanceof Error ? err.message : 'Could not save the key',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteKey(deleteTarget.id);
      notifications.show({ title: 'Deleted', message: 'Key removed', color: 'green' });
      setDeleteTarget(null);
      await load();
    } catch (err) {
      notifications.show({
        title: 'Delete failed',
        message: err instanceof Error ? err.message : 'Could not delete the key',
        color: 'red',
      });
    } finally {
      setDeleting(false);
    }
  };

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteDescription = deleteTarget
    ? deleteTarget.key === null
      ? `Delete the folder "${deleteTarget.display_name}"? Its child keys are NOT deleted — they move to the top level.`
      : `Delete the key "${deleteTarget.key}"? Policies that currently grant it keep the entry, which will no longer match any registered key.`
    : undefined;

  return (
    <Stack gap="md" data-testid="module-access-keys-manager">
      {!hideHeader && (
        <Box>
          <Title order={2}>Module Access Keys</Title>
          <Text c="dimmed" size="sm">
            Application capability flags that policies can grant, independent of
            collection permissions.
          </Text>
        </Box>
      )}

      <Group justify="space-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Search keys…" />
        {createAllowed && (
          <Group gap="xs">
            <Button
              variant="default"
              leftSection={<IconFolder size={16} />}
              onClick={() => openCreate(true)}
              data-testid="module-access-add-folder"
            >
              Add Folder
            </Button>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => openCreate(false)}
              data-testid="module-access-add-key"
            >
              Add Key
            </Button>
          </Group>
        )}
      </Group>

      {loadError && (
        <Alert color="red" variant="light">
          {loadError}
        </Alert>
      )}

      {!loading && items.length === 0 && !loadError && (
        <ListEmptyState
          title="No module access keys"
          hint="Register a key to gate a feature that is not tied to a collection."
          data-testid="module-access-empty"
        />
      )}

      <Stack gap={0}>
        {rows.map(({ node, depth }) => {
          const isFolder = node.key === null;
          const hasChildren = Boolean(node.children?.length);
          return (
            <Group
              key={node.id}
              justify="space-between"
              py={8}
              pl={depth * 20}
              style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
              data-testid={`module-access-row-${node.id}`}
            >
              <Group gap="xs">
                {isFolder && hasChildren ? (
                  <ActionIcon
                    size="xs"
                    variant="subtle"
                    color="gray"
                    onClick={() => toggleCollapse(node.id)}
                    aria-label={collapsed.has(node.id) ? 'Expand' : 'Collapse'}
                  >
                    {collapsed.has(node.id) ? (
                      <IconChevronRight size={12} />
                    ) : (
                      <IconChevronDown size={12} />
                    )}
                  </ActionIcon>
                ) : (
                  <Box w={18} />
                )}
                {isFolder ? (
                  <IconFolder size={14} style={{ color: 'var(--mantine-color-yellow-6)' }} />
                ) : (
                  <IconKey size={14} style={{ color: 'var(--mantine-color-blue-6)' }} />
                )}
                <Stack gap={0}>
                  <Text size="sm" fw={isFolder ? 600 : 400}>
                    {node.display_name}
                  </Text>
                  {node.description && (
                    <Text size="xs" c="dimmed">
                      {node.description}
                    </Text>
                  )}
                </Stack>
              </Group>

              <Group gap="xs">
                {node.key && (
                  <Badge
                    variant="outline"
                    size="xs"
                    color="blue"
                    style={{ fontFamily: 'monospace' }}
                  >
                    {node.key}
                  </Badge>
                )}
                <RowActionsMenu
                  onEdit={updateAllowed ? () => openEdit(node) : undefined}
                  onDelete={deleteAllowed ? () => setDeleteTarget(node) : undefined}
                />
              </Group>
            </Group>
          );
        })}
      </Stack>

      <Drawer
        opened={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        position="right"
        title={
          editingId
            ? `Edit ${form.isFolder ? 'folder' : 'key'}`
            : `New ${form.isFolder ? 'folder' : 'key'}`
        }
      >
        <Stack gap="md">
          <TextInput
            label="Display name"
            required
            value={form.display_name}
            onChange={(e) => setForm((f) => ({ ...f, display_name: e.currentTarget.value }))}
            data-testid="module-access-form-display-name"
          />

          {!form.isFolder && (
            <TextInput
              label="Key"
              required
              description="Convention: <domain>:<capability>, e.g. reports:export"
              placeholder="reports:export"
              value={form.key}
              error={keyError}
              onChange={(e) => {
                setForm((f) => ({ ...f, key: e.currentTarget.value }));
                setKeyError(null);
              }}
              data-testid="module-access-form-key"
            />
          )}

          <Textarea
            label="Description"
            autosize
            minRows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.currentTarget.value }))}
          />

          <Select
            label="Parent folder"
            placeholder="Top level"
            clearable
            data={folderOptions}
            value={form.parent_id}
            onChange={(v) => setForm((f) => ({ ...f, parent_id: v }))}
          />

          <NumberInput
            label="Sort"
            value={form.sort}
            onChange={(v) => setForm((f) => ({ ...f, sort: typeof v === 'number' ? v : 0 }))}
          />

          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving} data-testid="module-access-form-save">
              Save
            </Button>
          </Group>
        </Stack>
      </Drawer>

      <DeleteConfirmModal
        opened={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete module access key"
        description={deleteDescription}
        loading={deleting}
      />
    </Stack>
  );
};

export default ModuleAccessKeysManager;
