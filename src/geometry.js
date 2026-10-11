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

/** Tiling fractions in cycle order, largest first. */
export const STEPS = [HALF, GOLDEN_SMALL, THIRD, QUARTER];

/** Sides accepted by {@link tileRect}. */
export const SIDES = ['left', 'right', 'up', 'down'];

/** Axes accepted by {@link expandRect}. */
export const AXES = ['horizontal', 'vertical'];

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

/**
 * Compute the rectangle for expanding a window to the larger golden section
 * along one axis, keeping the work-area edge the window currently touches.
 *
 * The window keeps its position and extent on the other axis. When the window
 * touches neither edge of the given axis, the larger part is centered.
 *
 * @param {{ x: number, y: number, width: number, height: number }} area Work area.
 * @param {'horizontal'|'vertical'} axis Axis to expand along.
 * @param {{ x: number, y: number, width: number, height: number }} rect Current window rectangle.
 * @param {number} [tolerance] Pixel tolerance for deciding which edge is touched.
 * @returns {{ x: number, y: number, width: number, height: number }} Target rectangle.
 * @throws {Error} If `axis` is not a known axis.
 */
export function expandRect(area, axis, rect, tolerance = 0) {
  if (axis === 'horizontal') {
    const width = Math.round(area.width * GOLDEN_LARGE);
    return {
      x: anchoredOrigin(area.x, area.width, width, rect.x, rect.width, tolerance),
      y: rect.y,
      width,
      height: rect.height,
    };
  }

  if (axis === 'vertical') {
    const height = Math.round(area.height * GOLDEN_LARGE);
    return {
      x: rect.x,
      y: anchoredOrigin(area.y, area.height, height, rect.y, rect.height, tolerance),
      width: rect.width,
      height,
    };
  }

  throw new Error(`unknown axis: ${axis}`);
}

/**
 * Resolve the origin of the expanded rectangle along one axis: pinned to the
 * touched edge, or centered when no edge is touched.
 *
 * @param {number} areaOrigin Origin of the work area on the axis.
 * @param {number} areaExtent Extent of the work area on the axis.
 * @param {number} targetExtent Extent of the expanded window on the axis.
 * @param {number} windowOrigin Origin of the window on the axis.
 * @param {number} windowExtent Extent of the window on the axis.
 * @param {number} tolerance Pixel tolerance for edge detection.
 * @returns {number} Origin of the expanded window on the axis.
 */
function anchoredOrigin(areaOrigin, areaExtent, targetExtent, windowOrigin, windowExtent, tolerance) {
  if (Math.abs(windowOrigin - areaOrigin) <= tolerance) {
    return areaOrigin;
  }

  if (Math.abs(windowOrigin + windowExtent - (areaOrigin + areaExtent)) <= tolerance) {
    return areaOrigin + areaExtent - targetExtent;
  }

  return areaOrigin + Math.round((areaExtent - targetExtent) / 2);
}
