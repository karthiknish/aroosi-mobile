import { EventEmitter } from "events";
import {
  MessageValidator,
  SecurityValidationContext,
  UserRelationship,
  ClientRateLimit,
  MessageSecurity,
} from "../utils/messageValidation";
import { ValidationResult, MessagingErrorType } from "../types/messaging";
import { Message } from "../types/message";

export interface SecurityConfig {
  enableRateLimit?: boolean;
  rateLimitMessages?: number;
  rateLimitWindow?: number;
  enableContentFiltering?: boolean;
  enableRelationshipValidation?: boolean;
  enableAuthValidation?: boolean;
  maxMessageLength?: number;
  maxFileSize?: number;
}

export interface AuthContext {
  userId: string;
  token: string;
  tokenExpiry?: number;
  permissions?: string[];
}

export interface SecurityViolation {
  type:
    | "rate_limit"
    | "content_filter"
    | "relationship"
    | "auth"
    | "validation";
  userId: string;
  message: string;
  timestamp: number;
  details?: any;
}

/**
 * Comprehensive messaging security service
 */
export class MessagingSecurityService extends EventEmitter {
  private config: Required<SecurityConfig>;
  private rateLimiter: ClientRateLimit | null = null;
  private authContext: AuthContext | null = null;
  private userRelationships = new Map<string, UserRelationship[]>();
  private blockedUsers = new Set<string>();
  private securityViolations: SecurityViolation[] = [];

  constructor(config: SecurityConfig = {}) {
    super();

    this.config = {
      enableRateLimit: config.enableRateLimit !== false,
      rateLimitMessages: config.rateLimitMessages || 20,
      rateLimitWindow: config.rateLimitWindow || 60000, // 1 minute
      enableContentFiltering: config.enableContentFiltering !== false,
      enableRelationshipValidation:
        config.enableRelationshipValidation !== false,
      enableAuthValidation: config.enableAuthValidation !== false,
      maxMessageLength: config.maxMessageLength || 1000,
      maxFileSize: config.maxFileSize || 10 * 1024 * 1024, // 10MB
    };

    if (this.config.enableRateLimit) {
      this.rateLimiter = new ClientRateLimit(
        this.config.rateLimitMessages,
        this.config.rateLimitWindow
      );
    }
  }

  /**
   * Initialize security service with authentication context
   */
  initialize(authContext: AuthContext): void {
    this.authContext = authContext;
    this.emit("initialized", { userId: authContext.userId });
  }

  /**
   * Update user relationships cache
   */
  updateUserRelationships(
    userId: string,
    relationships: UserRelationship[]
  ): void {
    this.userRelationships.set(userId, relationships);

    // Update blocked users set
    relationships.forEach((rel) => {
      if (rel.isBlocked) {
        const blockedUserId =
          rel.userId === userId ? rel.targetUserId : rel.userId;
        this.blockedUsers.add(blockedUserId);
      }
    });
  }

  /**
   * Add blocked user
   */
  addBlockedUser(userId: string): void {
    this.blockedUsers.add(userId);
    this.emit("user_blocked", { userId });
  }

  /**
   * Remove blocked user
   */
  removeBlockedUser(userId: string): void {
    this.blockedUsers.delete(userId);
    this.emit("user_unblocked", { userId });
  }

  /**
   * Validate authentication context
   */
  validateAuthentication(): ValidationResult {
    if (!this.config.enableAuthValidation) {
      return { valid: true };
    }

    if (!this.authContext) {
      return {
        valid: false,
        error: "Authentication context not initialized",
      };
    }

    if (!this.authContext.token) {
      return {
        valid: false,
        error: "Authentication token missing",
      };
    }

    // Check token expiry if provided
    if (
      this.authContext.tokenExpiry &&
      Date.now() > this.authContext.tokenExpiry
    ) {
      return {
        valid: false,
        error: "Authentication token expired",
      };
    }

    return { valid: true };
  }

  /**
   * Validate rate limiting
   */
  validateRateLimit(): ValidationResult {
    if (!this.config.enableRateLimit || !this.rateLimiter) {
      return { valid: true };
    }

    if (!this.rateLimiter.canSendMessage()) {
      const timeUntilReset = this.rateLimiter.getTimeUntilReset();
      const remainingMessages = this.rateLimiter.getRemainingMessages();

      this.recordSecurityViolation("rate_limit", "Rate limit exceeded", {
        remainingMessages,
        timeUntilReset,
      });

      return {
        valid: false,
        error: `Rate limit exceeded. Try again in ${Math.ceil(
          timeUntilReset / 1000
        )} seconds`,
      };
    }

    return { valid: true };
  }

