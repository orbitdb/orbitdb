import { pipe } from 'it-pipe'
import PQueue from 'p-queue'
import Path from 'path'
import { EventEmitter } from 'events'

const Sync = async ({ ipfs, log, events, onSynced, start }) => {
  const address = log.id
  const headsSyncAddress = Path.join('/orbitdb/heads/', address)

  const queue = new PQueue({ concurrency: 1 })
  const peers = new Set()

  events = events || new EventEmitter()

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
      console.error(e)
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
        try {
          peers.add(peerId)
          const stream = await ipfs.libp2p.dialProtocol(remotePeer, headsSyncAddress)
          await pipe(sendHeads, stream, receiveHeads(peerId))
        } catch (e) {
          if (e.code === 'ERR_UNSUPPORTED_PROTOCOL') {
            // Skip peer, they don't have this database currently
            console.log(e.message)
          } else {
            console.error(e)
            peers.delete(peerId)
            events.emit('error', e)
          }
        }
      } else {
        peers.delete(peerId)
        events.emit('leave', peerId)
      }
    }
    await queue.onIdle()
    await queue.add(task)
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
        console.error(e)
        events.emit('error', e)
      }
    }
    await queue.onIdle()
    await queue.add(task)
  }

  const add = async (entry) => {
    await ipfs.pubsub.publish(address, entry.bytes)
  }

  const stopSync = async () => {
    await queue.onIdle()
    ipfs.libp2p.pubsub.removeEventListener('subscription-change', handlePeerSubscribed)
    await ipfs.libp2p.unhandle(headsSyncAddress)
    await ipfs.pubsub.unsubscribe(address, handleUpdateMessage)
    peers.clear()
  }

  const startSync = async () => {
    // Exchange head entries with peers when connected
    await ipfs.libp2p.handle(headsSyncAddress, handleReceiveHeads)
    ipfs.libp2p.pubsub.addEventListener('subscription-change', handlePeerSubscribed)
    // Subscribe to the pubsub channel for this database through which updates are sent
    await ipfs.pubsub.subscribe(address, handleUpdateMessage)
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
