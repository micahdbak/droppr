const path = require("path");

module.exports = {
  entry: {
    dropper: './workers/dropper.js',
    receiver: './workers/receiver.js'
  },
  output: {
    filename: "[name].js",
    path: path.join(__dirname, "build/workers")
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader"
        }
      }
    ]
  }
};
