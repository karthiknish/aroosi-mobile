// Engagement-related shared types

export type Icebreaker = {
  id: string;
  text: string;
  answered?: boolean;
  answer?: string;
};

// Quick Picks
export type QuickPickProfile = {
  userId: string;
  fullName?: string | null;
  city?: string | null;
  imageUrl?: string | null;
  // Optional, may be present for ordering
  viewsToday?: number;
  profileViewsToday?: number;
  views?: number | { today?: number };
};
