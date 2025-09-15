import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Layout } from "@constants";
import { rgbaHex } from "@utils/color";
import { useTheme, useThemedStyles } from "@contexts/ThemeContext";

interface VerificationBannerProps {
  email: string;
  secondsLeft: number;
  onResend: () => void;
  resendLoading?: boolean;
  onIHaveVerified: () => void;
  verifying?: boolean;
  onClose?: () => void;
}

export default function VerificationBanner({
  email,
  secondsLeft,
  onResend,
  resendLoading,
  onIHaveVerified,
  verifying,
  onClose,
}: VerificationBannerProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles((t) =>
    StyleSheet.create({
      container: {
        borderRadius: Layout.radius.md,
        backgroundColor:
          t.colors.warning?.[100] ?? t.colors.background.secondary,
        borderWidth: 1,
        borderColor: t.colors.warning?.[200] ?? t.colors.border.primary,
        padding: Layout.spacing.md,
        marginHorizontal: Layout.spacing.lg,
        marginTop: Layout.spacing.sm,
      },
      row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      },
      title: {
        fontSize: Layout.typography.fontSize.base,
        fontWeight: "700",
        color: t.colors.text.primary,
      },
      message: {
        marginTop: Layout.spacing.xs,
        color: t.colors.text.secondary,
      },
      bold: {
        fontWeight: "700",
        color: t.colors.text.primary,
      },
      actions: {
        marginTop: Layout.spacing.sm,
        flexDirection: "row",
        gap: Layout.spacing.sm,
      },
      secondaryBtn: {
        paddingVertical: Layout.spacing.sm,
        paddingHorizontal: Layout.spacing.md,
        borderRadius: Layout.radius.md,
        backgroundColor: t.colors.background.secondary,
        borderWidth: 1,
        borderColor: t.colors.border.primary,
      },
      secondaryText: {
        color: t.colors.text.primary,
        fontWeight: "600",
      },
      primaryBtn: {
        paddingVertical: Layout.spacing.sm,
        paddingHorizontal: Layout.spacing.md,
        borderRadius: Layout.radius.md,
        backgroundColor: t.colors.primary[500],
      },
      primaryText: {
        color: t.colors.text.inverse,
        fontWeight: "700",
      },
      closeBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: rgbaHex(t.colors.text.primary, 0.06),
      },
      closeText: {
        color: t.colors.text.primary,
        fontSize: 16,
        fontWeight: "700",
        lineHeight: 18,
      },
      disabled: {
        opacity: 0.6,
      },
    })
  );
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.title}>Verify your email</Text>
        {onClose && (
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            accessibilityLabel="Dismiss"
          >
            <Text style={styles.closeText}>×</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.message}>
        We sent a verification link to <Text style={styles.bold}>{email}</Text>.
        Please verify to continue.
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.secondaryBtn,
            (secondsLeft > 0 || resendLoading) && styles.disabled,
          ]}
          onPress={onResend}
          disabled={secondsLeft > 0 || !!resendLoading}
        >
          <Text style={styles.secondaryText}>
            {resendLoading
              ? "Resending..."
              : secondsLeft > 0
              ? `Resend in ${secondsLeft}s`
              : "Resend email"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryBtn, verifying && styles.disabled]}
          onPress={onIHaveVerified}
          disabled={!!verifying}
        >
          {verifying ? (
            <ActivityIndicator size="small" color={theme.colors.text.inverse} />
          ) : (
            <Text style={styles.primaryText}>I have verified</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

