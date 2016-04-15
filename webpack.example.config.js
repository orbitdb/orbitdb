const webpack = require('webpack');

module.exports = {
  entry: './examples/browser.js',
  output: {
    filename: './examples/bundle.js'
  },
  node: {
    console: false,
    process: 'mock',
    Buffer: 'buffer'
  },
  resolve: {
    modulesDirectories: [
      'node_modules'
    ],
    alias: {
      fs: require.resolve('./node_modules/logplease/src/fs-mock'),
      http: 'stream-http',
      https: 'https-browserify',
      Buffer: 'buffer'
    }
  },
  module: {
    loaders: [{
      test: /\.js$/,
      exclude: /node_modules/,
      loader: 'babel',
      query: {
        presets: ['es2015'],
        plugins: ['transform-runtime']
      }
    }, {
      test: /\.js$/,
      include: /node_modules\/(hoek|qs|wreck|boom)/,
      loader: 'babel',
      query: {
        presets: ['es2015'],
        plugins: ['transform-runtime']
      }
    }, {
      test: /\.json$/,
      loader: 'json'
    }]
  },
  externals: {
    net: '{}',
    tls: '{}',
    'require-dir': '{}'
  }
};
