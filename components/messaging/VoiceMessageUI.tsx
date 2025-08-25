import React from "react";
import { View, StyleSheet } from "react-native";
import { VoiceMessageDisplay } from "./VoiceMessage";
import { VoiceMessageBubble } from "./VoiceMessageBubble";
import { VoiceMessageToolbar } from "./VoiceMessageToolbar";
import { VoiceRecorder } from "./VoiceRecorder";
import { VoicePlayer } from "./VoicePlayer";
import {
  VoiceDurationIndicator,
  VoiceDurationWarning,
} from "./VoiceDurationIndicator";

// Export all voice message components for easy import
export {
  VoiceMessageDisplay,
  VoiceMessageBubble,
  VoiceMessageToolbar,
  VoiceRecorder,
  VoicePlayer,
  VoiceDurationIndicator,
  VoiceDurationWarning,
};

// Main voice message UI component that can be used in chat screens
interface VoiceMessageUIProps {
  conversationId: string;
  fromUserId: string;
  toUserId: string;
  onVoiceMessageSent?: (messageId: string) => void;
  onError?: (error: Error) => void;
  style?: any;
  mode?: "toolbar" | "input" | "recorder";
  disabled?: boolean;
}

export const VoiceMessageUI: React.FC<VoiceMessageUIProps> = ({
  conversationId,
  fromUserId,
  toUserId,
  onVoiceMessageSent,
  onError,
  style,
  mode = "toolbar",
  disabled = false,
}) => {
  const commonProps = {
    conversationId,
    fromUserId,
    toUserId,
    onMessageSent: onVoiceMessageSent,
    onError,
    style,
  };

  switch (mode) {
    case "toolbar":
      return (
        <VoiceMessageToolbar
          {...commonProps}
          onVoiceMessageSent={onVoiceMessageSent}
          disabled={disabled}
        />
      );

    case "input":
      // Fall back to toolbar mode since input component has been removed
      return (
        <VoiceMessageToolbar
          {...commonProps}
          onVoiceMessageSent={onVoiceMessageSent}
          disabled={disabled}
        />
      );

    case "recorder":
      return (
        <View style={[styles.recorderContainer, style]}>
          <VoiceRecorder
            conversationId={conversationId}
            fromUserId={fromUserId}
            toUserId={toUserId}
            onRecordingComplete={(uri, duration) => {
              // Handle recording completion
              console.log("Recording completed:", { uri, duration });
            }}
            onRecordingError={onError}
          />
        </View>
      );

    default:
      return (
        <VoiceMessageToolbar
          {...commonProps}
          onVoiceMessageSent={onVoiceMessageSent}
          disabled={disabled}
        />
      );
  }
};

const styles = StyleSheet.create({
  recorderContainer: {
    padding: 16,
  },
});

// Utility component for displaying voice messages in chat bubbles
interface VoiceMessageChatBubbleProps {
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

export const VoiceMessageChatBubble: React.FC<VoiceMessageChatBubbleProps> = (
  props
) => {
  return <VoiceMessageBubble {...props} />;
};

// Utility component for voice message player only
interface VoiceMessagePlayerProps {
  uri?: string;
  storageId?: string;
  duration?: number;
  onPlaybackStart?: () => void;
  onPlaybackComplete?: () => void;
  onPlaybackError?: (error: Error) => void;
  style?: any;
  small?: boolean;
}

export const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = (
  props
) => {
  return <VoicePlayer {...props} />;
};
