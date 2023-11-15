
function identity(x) {
    return x;
  }
  
  /**
   * @template T
   * @param {string} key 
   * @param {T} defaultVal
   * @param {(T) => void =} onSet
   * @param {(string) => T =} parseFunc
   * @returns {[get: () => T, set: (newVal: T) => void]}
   */
  function localStorageState(key, defaultVal, onSet, parseFunc=JSON.parse)
  {
    const fromStorage = localStorage.getItem(key);
    let variable = fromStorage !== null ? parseFunc(fromStorage) : defaultVal;
    
    const get = () => {
      return variable;
    };
  
    const set = (newVal) => {
      variable = newVal;
      localStorage.setItem(key, JSON.stringify(newVal));
      onSet?.(newVal);
    };
  
    onSet?.(variable);
  
    return [get, set];
  }
  
  /**
   * @template T
   * @param {() => T} get
   * @param {(newVal: T) => void} set
   * @returns {() => void}
   */
  function toggleStateCallback(get, set) {
    return () => {
      const b = get();
      set(!b);
    }
  }