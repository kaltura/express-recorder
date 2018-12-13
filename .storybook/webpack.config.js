const webpack = require('webpack');
const path = require('path');

module.exports = {

    module: {
        rules: [
            {
                test: /\.js|\.jsx|\.ts|\.tsx$/,
                loaders: ["awesome-typescript-loader"],
                include: path.resolve(__dirname, "../src")
            },
        ]
    },
    resolve: {
        extensions: [".js", ".jsx", ".ts", ".tsx"],
        alias: {
            react: "preact-compat",
            "react-dom": "preact-compat"
        }
    }
};