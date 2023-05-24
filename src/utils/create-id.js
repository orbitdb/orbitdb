/**
 * Creates an id from an alphanumeric character list.
 * @param {number} [length=32] The length of the id.
 * @return {string} An id.
 * @see {@link https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript}
 * @memberof module:Utils
 */
const createId = async (length = 32) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  let counter = 0
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
    counter += 1
  }
  return result
}

export default createId
