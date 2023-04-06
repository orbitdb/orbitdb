import { KeyValue } from './index.js'
import LevelStorage from '../storage/level.js'
import pathJoin from '../utils/path-join.js'

const valueEncoding = 'json'

const KeyValueIndexed = ({ storage } = {}) => async ({ ipfs, identity, address, name, access, directory, meta, headsStorage, entryStorage, indexStorage, referencesCount, syncAutomatically, onUpdate }) => {
  const indexDirectory = pathJoin(directory || './orbitdb', `./${address}/_index/`)
  const index = storage || await LevelStorage({ path: indexDirectory, valueEncoding })

  let latestOplogHash

  const _updateIndex = async (log, entry) => {
    const keys = {}
    const it = await log.iterator({ gt: latestOplogHash })

    for await (const entry of it) {
      const { op, key, value } = entry.payload

      if (op === 'PUT' && !keys[key]) {
        keys[key] = true
        await index.put(key, value)
      } else if (op === 'DEL' && !keys[key]) {
        keys[key] = true
        await index.del(key)
      }
    }

    latestOplogHash = entry ? entry.hash : null
  }

  // Create the underlying KeyValue database
  const keyValueStore = await KeyValue()({ ipfs, identity, address, name, access, directory, meta, headsStorage, entryStorage, indexStorage, referencesCount, syncAutomatically, onUpdate: _updateIndex })

  // Compute the index
  await _updateIndex(keyValueStore.log)

  const get = async (key) => {
    const value = await index.get(key)
    if (value) {
      return value
    }
    return keyValueStore.get(key)
  }

  const iterator = async function * ({ amount } = {}) {
    const it = keyValueStore.iterator({ amount })
    for await (const { key, value, hash } of it) {
      yield { key, value, hash }
    }
  }

  const close = async () => {
    await index.close()
    await keyValueStore.close()
  }

  const drop = async () => {
    await index.clear()
    await keyValueStore.drop()
  }

  return {
    ...keyValueStore,
    get,
    iterator,
    close,
    drop
  }
}

export default KeyValueIndexed
