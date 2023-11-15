function* dropUntilInc(f, xs) {
  let conditionMet = false;
  for(const x of xs) 
  {
    if(!conditionMet && f(x)) {
      conditionMet = true;
    }
    if(conditionMet) {
      yield x;
    }
  }
}

function* dropUntilExc(f, xs) {
  let conditionMet = false;
  for(const x of xs) 
  {
    if(conditionMet) {
      yield x;
    }
    if(!conditionMet && f(x)) {
      conditionMet = true;
    }
  }
}

function* takeUntilExc(f, xs) {
  for(const x of xs) 
  {
    if(f(x)) {
      break;
    }
    yield x;
  }
}

function* takeUntilInc(f, xs) {
  for(const x of xs) 
  {
    yield x;
    if(f(x)) {
      break;
    }
  }
}