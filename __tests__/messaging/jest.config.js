module.exports = {
  preset: "react-native",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/__tests__/messaging/setup.ts"],
  testMatch: [
    "<rootDir>/__tests__/messaging/**/*.test.ts",
    "<rootDir>/__tests__/messaging/**/*.test.tsx",
  ],
  collectCoverageFrom: [
    "services/**/*.ts",
    "utils/**/*.ts",
    "hooks/**/*.ts",
    "components/messaging/**/*.tsx",
    "!**/*.d.ts",
    "!**/node_modules/**",
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapping: {
    "^@/(.*)$": "<rootDir>/$1",
    "^~/(.*)$": "<rootDir>/$1",
  },
  transformIgnorePatterns: [
    "node_modules/(?!(react-native|@react-native|react-native-vector-icons)/)",
  ],
  testTimeout: 10000,
};
