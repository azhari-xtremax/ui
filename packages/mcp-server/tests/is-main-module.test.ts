/**
 * isMainModule — the "start the server, or let a test import me" decision.
 *
 * Regression coverage for a silent failure: `npx -y @buildpad/mcp@latest`
 * exited immediately with no output, which clients report as
 * CONNECTION_CLOSED. npx and pnpm expose a package's `bin` as a symlink, so
 * `process.argv[1]` is the shim's path while `import.meta.url` is the real
 * file, and comparing those two directly said "imported" for a run that was
 * anything but. Nothing in the suite could see it, because the wrong answer
 * simply does nothing.
 */
import { describe, expect, test, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { isMainModule } from '../src/index.js';

let dir: string;
let realFile: string;
let shim: string;
let otherFile: string;

beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'buildpad-mcp-main-'));
    realFile = path.join(dir, 'index.js');
    otherFile = path.join(dir, 'other.js');
    shim = path.join(dir, 'buildpad-mcp');
    fs.writeFileSync(realFile, '// built server\n');
    fs.writeFileSync(otherFile, '// something else\n');
    fs.symlinkSync(realFile, shim);
});

afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
});

describe('isMainModule', () => {
    test('run through a symlinked bin shim counts as main', () => {
        expect(isMainModule(shim, pathToFileURL(realFile).href)).toBe(true);
    });

    test('run directly counts as main', () => {
        expect(isMainModule(realFile, pathToFileURL(realFile).href)).toBe(true);
    });

    test('a different entrypoint — an import — does not', () => {
        expect(isMainModule(otherFile, pathToFileURL(realFile).href)).toBe(false);
    });

    test('no argv[1] at all does not', () => {
        expect(isMainModule(undefined, pathToFileURL(realFile).href)).toBe(false);
    });

    test('falls back to comparing the paths when neither resolves on disk', () => {
        // realpath throws for both. Falling back to the plain comparison keeps
        // a run that IS the main module running, rather than exiting silently.
        const missing = path.join(dir, 'gone.js');
        expect(isMainModule(missing, pathToFileURL(missing).href)).toBe(true);
        expect(isMainModule(missing, pathToFileURL(path.join(dir, 'other-gone.js')).href)).toBe(false);
    });
});
