import { useState, useEffect, useCallback, useRef } from "react";
import {
  MessagingSecurityService,
  SecurityConfig,
  AuthContext,
  SecurityViolation,
} from "../../services/messagingSecurityService";
import { UserRelationship } from "@utils/messageValidation";
import { ValidationResult } from "../../types/messaging";
import { useAuth } from "@contexts/AuthProvider";

interface UseMessagingSecurityOptions extends SecurityConfig {
  autoInitialize?: boolean;
}

interface MessagingSecurityState {
  isInitialized: boolean;
  rateLimitStatus: {
    enabled: boolean;
    remainingMessages: number;
    timeUntilReset: number;
  };
  blockedUsers: number;
  recentViolations: number;
  authStatus: {
    authenticated: boolean;
    userId?: string;
    tokenExpiry?: number;
  };
}

/**
 * Hook for using messaging security service
 */
export function useMessagingSecurity(
  options: UseMessagingSecurityOptions = {}
) {
  const { autoInitialize = true, ...securityConfig } = options;

  const [state, setState] = useState<MessagingSecurityState>({
    isInitialized: false,
    rateLimitStatus: {
      enabled: false,
      remainingMessages: -1,
      timeUntilReset: 0,
    },
    blockedUsers: 0,
    recentViolations: 0,
    authStatus: {
      authenticated: false,
    },
  });

  const [violations, setViolations] = useState<SecurityViolation[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const { userId } = useAuth();
  const securityServiceRef = useRef<MessagingSecurityService | null>(null);

  // Get auth token - for now we'll use a placeholder since the token isn't directly available
  useEffect(() => {
    if (userId) {
      // In a real implementation, you'd get the token from your auth system
      // For now, we'll use the userId as a placeholder token
      setToken(userId);
    } else {
      setToken(null);
    }
  }, [userId]);

  // Initialize security service
  useEffect(() => {
    if (securityServiceRef.current) return;

    const securityService = new MessagingSecurityService(securityConfig);

    // Setup event listeners
    securityService.on("initialized", () => {
      updateSecurityState();
    });

    securityService.on("security_violation", (violation: SecurityViolation) => {
      setViolations((prev) => [...prev.slice(-9), violation]); // Keep last 10
      updateSecurityState();
    });

    securityService.on("user_blocked", () => {
      updateSecurityState();
    });

    securityService.on("user_unblocked", () => {
      updateSecurityState();
    });

    securityService.on("violations_cleared", () => {
      setViolations([]);
      updateSecurityState();
    });

    const updateSecurityState = () => {
      const stats = securityService.getSecurityStats();
      setState((prev) => ({
        ...prev,
        isInitialized: true,
        ...stats,
      }));
    };

    securityServiceRef.current = securityService;

    // Auto-initialize if user is authenticated
    if (autoInitialize && userId && token) {
      const authContext: AuthContext = {
        userId,
        token,
        tokenExpiry: undefined, // Could be extracted from JWT
        permissions: undefined, // Could be loaded from user profile
      };
      securityService.initialize(authContext);
    }

    return () => {
      securityService.destroy();
      securityServiceRef.current = null;
    };
  }, [securityConfig, autoInitialize]);

  // Update auth context when user changes
  useEffect(() => {
    if (securityServiceRef.current && userId && token) {
      const authContext: AuthContext = {
        userId,
        token,
        tokenExpiry: undefined,
        permissions: undefined,
      };
      securityServiceRef.current.initialize(authContext);
    }
  }, [userId, token]);

  // Initialize security service manually
  const initialize = useCallback((authContext: AuthContext) => {
    if (securityServiceRef.current) {
      securityServiceRef.current.initialize(authContext);
    }
  }, []);

  // Update user relationships
  const updateUserRelationships = useCallback(
    (userId: string, relationships: UserRelationship[]) => {
      if (securityServiceRef.current) {
        securityServiceRef.current.updateUserRelationships(
          userId,
          relationships
        );
      }
    },
    []
  );

  // Block user
  const blockUser = useCallback((userId: string) => {
    if (securityServiceRef.current) {
      securityServiceRef.current.addBlockedUser(userId);
    }
  }, []);

  // Unblock user
  const unblockUser = useCallback((userId: string) => {
    if (securityServiceRef.current) {
      securityServiceRef.current.removeBlockedUser(userId);
    }
  }, []);

  // Validate message security
  const validateMessageSecurity = useCallback(
    async (messageData: {
      conversationId: string;
      fromUserId: string;
      toUserId: string;
      text?: string;
      type?: "text" | "voice" | "image";
      audioStorageId?: string;
      duration?: number;
      fileSize?: number;
      mimeType?: string;
    }): Promise<ValidationResult> => {
      if (!securityServiceRef.current) {
        return { valid: false, error: "Security service not initialized" };
      }

      return await securityServiceRef.current.validateMessageSecurity(
        messageData
      );
    },
    []
  );

  // Validate content
  const validateContent = useCallback((text: string): ValidationResult => {
    if (!securityServiceRef.current) {
      return { valid: false, error: "Security service not initialized" };
    }

    return securityServiceRef.current.validateContent(text);
  }, []);

  // Validate file upload
  const validateFileUpload = useCallback(
    (
      file: Blob | File,
      messageType: "voice" | "image",
      mimeType?: string
    ): ValidationResult => {
      if (!securityServiceRef.current) {
        return { valid: false, error: "Security service not initialized" };
      }

      return securityServiceRef.current.validateFileUpload(
        file,
        messageType,
        mimeType
      );
    },
    []
  );

  // Validate authentication
  const validateAuthentication = useCallback((): ValidationResult => {
    if (!securityServiceRef.current) {
      return { valid: false, error: "Security service not initialized" };
    }

    return securityServiceRef.current.validateAuthentication();
  }, []);

  // Check permissions
  const hasPermission = useCallback((permission: string): boolean => {
    if (!securityServiceRef.current) {
      return false;
    }

    return securityServiceRef.current.hasPermission(permission);
  }, []);

  // Validate message permissions
  const validateMessagePermissions = useCallback(
    (messageType: "text" | "voice" | "image"): ValidationResult => {
      if (!securityServiceRef.current) {
        return { valid: false, error: "Security service not initialized" };
      }

      return securityServiceRef.current.validateMessagePermissions(messageType);
    },
    []
  );

  // Clear violations
  const clearViolations = useCallback(() => {
    if (securityServiceRef.current) {
      securityServiceRef.current.clearViolations();
    }
  }, []);

  // Update security config
  const updateConfig = useCallback((newConfig: Partial<SecurityConfig>) => {
    if (securityServiceRef.current) {
      securityServiceRef.current.updateConfig(newConfig);
    }
  }, []);

  // Get recent violations
  const getRecentViolations = useCallback((limit: number = 10) => {
    if (!securityServiceRef.current) {
      return [];
    }

    return securityServiceRef.current.getRecentViolations(limit);
  }, []);

  return {
    // State
    ...state,
    violations,

    // Actions
    initialize,
    updateUserRelationships,
    blockUser,
    unblockUser,
    validateMessageSecurity,
    validateContent,
    validateFileUpload,
    validateAuthentication,
    validateMessagePermissions,
    clearViolations,
    updateConfig,

    // Utilities
    hasPermission,
    getRecentViolations,

    // Computed properties
    canSendMessage: state.rateLimitStatus.remainingMessages !== 0,
    isRateLimited:
      state.rateLimitStatus.enabled &&
      state.rateLimitStatus.remainingMessages === 0,
    hasViolations: violations.length > 0,
    isSecure: state.recentViolations === 0 && state.authStatus.authenticated,
  };
}

/**
 * Hook for validating specific message before sending
 */
export function useMessageValidation() {
  const { validateMessageSecurity, validateContent, validateFileUpload } =
    useMessagingSecurity();

  const validateMessage = useCallback(
    async (messageData: {
      conversationId: string;
      fromUserId: string;
      toUserId: string;
      text?: string;
      type?: "text" | "voice" | "image";
      audioStorageId?: string;
      duration?: number;
      fileSize?: number;
      mimeType?: string;
    }): Promise<{
      valid: boolean;
      error?: string;
      errorType?: string;
      canRetry?: boolean;
    }> => {
      const result = await validateMessageSecurity(messageData);

      if (!result.valid) {
        // Classify error for better user experience
        const error = result.error || "Validation failed";
        let errorType = "validation";
        let canRetry = false;

        if (error.includes("rate limit")) {
          errorType = "rate_limit";
          canRetry = true;
        } else if (
          error.includes("blocked") ||
          error.includes("relationship")
        ) {
          errorType = "blocked";
          canRetry = false;
        } else if (error.includes("auth") || error.includes("token")) {
          errorType = "auth";
          canRetry = false;
        } else if (error.includes("permission")) {
          errorType = "permission";
          canRetry = false;
        }

        return {
          valid: false,
          error,
          errorType,
          canRetry,
        };
      }

      return { valid: true };
    },
    [validateMessageSecurity]
  );

  const validateTextContent = useCallback(
    (text: string) => {
      const result = validateContent(text);
      return {
        valid: result.valid,
        error: result.error,
        sanitizedText: result.sanitizedText,
      };
    },
    [validateContent]
  );

  const validateFile = useCallback(
    (file: Blob | File, messageType: "voice" | "image", mimeType?: string) => {
      const result = validateFileUpload(file, messageType, mimeType);
      return {
        valid: result.valid,
        error: result.error,
      };
    },
    [validateFileUpload]
  );

  return {
    validateMessage,
    validateTextContent,
    validateFile,
  };
}

/**
 * Hook for monitoring security status
 */
export function useSecurityMonitor() {
  const {
    rateLimitStatus,
    blockedUsers,
    recentViolations,
    authStatus,
    violations,
    isRateLimited,
    hasViolations,
    isSecure,
    clearViolations,
  } = useMessagingSecurity();

  // Get security status summary
  const getSecurityStatus = useCallback(() => {
    if (!authStatus.authenticated) {
      return {
        status: "unauthenticated",
        message: "Please log in to continue",
        color: "error",
      };
    }

    if (isRateLimited) {
      return {
        status: "rate_limited",
        message: `Rate limited. ${rateLimitStatus.remainingMessages} messages remaining`,
        color: "warning",
      };
    }

    if (hasViolations) {
      return {
        status: "violations",
        message: `${recentViolations} recent security violations`,
        color: "warning",
      };
    }

    if (isSecure) {
      return {
        status: "secure",
        message: "All security checks passed",
        color: "success",
      };
    }

    return {
      status: "unknown",
      message: "Security status unknown",
      color: "info",
    };
  }, [
    authStatus,
    isRateLimited,
    hasViolations,
    isSecure,
    rateLimitStatus,
    recentViolations,
  ]);

  return {
    securityStatus: getSecurityStatus(),
    rateLimitStatus,
    blockedUsers,
    recentViolations,
    authStatus,
    violations,
    isRateLimited,
    hasViolations,
    isSecure,
    clearViolations,
  };
}
