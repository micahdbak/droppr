const path = require('path');

module.exports = {
  entry: {
    dropper: './src/dropper.js',
    recipient: './src/recipient.js'
  },
  output: {
    filename: '[name].js',
    path: path.join(__dirname, 'build')
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
