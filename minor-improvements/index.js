window.addEventListener("load", () => {
  registerMouseHandlers();
  registerModifierKeyHandlers();
  initializeItems();
  initializeUi();
});

function initializeUi() {
  initializeUiToggles();
  initializeResizeObservers();
  initializeStarCounterHandling()
  initializeColorPicker();
}

function initializeStarCounterHandling() {
  document.getElementById("incrementStarCountBtn")?.addEventListener("click", incrementStarCount);
  document.getElementById("decrementStarCountBtn")?.addEventListener("click", decrementStarCount);
  document.addEventListener('keydown', starCountKeyHandler);
}

function initializeResizeObservers() {
  const [getContentWidth, setContentWidth] = localStorageState("contentWidth", '800px', { onSet: undefined, serializeFunc: identity, parseFunc: identity });
  const [getContentHeight, setContentHeight] = localStorageState("contentHeight", '400px', { onSet: undefined, serializeFunc: identity, parseFunc: identity });
  const [getDisplayWidth, setDisplayWidth] = localStorageState("displayWidth", '300px', { onSet: undefined, serializeFunc: identity, parseFunc: identity });
  const [getDisplayHeight, setDisplayHeight] = localStorageState("displayHeight", '200px', { onSet: undefined, serializeFunc: identity, parseFunc: identity });

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
}

function initializeUiToggles() {
  const [getShortMode, setShortMode] = localStorageState("shortMode", false, { onSet: onSetShort });

  const toggleShortMode = toggleStateCallback(getShortMode, setShortMode);
  const toggleSplitTHI = localStorageToggle("splitTHI", false, { onSet: onSetSplitTHI(getShortMode) });
  const toggleNightMode = localStorageToggle("nightMode", true, { onSet: onSetNight });
  const toggleHiddenBitS = localStorageToggle("hiddenBitS", false, { onSet: onSetHiddenBitS });
  const toggleHiddenOthers = localStorageToggle("hiddenOthers", false, { onSet: onSetHiddenOthers });
  const toggleShownTips = localStorageToggle("shownTips", false, { onSet: onSetShownTips });
  const toggleDisplayVisible = localStorageToggle("displayVisible", false, { onSet: onSetDisplayVisible });
  const toggleStarCounterVisible = localStorageToggle("starCounterVisible", false, { onSet: onSetStarCounterVisible });

  document.getElementById("shortBtn")?.addEventListener?.("click", toggleShortMode);
  document.getElementById("toggleTHISplitBtn")?.addEventListener?.("click", toggleSplitTHI);
  document.getElementById("nightBtn")?.addEventListener?.("click", toggleNightMode);
  document.getElementById("toggleBitSBtn")?.addEventListener?.("click", toggleHiddenBitS);
  document.getElementById("toggleOthersBtn")?.addEventListener?.("click", toggleHiddenOthers);
  document.getElementById("toggleTipsBtn")?.addEventListener?.("click", toggleShownTips);
  document.getElementById("displayBtn")?.addEventListener?.("click", toggleDisplayVisible);
  document.getElementById("starCounterBtn")?.addEventListener?.("click", toggleStarCounterVisible);
}

function initializeColorPicker() {
  const mark1ColorPicker = document.getElementById("mark1ColorPicker");
  const mark2ColorPicker = document.getElementById("mark2ColorPicker");
  const resetColorsBtn = document.getElementById("resetColorsBtn");

  if (mark1ColorPicker && mark2ColorPicker && resetColorsBtn) {
    const [getMark1Color, setMark1Color] = localStorageState("mark1Color", MARK_1_DEFAULT, { onSet: onSetMark1Color, serializeFunc: identity, parseFunc: identity });
    const [getMark2Color, setMark2Color] = localStorageState("mark2Color", MARK_2_DEFAULT, { onSet: onSetMark2Color, serializeFunc: identity, parseFunc: identity });
    mark1ColorPicker.jscolor.fromString(getMark1Color());
    mark2ColorPicker.jscolor.fromString(getMark2Color());
  
    mark1ColorPicker.addEventListener("input", () => { setMark1Color(mark1ColorPicker.jscolor.toHEXString()) });
    mark2ColorPicker.addEventListener("input", () => { setMark2Color(mark2ColorPicker.jscolor.toHEXString()) });
    resetColorsBtn.addEventListener("click", resetColors(setMark1Color, setMark2Color));
  }

}

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
function starCountKeyHandler(ev) {
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