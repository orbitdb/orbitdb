import Clock, { tickClock, compareClocks } from '../../src/oplog/clock.js'
import { strictEqual } from 'assert'

describe('Clock', () => {
  it('creates a new clock', () => {
    const id = 'A'
    const time = 0
    const clock = Clock(id, time)
    strictEqual(clock.id, id)
    strictEqual(clock.time, time)
  })

  it('creates a new clock with default time', () => {
    const id = 'A'
    const time = 0
    const clock = Clock(id)
    strictEqual(clock.id, id)
    strictEqual(clock.time, time)
  })

  it('creates a new clock with time starting at 1', () => {
    const id = 'A'
    const time = 1
    const clock = Clock(id, time)
    strictEqual(clock.id, id)
    strictEqual(clock.time, time)
  })

  it('advances clock forward 1 tick', () => {
    const id = 'A'
    const time = 1
    const clock = tickClock(Clock(id))
    strictEqual(clock.time, time)
  })

  it('advances clock forward 2 ticks', () => {
    const id = 'A'
    const time = 2
    const clock = tickClock(tickClock(Clock(id)))
    strictEqual(clock.time, time)
  })

  describe('Compare clocks', () => {
    it('compares clocks when clock1\'s time is 1 less than clock2\'s', () => {
      const id1 = 'A'
      const time1 = 1
      const clock1 = Clock(id1, time1)
      const id2 = 'B'
      const time2 = 2
      const clock2 = Clock(id2, time2)

      const expected = -1

      strictEqual(compareClocks(clock1, clock2), expected)
    })
    it('compares clocks when clock1\'s time is 3 less than clock2\'s', () => {
      const id1 = 'A'
      const time1 = 1
      const clock1 = Clock(id1, time1)
      const id2 = 'B'
      const time2 = 4
      const clock2 = Clock(id2, time2)

      const expected = -3

      strictEqual(compareClocks(clock1, clock2), expected)
    })

    it('compares clocks when clock1\'s time is 1 more than clock2\'s', () => {
      const id1 = 'A'
      const time1 = 2
      const clock1 = Clock(id1, time1)
      const id2 = 'B'
      const time2 = 1
      const clock2 = Clock(id2, time2)

      const expected = 1

      strictEqual(compareClocks(clock1, clock2), expected)
    })

    it('compares clocks when clock1\'s time is 3 more than clock2\'s', () => {
      const id1 = 'A'
      const time1 = 4
      const clock1 = Clock(id1, time1)
      const id2 = 'B'
      const time2 = 1
      const clock2 = Clock(id2, time2)

      const expected = 3

      strictEqual(compareClocks(clock1, clock2), expected)
    })

    it('compares clocks when clock1\'s id is less than clock2\'s', () => {
      const id1 = 'A'
      const time1 = 1
      const clock1 = Clock(id1, time1)
      const id2 = 'B'
      const time2 = 1
      const clock2 = Clock(id2, time2)

      const expected = -1

      strictEqual(compareClocks(clock1, clock2), expected)
    })

    it('compares clocks when clock1\'s id is more than clock2\'s', () => {
      const id1 = 'B'
      const time1 = 1
      const clock1 = Clock(id1, time1)
      const id2 = 'A'
      const time2 = 1
      const clock2 = Clock(id2, time2)

      const expected = 1

      strictEqual(compareClocks(clock1, clock2), expected)
    })

    it('compares clocks when clock1 is the same as clock2', () => {
      const id = 'A'
      const time = 1
      const clock1 = Clock(id, time)
      const clock2 = Clock(id, time)

      const expected = 0

      strictEqual(compareClocks(clock1, clock2), expected)
    })
  })
})
