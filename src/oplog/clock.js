/**
 * @namespace module:Log~Clock
 * @memberof module:Log
 * @description
 * The lamport clock.
 * @private
 */

/**
 * Compares two clocks by time and then, time is the same, by id.
 *
 * compareClocks should never return zero (0). If it does, a and b refer to the
 * same clock.
 * @param {module:Clock} a The first clock.
 * @param {module:Clock} b The second clock.
 * @return {number} Returns a negative integer if clock a is less than clock b
 * otherwise a positive integer is returned.
 * @memberof module:Log~Clock
 */
const compareClocks = (a, b) => {
  // Calculate the "distance" based on the clock, ie. lower or greater
  const dist = a.time - b.time

  // If the sequence number is the same (concurrent events),
  // and the IDs are different, take the one with a "lower" id
  if (dist === 0 && a.id !== b.id) return a.id < b.id ? -1 : 1

  return dist
}

/**
 * Advances a clock's time by 1, returning a new instance of Clock.
 * @param {module:Clock} clock The clock to advance.
 * @return {module:Clock} A new instance of clock with time advanced by 1.
 * @memberof module:Log~Clock
 */
const tickClock = (clock) => {
  return Clock(clock.id, ++clock.time)
}

/**
 * Creates an instance of Clock.
 * @function
 * @param {string} id A unique identifier.
 * @param {number} [time=0] A natural number (including 0).
 * @memberof module:Log~Clock
 * @instance
 */
const Clock = (id, time) => {
  time = time || 0

  return {
    id,
    time
  }
}

export { Clock as default, compareClocks, tickClock }
