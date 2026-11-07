// SPDX-License-Identifier: GPL-2.0-or-later

/**
 * KWin adapter for the Enekranigo script.
 *
 * This is the only module that touches KWin globals. It registers the global
 * shortcuts, resolves the active window and applies the geometry produced by
 * the pure core modules.
 */

import { DEFAULT_PIXEL_TOLERANCE, perpendicularBand, tileRect } from './geometry.js';
import { nextSection } from './cycle.js';
import { moveRect, screenIndexAt } from './move.js';
import { SHORTCUTS } from './shortcuts.js';

/** Action handlers keyed by the shortcut kind. */
const HANDLERS = Object.freeze({ shift: shiftWindow, move: moveWindow });

/** Register every shortcut exposed by the script. */
function register() {
  for (const shortcut of SHORTCUTS) {
    registerShortcut(shortcut.id, shortcut.text, shortcut.key, () => handle(shortcut));
  }
}

/**
 * Dispatch a shortcut to its action.
 *
 * @param {{ kind: 'shift'|'move', direction: 'left'|'right'|'up'|'down' }} shortcut Shortcut descriptor.
 */
function handle(shortcut) {
  HANDLERS[shortcut.kind](shortcut.direction);
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
  const options = { pixelTolerance: DEFAULT_PIXEL_TOLERANCE };
  const { side, fraction } = nextSection(area, command, rect, options);
  const band = perpendicularBand(area, side, rect, options);
  applyGeometry(window, tileRect(area, side, fraction, band));
}

/**
 * Move the active window to the edge in one direction.
 *
 * A window that is already at the edge crosses to the neighbouring output on
 * that side, if there is one.
 *
 * @param {'left'|'right'|'up'|'down'} command Direction that was invoked.
 */
function moveWindow(command) {
  const window = manageableActiveWindow();
  if (!window) {
    return;
  }

  const rect = geometryOf(window);
  const screens = screenAreas();
  const current = screenIndexAt(screens, rect);
  if (current < 0) {
    return;
  }

  const target = moveRect(screens, current, command, rect, {
    pixelTolerance: DEFAULT_PIXEL_TOLERANCE,
  });
  if (!target) {
    return;
  }

  applyGeometry(window, target.rect);
}

/**
 * Resolve the active window when it can actually be moved or tiled.
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
 * @returns {boolean} True when the window may be moved or tiled.
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
 * Read every output as a physical bounds and work-area pair.
 *
 * @returns {Array<{ bounds: { x: number, y: number, width: number, height: number }, area: { x: number, y: number, width: number, height: number } }>} Screens in workspace order.
 */
function screenAreas() {
  const outputs = workspace.screens;
  const screens = [];
  for (let index = 0; index < outputs.length; index += 1) {
    const output = outputs[index];
    screens.push({
      bounds: rectOf(output.geometry),
      area: rectOf(workspace.clientArea(KWin.MaximizeArea, output, workspace.currentDesktop)),
    });
  }
  return screens;
}

/**
 * Work area of the output the window is on, panels excluded.
 *
 * @param {object} window Window to query.
 * @returns {{ x: number, y: number, width: number, height: number }} Work area.
 */
function workArea(window) {
  return rectOf(workspace.clientArea(KWin.MaximizeArea, window));
}

/**
 * Copy a window's frame geometry into a plain rectangle object.
 *
 * @param {object} window Window to read.
 * @returns {{ x: number, y: number, width: number, height: number }} Plain rectangle.
 */
function geometryOf(window) {
  return rectOf(window.frameGeometry);
}

/**
 * Copy a rectangle-like object into a plain rectangle.
 *
 * @param {{ x: number, y: number, width: number, height: number }} rect Rectangle-like object.
 * @returns {{ x: number, y: number, width: number, height: number }} Plain rectangle.
 */
function rectOf(rect) {
  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
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
