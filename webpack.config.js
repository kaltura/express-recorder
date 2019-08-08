const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");

var dotenv = require('dotenv').config({path: __dirname + '/.env'});
const packageJson = require('./package.json');

const isDevServer = process.argv.find(v => v.indexOf('webpack-dev-server') !== -1);
const testFolder = path.join(__dirname, "/test");
const distFolder = path.join(__dirname, "/dist");

console.log(JSON.stringify(dotenv));
const plugins = [];

if (isDevServer) {
  plugins.push(
    new HtmlWebpackPlugin({
      alwaysWriteToDisk: true,
      filename: path.resolve(distFolder, "index.html"),
      template: path.resolve(testFolder, "index.ejs"),
      inject: false,
      hash: true,
      config: {
        ks: 'sss'
      }
    }),
    new CopyPlugin([
      { from: testFolder, to: distFolder }
    ])
  );
}

module.exports = (env, options) => {
  return {
    entry: "./src/index.tsx",
    resolve: {
      extensions: [".ts", ".tsx", ".js", ".scss", ".svg"],
      modules: [path.resolve(__dirname, "node_modules")],
      symlinks: false
    },
    output: {
      path: distFolder,
      filename: 'express-recorder.js',
      library: ['Kaltura', 'ExpressRecorder'],
      libraryTarget: 'umd',
      umdNamedDefine: true
    },
    devtool: "source-map",
    module: {
      rules: [
        {
          test: /\.js$/,
          use: ['source-map-loader'],
          enforce: 'pre'
        },
        {
          test: /\.tsx?$/,
          loader: "awesome-typescript-loader"
        },
        {
          test: /\.scss$/,
          use: [
            {
              loader: 'style-loader'
            },
            {
              loader: 'css-loader',
              options: {
                camelCase: true,
                modules: true,
                localIdentName: '[name]__[local]___[hash:base64:5]'
              }
            },
            {
              loader: 'sass-loader'
            }
          ]
        },
        {
          test: /\.svg/,
          use: {
            loader: 'preact-svg-loader',
            options: {}
          }
        },
        {
          test: /\.(png|jp(e*)g)$/,
          use: [{
            loader: 'url-loader',
            options: {
            }
          }]
        }
      ]
    },
    plugins,
    devServer: {
      historyApiFallback: true,
      hot: false,
      inline: true,
      index: "index.html",
      port: 8007
    },
    externals: {
    }

  };
}
