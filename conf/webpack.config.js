import path from 'path'
import webpack from 'webpack'

export default (env, argv) => {
  return {
    entry: './src/OrbitDB.js',
    output: {
      libraryTarget: 'var',
      library: 'OrbitDB',
      filename: '../dist/orbitdb.min.js'
    },
    mode: 'development',
    target: 'web',
    devtool: 'none',
    externals: {
      fs: '{}',
      mkdirp: '{}'
    },
    node: {
      console: false,
      Buffer: true,
      mkdirp: 'empty'
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: JSON.stringify(process.env.NODE_ENV)
        }
      })
    ],
    resolve: {
      modules: [
        'node_modules',
        path.resolve(__dirname, '../node_modules')
      ],
      alias: {
        leveldown: 'level-js'
      }
    },
    resolveLoader: {
      modules: [
        'node_modules',
        path.resolve(__dirname, '../node_modules')
      ],
      moduleExtensions: ['-loader']
    }
  }
}
