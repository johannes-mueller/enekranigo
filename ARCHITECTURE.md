# Architecture

## Overview

Window Sections is a KWin script packaged as a `KWin/Script` KPackage. KWin loads
a single JavaScript file (`contents/code/main.js`) into its Qt script engine and
executes it. The script registers six global shortcuts and, when one is invoked,
moves or resizes the currently focused window.

## Pure core and thin adapter

The source is split so that almost all logic is free of KWin dependencies and
can be unit tested in plain Node.js:

| Module             | Responsibility                                                     | KWin dependency |
| ------------------ | ------------------------------------------------------------------ | --------------- |
| `src/geometry.js`  | Fraction constants and rectangle maths (`tileRect`, `expandRect`). | none            |
| `src/cycle.js`     | Detect the current cycle step and pick the next one.               | none            |
| `src/shortcuts.js` | Shortcut identifiers, descriptions and default keys.               | none            |
| `src/main.js`      | Register shortcuts, read the active window, apply geometry.        | all of it       |

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

`tileRect(area, side, fraction)` measures `fraction` along the axis the side
moves on. Left and right placements span the full height of the work area,
up and down placements span the full width. Right and down placements are
computed from the far edge (`area.x + area.width - width`) so they stay anchored
even when the rounded width does not divide the area evenly.

`expandRect(area, axis, rect, tolerance)` sets the axis to `GOLDEN_LARGE`. It
pins the result to whichever work-area edge the window already touches
(with a pixel tolerance) and centers it when it touches neither.

## Cycling state machine

There is no stored state. On each press the adapter asks
`nextStep(area, side, rect, options)` for the fraction to apply. `nextStep`
delegates to `stepIndexFor`, which considers a window to be at step _i_ when:

1. it is anchored to the side's work-area edge within a pixel tolerance
   (default 2 px), and
2. its extent along the side's axis divided by the area's extent is within a
   fraction tolerance (default 0.01) of `STEPS[i]`.

If the window is at no step, the next press starts the cycle at `HALF`.
Otherwise it advances one step and wraps from the last step (`QUARTER`) back to
`HALF`. Because the state is derived from geometry, it survives manual resizes,
script reloads and KWin restarts, and it needs no per-window bookkeeping that
could leak.

A window at `GOLDEN_LARGE` (for example right after an expand) matches no step,
so the next directional press cleanly restarts the cycle at `HALF`.

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
