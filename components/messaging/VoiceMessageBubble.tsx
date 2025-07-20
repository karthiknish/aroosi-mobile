import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { VoicePlayer } from './VoicePlayer';
import { VoiceMessageManager } from '../../services/voiceMessageManager';
import { useApiClient } from '../../utils/api';
import { formatTime } from '../../utils/timeUtils';

interface VoiceMessageBubbleProps {
  messageId: string;
  storageId: string;
  duration: number;
  fileSize?: number;
  timestamp: Date;
  isOwn: boolean;
  isRead?: boolean;
  isDelivered?: boolean;
  onPlaybackStart?: () => void;
  onPlaybackComplete?: () => void;
  onError?: (error: Error) => void;
  style?: any;
}

export const VoiceMessageBubble: React.FC<VoiceMessageBubbleProps> = ({
  messageId,
  storageId,
  duration,
  fileSize,
  timestamp,
  isOwn,
  isRead,
  isDelivered,
  onPlaybackStart,
  onPlaybackComplete,
  onError,
  style,
}) => {
  const apiClient = useApiClient();
  const [voiceManager] = useState(() => new VoiceMessageManager(apiClient));
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Fetch voice URL
  const fetchVoiceUrl = useCallback(
    async (id: string) => {
      try {
        setIsDownloading(true);
        setDownloadError(null);
        
        // Try to get cached version first
        const cachedUri = await voiceManager.downloadVoiceMessage(id);
        if (cachedUri) {
          return cachedUri;
        }

        // Get URL if not cached
        const url = await voiceManager.getVoiceMessageUrl(id);
        return url;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load voice message';
        setDownloadError(errorMessage);
        onError?.(error instanceof Error ? error : new Error(errorMessage));
        return null;
      } finally {
        setIsDownloading(false);
      }
    },
    [voiceManager, onError]
  );

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get bubble style based on ownership
  const getBubbleStyle = () => {
    return [
      styles.bubble,
      isOwn ? styles.ownBubble : styles.otherBubble,
      style,
    ];
  };

  // Get text color based on ownership
  const getTextColor = () => {
    return isOwn ? '#ffffff' : '#333333';
  };

  return (
    <View style={getBubbleStyle()}>
      {/* Voice Player */}
      <View style={styles.playerContainer}>
        {isDownloading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={getTextColor()} />
            <Text style={[styles.loadingText, { color: getTextColor() }]}>
              Loading...
            </Text>
          </View>
        ) : downloadError ? (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: getTextColor() }]}>
              {downloadError}
            </Text>
            <TouchableOpacity
              onPress={() => fetchVoiceUrl(storageId)}
              style={styles.retryButton}
            >
              <Text style={[styles.retryText, { color: getTextColor() }]}>
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <VoicePlayer
            storageId={storageId}
            duration={duration}
            onFetchUrl={fetchVoiceUrl}
            onPlaybackStart={onPlaybackStart}
            onPlaybackComplete={onPlaybackComplete}
            onPlaybackError={onError}
            style={[
              styles.voicePlayer,
              { backgroundColor: isOwn ? 'rgba(255,255,255,0.1)' : '#f0f0f0' },
            ]}
          />
        )}
      </View>

      {/* Message Info */}
      <View style={styles.infoContainer}>
        <View style={styles.metadataContainer}>
          {fileSize && (
            <Text style={[styles.metadataText, { color: getTextColor() }]}>
              {formatFileSize(fileSize)}
            </Text>
          )}
          <Text style={[styles.metadataText, { color: getTextColor() }]}>
            {formatTime(timestamp)}
          </Text>
        </View>

        {/* Message Status (for own messages) */}
        {isOwn && (
          <View style={styles.statusContainer}>
            {isRead ? (
              <Text style={[styles.statusText, { color: getTextColor() }]}>✓✓</Text>
            ) : isDelivered ? (
              <Text style={[styles.statusText, { color: getTextColor() }]}>✓</Text>
            ) : (
              <Text style={[styles.statusText, { color: getTextColor() }]}>⏱</Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
    marginVertical: 2,
  },
  ownBubble: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#E5E5EA',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  playerContainer: {
    marginBottom: 8,
  },
  voicePlayer: {
    backgroundColor: 'transparent',
    padding: 0,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  errorContainer: {
    padding: 12,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 8,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  retryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  metadataContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metadataText: {
    fontSize: 12,
    opacity: 0.7,
    marginRight: 8,
  },
  statusContainer: {
    marginLeft: 8,
  },
  statusText: {
    fontSize: 12,
    opacity: 0.7,
  },
});"