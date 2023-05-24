import { strictEqual, deepStrictEqual } from 'assert'
import Clock from '../../src/oplog/clock.js'
import ConflictResolution from '../../src/oplog/conflict-resolution.js'

describe('ConflictResolution', () => {
  describe('NoZeroes', () => {
    it('passed function cannot return 0', () => {
      let err
      const func = (a, b) => { return 0 }
      const sortFn = ConflictResolution.NoZeroes(func)
      const expected = 'Error: Your log\'s tiebreaker function, func, has returned zero and therefore cannot be'

      const record1 = 1
      const record2 = 2

      try {
        sortFn(record1, record2)
      } catch (e) {
        err = e.toString()
      }

      strictEqual(err, expected)
    })
  })

  describe('SortByClockId', () => {
    let fallbackFn
    before(() => {
      fallbackFn = (a, b) => a
    })

    it('returns -1 when first clock\'s id is less than second clock\'s', () => {
      const expected = -1
      const record1 = { clock: Clock('A') }
      const record2 = { clock: Clock('B') }
      strictEqual(ConflictResolution.SortByClockId(record1, record2, fallbackFn), expected)
    })

    it('returns 1 when first clock\'s id is greater than second clock\'s', () => {
      const expected = 1
      const record1 = { clock: Clock('B') }
      const record2 = { clock: Clock('A') }
      strictEqual(ConflictResolution.SortByClockId(record1, record2, fallbackFn), expected)
    })

    it('returns the clock when clocks have the same id', () => {
      const expected = { clock: Clock('A') }
      const record1 = { clock: Clock('A') }
      const record2 = { clock: Clock('A') }
      deepStrictEqual(ConflictResolution.SortByClockId(record1, record2, fallbackFn), expected)
    })
  })

  describe('SortByClocks', () => {
    let fallbackFn
    before(() => {
      fallbackFn = (a, b) => a
    })

    it('returns -1 when a\'s time is less than b\'s', () => {
      const expected = -1
      const record1 = { clock: Clock('A', 1) }
      const record2 = { clock: Clock('B', 2) }
      strictEqual(ConflictResolution.SortByClocks(record1, record2, fallbackFn), expected)
    })

    it('returns 1 when a\'s time is greater than b\'s', () => {
      const expected = 1
      const record1 = { clock: Clock('A', 2) }
      const record2 = { clock: Clock('B', 1) }
      strictEqual(ConflictResolution.SortByClocks(record1, record2, fallbackFn), expected)
    })

    it('returns -1 when a\'s time is equal to b\'s', () => {
      const expected = -1
      const record1 = { clock: Clock('A', 1) }
      const record2 = { clock: Clock('B', 1) }
      strictEqual(ConflictResolution.SortByClocks(record1, record2, fallbackFn), expected)
    })
  })

  describe('Last write wins', () => {
    it('returns -1 when a\'s time is less than b\'s', () => {
      const expected = -1
      const record1 = { clock: Clock('A', 1) }
      const record2 = { clock: Clock('B', 2) }
      strictEqual(ConflictResolution.LastWriteWins(record1, record2), expected)
    })

    it('returns 1 when a\'s time is greater than b\'s', () => {
      const expected = 1
      const record1 = { clock: Clock('A', 2) }
      const record2 = { clock: Clock('B', 1) }
      strictEqual(ConflictResolution.LastWriteWins(record1, record2), expected)
    })

    it('returns -1 when a\'s time is equal to b\'s', () => {
      const expected = -1
      const record1 = { clock: Clock('A', 1) }
      const record2 = { clock: Clock('B', 1) }
      strictEqual(ConflictResolution.LastWriteWins(record1, record2), expected)
    })

    it('returns the clock when a and b are the same', () => {
      const expected = { clock: Clock('A') }
      const record1 = { clock: Clock('A') }
      const record2 = { clock: Clock('A') }
      deepStrictEqual(ConflictResolution.LastWriteWins(record1, record2), expected)
    })
  })

  describe('ConflictResolution records', () => {
    it('sorts by clock time', () => {
      const expected = [
        { clock: Clock('A', 1) },
        { clock: Clock('B', 2) },
        { clock: Clock('C', 3) },
        { clock: Clock('D', 4) }
      ]

      const records = [
        { clock: Clock('C', 3) },
        { clock: Clock('A', 1) },
        { clock: Clock('D', 4) },
        { clock: Clock('B', 2) }
      ]

      deepStrictEqual(records.sort(ConflictResolution.LastWriteWins), expected)
    })

    it('sorts by clock time when id is the same', () => {
      const expected = [
        { clock: Clock('A', 1) },
        { clock: Clock('A', 2) },
        { clock: Clock('A', 3) },
        { clock: Clock('A', 4) }
      ]

      const records = [
        { clock: Clock('A', 3) },
        { clock: Clock('A', 1) },
        { clock: Clock('A', 4) },
        { clock: Clock('A', 2) }
      ]

      deepStrictEqual(records.sort(ConflictResolution.LastWriteWins), expected)
    })

    it('sorts by clock id', () => {
      const expected = [
        { clock: Clock('A') },
        { clock: Clock('B') },
        { clock: Clock('C') },
        { clock: Clock('D') }
      ]

      const records = [
        { clock: Clock('C') },
        { clock: Clock('A') },
        { clock: Clock('D') },
        { clock: Clock('B') }
      ]

      deepStrictEqual(records.sort(ConflictResolution.LastWriteWins), expected)
    })

    it('sorts the same clock', () => {
      const expected = [
        { clock: Clock('A') },
        { clock: Clock('A') },
        { clock: Clock('B') },
        { clock: Clock('B') }
      ]

      const records = [
        { clock: Clock('B') },
        { clock: Clock('A') },
        { clock: Clock('B') },
        { clock: Clock('A') }
      ]

      deepStrictEqual(records.sort(ConflictResolution.LastWriteWins), expected)
    })
  })
})
