# Identities

An identity is a cryptographically signed public key which can be used to sign and verify various data. Within OrbitDB, the main objective of an identity is verify write access to a database's log and, if allowed, to sign each entry as it is added to the log.

`Identities` provides methods to manage one or more identities and includes functionality for creating, retrieving, signing and verifying an identity as well as signing and verifying messages using an existing identity.

## Creating an identity

An identity can be created by using the `createIdentity` function.

A root key is used to create a new key with the "id" of the root key's public key, Using the derived private key, the root public key is signed. This is known as the "signed message".

A new identity is signed using the root key's private key. The identity is consists of the signed message and the derived public key concatenated together ("signed identity")

A "signatures object" is then created to hold both the signed message and signed identity.

Finally, a new identity consisting of the root public key and derived public key plus the signatures object is generated and stored to the Identities storage.

```js
import { Identities } from 'orbit-db'

const id = 'userA'
const identities = await Identities() 
const identity = identities.createIdentity({ id })
```

The `id` parameter that is passed to createIdentity is used to reference  the root key pair in the PublicKeyIdentityProvider. The id can be any arbitrary text, e.g. 'bob', 'My-Key-123', etc. 

The PublicKeyIdentityProvider stores the id and the root keys as a key/value pair in the key store. Other providers may not store root keys in the same manner and so the `id` parameter may not always be required.

Once created, `identities` and the associated `id` can be passed to OrbitDB:

```js
const orbitdb = await OrbitDB({ identities, id: 'userA' })
```

This identity can now be used by OrbitDB to control access to database actions such as write.

##  Specifying a keystore

An existing keystore can be passed to `Identities`:

```js
import { Identities, KeyStore } from 'orbit-db'

const keystore = await KeyStore()
const id = 'userA'
const identities = await Identities({ keystore })
const identity = identities.createIdentity({ id })
```