/**
 * @namespace Storage-Level
 * @memberof module:Storage
 * @description
 * LevelStorage stores data to a Level-compatible database.
 *
 * To learn more about Level, see {@link https://github.com/Level/level}.
 */
import { Level } from 'level'

const defaultPath = './level'
const defaultValueEncoding = 'view'

/**
 * Creates an instance of LevelStorage.
 * @function
 * @param {Object} [params={}] One or more parameters for configuring
 * LevelStorage.
 * @param {string} [params.path=defaultPath] The Level path.
 * @param {string} [params.valueEncoding=defaultValueEncoding] Value encoding.
 * @return {module:Storage.Storage-Level} An instance of LevelStorage.
 * @memberof module:Storage
 * @instance
 */
const LevelStorage = async ({ path, valueEncoding } = {}) => {
  path = path || defaultPath
  valueEncoding = valueEncoding || defaultValueEncoding

  const db = new Level(path, { valueEncoding, passive: true })
  await db.open()

  /**
   * Puts data to Level.
   * @function
   * @param {string} hash The hash of the data to put.
   * @param {*} data The data to store.
   * @memberof module:Storage.Storage-Level
   * @instance
   */
  const put = async (hash, value) => {
    await db.put(hash, value)
  }

  /**
   * Deletes data from Level.
   * @function
   * @param {string} hash The hash of the data to delete.
   * @param {*} data The data to store.
   * @memberof module:Storage.Storage-Level
   * @instance
   */
  const del = async (hash) => {
    await db.del(hash)
  }

  /**
   * Gets data from Level.
   * @function
   * @param {string} hash The hash of the data to get.
   * @memberof module:Storage.Storage-Level
   * @instance
   */
  const get = async (hash) => {
    try {
      const value = await db.get(hash)
      if (value) {
        return value
      }
    } catch (e) {
      // LEVEL_NOT_FOUND (ie. key not found)
    }
  }

  /**
   * Iterates over records stored in Level.
   * @function
   * @yields [string, string] The next key/value pair from Level.
   * @memberof module:Storage.Storage-Level
   * @instance
   */
  const iterator = async function * () {
    for await (const [key, value] of db.iterator()) {
      yield [key, value]
    }
  }
  const merge = async (other) => {}

  /**
  * Clears the contents of the Level db.
  * @function
  * @memberof module:Storage.Storage-Level
  * @instance
  */
  const clear = async () => {
    await db.clear()
  }

  /**
  * Closes the Level db.
  * @function
  * @memberof module:Storage.Storage-Level
  * @instance
  */
  const close = async () => {
    await db.close()
  }

  return {
    put,
    del,
    get,
    iterator,
    merge,
    clear,
    close
  }
}

export default LevelStorage
