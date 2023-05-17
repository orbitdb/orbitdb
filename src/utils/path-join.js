/**
 * A posix-compatible verions of join.
 * @function posixJoin
 * @param {...string} paths or more strings to join.
 * @return {string} The joined strings.
 * @memberof module:Utils
 */
export const posixJoin = (...paths) => paths
  .join('/')
  .replace(/((?<=\/)\/+)|(^\.\/)|((?<=\/)\.\/)/g, '') || '.'

/**
  * A windows-compatible verions of join.
 * @function win32Join
  * @param {...string} One or more strings to join.
  * @return {string} The joined strings.
  * @memberof module:Utils
  */
export const win32Join = (...paths) => paths
  .join('\\')
  .replace(/\//g, '\\')
  .replace(/((?<=\\)\\+)|(^\.\\)|((?<=\\)\.\\)/g, '') || '.'

/**
 * An alias for posixJoin.
 * @function join
 * @alias posixJoin
 * @param {...string} paths or more strings to join.
 * @return {string} The joined strings.
 * @memberof module:Utils
 * @static
 */
export const join = posixJoin

export default posixJoin
