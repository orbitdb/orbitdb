module.exports = {
  daemon1: {
    IpfsDataDir: '/tmp/orbit-db-tests-1',
    Addresses: {
      API: '/ip4/127.0.0.1/tcp/0',
      Swarm: ['/ip4/0.0.0.0/tcp/0'],
      Gateway: '/ip4/0.0.0.0/tcp/0'
    },
    Bootstrap: [],
    Discovery: {
      MDNS: {
        Enabled: true,
        Interval: 10
      },
      webRTCStar: {
        Enabled: false
      }
    }
  },
  daemon2: {
    IpfsDataDir: '/tmp/orbit-db-tests-2',
    Addresses: {
      API: '/ip4/127.0.0.1/tcp/0',
      Swarm: ['/ip4/0.0.0.0/tcp/0'],
      Gateway: '/ip4/0.0.0.0/tcp/0'
    },
    Bootstrap: [],
    Discovery: {
      MDNS: {
        Enabled: true,
        Interval: 10
      },
      webRTCStar: {
        Enabled: false
      }
    }
  }
}
