import pathJoin from './path-join.js'

/**
 * Checks that the given address has '/_access' as the last part.
 * @function
 * @param {string} address The address to check.
 * @return {string} The address appended with /_access.
 * @memberof module:Utils
 */
export default address => {
  const suffix = address.toString().split('/').pop()
  return suffix === '_access'
    ? address
    : pathJoin(address, '/_access')
}
