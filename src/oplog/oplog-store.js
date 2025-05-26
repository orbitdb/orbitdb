import Entry from './entry.js'
import Heads from './heads.js'
import MemoryStorage from '../storage/memory.js'

// Default storage for storing the Log and its entries. Default: Memory. Options: Memory, LRU, IPFS.
const DefaultStorage = MemoryStorage

const OplogStore = async ({ logHeads, entryStorage, headsStorage, indexStorage, encryption }) => {
  // Setup encryption and decryption functions
  const encryptEntryFn = encryption?.replication?.encrypt
  const decryptEntryFn = encryption?.replication?.decrypt
  const encryptPayloadFn = encryption?.data?.encrypt
  const decryptPayloadFn = encryption?.data?.decrypt
  // Oplog entry storage
  const _entries = entryStorage || await DefaultStorage()
  // Entry index for keeping track which entries are already in the log
  const _index = indexStorage || await DefaultStorage()
  // Heads storage
  headsStorage = headsStorage || await DefaultStorage()
  // Add heads to the state storage, ie. init the log state
  const _heads = await Heads({ storage: headsStorage, heads: logHeads, decryptPayloadFn, decryptEntryFn })

  const get = async (hash) => {
    const bytes = await _entries.get(hash)
    if (bytes) {
      const entry = await Entry.decode(bytes, decryptEntryFn, decryptPayloadFn)
      return entry
    }
  }

  const getBytes = async (hash) => {
    return _entries.get(hash)
  }

  const has = async (hash) => {
    const entry = await _index.get(hash)
    return entry != null
  }

  const heads = async () => {
    const heads_ = []
    for (const { hash } of await _heads.all()) {
      const head = await get(hash)
      heads_.push(head)
    }
    return heads_
  }

  const setHead = async (entry) => {
    const { hash, bytes } = await Entry.encode(entry, encryptEntryFn, encryptPayloadFn)
    // Add entry to the entry storage
    await _entries.put(hash, bytes)
    // Add entry to the entry index
    await _index.put(hash, true)
    // The appended entry is now the latest head
    await _heads.set([{ hash, next: entry.next }])

    return hash
  }

  const addHead = async (entry) => {
    /* 7. Add the new entry to heads (=union with current heads) */
    await _heads.add(entry)
    return entry.hash
  }

  const removeHeads = async (hashes) => {
    /* 5. Remove heads which new entries are connect to */
    for (const hash of hashes) {
      await _heads.remove(hash)
    }
  }

  const addVerified = async (hashes) => {
    /* 4. Add missing entries to the index (=to the log) */
    for (const hash of hashes) {
      await _index.put(hash, true)
      /* 5. Add new entry to entries (for pinning) */
      if (_entries.persist) {
        await _entries.persist(hash)
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

  return {
    get,
    getBytes,
    has,
    heads,
    setHead,
    addHead,
    removeHeads,
    addVerified,
    storage: _entries,
    clear,
    close
  }
}

export default OplogStore
