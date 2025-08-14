import { useState, useEffect, useCallback, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import {
  MessageSyncManager,
  SyncState,
  ConversationSyncState,
  SyncError,
} from "../utils/messagingSync";
import { useApiClient } from "../utils/api";
import { useRealtimeMessaging } from "./useRealtimeMessaging";
import { useClerkAuth } from "../contexts/ClerkAuthContext"

interface UseMessageSyncOptions {
  enableAutoSync?: boolean;
  syncInterval?: number;
  conflictResolution?: "client" | "server" | "manual";
  onSyncComplete?: () => void;
  onSyncError?: (error: SyncError) => void;
  onConflictDetected?: (conflict: any) => void;
}

interface MessageSyncHookState {
  isInitialized: boolean;
  isSyncing: boolean;
  lastSyncTime: number;
  syncErrors: SyncError[];
  conflictedMessages: any[];
  syncStats: any;
  connectionStatus: "connected" | "disconnected" | "connecting";
}

/**
 * Hook for managing cross-platform message synchronization
 */
export function useMessageSync(options: UseMessageSyncOptions = {}) {
  const {
    enableAutoSync = true,
    syncInterval = 30000,
    conflictResolution = "server",
    onSyncComplete,
    onSyncError,
    onConflictDetected,
  } = options;

  const [state, setState] = useState<MessageSyncHookState>({
    isInitialized: false,
    isSyncing: false,
    lastSyncTime: 0,
    syncErrors: [],
    conflictedMessages: [],
    syncStats: {},
    connectionStatus: "disconnected",
  });

  const { } = useClerkAuth();
  const apiClient = useApiClient();
  const { service: realtimeService, isConnected } = useRealtimeMessaging();

  const syncManagerRef = useRef<MessageSyncManager | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Initialize sync manager
  useEffect(() => {
    if (!userId || syncManagerRef.current) return;

    const initializeSync = async () => {
      try {
        const syncManager = new MessageSyncManager(apiClient, {
          conflictResolution,
          enableRealtime: true,
        });

        // Setup event listeners
        syncManager.on("initialized", () => {
          setState((prev) => ({ ...prev, isInitialized: true }));
        });

        syncManager.on("sync_started", () => {
          setState((prev) => ({ ...prev, isSyncing: true }));
        });

        syncManager.on("sync_completed", () => {
          setState((prev) => ({
            ...prev,
            isSyncing: false,
            lastSyncTime: Date.now(),
            syncStats: syncManager.getSyncStats(),
          }));
          onSyncComplete?.();
        });

        syncManager.on("sync_failed", (error) => {
          setState((prev) => ({ ...prev, isSyncing: false }));
        });

        syncManager.on("sync_error", (error: SyncError) => {
          setState((prev) => ({
            ...prev,
            syncErrors: [...prev.syncErrors, error],
          }));
          onSyncError?.(error);
        });

        syncManager.on("conflict_detected", (conflict) => {
          setState((prev) => ({
            ...prev,
            conflictedMessages: [...prev.conflictedMessages, conflict],
          }));
          onConflictDetected?.(conflict);
        });

        syncManager.on("realtime_connected", () => {
          setState((prev) => ({ ...prev, connectionStatus: "connected" }));
        });

        syncManager.on("realtime_disconnected", () => {
          setState((prev) => ({ ...prev, connectionStatus: "disconnected" }));
        });

        syncManager.on("sync_state_updated", () => {
          setState((prev) => ({
            ...prev,
            syncStats: syncManager.getSyncStats(),
          }));
        });

        // Initialize
        await syncManager.initialize(userId, realtimeService || undefined);
        syncManagerRef.current = syncManager;
      } catch (error) {
        console.error("Failed to initialize sync manager:", error);
      }
    };

    initializeSync();

    return () => {
      if (syncManagerRef.current) {
        syncManagerRef.current.destroy();
        syncManagerRef.current = null;
      }
    };
  }, [
    userId,
    apiClient,
    realtimeService,
    conflictResolution,
    onSyncComplete,
    onSyncError,
    onConflictDetected,
  ]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        // App came to foreground, trigger sync
        if (syncManagerRef.current && enableAutoSync) {
          syncManagerRef.current.syncAllConversations();
        }
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => subscription?.remove();
  }, [enableAutoSync]);

  // Update connection status based on realtime connection
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      connectionStatus: isConnected ? "connected" : "disconnected",
    }));
  }, [isConnected]);

  // Manual sync all conversations
  const syncAllConversations = useCallback(async () => {
    if (!syncManagerRef.current) {
      throw new Error("Sync manager not initialized");
    }

    await syncManagerRef.current.syncAllConversations();
  }, []);

  // Sync specific conversation
  const syncConversation = useCallback(async (conversationId: string) => {
    if (!syncManagerRef.current) {
      throw new Error("Sync manager not initialized");
    }

    await syncManagerRef.current.syncConversation(conversationId);
  }, []);

  // Force sync conversation (ignores current state)
  const forceSyncConversation = useCallback(async (conversationId: string) => {
    if (!syncManagerRef.current) {
      throw new Error("Sync manager not initialized");
    }

    await syncManagerRef.current.forceSyncConversation(conversationId);
  }, []);

  // Clear sync errors
  const clearSyncErrors = useCallback(() => {
    if (!syncManagerRef.current) return;

    syncManagerRef.current.clearSyncErrors();
    setState((prev) => ({ ...prev, syncErrors: [] }));
  }, []);

  // Resolve conflict
  const resolveConflict = useCallback(
    async (messageId: string, resolution: "keep_local" | "keep_server") => {
      if (!syncManagerRef.current) {
        throw new Error("Sync manager not initialized");
      }

      await syncManagerRef.current.resolveConflict(messageId, resolution);

      // Update state
      setState((prev) => ({
        ...prev,
        conflictedMessages: prev.conflictedMessages.filter(
          (c) => c.message._id !== messageId
        ),
      }));
    },
    []
  );

  // Get sync stats
  const getSyncStats = useCallback(() => {
    if (!syncManagerRef.current) return null;
    return syncManagerRef.current.getSyncStats();
  }, []);

  // Check if conversation is synced
  const isConversationSynced = useCallback(
    (conversationId: string): boolean => {
      const stats = getSyncStats();
      return stats ? stats.syncedConversations > 0 : false;
    },
    [getSyncStats]
  );

  // Get sync status for conversation
  const getConversationSyncStatus = useCallback(
    (conversationId: string): "synced" | "syncing" | "error" | "unknown" => {
      // This would need to be implemented in the sync manager
      return "unknown";
    },
    []
  );

  return {
    // State
    ...state,

    // Actions
    syncAllConversations,
    syncConversation,
    forceSyncConversation,
    clearSyncErrors,
    resolveConflict,

    // Utilities
    getSyncStats,
    isConversationSynced,
    getConversationSyncStatus,

    // Computed properties
    hasErrors: state.syncErrors.length > 0,
    hasConflicts: state.conflictedMessages.length > 0,
    isOnline: state.connectionStatus === "connected",
    canSync: state.isInitialized && !state.isSyncing,
  };
}

