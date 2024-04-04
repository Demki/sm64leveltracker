const DRAG_STATES = Object.freeze({
  None: 0,
  Dragging: 1
});

/**
 * @typedef {{
*       lineElement: SVGPathElement, 
*       originalElement: HTMLElement,
*       startX: number, 
*       startY: number, 
*       endX: number, 
*       endY: number
*     }} DragInfo
 * @typedef {{
 *   dragState: typeof DRAG_STATES.None, 
 *   dragInfo: undefined
 * } | {
 *   dragState: typeof DRAG_STATES.Dragging,
 *   dragInfo: DragInfo
 * }} DndState
 * @type {DndState}
 */
const global_dnd_state = Object.seal({
  dragState: DRAG_STATES.None,
  dragInfo: undefined,
});

const BUTTONS = Object.freeze({
  Left: 0,
  Middle: 1,
  Right: 2
});

const MODIFIERS = Object.freeze({
  None: 0,
  Ctrl: 4,
  Shift: 8,
  Alt: 16,
});

const ACTIONS = Object.freeze({
  Connect: 0,
  ConnectSelf: 1,
  Disconnect: 2,
  Mark1: 3,
  Mark2: 4,
});

const ACTIONS_KEY_MAPPING = Object.freeze({
  [BUTTONS.Left | MODIFIERS.None]: ACTIONS.Connect,
  [BUTTONS.Left | MODIFIERS.Ctrl]: ACTIONS.ConnectSelf,
  [BUTTONS.Middle | MODIFIERS.Ctrl]: ACTIONS.Disconnect,
  [BUTTONS.Right | MODIFIERS.None]: ACTIONS.Mark1,
  [BUTTONS.Middle | MODIFIERS.None]: ACTIONS.Mark2,
});

/**
 * @template T
 * @typedef {T[keyof T]} ValueOf - because why not 
 */

/**
 * @typedef {"start" | "while" | "end" | "click" } CallbackHandles
 * @type {{
*  [P in ValueOf<typeof ACTIONS>]: 
*    {[K in CallbackHandles]?: (ev: MouseEvent) => void}
* }}
*/
const ACTIONS_CALLBACKS = {
  [ACTIONS.Connect]:
  {
    start: connectStart,
    while: connectWhile,
    end: connectEnd,
  },
  [ACTIONS.ConnectSelf]:
  {
    click: connectSelf,
  },
  [ACTIONS.Disconnect]:
    { click: disconnect },
  [ACTIONS.Mark1]:
    { click: mark('1') },
  [ACTIONS.Mark2]:
    { click: mark('2') },
}

/**
 * @param {DragInfo} dragInfo
 */
function setPathLineDAttribute({ lineElement, startX, startY, endX, endY }) {
  lineElement.setAttribute('d', `M${startX},${startY} L${endX},${endY}`);
}

/**
 * @param {Pick<MouseEvent, 'clientX' | 'clientY' | 'currentTarget'>} ev
 */
function getMouseOffset({ clientX, clientY, currentTarget }) {
  const rect = currentTarget.getBoundingClientRect();
  const offsetX = clientX - rect.left;
  const offsetY = clientY - rect.top;
  return { offsetX, offsetY };
}

/**
 * @param {MouseEvent} ev 
 */
function connectStart({ target, clientX, clientY, currentTarget }) {
  if (!target.classList.contains(CLASSES.Item) || target.classList.contains(CLASSES.PeventConnection)) {
    return;
  }
  const { offsetLeft, offsetTop, offsetWidth, offsetHeight } = target;
  const gEl = document.getElementById('connectingLine');
  const { offsetX, offsetY } = getMouseOffset({ clientX, clientY, currentTarget });
  while (gEl.firstChild) {
    gEl.firstChild.remove();
  }
  const lineElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  gEl.appendChild(lineElement);
  global_dnd_state.dragInfo = {
    startX: offsetLeft + offsetWidth / 2,
    startY: offsetTop + offsetHeight / 2,
    endX: offsetX,
    endY: offsetY,
    lineElement,
    originalElement: target
  }
  global_dnd_state.dragState = DRAG_STATES.Dragging;
  setPathLineDAttribute(global_dnd_state.dragInfo);
}

/**
 * @param {MouseEvent} ev 
 */
