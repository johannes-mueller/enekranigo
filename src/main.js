// SPDX-License-Identifier: GPL-2.0-or-later

/**
 * KWin adapter for the window-sections script.
 *
 * This is the only module that touches KWin globals. It registers the global
 * shortcuts, resolves the active window and applies the geometry produced by
 * the pure core modules.
 */

import { tileRect } from './geometry.js';
import { nextSection } from './cycle.js';
import { DEFAULT_KEYS, SHORTCUTS, SHORTCUT_TEXTS } from './shortcuts.js';

/** Pixel tolerance used when matching a window against the work-area edges. */
const PIXEL_TOLERANCE = 2;

/** Register every shortcut exposed by the script. */
function register() {
  bind('left', () => shiftWindow('left'));
  bind('right', () => shiftWindow('right'));
  bind('up', () => shiftWindow('up'));
  bind('down', () => shiftWindow('down'));
}

/**
 * Register a single shortcut by key.
 *
 * @param {string} key Key into the shortcut tables.
 * @param {Function} callback Action to run when the shortcut is invoked.
 */
function bind(key, callback) {
  registerShortcut(SHORTCUTS[key], SHORTCUT_TEXTS[key], DEFAULT_KEYS[key], callback);
}

/**
 * Move the active window to the next section in one direction.
 *
 * @param {'left'|'right'|'up'|'down'} command Direction that was invoked.
 */
function shiftWindow(command) {
  const window = manageableActiveWindow();
  if (!window) {
    return;
  }

  const area = workArea(window);
  const rect = geometryOf(window);
  const { side, fraction } = nextSection(area, command, rect, { pixelTolerance: PIXEL_TOLERANCE });
  applyGeometry(window, tileRect(area, side, fraction));
}

/**
 * Resolve the active window when it can actually be tiled.
 *
 * @returns {object|null} The active window, or null when it must be left alone.
 */
function manageableActiveWindow() {
  const window = workspace.activeWindow;
  return isManageable(window) ? window : null;
}

/**
 * Whether a window is managed, visible and freely moveable/resizable.
 *
 * @param {object|undefined} window Candidate window.
 * @returns {boolean} True when the window may be tiled.
 */
function isManageable(window) {
  return (
    Boolean(window) &&
    window.managed &&
    !window.deleted &&
    !window.specialWindow &&
    window.moveable &&
    window.resizeable
  );
}

/**
 * Work area of the output the window is on, panels excluded.
 *
 * @param {object} window Window to query.
 * @returns {{ x: number, y: number, width: number, height: number }} Work area.
 */
function workArea(window) {
  return workspace.clientArea(KWin.MaximizeArea, window);
}

/**
 * Copy a window's frame geometry into a plain rectangle object.
 *
 * @param {object} window Window to read.
 * @returns {{ x: number, y: number, width: number, height: number }} Plain rectangle.
 */
function geometryOf(window) {
  const frame = window.frameGeometry;
  return { x: frame.x, y: frame.y, width: frame.width, height: frame.height };
}

/**
 * Restore a window from maximized/fullscreen and apply a new geometry.
 *
 * @param {object} window Window to change.
 * @param {{ x: number, y: number, width: number, height: number }} rect Target geometry.
 */
function applyGeometry(window, rect) {
  window.fullScreen = false;
  window.setMaximize(false, false);
  window.frameGeometry = rect;
}

register();
