# Enekranigo

## Synopsis

Enekranigo is a KWin script for KDE Plasma 6 that tiles the focused window
through a cycle of proportions. Four directional shortcuts move the window one
step at a time through half, the smaller golden section, a third, a quarter, the
full work area and the larger golden section. A shortcut grows the window when
it is anchored to the opposite edge, so a single key both shrinks and expands.

## Getting started

### Requirements

- KDE Plasma 6 with KWin 6
- `kpackagetool6` (part of `kpackage`)

### Installation

From a release archive, install the package directly:

```sh
kpackagetool6 --type=KWin/Script --install .
```

From a source checkout, stage the installable payload first so that development
files and `node_modules` are not copied, then install it:

```sh
npm ci
npm run build
npm run package
kpackagetool6 --type=KWin/Script --install dist/window-sections
```

Alternatively, install it from _System Settings → Window Management → KWin
Scripts → Install from file_ using an archive created with
`npm run package -- --archive`.

After installing, enable **Enekranigo** under
_System Settings → Window Management → KWin Scripts_ and apply the change. KWin
picks up the script immediately; no session restart is required.

To remove it again:

```sh
kpackagetool6 --type=KWin/Script --remove window-sections
```

## Usage

The script registers four global shortcuts, one per direction. None of them is
bound by default, so they do not clash with KWin's built-in `Meta+Arrow`
quick-tile actions. Assign keys under
_System Settings → … → Keyboard → Shortcuts → KWin_.

| Action                         | Description                                                            |
| ------------------------------ | ---------------------------------------------------------------------- |
| Enekranigo: shift window left  | Move the window along the horizontal axis, anchored to the left edge.  |
| Enekranigo: shift window right | Move the window along the horizontal axis, anchored to the right edge. |
| Enekranigo: shift window up    | Move the window along the vertical axis, anchored to the top edge.     |
| Enekranigo: shift window down  | Move the window along the vertical axis, anchored to the bottom edge.  |

### The tiling cycle

Each press moves the focused window one step through a cycle of six fractions of
the work area:

| Step         | Fraction | Value    |
| ------------ | -------- | -------- |
| Half         | 1/2      | 0.500000 |
| Golden small | 1/φ²     | 0.381966 |
| Third        | 1/3      | 0.333333 |
| Quarter      | 1/4      | 0.250000 |
| Full         | 1        | 1.000000 |
| Golden large | 1/φ      | 0.618034 |

The window keeps whichever work-area edge it is already anchored to:

- On the shortcut's own edge, for example `shift-left` on a left-anchored
  window, it walks the cycle forwards and shrinks: half → golden small → third →
  quarter → full → golden large → half.
- On the opposite edge, for example `shift-left` on a right-anchored window, it
  walks the same list backwards and grows: quarter → third → golden small →
  half → golden large → full.

A window anchored to neither edge (a floating window) is placed on the
shortcut's edge at half. A size that is not exactly a step snaps to the adjacent
step in the direction of travel, so a right-anchored window at 29 % grows to a
third while a left-anchored window at 29 % shrinks to a quarter.

A window that fills the whole work area touches both edges and therefore counts
as the shortcut's own edge, so the next press shrinks it to the larger golden
section.

Each shortcut only changes its own axis. If the window is already snapped on the
perpendicular axis (flush to the top or bottom edge for the horizontal
shortcuts, or to the left or right edge for the vertical ones) it keeps its exact
position and size there; otherwise it is stretched to the full work area on that
axis. The state is derived purely from the window geometry, so manually moving or
resizing a window resets the cycle.

## Development

```sh
npm ci              # install tooling
npm run build       # bundle src/ into contents/code/main.js
npm test            # run the unit tests
npm run coverage    # enforce 100% line coverage
npm run lint        # eslint + prettier + markdownlint
npm run package     # stage the installable KPackage into dist/
```

The script KWin loads, `contents/code/main.js`, is generated from `src/` by
esbuild and is **not** committed. Run `npm run build` after changing `src/`; the
`test`, `coverage` and `package` scripts run the build automatically. CI builds
the bundle from a clean checkout, so the artifact can never drift from the
source.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the module layout and the geometry
contract, and [AGENTS.md](AGENTS.md) for the project conventions.

## License

GPL-2.0-or-later. See [LICENSE](LICENSE).

## Contributing

Bug reports and merge requests are welcome. Run `npm run lint` and
`npm run coverage` before submitting; both must pass.
