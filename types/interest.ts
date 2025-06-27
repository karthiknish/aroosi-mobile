export interface Interest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status:
    | "pending"
    | "accepted"
    | "rejected"
    | "matched"
    | "sent"
    | "received"
    | "declined";
  createdAt: number;
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
