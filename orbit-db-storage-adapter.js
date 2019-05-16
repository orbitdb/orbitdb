const levelup = require('levelup')
const mkdirp = require('mkdirp')

// Should work for all abstract-leveldown compliant stores

const Storage = (mkdir) => {
  return {
    create: (storage, directory = './orbitdb') => {
      // If we're in Node.js, mkdir module is expected to passed
      // and we need to make sure the directory exists
      if (mkdir) { // TODO: What is mkdir.c??
        mkdir.sync(directory)
      }

      return new Promise((resolve, reject) => {
        const db = storage(directory)
        db.status = "unknown"
        const store = levelup(db)
        store.open((err) => {
          if (err) {
            return reject(err)
          }
          db.status = "open"
          resolve(store)
        })
      })
    },
    destroy: () => {
      return new Promise((resolve, reject) => {
        xxleveldown.destroy(directory, (err) => {
          if (err) {
            return reject(err)
          }
          resolve()
        })
      })
    },
  }
}

module.exports = Storage(mkdirp)
