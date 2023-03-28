export const posixJoin = (...paths) => paths
  .join('/')
  .replace(/((?<=\/)\/+)|(^\.\/)|((?<=\/)\.\/)/g, '') || '.'

export const win32Join = (...paths) => paths
  .join('\\')
  .replace(/\//g, '\\')
  .replace(/((?<=\\)\\+)|(^\.\\)|((?<=\\)\.\\)/g, '') || '.'

export const join = posixJoin

export default posixJoin
