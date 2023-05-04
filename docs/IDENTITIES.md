# Identities

An identity is a cryptographically signed identifier or "id" and can be used to sign and verify various data. Within OrbitDB, the main objective of an identity is verify write access to a database's log and, if allowed, to sign each entry as it is added to the log.

Identities provides methods to manage one or more identities and includes functionality for creating, retrieving, signing and verifying an identity as well as signing and verifying messages using an existing identity.

## Creating an identity

```
const id = 'userA'
const identities = await Identities()
const identity = identities.createIdentity({ id })
```

Once created, the identity can be passed to OrbitDB:

```
const orbitdb = await OrbitDB({ identity })
```

##  Specifying a keystore

```
const keystore = await KeyStore()
const id = 'userA'
const identities = await Identities({ keystore })
const identity = identities.createIdentity({ id })
```