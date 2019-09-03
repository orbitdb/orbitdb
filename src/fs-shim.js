/* eslint-disable */
const fs = (typeof window === 'object' || typeof self === 'object') ? null
  : eval('require("fs")')

module.exports = fs
