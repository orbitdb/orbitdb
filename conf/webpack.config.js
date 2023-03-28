import path from 'path'
import webpack from 'webpack'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

export default (env, argv) => {
  const require = createRequire(import.meta.url)
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)

  return {
    mode: 'production',
    entry: './src/OrbitDB.js',
    output: {
      filename: '../dist/orbitdb.min.js',
      library: {
        name: 'OrbitDB',
        type: 'var',
        export: 'default'
      }
    },
    target: 'web',
    experiments: {
      topLevelAwait: true
    },
    externals: {
      fs: '{ existsSync: () => true }',
      mkdirp: '{}'
    },
    resolve: {
      modules: [
        'node_modules',
        path.resolve(__dirname, '../node_modules')
      ]
    },
    resolveLoader: {
      modules: [
        'node_modules',
        path.resolve(__dirname, '../node_modules')
      ],
      extensions: ['.js', '.json'],
      mainFields: ['loader', 'main']
    }
  }
}
