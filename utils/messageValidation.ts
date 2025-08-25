import {
  ValidationResult,
  MessagingErrorType,
  MessagingFeatures,
} from "../types/messaging";

// User relationship and blocking interfaces
export interface UserRelationship {
  userId: string;
  targetUserId: string;
  isMatched: boolean;
  isBlocked: boolean;
  blockedBy?: string; // ID of user who initiated the block
  matchedAt?: number;
  blockedAt?: number;
}

export interface SecurityValidationContext {
  currentUserId: string;
  targetUserId: string;
  conversationId: string;
  userRelationships?: UserRelationship[];
  checkUserRelationship?: (
    fromUserId: string,
    toUserId: string
  ) => Promise<UserRelationship | null>;
  checkBlockedStatus?: (
    fromUserId: string,
    toUserId: string
  ) => Promise<boolean>;
}

export class MessageValidator {
  /**
   * Validates text message content
   */
  static validateTextMessage(text: string): ValidationResult {
    if (!text || text.trim().length === 0) {
      return { valid: false, error: "Message cannot be empty" };
    }

    if (text.length > 1000) {
      return { valid: false, error: "Message too long (max 1000 characters)" };
    }

    // Sanitize HTML and potentially harmful content
    const sanitized = this.sanitizeText(text);

    return { valid: true, sanitizedText: sanitized };
  }

  /**
   * Validates voice message blob and duration
   */
  static validateVoiceMessage(blob: Blob, duration: number): ValidationResult {
    if (duration > 300) {
      // 5 minutes max
      return { valid: false, error: "Voice message too long (max 5 minutes)" };
    }

    if (duration < 1) {
      return { valid: false, error: "Voice message too short (min 1 second)" };
    }

    if (blob.size > 10 * 1024 * 1024) {
      // 10MB max
      return { valid: false, error: "Voice message file too large (max 10MB)" };
    }

    if (blob.size === 0) {
      return { valid: false, error: "Voice message file is empty" };
    }

    return { valid: true };
  }

  /**
   * Validates image message file
   */
  static validateImageMessage(
    file: File | Blob,
    fileName?: string
  ): ValidationResult {
    const maxSize = 5 * 1024 * 1024; // 5MB max for images
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

    if (file.size > maxSize) {
      return { valid: false, error: "Image file too large (max 5MB)" };
    }

    if (file.size === 0) {
      return { valid: false, error: "Image file is empty" };
    }

    if (file.type && !allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: "Invalid image format. Supported: JPEG, PNG, GIF, WebP",
      };
    }

