// SPDX-License-Identifier: GPL-2.0-or-later

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { moveRect, screenIndexAt } from '../src/move.js';

const AREA = { x: 0, y: 0, width: 1000, height: 800 };

/**
 * Build a screen descriptor.
 *
 * @param {{ x: number, y: number, width: number, height: number }} bounds Physical output geometry.
 * @param {{ x: number, y: number, width: number, height: number }} [area] Work area.
 * @returns {{ bounds: object, area: object }} Screen descriptor.
 */
function screen(bounds, area = bounds) {
  return { bounds: { ...bounds }, area: { ...area } };
}

/**
 * Build a horizontal three-screen layout.
 *
 * @returns {Array<{ bounds: object, area: object }>} Screens from left to right.
 */
function horizontalScreens() {
  return [
    screen({ x: -1000, y: 0, width: 1000, height: 800 }),
    screen(AREA),
    screen({ x: 1000, y: 0, width: 1000, height: 800 }),
  ];
}

/**
 * Build a vertical three-screen layout.
 *
 * @returns {Array<{ bounds: object, area: object }>} Screens from top to bottom.
 */
function verticalScreens() {
  return [
    screen({ x: 0, y: -800, width: 1000, height: 800 }),
    screen(AREA),
    screen({ x: 0, y: 800, width: 1000, height: 800 }),
  ];
}

describe('screenIndexAt', () => {
  it('finds the screen containing the window centre', () => {
    const screens = horizontalScreens();
    assert.equal(screenIndexAt(screens, { x: 400, y: 300, width: 500, height: 400 }), 1);
    assert.equal(screenIndexAt(screens, { x: -900, y: 300, width: 500, height: 400 }), 0);
    assert.equal(screenIndexAt(screens, { x: 1400, y: 300, width: 500, height: 400 }), 2);
  });

  it('falls back to the nearest screen when the centre is in a gap', () => {
    const screens = [
      screen({ x: 0, y: 0, width: 1000, height: 800 }),
      screen({ x: 1100, y: 0, width: 1000, height: 800 }),
    ];
    assert.equal(screenIndexAt(screens, { x: 1080, y: 300, width: 0, height: 0 }), 1);
    assert.equal(screenIndexAt(screens, { x: 1050, y: 300, width: 0, height: 0 }), 0);
  });

  it('returns -1 when there are no screens', () => {
    assert.equal(screenIndexAt([], AREA), -1);
  });
});

describe('moveRect within one screen', () => {
  const floating = { x: 400, y: 300, width: 500, height: 400 };

  it('aligns a floating window to each edge without resizing it', () => {
    const screens = [screen(AREA)];
    assert.deepEqual(moveRect(screens, 0, 'left', floating), {
      index: 0,
      rect: { x: 0, y: 300, width: 500, height: 400 },
    });
    assert.deepEqual(moveRect(screens, 0, 'right', floating), {
      index: 0,
      rect: { x: 500, y: 300, width: 500, height: 400 },
    });
    assert.deepEqual(moveRect(screens, 0, 'up', floating), {
      index: 0,
      rect: { x: 400, y: 0, width: 500, height: 400 },
    });
    assert.deepEqual(moveRect(screens, 0, 'down', floating), {
      index: 0,
      rect: { x: 400, y: 400, width: 500, height: 400 },
    });
  });

  it('does nothing when already at the edge and there is no neighbour', () => {
    const screens = [screen(AREA)];
    assert.equal(moveRect(screens, 0, 'left', { x: 0, y: 300, width: 500, height: 400 }), null);
    assert.equal(moveRect(screens, 0, 'right', { x: 500, y: 300, width: 500, height: 400 }), null);
    assert.equal(moveRect(screens, 0, 'up', { x: 400, y: 0, width: 500, height: 400 }), null);
    assert.equal(moveRect(screens, 0, 'down', { x: 400, y: 400, width: 500, height: 400 }), null);
  });

  it('treats a full-size window as anchored to both edges', () => {
    const screens = [screen(AREA)];
    assert.equal(moveRect(screens, 0, 'left', AREA), null);
    assert.equal(moveRect(screens, 0, 'right', AREA), null);
  });
});