/**
 * Hook for monitoring sync status of a specific conversation
 */
export function useConversationSync(conversationId: string) {
  const [syncState, setSyncState] = useState<ConversationSyncState | null>(
    null
  );
  const [lastSyncTime, setLastSyncTime] = useState<number>(0);
  const [syncError, setSyncError] = useState<string | null>(null);

  const {
    syncConversation,
    forceSyncConversation,
    isInitialized,
    isSyncing: globalSyncing,
  } = useMessageSync();

  // Sync this conversation
  const sync = useCallback(async () => {
    if (!conversationId) return;

    try {
      setSyncError(null);
      await syncConversation(conversationId);
      setLastSyncTime(Date.now());
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Sync failed");
    }
  }, [conversationId, syncConversation]);

  // Force sync this conversation
  const forceSync = useCallback(async () => {
    if (!conversationId) return;

    try {
      setSyncError(null);
      await forceSyncConversation(conversationId);
      setLastSyncTime(Date.now());
    } catch (error) {
      setSyncError(
        error instanceof Error ? error.message : "Force sync failed"
      );
    }
  }, [conversationId, forceSyncConversation]);

  // Auto-sync on mount and conversation change
  useEffect(() => {
    if (isInitialized && conversationId) {
      sync();
    }
  }, [isInitialized, conversationId, sync]);

  return {
    // State
    syncState,
    lastSyncTime,
    syncError,
    isSyncing: globalSyncing,

    // Actions
    sync,
    forceSync,

    // Computed
    needsSync: lastSyncTime === 0 || Date.now() - lastSyncTime > 60000, // 1 minute
    hasError: !!syncError,
  };
}

/**
 * Hook for handling sync conflicts
 */
export function useSyncConflicts() {
  const { conflictedMessages, resolveConflict, hasConflicts } = useMessageSync({
    conflictResolution: "manual", // Force manual resolution for this hook
  });

  // Resolve all conflicts with same resolution
  const resolveAllConflicts = useCallback(
    async (resolution: "keep_local" | "keep_server") => {
      for (const conflict of conflictedMessages) {
        try {
          await resolveConflict(conflict.message._id, resolution);
        } catch (error) {
          console.error("Failed to resolve conflict:", error);
        }
      }
    },
    [conflictedMessages, resolveConflict]
  );

  // Get conflicts for specific conversation
  const getConflictsForConversation = useCallback(
    (conversationId: string) => {
      return conflictedMessages.filter(
        (c) => c.conversationId === conversationId
      );
    },
    [conflictedMessages]
  );

  return {
    conflicts: conflictedMessages,
    hasConflicts,
    resolveConflict,
    resolveAllConflicts,
    getConflictsForConversation,
    conflictCount: conflictedMessages.length,
  };
}
