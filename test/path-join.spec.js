import { equal } from 'assert'
import Path from 'path'
import { join, posixJoin, win32Join } from '../src/utils/path-join.js'

const platform = process.platform

const createTestData = s => [
	[s],
  [s, 'test'],
  ['test'],
  ['test', s],
  [`test${s}`, s],
  [s, `${s}test`],
  [`test${s}`, s, `${s}${s}`, `${s}a`],
  [`test${s}`, '.', `${s}a`],
  [`test${s}.${s}a`],
  ['test', s, '.', s]
]

const posixTestData = createTestData('/')
const win32TestData = createTestData('\\')

describe('Path posix join', () => {
  it('gives the same results as Path using posix join on posix paths', () => {
    for (const data of posixTestData) {
      equal(Path.posix.join(...data), posixJoin(...data))
    }
  })

  it('gives the same results as Path using posix join on win32 paths', () => {
    for (const data of win32TestData) {
      equal(Path.posix.join(...data), posixJoin(...data))
    }
  })
})

describe('Path win32 join', () => {
  it('gives the same results as Path using win32 join on posix paths', () => {
    for (const data of posixTestData) {
      equal(Path.win32.join(...data), win32Join(...data))
    }
  })

  it('gives the same results as Path using win32 join on win32 paths', () => {
    for (const data of win32TestData) {
      equal(Path.win32.join(...data), win32Join(...data))
    }
  })
})

describe('Path join on win32', () => {
  let join;

  before(async () => {
    Object.defineProperty(process, 'platform', { value: 'win32', writable: true })
    join = (await import('../src/utils/path-join.js?win32')).join
  });

  after(() => {
    Object.defineProperty(process, 'platform', { value: platform, writable: false })
  });

  it('gives the same results as Path using posix paths', () => {
    for (const data of posixTestData) {
      equal(Path.win32.join(...data), join(...data))
    }
  })

  it('gives the same results as Path using win32 paths', () => {
    for (const data of win32TestData) {
      equal(Path.win32.join(...data), join(...data))
    }
  })
})

describe('Path join on posix', () => {
  let join;

  before(async () => {
    Object.defineProperty(process, 'platform', { value: 'linux', writable: true })
    join = (await import('../src/utils/path-join.js?linux')).join
  });

  after(() => {
    Object.defineProperty(process, 'platform', { value: platform, writable: false })
  });

  it('gives the same results as Path using posix paths', () => {
    for (const data of posixTestData) {
      equal(Path.posix.join(...data), join(...data))
    }
  })

  it('gives the same results as Path using win32 paths', () => {
    for (const data of win32TestData) {
      equal(Path.posix.join(...data), join(...data))
    }
  })
})
