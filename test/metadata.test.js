// SPDX-License-Identifier: GPL-2.0-or-later

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { SHORTCUTS } from '../src/shortcuts.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const metadata = JSON.parse(readFileSync(join(repoRoot, 'metadata.json'), 'utf8'));

describe('metadata.json', () => {
  it('declares a KWin script package', () => {
    assert.equal(metadata.KPackageStructure, 'KWin/Script');
    assert.equal(metadata['X-Plasma-API'], 'javascript');
    assert.equal(metadata['X-Plasma-MainScript'], 'code/main.js');
  });

  it('uses the stable package id', () => {
    assert.equal(metadata.KPlugin.Id, 'window-sections');
  });

  it('installs under the package id', () => {
    const cmake = readFileSync(join(repoRoot, 'CMakeLists.txt'), 'utf8');
    const packager = readFileSync(join(repoRoot, 'scripts', 'package.mjs'), 'utf8');
    assert.match(cmake, new RegExp(`kwin/scripts/${metadata.KPlugin.Id}`));
    assert.match(packager, new RegExp(`'${metadata.KPlugin.Id}'`));
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
  const ids = SHORTCUTS.map((shortcut) => shortcut.id);

  it('are unique, namespaced and stable', () => {
    assert.equal(ids.length, 8);
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ids) {
      assert.match(id, /^window-sections-(shift|move)-[a-z-]+$/);
    }
    assert.deepEqual([...ids].sort(), [
      'window-sections-move-down',
      'window-sections-move-left',
      'window-sections-move-right',
      'window-sections-move-up',
      'window-sections-shift-down',
      'window-sections-shift-left',
      'window-sections-shift-right',
      'window-sections-shift-up',
    ]);
  });

  it('expose a text and an unassigned default key for every shortcut', () => {
    for (const shortcut of SHORTCUTS) {
      assert.ok(shortcut.text, `missing text for ${shortcut.id}`);
      assert.equal(shortcut.key, '');
    }
  });
});
