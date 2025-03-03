const CustomEncryption = async ({ fail } = {}) => {
  fail = fail || false
  
  const key = 'encrypted'
  const bufferedKey = new Uint8Array(Buffer.from(key))
  
  const encrypt = (value) => {
    return new Uint8Array([...bufferedKey, ...value])
  }

  const decrypt = (value) => {
    const detectedBufferedKey = new Uint8Array(value.slice(0, bufferedKey.length))
    const rawValue = new Uint8Array(value.slice(bufferedKey.length))
    if (detectedBufferedKey.length == bufferedKey.length && !fail) {
      return rawValue
    } else {
      throw new Exception('invalid encryption')
    }
  }

  return {
    encrypt,
    decrypt
  }
}

export default CustomEncryption
