// SPDX-License-Identifier: GPL-2.0-or-later

import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';

import { DEFAULT_KEYS, SHORTCUTS, SHORTCUT_TEXTS } from '../src/shortcuts.js';

const AREA = { x: 100, y: 50, width: 1000, height: 800 };
const registrations = new Map();
let activeWindow = null;

globalThis.KWin = { MaximizeArea: 1 };
globalThis.workspace = {
  get activeWindow() {
    return activeWindow;
  },
  clientArea() {
    return AREA;
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
 * Invoke the action registered for a direction.
 *
 * @param {'left'|'right'|'up'|'down'} direction Direction to press.
 */
function press(direction) {
  const registration = registrations.get(SHORTCUTS[direction]);
  assert.ok(registration, `missing registration for ${direction}`);
  registration.callback();
}

describe('shortcut registration', () => {
  it('registers the documented shortcuts with their default keys', () => {
    assert.deepEqual([...registrations.keys()].sort(), Object.values(SHORTCUTS).sort());
    for (const direction of Object.keys(SHORTCUTS)) {
      const registration = registrations.get(SHORTCUTS[direction]);
      assert.equal(registration.text, SHORTCUT_TEXTS[direction]);
      assert.equal(registration.key, DEFAULT_KEYS[direction]);
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
      press(direction);

      assert.deepEqual(activeWindow.frameGeometry, rect);
      assert.equal(activeWindow.fullScreen, false);
      assert.equal(activeWindow.maximized, false);
    }
  });

  it('shrinks a window anchored to the commanded edge', () => {
    activeWindow = makeWindow({ frameGeometry: { x: 100, y: 50, width: 500, height: 800 } });
    press('left');
    assert.deepEqual(activeWindow.frameGeometry, { x: 100, y: 50, width: 382, height: 800 });
  });

  it('keeps the perpendicular extent of an anchored window', () => {
    activeWindow = makeWindow({ frameGeometry: { x: 100, y: 50, width: 1000, height: 400 } });
    press('left');
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

      assert.doesNotThrow(() => press('left'), label);
      assert.deepEqual(activeWindow.frameGeometry, before, label);
      assert.equal(activeWindow.fullScreen, true, label);
      assert.equal(activeWindow.maximized, true, label);
    }
  });

  it('ignores a missing active window', () => {
    activeWindow = null;
    assert.doesNotThrow(() => press('left'));
  });
});
