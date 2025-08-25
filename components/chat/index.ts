// Chat Components
export { default as ChatInput } from './ChatInput';
export { default as TypingIndicator } from './TypingIndicator';
export { default as MessageStatusIndicator } from './MessageStatusIndicator';
export { default as VoiceMessage } from './VoiceMessage';
export { default as VoiceRecorder } from './VoiceRecorder';

// Hooks
export { useTypingIndicator } from "../../src/hooks/useTypingIndicator";
export { useMessageStatus } from "../../src/hooks/useMessageStatus";
export { useVoiceRecording } from "../../src/hooks/useVoiceRecording";
export { useAudioPlayback } from "../../src/hooks/useAudioPlayback";

// Types
export type {
  TypingState,
  UseTypingIndicatorResult,
} from "../../src/hooks/useTypingIndicator";
export type { UseMessageStatusResult } from "../../src/hooks/useMessageStatus";
export type {
  VoiceRecordingState,
  UseVoiceRecordingResult,
} from "../../src/hooks/useVoiceRecording";
export type {
  AudioPlaybackState,
  UseAudioPlaybackResult,
} from "../../src/hooks/useAudioPlayback";
export type { Message } from "../../src/types/message";

// Local derived helper types for convenience (avoid exporting non-existent source types)
import type { Message as __MessageType } from "../../src/types/message";
export type MessageStatus = NonNullable<__MessageType["status"]>;