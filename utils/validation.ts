import { z } from "zod";

// Email validation
export const emailSchema = z
  .string()
  .email("Please enter a valid email address");

// Phone validation
export const phoneSchema = z
  .string()
  .min(10, "Phone number must be at least 10 digits");

// Password validation
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

// Profile validation schemas
export const profileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["male", "female", "other"], {
    errorMap: () => ({ message: "Please select a gender" }),
  }),
  location: z.object({
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    country: z.string().min(1, "Country is required"),
    coordinates: z
      .object({
        lat: z.number(),
        lng: z.number(),
      })
      .optional(),
  }),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
  height: z.number().min(100).max(250).optional(),
  education: z.string().optional(),
  occupation: z.string().optional(),
  religion: z.string().optional(),
  ethnicity: z.string().optional(),
  languages: z.array(z.string()).optional(),
  interests: z.array(z.string()).optional(),
  lookingFor: z.enum(["marriage", "friendship", "dating"]).optional(),
  ageRange: z
    .object({
      min: z.number().min(18).max(100),
      max: z.number().min(18).max(100),
    })
    .optional(),
});

// Message validation
export const messageSchema = z.object({
  text: z
    .string()
    .min(1, "Message cannot be empty")
    .max(1000, "Message too long"),
  type: z.enum(["text", "voice", "image"]).default("text"),
});

// Report validation
export const reportSchema = z.object({
  reportedUserId: z.string().min(1, "User ID is required"),
  reason: z.string().min(1, "Reason is required"),
  details: z
    .string()
    .max(500, "Details must be less than 500 characters")
    .optional(),
});

// Registration validation
export const registrationSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["male", "female", "other"]),
  agreeToTerms: z.boolean().refine((val) => val === true, {
    message: "You must agree to the terms and conditions",
  }),
});

// Login validation
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

// OTP validation
export const otpSchema = z.object({
  code: z.string().length(6, "OTP must be 6 digits"),
});

// Validation helper functions
export function validateEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}

export function validatePassword(password: string): boolean {
  return passwordSchema.safeParse(password).success;
}

export function validateProfile(profile: any): {
  success: boolean;
  errors?: string[];
} {
  const result = profileSchema.safeParse(profile);
  if (result.success) {
    return { success: true };
  }

  const errors = result.error.errors.map((err) => err.message);
  return { success: false, errors };
}

export function validateMessage(message: any): {
  success: boolean;
  error?: string;
} {
  const result = messageSchema.safeParse(message);
  if (result.success) {
    return { success: true };
  }

  return { success: false, error: result.error.errors[0]?.message };
}

export function validateRegistration(data: any): {
  success: boolean;
  errors?: Record<string, string>;
} {
  const result = registrationSchema.safeParse(data);
  if (result.success) {
    return { success: true };
  }

  const errors: Record<string, string> = {};
  result.error.errors.forEach((err) => {
    if (err.path.length > 0) {
      errors[err.path[0] as string] = err.message;
    }
  });

  return { success: false, errors };
}

export function validateLogin(data: any): {
  success: boolean;
  errors?: Record<string, string>;
} {
  const result = loginSchema.safeParse(data);
  if (result.success) {
    return { success: true };
  }

  const errors: Record<string, string> = {};
  result.error.errors.forEach((err) => {
    if (err.path.length > 0) {
      errors[err.path[0] as string] = err.message;
    }
  });

  return { success: false, errors };
}

// Data transformation utilities
export function transformProfileForApi(profile: any): any {
  return {
    ...profile,
    dateOfBirth: profile.dateOfBirth
      ? new Date(profile.dateOfBirth).toISOString()
      : undefined,
    ageRange: profile.ageRange
      ? {
          min: Number(profile.ageRange.min),
          max: Number(profile.ageRange.max),
        }
      : undefined,
    height: profile.height ? Number(profile.height) : undefined,
  };
}

export function transformProfileFromApi(profile: any): any {
  return {
    ...profile,
    dateOfBirth: profile.dateOfBirth
      ? new Date(profile.dateOfBirth).toISOString().split("T")[0]
      : undefined,
    height: profile.height ? String(profile.height) : undefined,
    ageRange: profile.ageRange
      ? {
          min: String(profile.ageRange.min),
          max: String(profile.ageRange.max),
        }
      : undefined,
  };
}

// Schema validation for API responses
export function validateApiResponse<T>(
  data: any,
  schema: z.ZodSchema<T>
): { success: boolean; data?: T; error?: string } {
  try {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    }

    return {
      success: false,
      error: result.error.errors[0]?.message || "Validation failed",
    };
  } catch (error) {
    return { success: false, error: "Schema validation error" };
  }
}

// Data sanitization
export function sanitizeString(str: string): string {
  return str.trim().replace(/[<>]/g, "");
}

export function sanitizeProfile(profile: any): any {
  return {
    ...profile,
    fullName: profile.fullName ? sanitizeString(profile.fullName) : undefined,
    bio: profile.bio ? sanitizeString(profile.bio) : undefined,
    education: profile.education
      ? sanitizeString(profile.education)
      : undefined,
    occupation: profile.occupation
      ? sanitizeString(profile.occupation)
      : undefined,
  };
}
