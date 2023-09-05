/**
 * @module Databases
 * @description
 * Provides various database structures for storing data.
 */
import Documents from './documents.js'
import Events from './events.js'
import KeyValue from './keyvalue.js'
import KeyValueIndexed from './keyvalue-indexed.js'
/**

 * An array of available database types.
 * @name databaseTypes
 * @†ype []
 * @return [] An array of database types.
 * @memberof module:Databases
 */
const databaseTypes = {}

/**
 * Add a new database type.
 * @example
 * import { addDatabaseType } from 'orbitdb'
 * const CustomDBTypeModule = async (params) => {
 *   const database = await Database(...params)
 *   ...
 * }
 * addDatabaseType(CustomDBTypeModule)
 * @function addDatabaseType
 * @param {module:Databases} database A Database-compatible module.
 * @throws Database type does not contain required field \'type\'.
 * @throws Database type '${store.type}' already added.
 * @memberof module:Databases
 */
const addDatabaseType = (database) => {
  if (!database.type) {
    throw new Error('Database type does not contain required field \'type\'.')
  }
  
  if (databaseTypes[database.type]) {
    throw new Error(`Database type '${database.type}' already added.`)
  }
  
  databaseTypes[database.type] = database
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

addDatabaseType(Events)
addDatabaseType(Documents)
addDatabaseType(KeyValue)
addDatabaseType(KeyValueIndexed)

export { addDatabaseType, getDatabaseType, Documents, Events, KeyValue, KeyValueIndexed }
