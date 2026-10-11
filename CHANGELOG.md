# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-10-11

### Added

- Four directional shortcuts `window-sections-shift-left`, `-right`, `-up` and
  `-down` that cycle the focused window through half, the smaller golden
  section, a third, a quarter, the full work area and the larger golden section.
  A window anchored to the opposite edge cycles in reverse, so one shortcut both
  shrinks and grows the window.
- Snapping only changes the invoked axis: a window already snapped on the
  perpendicular axis keeps its exact position and size there, and one that is
  not snapped is stretched to the full work area on that axis.
- Packaging metadata for a KWin 6 script (`KWin/Script` KPackage).
- Unit tests with enforced 100% line coverage.
- CI workflows for tests, linting, packaging and end-to-end checks.

### Changed

- Renamed the project to Enekranigo. The KPackage id, install directory and
  shortcut ids remain `window-sections`.

[Unreleased]: https://invent.kde.org/sdk/window-sections/-/compare/v0.1.0...HEAD
[0.1.0]: https://invent.kde.org/sdk/window-sections/-/releases/v0.1.0
