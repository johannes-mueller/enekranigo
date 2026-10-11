// SPDX-License-Identifier: GPL-2.0-or-later

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_PIXEL_TOLERANCE,
  FULL,
  GOLDEN_LARGE,
  GOLDEN_SMALL,
  HALF,
  PHI,
  QUARTER,
  SIDES,
  STEPS,
  THIRD,
  isAnchored,
  perpendicularBand,
  tileRect,
} from '../src/geometry.js';

const AREA = { x: 100, y: 50, width: 1000, height: 800 };

describe('fractions', () => {
  it('uses the golden ratio for the golden section', () => {
    assert.ok(Math.abs(PHI - 1.6180339887498949) < 1e-12);
    assert.ok(Math.abs(GOLDEN_SMALL - 0.3819660112501051) < 1e-12);
    assert.ok(Math.abs(GOLDEN_LARGE - 0.6180339887498949) < 1e-12);
    assert.ok(Math.abs(GOLDEN_SMALL + GOLDEN_LARGE - 1) < 1e-12);
  });

  it('lists every tiling fraction once, ascending', () => {
    assert.equal(FULL, 1);
    assert.deepEqual(STEPS, [QUARTER, THIRD, GOLDEN_SMALL, HALF, GOLDEN_LARGE, FULL]);
    for (let index = 1; index < STEPS.length; index += 1) {
      assert.ok(STEPS[index] > STEPS[index - 1]);
    }
  });

  it('documents the supported sides', () => {
    assert.deepEqual(SIDES, ['left', 'right', 'up', 'down']);
  });

  it('exposes the documented pixel tolerance', () => {
    assert.equal(DEFAULT_PIXEL_TOLERANCE, 2);
  });
});

describe('tileRect', () => {
  it('places a left window against the left edge at full height', () => {
    assert.deepEqual(tileRect(AREA, 'left', HALF), {
      x: 100,
      y: 50,
      width: 500,
      height: 800,
    });
  });

  it('places a right window against the right edge at full height', () => {
    assert.deepEqual(tileRect(AREA, 'right', HALF), {
      x: 600,
      y: 50,
      width: 500,
      height: 800,
    });
  });

  it('places an up window against the top edge at full width', () => {
    assert.deepEqual(tileRect(AREA, 'up', QUARTER), {
      x: 100,
      y: 50,
      width: 1000,
      height: 200,
    });
  });

  it('places a down window against the bottom edge at full width', () => {
    assert.deepEqual(tileRect(AREA, 'down', QUARTER), {
      x: 100,
      y: 650,
      width: 1000,
      height: 200,
    });
  });

  it('fills the whole work area for a full fraction', () => {
    assert.deepEqual(tileRect(AREA, 'left', FULL), {
      x: 100,
      y: 50,
      width: 1000,
      height: 800,
    });
  });

  it('rounds fractional extents', () => {
    const area = { x: 0, y: 0, width: 1001, height: 799 };
    assert.equal(tileRect(area, 'left', THIRD).width, 334);
    assert.equal(tileRect(area, 'up', GOLDEN_SMALL).height, 305);
  });

  it('rejects unknown sides', () => {
    assert.throws(() => tileRect(AREA, 'diagonal', HALF), /unknown side: diagonal/);
  });

  it('applies a vertical band to horizontal placements', () => {
    const band = { start: 50, size: 400 };
    assert.deepEqual(tileRect(AREA, 'left', HALF, band), {
      x: 100,
      y: 50,
      width: 500,
      height: 400,
    });
    assert.deepEqual(tileRect(AREA, 'right', HALF, band), {
      x: 600,
      y: 50,
      width: 500,
      height: 400,
    });
  });

  it('applies a horizontal band to vertical placements', () => {
    const band = { start: 100, size: 500 };
    assert.deepEqual(tileRect(AREA, 'up', HALF, band), {
      x: 100,
      y: 50,
      width: 500,
      height: 400,
    });
    assert.deepEqual(tileRect(AREA, 'down', HALF, band), {
      x: 100,
      y: 450,
      width: 500,
      height: 400,
    });
  });

  it('keeps a band size without rounding it', () => {
    const band = { start: 50, size: 377 };
    assert.equal(tileRect(AREA, 'left', THIRD, band).height, 377);
  });
});

describe('isAnchored', () => {
  it('detects each edge within tolerance', () => {
    assert.equal(isAnchored(AREA, 'left', { x: 102, y: 0, width: 10, height: 10 }, 2), true);
    assert.equal(isAnchored(AREA, 'left', { x: 103, y: 0, width: 10, height: 10 }, 2), false);
    assert.equal(isAnchored(AREA, 'right', { x: 1090, y: 0, width: 10, height: 10 }, 0), true);
    assert.equal(isAnchored(AREA, 'up', { x: 0, y: 52, width: 10, height: 10 }, 2), true);
    assert.equal(isAnchored(AREA, 'down', { x: 0, y: 840, width: 10, height: 10 }, 0), true);
  });

  it('rejects unknown sides', () => {
    assert.throws(() => isAnchored(AREA, 'diagonal', AREA, 0), /unknown side: diagonal/);
  });
});

describe('perpendicularBand', () => {
  it('keeps the exact vertical band when the window is vertically snapped', () => {
    const top = { x: 0, y: 50, width: 500, height: 377 };
    assert.deepEqual(perpendicularBand(AREA, 'left', top), { start: 50, size: 377 });
    const bottom = { x: 0, y: 473, width: 500, height: 377 };
    assert.deepEqual(perpendicularBand(AREA, 'right', bottom), { start: 473, size: 377 });
  });

  it('falls back to the full height when the window is not vertically snapped', () => {
    const floating = { x: 0, y: 300, width: 500, height: 400 };
    assert.deepEqual(perpendicularBand(AREA, 'left', floating), { start: 50, size: 800 });
  });

  it('keeps the exact horizontal band when the window is horizontally snapped', () => {
    const left = { x: 100, y: 0, width: 333, height: 500 };
    assert.deepEqual(perpendicularBand(AREA, 'up', left), { start: 100, size: 333 });
    const right = { x: 767, y: 0, width: 333, height: 500 };
    assert.deepEqual(perpendicularBand(AREA, 'down', right), { start: 767, size: 333 });
  });

  it('falls back to the full width when the window is not horizontally snapped', () => {
    const floating = { x: 400, y: 0, width: 333, height: 500 };
    assert.deepEqual(perpendicularBand(AREA, 'up', floating), { start: 100, size: 1000 });
  });

  it('respects the pixel tolerance', () => {
    const nearly = { x: 0, y: 52, width: 500, height: 400 };
    assert.deepEqual(perpendicularBand(AREA, 'left', nearly, { pixelTolerance: 2 }), {
      start: 52,
      size: 400,
    });
    assert.deepEqual(perpendicularBand(AREA, 'left', nearly, { pixelTolerance: 0 }), {
      start: 50,
      size: 800,
    });
  });

  it('rejects unknown sides', () => {
    assert.throws(() => perpendicularBand(AREA, 'diagonal', AREA), /unknown side: diagonal/);
  });
});