  /**
   * Comprehensive message security validation
   */
  async validateMessageSecurity(messageData: {
    conversationId: string;
    fromUserId: string;
    toUserId: string;
    text?: string;
    type?: "text" | "voice" | "image";
    audioStorageId?: string;
    duration?: number;
    fileSize?: number;
    mimeType?: string;
  }): Promise<ValidationResult> {
    // 1. Validate authentication
    const authValidation = this.validateAuthentication();
    if (!authValidation.valid) {
      this.recordSecurityViolation(
        "auth",
        authValidation.error || "Auth failed"
      );
      return authValidation;
    }

    // 2. Validate rate limiting
    const rateLimitValidation = this.validateRateLimit();
    if (!rateLimitValidation.valid) {
      return rateLimitValidation;
    }

    // 3. Create security context for relationship validation
    const securityContext: SecurityValidationContext = {
      currentUserId: messageData.fromUserId,
      targetUserId: messageData.toUserId,
      conversationId: messageData.conversationId,
      userRelationships: this.userRelationships.get(messageData.fromUserId),
      checkBlockedStatus: this.checkBlockedStatus.bind(this),
    };

    // 4. Comprehensive validation with security checks
    const validation = await MessageValidator.validateMessageWithSecurity(
      messageData,
      this.config.enableRelationshipValidation ? securityContext : undefined
    );

    if (!validation.valid) {
      this.recordSecurityViolation(
        "validation",
        validation.error || "Validation failed",
        {
          messageData: {
            conversationId: messageData.conversationId,
            fromUserId: messageData.fromUserId,
            toUserId: messageData.toUserId,
            type: messageData.type,
          },
        }
      );
      return validation;
    }

    // 5. Record successful message for rate limiting
    if (this.rateLimiter) {
      this.rateLimiter.recordMessage();
    }

    return { valid: true };
  }

  /**
   * Check if user is blocked
   */
  private async checkBlockedStatus(
    fromUserId: string,
    toUserId: string
  ): Promise<boolean> {
    // Check local blocked users set
    if (this.blockedUsers.has(toUserId)) {
      return true;
    }

    // Check relationships for blocking
    const relationships = this.userRelationships.get(fromUserId);
    if (relationships) {
      const relationship = relationships.find(
        (rel) =>
          (rel.userId === fromUserId && rel.targetUserId === toUserId) ||
          (rel.userId === toUserId && rel.targetUserId === fromUserId)
      );

      return relationship?.isBlocked || false;
    }

    return false;
  }

  /**
   * Validate content for harmful patterns
   */
  validateContent(text: string): ValidationResult {
    if (!this.config.enableContentFiltering) {
      return { valid: true };
    }

    if (MessageSecurity.containsHarmfulContent(text)) {
      this.recordSecurityViolation(
        "content_filter",
        "Harmful content detected",
        {
          contentLength: text.length,
        }
      );

      return {
        valid: false,
        error: "Message contains potentially harmful content",
      };
    }

    return { valid: true };
  }

