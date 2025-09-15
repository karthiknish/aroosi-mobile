import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  // Base language options and globals
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2020,
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        __DEV__: "readonly",
      },
      ecmaVersion: "latest",
      sourceType: "module",
    },
  },
  // JavaScript files
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    rules: {
      "no-unused-vars": "warn",
      "no-console": "warn",
      // Keep stylistic rules as warnings for DX
      "prefer-const": "warn",
      "no-var": "error",
      "no-empty": "warn",
      "no-case-declarations": "warn",
      "no-async-promise-executor": "warn",
    },
  },
  // TypeScript files
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: (await import("@typescript-eslint/parser")).default,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      "@typescript-eslint": (await import("@typescript-eslint/eslint-plugin"))
        .default,
      "react-hooks": (await import("eslint-plugin-react-hooks")).default,
    },
    rules: {
      // Turn off base rule to avoid duplicate reports in TS files
      "no-unused-vars": "off",
      // Rely on TS for undefined checks; base rule is noisy in type positions
      "no-undef": "off",
      // Prefer warnings for DX; many utils intentionally keep placeholders
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": "warn",
      "no-debugger": "error",
      // Keep as warning to avoid CI failures for minor refactors pending
      "prefer-const": "warn",
      "no-var": "error",
      // Avoid conflicts with TS analyzer; escalate in future if needed
      "no-redeclare": "off",
      "@typescript-eslint/no-redeclare": "off",
      // Occasional regex literals in validation utilities
      "no-useless-escape": "warn",
      // Common patterns that can be acceptable during development
      "no-empty": "warn",
      "no-case-declarations": "warn",
      "no-async-promise-executor": "warn",
      // Ensure plugin rules are recognized but not overbearing
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/exhaustive-deps": "warn",
      // Enforce centralized theming: forbid direct Colors import
      "no-restricted-imports": [
        "warn",
        {
          paths: [
            {
              name: "@constants/Colors",
              message:
                "Use theme via useTheme/useThemedStyles from @contexts/ThemeContext instead of importing Colors directly.",
            },
            {
              name: "../../constants/Colors",
              message:
                "Use theme via useTheme/useThemedStyles from @contexts/ThemeContext instead of importing Colors directly.",
            },
            {
              name: "../constants/Colors",
              message:
                "Use theme via useTheme/useThemedStyles from @contexts/ThemeContext instead of importing Colors directly.",
            },
            {
              name: "../../../constants/Colors",
              message:
                "Use theme via useTheme/useThemedStyles from @contexts/ThemeContext instead of importing Colors directly.",
            },
            {
              name: "@constants",
              importNames: ["Colors"],
              message:
                "Use theme via useTheme/useThemedStyles from @contexts/ThemeContext instead of importing Colors directly.",
            },
            {
              name: "../constants",
              importNames: ["Colors"],
              message:
                "Use theme via useTheme/useThemedStyles from @contexts/ThemeContext instead of importing Colors directly.",
            },
            {
              name: "../../constants",
              importNames: ["Colors"],
              message:
                "Use theme via useTheme/useThemedStyles from @contexts/ThemeContext instead of importing Colors directly.",
            },
            {
              name: "../../../constants",
              importNames: ["Colors"],
              message:
                "Use theme via useTheme/useThemedStyles from @contexts/ThemeContext instead of importing Colors directly.",
            },
          ],
        },
      ],
    },
  },
  // Jest/Test files override
  {
    files: ["**/*.test.{ts,tsx,js,jsx}", "**/__tests__/**", "jest.setup.js"],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    rules: {
      "no-undef": "off",
    },
  },
  // Ignores
  {
    ignores: [
      "node_modules/",
      ".expo/",
      "dist/",
      "build/",
      "**/*.config.js",
      "**/*.config.ts",
      "metro.config.js",
      "jest.config.js",
      "babel.config.js",
      "eas.json",
      "app.json",
      "*.d.ts",
      "ios/",
      "android/",
      "*.config.js",
      "*.config.ts",
    ],
  },
];
