# Development

This document covers the local build, install and debug loop, the nested-KWin
test and the release checklist. For the module layout see
[ARCHITECTURE.md](../ARCHITECTURE.md); for the contributor conventions see
[AGENTS.md](../AGENTS.md).

## Prerequisites

- Node.js 20 or newer and npm
- KDE Plasma 6 with KWin 6
- `kpackagetool6` (part of `kpackage`)
- `zip` for `npm run package -- --archive`
- Optional: CMake 3.16 or newer and extra-cmake-modules for the distro packaging
  path
- Optional, for the end-to-end test: `kwin_wayland`, `qdbus6` and
  `dbus-run-session`

## Build and test

```sh
npm ci              # install tooling
npm run build       # bundle src/ into contents/code/main.js
npm test            # build and run the unit tests
npm run coverage    # build and enforce 100% coverage of src/
npm run lint        # eslint + prettier + markdownlint
npm run format      # apply Prettier
npm run package     # build and stage dist/window-sections
```

The bundle `contents/code/main.js` is generated and is not committed. The
`test`, `coverage` and `package` scripts build it automatically; run
`npm run build` explicitly only when you need the bundle without staging a
package.

`npm run coverage` includes every file under `src/` through c8's `--all` option.
A new module therefore has to be tested before the gate can pass. The adapter
test in `test/main.test.js` uses a hand-written in-memory KWin environment; it
is the only permitted test double.

## Local install and reload

For a first installation:

```sh
npm ci
npm run package
kpackagetool6 --type=KWin/Script --install dist/window-sections
```

For subsequent builds, upgrade the installed package:

```sh
npm run package
kpackagetool6 --type=KWin/Script --upgrade dist/window-sections
```

Then enable **Enekranigo** under
_System Settings → Window Management → KWin Scripts_ and apply the change. After
an upgrade KWin may keep the previously loaded bundle; toggle the script off and
on, or restart the KWin session, to load the new one.

To remove the package again:

```sh
kpackagetool6 --type=KWin/Script --remove window-sections
```

The KPackage id and install directory are `window-sections`. The display name is
Enekranigo; see
[ARCHITECTURE.md](../ARCHITECTURE.md#names-and-identifiers) for the frozen
identifiers.

## Debugging

Use `console.log` and `console.error`; `print` no longer emits output under
KWin 6. KWin script output appears in the session journal. On a Plasma Wayland
session:

```sh
journalctl --user -u plasma-kwin_wayland -f
```

On an X11 session, use the corresponding KWin unit, usually
`plasma-kwin_x11`. Script messages are prefixed with `js:`; JavaScript errors and
warnings are the most useful lines when a shortcut appears to do nothing.

The adapter silently ignores a missing, unmanaged, deleted, special or
non-moveable/non-resizeable window. If a shortcut has no effect, first check
whether the active window is one the script is allowed to tile.

## Nested KWin and the end-to-end test

```sh
./scripts/e2e.sh
```

The script stages and installs the package, starts a virtual nested KWin in its
own D-Bus session, loads the main script through KWin's scripting D-Bus
interface and fails if KWin reports a JavaScript error.

Important caveats:

- It is a smoke test for packaging and script loading. It does not assert the
  resulting window geometry.
- It removes and reinstalls the `window-sections` package in the current user's
  data directory. Run it in a disposable session if you have the script installed
  for daily use.
- It exits successfully when a required command is missing, so a CI job must
  ensure the dependencies are installed for the test to mean anything.
- The integration workflow is nightly and non-blocking. A red run still needs
  triage.

## The two installation paths

### KPackage tooling

`npm run package` stages `metadata.json` and `contents/` into
`dist/window-sections`, which can be installed with `kpackagetool6`. This is the
path for local development and release archives.

### CMake

The CMake project is intended for distro packaging. It installs only the
KPackage payload; it does not build the JavaScript bundle. Build the bundle
first:

```sh
npm ci
npm run build
cmake -B build
cmake --install build
```

The project requires ECM 6.0 or newer. No CI workflow exercises this path, so
verify the install manually when changing `CMakeLists.txt`.

## Release checklist

1. Choose the next semantic version and update it in:
   - `package.json` and `package-lock.json` (for example with
     `npm version <version> --no-git-tag-version`);
   - `metadata.json` `KPlugin.Version`;
   - `CMakeLists.txt` `project(... VERSION ...)`;
   - `CHANGELOG.md`, moving the `Unreleased` entries under the new version and
     date.
2. Run the full local checks:

   ```sh
   npm ci
   npm run lint
   npm run coverage
   npm run package -- --archive
   ```

3. Verify that the versions agree. There is no automated tag/version check:

   ```sh
   grep -n "X.Y.Z" package.json package-lock.json metadata.json CMakeLists.txt CHANGELOG.md
   ```

4. Install the staged package once and confirm that it is registered:

   ```sh
   kpackagetool6 --type=KWin/Script --install dist/window-sections
   kpackagetool6 --type=KWin/Script --list | grep window-sections
   kpackagetool6 --type=KWin/Script --remove window-sections
   ```

5. Commit the release, create the `vX.Y.Z` tag and push both. Confirm that the
   tag, `metadata.json`, `package.json`, `CMakeLists.txt` and `CHANGELOG.md`
   agree.

The archive is written to `dist/window-sections.kwinscript` and requires `zip`.
