import { z } from 'zod';
import { normalizePreferredGender, normalizeMaritalStatus } from '../constants/onboarding';

const preprocessHeight = (val: unknown) => {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const m = val.match(/(\d{2,3})/);
    if (m) {
      const num = parseInt(m[1], 10);
      if (!isNaN(num)) return num;
    }
  }
  return undefined;
};

const preprocessIncome = (val: unknown) => {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const num = Number(val.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? undefined : num;
  }
  return undefined;
};

const preprocessPhone = (val: unknown) => {
  if (typeof val !== 'string') return val;
  return val.trim();
};

export const BaseProfileData = z.object({
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Full name can only contain letters, spaces, hyphens, apostrophes'),
  dateOfBirth: z.string().refine((date) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return false;
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    return age >= 18 && age <= 120;
  }, 'You must be between 18 and 120 years old'),
  gender: z.enum(['male', 'female', 'other']),
  preferredGender: z.enum(['male', 'female', 'both', 'other']),
  country: z.string().min(2, 'Country is required').max(60, 'Country name is too long'),
  city: z
    .string()
    .min(2, 'City is required')
    .max(50, 'City name is too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'City name can only contain letters, spaces, hyphens, apostrophes'),
  height: z.preprocess(preprocessHeight, z.number().min(100).max(250).optional()).optional(),
  maritalStatus: z.enum(['single', 'divorced', 'widowed', 'annulled', 'separated']),
  education: z.string().min(2, 'Education is required').max(100, 'Education description is too long'),
  occupation: z.string().min(2, 'Occupation is required').max(100, 'Occupation description is too long'),
  annualIncome: z.preprocess(preprocessIncome, z.number().min(0).max(1000000).optional()).optional(),
  aboutMe: z
    .string()
    .min(50, 'About me must be at least 50 characters')
    .max(2000, 'About me must be less than 2000 characters')
    .refine((text) => {
      if (!text) return false;
      const normalized = text.replace(/\u00A0/g, ' ').trim();
      const tokens = normalized
        .split(/\s+/)
        .map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
        .filter((w) => w.length > 0);
      return tokens.length >= 10;
    }, 'About me must contain at least 10 words'),
  phoneNumber: z.preprocess(preprocessPhone, z.string()).refine(
    (val) => /^[+]?[1-9][\d]{9,14}$/.test(val),
    'Please enter a valid phone number (min 10 digits)'
  ),
  religion: z.string().max(50).optional(),
  motherTongue: z.string().max(50).optional(),
  ethnicity: z.string().max(50).optional(),
  profileFor: z.enum(['self', 'friend', 'family']).default('self').optional(),
  diet: z.enum(['vegetarian', 'non-vegetarian', 'halal', 'other', 'vegan', 'kosher']).optional(),
  smoking: z.enum(['no', 'occasionally', 'yes']).optional(),
  drinking: z.enum(['no', 'occasionally', 'yes']).optional(),
  physicalStatus: z.enum(['normal', 'differently-abled', 'other']).optional(),
  partnerPreferenceAgeMin: z.number().min(18).max(120).optional(),
  partnerPreferenceAgeMax: z.number().min(18).max(120).optional(),
  partnerPreferenceCity: z.union([z.string(), z.array(z.string())]).optional(),
  profileImageIds: z.array(z.string()).optional(),
  interests: z.union([z.string(), z.array(z.string())]).optional(),
});

export const StepValidationSchemas = {
  1: BaseProfileData.pick({ fullName: true, dateOfBirth: true, gender: true, preferredGender: true }),
  2: BaseProfileData.pick({ country: true, city: true }),
  3: BaseProfileData.pick({ maritalStatus: true, height: true }).partial(),
  4: BaseProfileData.pick({ education: true, occupation: true, annualIncome: true }).partial(),
  5: BaseProfileData.pick({ religion: true, motherTongue: true, ethnicity: true, profileFor: true }).partial(),
  6: BaseProfileData.pick({ aboutMe: true, phoneNumber: true }),
  7: BaseProfileData.pick({ diet: true, smoking: true, drinking: true, physicalStatus: true }).partial(),
  8: z.object({ profileImageIds: z.array(z.string()).max(5).optional() }).partial(),
} as const;

export const CreateProfileRequiredSchema = BaseProfileData.pick({
  fullName: true,
  dateOfBirth: true,
  gender: true,
  preferredGender: true,
  country: true,
  city: true,
  maritalStatus: true,
  education: true,
  occupation: true,
  aboutMe: true,
  phoneNumber: true,
});

export const CreateProfileSchema = BaseProfileData.superRefine((data, ctx) => {
  if (data.partnerPreferenceAgeMin && data.partnerPreferenceAgeMax) {
    if (data.partnerPreferenceAgeMin > data.partnerPreferenceAgeMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['partnerPreferenceAgeMin'],
        message: 'Minimum age must be <= maximum age',
      });
    }
  }
});

export type CreateProfileInput = z.infer<typeof CreateProfileSchema>;

export function normalizeForSchema(input: Record<string, any>): Record<string, any> {
  const out = { ...input };
  if (out.preferredGender) out.preferredGender = normalizePreferredGender(out.preferredGender);
  if (out.maritalStatus) out.maritalStatus = normalizeMaritalStatus(out.maritalStatus);
  return out;
}

export function zodValidateCreateProfile(data: Record<string, any>): { errors: Record<string, string>; parsed?: CreateProfileInput } {
  const normalized = normalizeForSchema(data);
  const result = CreateProfileSchema.safeParse(normalized);
  if (result.success) return { errors: {}, parsed: result.data };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !errors[key]) {
      errors[key] = issue.message;
    }
  }
  return { errors };
}
