/**

 */
const toPayload = async (op, key, value, { encrypt }) => {
  let payload = { op, key, value }

  if (encrypt) {
    if (encrypt.data) {
      payload.value = await encrypt.data.encryptFn(value)
    }

    if (encrypt.op) {
      payload = await encrypt.op.encryptFn(JSON.stringify(payload))
    }
  }

  return payload
}

const fromPayload = async (payload, { encrypt }) => {
  if (encrypt) {
    if (encrypt.op) {
      payload = JSON.parse(await encrypt.op.decryptFn(payload))
    }

    if (encrypt.data) {
      payload.value = await encrypt.data.decryptFn(payload.value)
    }
  }

  const { op, key, value } = payload

  return { op, key, value }
}

export {
  toPayload,
  fromPayload
}
