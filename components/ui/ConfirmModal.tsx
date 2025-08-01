import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from "react-native";
import { Colors, Layout } from "@constants";

type ConfirmModalProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTouchable} onPress={onCancel} />
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttonsRow}>
            <TouchableOpacity
              accessibilityLabel={cancelLabel}
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
            >
              <Text style={[styles.buttonText, styles.cancelText]}>
                {cancelLabel}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityLabel={confirmLabel}
              style={[
                styles.button,
                destructive ? styles.destructiveButton : styles.primaryButton,
              ]}
              onPress={onConfirm}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const CARD_WIDTH = 320;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  backdropTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: Layout.radius.lg ?? 12,
    padding: Layout.spacing.lg ?? 16,
    backgroundColor: Colors?.background?.primary ?? "#fff",
  },
  title: {
    fontFamily: Layout.typography?.fontFamily?.serif,
    fontSize: Layout.typography?.fontSize?.lg ?? 18,
    fontWeight: "700",
    color: Colors?.text?.primary ?? "#111",
    marginBottom: Layout.spacing?.xs ?? 6,
  },
  message: {
    fontSize: Layout.typography?.fontSize?.base ?? 16,
    color: Colors?.text?.secondary ?? "#333",
    marginBottom: Layout.spacing?.lg ?? 16,
  },
  buttonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Layout.spacing?.sm ?? 8,
  },
  button: {
    paddingVertical: Layout.spacing?.sm ?? 10,
    paddingHorizontal: Layout.spacing?.md ?? 14,
    borderRadius: Layout.radius?.md ?? 8,
  },
  cancelButton: {
    backgroundColor: Colors?.background?.secondary ?? "#eee",
    borderWidth: 1,
    borderColor: Colors?.border?.primary ?? "#ddd",
  },
  primaryButton: {
    backgroundColor: Colors?.primary?.[500] ?? "#6b5b95",
  },
  destructiveButton: {
    backgroundColor: Colors?.error?.[500] ?? "#e11d48",
  },
  buttonText: {
    fontWeight: "600",
  },
  cancelText: {
    color: Colors?.text?.primary ?? "#111",
  },
  confirmText: {
    color: "#fff",
    fontWeight: "700",
  },
});