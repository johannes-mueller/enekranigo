// SPDX-License-Identifier: GPL-2.0-or-later

/**
 * Stable identifiers and defaults for the shortcuts exposed by the script.
 *
 * The identifiers are the object names KWin stores user key bindings under, so
 * they must never change once released. Keeping them in their own module lets
 * the packaging test verify them without loading any KWin global.
 */

/** Shortcut object names, keyed by the action they trigger. */
export const SHORTCUTS = Object.freeze({
  left: 'window-sections-left',
  right: 'window-sections-right',
  up: 'window-sections-up',
  down: 'window-sections-down',
  expandHorizontal: 'window-sections-expand-horizontal',
  expandVertical: 'window-sections-expand-vertical',
});

/** Human readable descriptions shown in the Shortcuts settings module. */
export const SHORTCUT_TEXTS = Object.freeze({
  left: 'Window Sections: tile left (cycle half, golden, third, quarter)',
  right: 'Window Sections: tile right (cycle half, golden, third, quarter)',
  up: 'Window Sections: tile up (cycle half, golden, third, quarter)',
  down: 'Window Sections: tile down (cycle half, golden, third, quarter)',
  expandHorizontal: 'Window Sections: expand to the larger golden section horizontally',
  expandVertical: 'Window Sections: expand to the larger golden section vertically',
});

/**
 * Default key sequences. They are intentionally empty so the script does not
 * clash with the built-in Meta+Arrow quick-tile shortcuts; users assign keys
 * in System Settings.
 */
export const DEFAULT_KEYS = Object.freeze({
  left: '',
  right: '',
  up: '',
  down: '',
  expandHorizontal: '',
  expandVertical: '',
});
