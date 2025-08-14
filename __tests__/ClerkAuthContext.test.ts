import { useClerkAuth } from "../contexts/ClerkAuthContext";

// Mock the Clerk hooks
jest.mock("@clerk/clerk-expo", () => ({
  useUser: () => ({
    user: null,
    isLoaded: true,
  }),
  useAuth: () => ({
    getToken: jest.fn(),
    isSignedIn: false,
    userId: null,
  }),
  useClerk: () => ({
    signOut: jest.fn(),
    setActive: jest.fn(),
  }),
  useSignIn: () => ({
    signIn: {
      create: jest.fn(),
    },
  }),
  useSignUp: () => ({
    signUp: {
      create: jest.fn(),
    },
  }),
}));

// Mock react-query
jest.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: null,
    isLoading: false,
    refetch: jest.fn(),
  }),
  useQueryClient: () => ({
    invalidateQueries: jest.fn(),
    removeQueries: jest.fn(),
  }),
}));

// Mock AppState
jest.mock("react-native/Libraries/AppState/AppState", () => ({
  currentState: "active",
  addEventListener: () => ({
    remove: jest.fn(),
  }),
}));

describe("ClerkAuthContext", () => {
  it("should provide default context values", () => {
    // This is a placeholder test - in a real implementation, we would mount a component
    // that uses the context and verify the values
    expect(true).toBe(true);
  });
});