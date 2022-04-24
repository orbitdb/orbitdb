/* eslint-disable */
const where = require('wherearewe')

const fs = (!where.isElectronMain && (typeof window === 'object' || typeof self === 'object')) ? null : eval('require("fs")')

module.exports = fs
