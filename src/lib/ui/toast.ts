import { Toast } from "@providers/ToastContext";

export function showSuccessToast(message: string, duration = 4000) {
  Toast.success(message, duration);
}

export function showInfoToast(message: string, duration = 4000) {
  Toast.info(message, duration);
}

export function showWarningToast(message: string, duration = 5000) {
  Toast.warning(message, duration);
}

export function showPrimaryToast(message: string, duration = 6000) {
  Toast.primary(message, duration);
}

export function showUndoToast(
  message: string,
  onUndo: () => void | Promise<void>,
  actionLabel = "Undo",
  duration = 6000
) {
  Toast.undo(message, onUndo, actionLabel, duration);
}

export function showErrorToast(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
  duration = 5000
) {
  Toast.error(error, fallback, duration);
}

export default {
  showSuccessToast,
  showInfoToast,
  showWarningToast,
  showPrimaryToast,
  showUndoToast,
  showErrorToast,
};
