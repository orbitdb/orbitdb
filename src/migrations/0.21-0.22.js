const path = require('path')
const fs = require('../fs-shim')

const Cache = require('orbit-db-cache')

const Logger = require('logplease')
const logger = Logger.create('orbit-db')
Logger.setLogLevel('ERROR')

async function migrate (OrbitDB, options, dbAddress) {
  let oldCache = OrbitDB.caches[options.directory] ? OrbitDB.caches[options.directory].cache : null
  let oldStore

  if (!oldCache) {
    const addr = (path.posix || path).join(OrbitDB.directory, dbAddress.root, dbAddress.path)
    if (fs && fs.existsSync && !fs.existsSync(addr)) return
    oldStore = await OrbitDB.storage.createStore(addr)
    oldCache = new Cache(oldStore)
  }
  const _localHeads = await oldCache.get('_localHeads')
  if (!_localHeads) return

  const keyRoot = dbAddress.toString()
  logger.debug('Attempting to migrate from old cache location')
  const migrationKeys = [
    '_remoteHeads',
    '_localHeads',
    'snapshot',
    'queue'
  ]

  for (const i in migrationKeys) {
    try {
      const key = path.join(keyRoot, migrationKeys[i])
      const val = await oldCache.get(migrationKeys[i])
      if (val) await options.cache.set(key, val)
    } catch (e) {
      logger.debug(e.message)
    }
  }
  await options.cache.set(path.join(keyRoot, '_manifest'), dbAddress.root)
  if (oldStore) await oldStore.close()
}

module.exports = migrate
