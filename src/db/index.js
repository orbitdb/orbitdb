import Documents from './documents.js'
import Events from './events.js'
import KeyValue from './keyvalue.js'
import KeyValueIndexed from './keyvalue-indexed.js'

/**
 * An array of available database types.
 * @name databaseTypes
 * @†ype []
 * @return [] An array of database types.
 * @memberof module:OrbitDB
 */
const databaseTypes = {
  events: Events,
  documents: Documents,
  keyvalue: KeyValue,
  keyvalueindexed: KeyValueIndexed
}

/**
 * Add a new database type.
 * @example
 * import { addDatabaseType } from 'orbit-db'
 * const CustomDBTypeModule = async (params) => {
 *   const database = await Database(...params)
 *   ...
 * }
 * addDatabaseType('customDBType', CustomDBTypeModule)
 * @function addDatabaseType
 * @param {string} type The database type.
 * @param {module:Database} store A Database-compatible module.
 * @memberof module:OrbitDB
 */
const addDatabaseType = (type, store) => {
  if (databaseTypes[type]) {
    throw new Error(`Type already exists: ${type}`)
  }
  databaseTypes[type] = store
}

const getDatabaseType = (type) => {
  if (!type) {
    throw new Error('Type not specified')
  }

  if (!databaseTypes[type]) {
    throw new Error(`Unsupported database type: '${type}'`)
  }

  return databaseTypes[type]
}

export { addDatabaseType, getDatabaseType }
