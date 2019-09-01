const from021To022 = require('./0.21-0.22')

const migrations = [from021To022]

async function run (OrbitDB, options, dbAddress) {
  for (let i = 0; i < migrations.length; i++) {
    await migrations[i](OrbitDB, options, dbAddress)
  }
}

module.exports = { run }
