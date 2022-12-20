/* eslint-disable */
import where from 'wherearewe'

export const fs = (!where.isElectronMain && (typeof window === 'object' || typeof self === 'object')) ? null : eval('import("fs")')
