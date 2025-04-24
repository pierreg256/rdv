const path = require("path");
const { VueLoaderPlugin } = require("vue-loader");
const CopyWebpackPlugin = require("copy-webpack-plugin");

// Liste des composants FluentUI à traiter comme des éléments personnalisés
const fluentComponents = [
  "fluent-badge",
  "fluent-button",
  "fluent-card",
  "fluent-tab",
  "fluent-tabs",
  "fluent-menu",
  "fluent-menu-item",
  "fluent-text-field",
  "fluent-select",
  "fluent-option",
  "fluent-data-grid",
];

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
        options: {
          compilerOptions: {
            isCustomElement: (tag) => fluentComponents.includes(tag),
          },
        },
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
