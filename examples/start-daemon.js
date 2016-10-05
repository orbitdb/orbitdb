const IpfsDaemon = require('ipfs-daemon')

module.exports = IpfsDaemon({
  IpfsDataDir: '/tmp/orbit-db-examples',
  API: {
    HTTPHeaders: {
      "Access-Control-Allow-Origin": ['*'],
      "Access-Control-Allow-Methods": ["PUT", "GET", "POST"],
      "Access-Control-Allow-Credentials": ["true"]
    } 
  }
})
.then((res) => console.log("Started IPFS daemon"))
.catch((err) => console.error(err))
