import pathJoin from './path-join.js'

export default address => {
  const suffix = address.toString().split('/').pop()
  return suffix === '_access'
    ? address
    : pathJoin(address, '/_access')
}
