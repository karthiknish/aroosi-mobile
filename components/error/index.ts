// Error Boundary Components
export {
  ErrorBoundary,
  withErrorBoundary,
  useErrorHandler,
} from "./ErrorBoundary";
export { default as OfflineBanner } from "./OfflineBanner";
export {
  default as RetryableComponent,
  withRetryable,
} from "./RetryableComponent";

// UI Components
export { default as LoadingState } from "../ui/LoadingState";
export { default as EmptyState } from "../ui/EmptyState";

// Hooks
export { useNetworkStatus } from "@/hooks/useNetworkStatus";
export { useRetry } from "@/hooks/useRetry";

// Utilities
export {
  AppError,
  errorHandler,
  withErrorHandlingHOC,
} from "../../utils/errorHandling";
export { networkManager } from "../../utils/NetworkManager";
export { errorReporter } from "../../utils/ErrorReporter";
// Enhanced API client removed - use base apiClient from @utils/api instead

// Types
export type {
  ErrorContext,
  ErrorReport,
  ErrorType,
} from "../../utils/errorHandling";
export type {
  NetworkState,
  RetryConfig,
  QueuedRequest,
} from "../../utils/NetworkManager";
export type {
  ErrorReportData,
  ReportingConfig,
} from "../../utils/ErrorReporter";
export type { UseRetryResult } from "@/hooks/useRetry";
export type { UseNetworkStatusResult } from "@/hooks/useNetworkStatus";
