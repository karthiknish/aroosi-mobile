import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "../utils/api";
import {
  ReportUserRequest,
  BlockUserRequest,
  UnblockUserRequest,
  BlockedUser,
  BlockStatus,
  SafetyApiResponse,
  ReportReason,
} from "../types/safety";

export function useSafety() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  // Report User Mutation
  const reportUser = useMutation({
    mutationFn: async (
      request: ReportUserRequest
    ): Promise<SafetyApiResponse> => {
      const response = await apiClient.reportUser(request);
      return response as SafetyApiResponse;
    },
    onSuccess: () => {
      console.log("User reported successfully");
    },
    onError: (error) => {
      console.error("Failed to report user:", error);
    },
  });

  // Block User Mutation
  const blockUser = useMutation({
    mutationFn: async (
      request: BlockUserRequest
    ): Promise<SafetyApiResponse> => {
      const response = await apiClient.blockUser(request);
      return response as SafetyApiResponse;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["blockedUsers"] });
      queryClient.invalidateQueries({
        queryKey: ["blockStatus", variables.blockedUserId],
      });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["searchProfiles"] });
    },
    onError: (error) => {
      console.error("Failed to block user:", error);
    },
  });

  // Unblock User Mutation
  const unblockUser = useMutation({
    mutationFn: async (
      request: UnblockUserRequest
    ): Promise<SafetyApiResponse> => {
      const response = await apiClient.unblockUser(request);
      return response as SafetyApiResponse;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["blockedUsers"] });
      queryClient.invalidateQueries({
        queryKey: ["blockStatus", variables.blockedUserId],
      });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["searchProfiles"] });
    },
    onError: (error) => {
      console.error("Failed to unblock user:", error);
    },
  });

  return {
    reportUser,
    blockUser,
    unblockUser,
  };
}

// Get Blocked Users Query Hook
export function useBlockedUsers() {
  const apiClient = useApiClient();

  return useQuery({
    queryKey: ["blockedUsers"],
    queryFn: async (): Promise<BlockedUser[]> => {
      const response = await apiClient.getBlockedUsers();
      return response.success ? (response.data as BlockedUser[]) : [];
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
      return response.success
        ? (response.data as BlockStatus)
        : { isBlocked: false, isBlockedBy: false, canInteract: true };
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Standalone Report User Hook
export function useReportUser() {
  const apiClient = useApiClient();

  return useMutation({
    mutationFn: async (
      request: ReportUserRequest
    ): Promise<SafetyApiResponse> => {
      return (await apiClient.reportUser(request)) as SafetyApiResponse;
    },
    onSuccess: () => {
      console.log("User reported successfully");
    },
    onError: (error) => {
      console.error("Failed to report user:", error);
    },
  });
}

// Standalone Block User Hook
export function useBlockUser() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      request: BlockUserRequest
    ): Promise<SafetyApiResponse> => {
      return (await apiClient.blockUser(request)) as SafetyApiResponse;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["blockedUsers"] });
      queryClient.invalidateQueries({
        queryKey: ["blockStatus", variables.blockedUserId],
      });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["searchProfiles"] });
    },
    onError: (error) => {
      console.error("Failed to block user:", error);
    },
  });
}

// Standalone Unblock User Hook
export function useUnblockUser() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      request: UnblockUserRequest
    ): Promise<SafetyApiResponse> => {
      return (await apiClient.unblockUser(request)) as SafetyApiResponse;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["blockedUsers"] });
      queryClient.invalidateQueries({
        queryKey: ["blockStatus", variables.blockedUserId],
      });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["searchProfiles"] });
    },
    onError: (error) => {
      console.error("Failed to unblock user:", error);
    },
  });
}
