import {
  Profile,
  ProfileFormValues,
  CreateProfileData,
  UpdateProfileData,
} from "../types/profile";
import { User, LoginResponse, RegisterResponse } from "../types/auth";
import { Message, Conversation } from "../types/message";
import { Interest, Match } from "../types/profile";

// Profile transformations
export function transformProfileForApi(
  profile: ProfileFormValues | CreateProfileData
): any {
  return {
    ...profile,
    // Ensure numeric fields are numbers
    partnerPreferenceAgeMin: profile.partnerPreferenceAgeMin
      ? Number(profile.partnerPreferenceAgeMin)
      : undefined,
    partnerPreferenceAgeMax: profile.partnerPreferenceAgeMax
      ? Number(profile.partnerPreferenceAgeMax)
      : undefined,
    annualIncome: profile.annualIncome
      ? Number(profile.annualIncome)
      : undefined,

    // Ensure date is in ISO format
    dateOfBirth: profile.dateOfBirth
      ? new Date(profile.dateOfBirth).toISOString()
      : undefined,

    // Ensure arrays are properly formatted
    partnerPreferenceCity: Array.isArray(profile.partnerPreferenceCity)
      ? profile.partnerPreferenceCity
      : profile.partnerPreferenceCity
      ? [profile.partnerPreferenceCity]
      : undefined,

    // Ensure interests are array
    interests:
      typeof profile.interests === "string"
        ? profile.interests.split(",").map((i: string) => i.trim())
        : profile.interests,

    // Remove undefined values
    ...Object.fromEntries(
      Object.entries(profile).filter(([_, value]) => value !== undefined)
    ),
  };
}

export function transformProfileFromApi(profile: any): Profile {
  return {
    ...profile,
    // Ensure date is in correct format for forms
    dateOfBirth: profile.dateOfBirth
      ? new Date(profile.dateOfBirth).toISOString().split("T")[0]
      : "",

    // Ensure numeric fields are properly typed
    partnerPreferenceAgeMin: profile.partnerPreferenceAgeMin
      ? Number(profile.partnerPreferenceAgeMin)
      : 18,
    partnerPreferenceAgeMax: profile.partnerPreferenceAgeMax
      ? Number(profile.partnerPreferenceAgeMax)
      : 65,
    annualIncome: profile.annualIncome ? Number(profile.annualIncome) : 0,

    // Ensure arrays are properly formatted
    partnerPreferenceCity: Array.isArray(profile.partnerPreferenceCity)
      ? profile.partnerPreferenceCity
      : profile.partnerPreferenceCity
      ? [profile.partnerPreferenceCity]
      : [],

    profileImageUrls: profile.profileImageUrls || profile.images || [],
    profileImageIds: profile.profileImageIds || [],

    // Ensure interests are array
    interests:
      typeof profile.interests === "string"
        ? profile.interests.split(",").map((i: string) => i.trim())
        : profile.interests || [],

    // Ensure boolean fields
    // completeness flags removed
    banned: Boolean(profile.banned),

    // Ensure timestamps
    createdAt: profile.createdAt || profile._creationTime || Date.now(),
    updatedAt: profile.updatedAt || Date.now(),
  };
}

// Auth transformations
export function transformUserFromApi(userData: any): User {
  return {
    id: userData.id || userData._id,
    email: userData.email,
    fullName: userData.fullName || userData.name,
    profileId: userData.profileId,
    role: userData.role || "user",
    isEmailVerified: Boolean(userData.isEmailVerified),
    createdAt: userData.createdAt || userData._creationTime || Date.now(),
    updatedAt: userData.updatedAt || Date.now(),
  };
}

export function transformLoginResponseFromApi(response: any): LoginResponse {
  return {
    user: transformUserFromApi(response.user),
    tokens: {
      accessToken: response.tokens?.accessToken || response.token,
      refreshToken: response.tokens?.refreshToken || response.refreshToken,
      expiresAt: response.tokens?.expiresAt || Date.now() + 24 * 60 * 60 * 1000, // 24 hours default
    },
    profile: response.profile
      ? {
          id: response.profile.id || response.profile._id,
          // completeness flags omitted
        }
      : undefined,
  };
}

// Message transformations
export function transformMessageFromApi(message: any): Message {
  return {
    _id: message._id || message.id,
    conversationId: message.conversationId,
    fromUserId: message.fromUserId,
    toUserId: message.toUserId,
    text: message.text || message.content || "",
    type: message.type || "text",
    createdAt: message.createdAt || message.timestamp || Date.now(),
    readAt: message.readAt,
    // deliveredAt removed; not in Message type
    status: message.status || "sent",

    // Voice message fields
    audioStorageId: message.audioStorageId,
    // audioUrl removed; not in Message type
    duration: message.duration,
    fileSize: message.fileSize,
    mimeType: message.mimeType,

    // Image message fields
    imageStorageId: message.imageStorageId,
    // imageUrl removed; not in Message type
  };
}

