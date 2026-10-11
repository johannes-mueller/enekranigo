# Architecture

## Overview

Window Sections is a KWin script packaged as a `KWin/Script` KPackage. KWin loads
a single JavaScript file (`contents/code/main.js`) into its Qt script engine and
executes it. The script registers four global shortcuts and, when one is invoked,
moves or resizes the currently focused window.

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

`STEPS` holds the six fractions ascending: quarter, third, golden small, half,
golden large, full. A shrinking step is the largest entry strictly below the
measured size, or `FULL` when there is none; a growing step is the smallest entry
strictly above it, or `QUARTER` when there is none. The two tolerances (default
2 px for anchoring and 0.01 for the fraction) classify the window, so a size that
is not exactly a step snaps to the adjacent step in the direction of travel. On
the own edge this reproduces quarter → full → golden large → half; on the
opposite edge it reproduces quarter → third → golden small → half → golden large
→ full.

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
