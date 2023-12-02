/**
 * @namespace module:Log~Heads
 * @memberof module:Log
 * @description The log's heads.
 * @private
 */
import Entry from './entry.js'
import MemoryStorage from '../storage/memory.js'

const DefaultStorage = MemoryStorage

const Heads = async ({ storage, heads }) => {
  storage = storage || await DefaultStorage()

  const put = async (heads) => {
    heads = findHeads(heads)
    for (const head of heads) {
      await storage.put(head.hash, head.bytes)
    }
  }

  const set = async (heads) => {
    await storage.clear()
    await put(heads)
  }

  const add = async (head) => {
    const currentHeads = await all()
    if (currentHeads.find(e => Entry.isEqual(e, head))) {
      return
    }
    const newHeads = findHeads([...currentHeads, head])
    await set(newHeads)

    return newHeads
  }

  const remove = async (hash) => {
    const currentHeads = await all()
    const newHeads = currentHeads.filter(e => e.hash !== hash)
    await set(newHeads)
  }

  const iterator = async function * () {
    const it = storage.iterator()
    for await (const [, bytes] of it) {
      const head = await Entry.decode(bytes)
      yield head
    }
  }

  const all = async () => {
    const values = []
    for await (const head of iterator()) {
      values.push(head)
    }
    return values
  }

  const clear = async () => {
    await storage.clear()
  }

  const close = async () => {
    await storage.close()
  }

  // Initialize the heads if given as parameter
  await put(heads || [])

  return {
    put,
    set,
    add,
    remove,
    iterator,
    all,
    clear,
    close
  }
}

/**
 * Find heads from a collection of entries.
 *
 * Finds entries that are the heads of this collection,
 * ie. entries that are not referenced by other entries.
 *
 * This function is private and not exposed in the Log API
 *
 * @param {Array<Entry>} entries Entries to search heads from
 * @return {Array<Entry>}
 * @private
 */
const findHeads = (entries) => {
  entries = new Set(entries)
  const items = {}
  for (const entry of entries) {
    for (const next of entry.next) {
      items[next] = entry.hash
    }
  }

  const res = []
  for (const entry of entries) {
    if (!items[entry.hash]) {
      res.push(entry)
    }
  }

  return res
}

export default Heads
