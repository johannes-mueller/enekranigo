// SPDX-License-Identifier: GPL-2.0-or-later

/**
 * Stable identifiers and defaults for the shortcuts exposed by the script.
 *
 * The identifiers are the object names KWin stores user key bindings under, so
 * they must never change once released. Keeping them in their own module lets
 * the packaging test verify them without loading any KWin global.
 */

/**
 * Build a shortcut descriptor.
 *
 * @param {'shift'|'move'} kind Action group.
 * @param {'left'|'right'|'up'|'down'} direction Direction the action moves in.
 * @returns {{ kind: 'shift'|'move', direction: 'left'|'right'|'up'|'down', id: string, text: string, key: string }} Shortcut descriptor.
 */
function shortcut(kind, direction) {
  return Object.freeze({
    kind,
    direction,
    id: `window-sections-${kind}-${direction}`,
    text: `Enekranigo: ${kind} window ${direction}`,
    key: '',
  });
}

/**
 * Every shortcut exposed by the script, in registration order.
 *
 * Default key sequences are intentionally empty so the script does not clash
 * with the built-in Meta+Arrow quick-tile shortcuts; users assign keys in
 * System Settings.
 */
export const SHORTCUTS = Object.freeze([
  shortcut('shift', 'left'),
  shortcut('shift', 'right'),
  shortcut('shift', 'up'),
  shortcut('shift', 'down'),
  shortcut('move', 'left'),
  shortcut('move', 'right'),
  shortcut('move', 'up'),
  shortcut('move', 'down'),
]);
