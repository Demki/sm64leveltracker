
/**
 * @template T
 * @param {T} param0
 * @returns {T}
 */
function identity(x) {
  return x;
}

/**
 * @template T
 * @param {string} key 
 * @param {T} defaultVal
 * @param {{
 *  onSet?: (value: T) => void;
 *  parseFunc?: (serialized: string) => T;
 *  serializeFunc?: (value: T) => string;
 *  deferFirstOnSet?: boolean;
 * }} [options]
 * @returns {[get: () => T, set: (newVal: T) => void]}
 */
function localStorageState(key, defaultVal, options = {}) {
  const { parseFunc = JSON.parse, serializeFunc = JSON.stringify, deferFirstOnSet = false, onSet } = options;
  const fromStorage = localStorage.getItem(key);
  let variable = fromStorage !== null ? parseFunc(fromStorage) : defaultVal;

  const get = () => {
    return variable;
  };

  const set = (newVal) => {
    variable = newVal;
    localStorage.setItem(key, serializeFunc(newVal));
    onSet?.(newVal);
  };

  if (deferFirstOnSet) {
    setTimeout(() => onSet?.(variable));
  } else {
    onSet?.(variable);
  }

  return [get, set];
}

/**
 * @template T
 * @param {string} key 
 * @param {T} defaultVal
 * @param {{
*  onSet?: (value: T) => void;
*  parseFunc?: (serialized: string) => T;
*  serializeFunc?: (value: T) => string;
*  deferFirstOnSet?: boolean;
* }} [options]
* @returns {() => void}
*/
function localStorageToggle(key, defaultVal, options) {
  const [get, set] = localStorageState(key, defaultVal, options);
  return toggleStateCallback(get, set);
}


/**
 * @template T
 * @param {() => T} get
 * @param {(T) => void} set
 * @returns {() => void}
 */
function toggleStateCallback(get, set) {
  return () => {
    const b = get();
    set(!b);
  }
}
