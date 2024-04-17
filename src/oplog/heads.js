/**
 * @namespace module:Log~Heads
 * @memberof module:Log
 * @description The log's heads.
 * @private
 */
import Entry from './entry.js'
import MemoryStorage from '../storage/memory.js'

const DefaultStorage = MemoryStorage

const Heads = async ({ storage, heads, entryStorage }) => {
  storage = storage || await DefaultStorage()

  const put = async (heads) => {
    heads = findHeads(heads)
    const headHashes = heads.map(e => e.hash)
    await storage.put('heads', JSON.stringify(headHashes))
  }

  const add = async (head) => {
    const currentHeads = await all()
    if (currentHeads.find(e => Entry.isEqual(e, head))) {
      return
    }
    const newHeads = findHeads([...currentHeads, head])
    await put(newHeads)

    return newHeads
  }

  const remove = async (hash) => {
    const currentHeads = await all()
    const newHeads = currentHeads.filter(e => e.hash !== hash)
    await put(newHeads)
  }

  const iterator = async function * () {
    const e = await storage.get('heads')
    const headHashes = e ? JSON.parse(e) : []
    for (const hash of headHashes) {
      const entry = await entryStorage.get(hash)
      if (entry) {
        const head = await Entry.decode(entry)
        yield head
      }
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
  if (heads) {
    await put(heads)
  }

  // Migrate from 2.4.3 -> 2.5.0
  const migrate1 = async () => {
    const it_ = storage.iterator()
    const values = []
    for await (const [hash] of it_) {
      if (hash !== 'heads') {
        values.push(hash)
      }
    }
    if (values.length > 0) {
      console.log('Migrate pre v2.5.0 heads database')
      console.log('Heads:', values)
      await storage.clear()
      await storage.put('heads', JSON.stringify(values))
    }
  }

  await migrate1()

  return {
    put,
    set: put,
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
