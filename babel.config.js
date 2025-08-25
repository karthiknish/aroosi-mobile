module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["."],
          alias: {
            "@components": "./components",
            "@hooks": "./src/hooks",
            "@services": "./services",
            "@contexts": "./contexts",
            "@constants": "./constants",
            "@src": "./src",
            "@utils": "./utils",
            "@/utils": "./utils",
          },
          extensions: [".js", ".jsx", ".ts", ".tsx", ".json"],
        },
      ],
      // Reanimated must be listed last
      "react-native-reanimated/plugin",
    ],
  };
};