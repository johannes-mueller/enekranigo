// SPDX-License-Identifier: GPL-2.0-or-later

/**
 * Pure screen-movement core for the Enekranigo KWin script.
 *
 * The functions here work on plain rectangles and screen descriptors, so they
 * can move windows between outputs without touching KWin globals, Qt types or
 * configuration.
 */

import { DEFAULT_PIXEL_TOLERANCE, isAnchored } from './geometry.js';

/** The work-area edge opposite each movement direction. */
const OPPOSITE = Object.freeze({ left: 'right', right: 'left', up: 'down', down: 'up' });

/**
 * Find the index of the screen that contains a rectangle's centre.
 *
 * When the centre falls into a gap between outputs the nearest output is
 * returned, mirroring KWin's own output lookup.
 *
 * @param {Array<{ bounds: { x: number, y: number, width: number, height: number }, area: { x: number, y: number, width: number, height: number } }>} screens Screens to search.
 * @param {{ x: number, y: number, width: number, height: number }} rect Window rectangle.
 * @returns {number} Screen index, or -1 when there are no screens.
 */
export function screenIndexAt(screens, rect) {
  if (screens.length === 0) {
    return -1;
  }

  const center = centerOf(rect);
  let bestIndex = 0;
  let bestDistance = Infinity;

  for (let index = 0; index < screens.length; index += 1) {
    const distance = distanceToRect(screens[index].bounds, center);
    if (distance === 0) {
      return index;
    }
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }

  return bestIndex;
}

/**
 * Move a window to the edge in one direction, crossing outputs when necessary.
 *
 * A window that is not already anchored to the commanded edge is placed there
 * without resizing. A window that is anchored crosses to the nearest output in
 * that direction and lands flush to the opposite edge. If no such output
 * exists, the result is null and nothing should change.
 *
 * @param {Array<{ bounds: { x: number, y: number, width: number, height: number }, area: { x: number, y: number, width: number, height: number } }>} screens Screens in the workspace.
 * @param {number} current Index of the screen the window is on.
 * @param {'left'|'right'|'up'|'down'} command Direction that was invoked.
 * @param {{ x: number, y: number, width: number, height: number }} rect Window rectangle.
 * @param {{ pixelTolerance?: number }} [options] Tolerances.
 * @returns {{ index: number, rect: { x: number, y: number, width: number, height: number } }|null} The target screen and rectangle, or null when there is nowhere to go.
 * @throws {Error} If the screen index is unknown or the command is not a known side.
 */
export function moveRect(screens, current, command, rect, options = {}) {
  const screen = screens[current];
  if (!screen) {
    throw new Error(`unknown screen: ${current}`);
  }

  const tolerance = options.pixelTolerance ?? DEFAULT_PIXEL_TOLERANCE;
  if (!isAnchored(screen.area, command, rect, tolerance)) {
    return { index: current, rect: alignToEdge(screen.area, command, rect) };
  }

  const neighbor = neighborIndex(screens, current, command);
  if (neighbor < 0) {
    return null;
  }

  return {
    index: neighbor,
    rect: placeOnOppositeEdge(screens[neighbor].area, command, rect),
  };
}

/**
 * Find the nearest screen in the requested direction that shares a band.
 *
 * @param {Array<{ bounds: { x: number, y: number, width: number, height: number } }>} screens Screens to search.
 * @param {number} current Index of the current screen.
 * @param {'left'|'right'|'up'|'down'} command Direction to search.
 * @returns {number} Neighbour index, or -1 when there is none.
 */
function neighborIndex(screens, current, command) {
  const currentBounds = screens[current].bounds;
  const horizontal = isHorizontal(command);
  const currentCenter = axisCenter(currentBounds, horizontal);
  let bestIndex = -1;
  let bestDistance = Infinity;

  for (let index = 0; index < screens.length; index += 1) {
    if (index === current) {
      continue;
    }

    const bounds = screens[index].bounds;
    if (!sharesBand(bounds, currentBounds, horizontal)) {
      continue;
    }

    const distance = directionDistance(axisCenter(bounds, horizontal), currentCenter, command);
    if (distance === null || distance >= bestDistance) {
      continue;
    }

    bestIndex = index;
    bestDistance = distance;
  }

  return bestIndex;
}

/**
 * Whether a candidate screen overlaps the current screen on the perpendicular axis.
 *
 * @param {{ x: number, y: number, width: number, height: number }} bounds Candidate bounds.
 * @param {{ x: number, y: number, width: number, height: number }} current Current bounds.
 * @param {boolean} horizontal Whether the movement is horizontal.
 * @returns {boolean} True when the screens share a band.
 */
