// SPDX-License-Identifier: GPL-2.0-or-later

/**
 * Pure geometry core for the Enekranigo KWin script.
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

/** Default pixel tolerance used when matching a window against an edge. */
export const DEFAULT_PIXEL_TOLERANCE = 2;

/**
 * Compute the rectangle for placing a window against one side of the work area.
 *
 * The given fraction measures the axis the side moves along, so a left
 * placement of one half is half as wide as the area. The axis perpendicular to
 * the side is taken from `band` when one is given, otherwise it spans the whole
 * work area.
 *
 * @param {{ x: number, y: number, width: number, height: number }} area Work area.
 * @param {'left'|'right'|'up'|'down'} side Side to place the window against.
 * @param {number} fraction Extent of the window along the side's axis, 0..1.
 * @param {{ start: number, size: number }} [band] Offset and extent to keep on
 *   the perpendicular axis, as produced by {@link perpendicularBand}.
 * @returns {{ x: number, y: number, width: number, height: number }} Target rectangle.
 * @throws {Error} If `side` is not a known side.
 */
export function tileRect(area, side, fraction, band) {
  const horizontal = isHorizontal(side);
  const extent = Math.round((horizontal ? area.width : area.height) * fraction);
  const cross = band ?? fullBand(area, horizontal);

  if (horizontal) {
    const x = side === 'left' ? area.x : area.x + area.width - extent;
    return { x, y: cross.start, width: extent, height: cross.size };
  }

  const y = side === 'up' ? area.y : area.y + area.height - extent;
  return { x: cross.start, y, width: cross.size, height: extent };
}

/**
 * Extent to keep on the axis perpendicular to a side.
 *
 * When the window is already flush to a work-area edge on that axis its exact
 * offset and size are returned, so snapping along the other axis leaves the
 * window untouched there. A window attached to neither edge of that axis gets
 * the whole work area.
 *
 * @param {{ x: number, y: number, width: number, height: number }} area Work area.
 * @param {'left'|'right'|'up'|'down'} side Side being snapped to.
 * @param {{ x: number, y: number, width: number, height: number }} rect Window rectangle.
 * @param {{ pixelTolerance?: number }} [options] Tolerances.
 * @returns {{ start: number, size: number }} Perpendicular offset and extent.
 * @throws {Error} If `side` is not a known side.
 */
export function perpendicularBand(area, side, rect, options = {}) {
  const tolerance = options.pixelTolerance ?? DEFAULT_PIXEL_TOLERANCE;
  return isHorizontal(side) ? verticalBand(area, rect, tolerance) : horizontalBand(area, rect, tolerance);
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
export function isAnchored(area, side, rect, tolerance) {
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
 * Whether a side moves along the horizontal axis.
 *
 * @param {'left'|'right'|'up'|'down'} side Side to classify.
 * @returns {boolean} True for `left` and `right`.
 * @throws {Error} If `side` is not a known side.
 */
function isHorizontal(side) {
  if (side === 'left' || side === 'right') {
    return true;
  }
  if (side === 'up' || side === 'down') {
    return false;
  }
  throw new Error(`unknown side: ${side}`);
}

/**
 * The full extent of a work area on the axis perpendicular to a side.
 *
 * @param {{ x: number, y: number, width: number, height: number }} area Work area.
 * @param {boolean} horizontal Whether the side moves horizontally.
 * @returns {{ start: number, size: number }} Full perpendicular band.
 */
function fullBand(area, horizontal) {
  return horizontal ? { start: area.y, size: area.height } : { start: area.x, size: area.width };
}

/**
 * The vertical band a horizontal placement should keep.
 *
 * @param {{ x: number, y: number, width: number, height: number }} area Work area.
 * @param {{ x: number, y: number, width: number, height: number }} rect Window rectangle.
 * @param {number} tolerance Pixel tolerance.
 * @returns {{ start: number, size: number }} Vertical offset and extent.
 */
function verticalBand(area, rect, tolerance) {
  if (isAnchored(area, 'up', rect, tolerance) || isAnchored(area, 'down', rect, tolerance)) {
    return { start: rect.y, size: rect.height };
  }
  return { start: area.y, size: area.height };
}

/**
 * The horizontal band a vertical placement should keep.
 *
 * @param {{ x: number, y: number, width: number, height: number }} area Work area.
 * @param {{ x: number, y: number, width: number, height: number }} rect Window rectangle.
 * @param {number} tolerance Pixel tolerance.
 * @returns {{ start: number, size: number }} Horizontal offset and extent.
 */
function horizontalBand(area, rect, tolerance) {
  if (isAnchored(area, 'left', rect, tolerance) || isAnchored(area, 'right', rect, tolerance)) {
    return { start: rect.x, size: rect.width };
  }
  return { start: area.x, size: area.width };
}
