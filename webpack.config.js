const path = require("path");
const { VueLoaderPlugin } = require("vue-loader");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: process.env.NODE_ENV === "production" ? "production" : "development",
  entry: "./client/src/main.ts",
  output: {
    path: path.resolve(__dirname, "dist/client"),
    filename: "js/bundle.js",
    publicPath: "/",
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: "vue-loader",
      },
      {
        test: /\.ts$/,
        loader: "ts-loader",
        options: {
          appendTsSuffixTo: [/\.vue$/],
          transpileOnly: true,
        },
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js", ".vue", ".json"],
    alias: {
      vue: "vue/dist/vue.esm-bundler.js",
    },
  },
  plugins: [
    new VueLoaderPlugin(),
    new CopyWebpackPlugin({
      patterns: [{ from: "client/index.html", to: "index.html" }],
    }),
  ],
  devtool: "source-map",
};
