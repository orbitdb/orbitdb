const waitFor = async (valueA, toBeValueB, pollInterval = 100) => {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      if (valueA() === toBeValueB()) {
        clearInterval(interval)
        resolve()
      }
    }, pollInterval)
  })
}

export default waitFor
