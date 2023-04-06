import LRU from 'lru'
import Entry from './entry.js'
import Clock from './clock.js'
import Heads from './heads.js'
import ConflictResolution from './conflict-resolution.js'
import MemoryStorage from '../storage/memory.js'
import pMap from 'p-map'

const { LastWriteWins, NoZeroes } = ConflictResolution

const randomId = () => new Date().getTime().toString()
const maxClockTimeReducer = (res, acc) => Math.max(res, acc.clock.time)

// Default storage for storing the Log and its entries. Default: Memory. Options: Memory, LRU, IPFS.
const DefaultStorage = MemoryStorage

// Default AccessController for the Log.
// Default policy is that anyone can write to the Log.
// Signature of an entry will always be verified regardless of AccessController policy.
// Any object that implements the function `canAppend()` that returns true|false can be
// used as an AccessController.
const DefaultAccessController = async () => {
  // An AccessController may do any async initialization stuff here...
  return {
    canAppend: async (entry) => true
  }
}

/**
 * @description
 * Log is a verifiable, append-only log CRDT.
 *
 * Implemented as a Merkle-CRDT as per the paper:
 * "Merkle-CRDTs: Merkle-DAGs meet CRDTs"
 * https://arxiv.org/abs/2004.00107
 */

/**
 * Create a new Log instance
 * @param {IPFS} ipfs An IPFS instance
 * @param {Object} identity Identity (https://github.com/orbitdb/orbit-db-identity-provider/blob/master/src/identity.js)
 * @param {Object} options
 * @param {string} options.logId ID of the log
 * @param {Object} options.access AccessController (./default-access-controller)
 * @param {Array<Entry>} options.entries An Array of Entries from which to create the log
 * @param {Array<Entry>} options.heads Set the heads of the log
 * @param {Clock} options.clock Set the clock of the log
 * @param {Function} options.sortFn The sort function - by default LastWriteWins
 * @return {Log} The log instance
 */
