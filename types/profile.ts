// Profile type definitions matching web version exactly

export type Gender = "male" | "female" | "other";
export type PreferredGender = "male" | "female" | "other" | "any" | "";
export type MaritalStatus = "single" | "divorced" | "widowed" | "annulled";
export type Diet =
  | "vegetarian"
  | "non-vegetarian"
  | "vegan"
  | "eggetarian"
  | "other"
  | "";
export type SmokingDrinking = "no" | "occasionally" | "yes" | "";
export type PhysicalStatus = "normal" | "differently-abled" | "other" | "";
export type ProfileFor = "self" | "friend" | "family";
// Import from subscription types for consistency
import type { SubscriptionTier } from "./subscription";
export type SubscriptionPlan = SubscriptionTier;

export type Id<TableName extends string> = string;

export interface Profile {
  _id: Id<"profiles">;
  userId: Id<"users">;
  email: string;
  role?: string;
  profileFor: ProfileFor;
  fullName: string;
  dateOfBirth: string;
  gender: Gender;
  city: string;
  country: string;
  phoneNumber: string;
  aboutMe: string;
  height: string;
  maritalStatus: MaritalStatus;
  education: string;
  occupation: string;
  annualIncome: string | number;
  diet: Diet;
  smoking: SmokingDrinking;
  drinking: SmokingDrinking;
  physicalStatus: PhysicalStatus;
  partnerPreferenceAgeMin: number;
  partnerPreferenceAgeMax: number;
  partnerPreferenceCity: string[] | string;
  partnerPreferenceReligion?: string[];
  preferredGender: PreferredGender;
  profileImageIds?: string[];
  profileImageUrls?: string[];
  isProfileComplete: boolean;
  isOnboardingComplete: boolean;
  isApproved?: boolean;

  hideFromFreeUsers?: boolean;
  banned: boolean;
  createdAt: number;
  updatedAt: number;
  _creationTime?: number | string | Date;

  subscriptionPlan?: SubscriptionPlan;
  subscriptionExpiresAt?: number;
  boostsRemaining?: number;
  boostsMonth?: number;
  hasSpotlightBadge?: boolean;
  spotlightBadgeExpiresAt?: number;
  boostedUntil?: number;
  motherTongue?: string;
  religion?: string;
  ethnicity?: string;

  /**
   * Array of raw image URLs belonging to the user profile (legacy support).
   * Prefer using `profileImageUrls` but `images` is retained for backward-compat.
   */
  images?: string[];

  /**
   * Comma-separated string or array of user interests/hobbies.
   */
  interests?: string[] | string;
}

export interface ProfileFormValues {
  _id?: Id<"profiles">;
  userId?: Id<"users">;
  email?: string;
  role?: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  city: string;
  country: string;
  phoneNumber: string;
  aboutMe: string;
  height: string;
  maritalStatus: string;
  education: string;
  occupation: string;
  annualIncome: string | number;
  diet: string;
  smoking: string;
  drinking: string;
  physicalStatus: string;
  partnerPreferenceAgeMin: number | string;
  partnerPreferenceAgeMax: number | string;
  partnerPreferenceCity: string[] | string;
  preferredGender: string;
  profileImageIds?: string[];
  isProfileComplete?: boolean;
  isOnboardingComplete?: boolean;

  banned?: boolean;
  createdAt?: number;
  updatedAt?: number;
  profileFor: "self" | "friend" | "family";
  subscriptionPlan?: SubscriptionPlan;
  boostsRemaining?: number;
  motherTongue: string;
  religion: string;
  ethnicity: string;
}

// Search-related types
export interface SearchFilters {
  // Basic filters
  city?: string;
  country?: string;
  ageMin?: number;
  ageMax?: number;
  gender?: "male" | "female" | "other" | "any";

  // Additional filters
  maritalStatus?: string[];
  education?: string[];
  occupation?: string[];
  diet?: string[];
  smoking?: string[];
  drinking?: string[];

  // Premium filters (Premium Plus only)
  ethnicity?: string;
  motherTongue?: string;
  language?: string;
  annualIncomeMin?: number;
  heightMin?: string;
  heightMax?: string;

