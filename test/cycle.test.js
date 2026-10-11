// SPDX-License-Identifier: GPL-2.0-or-later

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DEFAULT_FRACTION_TOLERANCE, DEFAULT_PIXEL_TOLERANCE, nextSection } from '../src/cycle.js';
import { FULL, GOLDEN_LARGE, GOLDEN_SMALL, HALF, QUARTER, THIRD, tileRect } from '../src/geometry.js';

const AREA = { x: 0, y: 0, width: 1000, height: 800 };

/**
 * Build the window rectangle for a side at a cycle fraction.
 *
 * @param {'left'|'right'|'up'|'down'} side Side to anchor the window to.
 * @param {number} fraction Extent fraction.
 * @returns {{ x: number, y: number, width: number, height: number }} Window rectangle.
 */
function rectFor(side, fraction) {
  return tileRect(AREA, side, fraction);
}

describe('tolerances', () => {
  it('exposes the documented defaults', () => {
    assert.equal(DEFAULT_PIXEL_TOLERANCE, 2);
    assert.equal(DEFAULT_FRACTION_TOLERANCE, 0.01);
  });
});

describe('nextSection', () => {
  it('walks the cycle forwards on the command edge', () => {
    assert.deepEqual(nextSection(AREA, 'left', rectFor('left', HALF)), {
      side: 'left',
      fraction: GOLDEN_SMALL,
    });
    assert.deepEqual(nextSection(AREA, 'left', rectFor('left', GOLDEN_SMALL)), {
      side: 'left',
      fraction: THIRD,
    });
    assert.deepEqual(nextSection(AREA, 'left', rectFor('left', THIRD)), { side: 'left', fraction: QUARTER });
    assert.deepEqual(nextSection(AREA, 'left', rectFor('left', QUARTER)), { side: 'left', fraction: FULL });
    assert.deepEqual(nextSection(AREA, 'left', rectFor('left', FULL)), {
      side: 'left',
      fraction: GOLDEN_LARGE,
    });
    assert.deepEqual(nextSection(AREA, 'left', rectFor('left', GOLDEN_LARGE)), {
      side: 'left',
      fraction: HALF,
    });
  });

  it('walks the cycle backwards on the opposite edge', () => {
    assert.deepEqual(nextSection(AREA, 'left', rectFor('right', QUARTER)), {
      side: 'right',
      fraction: THIRD,
    });
    assert.deepEqual(nextSection(AREA, 'left', rectFor('right', THIRD)), {
      side: 'right',
      fraction: GOLDEN_SMALL,
    });
    assert.deepEqual(nextSection(AREA, 'left', rectFor('right', GOLDEN_SMALL)), {
      side: 'right',
      fraction: HALF,
    });
    assert.deepEqual(nextSection(AREA, 'left', rectFor('right', HALF)), {
      side: 'right',
      fraction: GOLDEN_LARGE,
    });
    assert.deepEqual(nextSection(AREA, 'left', rectFor('right', GOLDEN_LARGE)), {
      side: 'right',
      fraction: FULL,
    });
  });

  it('keeps the edge of a full-size window and shrinks it', () => {
    const full = { x: 0, y: 0, width: 1000, height: 800 };
    assert.deepEqual(nextSection(AREA, 'left', full), { side: 'left', fraction: GOLDEN_LARGE });
    assert.deepEqual(nextSection(AREA, 'right', full), { side: 'right', fraction: GOLDEN_LARGE });
  });

  it('snaps an off-step size to the next smaller step on the command edge', () => {
    const nearlyQuarter = { x: 0, y: 0, width: 290, height: 800 };
    assert.deepEqual(nextSection(AREA, 'left', nearlyQuarter), { side: 'left', fraction: QUARTER });
    const nearlyLarge = { x: 0, y: 0, width: 900, height: 800 };
    assert.deepEqual(nextSection(AREA, 'left', nearlyLarge), { side: 'left', fraction: GOLDEN_LARGE });
  });

  it('snaps an off-step size to the next larger step on the opposite edge', () => {
    const nearlyQuarter = { x: 710, y: 0, width: 290, height: 800 };
    assert.deepEqual(nextSection(AREA, 'left', nearlyQuarter), { side: 'right', fraction: THIRD });
    const nearlyFull = { x: 100, y: 0, width: 900, height: 800 };
    assert.deepEqual(nextSection(AREA, 'left', nearlyFull), { side: 'right', fraction: FULL });
  });

  it('wraps when there is no smaller or larger step', () => {
    const sliver = { x: 0, y: 0, width: 50, height: 800 };
    assert.deepEqual(nextSection(AREA, 'left', sliver), { side: 'left', fraction: FULL });
    const nearlyFull = { x: 3, y: 0, width: 997, height: 800 };
    assert.deepEqual(nextSection(AREA, 'left', nearlyFull), { side: 'right', fraction: QUARTER });
  });

  it('starts at half when the window is anchored to neither edge', () => {
    const floating = { x: 400, y: 300, width: 500, height: 400 };
    assert.deepEqual(nextSection(AREA, 'left', floating), { side: 'left', fraction: HALF });
    assert.deepEqual(nextSection(AREA, 'right', floating), { side: 'right', fraction: HALF });
    assert.deepEqual(nextSection(AREA, 'up', floating), { side: 'up', fraction: HALF });
    assert.deepEqual(nextSection(AREA, 'down', floating), { side: 'down', fraction: HALF });
  });

  it('uses the vertical axis for up and down', () => {
    assert.deepEqual(nextSection(AREA, 'up', rectFor('up', HALF)), { side: 'up', fraction: GOLDEN_SMALL });
    assert.deepEqual(nextSection(AREA, 'down', rectFor('down', HALF)), {
      side: 'down',
      fraction: GOLDEN_SMALL,
    });
    assert.deepEqual(nextSection(AREA, 'down', rectFor('up', QUARTER)), { side: 'up', fraction: THIRD });
    assert.deepEqual(nextSection(AREA, 'up', rectFor('down', HALF)), {
      side: 'down',
      fraction: GOLDEN_LARGE,
    });
  });

  it('treats a zero-sized area as an unmeasurable sliver', () => {
    const area = { x: 0, y: 0, width: 0, height: 0 };
    const rect = { x: 0, y: 0, width: 0, height: 0 };
    assert.deepEqual(nextSection(area, 'left', rect), { side: 'left', fraction: FULL });
  });

  it('respects the pixel tolerance when detecting the anchor', () => {
    const nearlyLeft = { x: 1, y: 0, width: 500, height: 800 };
    assert.deepEqual(nextSection(AREA, 'left', nearlyLeft, { pixelTolerance: 2 }), {
      side: 'left',
      fraction: GOLDEN_SMALL,
    });
    assert.deepEqual(nextSection(AREA, 'left', nearlyLeft, { pixelTolerance: 0 }), {
      side: 'left',
      fraction: HALF,
    });
  });

  it('respects the fraction tolerance when matching a step', () => {
    const slightlyWide = { x: 0, y: 0, width: 505, height: 800 };
    assert.deepEqual(nextSection(AREA, 'left', slightlyWide, { fractionTolerance: 0.01 }), {
      side: 'left',
      fraction: GOLDEN_SMALL,
    });
    assert.deepEqual(nextSection(AREA, 'left', slightlyWide, { fractionTolerance: 0.001 }), {
      side: 'left',
      fraction: HALF,
    });
  });

  it('rejects unknown commands', () => {
    assert.throws(() => nextSection(AREA, 'diagonal', rectFor('left', HALF)), /unknown side/);
  });
});
