const path = require('path');

module.exports = {
  entry: {
    builder: './workers/builder.js'
  },
  output: {
    filename: '[name].js',
    path: path.join(__dirname, 'public/workers')
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      }
    ]
  }
};
