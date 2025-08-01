import {
  CreateProfileData,
  UpdateProfileData,
  calculateAge,
} from "../types/profile";

// Validation error messages
export const ValidationMessages = {
  fullName: {
    required: "Full name is required",
    minLength: "Name must be at least 2 characters",
    maxLength: "Name must not exceed 100 characters",
    invalid: "Name can only contain letters, spaces, hyphens and apostrophes",
  },
  dateOfBirth: {
    required: "Date of birth is required",
    minAge: "You must be at least 18 years old",
    maxAge: "Invalid date of birth",
    invalid: "Please enter a valid date",
  },
  gender: {
    required: "Gender is required",
  },
  preferredGender: {
    required: "Preferred gender is required",
  },
  city: {
    required: "City is required",
    minLength: "City must be at least 2 characters",
    maxLength: "City must not exceed 50 characters",
  },
  country: {
    required: "Country is required",
    maxLength: "Country must not exceed 10 characters",
  },
  ukCity: {
    required: "City is required",
    minLength: "City must be at least 2 characters",
    maxLength: "City must not exceed 50 characters",
  },
  ukPostcode: {
    maxLength: "Postcode must not exceed 10 characters",
    invalid: "Please enter a valid UK postcode",
  },
  height: {
    required: "Height is required",
    min: "Height must be at least 4'6\" (137cm)",
    max: "Height must not exceed 6'6\" (198cm)",
  },
  education: {
    required: "Education is required",
    maxLength: "Education must not exceed 100 characters",
  },
  occupation: {
    required: "Occupation is required",
    maxLength: "Occupation must not exceed 100 characters",
  },
  maritalStatus: {
    required: "Marital status is required",
  },
  annualIncome: {
    required: "Annual income is required",
    min: "Income must be a positive number",
    max: "Income must not exceed £1,000,000",
  },
  aboutMe: {
    required: "About me is required",
    minLength: "Please write at least 20 characters about yourself",
    maxLength: "About me must not exceed 2000 characters",
  },
  phoneNumber: {
    required: "Phone number is required",
    invalid: "Please enter a valid international phone number",
  },
  partnerPreferenceAgeMin: {
    min: "Minimum age must be at least 18",
    max: "Minimum age must not exceed 120",
    invalid: "Minimum age must be less than or equal to maximum age",
  },
  partnerPreferenceAgeMax: {
    min: "Maximum age must be at least 18",
    max: "Maximum age must not exceed 120",
    invalid: "Maximum age must be greater than or equal to minimum age",
  },
};

