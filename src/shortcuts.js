// SPDX-License-Identifier: GPL-2.0-or-later

/**
 * Stable identifiers and defaults for the shortcuts exposed by the script.
 *
 * The identifiers are the object names KWin stores user key bindings under, so
 * they must never change once released. Keeping them in their own module lets
 * the packaging test verify them without loading any KWin global.
 */

/** Shortcut object names, keyed by the direction they trigger. */
export const SHORTCUTS = Object.freeze({
  left: 'window-sections-shift-left',
  right: 'window-sections-shift-right',
  up: 'window-sections-shift-up',
  down: 'window-sections-shift-down',
});

/** Human readable descriptions shown in the Shortcuts settings module. */
export const SHORTCUT_TEXTS = Object.freeze({
  left: 'Window Sections: shift window left',
  right: 'Window Sections: shift window right',
  up: 'Window Sections: shift window up',
  down: 'Window Sections: shift window down',
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
});
