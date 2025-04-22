# Encryption

OrbitDB features a modular architecture for database encryption. By passing a  module to an OrbitDB database, different encryption methods can be employed.

## How it works

OrbitDB encrypts records two ways; encrypting the payload and encrypting the log entry.

Log entry encryption only encrypts the value of the payload. Payload encryption encrypts the entire payload, which includes the value, codec and hasher.

## Configuring encryption

You can configure OrbitDB to encrypt either the entry being stored or the entire block being replicated.

To encrypt data only, specify an encryption module and pass it to the encryption object using the `data` variable:

```
const data = await EncryptionModule()
const encryption = { data }
```

To encrypt data only, specify an encryption module and pass it to the encryption object using the `replication` variable:

```
const replication = await EncryptionModule()
const encryption = { replication }
```

## Encrypting Databases

OrbitDB provides simple password-based encryption via an external module called [SimpleEncryption](https://github.com/orbitdb/simple-encryption).

**WARNING:** This is an unaudited encryption module. Use at your own risk.

To install SimpleEncryption:

```
npm i @orbitdb/simple-encryption
```

To implement encryption, initiate SimpleEncryption and pass it when opening your database:

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

## Benchmarking

The performance of your encryption module can be measured by comparing your benchmarks against those of OrbitDB.

See [SimpleEncryption](https://github.com/orbitdb/simple-encryption) for a set of [re-usable benchmarks](https://github.com/orbitdb/simple-encryption/tree/main/benchmarks).