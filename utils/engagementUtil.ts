import { apiClient, request } from "./api";

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

// Shortlist notes (parity with web)
export async function fetchNote(
  toUserId: string
): Promise<{ note?: string; updatedAt?: number } | null> {
  try {
    const res = await request<{ note?: string; updatedAt?: number }>(
      "/engagement/note?" + new URLSearchParams({ toUserId }).toString(),
      { method: "GET" }
    );
    if (res.success) {
      const payload: any = res.data as any;
      return (payload?.data as any) || payload || null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function setNote(
  toUserId: string,
  note: string
): Promise<boolean> {
  try {
    const res = await request<{ success?: boolean }>("/engagement/note", {
      method: "POST",
      body: JSON.stringify({ toUserId, note }),
    });
    return !!(res as any)?.success || !!(res.data as any)?.success;
  } catch {
    return false;
  }
}
