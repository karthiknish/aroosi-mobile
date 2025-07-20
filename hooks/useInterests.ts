import { useState, useEffect, useCallback } from "react";

import { useAuth } from "../contexts/AuthContext";
import { useApiClient } from "../utils/api";
import { Interest } from "../types/interest";

export interface UseInterestsResult {
  // Data
  sentInterests: Interest[];
  receivedInterests: Interest[];

  // Loading states
  loading: boolean;
  sending: boolean;
  responding: boolean; // Kept for backward compatibility but will be unused

  // Actions
  loadSentInterests: () => Promise<void>;
  loadReceivedInterests: () => Promise<void>;
  sendInterest: (toUserId: string) => Promise<boolean>;
  /**
   * @deprecated Manual interest responses are not supported in auto-matching system
   * This method is kept for backward compatibility but will always return false
   */
  respondToInterest: (
    interestId: string,
    response: "accept" | "reject"
  ) => Promise<boolean>;
  removeInterest: (toUserId: string) => Promise<boolean>;

  // Computed values
  totalSentCount: number;
  pendingReceivedCount: number;
  acceptedCount: number;
  matchedCount: number;
  
  // Helper functions
  isMutualInterest: (userId: string) => boolean;
}

export function useInterests(): UseInterestsResult {
  const { user } = useAuth();
  const apiClient = useApiClient();

  const [sentInterests, setSentInterests] = useState<Interest[]>([]);
  const [receivedInterests, setReceivedInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [responding, setResponding] = useState(false);

  // Load sent interests
  const loadSentInterests = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await apiClient.getSentInterests(user.id);
      if (response.success && response.data) {
        // Handle response data - main project returns enriched interests
        const interests = Array.isArray(response.data) ? response.data : [];
        // Add id field for backward compatibility with mobile components
        const processedInterests = interests.map((interest: any) => ({
          ...interest,
          id: interest._id || interest.id, // Ensure id field exists
        }));
        setSentInterests(processedInterests);
      }
    } catch (error) {
      console.error("Error loading sent interests:", error);
    } finally {
      setLoading(false);
    }
  }, [user, apiClient]);

  // Load received interests
  const loadReceivedInterests = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await apiClient.getReceivedInterests(user.id);
      if (response.success && response.data) {
        // Handle response data - main project returns enriched interests
        const interests = Array.isArray(response.data) ? response.data : [];
        // Add id field for backward compatibility with mobile components
        const processedInterests = interests.map((interest: any) => ({
          ...interest,
          id: interest._id || interest.id, // Ensure id field exists
        }));
        setReceivedInterests(processedInterests);
      }
    } catch (error) {
      console.error("Error loading received interests:", error);
    } finally {
      setLoading(false);
    }
  }, [user, apiClient]);

  // Send interest
  const sendInterest = useCallback(
    async (toUserId: string): Promise<boolean> => {
      if (!user || sending) return false;

      try {
        setSending(true);
        const response = await apiClient.sendInterest(toUserId);

        if (response.success) {
          // Reload sent interests to get updated list
          await loadSentInterests();
          return true;
        }
        return false;
      } catch (error) {
        console.error("Error sending interest:", error);
        return false;
      } finally {
        setSending(false);
      }
    },
    [user, sending, apiClient, loadSentInterests]
  );

  // Respond to interest (accept/reject)
  // @deprecated - Auto-matching system handles interest responses automatically
  const respondToInterest = useCallback(
    async (
      interestId: string,
      response: "accept" | "reject"
    ): Promise<boolean> => {
      console.warn(
        "respondToInterest is deprecated. Auto-matching system handles interest responses automatically when mutual interest is detected."
      );
      
      // Return false to indicate this action is not supported
      return false;
    },
    []
  );

  // Remove interest - matches main project behavior
  const removeInterest = useCallback(
    async (toUserId: string): Promise<boolean> => {
      if (!user) return false;

      try {
        const response = await apiClient.removeInterest(toUserId);

        if (response.success) {
          // Remove from local state - handle both _id and id for compatibility
          setSentInterests((prev) =>
            prev.filter((interest) => interest.toUserId !== toUserId)
          );
          return true;
        }
        return false;
      } catch (error) {
        console.error("Error removing interest:", error);
        return false;
      }
    },
    [user, apiClient]
  );

  // Computed values - updated to match main project status values
  const totalSentCount = sentInterests.length;
  const pendingReceivedCount = receivedInterests.filter(
    (interest) => interest.status === "pending"
  ).length;
  const acceptedCount = sentInterests.filter(
    (interest) => interest.status === "accepted"
  ).length;
  const matchedCount = acceptedCount; // In auto-matching system, accepted = matched

  // Helper function to check for mutual interest
  const isMutualInterest = useCallback((userId: string) => {
    const hasSentInterest = sentInterests.some(
      interest => interest.toUserId === userId && interest.status === "pending"
    );
    
    const hasReceivedInterest = receivedInterests.some(
      interest => interest.fromUserId === userId && interest.status === "pending"
    );
    
    return hasSentInterest && hasReceivedInterest;
  }, [sentInterests, receivedInterests]);

  // Auto-load on mount and user change
  useEffect(() => {
    if (user) {
      loadSentInterests();
      loadReceivedInterests();
    }
  }, [user, loadSentInterests, loadReceivedInterests]);

  return {
    // Data
    sentInterests,
    receivedInterests,

    // Loading states
    loading,
    sending,
    responding,

    // Actions
    loadSentInterests,
    loadReceivedInterests,
    sendInterest,
    respondToInterest,
    removeInterest,

    // Computed values
    totalSentCount,
    pendingReceivedCount,
    acceptedCount,
    matchedCount,
    isMutualInterest,
  };
}

// Hook for checking interest status between two users
export function useInterestStatus(otherUserId?: string) {
  const { user } = useAuth();
  const apiClient = useApiClient();
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!user || !otherUserId) return;

    try {
      setLoading(true);
      const response = await apiClient.getInterestStatus(user.id, otherUserId);
      if (response.success && response.data) {
        setStatus(response.data.status);
      }
    } catch (error) {
      console.error("Error checking interest status:", error);
    } finally {
      setLoading(false);
    }
  }, [user, otherUserId, apiClient]);

  useEffect(() => {
    if (user && otherUserId) {
      checkStatus();
    }
  }, [user, otherUserId, checkStatus]);

  return {
    status,
    loading,
    checkStatus,
  };
}