    return { valid: true };
  }

  /**
   * Validates conversation ID format
   */
  static validateConversationId(conversationId: string): ValidationResult {
    if (!conversationId || conversationId.trim().length === 0) {
      return { valid: false, error: "Conversation ID cannot be empty" };
    }

    // Basic format validation - adjust based on your ID format
    if (conversationId.length < 10 || conversationId.length > 50) {
      return { valid: false, error: "Invalid conversation ID format" };
    }

    return { valid: true };
  }

  /**
   * Validates user ID format
   */
  static validateUserId(userId: string): ValidationResult {
    if (!userId || userId.trim().length === 0) {
      return { valid: false, error: "User ID cannot be empty" };
    }

    // Basic format validation - adjust based on your ID format
    if (userId.length < 10 || userId.length > 50) {
      return { valid: false, error: "Invalid user ID format" };
    }

    return { valid: true };
  }

  /**
   * Sanitizes text content to remove potentially harmful content
   */
  private static sanitizeText(text: string): string {
    return (
      text
        // Remove script tags
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        // Remove iframe tags
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
        // Remove javascript: protocols
        .replace(/javascript:/gi, "")
        // Remove event handlers
        .replace(/on\w+\s*=/gi, "")
        // Remove other HTML tags but keep content
        .replace(/<[^>]*>/g, "")
        // Trim whitespace
        .trim()
    );
  }

  /**
   * Validates user relationship and blocking status
   */
  static async validateUserRelationship(
    context: SecurityValidationContext
  ): Promise<ValidationResult> {
    const { currentUserId, targetUserId } = context;

    // Check if users are the same (shouldn't message yourself)
    if (currentUserId === targetUserId) {
      return { valid: false, error: "Cannot send message to yourself" };
    }

    // Check if relationship exists in provided data
    if (context.userRelationships) {
      const relationship = context.userRelationships.find(
        (rel) =>
          (rel.userId === currentUserId && rel.targetUserId === targetUserId) ||
          (rel.userId === targetUserId && rel.targetUserId === currentUserId)
      );

      if (!relationship) {
        return {
          valid: false,
          error: "No relationship found between users",
        };
      }

      if (!relationship.isMatched) {
        return {
          valid: false,
          error: "Users must be matched to send messages",
        };
      }

      if (relationship.isBlocked) {
        const blockedByCurrentUser = relationship.blockedBy === currentUserId;
        const blockedByTargetUser = relationship.blockedBy === targetUserId;

        if (blockedByCurrentUser) {
          return {
            valid: false,
            error: "Cannot send message to blocked user",
          };
        }

        if (blockedByTargetUser) {
          return {
            valid: false,
            error: "This user has blocked you",
          };
        }
      }

      return { valid: true };
    }

    // Use async relationship checker if provided
    if (context.checkUserRelationship) {
      try {
        const relationship = await context.checkUserRelationship(
          currentUserId,
          targetUserId
        );

        if (!relationship) {
          return {
            valid: false,
            error: "No relationship found between users",
          };
        }

        if (!relationship.isMatched) {
          return {
            valid: false,
            error: "Users must be matched to send messages",
          };
        }

        if (relationship.isBlocked) {
          const blockedByCurrentUser = relationship.blockedBy === currentUserId;
          const blockedByTargetUser = relationship.blockedBy === targetUserId;

          if (blockedByCurrentUser) {
            return {
              valid: false,
              error: "Cannot send message to blocked user",
            };
          }

          if (blockedByTargetUser) {
            return {
              valid: false,
              error: "This user has blocked you",
            };
          }
        }

        return { valid: true };
      } catch (error) {
        return {
          valid: false,
          error: `Failed to validate user relationship: ${error}`,
        };
      }
    }

    // Use async blocked status checker if provided
    if (context.checkBlockedStatus) {
      try {
        const isBlocked = await context.checkBlockedStatus(
          currentUserId,
          targetUserId
        );

        if (isBlocked) {
          return {
            valid: false,
            error: "Cannot send message - user relationship blocked",
          };
        }

        return { valid: true };
      } catch (error) {
        return {
          valid: false,
          error: `Failed to check blocked status: ${error}`,
        };
      }
    }

    // If no validation methods provided, assume valid (fallback)
    console.warn(
      "No user relationship validation methods provided - skipping validation"
    );
    return { valid: true };
  }

  /**
   * Comprehensive message validation including security checks
   */
  static async validateMessageWithSecurity(
    data: {
      conversationId: string;
      fromUserId: string;
      toUserId: string;
      text?: string;
      type?: "text" | "voice" | "image";
      audioStorageId?: string;
      duration?: number;
      fileSize?: number;
      mimeType?: string;
    },
    securityContext?: SecurityValidationContext
  ): Promise<ValidationResult> {
    // First validate basic message data
    const basicValidation = this.validateMessageSendData(data);
    if (!basicValidation.valid) {
      return basicValidation;
    }

    // Validate user relationship and blocking if context provided
    if (securityContext) {
      const relationshipValidation = await this.validateUserRelationship(
        securityContext
      );
      if (!relationshipValidation.valid) {
        return relationshipValidation;
      }
    }

    // Additional security checks for text content
    if (data.text && MessageSecurity.containsHarmfulContent(data.text)) {
      return {
        valid: false,
        error: "Message contains potentially harmful content",
      };
    }

    // Validate MIME type for voice/image messages
    if (data.type === "voice" && data.mimeType) {
      if (!MessageSecurity.isAllowedMimeType(data.mimeType, "voice")) {
        return {
          valid: false,
          error: "Invalid voice message format",
        };
      }
    }

    if (data.type === "image" && data.mimeType) {
      if (!MessageSecurity.isAllowedMimeType(data.mimeType, "image")) {
        return {
          valid: false,
          error: "Invalid image message format",
        };
      }
    }

    return { valid: true };
  }

  /**
   * Checks if user can initiate chat based on subscription features
   */
  static canInitiateChat(features: MessagingFeatures): boolean {
    return features.canInitiateChat;
  }

  /**
   * Checks if user can send voice message based on subscription and duration
   */
  static canSendVoiceMessage(
    features: MessagingFeatures,
    duration: number
  ): boolean {
    if (!features.canSendVoiceMessages) {
      return false;
    }

    if (
      features.voiceMessageDurationLimit > 0 &&
      duration > features.voiceMessageDurationLimit
    ) {
      return false;
    }

    return true;
  }

  /**
   * Checks if user has reached daily message limit
   */
  static hasReachedDailyLimit(
    features: MessagingFeatures,
    currentCount: number
  ): boolean {
    if (features.dailyMessageLimit === -1) {
      return false; // Unlimited
    }

    return currentCount >= features.dailyMessageLimit;
  }

  /**
   * Validates message send data before API call
   */
  static validateMessageSendData(data: {
    conversationId: string;
    fromUserId: string;
    toUserId: string;
    text?: string;
    type?: "text" | "voice" | "image";
    audioStorageId?: string;
    duration?: number;
    fileSize?: number;
    mimeType?: string;
  }): ValidationResult {
    // Validate required fields
    const conversationValidation = this.validateConversationId(
      data.conversationId
    );
    if (!conversationValidation.valid) {
      return conversationValidation;
    }

    const fromUserValidation = this.validateUserId(data.fromUserId);
    if (!fromUserValidation.valid) {
      return fromUserValidation;
    }

    const toUserValidation = this.validateUserId(data.toUserId);
    if (!toUserValidation.valid) {
      return toUserValidation;
    }

    // Validate based on message type
    switch (data.type) {
      case "text":
        if (!data.text) {
          return { valid: false, error: "Text message requires text content" };
        }
        return this.validateTextMessage(data.text);

      case "voice":
        if (!data.audioStorageId) {
          return {
            valid: false,
            error: "Voice message requires audio storage ID",
          };
        }
        if (!data.duration || data.duration <= 0) {
          return {
            valid: false,
            error: "Voice message requires valid duration",
          };
        }
        if (data.duration > 300) {
          return {
            valid: false,
            error: "Voice message too long (max 5 minutes)",
          };
        }
        break;

      case "image":
        if (!data.fileSize || data.fileSize <= 0) {
          return {
            valid: false,
            error: "Image message requires valid file size",
          };
        }
        if (data.fileSize > 5 * 1024 * 1024) {
          return { valid: false, error: "Image file too large (max 5MB)" };
        }
        break;

      default:
        // Default to text if no type specified
        if (!data.text) {
          return { valid: false, error: "Message requires text content" };
        }
        return this.validateTextMessage(data.text);
    }

    return { valid: true };
  }
}

