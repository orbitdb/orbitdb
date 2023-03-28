import { equal } from 'assert'
import Path from 'path'
import { join, posixJoin, win32Join } from '../src/utils/path-join.js'

const createTestData = s => [
  [],
  [''],
  [s],
  [s, 'test'],
  ['test'],
  ['test', s],
  [`test${s}`, s],
  [s, `${s}test`],
  [`test${s}`, s, `${s}${s}`, `${s}a`],
  [`test${s}`, '.', `${s}a`],
  [`test${s}.${s}a`],
  ['test', s, '.', s],
  ['/test', '\\', 'mixed'],
  ['\\test', '/', 'mixed'],
  ['test', '/', 'mixed', '\\', 'data'],
  ['test', '\\', 'mixed', '/', 'data']
]

const posixTestData = createTestData('/')
const win32TestData = createTestData('\\')

;(Path.posix != null ? describe : describe.skip)('Path posix join', () => {
  it('gives the same results as \'path\' using posix join on posix paths', () => {
    for (const data of posixTestData) {
      equal(Path.posix.join(...data), posixJoin(...data))
    }
  })

  it('gives the same results as \'path\' using posix join on win32 paths', () => {
    for (const data of win32TestData) {
      equal(Path.posix.join(...data), posixJoin(...data))
    }
  })
})

;(Path.win32 != null ? describe : describe.skip)('Path win32 join', () => {
  it('gives the same results as \'path\' using win32 join on posix paths', () => {
    for (const data of posixTestData) {
      equal(Path.win32.join(...data), win32Join(...data))
    }
  })

  it('gives the same results as \'path\' using win32 join on win32 paths', () => {
    for (const data of win32TestData) {
      equal(Path.win32.join(...data), win32Join(...data))
    }
  })
})

describe('Path join', () => {
  it('gives the same results as \'path\' using join on posix paths', () => {
    for (const data of posixTestData) {
      equal(Path.join(...data), join(...data))
    }
  })

  it('gives the same results as \'path\' using join on win32 paths', () => {
    for (const data of win32TestData) {
      equal(Path.join(...data), join(...data))
    }
  })
})
