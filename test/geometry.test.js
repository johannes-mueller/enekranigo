// SPDX-License-Identifier: GPL-2.0-or-later

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  AXES,
  GOLDEN_LARGE,
  GOLDEN_SMALL,
  HALF,
  PHI,
  QUARTER,
  SIDES,
  STEPS,
  THIRD,
  expandRect,
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

  it('lists the cycle in decreasing order', () => {
    assert.equal(STEPS.length, 4);
    assert.deepEqual(STEPS, [HALF, GOLDEN_SMALL, THIRD, QUARTER]);
    for (let index = 1; index < STEPS.length; index += 1) {
      assert.ok(STEPS[index] < STEPS[index - 1]);
    }
  });

  it('documents the supported sides and axes', () => {
    assert.deepEqual(SIDES, ['left', 'right', 'up', 'down']);
    assert.deepEqual(AXES, ['horizontal', 'vertical']);
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

  it('rounds fractional extents', () => {
    const area = { x: 0, y: 0, width: 1001, height: 799 };
    assert.equal(tileRect(area, 'left', THIRD).width, 334);
    assert.equal(tileRect(area, 'up', GOLDEN_SMALL).height, 305);
  });

  it('rejects unknown sides', () => {
    assert.throws(() => tileRect(AREA, 'diagonal', HALF), /unknown side: diagonal/);
  });
});

describe('expandRect', () => {
  it('grows horizontally and keeps the left edge', () => {
    const rect = { x: 100, y: 200, width: 300, height: 400 };
    assert.deepEqual(expandRect(AREA, 'horizontal', rect, 2), {
      x: 100,
      y: 200,
      width: 618,
      height: 400,
    });
  });

  it('grows horizontally and keeps the right edge', () => {
    const rect = { x: 800, y: 200, width: 300, height: 400 };
    assert.deepEqual(expandRect(AREA, 'horizontal', rect, 2), {
      x: 482,
      y: 200,
      width: 618,
      height: 400,
    });
  });

  it('centers horizontally when no edge is touched', () => {
    const rect = { x: 400, y: 200, width: 300, height: 400 };
    assert.deepEqual(expandRect(AREA, 'horizontal', rect, 2), {
      x: 291,
      y: 200,
      width: 618,
      height: 400,
    });
  });

  it('grows vertically and keeps the top edge', () => {
    const rect = { x: 200, y: 50, width: 300, height: 100 };
    assert.deepEqual(expandRect(AREA, 'vertical', rect, 2), {
      x: 200,
      y: 50,
      width: 300,
      height: 494,
    });
  });

  it('grows vertically and keeps the bottom edge', () => {
    const rect = { x: 200, y: 750, width: 300, height: 100 };
    assert.deepEqual(expandRect(AREA, 'vertical', rect, 2), {
      x: 200,
      y: 356,
      width: 300,
      height: 494,
    });
  });

  it('centers vertically when no edge is touched', () => {
    const rect = { x: 200, y: 300, width: 300, height: 100 };
    assert.deepEqual(expandRect(AREA, 'vertical', rect, 2), {
      x: 200,
      y: 203,
      width: 300,
      height: 494,
    });
  });

  it('requires an exact match without a tolerance', () => {
    const rect = { x: 102, y: 200, width: 300, height: 400 };
    assert.equal(expandRect(AREA, 'horizontal', rect).x, 291);
  });

  it('rejects unknown axes', () => {
    const rect = { x: 0, y: 0, width: 1, height: 1 };
    assert.throws(() => expandRect(AREA, 'diagonal', rect), /unknown axis: diagonal/);
  });
});
