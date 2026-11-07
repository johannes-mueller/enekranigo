// SPDX-License-Identifier: GPL-2.0-or-later

import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';

import { SHORTCUTS } from '../src/shortcuts.js';

const AREA = { x: 100, y: 50, width: 1000, height: 800 };
const MAIN = { geometry: AREA, area: AREA };
const LEFT = {
  geometry: { x: -900, y: 50, width: 1000, height: 800 },
  area: { x: -900, y: 50, width: 1000, height: 800 },
};
const RIGHT = {
  geometry: { x: 1100, y: 50, width: 1000, height: 800 },
  area: { x: 1100, y: 50, width: 1000, height: 800 },
};

const registrations = new Map();
let activeWindow = null;
let screens = [MAIN];
const windowArea = AREA;

globalThis.KWin = { MaximizeArea: 1 };
globalThis.workspace = {
  get activeWindow() {
    return activeWindow;
  },
  get screens() {
    return screens;
  },
  currentDesktop: {},
  clientArea(option, target) {
    return target === activeWindow ? windowArea : target.area;
  },
};
globalThis.registerShortcut = (name, text, key, callback) => {
  registrations.set(name, { text, key, callback });
};

await import('../src/main.js');

after(() => {
  delete globalThis.KWin;
  delete globalThis.workspace;
  delete globalThis.registerShortcut;
});

/**
 * Build a fake KWin window with sensible defaults.
 *
 * @param {object} [overrides] Window properties to override.
 * @returns {object} Fake window.
 */
function makeWindow(overrides = {}) {
  return {
    managed: true,
    deleted: false,
    specialWindow: false,
    moveable: true,
    resizeable: true,
    fullScreen: true,
    maximized: true,
    frameGeometry: { x: 400, y: 300, width: 500, height: 400 },
    setMaximize(horizontal, vertical) {
      this.maximized = horizontal || vertical;
    },
    ...overrides,
  };
}

/**
 * Invoke the action registered for a kind and direction.
 *
 * @param {'shift'|'move'} kind Shortcut kind.
 * @param {'left'|'right'|'up'|'down'} direction Direction to press.
 */
function press(kind, direction) {
  const shortcut = SHORTCUTS.find((entry) => entry.kind === kind && entry.direction === direction);
  assert.ok(shortcut, `missing shortcut for ${kind} ${direction}`);
  const registration = registrations.get(shortcut.id);
  assert.ok(registration, `missing registration for ${shortcut.id}`);
  registration.callback();
}

describe('shortcut registration', () => {
  it('registers the documented shortcuts with their default keys', () => {
    assert.deepEqual([...registrations.keys()].sort(), SHORTCUTS.map((shortcut) => shortcut.id).sort());
    for (const shortcut of SHORTCUTS) {
      const registration = registrations.get(shortcut.id);
      assert.equal(registration.text, shortcut.text);
      assert.equal(registration.key, shortcut.key);
    }
  });
});

describe('shiftWindow', () => {
  it('places a floating window on the commanded edge at half', () => {
    const expected = {
      left: { x: 100, y: 50, width: 500, height: 800 },
      right: { x: 600, y: 50, width: 500, height: 800 },
      up: { x: 100, y: 50, width: 1000, height: 400 },
      down: { x: 100, y: 450, width: 1000, height: 400 },
    };

    for (const [direction, rect] of Object.entries(expected)) {
      activeWindow = makeWindow();
      press('shift', direction);

      assert.deepEqual(activeWindow.frameGeometry, rect);
      assert.equal(activeWindow.fullScreen, false);
      assert.equal(activeWindow.maximized, false);
    }
  });

  it('shrinks a window anchored to the commanded edge', () => {
    activeWindow = makeWindow({ frameGeometry: { x: 100, y: 50, width: 500, height: 800 } });
    press('shift', 'left');
    assert.deepEqual(activeWindow.frameGeometry, { x: 100, y: 50, width: 382, height: 800 });
  });

  it('keeps the perpendicular extent of an anchored window', () => {
    activeWindow = makeWindow({ frameGeometry: { x: 100, y: 50, width: 1000, height: 400 } });
    press('shift', 'left');
    assert.deepEqual(activeWindow.frameGeometry, { x: 100, y: 50, width: 618, height: 400 });
  });

  it('leaves unmanageable windows untouched', () => {
    const cases = [
      ['unmanaged', { managed: false }],
      ['deleted', { deleted: true }],
      ['special', { specialWindow: true }],
      ['immovable', { moveable: false }],
      ['unresizable', { resizeable: false }],
    ];

    for (const [label, overrides] of cases) {
      activeWindow = makeWindow(overrides);
      const before = { ...activeWindow.frameGeometry };

      assert.doesNotThrow(() => press('shift', 'left'), label);
      assert.deepEqual(activeWindow.frameGeometry, before, label);
      assert.equal(activeWindow.fullScreen, true, label);
      assert.equal(activeWindow.maximized, true, label);
    }
  });

  it('ignores a missing active window', () => {
    activeWindow = null;
    assert.doesNotThrow(() => press('shift', 'left'));
  });
});