// Validation regex patterns
const PATTERNS = {
  fullName: /^[a-zA-Z\s\-']+$/,
  // E.164 core format: + and 1-15 digits, no spaces, must not start with 0 after +
  e164: /^\+?[1-9]\d{1,14}$/,
  // Allow user input with spaces/hyphens during typing; will be normalized before validation
  e164Loose: /^\+?[1-9][\d\s-]{6,14}$/,
  ukPostcode: /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i,
};

// Field validation functions
export const validators = {
  fullName: (value: string | undefined): string | null => {
    if (!value?.trim()) return ValidationMessages.fullName.required;
    if (value.length < 2) return ValidationMessages.fullName.minLength;
    if (value.length > 100) return ValidationMessages.fullName.maxLength;
    if (!PATTERNS.fullName.test(value))
      return ValidationMessages.fullName.invalid;
    return null;
  },

  dateOfBirth: (value: string | undefined): string | null => {
    if (!value) return ValidationMessages.dateOfBirth.required;

    const date = new Date(value);
    if (isNaN(date.getTime())) return ValidationMessages.dateOfBirth.invalid;

    const age = calculateAge(value);
    if (age < 18) return ValidationMessages.dateOfBirth.minAge;
    if (age > 120) return ValidationMessages.dateOfBirth.maxAge;

    return null;
  },

  gender: (value: string | undefined): string | null => {
    if (!value) return ValidationMessages.gender.required;
    return null;
  },

  preferredGender: (value: string | undefined): string | null => {
    if (!value) return ValidationMessages.preferredGender.required;
    return null;
  },

  city: (value: string | undefined): string | null => {
    if (!value?.trim()) return ValidationMessages.city.required;
    if (value.length < 2) return ValidationMessages.city.minLength;
    if (value.length > 50) return ValidationMessages.city.maxLength;
    return null;
  },

  country: (value: string | undefined): string | null => {
    if (!value?.trim()) return ValidationMessages.country.required;
    if (value.length > 10) return ValidationMessages.country.maxLength;
    return null;
  },

  ukCity: (value: string | undefined): string | null => {
    if (!value?.trim()) return ValidationMessages.ukCity.required;
    if (value.length < 2) return ValidationMessages.ukCity.minLength;
    if (value.length > 50) return ValidationMessages.ukCity.maxLength;
    return null;
  },

  ukPostcode: (value: string | undefined): string | null => {
    if (!value) return null; // Optional field
    if (value.length > 10) return ValidationMessages.ukPostcode.maxLength;
    // Optional: Add UK postcode format validation
    // if (!PATTERNS.ukPostcode.test(value)) return ValidationMessages.ukPostcode.invalid;
    return null;
  },

  height: (value: string | undefined): string | null => {
    if (!value) return ValidationMessages.height.required;
    const heightCm = parseInt(value);
    if (isNaN(heightCm)) return ValidationMessages.height.required;
    if (heightCm < 137) return ValidationMessages.height.min;
    if (heightCm > 198) return ValidationMessages.height.max;
    return null;
  },

  education: (value: string | undefined): string | null => {
    if (!value?.trim()) return ValidationMessages.education.required;
    if (value.length > 100) return ValidationMessages.education.maxLength;
    return null;
  },

  occupation: (value: string | undefined): string | null => {
    if (!value?.trim()) return ValidationMessages.occupation.required;
    if (value.length > 100) return ValidationMessages.occupation.maxLength;
    return null;
  },

  maritalStatus: (value: string | undefined): string | null => {
    if (!value) return ValidationMessages.maritalStatus.required;
    return null;
  },

  annualIncome: (value: number | undefined): string | null => {
    if (value === undefined || value === null)
      return ValidationMessages.annualIncome.required;
    if (value < 0) return ValidationMessages.annualIncome.min;
    // Optional upper cap to prevent unrealistic values
    if (value > 10000000) return "Income must not exceed 10,000,000";
    return null;
  },

  aboutMe: (value: string | undefined): string | null => {
    if (!value?.trim()) return ValidationMessages.aboutMe.required;
    if (value.length < 20) return ValidationMessages.aboutMe.minLength;
    if (value.length > 2000) return ValidationMessages.aboutMe.maxLength;
    return null;
  },

  phoneNumber: (value: string | undefined): string | null => {
    if (!value?.trim()) return ValidationMessages.phoneNumber.required;
    // Normalize: remove spaces/hyphens for validation
    const normalized = value.replace(/[\s-]/g, "");
    // Accept either strict E.164 or permissive input that normalizes to E.164
    const valid =
      PATTERNS.e164.test(normalized) ||
      (PATTERNS.e164Loose.test(value) && PATTERNS.e164.test(normalized));
    if (!valid) {
      return ValidationMessages.phoneNumber.invalid;
    }
    return null;
  },

  partnerPreferenceAgeMin: (
    value: number | string | undefined,
    maxAge?: number | string
  ): string | null => {
    if (!value || value === "") return null; // Optional field
    const age = typeof value === "string" ? parseInt(value) : value;
    if (isNaN(age)) return null;
    if (age < 18) return ValidationMessages.partnerPreferenceAgeMin.min;
    if (age > 120) return ValidationMessages.partnerPreferenceAgeMin.max;
    if (maxAge && typeof maxAge === "number" && age > maxAge) {
      return ValidationMessages.partnerPreferenceAgeMin.invalid;
    }
    return null;
  },

  partnerPreferenceAgeMax: (
    value: number | string | undefined,
    minAge?: number | string
  ): string | null => {
    if (!value || value === "") return null; // Optional field
    const age = typeof value === "string" ? parseInt(value) : value;
    if (isNaN(age)) return null;
    if (age < 18) return ValidationMessages.partnerPreferenceAgeMax.min;
    if (age > 120) return ValidationMessages.partnerPreferenceAgeMax.max;
    if (minAge && typeof minAge === "number" && age < minAge) {
      return ValidationMessages.partnerPreferenceAgeMax.invalid;
    }
    return null;
  },
};

// Validate entire profile for creation
export function validateCreateProfile(
  data: Partial<CreateProfileData>
): Record<string, string> {
  const errors: Record<string, string> = {};

  // Required fields for onboarding
  const requiredFields = [
    "fullName",
    "dateOfBirth",
    "gender",
    "preferredGender",
    "city",
    "height",
    "maritalStatus",
    "education",
    "occupation",
    "annualIncome",
    "aboutMe",
    "phoneNumber",
  ] as const;

  // Validate required fields
  requiredFields.forEach((field) => {
    const validator = validators[field];
    if (validator) {
      const error = validator(data[field] as never);
      if (error) errors[field] = error;
    }
  });

  // Country now required in onboarding
  {
    const error = validators.country(data.country as any);
    if (error) errors.country = error;
  }

  // Validate partner preferences if provided
  if (data.partnerPreferenceAgeMin || data.partnerPreferenceAgeMax) {
    const minError = validators.partnerPreferenceAgeMin(
      data.partnerPreferenceAgeMin,
      data.partnerPreferenceAgeMax
    );
    if (minError) errors.partnerPreferenceAgeMin = minError;

    const maxError = validators.partnerPreferenceAgeMax(
      data.partnerPreferenceAgeMax,
      data.partnerPreferenceAgeMin
    );
    if (maxError) errors.partnerPreferenceAgeMax = maxError;
  }

  return errors;
}

// Validate profile updates (all fields optional except fullName)
export function validateUpdateProfile(
  data: Partial<UpdateProfileData>
): Record<string, string> {
  const errors: Record<string, string> = {};

  // Validate each provided field
  Object.entries(data).forEach(([field, value]) => {
    const validator = validators[field];
    if (validator && value !== undefined && value !== "") {
      const error = validator(value as any);
      if (error) errors[field] = error;
    }
  });

  // Country is required on update as well - validate even if empty/undefined
  {
    const error = validators.country((data.country as any) ?? "");
    if (error) errors.country = error;
  }

  // Country is required in updates as per product decision
  if (data.country === undefined || data.country === "") {
    const countryError = validators.country((data.country as unknown as string) ?? "");
    if (countryError) errors.country = countryError;
  }

  // Full name is required even for updates
  if (data.fullName !== undefined) {
    const fullNameError = validators.fullName(data.fullName);
    if (fullNameError) errors.fullName = fullNameError;
  }

  // Country is required on update as well
  {
    const countryError = validators.country(data.country as any);
    if (countryError) errors.country = countryError;
  }

  // Special handling for partner preferences
  if (
    data.partnerPreferenceAgeMin !== undefined ||
    data.partnerPreferenceAgeMax !== undefined
  ) {
    const minError = validators.partnerPreferenceAgeMin(
      data.partnerPreferenceAgeMin,
      data.partnerPreferenceAgeMax
    );
    if (minError) errors.partnerPreferenceAgeMin = minError;

    const maxError = validators.partnerPreferenceAgeMax(
      data.partnerPreferenceAgeMax,
      data.partnerPreferenceAgeMin
    );
    if (maxError) errors.partnerPreferenceAgeMax = maxError;
  }

  return errors;
}
// Utility to check if profile is complete
export function isProfileComplete(
  profile: Partial<CreateProfileData>
): boolean {
  const requiredFields: (keyof CreateProfileData)[] = [
    "fullName",
    "gender",
    "dateOfBirth",
    "maritalStatus",
    "city",
    "occupation",
    "education",
    "aboutMe",
  ];

  return requiredFields.every((field) => {
    const value = profile[field];
    return value !== undefined && value !== null && value !== "";
  });
}

// Format phone number for display
export function formatPhoneNumber(phone: string): string {
  // Pretty minimal normalization for display: keep leading +, insert single spaces between groups of 3-4 for readability
  const hasPlus = phone.trim().startsWith("+");
  const digits = phone.replace(/\D/g, "");
  const core = hasPlus ? `+${digits}` : digits;
  // Do not enforce specific country grouping; return compact E.164 display
  return core;
}

// Clean phone number for storage
export function cleanPhoneNumber(phone: string): string {
  // Produce E.164-compatible compact representation for transport/storage
  const hasPlus = phone.trim().startsWith("+");
  const digits = phone.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
}
