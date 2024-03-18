const CLASSES = Object.freeze({
  PeventConnection: "nocon",
  Item: "item",
  ColorPrefix: "color",
  Path: "path",
});

const IDS = Object.freeze({
  ItemPrefix: "item",
  // TODO: extract the rest of the ids...
})

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

const NOOP = () => { };

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
 * @param {boolean} connectSelf
 * @returns {(ev: MouseEvent) => void}
 */
function connectEnd(connectSelf) {
  return ({ target }) => {
    if (global_dnd_state.dragState !== DRAG_STATES.Dragging) {
      return;
    }
    global_dnd_state.dragInfo.lineElement.remove();

    const shouldConnectSelf = connectSelf && target === global_dnd_state.dragInfo.originalElement && !isPath(target.parentElement);
    const shouldConnect = target.classList.contains(CLASSES.Item)
      && !target.classList.contains(CLASSES.PeventConnection)
      && (target !== global_dnd_state.dragInfo.originalElement);
    if (shouldConnectSelf) {
      const newPath = document.createElement("div");
      newPath.classList.add(CLASSES.Path);
      newPath.dataset.looping = "yes";
      document.getElementById("main").insertBefore(newPath, target.parentElement);
      newPath.append(target);
    } else if (shouldConnect) {
      connect(global_dnd_state.dragInfo.originalElement, target);
    }
    updateWindow();

    global_dnd_state.dragState = DRAG_STATES.None;
    global_dnd_state.dragInfo = undefined;
  }
}

/**
 * @type {{
*  [P in ValueOf<typeof ACTIONS>]: 
*    {start?: (MouseEvent) => void, while?: (MouseEvent) => void, end: (MouseEvent) => void}
* }}
*/
const ACTIONS_CALLBACKS = {
  [ACTIONS.Connect]:
  {
    start: connectStart,
    while: connectWhile,
    end: connectEnd(false)
  },
  [ACTIONS.ConnectSelf]:
  {
    start: connectStart,
    while: connectWhile,
    end: connectEnd(true)
  },
  [ACTIONS.Disconnect]:
    { end: disconnect },
  [ACTIONS.Mark1]:
    { end: mark(1) },
  [ACTIONS.Mark2]:
    { end: mark(2) },
}

const DEFAULT_STAR_COUNT = 70;

function mark(v) {
  return ({ target }) => {
    if (target.classList.contains(CLASSES.Item)) {
      const mark = target.dataset.mark;
      const newMark = target.dataset.mark === `${v}` ? '0' : v;
      if (!target.classList.replace(`${CLASSES.ColorPrefix}${mark}`, `${CLASSES.ColorPrefix}${newMark}`)) {
        target.classList.add(`${CLASSES.ColorPrefix}${newMark}`);
      }
      target.dataset.mark = newMark;
    }
  }
}

const MARK_1_DEFAULT = "#da1b1b"
const MARK_2_DEFAULT = "#118d11"

/**
 * 
 * @param {MouseEvent} ev 
 */
function mousedown(ev) {
  if (ev.button === BUTTONS.Middle) ev.preventDefault(); // prevent scroll toggle with middle mouse button
  const button = ev.button;
  const modifiers = (ev.ctrlKey && MODIFIERS.Ctrl)
    | (ev.shiftKey && MODIFIERS.Shift)
    | (ev.altKey && MODIFIERS.Alt);
  const modifiedButton = button | modifiers;
  ACTIONS_CALLBACKS[ACTIONS_KEY_MAPPING[modifiedButton]]?.start?.(ev);
}

function mousemove(ev) {
  const button = ev.button;
  const modifiers = (ev.ctrlKey && MODIFIERS.Ctrl)
    | (ev.shiftKey && MODIFIERS.Shift)
    | (ev.altKey && MODIFIERS.Alt);
  const modifiedButton = button | modifiers;
  ACTIONS_CALLBACKS[ACTIONS_KEY_MAPPING[modifiedButton]]?.while?.(ev);
}

