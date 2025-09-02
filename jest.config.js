module.exports = {
  preset: "jest-expo",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  // Only pick up real test files, not helper/config scripts inside __tests__
  testMatch: ["**/?(*.)+(test|spec).[jt]s?(x)"],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/__tests__/messaging/",
    "/__tests__/integration/",
    "/__tests__/e2e/",
  ],
  collectCoverageFrom: [
    "components/**/*.{ts,tsx}",
    "contexts/**/*.{ts,tsx}",
    "hooks/**/*.{ts,tsx}",
    "utils/**/*.{ts,tsx}",
    "services/**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/__tests__/**",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  moduleNameMapper: {
    // Root and src aliases
    "^@/(.*)$": "<rootDir>/$1",
    "^@components/(.*)$": "<rootDir>/components/$1",
    "^@services/(.*)$": "<rootDir>/services/$1",
    "^@contexts/(.*)$": "<rootDir>/contexts/$1",
    "^@screens/(.*)$": "<rootDir>/src/screens/$1",
    "^@utils/(.*)$": "<rootDir>/utils/$1",
    "^@types/(.*)$": "<rootDir>/types/$1",
    // Alt '@/..' aliases used in src
    "^@/components/(.*)$": "<rootDir>/src/components/$1",
    "^@/hooks/(.*)$": "<rootDir>/src/hooks/$1",
    "^@/utils/(.*)$": "<rootDir>/utils/$1",
    "^@/providers/(.*)$": "<rootDir>/providers/$1",
    "^@/navigation/(.*)$": "<rootDir>/src/navigation/$1",
    "^@/types/(.*)$": "<rootDir>/types/$1",
    // RN/Expo specific mocks
    "^@react-native-async-storage/async-storage$":
      "@react-native-async-storage/async-storage/jest/async-storage-mock",
    "^expo-secure-store$": "<rootDir>/__mocks__/expo-secure-store.js",
  },
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": [
      "babel-jest",
      { configFile: require.resolve("./babel.config.js") },
    ],
  },
  // Let jest-expo transpile RN/Expo modules
  transformIgnorePatterns: [
    "node_modules/(?!(react-native|@react-native|react-native-.*|@react-navigation/.*|expo(nent)?|@expo|expo-.*|@expo-.*|react-native-vector-icons)/)",
  ],
  // Exclude specific heavy/unstable suites from default run; they have dedicated scripts
  testPathIgnorePatterns: [
    "/node_modules/",
    "/__tests__/messaging/",
    "/__tests__/integration/",
    "/__tests__/e2e/",
    "/__tests__/messagingSecurityService.test.ts$",
    "/__tests__/offlineMessageQueue.test.ts$",
    "/__tests__/security.test.ts$",
    "/__tests__/auth.test.ts$",
    "/__tests__/api.test.ts$",
  ],
};
