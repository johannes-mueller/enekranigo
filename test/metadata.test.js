// SPDX-License-Identifier: GPL-2.0-or-later

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { DEFAULT_KEYS, SHORTCUTS, SHORTCUT_TEXTS } from '../src/shortcuts.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const metadata = JSON.parse(readFileSync(join(repoRoot, 'metadata.json'), 'utf8'));

describe('metadata.json', () => {
  it('declares a KWin script package', () => {
    assert.equal(metadata.KPackageStructure, 'KWin/Script');
    assert.equal(metadata['X-Plasma-API'], 'javascript');
    assert.equal(metadata['X-Plasma-MainScript'], 'code/main.js');
  });

  it('uses the directory name as the package id', () => {
    assert.equal(metadata.KPlugin.Id, basename(repoRoot));
  });

  it('carries the required KPlugin fields', () => {
    for (const field of ['Name', 'Description', 'Icon', 'Version', 'License']) {
      assert.ok(metadata.KPlugin[field], `missing KPlugin.${field}`);
    }
    assert.ok(Array.isArray(metadata.KPlugin.Authors));
    assert.ok(metadata.KPlugin.Authors.length > 0);
    assert.equal(metadata.KPlugin.License, 'GPL-2.0-or-later');
  });

  it('ships the main script it references', () => {
    const mainScript = join(repoRoot, 'contents', metadata['X-Plasma-MainScript']);
    assert.doesNotThrow(() => readFileSync(mainScript));
  });
});

describe('shortcut ids', () => {
  it('are unique, namespaced and stable', () => {
    const ids = Object.values(SHORTCUTS);
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ids) {
      assert.match(id, /^window-sections-[a-z-]+$/);
    }
  });

  it('expose a text and an unassigned default key for every shortcut', () => {
    for (const key of Object.keys(SHORTCUTS)) {
      assert.ok(SHORTCUT_TEXTS[key], `missing text for ${key}`);
      assert.equal(DEFAULT_KEYS[key], '');
    }
  });
});
