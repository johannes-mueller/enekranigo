(() => {
  // src/geometry.js
  var PHI = (1 + Math.sqrt(5)) / 2;
  var HALF = 1 / 2;
  var GOLDEN_SMALL = 1 / (PHI * PHI);
  var THIRD = 1 / 3;
  var QUARTER = 1 / 4;
  var GOLDEN_LARGE = 1 / PHI;
  var STEPS = [HALF, GOLDEN_SMALL, THIRD, QUARTER];
  function tileRect(area, side, fraction) {
    const width = Math.round(area.width * fraction);
    const height = Math.round(area.height * fraction);
    switch (side) {
      case "left":
        return { x: area.x, y: area.y, width, height: area.height };
      case "right":
        return { x: area.x + area.width - width, y: area.y, width, height: area.height };
      case "up":
        return { x: area.x, y: area.y, width: area.width, height };
      case "down":
        return { x: area.x, y: area.y + area.height - height, width: area.width, height };
      default:
        throw new Error(`unknown side: ${side}`);
    }
  }
  function expandRect(area, axis, rect, tolerance = 0) {
    if (axis === "horizontal") {
      const width = Math.round(area.width * GOLDEN_LARGE);
      return {
        x: anchoredOrigin(area.x, area.width, width, rect.x, rect.width, tolerance),
        y: rect.y,
        width,
        height: rect.height
      };
    }
    if (axis === "vertical") {
      const height = Math.round(area.height * GOLDEN_LARGE);
      return {
        x: rect.x,
        y: anchoredOrigin(area.y, area.height, height, rect.y, rect.height, tolerance),
        width: rect.width,
        height
      };
    }
    throw new Error(`unknown axis: ${axis}`);
  }
  function anchoredOrigin(areaOrigin, areaExtent, targetExtent, windowOrigin, windowExtent, tolerance) {
    if (Math.abs(windowOrigin - areaOrigin) <= tolerance) {
      return areaOrigin;
    }
    if (Math.abs(windowOrigin + windowExtent - (areaOrigin + areaExtent)) <= tolerance) {
      return areaOrigin + areaExtent - targetExtent;
    }
    return areaOrigin + Math.round((areaExtent - targetExtent) / 2);
  }

  // src/cycle.js
  var DEFAULT_PIXEL_TOLERANCE = 2;
  var DEFAULT_FRACTION_TOLERANCE = 0.01;
  function stepIndexFor(area, side, rect, options = {}) {
    const pixelTolerance = options.pixelTolerance ?? DEFAULT_PIXEL_TOLERANCE;
    const fractionTolerance = options.fractionTolerance ?? DEFAULT_FRACTION_TOLERANCE;
    if (!isAnchored(area, side, rect, pixelTolerance)) {
      return -1;
    }
    const fraction = extentFraction(area, side, rect);
    return STEPS.findIndex((step) => Math.abs(fraction - step) <= fractionTolerance);
  }
  function nextStep(area, side, rect, options = {}) {
    const index = stepIndexFor(area, side, rect, options);
    return index < 0 ? STEPS[0] : STEPS[(index + 1) % STEPS.length];
  }
  function isAnchored(area, side, rect, tolerance) {
    switch (side) {
      case "left":
        return Math.abs(rect.x - area.x) <= tolerance;
      case "right":
        return Math.abs(rect.x + rect.width - (area.x + area.width)) <= tolerance;
      case "up":
        return Math.abs(rect.y - area.y) <= tolerance;
      case "down":
        return Math.abs(rect.y + rect.height - (area.y + area.height)) <= tolerance;
      default:
        throw new Error(`unknown side: ${side}`);
    }
  }
  function extentFraction(area, side, rect) {
    const horizontal = side === "left" || side === "right";
    const extent = horizontal ? rect.width : rect.height;
    const base = horizontal ? area.width : area.height;
    return base === 0 ? 0 : extent / base;
  }

  // src/shortcuts.js
  var SHORTCUTS = Object.freeze({
    left: "window-sections-left",
    right: "window-sections-right",
    up: "window-sections-up",
    down: "window-sections-down",
    expandHorizontal: "window-sections-expand-horizontal",
    expandVertical: "window-sections-expand-vertical"
  });
  var SHORTCUT_TEXTS = Object.freeze({
    left: "Window Sections: tile left (cycle half, golden, third, quarter)",
    right: "Window Sections: tile right (cycle half, golden, third, quarter)",
    up: "Window Sections: tile up (cycle half, golden, third, quarter)",
    down: "Window Sections: tile down (cycle half, golden, third, quarter)",
    expandHorizontal: "Window Sections: expand to the larger golden section horizontally",
    expandVertical: "Window Sections: expand to the larger golden section vertically"
  });
  var DEFAULT_KEYS = Object.freeze({
    left: "",
    right: "",
    up: "",
    down: "",
    expandHorizontal: "",
    expandVertical: ""
  });

  // src/main.js
  var PIXEL_TOLERANCE = 2;
  function register() {
    bind("left", () => tileSide("left"));
    bind("right", () => tileSide("right"));
    bind("up", () => tileSide("up"));
    bind("down", () => tileSide("down"));
    bind("expandHorizontal", () => expandAxis("horizontal"));
    bind("expandVertical", () => expandAxis("vertical"));
  }
  function bind(key, callback) {
    registerShortcut(SHORTCUTS[key], SHORTCUT_TEXTS[key], DEFAULT_KEYS[key], callback);
  }
  function tileSide(side) {
    const window = manageableActiveWindow();
    if (!window) {
      return;
    }
    const area = workArea(window);
    const rect = geometryOf(window);
    const fraction = nextStep(area, side, rect, { pixelTolerance: PIXEL_TOLERANCE });
    applyGeometry(window, tileRect(area, side, fraction));
  }
  function expandAxis(axis) {
    const window = manageableActiveWindow();
    if (!window) {
      return;
    }
    const area = workArea(window);
    const rect = geometryOf(window);
    applyGeometry(window, expandRect(area, axis, rect, PIXEL_TOLERANCE));
  }
  function manageableActiveWindow() {
    const window = workspace.activeWindow;
    return isManageable(window) ? window : null;
  }
  function isManageable(window) {
    return Boolean(window) && window.managed && !window.deleted && !window.specialWindow && window.moveable && window.resizeable;
  }
  function workArea(window) {
    return workspace.clientArea(KWin.MaximizeArea, window);
  }
  function geometryOf(window) {
    const frame = window.frameGeometry;
    return { x: frame.x, y: frame.y, width: frame.width, height: frame.height };
  }
  function applyGeometry(window, rect) {
    window.fullScreen = false;
    window.setMaximize(false, false);
    window.frameGeometry = rect;
  }
  register();
})();
