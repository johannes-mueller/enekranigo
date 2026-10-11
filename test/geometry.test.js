// SPDX-License-Identifier: GPL-2.0-or-later

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  FULL,
  GOLDEN_LARGE,
  GOLDEN_SMALL,
  HALF,
  PHI,
  QUARTER,
  SIDES,
  STEPS,
  THIRD,
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
});
