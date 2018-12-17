const webpack = require('webpack');
const path = require('path');


module.exports = {

    module: {
      rules: [
        {
          enforce: 'pre',
          test: /\.s[ac]ss$/,
          use: [{
            loader: 'sass-loader',
          }]
        },
        {
          test: /\.js|\.jsx|\.ts|\.tsx$/,
          loaders: ["awesome-typescript-loader"],
          include: path.resolve(__dirname, "../src"),
          exclude: path.resolve(__dirname, "../node_modules")
        },
        {
          test: /\.(css|less|s[ac]ss|styl)$/,
          include: path.resolve(__dirname, "../src"),

          use: [
            { loader: 'style-loader'},
            {
              loader: 'css-loader',
              options: {
                modules: true,
                importLoaders: 1,
                localIdentName: '[local]__[hash:base64:5]',
                sourceMap: true
              }
            }
            ],

        },
      ]
    },
    resolve: {
        extensions: [".js", ".jsx", ".ts", ".tsx", ".scss"],
        alias: {
            react: "preact-compat",
            "react-dom": "preact-compat"
        }
    }
};
