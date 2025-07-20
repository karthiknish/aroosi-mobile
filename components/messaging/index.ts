// Individual component exports
export { VoiceRecorder } from "./VoiceRecorder";
export { VoicePlayer } from "./VoicePlayer";
export { VoiceMessageInput, VoiceMessageDisplay } from "./VoiceMessage";
export { VoiceMessageBubble } from "./VoiceMessageBubble";
export { VoiceMessageToolbar } from "./VoiceMessageToolbar";
export {
  VoiceDurationIndicator,
  VoiceDurationWarning,
} from "./VoiceDurationIndicator";

// Voice Message UI Components
export {
  VoiceMessageUI,
  VoiceMessageChatBubble,
  VoiceMessagePlayer,
} from "./VoiceMessageUI";

// Feature Gate Components
export { FeatureGateModal } from "./FeatureGateModal";

// Voice Message Services
export { VoiceMessageManager } from "../../services/voiceMessageManager";
export { VoiceMessageStorage } from "../../services/voiceMessageStorage";

// Voice Message Hooks
export { useVoiceRecording } from "../../hooks/useVoiceRecording";
export { useVoicePlayback } from "../../hooks/useVoicePlayback";
export {
  useMessagingFeatures,
  useVoiceMessageLimits,
} from "../../hooks/useMessagingFeatures";
