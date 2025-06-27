export type ReportReason = 
  | 'inappropriate_content'
  | 'harassment'
  | 'fake_profile'
  | 'spam'
  | 'safety_concern'
  | 'inappropriate_behavior'
  | 'other';

export interface ReportUserRequest {
  reportedUserId: string;
  reason: ReportReason;
  description?: string;
}

export interface BlockUserRequest {
  blockedUserId: string;
}

export interface UnblockUserRequest {
  blockedUserId: string;
}

export interface BlockedUser {
  id: string;
  blockerId: string;
  blockedUserId: string;
  blockedProfile: {
    fullName: string;
    profileImageUrl?: string;
    userId: string;
  };
  createdAt: string;
}

export interface BlockStatus {
  isBlocked: boolean;
  isBlockedBy: boolean;
  canInteract: boolean;
}

export interface SafetyApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export const REPORT_REASONS: Record<ReportReason, string> = {
  inappropriate_content: 'Inappropriate Content',
  harassment: 'Harassment or Bullying',
  fake_profile: 'Fake Profile',
  spam: 'Spam or Scam',
  safety_concern: 'Safety Concern',
  inappropriate_behavior: 'Inappropriate Behavior',
  other: 'Other'
};

export const REPORT_REASON_DESCRIPTIONS: Record<ReportReason, string> = {
  inappropriate_content: 'Photos, messages, or profile content that violates community guidelines',
  harassment: 'Threatening, intimidating, or bullying behavior',
  fake_profile: 'Using fake photos, false information, or impersonating someone else',
  spam: 'Sending unwanted promotional content or attempting to scam users',
  safety_concern: 'Behavior that makes you feel unsafe or uncomfortable',
  inappropriate_behavior: 'Behavior that violates community standards',
  other: 'Please describe the issue in the comments section'
};