/**
 * Enhanced rate limiting utility with multiple window support
 */
export class ClientRateLimit {
  private messageCount = 0;
  private lastReset = Date.now();
  private readonly limit: number;
  private readonly windowMs: number;
  private messageHistory: number[] = [];
  private burstLimit: number;
  private burstWindowMs: number;

  constructor(
    limit: number = 20,
    windowMs: number = 60000,
    burstLimit: number = 5,
    burstWindowMs: number = 10000
  ) {
    this.limit = limit; // messages per window
    this.windowMs = windowMs; // window duration in ms
    this.burstLimit = burstLimit; // burst messages allowed
    this.burstWindowMs = burstWindowMs; // burst window duration
  }

  canSendMessage(): boolean {
    const now = Date.now();

    // Reset counter if window has passed
    if (now - this.lastReset > this.windowMs) {
      this.messageCount = 0;
      this.lastReset = now;
    }

    // Check burst limit
    if (this.isBurstLimitExceeded(now)) {
      return false;
    }

    return this.messageCount < this.limit;
  }

  recordMessage(): void {
    const now = Date.now();
    this.messageCount++;
    this.messageHistory.push(now);

    // Clean old history entries
    this.cleanMessageHistory(now);
  }

  getRemainingMessages(): number {
    const now = Date.now();

    // Reset counter if window has passed
    if (now - this.lastReset > this.windowMs) {
      this.messageCount = 0;
      this.lastReset = now;
    }

    return Math.max(0, this.limit - this.messageCount);
  }