function connectWhile(ev) {
  if (global_dnd_state.dragState === DRAG_STATES.Dragging) {
    const { offsetX, offsetY } = getMouseOffset(ev);
    global_dnd_state.dragInfo.endX = offsetX;
    global_dnd_state.dragInfo.endY = offsetY;
    setPathLineDAttribute(global_dnd_state.dragInfo);
  }
}

/**
 * @param {MouseEvent} ev 
 */
function connectEnd({ target }) {
  if (global_dnd_state.dragState !== DRAG_STATES.Dragging) {
    return;
  }
  global_dnd_state.dragInfo.lineElement.remove();

  const shouldConnect = target.classList.contains(CLASSES.Item)
    && !target.classList.contains(CLASSES.PeventConnection)
    && (target !== global_dnd_state.dragInfo.originalElement);
  if (shouldConnect) {
    connect(global_dnd_state.dragInfo.originalElement, target);
  }
  updateWindow();

  global_dnd_state.dragState = DRAG_STATES.None;
  global_dnd_state.dragInfo = undefined;
}

/**
 * @param {MouseEvent} ev 
 */
function connectSelf({ target }) {
  const shouldConnectSelf = !isPath(target.parentElement);
  if (shouldConnectSelf) {
    const newPath = document.createElement("div");
    newPath.classList.add(CLASSES.Path);
    newPath.dataset.looping = "yes";
    document.getElementById("main").insertBefore(newPath, target.parentElement);
    newPath.append(target);
  }
}

const DEFAULT_STAR_COUNT = 70;

/**
 * @param {string} v 
 */
function mark(v) {
  return ({ target }) => {
    if (target.classList.contains(CLASSES.Item)) {
      const mark = target.dataset.mark;
      const newMark = target.dataset.mark === v ? '0' : v;
      if (!target.classList.replace(`${CLASSES.ColorPrefix}${mark}`, `${CLASSES.ColorPrefix}${newMark}`)) {
        target.classList.add(`${CLASSES.ColorPrefix}${newMark}`);
      }
      target.dataset.mark = newMark;
    }
  }
}

/**
 * @type {MouseEvent['target']}
 */
let clickTarget = null;

/**
 * @param {MouseEvent} ev 
 */
function mousedown(ev) {
  if (ev.button === BUTTONS.Middle) ev.preventDefault(); // prevent scroll toggle with middle mouse button
  const button = ev.button;
  const modifiers = (ev.ctrlKey && MODIFIERS.Ctrl);
    // | (ev.shiftKey && MODIFIERS.Shift)
    // | (ev.altKey && MODIFIERS.Alt);
  const modifiedButton = button | modifiers;
  clickTarget = ev.target;
  ACTIONS_CALLBACKS[ACTIONS_KEY_MAPPING[modifiedButton]]?.start?.(ev);
}

/**
 * @param {MouseEvent} ev 
 */
function mousemove(ev) {
  const button = ev.button;
  const modifiers = (ev.ctrlKey && MODIFIERS.Ctrl);
    // | (ev.shiftKey && MODIFIERS.Shift)
    // | (ev.altKey && MODIFIERS.Alt);
  
  if(ev.ctrlKey) {
    setModifierKeyOnBody('ctrl', true);
  } else {
    setModifierKeyOnBody('ctrl', false);
  }

  const modifiedButton = button | modifiers;
  if (clickTarget !== ev.target) {
    clickTarget = null;
  }
  ACTIONS_CALLBACKS[ACTIONS_KEY_MAPPING[modifiedButton]]?.while?.(ev);
}

/**
 * @param {MouseEvent} ev 
 */
function mouseup(ev) {
  const button = ev.button;
  const modifiers = (ev.ctrlKey && MODIFIERS.Ctrl);
    // | (ev.shiftKey && MODIFIERS.Shift)
    // | (ev.altKey && MODIFIERS.Alt);
  const modifiedButton = button | modifiers;
  ACTIONS_CALLBACKS[ACTIONS_KEY_MAPPING[modifiedButton]]?.end?.(ev);
  if (clickTarget === ev.target) {
    ACTIONS_CALLBACKS[ACTIONS_KEY_MAPPING[modifiedButton]]?.click?.(ev);
  }
  clickTarget = null;
}

function isPath(p) {
  return p.classList.contains(CLASSES.Path);
}

