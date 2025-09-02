// Ensure API env exists for tests that import utils/api
process.env.EXPO_PUBLIC_API_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

// Mock global fetch
global.fetch = jest.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock performance API
global.performance = {
  now: jest.fn(() => Date.now()),
};

// Setup test environment
beforeEach(() => {
  jest.clearAllMocks();
});

// Basic shims often needed in RN/Expo tests
if (typeof global.performance === "undefined") {
  global.performance = { now: jest.fn(() => Date.now()) };
}
if (typeof global.Blob === "undefined") {
  // minimal Blob shim
  global.Blob = function () {};
}
if (typeof global.URL === "undefined") {
  global.URL = { createObjectURL: jest.fn(), revokeObjectURL: jest.fn() };
}

// Provide a Response polyfill for tests that construct new Response(...)
if (typeof global.Response === "undefined") {
  try {
    // Prefer undici if available in Node 18+
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Response } = require("undici");
    // @ts-ignore
    global.Response = Response;
  } catch {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Response } = require("node-fetch");
      // @ts-ignore
      global.Response = Response;
    } catch {
      // minimal fallback
      global.Response = class MinimalResponse {
        constructor(body, init = {}) {
          this.body = body;
          this.status = init.status || 200;
          this.headers = init.headers || {};
        }
        async json() {
          try {
            return JSON.parse(this.body);
          } catch {
            return this.body;
          }
        }
      };
    }
  }
}
