import { pipe } from 'it-pipe'
import PQueue from 'p-queue'
import { EventEmitter } from 'events'
import { TimeoutController } from 'timeout-abort-controller'
import pathJoin from './utils/path-join.js'

const DefaultTimeout = 30000 // 30 seconds

/**
 * @module Sync
 * @description
 * The Sync Protocol for OrbitDB synchronizes the database operations {@link module:Log} between multiple peers.
 *
 * The Sync Protocol sends and receives heads between multiple peers,
 * both when opening a database and when a database is updated, ie.
 * new entries are appended to the log.
 *
 * When Sync is started, a peer subscribes to a pubsub topic of the log's id.
 * Upon subscribing to the topic, peers already connected to the topic receive
 * the subscription message and "dial" the subscribing peer using a libp2p
 * custom protocol. Once connected to the subscribing peer on a direct
 * peer-to-peer connection, the dialing peer and the subscribing peer exchange * the heads of the Log each peer currently has. Once completed, the peers have * the same "local state".
 *
 * Once the initial sync has completed, peers notify one another of updates to
 * the log, ie. updates to the database, using the initially opened pubsub
 * topic subscription.
 * A peer with new heads broadcasts changes to other peers by publishing the
 * updated heads
 * to the pubsub topic. Peers subscribed to the same topic will then receive
 * the update and
 * will update their log's state, the heads, accordingly.
 *
 * The Sync Protocol is eventually consistent. It guarantees that once all
 * messages have been sent and received, peers will observe the same log state
 * and values. The Sync Protocol does not guarantee the order in which messages
 * are received or even that a message is recieved at all, nor any timing on
 * when messages are received.
 *
 * Note that the Sync Protocol does not retrieve the full log when
 * synchronizing the heads. Rather only the "latest entries" in the log, the
 * heads, are exchanged. In order to retrieve the full log and each entry, the
 * user would call the log.traverse() or log.iterator() functions, which go
 * through the log and retrieve each missing log entry from IPFS.
 *
 * @example
 * // Using defaults
 * const sync = await Sync({ ipfs, log, onSynced: (peerId, heads) => ... })
 *
 * @example
 * // Using all parameters
 * const sync = await Sync({ ipfs, log, events, onSynced: (peerId, heads) => ..., start: false })
 * sync.events.on('join', (peerId, heads) => ...)
 * sync.events.on('leave', (peerId) => ...)
 * sync.events.on('error', (err) => ...)
 * await sync.start()
 */

/**
 * Creates a Sync instance for sychronizing logs between multiple peers.
 *
 * @function
 * @param {Object} params One or more parameters for configuring Sync.
 * @param {IPFS} params.ipfs An IPFS instance.
 * @param {Log} params.log The log instance to sync.
 * @param {EventEmitter} [params.events] An event emitter to use. Events
 * emitted are 'join', 'leave' and 'error'. If the parameter is not provided,
 * an EventEmitter will be created.
 * @param {onSynced} [params.onSynced] A callback function that is called after
 * the peer has received heads from another peer.
 * @param {Boolean} [params.start] True if sync should start automatically,
 * false otherwise. Defaults to true.
 * @return {module:Sync~Sync} sync An instance of the Sync Protocol.
 * @memberof module:Sync
 * @instance
 */
