// SPDX-License-Identifier: GPL-2.0-or-later

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DEFAULT_FRACTION_TOLERANCE, DEFAULT_PIXEL_TOLERANCE, nextStep, stepIndexFor } from '../src/cycle.js';
import { GOLDEN_LARGE, GOLDEN_SMALL, HALF, QUARTER, STEPS, THIRD, tileRect } from '../src/geometry.js';

const AREA = { x: 0, y: 0, width: 1000, height: 800 };

/**
 * Build the window rectangle for a side at a cycle fraction.
 *
 * @param {'left'|'right'|'up'|'down'} side Side to build for.
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

describe('stepIndexFor', () => {
  it('recognizes every step on every side', () => {
    for (const side of ['left', 'right', 'up', 'down']) {
      STEPS.forEach((fraction, index) => {
        assert.equal(stepIndexFor(AREA, side, rectFor(side, fraction)), index);
      });
    }
  });

  it('reports no step when the window is not anchored', () => {
    const floating = { x: 400, y: 300, width: 500, height: 400 };
    assert.equal(stepIndexFor(AREA, 'left', floating), -1);
  });

  it('reports no step for a larger golden-section window', () => {
    assert.equal(stepIndexFor(AREA, 'left', rectFor('left', GOLDEN_LARGE)), -1);
  });

  it('respects the pixel tolerance for anchoring', () => {
    const nearlyLeft = { x: 1, y: 0, width: 500, height: 800 };
    assert.equal(stepIndexFor(AREA, 'left', nearlyLeft, { pixelTolerance: 2 }), 0);
    assert.equal(stepIndexFor(AREA, 'left', nearlyLeft, { pixelTolerance: 0 }), -1);
  });

  it('respects the fraction tolerance', () => {
    const slightlyWide = { x: 0, y: 0, width: 505, height: 800 };
    assert.equal(stepIndexFor(AREA, 'left', slightlyWide, { fractionTolerance: 0.01 }), 0);
    assert.equal(stepIndexFor(AREA, 'left', slightlyWide, { fractionTolerance: 0.001 }), -1);
  });

  it('treats a zero-sized area as unmeasurable', () => {
    const area = { x: 0, y: 0, width: 0, height: 0 };
    const rect = { x: 0, y: 0, width: 0, height: 0 };
    assert.equal(stepIndexFor(area, 'left', rect), -1);
  });

  it('rejects unknown sides', () => {
    assert.throws(() => stepIndexFor(AREA, 'diagonal', rectFor('left', HALF)), /unknown side/);
  });
});

describe('nextStep', () => {
  it('advances through the cycle', () => {
    assert.equal(nextStep(AREA, 'left', rectFor('left', HALF)), GOLDEN_SMALL);
    assert.equal(nextStep(AREA, 'left', rectFor('left', GOLDEN_SMALL)), THIRD);
    assert.equal(nextStep(AREA, 'left', rectFor('left', THIRD)), QUARTER);
  });

  it('wraps from a quarter back to a half', () => {
    assert.equal(nextStep(AREA, 'left', rectFor('left', QUARTER)), HALF);
  });

  it('starts at a half when the window is at no step', () => {
    const floating = { x: 400, y: 300, width: 500, height: 400 };
    assert.equal(nextStep(AREA, 'left', floating), HALF);
    assert.equal(nextStep(AREA, 'left', rectFor('left', GOLDEN_LARGE)), HALF);
  });

  it('uses the vertical axis for up and down', () => {
    assert.equal(nextStep(AREA, 'down', rectFor('down', HALF)), GOLDEN_SMALL);
    assert.equal(nextStep(AREA, 'up', rectFor('up', QUARTER)), HALF);
  });

  it('rejects unknown sides', () => {
    assert.throws(() => nextStep(AREA, 'diagonal', rectFor('left', HALF)), /unknown side/);
  });
});
