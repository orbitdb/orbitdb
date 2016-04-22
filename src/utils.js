'use strict';

exports.isEqual = (a, b) => {
  const propsA = Object.getOwnPropertyNames(a);
  const propsB = Object.getOwnPropertyNames(b);

  if(propsA.length !== propsB.length)
    return false;

  for(let i = 0; i < propsA.length; i ++) {
    const prop = propsA[i];
    if(a[prop] !== b[prop])
      return false;
  }

  return true;
}