  // Pagination
  pageSize?: number;
}

export interface ProfileSearchResult {
  userId: string;
  email?: string;
  profile: {
    fullName: string;
    city?: string;
    dateOfBirth?: string;
    isProfileComplete?: boolean;
    hiddenFromSearch?: boolean;
    boostedUntil?: number;
    subscriptionPlan?: string;
    hideFromFreeUsers?: boolean;
    profileImageUrls?: string[];
    [key: string]: unknown;
  };
}

export interface SearchResponse {
  profiles: ProfileSearchResult[];
  total: number;
  hasMore: boolean;
  nextPage?: number | null;
}

// Interest system types (aligned with auto-matching)
export interface Interest {
  _id: string;
  fromUserId: string;
  toUserId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: number;
  updatedAt?: number;

  // Profile enrichment (from main project)
  fromProfile?: ProfileSummary;
  toProfile?: ProfileSummary;
}

export interface ProfileSummary {
  fullName: string;
  city: string;
  profileImageIds: string[];
  profileImageUrls: string[];
}

export interface Match {
  _id: string;
  participants: string[];
  createdAt: number;
  lastMessageAt?: number;
  conversationId: string;
  profiles: ProfileSummary[];
}

// Message system types (aligned with main project)
export interface Message {
  _id: string;
  conversationId: string;
  fromUserId: string;
  toUserId: string;
  text: string;
  type?: "text" | "voice" | "image";
  createdAt: number;
  readAt?: number;

  // Voice message fields
  audioStorageId?: string;
  duration?: number;
  fileSize?: number;
  mimeType?: string;

  // Image message fields
  imageStorageId?: string;
  imageUrl?: string;

  // Delivery tracking
  deliveredAt?: number;
  status?: "sent" | "delivered" | "read";
}

export interface Conversation {
  _id: string;
  participants: string[];
  lastMessage?: Message;
  lastMessageAt?: number;
  createdAt: number;
  updatedAt: number;
}

// Subscription system types (aligned with main project)
export interface SubscriptionStatus {
  plan: "free" | "premium" | "premiumPlus";
  isActive: boolean;
  expiresAt?: number;
  daysRemaining: number;
  boostsRemaining: number;
  hasSpotlightBadge: boolean;
  spotlightBadgeExpiresAt?: number;
}

export interface UsageStats {
  plan: "free" | "premium" | "premiumPlus";
  messaging: {
    sent: number;
    received: number;
    limit: number; // -1 means unlimited
  };
  profileViews: {
    count: number;
    limit: number;
  };
  searches: {
    count: number;
    limit: number;
  };
  boosts: {
    used: number;
    remaining: number;
    monthlyLimit: number;
  };
}

export interface FeatureUsageResponse {
  feature: string;
  plan: string;
  tracked: boolean;
  currentUsage: number;
  limit: number;
  remainingQuota: number;
  isUnlimited: boolean;
  resetDate: number;
}

// Safety and Security types (aligned with main project)
export interface BlockedUser {
  id: string;
  blockerId: string;
  blockedUserId: string;
  blockedProfile: {
    fullName: string;
    profileImageUrl?: string;
  };
  createdAt: number;
}

export interface BlockStatus {
  isBlocked: boolean;
  isBlockedBy?: boolean;
  canInteract?: boolean;
}

export type ReportReason =
  | "inappropriate_content"
  | "harassment"
  | "fake_profile"
  | "spam"
  | "safety_concern"
  | "inappropriate_behavior"
  | "other";

export interface ReportData {
  reportedUserId: string;
  reason: ReportReason;
  description?: string;
}

export interface UserReport {
  id: string;
  reporterId: string;
  reportedUserId: string;
  reason: ReportReason;
  description?: string;
  status: "pending" | "reviewed" | "resolved";
  createdAt: number;
}

export interface ReportResponse {
  message: string;
}

