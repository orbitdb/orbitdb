const waitFor = async (valueA, toBeValueB, pollInterval = 100) => {
  return new Promise((resolve) => {
    const interval = setInterval(async () => {
      if (await valueA() === await toBeValueB()) {
        clearInterval(interval)
        resolve()
      }
    }, pollInterval)
  })
}

export default waitFor
