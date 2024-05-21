export const Payload = async (payload, { decryptFn, decryptValue, decryptOp }) => {
  if (decryptFn) {
    if (decryptOp) {
      payload = JSON.parse(await decryptFn(payload))
    }

    if (decryptValue) {
      payload.value = await decryptFn(payload.value)
    }
  }

  const { op, key, value } = payload

  return { op, key, value }
}
