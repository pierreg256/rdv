const path = require("path");
const { VueLoaderPlugin } = require("vue-loader");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const webpack = require("webpack");

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
    // Définir explicitement les drapeaux de fonctionnalités de Vue.js
    new webpack.DefinePlugin({
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
      __VUE_PROD_DEVTOOLS__: false
    }),
  ],
  devtool: "source-map",
  // Configuration du serveur de développement avec proxy
  devServer: {
    static: {
      directory: path.join(__dirname, "dist/client"),
    },
    port: 3000,
    historyApiFallback: true,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        secure: false,
        changeOrigin: true,
      },
      "/health": {
        target: "http://localhost:3001",
        secure: false,
      },
    },
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      "Cross-Origin-Resource-Policy": "cross-origin",
      "Cross-Origin-Embedder-Policy": "credentialless",
    },
  },
};
