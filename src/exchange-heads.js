'use strict'

const Channel = require('ipfs-pubsub-1on1')

const Logger = require('logplease')
const logger = Logger.create('exchange-heads', { color: Logger.Colors.Yellow })
Logger.setLogLevel('ERROR')

const getHeadsForDatabase = async store => {
  if (!(store && store._cache)) return []
  const localHeads = await store._cache.get(store.localHeadsPath) || []
  const remoteHeads = await store._cache.get(store.remoteHeadsPath) || []
  return [...localHeads, ...remoteHeads]
}

const exchangeHeads = async (ipfs, address, peer, getStore, getDirectConnection, onMessage, onChannelCreated) => {
  const _handleMessage = message => {
    const msg = JSON.parse(message.data)
    const { address, heads } = msg
    onMessage(address, heads)
  }

  let channel = getDirectConnection(peer)
  if (!channel) {
    try {
      logger.debug(`Create a channel to ${peer}`)
      channel = await Channel.open(ipfs, peer)
      channel.on('message', _handleMessage)
      logger.debug(`Channel created to ${peer}`)
      onChannelCreated(channel)
    } catch (e) {
      logger.error(e)
    }
  }

  // Wait for the direct channel to be fully connected
  await channel.connect()
  logger.debug(`Connected to ${peer}`)

  // Send the heads if we have any
  const heads = await getHeadsForDatabase(getStore(address))
  logger.debug(`Send latest heads of '${address}':\n`, JSON.stringify(heads.map(e => e.hash), null, 2))
  if (heads) {
    await channel.send(JSON.stringify({ address: address, heads: heads }))
  }

  return channel
}

module.exports = exchangeHeads
