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
  clerkId: string;
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
  boostsMonth?: string;
  hasSpotlightBadge?: boolean;
  spotlightBadgeExpiresAt?: number;
  boostedUntil?: number;
  motherTongue?: string;
  religion?: string;
  ethnicity?: string;
}

// Form-specific fields that aren't persisted
export interface ProfileFormValues extends Partial<Profile> {
  language?: string;
  familyValues?: string;
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
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string | { code?: string; message?: string; [key: string]: any };
}
