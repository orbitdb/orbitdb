const posixReg = /((?<=\/)\/+)|(^\.\/)|((?<=\/)\.\/)/g
const win32Reg = /((?<=\\)\\+)|(^\.\\)|((?<=\\)\.\\)/g

const createJoin = isWin => (...paths) => paths.join(isWin ? '\\' : '/').replace(isWin ? win32Reg : posixReg, '')

export const join = createJoin(typeof process !== 'undefined' && process?.platform === 'win32')

export const posixJoin = createJoin(false)
export const win32Join = createJoin(true)

export default join
