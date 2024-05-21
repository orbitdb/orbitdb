export const Operation = async (op, key, value, { encryptFn, encryptValue, encryptOp } = {}) => {
  let operation = { op, key, value }

  if (encryptFn) {
    if (encryptValue) {
      operation.value = await encryptFn(value)
    }

    if (encryptOp) {
      operation = await encryptFn(JSON.stringify(operation))
    }
  }

  return operation
}
