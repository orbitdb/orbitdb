/** @module AccessControllers */
import IPFSAccessController from './ipfs.js'
import OrbitDBAccessController from './orbitdb.js'

const types = {
  ipfs: IPFSAccessController,
  orbitdb: OrbitDBAccessController
}

const get = (type) => {
  if (!isSupported(type)) {
    throw new Error(`AccessController type '${type}' is not supported`)
  }
  return types[type]
}

const isSupported = type => {
  return Object.keys(types).includes(type)
}

const add = (accessController) => {
  if (types[accessController.type]) {
    throw new Error(`Access controller '${accessController.type}' already added.`)
  }

  if (!accessController.type) {
    throw new Error('Given AccessController class needs to implement: type.')
  }

  types[accessController.type] = accessController
}

const remove = type => {
  delete types[type]
}

export {
  types,
  get,
  isSupported,
  add,
  remove
}
