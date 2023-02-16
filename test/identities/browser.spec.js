// import path from 'path'
// import isNode from 'is-node'

// // This file will be picked up by webpack into the
// // tests bundle and the code here gets run when imported
// // into the browser tests index through browser/run.js
// if (!isNode) {
//   const existingKey = (await import('./fixtures/keys/existing.json')).default
//   const testKey1 = (await import('./fixtures/keys/QmPhnEjVkYE1Ym7F5MkRUfkD6NtuSptE7ugu1Ggr149W2X.json')).default
//   const testKey2 = (await import('./fixtures/keys/0260baeaffa1de1e4135e5b395e0380563a622b9599d1b8e012a0f7603f516bdaa.json')).default

//   // If in browser, put the fixture keys in local storage
//   // so that Keystore can find them
//   const levelup = (await import('levelup')).default
//   const level = (await import('level-js')).default
//   const storagePath = path.resolve('./test/fixtures/savedKeys')
//   const signingStore = levelup(level(storagePath))

//   const copyFixtures = []
//   copyFixtures.push(signingStore)

//   /* global localStorage */
//   copyFixtures.push(localStorage.setItem('existing.json', JSON.stringify(existingKey)))
//   copyFixtures.push(signingStore.put('QmPhnEjVkYE1Ym7F5MkRUfkD6NtuSptE7ugu1Ggr149W2X', JSON.stringify(testKey1)))
//   copyFixtures.push(signingStore.put('0260baeaffa1de1e4135e5b395e0380563a622b9599d1b8e012a0f7603f516bdaa', JSON.stringify(testKey2)))

//   Promise.all(copyFixtures)
// }
