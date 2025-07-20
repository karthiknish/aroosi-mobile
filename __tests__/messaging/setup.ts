import "react-native-gesture-handler/jestSetup";

// Mock React Native modules
jest.mock("react-native", () => {
  const RN = jest.requireActual("react-native");
  return {
    ...RN,
    Platform: {
      OS: "ios",
      select: jest.fn((obj) => obj.ios || obj.default),
    },
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 812 })),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
    Alert: {
      alert: jest.fn(),
    },
    Linking: {
      openURL: jest.fn(),
      canOpenURL: jest.fn(() => Promise.resolve(true)),
    },
  };
});

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock Audio recording/playback
jest.mock("react-native-audio-recorder-player", () => ({
  default: jest.fn().mockImplementation(() => ({
    startRecorder: jest.fn(() => Promise.resolve("file://path/to/audio.m4a")),
    stopRecorder: jest.fn(() => Promise.resolve()),
    startPlayer: jest.fn(() => Promise.resolve()),
    stopPlayer: jest.fn(() => Promise.resolve()),
    pausePlayer: jest.fn(() => Promise.resolve()),
    seekToPlayer: jest.fn(() => Promise.resolve()),
    setSubscriptionDuration: jest.fn(),
    addPlayBackListener: jest.fn(),
    removePlayBackListener: jest.fn(),
  })),
}));

// Mock permissions
jest.mock("react-native-permissions", () => ({
  PERMISSIONS: {
    IOS: {
      MICROPHONE: "ios.permission.MICROPHONE",
    },
    ANDROID: {
      RECORD_AUDIO: "android.permission.RECORD_AUDIO",
    },
  },
  RESULTS: {
    GRANTED: "granted",
    DENIED: "denied",
    BLOCKED: "blocked",
    UNAVAILABLE: "unavailable",
  },
  request: jest.fn(() => Promise.resolve("granted")),
  check: jest.fn(() => Promise.resolve("granted")),
}));

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1, // OPEN
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
}));

// Mock Blob for voice message testing
global.Blob = jest.fn().mockImplementation((parts, options) => ({
  size: parts.reduce(
    (acc, part) =>
      acc + (typeof part === "string" ? part.length : part.byteLength || 0),
    0
  ),
  type: options?.type || "",
  arrayBuffer: jest.fn(() => Promise.resolve(new ArrayBuffer(0))),
  text: jest.fn(() => Promise.resolve("")),
  stream: jest.fn(),
  slice: jest.fn(),
}));

// Mock File for file upload testing
global.File = jest.fn().mockImplementation((parts, name, options) => ({
  ...new (global.Blob as any)(parts, options),
  name,
  lastModified: Date.now(),
}));

// Mock URL for object URLs
global.URL = {
  createObjectURL: jest.fn(() => "blob:mock-url"),
  revokeObjectURL: jest.fn(),
} as any;

// Mock performance for performance testing
global.performance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn(() => []),
  getEntriesByType: jest.fn(() => []),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
} as any;

// Mock fetch globally
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(""),
    blob: () => Promise.resolve(new Blob()),
  } as Response)
);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
};

// Mock timers
jest.useFakeTimers();

// Setup test environment
beforeEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.useFakeTimers();
});
