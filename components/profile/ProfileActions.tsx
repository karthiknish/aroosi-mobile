"use client";

import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Colors } from "../../constants/Colors";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { fetchShortlists, toggleShortlist } from "@/utils/engagementUtil";
import { useToast } from "@/providers/ToastContext";

interface ProfileActionsProps {
  toUserId: string;
  onShortlistChange?: (isShortlisted: boolean) => void;
}

export function ProfileActions({
  toUserId,
  onShortlistChange,
}: ProfileActionsProps) {
  const [loading, setLoading] = useState(false);
  const [isShortlisted, setIsShortlisted] = useState<boolean | null>(null);
  const toast = useToast();
  const navigation = useNavigation<any>();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await fetchShortlists();
        const exists = list.some((e) => e.userId === toUserId);
        if (mounted) {
          setIsShortlisted(exists);
          onShortlistChange?.(exists);
        }
      } catch (e) {
        // Non-fatal; leave null so button label defaults to add
      }
    })();
    return () => {
      mounted = false;
    };
  }, [toUserId, onShortlistChange]);

  const onToggleShortlist = async () => {
    setLoading(true);
    try {
      const res = await toggleShortlist(toUserId);
      if (res.added) {
        setIsShortlisted(true);
        onShortlistChange?.(true);
        toast.show("Added to shortlist", "success");
      } else if (res.removed) {
        setIsShortlisted(false);
        onShortlistChange?.(false);
        toast.show("Removed from shortlist", "success");
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to update shortlist";
      if (
        msg.toLowerCase().includes("shortlist_limit") ||
        msg.toLowerCase().includes("limit")
      ) {
        Alert.alert(
          "Shortlist Limit Reached",
          "You've reached your shortlist limit for your plan. Upgrade to add more.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Upgrade",
              onPress: () => {
                // Navigate to subscription / premium tab
                try {
                  navigation.navigate("Premium" as never);
                } catch {
                  // Fallback: log only
                  console.log("Navigate to subscription");
                }
              },
            },
          ]
        );
      } else {
        toast.show(msg, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const buttonText = isShortlisted
    ? "Remove from Shortlist"
    : "Add to Shortlist";
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          isShortlisted && styles.buttonShortlisted,
          loading && styles.buttonDisabled,
        ]}
        onPress={onToggleShortlist}
        disabled={loading}
        activeOpacity={0.7}
      >
        <View style={styles.buttonContent}>
          <Ionicons
            name={isShortlisted ? "heart-dislike" : "heart"}
            size={20}
            color={isShortlisted ? Colors.error[600] : Colors.error[500]}
          />
          <Text
            style={[
              styles.buttonText,
              isShortlisted && styles.buttonTextShortlisted,
            ]}
          >
            {loading ? "Updating..." : buttonText}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.primary,
  },
  button: {
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: Colors.error[500],
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.neutral[900],
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonShortlisted: {
    backgroundColor: Colors.error[50],
    borderColor: Colors.error[600],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.error[500],
  },
  buttonTextShortlisted: {
    color: Colors.error[600],
  },
});

export default ProfileActions;