describe('moveWindow', () => {
  it('aligns a floating window to each edge without resizing it', () => {
    const expected = {
      left: { x: 100, y: 300, width: 500, height: 400 },
      right: { x: 600, y: 300, width: 500, height: 400 },
      up: { x: 400, y: 50, width: 500, height: 400 },
      down: { x: 400, y: 450, width: 500, height: 400 },
    };

    for (const [direction, rect] of Object.entries(expected)) {
      screens = [MAIN];
      activeWindow = makeWindow();
      press('move', direction);

      assert.deepEqual(activeWindow.frameGeometry, rect);
      assert.equal(activeWindow.fullScreen, false);
      assert.equal(activeWindow.maximized, false);
    }
  });

  it('crosses to the output on the left and lands on its right edge', () => {
    screens = [LEFT, MAIN];
    activeWindow = makeWindow({ frameGeometry: { x: 100, y: 300, width: 500, height: 400 } });
    press('move', 'left');

    assert.deepEqual(activeWindow.frameGeometry, { x: -400, y: 300, width: 500, height: 400 });
    assert.equal(activeWindow.fullScreen, false);
    assert.equal(activeWindow.maximized, false);
  });

  it('crosses to the output on the right and lands on its left edge', () => {
    screens = [MAIN, RIGHT];
    activeWindow = makeWindow({ frameGeometry: { x: 600, y: 300, width: 500, height: 400 } });
    press('move', 'right');

    assert.deepEqual(activeWindow.frameGeometry, { x: 1100, y: 300, width: 500, height: 400 });
  });

  it('ignores a workspace without screens', () => {
    screens = [];
    activeWindow = makeWindow({ frameGeometry: { x: 400, y: 300, width: 500, height: 400 } });
    press('move', 'left');

    assert.deepEqual(activeWindow.frameGeometry, { x: 400, y: 300, width: 500, height: 400 });
    assert.equal(activeWindow.fullScreen, true);
    assert.equal(activeWindow.maximized, true);
  });

  it('does nothing at the edge when there is no neighbouring output', () => {
    screens = [MAIN];
    activeWindow = makeWindow({ frameGeometry: { x: 100, y: 300, width: 500, height: 400 } });
    press('move', 'left');

    assert.deepEqual(activeWindow.frameGeometry, { x: 100, y: 300, width: 500, height: 400 });
    assert.equal(activeWindow.fullScreen, true);
    assert.equal(activeWindow.maximized, true);
  });

  it('leaves unmanageable windows untouched', () => {
    const cases = [
      ['unmanaged', { managed: false }],
      ['deleted', { deleted: true }],
      ['special', { specialWindow: true }],
      ['immovable', { moveable: false }],
      ['unresizable', { resizeable: false }],
    ];

    for (const [label, overrides] of cases) {
      screens = [MAIN];
      activeWindow = makeWindow(overrides);
      const before = { ...activeWindow.frameGeometry };

      assert.doesNotThrow(() => press('move', 'left'), label);
      assert.deepEqual(activeWindow.frameGeometry, before, label);
      assert.equal(activeWindow.fullScreen, true, label);
      assert.equal(activeWindow.maximized, true, label);
    }
  });

  it('ignores a missing active window', () => {
    activeWindow = null;
    assert.doesNotThrow(() => press('move', 'left'));
  });
});
