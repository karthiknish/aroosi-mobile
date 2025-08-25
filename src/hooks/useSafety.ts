import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@utils/api";
import { showSuccessToast, showErrorToast } from "@utils/toast";
import {
  ReportUserRequest,
  BlockUserRequest,
  UnblockUserRequest,
  BlockedUser,
  BlockStatus,
  SafetyApiResponse,
  ReportReason,
} from "../../types/safety";

export function useSafety() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  // Base queries
  const blockedUsersQuery = useBlockedUsers();

  const reportUser = useReportUser();
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();

  const blockedUsers = blockedUsersQuery.data || [];
  const blockedUserIds = blockedUsers.map(b => b.blockedUserId);

  const isUserBlocked = (userId: string) => blockedUserIds.includes(userId);

  const checkIfBlocked = async (userId: string): Promise<boolean> => {
    try {
      if (!userId) return false;
      const res = await apiClient.checkBlockStatus(userId);
      return !!res.data?.isBlocked;
    } catch {
      return false;
    }
  };

  const refetchBlocked = () => blockedUsersQuery.refetch();

  // Async convenience wrappers mirroring web interface
  const reportUserAsync = async (
    userId: string,
    reason: ReportReason,
    description?: string
  ): Promise<boolean> => {
    if (!userId) return false;
    try {
      await reportUser.mutateAsync({ reportedUserId: userId, reason, description });
      return true;
    } catch {
      return false;
    }
  };

  const blockUserAsync = async (userId: string): Promise<boolean> => {
    if (!userId) return false;
    try {
      if (isUserBlocked(userId)) return true; // already blocked
      await blockUser.mutateAsync({ blockedUserId: userId });
      return true;
    } catch {
      return false;
    }
  };

  const unblockUserAsync = async (userId: string): Promise<boolean> => {
    if (!userId) return false;
    try {
      if (!isUserBlocked(userId)) return true; // not blocked
      await unblockUser.mutateAsync({ blockedUserId: userId });
      return true;
    } catch {
      return false;
    }
  };

  return {
    // raw mutations
    reportUser,
    blockUser,
    unblockUser,

    // data
    blockedUsers,
    blockedUserIds,
    blockedUsersLoading: blockedUsersQuery.isLoading,

    // helpers
    isUserBlocked,
    checkIfBlocked,
    refetchBlocked,

    // async wrapper methods
    reportUserAsync,
    blockUserAsync,
    unblockUserAsync,
  };
}

// Get Blocked Users Query Hook
export function useBlockedUsers() {
  const apiClient = useApiClient();

  return useQuery({
    queryKey: ["blockedUsers"],
    queryFn: async (): Promise<BlockedUser[]> => {
      const response = await apiClient.getBlockedUsers();
      if (response.success && response.data) {
        // Handle both direct array and nested object response formats
        const blockedUsers = response.data.blockedUsers || response.data;
        if (Array.isArray(blockedUsers)) {
          // Map to BlockedUser from types/safety.ts
          return blockedUsers.map((u: any) => ({
            _id: u._id || u.id || '',
            blockerUserId: u.blockerUserId || u.userId || '',
            blockedUserId: u.blockedUserId || '',
            createdAt: u.createdAt || 0,
          }));
        }
        return [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Check Block Status Query Hook
export function useBlockStatus(userId: string | null) {
  const apiClient = useApiClient();

  return useQuery({
    queryKey: ["blockStatus", userId],
    queryFn: async (): Promise<BlockStatus> => {
      if (!userId) {
        return { isBlocked: false, isBlockedBy: false, canInteract: true };
      }
      const response = await apiClient.checkBlockStatus(userId);
      if (response.success && response.data) {
        return {
          isBlocked: response.data.isBlocked || false,
          isBlockedBy: response.data.isBlockedBy || false,
          canInteract: response.data.canInteract !== false, // Default to true if not specified
        };
      }
      return { isBlocked: false, isBlockedBy: false, canInteract: true };
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Standalone Report User Hook
export function useReportUser() {
  const apiClient = useApiClient();
  return useMutation({
    mutationFn: async (request: ReportUserRequest): Promise<SafetyApiResponse> => {
      return (await apiClient.reportUser(request)) as SafetyApiResponse;
    },
    onSuccess: () => {
      showSuccessToast("User reported successfully. Our team will review this report.");
    },
    onError: (error: any) => {
      showErrorToast(error?.message || "Failed to report user");
    },
  });
}

// Standalone Block User Hook
export function useBlockUser() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: BlockUserRequest): Promise<SafetyApiResponse> => {
      return (await apiClient.blockUser(request)) as SafetyApiResponse;
    },
    onSuccess: (_d, variables) => {
      showSuccessToast("User blocked successfully");
      queryClient.invalidateQueries({ queryKey: ["blockedUsers"] });
      queryClient.invalidateQueries({ queryKey: ["blockStatus", variables.blockedUserId] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["searchProfiles"] });
    },
    onError: (error: any) => {
      showErrorToast(error?.message || "Failed to block user");
    },
  });
}

// Standalone Unblock User Hook
export function useUnblockUser() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: UnblockUserRequest): Promise<SafetyApiResponse> => {
      return (await apiClient.unblockUser(request)) as SafetyApiResponse;
    },
    onSuccess: (_d, variables) => {
      showSuccessToast("User unblocked successfully");
      queryClient.invalidateQueries({ queryKey: ["blockedUsers"] });
      queryClient.invalidateQueries({ queryKey: ["blockStatus", variables.blockedUserId] });
    },
    onError: (error: any) => {
      showErrorToast(error?.message || "Failed to unblock user");
    },
  });
}
