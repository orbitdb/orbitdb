const path = require('path')
const { DAGNode, util } = require('ipld-dag-pb')

// Creates a DB manifest file and saves it in IPFS
const createDBManifest = async (ipfs, name, type, accessControllerAddress, onlyHash) => {
  const manifest = {
    name: name,
    type: type,
    accessController: path.join('/ipfs', accessControllerAddress),
  }
  let dag, hash
  const manifestJSON = JSON.stringify(manifest)
  if (onlyHash) {
    dag = await new Promise(resolve => {
      DAGNode.create(Buffer.from(manifestJSON), (err, n) => {
        if (err) {
          throw err
        }
        resolve(n)
      })
    })
    const cid = await new Promise(resolve => {
      util.cid(dag, (err, node) => {
        if (err) {
          throw err
        }
        resolve(node)
      })
    })
    hash = cid.toBaseEncodedString()
  } else {
    dag = await ipfs.object.put(Buffer.from(manifestJSON))
    hash = dag.toJSON().multihash.toString()
  }
  return hash
}

module.exports = createDBManifest
