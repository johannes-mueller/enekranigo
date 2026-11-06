# Architecture

## Overview

Enekranigo is a KWin script packaged as a `KWin/Script` KPackage. KWin loads
a single JavaScript file (`contents/code/main.js`) into its Qt script engine and
executes it. The script registers four global shortcuts and, when one is invoked,
moves or resizes the currently focused window.

## Names and identifiers

The project was renamed to Enekranigo, but the identifiers that KWin and package
managers store were kept stable:

| Concern                       | Value                     | Stability  |
| ----------------------------- | ------------------------- | ---------- |
| Display name                  | Enekranigo                | may change |
| KPackage id                   | `window-sections`         | frozen     |
| Install directory             | `window-sections`         | frozen     |
| Shortcut object names         | `window-sections-shift-*` | frozen     |
| npm package and CMake project | `enekranigo`              | internal   |

The KPackage id appears in `metadata.json`, the install paths in
`CMakeLists.txt` and `scripts/package.mjs`, and the install/uninstall commands in
`README.md`; they must stay in sync. The shortcut object names are stored in
users' key bindings, so renaming them loses those bindings. The display name and
descriptions can change without breaking an installation.

The canonical repository is currently
<https://github.com/johannes-mueller/enekranigo>. If the project moves to KDE
Invent, update this section, the README links, `CHANGELOG.md` and `.reuse/dep5`
together.

## Pure core and thin adapter

The source is split so that almost all logic is free of KWin dependencies and
can be unit tested in plain Node.js:

| Module             | Responsibility                                              | KWin dependency |
| ------------------ | ----------------------------------------------------------- | --------------- |
| `src/geometry.js`  | Fractions and the tiling maths (`tileRect`, bands).         | none            |
| `src/cycle.js`     | Pick the next section from the window geometry.             | none            |
| `src/shortcuts.js` | Shortcut identifiers, descriptions and default keys.        | none            |
| `src/main.js`      | Register shortcuts, read the active window, apply geometry. | all of it       |

`src/main.js` is the only module that references the KWin globals `workspace`,
`registerShortcut` and `KWin`. It is deliberately small and contains no
arithmetic; it only reads the active window, calls the pure core and assigns the
resulting rectangle.

The pure modules operate on plain objects of the shape
`{ x, y, width, height }` and never see Qt or QRectF types. That is what makes
the geometry and cycling behaviour testable without a running compositor.

## Build

`npm run build` bundles `src/main.js` and its imports into a single IIFE at
`contents/code/main.js` using esbuild. This is a build artifact: it is **not**
committed. `npm test`, `npm run coverage` and `npm run package` run the build
first, and CI builds from a clean checkout, so the artifact can never drift from
the source.

The bundle is excluded from lint, formatting, coverage and version control.
`src/` is the source of truth.

## Testing

`test/geometry.test.js` and `test/cycle.test.js` exercise the pure core with
plain objects. `test/metadata.test.js` checks the packaging and shortcut
contract, and `test/main.test.js` covers the adapter by installing a stateful
in-memory KWin environment before importing `src/main.js`. The adapter test
asserts the registered shortcuts and the resulting window geometry; the real
KWin globals and the generated bundle are exercised only by `scripts/e2e.sh`.

`npm run coverage` includes every file in `src/` via c8's `--all` option, so a
new module cannot hide from the gate. The adapter test uses a hand-written
in-memory KWin environment; it is the one permitted test double (see
`AGENTS.md`). `scripts/e2e.sh` is a load/smoke test: it installs the package,
starts a nested Wayland KWin, loads the script and fails on JavaScript errors.
It does not assert window geometry and exits successfully when its required
tools are absent.

## Geometry contract

All geometry is expressed relative to the **work area** of the window's output,
obtained with `workspace.clientArea(KWin.MaximizeArea, window)`. This excludes
panels and toolbars and is correct for multi-monitor setups.

Fractions used:

| Name           | Value             | Meaning                            |
| -------------- | ----------------- | ---------------------------------- |
| `HALF`         | `1/2`             | half of the work area              |
| `GOLDEN_SMALL` | `1/φ² ≈ 0.381966` | smaller part of the golden section |
| `THIRD`        | `1/3`             | a third                            |
| `QUARTER`      | `1/4`             | a quarter                          |
| `GOLDEN_LARGE` | `1/φ ≈ 0.618034`  | larger part of the golden section  |
| `FULL`         | `1`               | the whole work area                |

