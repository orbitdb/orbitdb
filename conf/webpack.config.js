import path from 'path'
import { fileURLToPath } from 'url'

export default (env, argv) => {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)

  return {
    entry: './src/log.js',
    output: {
      libraryTarget: 'var',
      library: 'Log',
      filename: 'ipfslog.min.js'
    },
    target: 'web',
    mode: 'production',
    plugins: [
    ],
    resolve: {
      modules: [
        'node_modules',
        path.resolve(__dirname, '../node_modules')
      ]
    }
  }
}
