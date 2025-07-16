import { z } from "zod";

// Base API response schema
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      details: z.any().optional(),
    })
    .optional(),
});

// User schema
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  fullName: z.string().optional(),
  profileId: z.string().optional(),
  role: z.enum(["user", "admin"]).optional(),
  isEmailVerified: z.boolean().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});

// Profile schema
export const profileSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  email: z.string().email(),
  fullName: z.string(),
  dateOfBirth: z.string(),
  gender: z.enum(["male", "female", "other"]),
  city: z.string(),
  country: z.string(),
  phoneNumber: z.string(),
  aboutMe: z.string(),
  height: z.string(),
  maritalStatus: z.enum(["single", "divorced", "widowed", "annulled"]),
  education: z.string(),
  occupation: z.string(),
  annualIncome: z.union([z.string(), z.number()]),
  diet: z
    .enum(["vegetarian", "non-vegetarian", "vegan", "eggetarian", "other", ""])
    .optional(),
  smoking: z.enum(["no", "occasionally", "yes", ""]).optional(),
  drinking: z.enum(["no", "occasionally", "yes", ""]).optional(),
  physicalStatus: z
    .enum(["normal", "differently-abled", "other", ""])
    .optional(),
  partnerPreferenceAgeMin: z.number(),
  partnerPreferenceAgeMax: z.number(),
  partnerPreferenceCity: z.union([z.array(z.string()), z.string()]).optional(),
  preferredGender: z.enum(["male", "female", "other", "any", ""]),
  profileImageIds: z.array(z.string()).optional(),
  profileImageUrls: z.array(z.string()).optional(),
  isProfileComplete: z.boolean(),
  isOnboardingComplete: z.boolean(),
  banned: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
  profileFor: z.enum(["self", "friend", "family"]),
  subscriptionPlan: z.enum(["free", "premium", "premiumPlus"]).optional(),
  motherTongue: z.string().optional(),
  religion: z.string().optional(),
  ethnicity: z.string().optional(),
  interests: z.union([z.array(z.string()), z.string()]).optional(),
});

