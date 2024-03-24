const path = require('path');

module.exports = {
  entry: {
    main: './src/index.jsx',
  },
  output: {
    filename: 'js/[name].js',
    path: path.join(__dirname, 'build'),
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
      {
        test: /\.(png|svg)$/,
        use: ['url-loader'],
      },
    ],
  },
};