function mouseup(ev) {
  const button = ev.button;
  const modifiers = (ev.ctrlKey && MODIFIERS.Ctrl)
    | (ev.shiftKey && MODIFIERS.Shift)
    | (ev.altKey && MODIFIERS.Alt);
  const modifiedButton = button | modifiers;
  ACTIONS_CALLBACKS[ACTIONS_KEY_MAPPING[modifiedButton]]?.end?.(ev);
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

window.addEventListener("load", () => {
  document.getElementById("content").addEventListener("contextmenu", (ev) => { ev.preventDefault(); }, false);
  document.getElementById("content").addEventListener('mousedown', mousedown);
  document.getElementById("content").addEventListener('mousemove', mousemove);
  document.getElementById("content").addEventListener('mouseup', mouseup);
  document.addEventListener('keydown', keyEventHandler);

  initializeItems(false);
  
  const [getShortMode, setShortMode] = localStorageState("shortMode", false, { onSet: onSetShort });
  const [getSplitTHI, setSplitTHI] = localStorageState("splitTHI", false, { onSet: onSetSplitTHI(getShortMode) });
  const [getNightMode, setNightMode] = localStorageState("nightMode", true, { onSet: onSetNight });
  const [getHiddenBitS, setHiddenBitS] = localStorageState("hiddenBitS", false, { onSet: onSetHiddenBitS });
  const [getHiddenOthers, setHiddenOthers] = localStorageState("hiddenOthers", false, { onSet: onSetHiddenOthers });
  const [getShownTips, setShownTips] = localStorageState("shownTips", false, { onSet: onSetShownTips });
  const [getDisplayVisible, setDisplayVisible] = localStorageState("displayVisible", false, { onSet: onSetDisplayVisible });
  const [getStarCounterVisible, setStarCounterVisible] = localStorageState("starCounterVisible", false, { onSet: onSetStarCounterVisible });
  const [getDisplayWidth, setDisplayWidth] = localStorageState("displayWidth", '300px', { onSet: undefined, serializeFunc: identity, parseFunc: identity });
  const [getDisplayHeight, setDisplayHeight] = localStorageState("displayHeight", '200px', { onSet: undefined, serializeFunc: identity, parseFunc: identity });
  const [getContentWidth, setContentWidth] = localStorageState("contentWidth", '800px', { onSet: undefined, serializeFunc: identity, parseFunc: identity });
  const [getContentHeight, setContentHeight] = localStorageState("contentHeight", '400px', { onSet: undefined, serializeFunc: identity, parseFunc: identity });
  const [getMark1Color, setMark1Color] = localStorageState("mark1Color", MARK_1_DEFAULT, { onSet: onSetMark1Color, serializeFunc: identity, parseFunc: identity });
  const [getMark2Color, setMark2Color] = localStorageState("mark2Color", MARK_2_DEFAULT, { onSet: onSetMark2Color, serializeFunc: identity, parseFunc: identity });

  const contentDiv = document.getElementById("content");
  contentDiv.style.setProperty("width", getContentWidth());
  contentDiv.style.setProperty("height", getContentHeight());

  const displayDiv = document.getElementById("display");
  displayDiv.style.setProperty("width", getDisplayWidth());
  displayDiv.style.setProperty("height", getDisplayHeight());

  const displaySizeObserver = new MutationObserver(() => {
    setDisplayWidth(displayDiv.style.width);
    setDisplayHeight(displayDiv.style.height);
  });

  const contentSizeObserver = new MutationObserver(() => {
    setContentWidth(contentDiv.style.width);
    setContentHeight(contentDiv.style.height);
  });

  displaySizeObserver.observe(displayDiv, { attributes: true, attributeFilter: ["style"] });
  contentSizeObserver.observe(contentDiv, { attributes: true, attributeFilter: ["style"] });

  document.getElementById("starCounterBtn")?.addEventListener?.("click", toggleStateCallback(getStarCounterVisible, setStarCounterVisible));
  document.getElementById("displayBtn")?.addEventListener?.("click", toggleStateCallback(getDisplayVisible, setDisplayVisible));
  document.getElementById("nightBtn")?.addEventListener?.("click", toggleStateCallback(getNightMode, setNightMode));
  document.getElementById("shortBtn")?.addEventListener?.("click", toggleStateCallback(getShortMode, setShortMode));
  document.getElementById("toggleOthersBtn")?.addEventListener?.("click", toggleStateCallback(getHiddenOthers, setHiddenOthers));
  document.getElementById("toggleBitSBtn")?.addEventListener?.("click", toggleStateCallback(getHiddenBitS, setHiddenBitS));
  document.getElementById("toggleTipsBtn")?.addEventListener?.("click", toggleStateCallback(getShownTips, setShownTips));
  document.getElementById("toggleTHISplitBtn")?.addEventListener?.("click", toggleStateCallback(getSplitTHI, setSplitTHI));
  document.getElementById("incrementStarCountBtn")?.addEventListener("click", incrementStarCount);
  document.getElementById("decrementStarCountBtn")?.addEventListener("click", decrementStarCount);

  const mark1ColorPicker = document.getElementById("mark1ColorPicker");
  const mark2ColorPicker = document.getElementById("mark2ColorPicker");
  const resetColorsBtn = document.getElementById("resetColorsBtn");

  if (mark1ColorPicker && mark2ColorPicker && resetColorsBtn) {
    mark1ColorPicker.jscolor.fromString(getMark1Color());
    mark2ColorPicker.jscolor.fromString(getMark2Color());

    mark1ColorPicker.addEventListener("input", () => { setMark1Color(mark1ColorPicker.jscolor.toHEXString()) });
    mark2ColorPicker.addEventListener("input", () => { setMark2Color(mark2ColorPicker.jscolor.toHEXString()) });
    resetColorsBtn.addEventListener("click", resetColors(setMark1Color, setMark2Color));
  }
});

function initializeItems() {
  const list = document.getElementById("list");
  const othersList = document.getElementById("others");

  let id = 0;
  for (const listItem of LEVELS) {
    const element = createItemElement(listItem, id);
    id++;
    list.append(element);
  }

  for (const listItem of OTHERS) {
    const element = createItemElement(listItem, id);
    id++;
    element.classList.add(CLASSES.PeventConnection);
    othersList.append(element);
  }
}

/**
 * 
 * @param {ListItem} item 
 * @param {number | string} id 
 */
function createItemElement(item, id) {
  const child = document.createElement('div');
  child.innerText = item.longName;
  child.classList.add(CLASSES.Item);
  child.classList.add(`${CLASSES.ColorPrefix}0`);
  child.id = IDS.ItemPrefix + id;
  child.dataset.mark = '0';
  child.dataset.short = item.shortName;
  return child;
}

/**
 * @param {string} mark1Color 
 */
function onSetMark1Color(mark1Color) {
  document.body.style.setProperty("--color1BG", mark1Color);
}

/**
 * @param {string} mark2Color 
 */
function onSetMark2Color(mark2Color) {
  document.body.style.setProperty("--color2BG", mark2Color);
}

/**
 * @param {(color: string) => void} setMark1Color 
 * @param {(color: string) => void} setMark2Color 
 * @returns 
 */
function resetColors(setMark1Color, setMark2Color) {
  return () => {
    document.getElementById("mark1ColorPicker").jscolor.fromString(MARK_1_DEFAULT);
    document.getElementById("mark2ColorPicker").jscolor.fromString(MARK_2_DEFAULT);
    setMark1Color(MARK_1_DEFAULT);
    setMark2Color(MARK_2_DEFAULT);
  }
}

/**
 * @param {boolean} displayVisible 
 */
function onSetDisplayVisible(displayVisible) {
  const clist = document.getElementById("display").classList;
  if (displayVisible) {
    clist.remove("hidden");
  } else {
    clist.add("hidden");
  }
}

/**
 * @param {boolean} startCounterVisible 
 */
function onSetStarCounterVisible(startCounterVisible) {
  const clist = document.getElementById("starCounter").classList;
  if (startCounterVisible) {
    clist.remove("hidden");
  } else {
    clist.add("hidden");
  }
}

/**
 * @param {boolean} nightMode 
 */
function onSetNight(nightMode) {
  if (!nightMode) {
    document.body.classList.remove("nightMode");
  }
  else {
    document.body.classList.add("nightMode");
  }
}

/**
 * @param {boolean} sm 
 */
function onSetShort(sm) {

  for (const child of [...document.getElementById("main").children].filter(x => !x.id.startsWith("count")).flatMap(x => [...x.children])) {
    if (!("long" in child.dataset)) {
      child.dataset.long = child.innerText;
    }
    if (!("short" in child.dataset)) {
      child.dataset.short = child.innerText;
    }
    if (sm) {
      child.innerText = child.dataset.short;
    } else {
      child.innerText = child.dataset.long;
    }
  }
  if (sm) {
    document.body.style.setProperty("--minItemWidth", "100px");
  } else {
    document.body.style.setProperty("--minItemWidth", "240px");
  }
}

/**
 * @param {boolean} hBS 
 */
function onSetHiddenBitS(hBS) {
  const bitS = document.querySelector("div[data-short=BitS]");
  if (hBS) {
    bitS.classList.add("hidden");
    document.getElementById("toggleBitSBtn").value = "show BitS";
  }
  else {
    bitS.classList.remove("hidden");
    document.getElementById("toggleBitSBtn").value = "hide BitS";
  }
}

/**
 * @param {boolean} hOthers 
 */
function onSetHiddenOthers(hOthers) {
  const others = document.getElementById("others");
  if (hOthers) {
    others.classList.add("hidden");
    document.getElementById("toggleOthersBtn").value = "show Toads and Mips";
  }
  else {
    others.classList.remove("hidden");
    document.getElementById("toggleOthersBtn").value = "hide Toads and Mips";
  }
}

/**
 * @param {boolean} sTips 
 */
function onSetShownTips(sTips) {
  const tips = document.getElementById("tooltips");
  if (!sTips) {
    tips.classList.add("hidden");
    document.getElementById("toggleTipsBtn").value = "show controls";
  }
  else {
    tips.classList.remove("hidden");
    document.getElementById("toggleTipsBtn").value = "hide controls";
  }
}

/**
 * @param {() => boolean} getShortMode 
 * @returns {(splitTHI: boolean) => void}
 */
function onSetSplitTHI(getShortMode) {
  return (splitTHI) => {
    if (splitTHI) {
      const THIelem = document.querySelector(`[data-short="THI"]`);
      if (THIelem) {
        REPLACEMENTS["THI"].forEach((li, idx) => {
          const element = createItemElement(li, "");
          element.id = THIelem.id + '_' + idx;
          THIelem.insertAdjacentElement("beforebegin", element);
        });
        THIelem.remove();
      }
      document.getElementById("toggleTHISplitBtn").value = "merge THI";
    } else {
      const THISelem = document.querySelector(`[data-short="THIS"]`);
      const THIBelem = document.querySelector(`[data-short="THIB"]`);
      const THIitem = LEVELS.find((li) => li.shortName === "THI");
      if (THIBelem && THIitem) {
        const element = createItemElement(THIitem, "");
        element.id = THIBelem.id.replace(/_[0-9]*$/, "");
        THIBelem.insertAdjacentElement("beforebegin", element);
        for (const elem of [THISelem, THIBelem]) {
          elem.remove();
        }
      }
      document.getElementById("toggleTHISplitBtn").value = "split THI";
    }
    onSetShort(getShortMode());
  }
}

function incrementStarCount() {
  const el = document.getElementById("starCount");
  const starCount = Number.parseInt(el.innerHTML);
  if (Number.isNaN(starCount)) el.innerHTML = DEFAULT_STAR_COUNT.toString();
  else el.innerHTML = (starCount + 1).toString();
}

function decrementStarCount() {
  const el = document.getElementById("starCount");
  const starCount = Number.parseInt(el.innerHTML);
  if (Number.isNaN(starCount)) el.innerHTML = DEFAULT_STAR_COUNT.toString();
  else el.innerHTML = (starCount - 1).toString();
}

/**
 * @param {KeyboardEvent} ev 
 */
function keyEventHandler(ev) {
  switch (ev.code) {
    case "ArrowUp":
      incrementStarCount();
      break;
    case "ArrowDown":
      decrementStarCount();
      break;
    default:
      break;
  }
}