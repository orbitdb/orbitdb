const isBrowser = () => typeof window !== 'undefined'

const swarmAddress = isBrowser()
  ? ['/ip4/0.0.0.0/tcp/12345/ws/p2p-webrtc-star']
  : ['/ip4/0.0.0.0/tcp/0']

export default {
  timeout: 30000,
  defaultIpfsConfig: {
    preload: {
      enabled: false
    },
    EXPERIMENTAL: {
      pubsub: true
    },
    config: {
      Addresses: {
        API: '/ip4/127.0.0.1/tcp/0',
        Swarm: swarmAddress,
        Gateway: '/ip4/0.0.0.0/tcp/0'
      },
      Bootstrap: [],
      Discovery: {
        MDNS: {
          Enabled: true,
          Interval: 0
        },
        webRTCStar: {
          Enabled: false
        }
      }
    }
  },
  daemon1: {
    silent: true,
    EXPERIMENTAL: {
      pubsub: true
    },
    config: {
      Addresses: {
        API: '/ip4/127.0.0.1/tcp/0',
        Swarm: isBrowser() ? ['/ip4/0.0.0.0/tcp/12345/ws/p2p-webrtc-star'] : ['/ip4/0.0.0.0/tcp/0'],
        Gateway: '/ip4/0.0.0.0/tcp/0'
      },
      Bootstrap: [],
      Discovery: {
        MDNS: {
          Enabled: true,
          Interval: 0
        },
        webRTCStar: {
          Enabled: false
        }
      }
    }
  },
  daemon2: {
    silent: true,
    EXPERIMENTAL: {
      pubsub: true
    },
    config: {
      Addresses: {
        API: '/ip4/127.0.0.1/tcp/0',
        Swarm: isBrowser() ? ['/ip4/0.0.0.0/tcp/12345/ws/p2p-webrtc-star'] : ['/ip4/0.0.0.0/tcp/0'],
        Gateway: '/ip4/0.0.0.0/tcp/0'
      },
      Bootstrap: [],
      Discovery: {
        MDNS: {
          Enabled: true,
          Interval: 0
        },
        webRTCStar: {
          Enabled: false
        }
      }
    }
  }
}
