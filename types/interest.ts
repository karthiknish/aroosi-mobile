// Interest type matching main aroosi project exactly
export interface Interest {
  _id: string;
  fromUserId: string;
  toUserId: string;
  status: "pending" | "accepted" | "rejected"; // Only these 3 statuses exist
  createdAt: number;
  // Profile enrichment from API responses
  fromProfile?: {
    fullName: string;
    city: string;
    profileImageIds?: string[];
    profileImageUrls?: string[];
  } | null;
  toProfile?: {
    fullName: string;
    city: string;
    profileImageIds?: string[];
    profileImageUrls?: string[];
  } | null;
}

// Legacy support for mobile components that might use 'id'
export interface InterestWithId extends Interest {
  id: string; // Alias for _id for backward compatibility
}
