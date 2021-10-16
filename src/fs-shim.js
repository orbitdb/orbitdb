/* eslint-disable */
const isElectron = require('is-electron')

const fs = (!isElectron() && (typeof window === 'object' || typeof self === 'object')) ? null : eval('require("fs")')

module.exports = fs
