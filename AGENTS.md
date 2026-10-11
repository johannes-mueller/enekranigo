# Agent and contributor conventions

This project follows the conventions below. They are the general rules agreed
with the project initializer and are mandatory for every change.

## Project layout and file naming

- The repository root is the KPackage root. `metadata.json` and `contents/` are
  the installable payload; everything else is development tooling.
- Source of truth is `src/*.js`, written as ES modules. `contents/code/main.js`
  is a generated IIFE bundle and is committed.
- Package id and install directory are `window-sections` and must stay in sync.
- File names use `kebab-case`; tests are `test/<module>.test.js`, one file per
  module. Keep tooling out of `contents/`.

## Language and style

- Target Plasma 6 / KWin 6 only. No Plasma 5 compatibility shims.
- `const` and `let` only, `"use strict"` semantics (ES modules), no `var`.
- Clean Code: short, single-purpose functions, early returns, no comments
  inside function bodies. Extract a function instead of explaining a body.
- Use `console.log` / `console.error` for debugging; `print` no longer emits
  under KWin 6.
- No dead code, no commented-out code, no `TODO` without an issue reference.
- Never leak globals; the bundler wraps everything in an IIFE.

## Architecture

- Keep the pure core pure: `src/geometry.js`, `src/cycle.js` and
  `src/shortcuts.js` must not reference KWin globals, Qt types or config.
- `src/main.js` is the only adapter and must stay small and free of arithmetic.
- See [ARCHITECTURE.md](ARCHITECTURE.md) for the geometry contract and the
  cycling state machine.

## Tests

- The test suite is the highest priority. Every verification performed during
  development must exist as an automated test.
- Unit tests use the Node.js built-in `node:test` runner and
  `node:assert/strict`. Do not add another runner.
- Do not use mocks, stubs or spies, and do not assert on implementation details.
  Test only the public interface of the pure modules.
- Coverage is measured with `c8` and must be **100% lines**, enforced by
  `npm run coverage`. Code that genuinely cannot be covered must be marked and
  justified; unreachable branches should be removed rather than excluded.
- Add a metadata/packaging test for anything that must stay in sync
  (`metadata.json`, shortcut ids, the generated bundle).
- End-to-end checks run against a real nested KWin; see `scripts/e2e.sh`.

## CI/CD

- GitHub Actions is the single source of truth. A verification that is not in a
  workflow did not happen.
- `tests.yml` builds the bundle, asserts it is in sync, and runs the unit tests
  with the coverage gate.
- `lint.yml` runs eslint, prettier, markdownlint, `reuse`, shellcheck and
  actionlint.
- `package.yml` installs the KPackage with `kpackagetool6` in a KDE container.
- `integration.yml` runs the end-to-end checks; it is nightly and may be
  non-blocking, but a red run must be triaged.

## Documentation

- `README.md` carries Synopsis, Getting started, Usage, Development, License and
  Contributing, in that order.
- `ARCHITECTURE.md` documents the core/adapter split, the geometry contract and
  the state machine.
- Write JSDoc for every public function, including parameters, return value and
  behaviour. Trivial helpers need no documentation.
- Keep `CHANGELOG.md` in Keep a Changelog style.

## Licensing and releases

- Every source file carries an SPDX header (`GPL-2.0-or-later`).
- Conventional Commits. Semantic versioning. `metadata.json` `Version`,
  `CHANGELOG.md` and the git tag must agree.
- `main` is always green.
