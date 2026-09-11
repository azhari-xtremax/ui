/**
 * handleCallToolRequest — the CallToolRequestSchema dispatcher.
 *
 * Exercises the switch's simplest, self-contained tool handlers directly
 * (no MCP transport needed now that the handler is exported). Uses the
 * real embedded registry data rather than mocking it.
 */
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { handleCallToolRequest } from '../src/index.js';
import { getAllComponents } from '../src/registry.js';

function call(name: string, args?: unknown) {
  return handleCallToolRequest({ params: { name, arguments: args } });
}

function firstText(result: { content: Array<{ type: string; text: string }> }) {
  return result.content[0].text;
}

describe('handleCallToolRequest — read-only registry tools', () => {
  test('list_components returns the full component list as JSON', async () => {
    const result = await call('list_components');
    const parsed = JSON.parse(firstText(result));
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
  });

  test('list_components filters by category when given one', async () => {
    const all = JSON.parse(firstText(await call('list_components')));
    const category = all[0].category;

    const filtered = JSON.parse(firstText(await call('list_components', { category })));
    expect(filtered.every((c: { category: string }) => c.category === category)).toBe(true);
  });

  test('list_lib_modules returns modules with an installCommand per entry', async () => {
    const result = JSON.parse(firstText(await call('list_lib_modules')));
    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result[0].installCommand).toContain('npx @buildpad/cli add');
    }
  });

  test('get_component throws when no name is given', async () => {
    await expect(call('get_component', {})).rejects.toThrow('Component name is required');
  });

  test('get_component throws for an unknown name', async () => {
    await expect(call('get_component', { name: 'definitely-not-a-real-component' }))
      .rejects.toThrow('Component not found');
  });

  test('get_component returns sources for a real component', async () => {
    const [first] = getAllComponents();
    const result = JSON.parse(firstText(await call('get_component', { name: first.name })));
    expect(result.name).toBe(first.name);
    expect(result.allSources).toBeDefined();
    expect(result.installCommand).toContain(first.name);
  });

  test('list_packages returns the static package metadata list', async () => {
    const result = JSON.parse(firstText(await call('list_packages')));
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  test('get_package_versions returns the registry\'s packages map', async () => {
    const result = JSON.parse(firstText(await call('get_package_versions')));
    expect(typeof result).toBe('object');
  });

  test('get_usage_example returns a code sample for a real component', async () => {
    const [first] = getAllComponents();
    const text = firstText(await call('get_usage_example', { component: first.name }));
    expect(text).toContain(`pnpm cli add ${first.name}`);
  });

  test('get_usage_example throws when no component name is given', async () => {
    await expect(call('get_usage_example', {})).rejects.toThrow('Component name is required');
  });

  test('generate_form returns a CollectionForm code snippet for the given collection', async () => {
    const text = firstText(await call('generate_form', { collection: 'articles', mode: 'edit' }));
    expect(text).toContain('collection="articles"');
    expect(text).toContain('mode="edit"');
  });

  test('generate_interface maps a known type to its component and falls back to Input otherwise', async () => {
    const dt = firstText(await call('generate_interface', { type: 'datetime', field: 'published_at' }));
    expect(dt).toContain('DateTime');

    const fallback = firstText(await call('generate_interface', { type: 'not-a-real-type', field: 'x' }));
    expect(fallback).toContain('Input');
  });

  test('get_install_command builds an --all command', async () => {
    const text = firstText(await call('get_install_command', { all: true }));
    expect(text).toContain('--all --project');
  });

  test('get_install_command builds a named-components command', async () => {
    const text = firstText(await call('get_install_command', { components: ['demo', 'input'] }));
    expect(text).toContain('demo input --project');
  });

  test('get_copy_own_info returns the distribution-model explainer', async () => {
    const text = firstText(await call('get_copy_own_info'));
    expect(text).toContain('Copy & Own');
  });

  test('get_rbac_pattern returns steps for a known pattern', async () => {
    const result = JSON.parse(firstText(await call('get_rbac_pattern', { pattern: 'own_items', collections: ['posts'], roleName: 'Author' })));
    expect(result.pattern).toBe('own_items');
    expect(Array.isArray(result.steps)).toBe(true);
  });

  test('get_rbac_pattern reports an error for an unknown pattern', async () => {
    const result = await call('get_rbac_pattern', { pattern: 'not-a-real-pattern' });
    expect(result.isError).toBe(true);
    expect(firstText(result)).toContain('Unknown pattern');
  });

  test('get_module_access_pattern returns a step sequence', async () => {
    const result = JSON.parse(firstText(await call('get_module_access_pattern', {
      keys: [{ key: 'billing:invoices', display_name: 'Invoices' }],
      folder: 'Billing',
      policyName: 'Billing Access',
    })));
    expect(Array.isArray(result.steps)).toBe(true);
    expect(result.steps.length).toBeGreaterThan(0);
  });

  test('an unknown tool name throws', async () => {
    await expect(call('not_a_real_tool')).rejects.toThrow('Unknown tool: not_a_real_tool');
  });
});

describe('handleCallToolRequest — list_outdated', () => {
  let tmpdir: string;

  beforeEach(() => {
    tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'buildpad-mcp-'));
  });

  afterEach(() => {
    fs.rmSync(tmpdir, { recursive: true, force: true });
  });

  test('requires projectPath', async () => {
    await expect(call('list_outdated', {})).rejects.toThrow('projectPath is required');
  });

  test('throws when buildpad.json is missing', async () => {
    await expect(call('list_outdated', { projectPath: tmpdir })).rejects.toThrow('buildpad.json not found');
  });

  test('reports a component as outdated when its installed record has no per-file hash (needs-migrate)', async () => {
    const [first] = getAllComponents();
    const target = first.files[0].target;

    fs.writeFileSync(
      path.join(tmpdir, 'buildpad.json'),
      JSON.stringify({
        release: '0.0.1',
        components: {
          // No sourceSha256 recorded — mcp-server's lighter ComponentMetadata
          // has no sourceSha256 either, so staleFilesOf's only reachable
          // "outdated" branch here is the missing-hash (needs-migrate) one.
          [first.name]: { release: '0.0.1', files: [{ target }] },
        },
      }),
    );

    const result = JSON.parse(firstText(await call('list_outdated', { projectPath: tmpdir })));
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe(first.name);
    expect(result[0].staleFiles).toEqual([{ target, reason: 'needs-migrate' }]);
  });

  test('reports nothing outdated when there are no installed components', async () => {
    fs.writeFileSync(path.join(tmpdir, 'buildpad.json'), JSON.stringify({ components: {} }));
    const result = JSON.parse(firstText(await call('list_outdated', { projectPath: tmpdir })));
    expect(result).toEqual([]);
  });
});