const Sync = async ({ ipfs, log, events, onSynced, start, timeout }) => {
  /**
   * @namespace module:Sync~Sync
   * @description The instance returned by {@link module:Sync}.
   */

  /**
   * Callback function when new heads have been received from other peers.
   * @callback module:Sync~Sync#onSynced
   * @param {PeerID} peerId PeerID of the peer who we received heads from
   * @param {Entry[]} heads An array of Log entries
   */

  /**
   * Event fired when when a peer has connected and the exchange of
   * heads has been completed.
   * @event module:Sync~Sync#join
   * @param {PeerID} peerId PeerID of the peer who we received heads from
   * @param {Entry[]} heads An array of Log entries
   * @example
   * sync.events.on('join', (peerID, heads) => ...)
   */

  /**
   * Event fired when a peer leaves the sync protocol.
   * @event module:Sync~Sync#leave
   * @param {PeerID} peerId PeerID of the peer who left
   * @example
   * sync.events.on('leave', (peerID) => ...)
   */

  /**
   * Event fired when an error occurs.
   * @event module:Sync~Sync#error
   * @param {Error} error The error that occured
   * @example
   * sync.events.on('error', (error) => ...)
   */

  if (!ipfs) throw new Error('An instance of ipfs is required.')
  if (!log) throw new Error('An instance of log is required.')

  const address = log.id
  const headsSyncAddress = pathJoin('/orbitdb/heads/', address)

  const queue = new PQueue({ concurrency: 1 })

  /**
   * Set of currently connected peers for the log for this Sync instance.
   * @name peers
   * @†ype Set
   * @memberof module:Sync~Sync
   * @instance
   */
  const peers = new Set()

  /**
   * Event emitter that emits Sync changes. See Events section for details.
   * @†ype EventEmitter
   * @memberof module:Sync~Sync
   * @instance
   */
  events = events || new EventEmitter()

  timeout = timeout || DefaultTimeout

  let started = false

  const onPeerJoined = async (peerId) => {
    const heads = await log.heads()
    events.emit('join', peerId, heads)
  }

  const sendHeads = async (source) => {
    return (async function * () {
      const heads = await log.heads()
      for await (const { bytes } of heads) {
        yield bytes
      }
    })()
  }

  const receiveHeads = (peerId) => async (source) => {
    for await (const value of source) {
      const headBytes = value.subarray()
      if (headBytes && onSynced) {
        await onSynced(headBytes)
      }
    }
    if (started) {
      await onPeerJoined(peerId)
    }
  }

  const handleReceiveHeads = async ({ connection, stream }) => {
    const peerId = String(connection.remotePeer)
    try {
      peers.add(peerId)
      await pipe(stream, receiveHeads(peerId), sendHeads, stream)
    } catch (e) {
      peers.delete(peerId)
      events.emit('error', e)
    }
  }

  const handlePeerSubscribed = async (event) => {
    const task = async () => {
      const { peerId: remotePeer, subscriptions } = event.detail
      const peerId = String(remotePeer)
      const subscription = subscriptions.find(e => e.topic === address)
      if (!subscription) {
        return
      }
      if (subscription.subscribe) {
        if (peers.has(peerId)) {
          return
        }
        const timeoutController = new TimeoutController(timeout)
        const { signal } = timeoutController
        try {
          peers.add(peerId)
          const stream = await ipfs.libp2p.dialProtocol(remotePeer, headsSyncAddress, { signal })
          await pipe(sendHeads, stream, receiveHeads(peerId))
        } catch (e) {
          console.error(e)
          peers.delete(peerId)
          if (e.code === 'ERR_UNSUPPORTED_PROTOCOL') {
            // Skip peer, they don't have this database currently
          } else {
            events.emit('error', e)
          }
        } finally {
          if (timeoutController) {
            timeoutController.clear()
          }
        }
      } else {
        peers.delete(peerId)
        events.emit('leave', peerId)
      }
    }
    queue.add(task)
  }

  const handleUpdateMessage = async message => {
    const task = async () => {
      const messageHasData = message => message.detail.data !== undefined
      try {
        if (messageHasData(message) && onSynced) {
          await onSynced(message.detail.data)
        }
      } catch (e) {
        events.emit('error', e)
      }
    }

    if (message.detail.topic === address) {
      queue.add(task)
    }
  }

  /**
   * Add a log entry to the Sync Protocol to be sent to peers.
   * @function add
   * @param {Entry} entry Log entry
   * @memberof module:Sync~Sync
   * @instance
   */
  const add = async (entry) => {
    if (started) {
      await ipfs.libp2p.services.pubsub.publish(address, entry.bytes)
    }
  }

  /**
   * Stop the Sync Protocol.
   * @function stop
   * @memberof module:Sync~Sync
   * @instance
   */
  const stopSync = async () => {
    if (started) {
      started = false
      await queue.onIdle()
      ipfs.libp2p.services.pubsub.removeEventListener('subscription-change', handlePeerSubscribed)
      ipfs.libp2p.services.pubsub.removeEventListener('message', handleUpdateMessage)
      await ipfs.libp2p.unhandle(headsSyncAddress)
      await ipfs.libp2p.services.pubsub.unsubscribe(address)
      peers.clear()
    }
  }

  /**
   * Start the Sync Protocol.
   * @function start
   * @memberof module:Sync~Sync
   * @instance
   */
  const startSync = async () => {
    if (!started) {
      // Exchange head entries with peers when connected
      await ipfs.libp2p.handle(headsSyncAddress, handleReceiveHeads)
      ipfs.libp2p.services.pubsub.addEventListener('subscription-change', handlePeerSubscribed)
      ipfs.libp2p.services.pubsub.addEventListener('message', handleUpdateMessage)
      // Subscribe to the pubsub channel for this database through which updates are sent
      await ipfs.libp2p.services.pubsub.subscribe(address)
      started = true
    }
  }

  // Start Sync automatically
  if (start !== false) {
    await startSync()
  }

  return {
    add,
    stop: stopSync,
    start: startSync,
    events,
    peers
  }
}

export { Sync as default }
