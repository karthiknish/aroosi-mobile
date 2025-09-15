// Legacy re-export shim to ensure a single Toast provider implementation across the app.
// Any imports from "contexts/ToastContext" will now use the canonical provider in providers/ToastContext.
export { ToastProvider, useToast, Toast } from "../providers/ToastContext";
export { ToastProvider as default } from "../providers/ToastContext";