describe('moveRect across screens', () => {
  it('moves left to the right edge of the output on the left', () => {
    const screens = horizontalScreens();
    assert.deepEqual(moveRect(screens, 1, 'left', { x: 0, y: 300, width: 500, height: 400 }), {
      index: 0,
      rect: { x: -500, y: 300, width: 500, height: 400 },
    });
  });

  it('moves right to the left edge of the output on the right', () => {
    const screens = horizontalScreens();
    assert.deepEqual(moveRect(screens, 1, 'right', { x: 500, y: 300, width: 500, height: 400 }), {
      index: 2,
      rect: { x: 1000, y: 300, width: 500, height: 400 },
    });
  });

  it('moves up to the bottom edge of the output above', () => {
    const screens = verticalScreens();
    assert.deepEqual(moveRect(screens, 1, 'up', { x: 300, y: 0, width: 500, height: 400 }), {
      index: 0,
      rect: { x: 300, y: -400, width: 500, height: 400 },
    });
  });

  it('moves down to the top edge of the output below', () => {
    const screens = verticalScreens();
    assert.deepEqual(moveRect(screens, 1, 'down', { x: 300, y: 400, width: 500, height: 400 }), {
      index: 2,
      rect: { x: 300, y: 800, width: 500, height: 400 },
    });
  });

  it('picks the nearest output in the direction of travel', () => {
    const screens = [
      screen({ x: -1000, y: 0, width: 1000, height: 800 }),
      screen({ x: -3000, y: 0, width: 1000, height: 800 }),
      screen(AREA),
    ];
    assert.deepEqual(moveRect(screens, 2, 'left', { x: 0, y: 300, width: 500, height: 400 }), {
      index: 0,
      rect: { x: -500, y: 300, width: 500, height: 400 },
    });
  });

  it('ignores outputs that do not overlap on the perpendicular axis', () => {
    const screens = [screen({ x: -1000, y: 1000, width: 1000, height: 800 }), screen(AREA)];
    assert.equal(moveRect(screens, 1, 'left', { x: 0, y: 300, width: 500, height: 400 }), null);
  });

  it('does nothing when a screen in the band is behind the direction of travel', () => {
    const screens = [screen({ x: -1000, y: 0, width: 1000, height: 800 }), screen(AREA)];
    assert.equal(moveRect(screens, 1, 'right', { x: 500, y: 300, width: 500, height: 400 }), null);
  });

  it('clamps the perpendicular position into the target work area', () => {
    const screens = [
      screen({ x: -1000, y: 0, width: 1000, height: 800 }, { x: -1000, y: 50, width: 1000, height: 750 }),
      screen(AREA),
    ];
    assert.deepEqual(moveRect(screens, 1, 'left', { x: 0, y: 600, width: 500, height: 400 }), {
      index: 0,
      rect: { x: -500, y: 400, width: 500, height: 400 },
    });
  });

  it('clamps the horizontal position when moving vertically to an offset output', () => {
    const screens = [
      screen({ x: 0, y: -800, width: 1000, height: 800 }, { x: 100, y: -800, width: 800, height: 800 }),
      screen(AREA),
    ];
    assert.deepEqual(moveRect(screens, 1, 'up', { x: 900, y: 0, width: 500, height: 400 }), {
      index: 0,
      rect: { x: 400, y: -400, width: 500, height: 400 },
    });
  });

  it('fits an oversized window to both axes of the target work area', () => {
    const screens = [screen(AREA), screen({ x: 1000, y: 0, width: 1000, height: 800 })];
    assert.deepEqual(moveRect(screens, 1, 'left', { x: 1000, y: 100, width: 1200, height: 900 }), {
      index: 0,
      rect: { x: 0, y: 0, width: 1000, height: 800 },
    });
  });

  it('uses the pixel tolerance when deciding whether to cross', () => {
    const screens = horizontalScreens();
    const nearlyLeft = { x: 1, y: 300, width: 500, height: 400 };
    assert.deepEqual(moveRect(screens, 1, 'left', nearlyLeft, { pixelTolerance: 2 }), {
      index: 0,
      rect: { x: -500, y: 300, width: 500, height: 400 },
    });
    assert.deepEqual(moveRect(screens, 1, 'left', nearlyLeft, { pixelTolerance: 0 }), {
      index: 1,
      rect: { x: 0, y: 300, width: 500, height: 400 },
    });
  });
});

describe('moveRect validation', () => {
  it('rejects unknown screens', () => {
    assert.throws(() => moveRect([screen(AREA)], 4, 'left', AREA), /unknown screen: 4/);
  });

  it('rejects unknown commands', () => {
    assert.throws(() => moveRect([screen(AREA)], 0, 'diagonal', AREA), /unknown side: diagonal/);
  });
});