// Message schema
export const messageSchema = z.object({
  _id: z.string(),
  conversationId: z.string(),
  fromUserId: z.string(),
  toUserId: z.string(),
  text: z.string(),
  type: z.enum(["text", "voice", "image"]).optional(),
  createdAt: z.number(),
  readAt: z.number().optional(),
  deliveredAt: z.number().optional(),
  status: z.enum(["sent", "delivered", "read"]).optional(),
  audioStorageId: z.string().optional(),
  audioUrl: z.string().optional(),
  duration: z.number().optional(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
  imageStorageId: z.string().optional(),
  imageUrl: z.string().optional(),
});

// Conversation schema
export const conversationSchema = z.object({
  _id: z.string(),
  participants: z.array(z.string()),
  lastMessage: messageSchema.optional(),
  lastMessageAt: z.number().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

// Interest schema
export const interestSchema = z.object({
  _id: z.string(),
  fromUserId: z.string(),
  toUserId: z.string(),
  status: z.enum(["pending", "accepted", "rejected"]),
  createdAt: z.number(),
  updatedAt: z.number().optional(),
  fromProfile: z
    .object({
      fullName: z.string(),
      city: z.string(),
      profileImageIds: z.array(z.string()),
      profileImageUrls: z.array(z.string()),
    })
    .optional(),
  toProfile: z
    .object({
      fullName: z.string(),
      city: z.string(),
      profileImageIds: z.array(z.string()),
      profileImageUrls: z.array(z.string()),
    })
    .optional(),
});

// Match schema
export const matchSchema = z.object({
  _id: z.string(),
  participants: z.array(z.string()),
  createdAt: z.number(),
  lastMessageAt: z.number().optional(),
  conversationId: z.string(),
  profiles: z.array(
    z.object({
      fullName: z.string(),
      city: z.string(),
      profileImageIds: z.array(z.string()),
      profileImageUrls: z.array(z.string()),
    })
  ),
});

// Search result schema
export const searchResultSchema = z.object({
  userId: z.string(),
  email: z.string().optional(),
  profile: z.object({
    fullName: z.string(),
    city: z.string().optional(),
    dateOfBirth: z.string().optional(),
    isProfileComplete: z.boolean().optional(),
    hiddenFromSearch: z.boolean().optional(),
    boostedUntil: z.number().optional(),
    subscriptionPlan: z.string().optional(),
    hideFromFreeUsers: z.boolean().optional(),
    profileImageUrls: z.array(z.string()).optional(),
  }),
});

// Subscription status schema
export const subscriptionStatusSchema = z.object({
  plan: z.enum(["free", "premium", "premiumPlus"]),
  isActive: z.boolean(),
  expiresAt: z.number().optional(),
  daysRemaining: z.number(),
  boostsRemaining: z.number(),
  hasSpotlightBadge: z.boolean(),
  spotlightBadgeExpiresAt: z.number().optional(),
});

// Usage stats schema
export const usageStatsSchema = z.object({
  plan: z.enum(["free", "premium", "premiumPlus"]),
  messaging: z.object({
    sent: z.number(),
    received: z.number(),
    limit: z.number(),
  }),
  profileViews: z.object({
    count: z.number(),
    limit: z.number(),
  }),
  searches: z.object({
    count: z.number(),
    limit: z.number(),
  }),
  boosts: z.object({
    used: z.number(),
    remaining: z.number(),
    monthlyLimit: z.number(),
  }),
});

// Blocked user schema
export const blockedUserSchema = z.object({
  id: z.string(),
  blockerId: z.string(),
  blockedUserId: z.string(),
  blockedProfile: z.object({
    fullName: z.string(),
    profileImageUrl: z.string().optional(),
  }),
  createdAt: z.number(),
});

// Block status schema
export const blockStatusSchema = z.object({
  isBlocked: z.boolean(),
  isBlockedBy: z.boolean().optional(),
  canInteract: z.boolean().optional(),
});

// Validation functions
export function validateApiResponse<T>(
  data: any,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      const errorMessage = result.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return { success: false, error: errorMessage };
    }
  } catch (error) {
    return { success: false, error: "Schema validation failed" };
  }
}

export function validateProfile(data: any) {
  return validateApiResponse(data, profileSchema);
}

export function validateUser(data: any) {
  return validateApiResponse(data, userSchema);
}

export function validateMessage(data: any) {
  return validateApiResponse(data, messageSchema);
}

export function validateConversation(data: any) {
  return validateApiResponse(data, conversationSchema);
}

export function validateInterest(data: any) {
  return validateApiResponse(data, interestSchema);
}

export function validateMatch(data: any) {
  return validateApiResponse(data, matchSchema);
}

export function validateSearchResult(data: any) {
  return validateApiResponse(data, searchResultSchema);
}

export function validateSubscriptionStatus(data: any) {
  return validateApiResponse(data, subscriptionStatusSchema);
}

export function validateUsageStats(data: any) {
  return validateApiResponse(data, usageStatsSchema);
}

export function validateBlockedUser(data: any) {
  return validateApiResponse(data, blockedUserSchema);
}

export function validateBlockStatus(data: any) {
  return validateApiResponse(data, blockStatusSchema);
}

// Array validation helper
export function validateArray<T>(
  data: any,
  itemSchema: z.ZodSchema<T>
): { success: true; data: T[] } | { success: false; error: string } {
  if (!Array.isArray(data)) {
    return { success: false, error: "Expected an array" };
  }

  const results: T[] = [];
  const errors: string[] = [];

  data.forEach((item, index) => {
    const result = validateApiResponse(item, itemSchema);
    if (result.success) {
      results.push(result.data);
    } else {
      errors.push(`Item ${index}: ${result.error}`);
    }
  });

  if (errors.length > 0) {
    return { success: false, error: errors.join("; ") };
  }

  return { success: true, data: results };
}

// Paginated response validation
export function validatePaginatedResponse<T>(
  data: any,
  itemSchema: z.ZodSchema<T>
):
  | {
      success: true;
      data: { items: T[]; total: number; hasMore: boolean; nextPage?: number };
    }
  | { success: false; error: string } {
  const paginatedSchema = z.object({
    items: z.array(itemSchema),
    total: z.number(),
    hasMore: z.boolean(),
    nextPage: z.number().optional(),
  });

  return validateApiResponse(data, paginatedSchema);
}

// Flexible validation that handles both single items and arrays
export function validateFlexible<T>(
  data: any,
  itemSchema: z.ZodSchema<T>
): { success: true; data: T | T[] } | { success: false; error: string } {
  if (Array.isArray(data)) {
    const arrayResult = validateArray(data, itemSchema);
    return arrayResult.success
      ? { success: true, data: arrayResult.data }
      : arrayResult;
  } else {
    return validateApiResponse(data, itemSchema);
  }
}
