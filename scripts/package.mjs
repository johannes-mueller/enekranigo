// SPDX-License-Identifier: GPL-2.0-or-later

/**
 * Stage the installable KPackage payload into dist/.
 *
 * Only `metadata.json` and `contents/` belong to the package; the development
 * tree (src, test, tooling, node_modules) is never included. Pass `--archive`
 * to additionally produce a `.kwinscript` zip archive.
 */

import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(repoRoot, 'dist');
const packageDir = join(distDir, 'window-sections');

rmSync(distDir, { recursive: true, force: true });
mkdirSync(packageDir, { recursive: true });
cpSync(join(repoRoot, 'metadata.json'), join(packageDir, 'metadata.json'));
cpSync(join(repoRoot, 'contents'), join(packageDir, 'contents'), { recursive: true });

if (process.argv.includes('--archive')) {
  const archive = join(distDir, 'window-sections.kwinscript');
  execFileSync('zip', ['-r', '-q', archive, '.'], { cwd: packageDir });
  console.log(`created ${archive}`);
} else {
  console.log(`staged package in ${packageDir}`);
}
