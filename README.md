# Window Sections

## Synopsis

Window Sections is a KWin script for KDE Plasma 6 that tiles the focused window
through a cycle of proportions. The four directional shortcuts first put the
window in the corresponding half of the work area, then shrink it to the smaller
part of the golden section, a third and a quarter. Two further shortcuts expand
a window to the larger part of the golden section, horizontally or vertically.

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

After installing, enable **Window Sections** under
_System Settings → Window Management → KWin Scripts_ and apply the change. KWin
picks up the script immediately; no session restart is required.

To remove it again:

```sh
kpackagetool6 --type=KWin/Script --remove window-sections
```

## Usage

The script registers six global shortcuts. None of them is bound by default, so
they do not clash with KWin's built-in `Meta+Arrow` quick-tile actions. Assign
keys under _System Settings → … → Keyboard → Shortcuts → KWin_.

| Action                                 | Description                                                               |
| -------------------------------------- | ------------------------------------------------------------------------- |
| Window Sections: tile left             | Cycle the window through the left sections.                               |
| Window Sections: tile right            | Cycle the window through the right sections.                              |
| Window Sections: tile up               | Cycle the window through the top sections.                                |
| Window Sections: tile down             | Cycle the window through the bottom sections.                             |
| Window Sections: expand … horizontally | Expand the window to the larger golden section along the horizontal axis. |
| Window Sections: expand … vertically   | Expand the window to the larger golden section along the vertical axis.   |

### The tiling cycle

Each press of a directional shortcut measures the focused window against its
current position:

1. **Half** – the window occupies half of the work area (1/2). This is the
   behaviour of the built-in quick-tile actions.
2. **Golden section** – the window shrinks to the smaller part of the golden
   section (1/φ² ≈ 0.381966).
3. **Third** – the window shrinks to a third (1/3).
4. **Quarter** – the window shrinks to a quarter (1/4).

A further press wraps back to the half. The shortcut only advances the cycle
when the window is already anchored to the same edge at one of the four
fractions; otherwise it starts at the half again. This is derived purely from
the window geometry, so manually moving or resizing a window resets the cycle.

Left/right sections span the full height of the work area, up/down sections
span the full width.

### Expanding

The two expand shortcuts set the window to the larger part of the golden section
(1/φ ≈ 0.618034) along one axis. The window keeps whichever work-area edge it
currently touches: a left-anchored window grows towards the right, a
right-anchored window towards the left. When it touches neither edge, the larger
part is centered. The other axis is left untouched.

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
esbuild and committed. CI fails when the committed bundle is out of date, so run
`npm run build` after changing `src/`.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the module layout and the geometry
contract, and [AGENTS.md](AGENTS.md) for the project conventions.

## License

GPL-2.0-or-later. See [LICENSE](LICENSE).

## Contributing

Bug reports and merge requests are welcome. Run `npm run lint` and
`npm run coverage` before submitting; both must pass.