  getTimeUntilReset(): number {
    const now = Date.now();
    const timeElapsed = now - this.lastReset;
    return Math.max(0, this.windowMs - timeElapsed);
  }

  getBurstStatus(): {
    remaining: number;
    timeUntilReset: number;
    isLimited: boolean;
  } {
    const now = Date.now();
    const recentMessages = this.messageHistory.filter(
      (timestamp) => now - timestamp <= this.burstWindowMs
    );

    return {
      remaining: Math.max(0, this.burstLimit - recentMessages.length),
      timeUntilReset:
        recentMessages.length > 0
          ? Math.max(
              0,
              this.burstWindowMs - (now - Math.min(...recentMessages))
            )
          : 0,
      isLimited: recentMessages.length >= this.burstLimit,
    };
  }

  private isBurstLimitExceeded(now: number): boolean {
    const recentMessages = this.messageHistory.filter(
      (timestamp) => now - timestamp <= this.burstWindowMs
    );
    return recentMessages.length >= this.burstLimit;
  }

  private cleanMessageHistory(now: number): void {
    // Keep only messages within the longest window
    const maxWindow = Math.max(this.windowMs, this.burstWindowMs);
    this.messageHistory = this.messageHistory.filter(
      (timestamp) => now - timestamp <= maxWindow
    );
  }

  getStats(): {
    currentCount: number;
    limit: number;
    remaining: number;
    windowMs: number;
    timeUntilReset: number;
    burstStatus: ReturnType<ClientRateLimit["getBurstStatus"]>;
  } {
    return {
      currentCount: this.messageCount,
      limit: this.limit,
      remaining: this.getRemainingMessages(),
      windowMs: this.windowMs,
      timeUntilReset: this.getTimeUntilReset(),
      burstStatus: this.getBurstStatus(),
    };
  }

  reset(): void {
    this.messageCount = 0;
    this.lastReset = Date.now();
    this.messageHistory = [];
  }
}

/**
 * Enhanced security utilities for message handling
 */
export class MessageSecurity {
  private static readonly MAX_CONSECUTIVE_MESSAGES = 10;
  private static readonly SPAM_DETECTION_WINDOW = 30000; // 30 seconds
  private static readonly MIN_MESSAGE_INTERVAL = 500; // 0.5 seconds

