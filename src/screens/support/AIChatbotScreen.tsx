import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import ScreenContainer from "@components/common/ScreenContainer";
import { Colors, Layout } from "@constants";
import { useTheme } from "@contexts/ThemeContext";
import { useApiClient } from "@/utils/api";
import { useAuth } from "@contexts/AuthProvider";
import { useToast } from "@/providers/ToastContext";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

export default function AIChatbotScreen() {
  const { theme } = useTheme();
  const apiClient = useApiClient();
  const { user } = useAuth() as any;
  const toast = useToast();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: `m_${Date.now()}`,
      role: "assistant",
      content:
        "Hi! I’m your Aroosi Help Assistant. Ask me anything about features, subscriptions, safety, or troubleshooting.",
      createdAt: Date.now(),
    },
  ]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: "user",
      content: text,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);
    try {
      const payload = {
        messages: messages
          .concat(userMsg)
          .map((m) => ({ role: m.role, content: m.content })),
        email: user?.email || "",
      };
      const res = await apiClient.sendChatMessage(payload);
      if (res?.success && res.data) {
        const data: any = res.data as any;
        const replyText =
          (data?.message?.content || data?.reply || data?.text || "").toString() ||
          "I'm here to help. Could you rephrase that?";
        const aiMsg: ChatMessage = {
          id: `a_${Date.now()}`,
          role: "assistant",
          content: replyText,
          createdAt: Date.now(),
        };
        setMessages((prev) => [...prev, aiMsg]);
        // Best-effort save for analytics/history
        try {
          await apiClient.saveChatbotMessage({
            email: user?.email || "",
            request: payload,
            response: data,
          });
        } catch {}
      } else {
        toast?.show?.(res?.error?.message || "Failed to send message", "error");
      }
    } catch (e: any) {
      toast?.show?.(e?.message || "Network error", "error");
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 10);
    }
  }, [apiClient, input, messages, sending, toast, user?.email]);

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isUser = item.role === "user";
      return (
        <View
          style={[
            styles.bubbleRow,
            { justifyContent: isUser ? "flex-end" : "flex-start" },
          ]}
        >
          <View
            style={[
              styles.bubble,
              isUser
                ? {
                    backgroundColor: theme.colors.primary[500],
                    borderTopRightRadius: 4,
                  }
                : {
                    backgroundColor: theme.colors.background.primary,
                    borderTopLeftRadius: 4,
                    borderWidth: 1,
                    borderColor: theme.colors.border.primary,
                  },
            ]}
          >
            <Text
              style={{
                color: isUser ? theme.colors.text.inverse : theme.colors.text.primary,
                fontSize: Layout.typography.fontSize.base,
              }}
            >
              {item.content}
            </Text>
          </View>
        </View>
      );
    },
    [theme.colors]
  );

  return (
    <ScreenContainer
      containerStyle={{ backgroundColor: theme.colors.background.secondary }}
      contentStyle={{ flexGrow: 1 }}
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Help Assistant</Text>
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: "padding", android: undefined })}
        keyboardVerticalOffset={80}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: Layout.spacing.lg, gap: 8 }}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: true })
          }
        />
        <View
          style={[
            styles.inputRow,
            {
              backgroundColor: theme.colors.background.primary,
              borderColor: theme.colors.border.primary,
            },
          ]}
        >
          <TextInput
            style={[styles.input, { color: theme.colors.text.primary }]}
            placeholder="Ask a question…"
            placeholderTextColor={theme.colors.text.secondary}
            value={input}
            onChangeText={setInput}
            editable={!sending}
            returnKeyType="send"
            onSubmitEditing={send}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              { backgroundColor: theme.colors.primary[500], opacity: sending ? 0.7 : 1 },
            ]}
            disabled={sending}
            onPress={send}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    backgroundColor: "transparent",
  },
  headerTitle: {
    fontFamily: "Boldonse-Regular",
    fontSize: Layout.typography.fontSize["2xl"],
    fontWeight: Layout.typography.fontWeight.bold,
  },
  bubbleRow: {
    flexDirection: "row",
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.radius.lg,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Layout.spacing.sm,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: Layout.typography.fontSize.base,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
  },
  sendBtn: {
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.radius.md,
    marginLeft: Layout.spacing.sm,
  },
});