function createPath(startPath, ...ls) {
  const newPath = document.createElement("div");
  newPath.classList.add(CLASSES.Path);
  newPath.append(...ls);
  addPath(newPath, startPath);
  return newPath;
}

function addPath(newPath, startPath) {
  const main = document.getElementById("main");
  const before = startPath ? startPath : document.getElementById("list");
  main.insertBefore(newPath, before);
}

function dumpToList(...ls) {
  const list = document.getElementById("list");
  list.append(...ls);
  list.append(...Array.from(list.children).sort((a, b) => Number(a.id.substring(IDS.ItemPrefix.length)) - Number(b.id.substring(IDS.ItemPrefix.length))));
}

function disconnect({ target }) {
  const targetPath = target.parentElement;
  if (!isPath(targetPath)) return;
  delete targetPath.dataset.looping;
  if (target.nextElementSibling !== null) {
    const afterTarget = [...dropUntilExc(x => x === target, targetPath.children)];
    if (afterTarget.length > 1) {
      createPath(targetPath, ...afterTarget);
    }
    else {
      dumpToList(...afterTarget);
    }
  }
  if (targetPath.children.length <= 1) {
    dumpToList(...targetPath.children);
    targetPath.remove();
  }
  updateWindow();
}

function connect(prev, target) {

  let prevPath = prev.parentElement;
  const targetPath = target.parentElement;

  if (prevPath === targetPath && isPath(prevPath)) {
    if (prev.nextElementSibling === null && target.previousElementSibling === null) {
      prevPath.dataset.looping = "yes";
    }
    return;
  }

  if (!isPath(prevPath)) {
    prevPath = createPath(null, prev);
  }

  delete prevPath.dataset.looping;

  if (prev.nextElementSibling !== null) {
    const afterPrev = [...dropUntilExc(x => x === prev, prevPath.children)];
    if (afterPrev.length > 1) {
      createPath(prevPath, ...afterPrev);
    }
    else {
      dumpToList(...afterPrev);
    }
  }

  if (!isPath(targetPath)) {
    prevPath.append(target);
    return;
  }

  delete targetPath.dataset.looping;

  if (target.previousElementSibling !== null) {
    const beforeTarget = [...takeUntilExc(x => x === target, targetPath.children)];
    if (beforeTarget.length <= 1) {
      dumpToList(...beforeTarget);
    }
  }

  prevPath.append(...dropUntilInc(x => x === target, targetPath.children));

  if (targetPath.children.length === 0) targetPath.remove();
  if (prevPath.children.length === 0) {
    prevPath.remove();
  } else {
    addPath(prevPath, null);
  }
}

function updateWindow() {
  const dWindow = document.getElementById("display");
  dWindow.innerHTML = "<div style='overflow-wrap: break-word'>" +
    Array.from(document.getElementById("main").children).filter(x => x.classList.contains(CLASSES.Path)).map((p) => {
      let result = Array.from(p.children).map(c => c.dataset.short + (c.dataset.mark === '1' ? '*' : c.dataset.mark === '2' ? '(*)' : '')).join("<wbr>→<wbr>");
      if (p.dataset.looping === "yes") result += "↩";
      return `<div class="dpath">${result}</div>`
    }).join(" ")
    + "</div>";
}

function registerMouseHandlers() {
  document.getElementById("content").addEventListener("contextmenu", (ev) => { ev.preventDefault(); }, false);
  document.getElementById("content").addEventListener('mousedown', mousedown);
  document.getElementById("content").addEventListener('mousemove', mousemove);
  document.getElementById("content").addEventListener('mouseup', mouseup);
}

function registerModifierKeyHandlers() {
  document.addEventListener('keydown', setModifierKeys);
  document.addEventListener('keyup', resetModifierKeys);
}

function setModifierKeyOnBody(key, enabled) {
  if (enabled) {
    document.body.dataset[key] = '';
  }
  else {
    delete document.body.dataset[key];
  }
}

/**
 * @param {KeyboardEvent} ev 
 */
function setModifierKeys(ev) {
  switch (ev.key) {
    case "Control": {
      setModifierKeyOnBody('ctrl', true);
      break;
    }
    default: {
      break;
    }
  }
}

/**
 * @param {KeyboardEvent} ev 
 */
function resetModifierKeys(ev) {
  switch (ev.key) {
    case "Control": {
      setModifierKeyOnBody('ctrl', false);
      break;
    }
    default: {
      break;
    }
  }
}