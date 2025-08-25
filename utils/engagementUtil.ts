import { apiClient } from "./api";

export type ShortlistEntry = {
  userId: string;
  fullName?: string | null;
  profileImageUrls?: string[] | null;
  createdAt: number;
};

export async function fetchShortlists(): Promise<ShortlistEntry[]> {
  try {
    const res = await apiClient.fetchShortlists();
    if (res.success && Array.isArray(res.data)) {
      return res.data as ShortlistEntry[];
    }
    return [];
  } catch {
    return [];
  }
}

export async function toggleShortlist(
  toUserId: string
): Promise<{ success: boolean; added?: boolean; removed?: boolean }> {
  try {
    const res = await apiClient.toggleShortlist(toUserId);
    if (res.success) {
      return res.data || { success: true };
    }
    return { success: false };
  } catch (e: any) {
    const msg = e?.message || "Failed to update shortlist";
    throw new Error(msg);
  }
}
