import { pipe } from 'it-pipe'
import PQueue from 'p-queue'
import Path from 'path'

const Sync = async ({ ipfs, log, events, sync }) => {
  const address = log.id
  const headsSyncAddress = Path.join('/orbitdb/heads/', address)
  const queue = new PQueue({ concurrency: 1 })

  let peers = new Set()

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
      await sync(headBytes)
    }
    const heads = await log.heads()
    events.emit('join', peerId, heads)
  }

  const handleReceiveHeads = async ({ connection, stream }) => {
    try {
      const peerId = connection.remotePeer
      peers.add(peerId)
      await pipe(stream, receiveHeads(peerId), sendHeads, stream)
    } catch (e) {
      console.error(e)
      events.emit('error', e)
    }
  }

  const handlePeerSubscribed = async (event) => {
    const task = async () => {
      const { peerId, subscriptions } = event.detail
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
          const stream = await ipfs.libp2p.dialProtocol(peerId, headsSyncAddress)
          await pipe(sendHeads, stream, receiveHeads(peerId))
        } catch (e) {
          if (e.code === 'ERR_UNSUPPORTED_PROTOCOL') {
            // Skip peer, they don't have this database currently
            console.log(e.message)
          } else {
            console.error(e)
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
        if (messageIsNotFromMe(message) && messageHasData(message)) {
          await sync(message.data)
        }
      } catch (e) {
        console.error(e)
        events.emit('error', e)
      }
    }
    await queue.onIdle()
    await queue.add(task)
  }

  const publish = async (entry) => {
    await ipfs.pubsub.publish(address, entry.bytes)
  }

  const stop = async () => {
    await queue.onIdle()
    ipfs.libp2p.pubsub.removeEventListener('subscription-change', handlePeerSubscribed)
    await ipfs.libp2p.unhandle(headsSyncAddress)
    await ipfs.pubsub.unsubscribe(address, handleUpdateMessage)
    peers = new Set()
  }

  const start = async () => {
    // Exchange head entries with peers when connected
    await ipfs.libp2p.handle(headsSyncAddress, handleReceiveHeads)
    ipfs.libp2p.pubsub.addEventListener('subscription-change', handlePeerSubscribed)
    // Subscribe to the pubsub channel for this database through which updates are sent
    await ipfs.pubsub.subscribe(address, handleUpdateMessage)
  }

  // Start Sync automatically
  await start()

  return {
    publish,
    stop,
    start
  }
}

export { Sync as default }
