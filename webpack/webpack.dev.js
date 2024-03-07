const common = require("./webpack.common.js");
const { merge } = require("webpack-merge");

module.exports = merge(common, {
    mode: 'development',
    devServer: {
        static: '../dist',
    },
    optimization: {
        runtimeChunk: 'single',
    },
    output: {
        filename: '[name].[contenthash].js',
    },
});
