// Authentication types matching web version exactly

export interface User {
  id: string;
  email: string;
  fullName?: string;
  profileId?: string;
  role?: "user" | "admin";
  isEmailVerified?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other";
  agreeToTerms: boolean;
}

export interface OTPVerificationData {
  email: string;
  code: string;
}

export interface ResetPasswordData {
  email: string;
  code: string;
  newPassword: string;
}

export interface GoogleAuthData {
  idToken: string;
  accessToken?: string;
}

export interface AuthResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
  profile?: {
    id: string;
    isComplete: boolean;
    isOnboardingComplete: boolean;
  };
}

export interface RegisterResponse {
  user: User;
  requiresVerification: boolean;
  message: string;
}

export interface RefreshTokenResponse {
  tokens: AuthTokens;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  login: (
    credentials: LoginCredentials
  ) => Promise<AuthResponse<LoginResponse>>;
  register: (data: RegisterData) => Promise<AuthResponse<RegisterResponse>>;
  logout: () => Promise<void>;
  verifyOTP: (
    data: OTPVerificationData
  ) => Promise<AuthResponse<{ message: string }>>;
  resendOTP: (email: string) => Promise<AuthResponse<{ message: string }>>;
  forgotPassword: (email: string) => Promise<AuthResponse<{ message: string }>>;
  resetPassword: (
    data: ResetPasswordData
  ) => Promise<AuthResponse<{ message: string }>>;
  googleAuth: (data: GoogleAuthData) => Promise<AuthResponse<LoginResponse>>;
  refreshTokens: () => Promise<boolean>;
  clearError: () => void;
}

// JWT payload interface
export interface JWTPayload {
  sub: string; // user ID
  email: string;
  iat: number;
  exp: number;
  role?: string;
}

// Token validation result
export interface TokenValidationResult {
  isValid: boolean;
  isExpired: boolean;
  payload?: JWTPayload;
  error?: string;
}

// Auth error codes
export enum AuthErrorCode {
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  USER_NOT_FOUND = "USER_NOT_FOUND",
  EMAIL_ALREADY_EXISTS = "EMAIL_ALREADY_EXISTS",
  INVALID_OTP = "INVALID_OTP",
  OTP_EXPIRED = "OTP_EXPIRED",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  INVALID_TOKEN = "INVALID_TOKEN",
  NETWORK_ERROR = "NETWORK_ERROR",
  SERVER_ERROR = "SERVER_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  ACCOUNT_DISABLED = "ACCOUNT_DISABLED",
  TOO_MANY_ATTEMPTS = "TOO_MANY_ATTEMPTS",
}

// Auth error messages
export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  [AuthErrorCode.INVALID_CREDENTIALS]: "Invalid email or password",
  [AuthErrorCode.USER_NOT_FOUND]: "User not found",
  [AuthErrorCode.EMAIL_ALREADY_EXISTS]: "Email already exists",
  [AuthErrorCode.INVALID_OTP]: "Invalid verification code",
  [AuthErrorCode.OTP_EXPIRED]: "Verification code has expired",
  [AuthErrorCode.TOKEN_EXPIRED]: "Session has expired. Please login again",
  [AuthErrorCode.INVALID_TOKEN]: "Invalid authentication token",
  [AuthErrorCode.NETWORK_ERROR]: "Network error. Please check your connection",
  [AuthErrorCode.SERVER_ERROR]: "Server error. Please try again later",
  [AuthErrorCode.VALIDATION_ERROR]: "Please check your input and try again",
  [AuthErrorCode.ACCOUNT_DISABLED]: "Your account has been disabled",
  [AuthErrorCode.TOO_MANY_ATTEMPTS]:
    "Too many attempts. Please try again later",
};

// Storage keys for secure storage
export enum StorageKeys {
  ACCESS_TOKEN = "access_token",
  REFRESH_TOKEN = "refresh_token",
  USER_DATA = "user_data",
  TOKEN_EXPIRES_AT = "token_expires_at",
}

// Auth configuration
export interface AuthConfig {
  tokenRefreshThreshold: number; // Minutes before expiry to refresh
  maxRetryAttempts: number;
  retryDelay: number; // Milliseconds
  sessionTimeout: number; // Minutes
}

export const DEFAULT_AUTH_CONFIG: AuthConfig = {
  tokenRefreshThreshold: 5, // 5 minutes
  maxRetryAttempts: 3,
  retryDelay: 1000, // 1 second
  sessionTimeout: 60 * 24, // 24 hours
};
