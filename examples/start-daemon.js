const IpfsDaemon = require('ipfs-daemon')
module.exports = IpfsDaemon({
  IpfsDataDir: './tmp',
  API: {
    HTTPHeaders: {
      "Access-Control-Allow-Origin": ['*'],
      "Access-Control-Allow-Methods": ["PUT", "GET", "POST"],
      "Access-Control-Allow-Credentials": ["true"]
    } 
  }
})
.then((res) => console.log("started"))
.catch((err) => console.error(err))
