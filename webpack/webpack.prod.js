const ESLintPlugin = require('eslint-webpack-plugin');
const common = require("./webpack.common.js");
const { merge } = require("webpack-merge");

module.exports = merge(common, {
    mode: 'production',
    plugins: [
        new ESLintPlugin({
            extensions: ['ts'],
            failOnError: true,
            failOnWarning: true
        }),
    ],
    output: {
        filename: '[name].min.js',
    },
});
