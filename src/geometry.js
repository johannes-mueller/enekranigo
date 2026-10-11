// SPDX-License-Identifier: GPL-2.0-or-later

/**
 * Pure geometry core for the window-sections KWin script.
 *
 * Everything here works on plain rectangle objects of the shape
 * `{ x, y, width, height }` and never touches KWin globals, Qt types or
 * configuration. That keeps the tiling maths trivially unit-testable.
 */

/** The golden ratio, phi = (1 + sqrt(5)) / 2. */
export const PHI = (1 + Math.sqrt(5)) / 2;

/** Fraction of the work area used for a half. */
export const HALF = 1 / 2;

/** Fraction of the work area used for the smaller part of the golden section. */
export const GOLDEN_SMALL = 1 / (PHI * PHI);

/** Fraction of the work area used for a third. */
export const THIRD = 1 / 3;

/** Fraction of the work area used for a quarter. */
export const QUARTER = 1 / 4;

/** Fraction of the work area used for the larger part of the golden section. */
export const GOLDEN_LARGE = 1 / PHI;

/** Fraction of the work area used by a full-size window. */
export const FULL = 1;

/**
 * Every tiling fraction, ascending.
 *
 * The cycling logic snaps a measured size to the neighbouring entry, so the
 * order matters.
 */
export const STEPS = [QUARTER, THIRD, GOLDEN_SMALL, HALF, GOLDEN_LARGE, FULL];

/** Sides accepted by {@link tileRect}. */
export const SIDES = ['left', 'right', 'up', 'down'];

/**
 * Compute the rectangle for placing a window against one side of the work area.
 *
 * Left/right placements span the full height of the area; up/down placements
 * span the full width. The given fraction always measures the axis that the
 * side moves along, so a left placement of one half is half as wide as the area.
 *
 * @param {{ x: number, y: number, width: number, height: number }} area Work area.
 * @param {'left'|'right'|'up'|'down'} side Side to place the window against.
 * @param {number} fraction Extent of the window along the side's axis, 0..1.
 * @returns {{ x: number, y: number, width: number, height: number }} Target rectangle.
 * @throws {Error} If `side` is not a known side.
 */
export function tileRect(area, side, fraction) {
  const width = Math.round(area.width * fraction);
  const height = Math.round(area.height * fraction);

  switch (side) {
    case 'left':
      return { x: area.x, y: area.y, width, height: area.height };
    case 'right':
      return { x: area.x + area.width - width, y: area.y, width, height: area.height };
    case 'up':
      return { x: area.x, y: area.y, width: area.width, height };
    case 'down':
      return { x: area.x, y: area.y + area.height - height, width: area.width, height };
    default:
      throw new Error(`unknown side: ${side}`);
  }
}
