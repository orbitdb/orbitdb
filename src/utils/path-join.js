const s = process?.platform === 'win32' ? '\\' : '/'
const reg = new RegExp(`((?<=\\${s})\\${s}+)|(^\\.\\${s})|((?<=\\${s})\\.\\${s})`, 'g')

export default (...paths) => paths.join(s).replace(reg, '')