  /**
   * Validate file upload security
   */
  validateFileUpload(
    file: Blob | File,
    messageType: "voice" | "image",
    mimeType?: string
  ): ValidationResult {
    // Check file size
    const maxSize =
      messageType === "image" ? 5 * 1024 * 1024 : this.config.maxFileSize;
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File too large (max ${Math.round(maxSize / 1024 / 1024)}MB)`,
      };
    }

    // Check MIME type
    if (mimeType && !MessageSecurity.isAllowedMimeType(mimeType, messageType)) {
      this.recordSecurityViolation("validation", "Invalid file type", {
        mimeType,
        messageType,
        fileSize: file.size,
      });

      return {
        valid: false,
        error: `Invalid ${messageType} file format`,
      };
    }

    return { valid: true };
  }

  /**
   * Record security violation
   */
  private recordSecurityViolation(
    type: SecurityViolation["type"],
    message: string,
    details?: any
  ): void {
    const violation: SecurityViolation = {
      type,
      userId: this.authContext?.userId || "unknown",
      message,
      timestamp: Date.now(),
      details,
    };

    this.securityViolations.push(violation);

    // Keep only last 100 violations
    if (this.securityViolations.length > 100) {
      this.securityViolations = this.securityViolations.slice(-100);
    }

    this.emit("security_violation", violation);
  }

  /**
   * Get security statistics
   */
  getSecurityStats(): {
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
  } {
    return {
      rateLimitStatus: {
        enabled: this.config.enableRateLimit,
        remainingMessages: this.rateLimiter?.getRemainingMessages() || -1,
        timeUntilReset: this.rateLimiter?.getTimeUntilReset() || 0,
      },
      blockedUsers: this.blockedUsers.size,
      recentViolations: this.securityViolations.filter(
        (v) => Date.now() - v.timestamp < 3600000 // Last hour
      ).length,
      authStatus: {
        authenticated: !!this.authContext,
        userId: this.authContext?.userId,
        tokenExpiry: this.authContext?.tokenExpiry,
      },
    };
  }

  /**
   * Get recent security violations
   */
  getRecentViolations(limit: number = 10): SecurityViolation[] {
    return this.securityViolations.slice(-limit).reverse(); // Most recent first
  }

  /**
   * Clear security violations
   */
  clearViolations(): void {
    this.securityViolations = [];
    this.emit("violations_cleared");
  }

  /**
   * Update security configuration
   */
  updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Recreate rate limiter if settings changed
    if (
      newConfig.enableRateLimit !== undefined ||
      newConfig.rateLimitMessages !== undefined ||
      newConfig.rateLimitWindow !== undefined
    ) {
      if (this.config.enableRateLimit) {
        this.rateLimiter = new ClientRateLimit(
          this.config.rateLimitMessages,
          this.config.rateLimitWindow
        );
      } else {
        this.rateLimiter = null;
      }
    }

    this.emit("config_updated", this.config);
  }

  /**
   * Check if user has permission for specific action
   */
  hasPermission(permission: string): boolean {
    if (!this.authContext?.permissions) {
      return true; // Default allow if no permissions defined
    }

    return (
      this.authContext.permissions.includes(permission) ||
      this.authContext.permissions.includes("*")
    ); // Wildcard permission
  }

  /**
   * Validate user permissions for message type
   */
  validateMessagePermissions(
    messageType: "text" | "voice" | "image"
  ): ValidationResult {
    const permissionMap = {
      text: "send_text_message",
      voice: "send_voice_message",
      image: "send_image_message",
    };

    const requiredPermission = permissionMap[messageType];

    if (!this.hasPermission(requiredPermission)) {
      return {
        valid: false,
        error: `Permission denied for ${messageType} messages`,
      };
    }

    return { valid: true };
  }

  /**
   * Destroy security service and cleanup
   */
  destroy(): void {
    this.removeAllListeners();
    this.userRelationships.clear();
    this.blockedUsers.clear();
    this.securityViolations = [];
    this.authContext = null;
    this.rateLimiter = null;
  }
}

/**
 * Security error handler for messaging operations
 */
export class MessagingSecurityErrorHandler {
  /**
   * Handle security validation errors
   */
  static handleSecurityError(
    error: ValidationResult,
    context: {
      operation: string;
      userId?: string;
      messageType?: string;
    }
  ): {
    errorType: MessagingErrorType;
    userMessage: string;
    shouldRetry: boolean;
    retryDelay?: number;
  } {
    const errorMessage = error.error || "Security validation failed";

    // Classify error type based on message content
    if (errorMessage.includes("rate limit")) {
      return {
        errorType: MessagingErrorType.RATE_LIMIT_EXCEEDED,
        userMessage:
          "You are sending messages too quickly. Please wait a moment.",
        shouldRetry: true,
        retryDelay: 60000, // 1 minute
      };
    }

    if (
      errorMessage.includes("blocked") ||
      errorMessage.includes("relationship")
    ) {
      return {
        errorType: MessagingErrorType.USER_BLOCKED,
        userMessage: "Unable to send message to this user.",
        shouldRetry: false,
      };
    }

    if (errorMessage.includes("auth") || errorMessage.includes("token")) {
      return {
        errorType: MessagingErrorType.AUTHENTICATION_ERROR,
        userMessage: "Please log in again to continue.",
        shouldRetry: false,
      };
    }

    if (errorMessage.includes("permission")) {
      return {
        errorType: MessagingErrorType.PERMISSION_DENIED,
        userMessage: "You do not have permission to perform this action.",
        shouldRetry: false,
      };
    }

    if (errorMessage.includes("harmful") || errorMessage.includes("content")) {
      return {
        errorType: MessagingErrorType.MESSAGE_TOO_LONG,
        userMessage:
          "Message contains invalid content. Please revise and try again.",
        shouldRetry: false,
      };
    }

    // Default to unknown error
    return {
      errorType: MessagingErrorType.UNKNOWN_ERROR,
      userMessage: "Unable to send message. Please try again.",
      shouldRetry: true,
      retryDelay: 5000, // 5 seconds
    };
  }

  /**
   * Get user-friendly error message
   */
  static getUserFriendlyMessage(errorType: MessagingErrorType): string {
    const messages = {
      [MessagingErrorType.RATE_LIMIT_EXCEEDED]:
        "You are sending messages too quickly. Please wait a moment.",
      [MessagingErrorType.USER_BLOCKED]: "Unable to send message to this user.",
      [MessagingErrorType.AUTHENTICATION_ERROR]:
        "Please log in again to continue.",
      [MessagingErrorType.PERMISSION_DENIED]:
        "You do not have permission to send this type of message.",
      [MessagingErrorType.MESSAGE_TOO_LONG]:
        "Message is too long or contains invalid content.",
      [MessagingErrorType.NETWORK_ERROR]:
        "Network error. Please check your connection.",
      [MessagingErrorType.SUBSCRIPTION_REQUIRED]:
        "This feature requires a premium subscription.",
      [MessagingErrorType.VOICE_RECORDING_FAILED]:
        "Voice recording failed. Please try again.",
      [MessagingErrorType.FILE_UPLOAD_FAILED]:
        "File upload failed. Please try again.",
      [MessagingErrorType.UNKNOWN_ERROR]:
        "Something went wrong. Please try again.",
    };

    return messages[errorType] || messages[MessagingErrorType.UNKNOWN_ERROR];
  }
}
