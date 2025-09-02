import { useState, useEffect } from 'react';
import { networkManager, NetworkState } from '@utils/NetworkManager';
import { logger } from "@utils/logger";

export interface UseNetworkStatusResult {
  isOnline: boolean;
  isConnected: boolean;
  networkState: NetworkState;
  retry: () => void;
}

export function useNetworkStatus(): UseNetworkStatusResult {
  const [networkState, setNetworkState] = useState<NetworkState>(
    networkManager.getNetworkState()
  );

  useEffect(() => {
    const unsubscribe = networkManager.subscribe(setNetworkState);
    return unsubscribe;
  }, []);

  const retry = () => {
    // Force a network check and process any queued requests
    if (networkManager.isOnline()) {
      // Process any queued requests
      logger.debug("NETWORK", "Retrying network operations...");
    }
  };

  return {
    isOnline: networkManager.isOnline(),
    isConnected: networkState.isConnected,
    networkState,
    retry,
  };
}