`tileRect(area, side, fraction, band)` measures `fraction` along the axis the
side moves on. The perpendicular axis comes from `band`, an optional
`{ start, size }` pair, and defaults to the full width or height of the work
area. `perpendicularBand(area, side, rect, options)` produces it: when the window
is already flush to a work-area edge on that axis (within the pixel tolerance)
its exact offset and size are kept, so snapping along one axis does not disturb
the other; otherwise the whole work area is used. Right and down placements are
computed from the far edge (`area.x + area.width - width`) so they stay anchored
even when the rounded width does not divide the area evenly.

## Cycling state machine

There is no stored state. On each press the adapter asks
`nextSection(area, command, rect, options)`, which returns the `side` and
`fraction` to apply. The command names the edge the user is pushing towards, and
the window keeps whichever work-area edge it is anchored to:

- anchored to the command's own edge → walk `STEPS` downwards (shrink),
- anchored to the opposite edge → walk `STEPS` upwards (grow),
- anchored to neither edge → place on the command's edge at `HALF`.

`STEPS` holds the six fractions ascending:

| Order | Constant       | Value             |
| ----- | -------------- | ----------------- |
| 1     | `QUARTER`      | `1/4`             |
| 2     | `THIRD`        | `1/3`             |
| 3     | `GOLDEN_SMALL` | `1/φ² ≈ 0.381966` |
| 4     | `HALF`         | `1/2`             |
| 5     | `GOLDEN_LARGE` | `1/φ ≈ 0.618034`  |
| 6     | `FULL`         | `1`               |

A shrinking step is the largest entry strictly below the measured size, or
`FULL` when there is none; a growing step is the smallest entry strictly above
it, or `QUARTER` when there is none. The complete walks are:

| Anchor        | Direction | Sequence                                                              |
| ------------- | --------- | --------------------------------------------------------------------- |
| command edge  | shrinking | half → golden small → third → quarter → full → golden large → half    |
| opposite edge | growing   | quarter → third → golden small → half → golden large → full → quarter |

On a 1000 px wide work area the rounded extents are 500, 382, 333, 250, 1000 and
618 px respectively. A left-anchored window at 500 px shrinks to 382 px on the
next `shift-left`; a right-anchored window at 250 px grows to 333 px.

The pixel tolerance (2 px by default) decides whether the window is anchored to
an edge. The fraction tolerance (0.01) decides whether the measured extent is
already a step. On a 1000 px area, 0.01 is 10 px, so the fraction tolerance is
the more forgiving of the two; on a narrow output the pixel tolerance can be
proportionally larger. A size that does not match a step within the fraction
tolerance snaps to the adjacent step in the direction of travel.

A window that fills the whole work area touches both edges, so it counts as the
command's own edge and shrinks to `GOLDEN_LARGE`. Because the state is derived
from geometry it survives manual resizes, script reloads and KWin restarts, and
needs no per-window bookkeeping that could leak.

Each command only changes its own axis. The perpendicular axis is taken from
`perpendicularBand`: a window already snapped on that axis keeps its exact
position and size, so a top-anchored window can be cycled horizontally without
losing its height; a window not snapped there is stretched to the full work area
on that axis.

## KWin touchpoints

- `registerShortcut(name, text, key, callback)` registers each action. The
  `name` is the stable identifier stored in the user's key bindings, so it is
  treated as an API and never renamed.
- `workspace.activeWindow` is resolved and validated. Windows that are not
  managed, already deleted, special (panels, desktops, popups) or not
  moveable/resizable are ignored.
- `window.fullScreen = false` and `window.setMaximize(false, false)` restore a
  window before tiling so that a maximized or fullscreen window can be tiled.
- `window.frameGeometry = rect` applies the new geometry. Assigning a plain
  rectangle object is the supported way to move and resize from a script.
- KWin's native tiling/quick-tile state is not explicitly cleared. The script
  only restores fullscreen and maximized windows before assigning geometry.

## Design decisions

- **JavaScript KPackage.** The script is a `KWin/Script` KPackage with a single
  bundled JavaScript entry point; there is no C++ plugin build.
- **Stateless cycling.** The current step is derived from `frameGeometry`, so no
  per-window state is stored and manual resizes or restarts reset the cycle.
- **One action per direction.** There are no separate expand shortcuts; a window
  anchored to the opposite edge grows through the same cycle in reverse.
- **Generated bundle.** `contents/code/main.js` is produced from `src/` by
  esbuild and is never committed; the source tree is the only source of truth.
- **Default keys unassigned.** The shortcuts do not claim `Meta+Arrow`, which
  KWin already uses for quick tiling; users assign keys in System Settings.
- **No configuration.** Fractions, tolerances and shortcut names are code
  constants; there is no KConfig schema or settings UI.
