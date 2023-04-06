import pathJoin from './path-join.js'

// Make sure the given address has '/_access' as the last part
export default address => {
  const suffix = address.toString().split('/').pop()
  return suffix === '_access'
    ? address
    : pathJoin(address, '/_access')
}
