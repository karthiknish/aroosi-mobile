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
      // Remove console.* in production builds
      ...(process.env.NODE_ENV === "production"
        ? [["transform-remove-console", { exclude: ["error", "warn"] }]]
        : []),
      // Worklets/Reanimated plugin must be listed last
      "react-native-worklets/plugin",
    ],
  };
};