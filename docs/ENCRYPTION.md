# Encryption

OrbitDB features a modular architecture for database encryption. By passing a  module to an OrbitDB database, different encryption methods can be employed.

## Encrypting Databases

OrbitDB provides a simple password-based encryption module called SimpleEncryption. To implement encryption, initiate SimpleEncryption and pass it when opening your database:

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