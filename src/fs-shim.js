/* eslint-disable */
import { isElectronMain } from 'wherearewe'
import * as fs_ from 'fs'

export const fs = (!isElectronMain && (typeof window === 'object' || typeof self === 'object'))
  ? null
  : fs_

export default fs
