/**
 * @module Storage
 * @description
 * Various storage mechanisms with a common interface.
 *
 * ## Custom Storage
 * Custom storage modules can be created for special use cases. A storage
 * module must take the following form:
 * ```javascript
 * const CustomStorage = async (params) => { // drop params if not required
 *   const put = async (hash, data) => {
 *     // puts the hash and data to the underlying storage.
 *   }
 *
 *   const get = async (hash) => {
 *      // gets a record identified by hash from the underlying storage
 *   }
 *
 *   const del = async (hash) => {
 *     // deletes a record identified by hash from the underlying storage
 *   }
 *
 *   const iterator = async function * () {
 *     // iterates over the underlying storage's records
 *     // see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator
 *   }
 *
 *   const merge = async (other) => {
 *     // merges the records from two storages
 *   }
 *
 *   const clear = async () => {
 *     // clears all records from the underlying storage
 *   }
 *
 *   const close = async () => {
 *     // closes the underlying storage
 *   }
 *
 *   return {
 *     put,
 *     del,
 *     get,
 *     iterator,
 *     merge,
 *     clear,
 *     close
 *   }
 * }
 * ```
 * All functions must be defined but do not necessarily need to be implemented.
 * For example, if the storage does not require closing, the close function can
 * remain empty. For example:
 * ```JavaScript
 * const close = async () => {}
 * ```
 */
export { default as ComposedStorage } from './composed.js'
export { default as IPFSBlockStorage } from './ipfs-block.js'
export { default as LevelStorage } from './level.js'
export { default as LRUStorage } from './lru.js'
export { default as MemoryStorage } from './memory.js'
