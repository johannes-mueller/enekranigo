// SPDX-License-Identifier: GPL-2.0-or-later

import js from '@eslint/js';

export default [
  {
    ignores: ['node_modules/**', 'coverage/**', 'contents/code/main.js', 'dist/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      'no-var': 'error',
      'prefer-const': 'error',
      'object-shorthand': 'error',
    },
  },
  {
    files: ['src/main.js'],
    languageOptions: {
      globals: {
        KWin: 'readonly',
        registerShortcut: 'readonly',
        workspace: 'readonly',
      },
    },
  },
];
