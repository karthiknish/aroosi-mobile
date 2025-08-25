import React, { createContext, useContext, useCallback, useState } from "react";
import { useRealtime } from "@/hooks/useRealtime";
import { useQueryClient } from "@tanstack/react-query";
import { showInfoToast } from "../utils/toast";

interface RealtimeContextType {
  isConnected: boolean;
  connectionError: string | null;
  connect: () => void;
  disconnect: () => void;
  clearEvents: () => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(
  undefined
);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [lastMessageNotification, setLastMessageNotification] =
    useState<number>(0);

  const { isConnected, connectionError, connect, disconnect, clearEvents } =
    useRealtime({
      autoConnect: true,
      onNewMessage: useCallback(
        (message: any) => {
          // Update message queries
          queryClient.invalidateQueries({ queryKey: ["messages"] });
          queryClient.invalidateQueries({ queryKey: ["conversations"] });

          // Show notification (throttled to prevent spam)
          const now = Date.now();
          if (now - lastMessageNotification > 3000) {
            // 3 second throttle
            showInfoToast(
              `New message from ${message.senderName || "someone"}`
            );
            setLastMessageNotification(now);
          }
        },
        [queryClient, lastMessageNotification]
      ),

      onNewMatch: useCallback(
        (match: any) => {
          // Update match queries
          queryClient.invalidateQueries({ queryKey: ["matches"] });
          queryClient.invalidateQueries({ queryKey: ["profiles"] });

          showInfoToast(`New match with ${match.profileName || "someone"}! 🎉`);
        },
        [queryClient]
      ),

      onTypingIndicator: useCallback(
        (data: any) => {
          // Update typing indicators in message queries
          queryClient.setQueryData(
            ["typingIndicators", data.conversationId],
            (old: any) => {
              if (!old) return [data];

              const filtered = old.filter(
                (user: any) => user.userId !== data.userId
              );
              if (data.isTyping) {
                return [...filtered, { ...data, timestamp: Date.now() }];
              }
              return filtered;
            }
          );
        },
        [queryClient]
      ),

      onProfileView: useCallback(
        (data: any) => {
          // Update profile view counts
          queryClient.invalidateQueries({
            queryKey: ["profile", data.profileId],
          });
          queryClient.invalidateQueries({ queryKey: ["profileViews"] });
        },
        [queryClient]
      ),
    });

  const value: RealtimeContextType = {
    isConnected,
    connectionError,
    connect,
    disconnect,
    clearEvents,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtimeContext(): RealtimeContextType {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error(
      "useRealtimeContext must be used within a RealtimeProvider"
    );
  }
  return context;
}
