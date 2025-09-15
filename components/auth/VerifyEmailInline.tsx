import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useAuth } from "@contexts/AuthProvider";
import { Layout } from "@constants";
import { useTheme, useThemedStyles } from "@contexts/ThemeContext";
import { useToast } from "@providers/ToastContext";

type Variant = "banner" | "pill" | "badge" | "link";

interface VerifyEmailInlineProps {
  variant?: Variant;
  label?: string;
  style?: any;
  textStyle?: any;
  onVerified?: () => void;
}

export default function VerifyEmailInline(props: VerifyEmailInlineProps) {
  const { variant = "banner", label, style, textStyle, onVerified } = props;
  const {
    needsEmailVerification,
    resendEmailVerification,
    verifyEmailCode,
    startEmailVerificationPolling,
    refreshUser,
  } = (useAuth() as any) || {};
  const toast = useToast();
  const [sending, setSending] = React.useState(false);
  const [checking, setChecking] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(0);
  const cooldownRef = React.useRef<NodeJS.Timeout | null>(null);
  const { theme } = useTheme();
  const styles = useThemedStyles((t) =>
    StyleSheet.create({
      // Banner variant
      banner: {
        backgroundColor: t.colors.warning[100],
        borderColor: t.colors.warning[300],
        borderWidth: 1,
        borderRadius: Layout.radius.md,
        paddingVertical: Layout.spacing.sm,
        paddingHorizontal: Layout.spacing.md,
        marginHorizontal: Layout.spacing.lg,
        marginBottom: Layout.spacing.lg,
      },
      bannerText: {
        color: t.colors.warning[900],
        marginBottom: Layout.spacing.sm,
        fontWeight: "500",
      },
      bannerActions: {
        flexDirection: "row",
        gap: Layout.spacing.md,
      },
      bannerBtn: {
        backgroundColor: t.colors.warning[500],
        paddingVertical: Layout.spacing.sm,
        paddingHorizontal: Layout.spacing.md,
        borderRadius: Layout.radius.sm,
      },
      bannerBtnText: { color: t.colors.text.inverse, fontWeight: "600" },

      // Pill variant (header small)
      pill: {
        backgroundColor: t.colors.warning[600],
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 999,
      },
      pillText: {
        color: t.colors.text.inverse,
        fontWeight: "600",
        fontSize: 12,
      },

      // Badge variant (compact rectangular)
      badge: {
        backgroundColor: t.colors.warning[600],
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
      },
      badgeText: { color: t.colors.text.inverse, fontWeight: "600" },

      // Link variant (inline text action)
      linkText: { color: t.colors.warning[600], fontWeight: "600" },

      disabled: { opacity: 0.6 },
    })
  );

  React.useEffect(() => {
    if (cooldown <= 0 && cooldownRef.current) {
      clearInterval(cooldownRef.current);
      cooldownRef.current = null;
    }
  }, [cooldown]);

  // Auto-start polling when inline prompt is visible so it can auto-hide on verification.
  React.useEffect(() => {
    // keep hook order consistent; guard inside effect instead of skipping the hook entirely
    const t = setTimeout(() => {
      if (needsEmailVerification) {
        startEmailVerificationPolling?.({ intervalMs: 5000, maxAttempts: 36 });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [startEmailVerificationPolling, needsEmailVerification]);

  // Cleanup: clear cooldown interval on unmount to avoid leaks
  React.useEffect(() => {
    return () => {
      if (cooldownRef.current) {
        clearInterval(cooldownRef.current);
        cooldownRef.current = null;
      }
    };
  }, []);

  if (!needsEmailVerification) return null;

  const doResend = async () => {
    if (sending || cooldown > 0) return;
    setSending(true);
    try {
      const res = await resendEmailVerification?.();
      if (res?.success) {
        toast?.show?.("Verification email sent", "info");
        setCooldown(60);
        if (!cooldownRef.current) {
          cooldownRef.current = setInterval(() => {
            setCooldown((c) => Math.max(c - 1, 0));
          }, 1000);
        }
        startEmailVerificationPolling?.();
      } else {
        toast?.show?.(res?.error || "Failed to send email", "error");
      }
    } finally {
      setSending(false);
    }
  };

  const doCheck = async () => {
    if (checking) return;
    setChecking(true);
    try {
      const res = await verifyEmailCode?.();
      if (res?.success) {
        toast?.show?.("Email verified!", "success");
        await refreshUser?.();
        onVerified?.();
      } else {
        toast?.show?.(res?.error || "Still unverified", "info");
      }
    } finally {
      setChecking(false);
    }
  };

  switch (variant) {
    case "pill":
      return (
        <TouchableOpacity
          onPress={doResend}
          style={[styles.pill, style]}
          disabled={sending || cooldown > 0}
          accessibilityRole="button"
          accessibilityLabel="Verify Email"
          testID="verify-email-pill"
        >
          {sending ? (
            <ActivityIndicator color={theme.colors.text.inverse} />
          ) : (
            <Text style={[styles.pillText, textStyle]}>
              {cooldown > 0
                ? `Verify Email (${cooldown}s)`
                : label || "Verify Email"}
            </Text>
          )}
        </TouchableOpacity>
      );
    case "badge":
      return (
        <TouchableOpacity
          onPress={doResend}
          style={[styles.badge, style]}
          disabled={sending || cooldown > 0}
          accessibilityRole="button"
          accessibilityLabel="Verify Email"
          testID="verify-email-badge"
        >
          {sending ? (
            <ActivityIndicator color={theme.colors.text.inverse} />
          ) : (
            <Text style={[styles.badgeText, textStyle]}>
              {cooldown > 0 ? `Verify (${cooldown}s)` : label || "Verify Email"}
            </Text>
          )}
        </TouchableOpacity>
      );
    case "link":
      return (
        <View style={[{ flexDirection: "row", alignItems: "center" }, style]}>
          <TouchableOpacity
            onPress={doCheck}
            disabled={checking}
            accessibilityRole="button"
            accessibilityLabel="I have verified my email"
            testID="verify-email-link"
          >
            {checking ? (
              <ActivityIndicator color={theme.colors.warning[600]} />
            ) : (
              <Text style={[styles.linkText, textStyle]}>
                {label || "Unverified"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      );
    case "banner":
    default:
      return (
        <View style={[styles.banner, style]}>
          <Text style={styles.bannerText}>
            Please verify your email to unlock all features.
          </Text>
          <View style={styles.bannerActions}>
            <TouchableOpacity
              onPress={doResend}
              style={[
                styles.bannerBtn,
                (sending || cooldown > 0) && styles.disabled,
              ]}
              disabled={sending || cooldown > 0}
              accessibilityRole="button"
              accessibilityLabel="Resend verification email"
              testID="verify-email-resend"
            >
              {sending ? (
                <ActivityIndicator color={theme.colors.text.inverse} />
              ) : (
                <Text style={styles.bannerBtnText}>
                  {cooldown > 0 ? `Resend (${cooldown}s)` : "Resend Email"}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={doCheck}
              style={[
                styles.bannerBtn,
                { backgroundColor: theme.colors.primary[600] },
                checking && styles.disabled,
              ]}
              disabled={checking}
              accessibilityRole="button"
              accessibilityLabel="I have verified"
              testID="verify-email-check"
            >
              {checking ? (
                <ActivityIndicator color={theme.colors.text.inverse} />
              ) : (
                <Text style={styles.bannerBtnText}>I've Verified</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      );
  }
}