const Log = async (identity, { logId, logHeads, access, entryStorage, headsStorage, indexStorage, sortFn } = {}) => {
  if (identity == null) {
    throw new Error('Identity is required')
  }
  if (logHeads != null && !Array.isArray(logHeads)) {
    throw new Error('\'logHeads\' argument must be an array')
  }
  // Set Log's id
  const id = logId || randomId()
  // Access Controller
  access = access || await DefaultAccessController()
  // Oplog entry storage
  const _entries = entryStorage || await DefaultStorage()
  // Entry index for keeping track which entries are already in the log
  const _index = indexStorage || await DefaultStorage()
  // Heads storage
  headsStorage = headsStorage || await DefaultStorage()
  // Add heads to the state storage, ie. init the log state
  const _heads = await Heads({ storage: headsStorage, heads: logHeads })
  // Conflict-resolution sorting function
  sortFn = NoZeroes(sortFn || LastWriteWins)

  /**
   * Returns the clock of the log.
   * @returns {Clock}
   */
  const clock = async () => {
    // Find the latest clock from the heads
    const maxTime = Math.max(0, (await heads()).reduce(maxClockTimeReducer, 0))
    return new Clock(identity.publicKey, maxTime)
  }

  /**
   * Returns an array of entries
   * @returns {Array<Entry>}
   */
  const heads = async () => {
    const res = await _heads.all()
    return res.sort(sortFn).reverse()
  }

  /**
   * Returns the values in the log.
   * @returns {Promise<Array<Entry>>}
   */
  const values = async () => {
    const values = []
    for await (const entry of traverse()) {
      values.unshift(entry)
    }
    return values
  }

  /**
   * Retrieve an entry.
   * @param {string} [hash] The hash of the entry to retrieve
   * @returns {Promise<Entry|undefined>}
   */
  const get = async (hash) => {
    const bytes = await _entries.get(hash)
    if (bytes) {
      const entry = await Entry.decode(bytes)
      await _index.put(hash, true)
      return entry
    }
  }

  const has = async (hash) => {
    const entry = await _index.get(hash)
    return entry != null
  }

  /**
   * Append an new entry to the log.
   * @param {data} data Payload to add to the entry
   * @return {Promise<Entry>} Entry that was appended
   */
  const append = async (data, options = { referencesCount: 0 }) => {
    // 1. Prepare entry
    // 2. Authorize entry
    // 3. Store entry
    // 4. return Entry
    // Get current heads of the log
    const heads_ = await heads()
    // Get references (we skip the heads which are covered by the next field)
    let refs = []
    for await (const { hash } of iterator({ amount: options.referencesCount + heads_.length })) {
      refs.push(hash)
    }
    refs = refs.slice(heads_.length, options.referencesCount + heads_.length)
    // Create the next pointers from heads
    const nexts = heads_.map(entry => entry.hash)
    // Create the entry
    const entry = await Entry.create(
      identity,
      id,
      data,
      (await clock()).tick(),
      nexts,
      refs
    )
    // Authorize the entry
    const canAppend = await access.canAppend(entry)
    if (!canAppend) {
      throw new Error(`Could not append entry:\nKey "${identity.hash}" is not allowed to write to the log`)
    }

    // The appended entry is now the latest head
    await _heads.set([entry])
    // Add entry to the entry storage
    await _entries.put(entry.hash, entry.bytes)
    // Add entry to the entry index
    await _index.put(entry.hash, true)
    // Return the appended entry
    return entry
  }

  /**
   * Join two logs.
   *
   * Joins another log into this one.
   *
   * @param {Log} log Log to join with this Log
   * @returns {Promise<Log>} This Log instance
   * @example
   * await log1.join(log2)
   */
  const join = async (log) => {
    if (!log) {
      throw new Error('Log instance not defined')
    }
    if (!isLog(log)) {
      throw new Error('Given argument is not an instance of Log')
    }
    const heads = await log.heads()
    for (const entry of heads) {
      await joinEntry(entry)
    }
    if (_entries.merge) {
      await _entries.merge(log.storage)
    }
  }

  /**
   * Join an entry into a log.
   *
   * @param {Entry} entry Entry to join with this Log
   * @returns {Promise<Log>} This Log instance
   * @example
   * await log.join(entry)
   */
  const joinEntry = async (entry) => {
    const { hash } = entry
    // Check if the entry is already in the log and return early if it is
    const isAlreadyInTheLog = await has(hash)
    if (isAlreadyInTheLog) {
      return false
    } else {
      // Check that the entry is not an entry that hasn't been indexed
      const it = traverse(await heads(), (e) => e.next.includes(hash) || entry.next.includes(e.hash))
      for await (const e of it) {
        if (e.next.includes(hash)) {
          await _index.put(hash, true)
          return false
        }
      }
    }
    // Check that the Entry belongs to this Log
    if (entry.id !== id) {
      throw new Error(`Entry's id (${entry.id}) doesn't match the log's id (${id}).`)
    }
    // Verify if entry is allowed to be added to the log
    const canAppend = await access.canAppend(entry)
    if (!canAppend) {
      throw new Error(`Could not append entry:\nKey "${entry.identity}" is not allowed to write to the log`)
    }
    // Verify signature for the entry
    const isValid = await Entry.verify(identity, entry)
    if (!isValid) {
      throw new Error(`Could not validate signature for entry "${hash}"`)
    }

    // Add the new entry to heads (union with current heads)
    const newHeads = await _heads.add(entry)

    if (!newHeads) {
      return false
    }

    // Add the new entry to the entry storage
    await _entries.put(hash, entry.bytes)
    // Add the new entry to the entry index
    await _index.put(hash, true)
    // We've added the entry to the log
    return true
  }

  /**
   * TODO
   */
  const traverse = async function * (rootEntries, shouldStopFn) {
    // By default, we don't stop traversal and traverse
    // until the end of the log
    const defaultStopFn = () => false
    shouldStopFn = shouldStopFn || defaultStopFn
    // Start traversal from given entries or from current heads
    rootEntries = rootEntries || (await heads())
    // Sort the given given root entries and use as the starting stack
    let stack = rootEntries.sort(sortFn)
    // Keep a record of all the hashes of entries we've traversed and yielded
    const traversed = {}
    // Keep a record of all the hashes we are fetching or have already fetched
    let toFetch = []
    const fetched = {}
    // A function to check if we've seen a hash
    const notIndexed = (hash) => !(traversed[hash] || fetched[hash])
    // Current entry during traversal
    let entry
    // Start traversal and process stack until it's empty (traversed the full log)
    while (stack.length > 0) {
      stack = stack.sort(sortFn)
      // Get the next entry from the stack
      entry = stack.pop()
      if (entry) {
        const { hash, next, refs } = entry
        // If we have an entry that we haven't traversed yet, process it
        if (!traversed[hash]) {
          // Yield the current entry
          yield entry
          // If we should stop traversing, stop here
          const done = await shouldStopFn(entry)
          if (done === true) {
            break
          }
          // Add to the hash indices
          traversed[hash] = true
          fetched[hash] = true
          // Add the next and refs hashes to the list of hashes to fetch next,
          // filter out traversed and fetched hashes
          toFetch = [...toFetch, ...next, ...refs].filter(notIndexed)
          // Function to fetch an entry and making sure it's not a duplicate (check the hash indices)
          const fetchEntries = async (hash) => {
            if (!traversed[hash] && !fetched[hash]) {
              fetched[hash] = true
              return get(hash)
            }
          }
          // Fetch the next/reference entries
          const nexts = await pMap(toFetch, fetchEntries)
          // Add the next and refs fields from the fetched entries to the next round
          toFetch = nexts
            .filter(e => e != null)
            .reduce((res, acc) => [...res, ...acc.next, ...acc.refs], [])
            .filter(notIndexed)
          // Add the fetched entries to the stack to be processed
          stack = [...nexts, ...stack]
        }
      }
    }
  }

  /*
   * Async iterator over the log entries
   *
   * @param {Object} options
   * @param {amount} options.amount Number of entried to return
   * @param {string|Array} options.gt Beginning hash of the iterator, non-inclusive
   * @param {string|Array} options.gte Beginning hash of the iterator, inclusive
   * @param {string|Array} options.lt Ending hash of the iterator, non-inclusive
   * @param {string|Array} options.lte Ending hash of the iterator, inclusive
   * @returns {Symbol.asyncIterator} Iterator object of log entries
   *
   * @examples
   *
   * (async () => {
   *   log = await Log(testIdentity, { logId: 'X' })
   *
   *   for (let i = 0; i <= 100; i++) {
   *     await log.append('entry' + i)
   *   }
   *
   *   let it = log.iterator({
   *     lte: 'zdpuApFd5XAPkCTmSx7qWQmQzvtdJPtx2K5p9to6ytCS79bfk',
   *     amount: 10
   *   })
   *
   *   for await (let entry of it) {
   *     console.log(entry.payload) // 'entry100', 'entry99', ..., 'entry91'
   *   }
   * })()
   *
   *
   */
  const iterator = async function * ({ amount = -1, gt, gte, lt, lte } = {}) {
    // TODO: write comments on how the iterator algorithm works

    if (amount === 0) {
      return
    }

    if (typeof lte === 'string') {
      lte = [await get(lte)]
    }

    if (typeof lt === 'string') {
      const entry = await get(lt)
      const nexts = await Promise.all(entry.next.map(n => get(n)))
      lt = nexts
    }

    if (lt != null && !Array.isArray(lt)) throw new Error('lt must be a string or an array of Entries')
    if (lte != null && !Array.isArray(lte)) throw new Error('lte must be a string or an array of Entries')

    const start = (lt || (lte || await heads())).filter(i => i != null)
    const end = (gt || gte) ? await get(gt || gte) : null

    const amountToIterate = (end || amount === -1) ? -1 : amount

    let count = 0
    const shouldStopTraversal = async (entry) => {
      count++
      if (!entry) {
        return false
      }
      if (count >= amountToIterate && amountToIterate !== -1) {
        return true
      }
      if (end && Entry.isEqual(entry, end)) {
        return true
      }
      return false
    }

    const useBuffer = end && amount !== -1 && !lt && !lte
    const buffer = useBuffer ? new LRU(amount + 2) : null
    let index = 0

    const it = traverse(start, shouldStopTraversal)

    for await (const entry of it) {
      const skipFirst = (lt && Entry.isEqual(entry, start))
      const skipLast = (gt && Entry.isEqual(entry, end))
      const skip = skipFirst || skipLast
      if (!skip) {
        if (useBuffer) {
          buffer.set(index++, entry.hash)
        } else {
          yield entry
        }
      }
    }

    if (useBuffer) {
      const endIndex = buffer.keys.length
      const startIndex = endIndex - amount
      const keys = buffer.keys.slice(startIndex, endIndex)
      for (const key of keys) {
        const hash = buffer.get(key)
        const entry = await get(hash)
        yield entry
      }
    }
  }

  const clear = async () => {
    await _index.clear()
    await _heads.clear()
    await _entries.clear()
  }

  const close = async () => {
    await _index.close()
    await _heads.close()
    await _entries.close()
  }

  /**
   * Check if an object is a Log.
   * @param {Log} obj
   * @returns {boolean}
   */
  const isLog = (obj) => {
    return obj && obj.id !== undefined &&
      obj.clock !== undefined &&
      obj.heads !== undefined &&
      obj.values !== undefined &&
      obj.access !== undefined &&
      obj.identity !== undefined &&
      obj.storage !== undefined
  }

  return {
    id,
    clock,
    heads,
    values,
    all: values, // Alias for values()
    get,
    has,
    append,
    join,
    joinEntry,
    traverse,
    iterator,
    clear,
    close,
    access,
    identity,
    storage: _entries
  }
}

export { Log as default, DefaultAccessController, Clock }
