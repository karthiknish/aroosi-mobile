import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Keyboard,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Layout } from "../../constants";
import { rgbaHex } from "@utils/color";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import VoiceRecorder from "./VoiceRecorder";
import PlatformHaptics from "../../utils/PlatformHaptics";
import { uriToBlob } from "../../utils/fileUtils";
import EmojiPicker, { EmojiType } from "rn-emoji-keyboard";
import InlineUpgradeBanner from "../subscription/InlineUpgradeBanner";
import { useSubscription } from "@/hooks/useSubscription";

interface ChatInputProps {
  conversationId: string;
  currentUserId: string;
  onSendMessage: (content: string, type: "text") => void;
  onSendVoiceMessage: (uri: string, duration: number) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
}

export default function ChatInput({
  conversationId,
  currentUserId,
  onSendMessage,
  onSendVoiceMessage,
  placeholder = "Type a message...",
  disabled = false,
  maxLength = 1000,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const { subscription } = useSubscription();

  const inputRef = useRef<TextInput>(null);

  // useTypingIndicator expects an options object
  const { startTyping, stopTyping } = useTypingIndicator({
    conversationId,
    userId: currentUserId,
  });

  const canSend = message.trim().length > 0 && !disabled;

  // Handle keyboard events
  React.useEffect(() => {
    const keyboardDidShow = () => setIsKeyboardVisible(true);
    const keyboardDidHide = () => setIsKeyboardVisible(false);

    const showSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      keyboardDidShow
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      keyboardDidHide
    );

    return () => {
      showSubscription?.remove();
      hideSubscription?.remove();
    };
  }, []);

  const handleTextChange = useCallback(
    (text: string) => {
      setMessage(text);

      if (text.trim().length > 0) {
        startTyping();
      } else {
        stopTyping();
      }
    },
    [startTyping, stopTyping]
  );

  const handleEmojiToggle = useCallback(async () => {
    await PlatformHaptics.light();
    if (isEmojiPickerOpen) {
      setIsEmojiPickerOpen(false);
      inputRef.current?.focus();
    } else {
      Keyboard.dismiss();
      setIsEmojiPickerOpen(true);
    }
  }, [isEmojiPickerOpen]);

  const handleEmojiSelected = useCallback(
    (emoji: EmojiType) => {
      const symbol = emoji?.emoji || "";
      if (!symbol) return;
      const newText = message + symbol;
      setMessage(newText);
      startTyping();
    },
    [message, startTyping]
  );

  const handleSend = useCallback(async () => {
    if (!canSend) return;

    const messageToSend = message.trim();
    setMessage("");
    stopTyping();

    await PlatformHaptics.light();
    onSendMessage(messageToSend, "text");

    // Focus input after sending
    inputRef.current?.focus();
  }, [canSend, message, stopTyping, onSendMessage]);

  const handleVoicePress = useCallback(async () => {
    await PlatformHaptics.light();

    if (message.trim().length > 0) {
      // If there's text, send it first
      handleSend();
    } else {
      // Show voice recorder
      Keyboard.dismiss();
      setShowVoiceRecorder(true);
    }
  }, [message, handleSend]);

  const handleVoiceRecordingComplete = useCallback(
    async (uri: string, duration: number) => {
      setShowVoiceRecorder(false);
      await PlatformHaptics.success();
      onSendVoiceMessage(uri, duration);
    },
    [onSendVoiceMessage]
  );

  const handleVoiceRecordingCancel = useCallback(() => {
    setShowVoiceRecorder(false);
  }, []);

  const handleInputFocus = useCallback(() => {
    stopTyping(); // Stop typing when user starts typing
  }, [stopTyping]);

  const handleInputBlur = useCallback(() => {
    stopTyping();
  }, [stopTyping]);

  return (
    <>
      <View
        style={[styles.container, isKeyboardVisible && styles.keyboardVisible]}
      >
        <View style={styles.inputContainer}>
          {/* Text Input */}
          <View style={styles.textInputContainer}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              value={message}
              onChangeText={handleTextChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder={placeholder}
              placeholderTextColor={Colors.text.tertiary}
              multiline
              maxLength={maxLength}
              editable={!disabled}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />

            {/* Character Count */}
            {message.length > maxLength * 0.8 && (
              <View style={styles.characterCount}>
                <Text
                  style={[
                    styles.characterCountText,
                    message.length >= maxLength && styles.characterCountError,
                  ]}
                >
                  {message.length}/{maxLength}
                </Text>
              </View>
            )}
          </View>

          {/* Emoji + Send/Voice Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.emojiButton,
                disabled && styles.actionButtonDisabled,
              ]}
              onPress={handleEmojiToggle}
              disabled={disabled}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isEmojiPickerOpen ? "close" : "happy-outline"}
                size={22}
                color={Colors.primary[500]}
              />
            </TouchableOpacity>
            {canSend ? (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.sendButton,
                  disabled && styles.actionButtonDisabled,
                ]}
                onPress={handleSend}
                disabled={disabled}
                activeOpacity={0.8}
              >
                {/* Web parity: gradient-like feel via layered backgrounds and shadow */}
                <Ionicons
                  name="send"
                  size={20}
                  color={Colors.background.primary}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.voiceButton,
                  disabled && styles.actionButtonDisabled,
                ]}
                onPress={handleVoicePress}
                disabled={disabled}
                delayLongPress={200}
                activeOpacity={0.8}
              >
                <Ionicons name="mic" size={20} color={Colors.primary[500]} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Error/Helpers */}
        {disabled && (
          <View style={styles.disabledOverlay}>
            <Text style={styles.disabledText}>
              You can't send messages in this conversation
            </Text>
          </View>
        )}

        {/* Error banner slot (web parity) - container can pass error via props later */}
        {/* Example usage: render when parent provides error text */}
        {/* <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorText}</Text>
          <TouchableOpacity onPress={onRetry} style={styles.errorRetryBtn}>
            <Text style={styles.errorRetryText}>Retry</Text>
          </TouchableOpacity>
        </View> */}
      </View>

      {/* Voice Recorder Overlay */}
      <VoiceRecorder
        visible={showVoiceRecorder}
        onRecordingComplete={handleVoiceRecordingComplete}
        onCancel={handleVoiceRecordingCancel}
      />

      {/* Inline upgrade banner for free users */}
      {subscription?.plan === "free" && (
        <View
          style={{
            paddingHorizontal: Layout.spacing.md,
            paddingTop: Layout.spacing.xs,
          }}
        >
          <InlineUpgradeBanner
            message="Upgrade for unlimited messaging and premium features"
            ctaLabel="Upgrade"
            onPress={() => {
              // Simple navigation without coupling to screen props
              try {
                const nav = require("@/navigation");
                // If a global navigate helper exists
                (nav.navigate || (() => {}))("Subscription");
              } catch {}
            }}
          />
        </View>
      )}

      {/* Emoji Picker */}
      <EmojiPicker
        onEmojiSelected={handleEmojiSelected}
        open={isEmojiPickerOpen}
        onClose={() => setIsEmojiPickerOpen(false)}
        enableSearchBar
        categoryPosition="top"
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.primary,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
  },

  keyboardVisible: {
    paddingBottom: Layout.spacing.md,
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Layout.spacing.sm,
  },

  textInputContainer: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    minHeight: 44,
    maxHeight: 120,
    position: "relative",
  },

  textInput: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
    textAlignVertical: "top",
    lineHeight: 20,
    maxHeight: 80,
  },

  characterCount: {
    position: "absolute",
    bottom: Layout.spacing.xs,
    right: Layout.spacing.sm,
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Layout.spacing.xs,
    borderRadius: Layout.radius.sm,
  },

  characterCountText: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.text.tertiary,
  },

  characterCountError: {
    color: Colors.error[500],
  },

  actionButtons: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: Layout.spacing.xs,
  },

  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.neutral[900],
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  sendButton: {
    // Web parity: elevate and mimic gradient via shadow + primary base
    backgroundColor: Colors.primary[500],
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },

  voiceButton: {
    backgroundColor: Colors.background.primary,
    borderWidth: 2,
    borderColor: Colors.primary[500],
  },

  emojiButton: {
    backgroundColor: Colors.background.primary,
    borderWidth: 2,
    borderColor: Colors.neutral[300] || Colors.border.primary,
  },

  disabledOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: rgbaHex(Colors.text.primary, 0.1),
    justifyContent: "center",
    alignItems: "center",
    borderRadius: Layout.radius.md,
  },

  disabledText: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    textAlign: "center",
  },

  // New: common disabled state for action buttons
  actionButtonDisabled: {
    opacity: 0.6,
  },

  // New: error banner styles (for web parity)
  errorBanner: {
    marginTop: Layout.spacing.sm,
    marginHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.md,
    backgroundColor: Colors.error[50],
    borderWidth: 1,
    borderColor: Colors.error[200],
    borderRadius: Layout.radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Layout.spacing.sm,
  },
  errorBannerText: {
    flex: 1,
    color: Colors.error[600],
    fontSize: Layout.typography.fontSize.xs,
  },
  errorRetryBtn: {
    paddingVertical: Layout.spacing.xs,
    paddingHorizontal: Layout.spacing.sm,
    borderRadius: Layout.radius.sm,
    backgroundColor: Colors.error[100],
  },
  errorRetryText: {
    color: Colors.error[700],
    fontSize: Layout.typography.fontSize.xs,
    fontWeight: Layout.typography.fontWeight.medium,
  },
});