// Create profile data for onboarding
export interface CreateProfileData {
  fullName: string;
  dateOfBirth: string;
  gender: Gender;
  preferredGender: PreferredGender;
  city: string;
  country?: string;
  height: string;
  maritalStatus: MaritalStatus;
  education: string;
  occupation: string;
  annualIncome: number | string;
  aboutMe: string;
  phoneNumber: string;
  religion?: string;
  motherTongue?: string;
  ethnicity?: string;
  diet?: Diet;
  smoking?: SmokingDrinking;
  drinking?: SmokingDrinking;
  physicalStatus?: PhysicalStatus;
  partnerPreferenceAgeMin?: number;
  partnerPreferenceAgeMax?: number;
  partnerPreferenceCity?: string[] | string;
  profileFor?: ProfileFor;
  hideFromFreeUsers?: boolean;
  // Local image references for profile creation (before authentication)
  localImageIds?: string[];
  // Image IDs for profile creation (after authentication)
  profileImageIds?: string[];
}

// Update profile data
export interface UpdateProfileData extends Partial<CreateProfileData> {
  // All fields optional for updates
}

// Field options for forms
export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

export const PREFERRED_GENDER_OPTIONS: {
  value: PreferredGender;
  label: string;
}[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "any", label: "Any" },
];

export const MARITAL_STATUS_OPTIONS: { value: MaritalStatus; label: string }[] =
  [
    { value: "single", label: "Single" },
    { value: "divorced", label: "Divorced" },
    { value: "widowed", label: "Widowed" },
    { value: "annulled", label: "Annulled" },
  ];

export const DIET_OPTIONS: { value: Diet; label: string }[] = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "non-vegetarian", label: "Non-Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "eggetarian", label: "Eggetarian" },
  { value: "other", label: "Other" },
];

export const SMOKING_DRINKING_OPTIONS: {
  value: SmokingDrinking;
  label: string;
}[] = [
  { value: "no", label: "No" },
  { value: "occasionally", label: "Occasionally" },
  { value: "yes", label: "Yes" },
];

export const PHYSICAL_STATUS_OPTIONS: {
  value: PhysicalStatus;
  label: string;
}[] = [
  { value: "normal", label: "Normal" },
  { value: "differently-abled", label: "Differently Abled" },
  { value: "other", label: "Other" },
];

// Profile completion calculation
export function calculateProfileCompletion(profile: Partial<Profile>): number {
  const requiredFields: (keyof Profile)[] = [
    "fullName",
    "gender",
    "dateOfBirth",
    "maritalStatus",
    "city", // Use 'city' instead of deprecated 'ukCity'
    "occupation",
    "education",
    "aboutMe",
    "profileImageIds",
  ];

  let completed = 0;
  requiredFields.forEach((field) => {
    const value = profile[field];
    if (field === "profileImageIds") {
      if (Array.isArray(value) && value.length > 0) {
        completed++;
      }
    } else if (value) {
      completed++;
    }
  });

  return Math.round((completed / requiredFields.length) * 100);
}

// Height conversion utilities
export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
}

export function feetInchesToCm(feet: number, inches: number): number {
  return Math.round((feet * 12 + inches) * 2.54);
}

export function formatHeight(cm: number): string {
  const { feet, inches } = cmToFeetInches(cm);
  return `${feet}'${inches}"`;
}

// Age calculation
export function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

// Generic API response type
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

// Duplicate ProfileEditFormState removed to avoid conflict

export interface ProfileEditFormState {
  fullName?: string;
  city?: string;
  country?: string;
  gender?: string;
  dateOfBirth?: string;
  height?: string;
  maritalStatus?: string;
  education?: string;
  occupation?: string;
  annualIncome?: string | number;
  aboutMe?: string;
  phoneNumber?: string;
  diet?: string;
  smoking?: string;
  drinking?: string;
  physicalStatus?: string;
  partnerPreferenceAgeMin?: number | string;
  partnerPreferenceAgeMax?: number | string;
  partnerPreferenceCity?: string[];
  profileImageIds?: string[];
  banned?: boolean;
  preferredGender?: string;
  motherTongue?: string;
  religion?: string;
  ethnicity?: string;
  interests?: string[] | string;
}
