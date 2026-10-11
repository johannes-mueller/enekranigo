// SPDX-License-Identifier: GPL-2.0-or-later

/**
 * Pure cycling logic for the window-sections KWin script.
 *
 * The current step is derived from the window's own geometry, so the cycle
 * survives manual resizes and KWin restarts without any stored state.
 */

import { STEPS } from './geometry.js';

/** Default pixel tolerance for edge detection. */
export const DEFAULT_PIXEL_TOLERANCE = 2;

/** Default tolerance when comparing a measured fraction with a cycle step. */
export const DEFAULT_FRACTION_TOLERANCE = 0.01;

/**
 * Find the cycle step a window is currently at for a given side.
 *
 * A window is considered to be at a step when it is anchored to that side's
 * work-area edge and its extent along the side's axis matches the step's
 * fraction. Anything else (including a larger golden-section window) reports
 * no match, so the next press starts the cycle at its first step.
 *
 * @param {{ x: number, y: number, width: number, height: number }} area Work area.
 * @param {'left'|'right'|'up'|'down'} side Side to check against.
 * @param {{ x: number, y: number, width: number, height: number }} rect Window rectangle.
 * @param {{ pixelTolerance?: number, fractionTolerance?: number }} [options] Tolerances.
 * @returns {number} Index into `STEPS`, or -1 when the window is at no step.
 * @throws {Error} If `side` is not a known side.
 */
export function stepIndexFor(area, side, rect, options = {}) {
  const pixelTolerance = options.pixelTolerance ?? DEFAULT_PIXEL_TOLERANCE;
  const fractionTolerance = options.fractionTolerance ?? DEFAULT_FRACTION_TOLERANCE;

  if (!isAnchored(area, side, rect, pixelTolerance)) {
    return -1;
  }

  const fraction = extentFraction(area, side, rect);
  return STEPS.findIndex((step) => Math.abs(fraction - step) <= fractionTolerance);
}

/**
 * Fraction for the next press on a given side.
 *
 * Starts at the first step when the window is at no step, advances one step
 * otherwise, and wraps from the last step back to the first.
 *
 * @param {{ x: number, y: number, width: number, height: number }} area Work area.
 * @param {'left'|'right'|'up'|'down'} side Side that was invoked.
 * @param {{ x: number, y: number, width: number, height: number }} rect Window rectangle.
 * @param {{ pixelTolerance?: number, fractionTolerance?: number }} [options] Tolerances.
 * @returns {number} Fraction to apply.
 * @throws {Error} If `side` is not a known side.
 */
export function nextStep(area, side, rect, options = {}) {
  const index = stepIndexFor(area, side, rect, options);
  return index < 0 ? STEPS[0] : STEPS[(index + 1) % STEPS.length];
}

/**
 * Whether a window is anchored to the given side's work-area edge.
 *
 * @param {{ x: number, y: number, width: number, height: number }} area Work area.
 * @param {'left'|'right'|'up'|'down'} side Side to check.
 * @param {{ x: number, y: number, width: number, height: number }} rect Window rectangle.
 * @param {number} tolerance Pixel tolerance.
 * @returns {boolean} True when the relevant edge touches the work area.
 * @throws {Error} If `side` is not a known side.
 */
function isAnchored(area, side, rect, tolerance) {
  switch (side) {
    case 'left':
      return Math.abs(rect.x - area.x) <= tolerance;
    case 'right':
      return Math.abs(rect.x + rect.width - (area.x + area.width)) <= tolerance;
    case 'up':
      return Math.abs(rect.y - area.y) <= tolerance;
    case 'down':
      return Math.abs(rect.y + rect.height - (area.y + area.height)) <= tolerance;
    default:
      throw new Error(`unknown side: ${side}`);
  }
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
