const posixReg = /((?<=\/)\/+)|(^\.\/)|((?<=\/)\.\/)/g
const win32Reg = /((?<=\\)\\+)|(^\.\\)|((?<=\\)\.\\)/g

const createJoin = isWin => (...paths) => isWin ?
  paths.join('\\').replace(/\//g, '\\').replace(win32Reg, '') :
  paths.join('/').replace(posixReg, '')

export const join = createJoin(typeof process !== 'undefined' && process?.platform === 'win32')

export const posixJoin = createJoin(false)
export const win32Join = createJoin(true)

export default join