function sharesBand(bounds, current, horizontal) {
  if (horizontal) {
    return bounds.y <= current.y + current.height && bounds.y + bounds.height >= current.y;
  }
  return bounds.x <= current.x + current.width && bounds.x + bounds.width >= current.x;
}

/**
 * The centre coordinate on the movement axis.
 *
 * @param {{ x: number, y: number, width: number, height: number }} bounds Screen bounds.
 * @param {boolean} horizontal Whether to use the x axis.
 * @returns {number} Centre coordinate.
 */
function axisCenter(bounds, horizontal) {
  return horizontal ? bounds.x + bounds.width / 2 : bounds.y + bounds.height / 2;
}

/**
 * Distance from the current screen centre to a candidate, or null when the
 * candidate is not in the requested direction.
 *
 * @param {number} candidate Candidate centre coordinate.
 * @param {number} current Current centre coordinate.
 * @param {'left'|'right'|'up'|'down'} command Direction to search.
 * @returns {number|null} Distance, or null when the candidate is not in front.
 */
function directionDistance(candidate, current, command) {
  if (command === 'right' || command === 'down') {
    return candidate > current ? candidate - current : null;
  }
  return candidate < current ? current - candidate : null;
}

/**
 * Place a window flush to one edge without resizing it.
 *
 * @param {{ x: number, y: number, width: number, height: number }} area Work area.
 * @param {'left'|'right'|'up'|'down'} command Edge to align to.
 * @param {{ x: number, y: number, width: number, height: number }} rect Window rectangle.
 * @returns {{ x: number, y: number, width: number, height: number }} Aligned rectangle.
 */
function alignToEdge(area, command, rect) {
  if (isHorizontal(command)) {
    const x = command === 'left' ? area.x : area.x + area.width - rect.width;
    return { x, y: rect.y, width: rect.width, height: rect.height };
  }
  const y = command === 'up' ? area.y : area.y + area.height - rect.height;
  return { x: rect.x, y, width: rect.width, height: rect.height };
}

/**
 * Place a window on the opposite edge of a target work area.
 *
 * Width and height are clamped to the target area independently, and the
 * perpendicular coordinate is clamped so the window remains visible.
 *
 * @param {{ x: number, y: number, width: number, height: number }} area Target work area.
 * @param {'left'|'right'|'up'|'down'} command Direction of travel.
 * @param {{ x: number, y: number, width: number, height: number }} rect Window rectangle.
 * @returns {{ x: number, y: number, width: number, height: number }} Target rectangle.
 */
function placeOnOppositeEdge(area, command, rect) {
  const side = OPPOSITE[command];
  const width = Math.min(rect.width, area.width);
  const height = Math.min(rect.height, area.height);

  if (isHorizontal(command)) {
    const x = side === 'left' ? area.x : area.x + area.width - width;
    return {
      x,
      y: clamp(rect.y, area.y, area.y + area.height - height),
      width,
      height,
    };
  }

  const y = side === 'up' ? area.y : area.y + area.height - height;
  return {
    x: clamp(rect.x, area.x, area.x + area.width - width),
    y,
    width,
    height,
  };
}

/**
 * Whether a command moves along the horizontal axis.
 *
 * @param {'left'|'right'|'up'|'down'} command Direction to classify.
 * @returns {boolean} True for left and right.
 */
function isHorizontal(command) {
  return command === 'left' || command === 'right';
}

/**
 * The centre point of a rectangle.
 *
 * @param {{ x: number, y: number, width: number, height: number }} rect Rectangle.
 * @returns {{ x: number, y: number }} Centre point.
 */
function centerOf(rect) {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

/**
 * Squared distance from a point to the nearest point of a rectangle.
 *
 * @param {{ x: number, y: number, width: number, height: number }} rect Rectangle.
 * @param {{ x: number, y: number }} point Point to measure.
 * @returns {number} Squared distance.
 */
function distanceToRect(rect, point) {
  const x = clamp(point.x, rect.x, rect.x + rect.width);
  const y = clamp(point.y, rect.y, rect.y + rect.height);
  const dx = point.x - x;
  const dy = point.y - y;
  return dx * dx + dy * dy;
}

/**
 * Clamp a value into an inclusive range.
 *
 * @param {number} value Value to clamp.
 * @param {number} min Lower bound.
 * @param {number} max Upper bound.
 * @returns {number} Clamped value.
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
