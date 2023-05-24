/* Lamport Clock */
const compareClocks = (a, b) => {
  // Calculate the "distance" based on the clock, ie. lower or greater
  const dist = a.time - b.time

  // If the sequence number is the same (concurrent events),
  // and the IDs are different, take the one with a "lower" id
  if (dist === 0 && a.id !== b.id) return a.id < b.id ? -1 : 1

  return dist
}

const tickClock = (clock) => {
  return Clock(clock.id, ++clock.time)
}

const Clock = (id, time) => {
  time = time || 0

  return {
    id,
    time
  }
}

export { Clock as default, compareClocks, tickClock }
