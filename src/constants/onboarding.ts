// Unified onboarding constants aligned with web project (aroosi)
// Source parity: aroosi/src/types/onboarding.ts

export const ONBOARDING_STEPS = {
  BASIC_INFO: 1,
  LOCATION: 2,
  PHYSICAL_DETAILS: 3,
  PROFESSIONAL: 4,
  CULTURAL: 5,
  ABOUT_ME: 6,
  LIFESTYLE: 7,
  PHOTOS: 8,
} as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[keyof typeof ONBOARDING_STEPS];

// Fields required for each step (mirrors STEP_VALIDATION_REQUIREMENTS on web)
export const STEP_VALIDATION_REQUIREMENTS: Record<OnboardingStep, string[]> = {
  [ONBOARDING_STEPS.BASIC_INFO]: [
    'fullName',
    'dateOfBirth',
    'gender',
    'preferredGender',
  ],
  [ONBOARDING_STEPS.LOCATION]: ['country', 'city'],
  [ONBOARDING_STEPS.PHYSICAL_DETAILS]: ['maritalStatus'], // 'height' optional
  [ONBOARDING_STEPS.PROFESSIONAL]: ['education', 'occupation'], // annualIncome optional
  [ONBOARDING_STEPS.CULTURAL]: [],
  [ONBOARDING_STEPS.ABOUT_ME]: ['aboutMe', 'phoneNumber'],
  [ONBOARDING_STEPS.LIFESTYLE]: [],
  [ONBOARDING_STEPS.PHOTOS]: [], // photos recommended, not required
};

// Canonical required profile fields for completing onboarding (parity with web ONBOARDING_REQUIRED_FIELDS + phone + preferredGender)
export const REQUIRED_PROFILE_FIELDS: string[] = [
  'fullName',
  'dateOfBirth',
  'gender',
  'preferredGender',
  'country',
  'city',
  'maritalStatus',
  'education',
  'occupation',
  'aboutMe',
  'phoneNumber',
];

// Backward compatibility mappings (mobile legacy values → web canonical)
export function normalizePreferredGender(value: string | undefined | null): string {
  if (!value) return 'other';
  if (value === 'any') return 'both'; // mobile legacy
  return value;
}

export function normalizeMaritalStatus(value: string | undefined | null): string {
  // Accept both 'annulled' (legacy) & 'separated' (web) sets
  const allowed = new Set(['single','divorced','widowed','annulled','separated']);
  if (value && allowed.has(value)) return value;
  return 'single';
}
