module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@providers": "./providers",
            "@contexts": "./contexts",
            "@components": "./components",
            "@constants": "./constants",
            "@hooks": "./hooks",
            "@services": "./services",
            "@utils": "./utils",
            "@types": "./types",
            "@src": "./src",
          },
          extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
        },
      ],
      "react-native-reanimated/plugin",
    ],
  };
};