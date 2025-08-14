import React, { useCallback, useMemo, useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Colors, Layout } from '@constants/index';
import PaywallModal from '@components/subscription/PaywallModal';
import { getPlans } from '@services/subscriptions';
import { useFeatureAccess } from '@hooks/useFeatureAccess';

type SendResult =
  | { success: true }
  | { success: false; error?: string };

export interface ComposerProps {
  // Callback to actually send a message to backend
  onSend: (text: string) => Promise<SendResult>;
  // Optional: placeholder text
  placeholder?: string;
  // Optional: disabled state from parent (e.g., when conversation is closed)
  disabled?: boolean;
}

export default function Composer({ onSend, placeholder = 'Type a message…', disabled = false }: ComposerProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  // Entitlement check for unlimited messaging
  const { allowed, isLoading } = useFeatureAccess('unlimited_messaging');

  // Paywall state
  const [showPaywall, setShowPaywall] = useState(false);
  const [plans, setPlans] = useState<Array<{ id: string; name: string; price: number; features?: string[]; popular?: boolean }>>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  const canSend = useMemo(() => {
    if (disabled) return false;
    if (sending) return false;
    // Allow sending if access is allowed and there is non-empty text
    return !!text.trim();
  }, [text, sending, disabled]);

  const openPaywall = useCallback(async () => {
    try {
      setLoadingPlans(true);
      const p = await getPlans();
      setPlans(p);
    } catch {
      // If fetching plans fails, still show modal with empty state so user can navigate to subscription screen
      setPlans([]);
    } finally {
      setLoadingPlans(false);
      setShowPaywall(true);
    }
  }, []);

  const handleSend = useCallback(async () => {
    // If entitlement still loading, avoid accidental gating; block until ready
    if (isLoading) return;

    // Gate on unlimited_messaging
    if (!allowed) {
      await openPaywall();
      return;
    }

    const value = text.trim();
    if (!value) return;

    try {
      setSending(true);
      const res = await onSend(value);
      if (res.success) {
        setText('');
      } else {
        // Optional: surface error
        console.warn('[COMPOSER] send:error', (res as { success: false; error?: string }).error);
      }
    } catch (e: any) {
      console.error('[COMPOSER] send:exception', e?.message || String(e));
    } finally {
      setSending(false);
    }
  }, [allowed, isLoading, onSend, openPaywall, text]);

  return (
    <>
      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })}>
        <View style={styles.container}>
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor={Colors.text.secondary}
            value={text}
            onChangeText={setText}
            editable={!disabled && !sending}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, (!canSend) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!canSend}
          >
            {sending ? (
              <ActivityIndicator color={Colors.text.inverse} />
            ) : (
              <Text style={styles.sendText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Paywall for messaging entitlement */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={() => {
          // Let parent navigate to Subscription screen if desired; by default just close
          setShowPaywall(false);
        }}
        title="Unlock Unlimited Messaging"
        subtitle="Upgrade your plan to send unlimited messages and connect without limits."
        plans={plans}
        recommendedPlanId={plans.find((p) => p.popular)?.id}
      />

      {loadingPlans && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={Colors.primary[500]} />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: Layout.spacing.md,
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: Colors.border.primary,
    backgroundColor: Colors.background.primary,
    gap: Layout.spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    borderRadius: Layout.radius.lg,
    color: Colors.text.primary,
    backgroundColor: Colors.background.secondary,
  },
  sendButton: {
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    backgroundColor: Colors.primary[500],
    borderRadius: Layout.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.neutral[300],
  },
  sendText: {
    color: Colors.text.inverse,
    fontWeight: '700',
    fontSize: Layout.typography.fontSize.base,
  },
  loadingOverlay: {
    position: 'absolute',
    right: Layout.spacing.lg,
    bottom: 72,
  },
});