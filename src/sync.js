import { pipe } from 'it-pipe'
import PQueue from 'p-queue'
import { EventEmitter } from 'events'
import { TimeoutController } from 'timeout-abort-controller'
import pathJoin from './utils/path-join.js'

const DefaultTimeout = 30000 // 30 seconds

/**
 * @description
 * Syncs an append-only, conflict-free replicated data type (CRDT) log between
 * multiple peers.
 *
 * The sync protocol synchronizes heads between multiple peers, both during
 * startup and also when new entries are appended to the log.
 *
 * When Sync is started, peers "dial" each other using libp2p's custom protocol
 * handler and initiate the exchange of heads each peer currently has. Once
 * initial sync has completed, peers notify one another of updates to heads
 * using pubsub "subscribe" with the same log.id topic. A peer with new heads
 * can broadcast changes to other peers using pubsub "publish". Peers
 * subscribed to the same topic will then be notified and will update their
 * heads accordingly.
 *
 * The sync protocol only guarantees that the message is published; it does not
 * guarantee the order in which messages are received or even that the message
 * is recieved at all. The sync protocol only guarantees that heads will
 * eventually reach consistency between all peers with the same address.
 */

/**
 * Creates a Sync instance for sychronizing logs between multiple peers.
 * @param {Object} params One or more parameters for configuring Sync.
 * @param {IPFS} params.ipfs An IPFS instance. Used for synchronizing peers.
 * @param {Log} params.log The Log instance to sync.
 * @param {Object} params.events An event emitter. Defaults to an instance of
 * EventEmitter. Events emitted are 'join', 'error' and 'leave'.
 * @param {Function} params.onSynced A function that is called after the peer
 * has received heads from another peer.
 * @param {Boolean} params.start True if sync should start automatically, false
 * otherwise. Defaults to true.
 * @return {Sync} The Sync protocol instance.
 */
const Sync = async ({ ipfs, log, events, onSynced, start, timeout }) => {
  if (!ipfs) throw new Error('An instance of ipfs is required.')
  if (!log) throw new Error('An instance of log is required.')

  const address = log.id
  const headsSyncAddress = pathJoin('/orbitdb/heads/', address)

  const queue = new PQueue({ concurrency: 1 })
  const peers = new Set()

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
    await onPeerJoined(peerId)
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
          if (e.code === 'ERR_UNSUPPORTED_PROTOCOL') {
            // Skip peer, they don't have this database currently
          } else {
            peers.delete(peerId)
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

  const handleUpdateMessage = async (message) => {
    const task = async () => {
      const { id: peerId } = await ipfs.id()
      const messageIsNotFromMe = (message) => String(peerId) !== String(message.from)
      const messageHasData = (message) => message.data !== undefined
      try {
        if (messageIsNotFromMe(message) && messageHasData(message) && onSynced) {
          await onSynced(message.data)
        }
      } catch (e) {
        events.emit('error', e)
      }
    }
    queue.add(task)
  }

  const add = async (entry) => {
    if (started) {
      await ipfs.pubsub.publish(address, entry.bytes)
    }
  }

  const stopSync = async () => {
    if (started) {
      await queue.onIdle()
      ipfs.libp2p.pubsub.removeEventListener('subscription-change', handlePeerSubscribed)
      await ipfs.libp2p.unhandle(headsSyncAddress)
      await ipfs.pubsub.unsubscribe(address, handleUpdateMessage)
      peers.clear()
      started = false
    }
  }

  const startSync = async () => {
    if (!started) {
      // Exchange head entries with peers when connected
      await ipfs.libp2p.handle(headsSyncAddress, handleReceiveHeads)
      ipfs.libp2p.pubsub.addEventListener('subscription-change', handlePeerSubscribed)
      // Subscribe to the pubsub channel for this database through which updates are sent
      await ipfs.pubsub.subscribe(address, handleUpdateMessage)
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
