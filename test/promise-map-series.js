'use strict'

// https://gist.github.com/dignifiedquire/dd08d2f3806a7b87f45b00c41fe109b7

module.exports = function mapSeries (list, func) {
  const res = []
  return list.reduce((acc, next) => {
    return acc.then((val) => {
      res.push(val)
      return func(next)
    })
  }, Promise.resolve(null)).then((val) => {
    res.push(val)
    return res.slice(1)
  })
}
