const Database = async (OpLog, ipfs, identity, id, access, storage) => {
  const { Log, Entry, IPFSBlockStorage } = OpLog

  storage = storage || IPFSBlockStorage(null, { ipfs, timeout: 3000, pin: true })
  const log = Log(identity, { logId: id, access, storage })

  const addOperation = async (op) => {
    const entry = await log.append(op, { pointerCount: 8 })
    await ipfs.pubsub.publish(id, entry.bytes)
    return entry.hash
  }

  const handleMessage = async (message) => {
    const { id: peerId } = await ipfs.id()
    const messageIsFromMe = (message) => String(peerId) === String(message.from)
    try {
      if (!messageIsFromMe(message)) {
        await sync(message.data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const sync = async (bytes) => {
    const entry = await Entry.decode(bytes)
    await log.joinEntry(entry)
  }

  const close = async () => {
    await ipfs.pubsub.unsubscribe(log.id, handleMessage)
  }

  // Automatically subscribe to the pubsub channel for this database
  await ipfs.pubsub.subscribe(log.id, handleMessage)

  return {
    close,
    sync,
    addOperation,
    log
  }
}

export default Database
