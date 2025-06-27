import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast, ToastType } from '../components/ui/Toast';

interface ToastConfig {
  message: string;
  type: ToastType;
  duration?: number;
  position?: 'top' | 'bottom';
}

interface ToastContextType {
  showToast: (config: ToastConfig) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
  duration: number;
  position: 'top' | 'bottom';
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toastState, setToastState] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'info',
    duration: 3000,
    position: 'top',
  });

  const showToast = useCallback((config: ToastConfig) => {
    setToastState({
      visible: true,
      message: config.message,
      type: config.type,
      duration: config.duration || 3000,
      position: config.position || 'top',
    });
  }, []);

  const hideToast = useCallback(() => {
    setToastState(prev => ({ ...prev, visible: false }));
  }, []);

  const showSuccess = useCallback((message: string, duration = 3000) => {
    showToast({ message, type: 'success', duration });
  }, [showToast]);

  const showError = useCallback((message: string, duration = 4000) => {
    showToast({ message, type: 'error', duration });
  }, [showToast]);

  const showWarning = useCallback((message: string, duration = 3500) => {
    showToast({ message, type: 'warning', duration });
  }, [showToast]);

  const showInfo = useCallback((message: string, duration = 3000) => {
    showToast({ message, type: 'info', duration });
  }, [showToast]);

  const contextValue: ToastContextType = {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <Toast
        visible={toastState.visible}
        message={toastState.message}
        type={toastState.type}
        duration={toastState.duration}
        position={toastState.position}
        onHide={hideToast}
      />
    </ToastContext.Provider>
  );
};