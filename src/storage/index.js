/**
 * @module Storage
 * @description
 * Storage backends for OrbitDB.
 */
export { default as ComposedStorage } from './composed.js'
export { default as IPFSBlockStorage } from './ipfs-block.js'
export { default as LevelStorage } from './level.js'
export { default as LRUStorage } from './lru.js'
export { default as MemoryStorage } from './memory.js'
