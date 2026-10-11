// SPDX-License-Identifier: GPL-2.0-or-later

/**
 * Pure cycling logic for the window-sections KWin script.
 *
 * The current step is derived from the window's own geometry, so the cycle
 * survives manual resizes and KWin restarts without any stored state.
 */

import { DEFAULT_PIXEL_TOLERANCE, FULL, HALF, QUARTER, STEPS, isAnchored } from './geometry.js';

/** Default tolerance when comparing a measured fraction with a cycle step. */
export const DEFAULT_FRACTION_TOLERANCE = 0.01;

/** The work-area edge opposite each command's edge. */
const OPPOSITE = Object.freeze({ left: 'right', right: 'left', up: 'down', down: 'up' });

/**
 * Pick the section a directional command should move the window to.
 *
 * The window keeps whichever work-area edge it is anchored to. On the command's
 * own edge it shrinks one step at a time through the cycle; on the opposite
 * edge it grows through the same cycle in reverse. A window anchored to neither
 * edge is placed on the command's edge at half. A size that is not exactly at a
 * step snaps to the adjacent step in the direction of travel.
 *
 * @param {{ x: number, y: number, width: number, height: number }} area Work area.
 * @param {'left'|'right'|'up'|'down'} command Edge whose direction was invoked.
 * @param {{ x: number, y: number, width: number, height: number }} rect Window rectangle.
 * @param {{ pixelTolerance?: number, fractionTolerance?: number }} [options] Tolerances.
 * @returns {{ side: 'left'|'right'|'up'|'down', fraction: number }} Section to apply.
 * @throws {Error} If `command` is not a known side.
 */
export function nextSection(area, command, rect, options = {}) {
  const pixelTolerance = options.pixelTolerance ?? DEFAULT_PIXEL_TOLERANCE;
  const fractionTolerance = options.fractionTolerance ?? DEFAULT_FRACTION_TOLERANCE;

  const opposite = OPPOSITE[command];
  const ownAnchored = isAnchored(area, command, rect, pixelTolerance);
  const oppositeAnchored = isAnchored(area, opposite, rect, pixelTolerance);

  if (!ownAnchored && oppositeAnchored) {
    const fraction = nextFraction(extentFraction(area, command, rect), 'growing', fractionTolerance);
    return { side: opposite, fraction };
  }

  if (!ownAnchored) {
    return { side: command, fraction: HALF };
  }

  const fraction = nextFraction(extentFraction(area, command, rect), 'shrinking', fractionTolerance);
  return { side: command, fraction };
}

/**
 * Snap a measured size to the next step in the direction of travel.
 *
 * `shrinking` returns the largest step strictly below `current` and wraps to
 * `FULL` when there is none. `growing` returns the smallest step strictly above
 * `current` and wraps to `QUARTER` when there is none.
 *
 * @param {number} current Measured extent fraction of the work area.
 * @param {'shrinking'|'growing'} direction Direction of travel.
 * @param {number} tolerance Fraction tolerance for classifying `current`.
 * @returns {number} Fraction of the next step.
 */
function nextFraction(current, direction, tolerance) {
  if (direction === 'shrinking') {
    return largestBelow(current, tolerance) ?? FULL;
  }
  return smallestAbove(current, tolerance) ?? QUARTER;
}

/**
 * Find the largest step strictly below a measured size.
 *
 * @param {number} current Measured extent fraction.
 * @param {number} tolerance Fraction tolerance.
 * @returns {number|undefined} The step, or undefined when there is none.
 */
function largestBelow(current, tolerance) {
  let found;
  for (const step of STEPS) {
    if (step < current - tolerance) {
      found = step;
    } else {
      break;
    }
  }
  return found;
}

/**
 * Find the smallest step strictly above a measured size.
 *
 * @param {number} current Measured extent fraction.
 * @param {number} tolerance Fraction tolerance.
 * @returns {number|undefined} The step, or undefined when there is none.
 */
function smallestAbove(current, tolerance) {
  let found;
  for (let index = STEPS.length - 1; index >= 0; index -= 1) {
    if (STEPS[index] > current + tolerance) {
      found = STEPS[index];
    } else {
      break;
    }
  }
  return found;
}

/**
 * Measure the window's extent along the side's axis as a fraction of the area.
 *
 * @param {{ x: number, y: number, width: number, height: number }} area Work area.
 * @param {'left'|'right'|'up'|'down'} side Side that defines the axis.
 * @param {{ x: number, y: number, width: number, height: number }} rect Window rectangle.
 * @returns {number} Extent fraction, or 0 for a degenerate (zero) area.
 */
function extentFraction(area, side, rect) {
  const horizontal = side === 'left' || side === 'right';
  const extent = horizontal ? rect.width : rect.height;
  const base = horizontal ? area.width : area.height;
  return base === 0 ? 0 : extent / base;
}