  /**
   * Checks if content contains potentially harmful patterns
   */
  static containsHarmfulContent(text: string): boolean {
    const harmfulPatterns = [
      /<script/i,
      /javascript:/i,
      /<iframe/i,
      /on\w+\s*=/i,
      /data:text\/html/i,
      /vbscript:/i,
      /eval\s*\(/i,
      /expression\s*\(/i,
      /<object/i,
      /<embed/i,
      /<link/i,
      /<meta/i,
      /document\./i,
      /window\./i,
    ];

    return harmfulPatterns.some((pattern) => pattern.test(text));
  }

  /**
   * Detects potential spam patterns in text
   */
  static containsSpamPatterns(text: string): boolean {
    const spamPatterns = [
      /(.)\1{10,}/i, // Repeated characters (10+ times)
      /^[A-Z\s!]{20,}$/i, // All caps messages over 20 chars
      /(https?:\/\/[^\s]+){3,}/i, // Multiple URLs
      /(\b\w+\b.*?){1,3}\1{3,}/i, // Repeated words/phrases
      /[!@#$%^&*()]{5,}/i, // Excessive special characters
    ];

    return spamPatterns.some((pattern) => pattern.test(text));
  }

  /**
   * Validates file MIME type against allowed types
   */
  static isAllowedMimeType(
    mimeType: string,
    messageType: "voice" | "image"
  ): boolean {
    const allowedTypes = {
      voice: [
        "audio/webm",
        "audio/mp4",
        "audio/mpeg",
        "audio/wav",
        "audio/ogg",
        "audio/aac",
        "audio/m4a",
      ],
      image: [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/bmp",
        "image/tiff",
      ],
    };

    return allowedTypes[messageType]?.includes(mimeType.toLowerCase()) || false;
  }

  /**
   * Validates file signature (magic bytes) to prevent MIME type spoofing
   */
  static async validateFileSignature(
    file: Blob,
    expectedType: "voice" | "image"
  ): Promise<boolean> {
    try {
      const arrayBuffer = await file.slice(0, 16).arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const signature = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const imageSignatures = [
        "ffd8ff", // JPEG
        "89504e47", // PNG
        "47494638", // GIF
        "52494646", // WebP (RIFF)
        "424d", // BMP
        "49492a00", // TIFF (little endian)
        "4d4d002a", // TIFF (big endian)
      ];

      const audioSignatures = [
        "1a45dfa3", // WebM
        "000001ba", // MPEG
        "000001b3", // MPEG
        "49443303", // MP3 (ID3v2.3)
        "49443304", // MP3 (ID3v2.4)
        "fff3", // MP3 (no ID3)
        "fff2", // MP3 (no ID3)
        "4f676753", // OGG
        "664c6143", // FLAC
        "52494646", // WAV (RIFF)
      ];

      const signatures =
        expectedType === "image" ? imageSignatures : audioSignatures;

      return signatures.some((sig) => signature.toLowerCase().startsWith(sig));
    } catch (error) {
      console.warn("File signature validation failed:", error);
      return false; // Fail secure
    }
  }

  /**
   * Detects potential flooding/spam behavior
   */
  static detectSpamBehavior(
    messageHistory: Array<{
      timestamp: number;
      text?: string;
      fromUserId: string;
    }>
  ): {
    isSpam: boolean;
    reason?: string;
    severity: "low" | "medium" | "high";
  } {
    if (messageHistory.length === 0) {
      return { isSpam: false, severity: "low" };
    }

    const now = Date.now();
    const recentMessages = messageHistory.filter(
      (msg) => now - msg.timestamp <= this.SPAM_DETECTION_WINDOW
    );

    // Check for rapid-fire messaging
    if (recentMessages.length >= this.MAX_CONSECUTIVE_MESSAGES) {
      return {
        isSpam: true,
        reason: "Too many messages in short time",
        severity: "high",
      };
    }

    // Check for messages sent too quickly
    const intervals = [];
    for (let i = 1; i < recentMessages.length; i++) {
      intervals.push(
        recentMessages[i].timestamp - recentMessages[i - 1].timestamp
      );
    }

    const rapidMessages = intervals.filter(
      (interval) => interval < this.MIN_MESSAGE_INTERVAL
    );
    if (rapidMessages.length >= 3) {
      return {
        isSpam: true,
        reason: "Messages sent too rapidly",
        severity: "medium",
      };
    }

    // Check for repeated content
    const textMessages = recentMessages.filter((msg) => msg.text);
    if (textMessages.length >= 3) {
      const uniqueTexts = new Set(
        textMessages.map((msg) => msg.text?.toLowerCase().trim())
      );
      if (uniqueTexts.size === 1) {
        return {
          isSpam: true,
          reason: "Repeated identical messages",
          severity: "high",
        };
      }
    }

    // Check for spam patterns in recent messages
    const spamMessages = textMessages.filter(
      (msg) => msg.text && this.containsSpamPatterns(msg.text)
    );

    if (spamMessages.length >= 2) {
      return {
        isSpam: true,
        reason: "Spam patterns detected",
        severity: "medium",
      };
    }

    return { isSpam: false, severity: "low" };
  }

  /**
   * Generates a secure temporary ID for optimistic updates
   */
  static generateTempId(): string {
    return `temp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Validates JWT token structure (basic validation)
   */
  static validateJWTStructure(token: string): boolean {
    if (!token || typeof token !== "string") {
      return false;
    }

    const parts = token.split(".");
    if (parts.length !== 3) {
      return false;
    }

    try {
      // Validate base64 encoding of header and payload
      atob(parts[0].replace(/-/g, "+").replace(/_/g, "/"));
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extracts token expiry from JWT (if present)
   */
  static extractTokenExpiry(token: string): number | null {
    try {
      if (!this.validateJWTStructure(token)) {
        return null;
      }

      const parts = token.split(".");
      const payload = JSON.parse(
        atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
      );

      return payload.exp ? payload.exp * 1000 : null; // Convert to milliseconds
    } catch {
      return null;
    }
  }

  /**
   * Checks if token is expired
   */
  static isTokenExpired(token: string): boolean {
    const expiry = this.extractTokenExpiry(token);
    if (!expiry) {
      return false; // If no expiry, assume valid
    }

    return Date.now() >= expiry;
  }

  /**
   * Sanitizes user input more thoroughly
   */
  static sanitizeInput(input: string): string {
    return (
      input
        // Remove script tags and content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        // Remove iframe tags and content
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
        // Remove object and embed tags
        .replace(/<(object|embed)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, "")
        // Remove javascript: and vbscript: protocols
        .replace(/(javascript|vbscript):/gi, "")
        // Remove event handlers
        .replace(/on\w+\s*=/gi, "")
        // Remove data URLs with HTML content
        .replace(/data:text\/html[^;]*;[^,]*,/gi, "")
        // Remove expression() CSS
        .replace(/expression\s*\([^)]*\)/gi, "")
        // Remove eval() calls
        .replace(/eval\s*\([^)]*\)/gi, "")
        // Remove HTML tags but keep content
        .replace(/<[^>]*>/g, "")
        // Normalize whitespace
        .replace(/\s+/g, " ")
        .trim()
    );
  }

  /**
   * Validates content length and complexity
   */
  static validateContentComplexity(text: string): {
    valid: boolean;
    reason?: string;
    metrics: {
      length: number;
      uniqueChars: number;
      repeatedChars: number;
      specialChars: number;
      urls: number;
    };
  } {
    const metrics = {
      length: text.length,
      uniqueChars: new Set(text.toLowerCase()).size,
      repeatedChars: (text.match(/(.)\1+/g) || []).length,
      specialChars: (text.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || [])
        .length,
      urls: (text.match(/https?:\/\/[^\s]+/g) || []).length,
    };

    // Check for excessive repetition
    if (metrics.repeatedChars > metrics.length * 0.3) {
      return {
        valid: false,
        reason: "Excessive character repetition",
        metrics,
      };
    }

    // Check for low complexity (possible spam)
    if (metrics.length > 50 && metrics.uniqueChars < 5) {
      return {
        valid: false,
        reason: "Content too repetitive",
        metrics,
      };
    }

    // Check for excessive URLs
    if (metrics.urls > 3) {
      return {
        valid: false,
        reason: "Too many URLs",
        metrics,
      };
    }

    // Check for excessive special characters
    if (metrics.specialChars > metrics.length * 0.5) {
      return {
        valid: false,
        reason: "Excessive special characters",
        metrics,
      };
    }

    return { valid: true, metrics };
  }
}
