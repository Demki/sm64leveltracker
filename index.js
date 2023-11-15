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
  [BUTTONS.Left   | MODIFIERS.None]: ACTIONS.Connect,
  [BUTTONS.Left   | MODIFIERS.Ctrl]: ACTIONS.ConnectSelf,
  [BUTTONS.Middle | MODIFIERS.Ctrl]: ACTIONS.Disconnect,
  [BUTTONS.Right  | MODIFIERS.None]: ACTIONS.Mark1,
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

const NOOP = () => {};

/**
 * @param {DragInfo} dragInfo
 */
function setPathLineDAttribute({lineElement, startX, startY, endX, endY}) {
  lineElement.setAttribute('d', `M${startX},${startY} L${endX},${endY}`);
}

/**
 * @param {Pick<MouseEvent, 'clientX' | 'clientY' | 'currentTarget'>} ev
 */
function getMouseOffset({clientX, clientY, currentTarget}) {
  const rect = currentTarget.getBoundingClientRect();
  const offsetX = clientX - rect.left;
  const offsetY = clientY - rect.top;
  return { offsetX, offsetY };
}

/**
 * @param {MouseEvent} ev 
 */
function connectStart({ target, clientX, clientY, currentTarget }) {
  if(!target.classList.contains("item") || target.classList.contains("nocon")) {
    return;
  }
  const { offsetLeft, offsetTop, offsetWidth, offsetHeight } = target;
  const gEl = document.getElementById('connectingLine');
  const { offsetX, offsetY } = getMouseOffset({ clientX, clientY, currentTarget });
  while(gEl.firstChild) {
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
  if(global_dnd_state.dragState === DRAG_STATES.Dragging) {
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
    if(global_dnd_state.dragState !== DRAG_STATES.Dragging) {
      return;
    }
    global_dnd_state.dragInfo.lineElement.remove();

    const shouldConnectSelf = connectSelf && target === global_dnd_state.dragInfo.originalElement && !isPath(target.parentElement);
    const shouldConnect = target.classList.contains("item") 
      && !target.classList.contains("nocon") 
      && (target !== global_dnd_state.dragInfo.originalElement);
    if(shouldConnectSelf) {
      const newPath = document.createElement("div");
      newPath.classList.add("path");
      newPath.dataset.looping = "yes";
      document.getElementById("main").insertBefore(newPath, target.parentElement);
      newPath.append(target);
    } else if(shouldConnect) {
      connect(global_dnd_state.dragInfo.originalElement, target);
    }

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
    {start: connectStart,
    while: connectWhile, 
    end: connectEnd(false)},
  [ACTIONS.ConnectSelf]: 
    {start: connectStart,
    while: connectWhile, 
    end: connectEnd(true)},
  [ACTIONS.Disconnect]: 
    {end: disconnect},
  [ACTIONS.Mark1]: 
    {end: mark(1)},
  [ACTIONS.Mark2]: 
    {end: mark(2)},
}

const DEFAULT_STAR_COUNT = 70;

function mark(v) {
  return ({target}) => {
    if(target.classList.contains("item")){
      const mark = target.dataset.mark;
      const newMark = target.dataset.mark === `${v}` ? '0' : v;
      if (!target.classList.replace(`color${mark}`, `color${newMark}`)) {
        target.classList.add(`color${newMark}`);
      }
      target.dataset.mark = newMark;
    }
  }
}

let nightMode = false;
let shortMode = false;
let hiddenBitS = false;
let hiddenOthers = false;
let shownTips = false;

const MARK_1_DEFAULT = "#da1b1b"
const MARK_2_DEFAULT = "#118d11"

let mark1Color = MARK_1_DEFAULT;
let mark2Color = MARK_2_DEFAULT;

/**
 * 
 * @param {MouseEvent} ev 
 */
function mousedown(ev) {
  if(ev.button === MIDDLE_MOUSE_BUTTON) ev.preventDefault(); // prevent scroll toggle with middle mouse button
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
  return p.classList.contains("path");
}

function createPath(startPath, ...ls) {
  const newPath = document.createElement("div");
  newPath.classList.add("path");
  newPath.dataset.looping = "no";
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
  list.append(...Array.from(list.children).sort((a, b) => Number(a.id.substring(4)) - Number(b.id.substring(4))));
}

function disconnect({target}) {
  const targetPath = target.parentElement;
  if (!isPath(targetPath)) return;
  targetPath.dataset.looping = "no";
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

  prevPath.dataset.looping = "no";

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

  targetPath.dataset.looping = "no";

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
      Array.from(document.getElementById("main").children).filter(x => x.classList.contains("path")).map((p) => {
        let result = Array.from(p.children).map(c => c.dataset.short + (c.dataset.mark === '1' ? '*' : c.dataset.mark === '2' ? '(*)' : '')).join("<wbr>→<wbr>");
        if (p.dataset.looping === "yes") result += "↩";
        return `<div class="dpath">${result}</div>`
      }).join(" ")
      + "</div>";
}

function toggleDisplay() {
  const clist = document.getElementById("display").classList;
  clist.toggle("hidden");
  localStorage.setItem("displayVisible", !clist.contains("hidden"));
}

function toggleStarCounter() {
  const clist = document.getElementById("starCounter").classList;
  clist.toggle("hidden");
  localStorage.setItem("starCounterVisible", !clist.contains("hidden"));
}

window.addEventListener("load", () => {
  document.getElementById("content").addEventListener("contextmenu", (ev) => { ev.preventDefault(); }, false);
  document.getElementById("content").addEventListener('mousedown', mousedown);
  document.getElementById("content").addEventListener('mousemove', mousemove);
  document.getElementById("content").addEventListener('mouseup', mouseup);
  document.addEventListener('keydown', keyEventHandler);

  let i = 0;
  for (const child of document.getElementById("list").children) {
    child.classList.add("item");
    child.classList.add("color0");
    child.id = "item" + i;
    i++;
    child.dataset.mark = '0';
  }

  for (const child of document.getElementById("others").children) {
    child.classList.add("nocon");
    child.classList.add("item");
    child.classList.add("color0");
    child.id = "item" + i;
    i++;
    child.dataset.mark = '0';
  }

  const incrementStarCountBtn = document.getElementById("incrementStarCountBtn");
  if(incrementStarCountBtn) incrementStarCountBtn.addEventListener("click", incrementStarCount);
  const decrementStarCountBtn = document.getElementById("decrementStarCountBtn");
  if(decrementStarCountBtn) decrementStarCountBtn.addEventListener("click", decrementStarCount);

  const starCounterBtn = document.getElementById("starCounterBtn");
  if (starCounterBtn) starCounterBtn.addEventListener("click", toggleStarCounter);
  const displayBtn = document.getElementById("displayBtn");
  if (displayBtn) displayBtn.addEventListener("click", toggleDisplay);
  const nightBtn = document.getElementById("nightBtn");
  if (nightBtn) nightBtn.addEventListener("click", toggleNightMode);
  const shortBtn = document.getElementById("shortBtn");
  if (shortBtn) shortBtn.addEventListener("click", toggleShort);
  const toggleOthersBtn = document.getElementById("toggleOthersBtn");
  if (toggleOthersBtn) toggleOthersBtn.addEventListener("click", toggleOthers);
  const toggleBitSBtn = document.getElementById("toggleBitSBtn");
  if (toggleBitSBtn) toggleBitSBtn.addEventListener("click", toggleBitS);
  const toggleTipsBtn = document.getElementById("toggleTipsBtn");
  if (toggleTipsBtn) toggleTipsBtn.addEventListener("click", toggleTips);

  nightMode = (localStorage.getItem("nightMode") || "true") === "true";
  shortMode = localStorage.getItem("shortMode") === "true";
  hiddenBitS = localStorage.getItem("hiddenBitS") === "true";
  hiddenOthers = localStorage.getItem("hiddenOthers") === "true";
  shownTips = localStorage.getItem("shownTips") === "true";
  if (nightMode) document.body.classList.add("nightMode");
  setShort(shortMode);
  setHiddenBitS(hiddenBitS);
  setHiddenOthers(hiddenOthers);
  setShownTips(shownTips);

  if(JSON.parse(localStorage.getItem("displayVisible"))) toggleDisplay();
  if(JSON.parse(localStorage.getItem("starCounterVisible"))) toggleStarCounter();

  const displayDiv = document.getElementById("display");
  const contentDiv = document.getElementById("content");

  const displaySizeObserver = new MutationObserver(() => 
  {
    localStorage.setItem("displayWidth", displayDiv.style.width);
    localStorage.setItem("displayHeight", displayDiv.style.height);
  });

  const contentSizeObserver = new MutationObserver(() => 
  {
    localStorage.setItem("contentWidth", contentDiv.style.width);
    localStorage.setItem("contentHeight", contentDiv.style.height);
  });

  displaySizeObserver.observe(displayDiv, {attributes: true, attributeFilter: ["style"]});

  contentSizeObserver.observe(contentDiv, {attributes: true, attributeFilter: ["style"]});

  if(localStorage.getItem("displayWidth") && localStorage.getItem("displayHeight"))
  {
    displayDiv.style.setProperty("width", localStorage.getItem("displayWidth"));
    displayDiv.style.setProperty("height", localStorage.getItem("displayHeight"));
  }
  
  if(localStorage.getItem("contentWidth") && localStorage.getItem("contentHeight"))
  {
    contentDiv.style.setProperty("width", localStorage.getItem("contentWidth"));
    contentDiv.style.setProperty("height", localStorage.getItem("contentHeight"));
  }
  
  if(localStorage.getItem("mark1Color"))
  {
    mark1Color = localStorage.getItem("mark1Color");
  }

  if(localStorage.getItem("mark2Color"))
  {
    mark2Color = localStorage.getItem("mark2Color");
  }

  const mark1ColorPicker = document.getElementById("mark1ColorPicker");
  const mark2ColorPicker = document.getElementById("mark2ColorPicker");
  const resetColorsBtn   = document.getElementById("resetColorsBtn");

  mark1ColorPicker.jscolor.fromString(mark1Color);
  document.body.style.setProperty("--color1BG", mark1Color);

  mark2ColorPicker.jscolor.fromString(mark2Color);
  document.body.style.setProperty("--color2BG", mark2Color);

  mark1ColorPicker.addEventListener("input", setMark1Color);
  mark2ColorPicker.addEventListener("input", setMark2Color);
  resetColorsBtn.addEventListener("click", resetColors);
});

function setMark1Color() {
  mark1Color = document.getElementById("mark1ColorPicker").jscolor.toHEXString();
  localStorage.setItem("mark1Color", mark1Color);
  document.body.style.setProperty("--color1BG", mark1Color);
}

function setMark2Color() {
  mark2Color = document.getElementById("mark2ColorPicker").jscolor.toHEXString();
  localStorage.setItem("mark2Color", mark2Color);
  document.body.style.setProperty("--color2BG", mark2Color);
}

function resetColors(mark1ColorPicker, mark2ColorPicker) { 
  document.getElementById("mark1ColorPicker").jscolor.fromString(MARK_1_DEFAULT);
  document.getElementById("mark2ColorPicker").jscolor.fromString(MARK_2_DEFAULT);
  setMark1Color();
  setMark2Color();
}

function toggleNightMode() {
  if (nightMode) {
    nightMode = false;
    localStorage.setItem("nightMode", nightMode);
    document.body.classList.remove("nightMode");
  }
  else {
    nightMode = true;
    localStorage.setItem("nightMode", nightMode);
    document.body.classList.add("nightMode");
  }
  updateWindow();
}

function setShort(sm) {

  for (const child of [...document.getElementById("main").children].filter(x => !x.id.startsWith("count")).flatMap(x => [...x.children])) {
    if (!("long" in child.dataset)) {
      child.dataset.long = child.innerText;
    }
    if (!("short" in child.dataset)) {
      child.dataset.short = child.innerText;
    }
    if (sm) {
      child.innerText = child.dataset.short;
      document.body.style.setProperty("--minItemWidth", "100px");
    } else {
      child.innerText = child.dataset.long;
      document.body.style.setProperty("--minItemWidth", "240px");
    }
  }
}

function toggleShort() {
  if (shortMode) {
    shortMode = false;
    localStorage.setItem("shortMode", shortMode);
  }
  else {
    shortMode = true;
    localStorage.setItem("shortMode", shortMode);
  }
  setShort(shortMode);
}

function setHiddenBitS(hBS) {
  const bitS = document.querySelector("div[data-short=BitS]");
  if(hBS)
  {
    bitS.classList.add("hidden");
    document.getElementById("toggleBitSBtn").value = "show BitS";
  }
  else
  {
    bitS.classList.remove("hidden");
    document.getElementById("toggleBitSBtn").value = "hide BitS";
  }
}

function setHiddenOthers(hOthers) {
  const others = document.getElementById("others");
  if(hOthers)
  {
    others.classList.add("hidden");
    document.getElementById("toggleOthersBtn").value = "show Toads and Mips";
  }
  else
  {
    others.classList.remove("hidden");
    document.getElementById("toggleOthersBtn").value = "hide Toads and Mips";
  }
}

function toggleBitS() {
  if (hiddenBitS) {
    hiddenBitS = false;
    localStorage.setItem("hiddenBitS", hiddenBitS);
  }
  else {
    hiddenBitS = true;
    localStorage.setItem("hiddenBitS", hiddenBitS);
  }
  setHiddenBitS(hiddenBitS);
}

function toggleOthers() {
  if (hiddenOthers) {
    hiddenOthers = false;
    localStorage.setItem("hiddenOthers", hiddenOthers);
  }
  else {
    hiddenOthers = true;
    localStorage.setItem("hiddenOthers", hiddenOthers);
  }
  setHiddenOthers(hiddenOthers);
}

function setShownTips(sTips) {
  const tips = document.getElementById("tooltips");
  if(!sTips)
  {
    tips.classList.add("hidden");
    document.getElementById("toggleTipsBtn").value = "show controls";
  }
  else
  {
    tips.classList.remove("hidden");
    document.getElementById("toggleTipsBtn").value = "hide controls";
  }
}

function toggleTips() {
  if (shownTips) {
    shownTips = false;
    localStorage.setItem("shownTips", shownTips);
  }
  else {
    shownTips = true;
    localStorage.setItem("shownTips", shownTips);
  }
  setShownTips(shownTips);
}

function incrementStarCount() {
  const el = document.getElementById("starCount");
  const starCount = Number.parseInt(el.innerHTML);
  if(Number.isNaN(starCount)) el.innerHTML = DEFAULT_STAR_COUNT.toString();
  else el.innerHTML = (starCount + 1).toString();
}

function decrementStarCount() {
  const el = document.getElementById("starCount");
  const starCount = Number.parseInt(el.innerHTML);
  if(Number.isNaN(starCount)) el.innerHTML = DEFAULT_STAR_COUNT.toString();
  else el.innerHTML = (starCount - 1).toString();
}


function keyEventHandler(ev) {
  switch(ev.code)
  {
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