export function transformConversationFromApi(conversation: any): Conversation {
  return {
    _id: conversation._id || conversation.id,
    conversationId:
      conversation.conversationId || conversation._id || conversation.id,
    participants: conversation.participants || [],
    lastMessage: conversation.lastMessage
      ? transformMessageFromApi(conversation.lastMessage)
      : undefined,
    lastMessageAt: conversation.lastMessageAt || conversation.updatedAt,
    createdAt: conversation.createdAt || Date.now(),
    updatedAt: conversation.updatedAt || Date.now(),
  };
}

// Interest transformations
export function transformInterestFromApi(interest: any): Interest {
  return {
    _id: interest._id || interest.id,
    fromUserId: interest.fromUserId,
    toUserId: interest.toUserId,
    status: interest.status || "pending",
    createdAt: interest.createdAt || Date.now(),
    // updatedAt removed; not in Interest type

    // Profile enrichment
    fromProfile: interest.fromProfile
      ? {
          fullName: interest.fromProfile.fullName,
          city: interest.fromProfile.city,
          profileImageIds: interest.fromProfile.profileImageIds || [],
          profileImageUrls:
            interest.fromProfile.profileImageUrls ||
            interest.fromProfile.images ||
            [],
        }
      : undefined,

    toProfile: interest.toProfile
      ? {
          fullName: interest.toProfile.fullName,
          city: interest.toProfile.city,
          profileImageIds: interest.toProfile.profileImageIds || [],
          profileImageUrls:
            interest.toProfile.profileImageUrls ||
            interest.toProfile.images ||
            [],
        }
      : undefined,
  };
}

export function transformMatchFromApi(match: any): Match {
  return {
    _id: match._id || match.id,
    participants: match.participants || [],
    createdAt: match.createdAt || Date.now(),
    lastMessageAt: match.lastMessageAt,
    conversationId: match.conversationId,
    profiles: (match.profiles || []).map((profile: any) => ({
      fullName: profile.fullName,
      city: profile.city,
      profileImageIds: profile.profileImageIds || [],
      profileImageUrls: profile.profileImageUrls || profile.images || [],
    })),
  };
}

// Search result transformations
export function transformSearchResultFromApi(result: any): any {
  return {
    userId: result.userId || result.id,
    email: result.email,
    profile: {
      fullName: result.profile?.fullName || result.fullName,
      city: result.profile?.city || result.city,
      dateOfBirth: result.profile?.dateOfBirth || result.dateOfBirth,
      hiddenFromSearch: Boolean(
        result.profile?.hiddenFromSearch || result.hiddenFromSearch
      ),
      boostedUntil: result.profile?.boostedUntil || result.boostedUntil,
      subscriptionPlan:
        result.profile?.subscriptionPlan || result.subscriptionPlan,
      hideFromFreeUsers: Boolean(
        result.profile?.hideFromFreeUsers || result.hideFromFreeUsers
      ),
      profileImageUrls:
        result.profile?.profileImageUrls ||
        result.profile?.images ||
        result.profileImageUrls ||
        result.images ||
        [],
      ...result.profile,
    },
  };
}

// Generic API response transformation
export function transformApiResponse<T>(
  response: any,
  transformer?: (data: any) => T
): { success: boolean; data?: T; error?: any } {
  if (response.success === false || response.error) {
    return {
      success: false,
      error: response.error || { message: "Unknown error" },
    };
  }

  const data = response.data || response;

  return {
    success: true,
    data: transformer ? transformer(data) : data,
  };
}

// Array transformation helper
export function transformArray<T, U>(
  array: T[],
  transformer: (item: T) => U
): U[] {
  return Array.isArray(array) ? array.map(transformer) : [];
}

// Pagination response transformation
export function transformPaginatedResponse<T, U>(
  response: any,
  itemTransformer: (item: T) => U
): {
  items: U[];
  total: number;
  hasMore: boolean;
  nextPage?: number;
} {
  return {
    items: transformArray(
      response.items || response.data || [],
      itemTransformer
    ),
    total: response.total || 0,
    hasMore: Boolean(response.hasMore),
    nextPage: response.nextPage,
  };
}

// Date transformation utilities
export function formatDateForApi(date: string | Date): string {
  if (!date) return "";
  return new Date(date).toISOString();
}

export function formatDateFromApi(dateString: string): string {
  if (!dateString) return "";
  return new Date(dateString).toISOString().split("T")[0];
}

// Sanitization helpers
export function sanitizeForApi(data: any): any {
  if (typeof data !== "object" || data === null) {
    return data;
  }

  const sanitized: any = {};

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      if (typeof value === "string") {
        sanitized[key] = value.trim();
      } else if (Array.isArray(value)) {
        sanitized[key] = value.filter(
          (item) => item !== undefined && item !== null
        );
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
}
