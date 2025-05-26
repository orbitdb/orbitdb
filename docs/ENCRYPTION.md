# Encryption

OrbitDB features a modular architecture for database encryption. By passing a  module to an OrbitDB database, different encryption methods can be employed.

OrbitDB project currently maintains a [SimpleEncryption](https://github.com/orbitdb/simple-encryption) module that can be used to get started with encrypted databases.

**WARNING:** SimpleEncryption is an unaudited encryption module. Use at your own risk.

## How it works

OrbitDB encrypts databases in two layers: encrypting the payload and encrypting the log entry.

Log entry encryption encrypts each log entry fully. Payload encryption encrypts just the value.

This makes it possible to separate users of a database and replicators of a database, ie. an orbitdb peer can replicate a database without being able to decrypt the payloads (=data) of the database.

## Configuring encryption

You can configure OrbitDB to encrypt either the payload data being stored or the entire database.

To ***encrypt payload data only***, specify an encryption module and pass it to OtbiDB via the encryption object using the `data` property:

```
const data = await EncryptionModule()
const encryption = { data }
const db = await orbitdb.open(dbNameOrAddress, { encryption })
```

To ***encrypt the database log entries***, specify an encryption module and pass it to OrbitDB via the encryption object using the `replication` property:

```
const replication = await EncryptionModule()
const encryption = { replication }
const db = await orbitdb.open(dbNameOrAddress, { encryption })
```

To ***encrypt the whole database***, payload data and oplog entries separately, specify an encryption module and pass it to OrbitDB via the encryption object using both the `replication` and `data` properties:

```
const replication = await EncryptionModule()
const data = await EncryptionModule()
const encryption = { replication, data }
const db = await orbitdb.open(dbNameOrAddress, { encryption })
```

## Encrypting Databases

OrbitDB provides simple password-based encryption via an external module called [SimpleEncryption](https://github.com/orbitdb/simple-encryption).

**WARNING:** This is an unaudited encryption module. Use at your own risk.

To install SimpleEncryption:

```
npm i @orbitdb/simple-encryption
```

To use encryption, initiate SimpleEncryption with a password and pass it to OrbitDB when opening your database:

```js
import { SimpleEncryption } from '@orbitdb/simple-encryption'

const replication = await SimpleEncryption({ password: 'hello' })
const data = await SimpleEncryption({ password: 'world' })

const encryption = { data, replication }

const db = await orbitdb.open(dbNameOrAddress, { encryption })
```

If you wish to use another encryption type, simply replace SimpleEncryption with the module of your choice.

## Custom Encryption

To implement a custom encryption module for OrbitDB, expose encrypt and decrypt functions:

```
const CustomEncryption = async () => {
  const encrypt = (value) => {
    // return encrypted value
  }

  const decrypt = (value) => {
    // return decrypted value
  }

  return {
    encrypt,
    decrypt
  }
}

export default CustomEncryption
```
