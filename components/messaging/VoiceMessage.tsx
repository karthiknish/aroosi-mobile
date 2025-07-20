import React, { useCallback } from "react";
import { VoicePlayer } from "./VoicePlayer";

interface VoiceMessageDisplayProps {
  uri?: string;
  storageId?: string;
  duration?: number;
  style?: any;
  small?: boolean;
}

export const VoiceMessageDisplay: React.FC<VoiceMessageDisplayProps> = ({
  uri,
  storageId,
  duration,
  style,
  small,
}) => {
  // Fetch URL from storage ID - simplified for now
  const fetchVoiceUrl = useCallback(async (id: string) => {
    // This would integrate with the voice message manager
    // For now, return the storage ID as a placeholder URL
    return `voice://storage/${id}`;
  }, []);

  return (
    <VoicePlayer
      uri={uri}
      storageId={storageId}
      duration={duration}
      onFetchUrl={fetchVoiceUrl}
      style={style}
      small={small}
    />
  );
};
