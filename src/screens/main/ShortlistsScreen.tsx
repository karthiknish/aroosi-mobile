"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  Platform,
  ActionSheetIOS,
  Animated,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  fetchShortlists,
  toggleShortlist,
  fetchNote,
  setNote,
  ShortlistEntry,
} from "@/utils/engagementUtil";
import { useToast } from "@/providers/ToastContext";
import ScreenContainer from "@components/common/ScreenContainer";
import { useTheme } from "@contexts/ThemeContext";
import { rgbaHex } from "@utils/color";
import AppHeader from "@/components/common/AppHeader";
import Avatar from "@/components/common/Avatar";
import * as Haptics from "expo-haptics";
import { Swipeable } from "react-native-gesture-handler";
import {
  showUndoToast,
  showSuccessToast,
  showErrorToast,
} from "@src/lib/ui/toast";
import HapticPressable from "@/components/ui/HapticPressable";
import SkeletonList from "@/components/ui/SkeletonList";

export function ShortlistsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation();
  const toast = useToast();
  // Row mount-in animation wrapper for simple staggered list appearance
  const RowWrapper: React.FC<{ index: number; children: React.ReactNode }> = ({
    index,
    children,
  }) => {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(16)).current;
    useEffect(() => {
      const delay = Math.min(index, 12) * 60; // cap delay for long lists
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 260,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          delay,
          useNativeDriver: true,
        }),
      ]).start();
    }, [index, opacity, translateY]);
    return (
      <Animated.View style={{ opacity, transform: [{ translateY }] }}>
        {children}
      </Animated.View>
    );
  };
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState<string>("");
  const {
    data: shortlists = [],
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["shortlists"],
    queryFn: () => fetchShortlists(),
  });

  // Load notes for visible shortlist entries
  useEffect(() => {
    let canceled = false;
    (async () => {
      const updates: Record<string, string> = {};
      for (const e of shortlists) {
        try {
          const n = await fetchNote(e.userId);
          if (n?.note) updates[e.userId] = n.note;
        } catch {}
      }
      if (!canceled && Object.keys(updates).length) {
        setNotes((prev) => ({ ...prev, ...updates }));
      }
    })();
    return () => {
      canceled = true;
    };
  }, [shortlists.length]);

  const onRemove = async (userId: string, fullName?: string) => {
    Alert.alert(
      "Remove from Shortlist",
      `Remove ${fullName || "this user"} from your shortlist?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await toggleShortlist(userId);
              if (res.removed) {
                // Show undo toast to allow quick recovery
                showUndoToast(
                  `${fullName || "User"} removed from shortlist`,
                  async () => {
                    try {
                      await toggleShortlist(userId); // toggle back to re-add
                      showSuccessToast(
                        `${fullName || "User"} restored to shortlist`
                      );
                      refetch();
                    } catch (e: any) {
                      showErrorToast(
                        e?.message ?? "Failed to restore to shortlist"
                      );
                    }
                  },
                  "Undo",
                  6000
                );
                // Proactively refresh list to reflect removal
                refetch();
              }
            } catch (e: any) {
              toast.show(e?.message ?? "Failed to remove", "error");
            }
          },
        },
      ]
    );
  };

  const navigateToProfile = (userId: string) => {
    (navigation as any).navigate("ProfileDetail", { profileId: userId });
  };

  const renderShortlistItem = ({ item }: { item: ShortlistEntry }) => {
    const profileImage =
      Array.isArray(item.profileImageUrls) && item.profileImageUrls[0];
    const note = notes[item.userId] || "";

    const openActionSheet = () => {
      const options = [
        "View Profile",
        "Edit Note",
        "Remove from Shortlist",
        "Cancel",
      ];
      const cancelButtonIndex = 3;
      if (Platform.OS === "ios") {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options,
            cancelButtonIndex,
            destructiveButtonIndex: 2,
          },
          (buttonIndex) => {
            if (buttonIndex === 0) navigateToProfile(item.userId);
            else if (buttonIndex === 1) {
              Haptics.selectionAsync().catch(() => {});
              setEditingUserId(item.userId);
              setDraftNote(note);
            } else if (buttonIndex === 2) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
                () => {}
              );
              onRemove(item.userId, item.fullName || undefined);
            }
          }
        );
      } else {
        Alert.alert(item.fullName || "Shortlist", undefined, [
          {
            text: "View Profile",
            onPress: () => navigateToProfile(item.userId),
          },
          {
            text: "Edit Note",
            onPress: () => {
              Haptics.selectionAsync().catch(() => {});
              setEditingUserId(item.userId);
              setDraftNote(note);
            },
          },
          {
            text: "Remove from Shortlist",
            style: "destructive",
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
                () => {}
              );
              onRemove(item.userId, item.fullName || undefined);
            },
          },
          { text: "Cancel", style: "cancel" },
        ]);
      }
    };

    const renderLeftActions = () => (
      <View
        style={[
          styles.swipeAction,
          { backgroundColor: theme.colors.neutral[100] },
        ]}
      >
        <Ionicons
          name="create-outline"
          size={20}
          color={theme.colors.neutral[700]}
        />
        <Text style={[styles.swipeText, { color: theme.colors.neutral[800] }]}>
          Note
        </Text>
      </View>
    );

    const renderRightActions = () => (
      <View
        style={[
          styles.swipeAction,
          { backgroundColor: theme.colors.error[100], alignItems: "flex-end" },
        ]}
      >
        <Text
          style={[
            styles.swipeText,
            { color: theme.colors.error[700], marginRight: 6 },
          ]}
        >
          Remove
        </Text>
        <Ionicons name="trash" size={20} color={theme.colors.error[600]} />
      </View>
    );

    return (
      <Swipeable
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
        onSwipeableLeftOpen={() => {
          Haptics.selectionAsync().catch(() => {});
          setEditingUserId(item.userId);
          setDraftNote(note);
        }}
        onSwipeableRightOpen={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
            () => {}
          );
          onRemove(item.userId, item.fullName || undefined);
        }}
      >
        <HapticPressable
          style={styles.item}
          onPress={() => navigateToProfile(item.userId)}
          onLongPress={openActionSheet}
          accessibilityRole="button"
          accessibilityLabel={`Open ${item.fullName || "this user"}'s profile`}
        >
          <View style={styles.itemContent}>
            <View style={styles.avatarContainer}>
              <Avatar
                uri={profileImage || null}
                name={item.fullName || `User ${item.userId.slice(0, 8)}`}
                size="lg"
                imageStyle={{ width: 48, height: 48, borderRadius: 24 }}
                accessibilityLabel={`${item.fullName || "User"} avatar`}
              />
            </View>

            <View style={styles.itemInfo}>
              <Text style={[styles.name, { color: theme.colors.text.primary }]}>
                {item.fullName || `User ${item.userId.slice(0, 8)}`}
              </Text>
              <Text
                style={[styles.date, { color: theme.colors.text.secondary }]}
              >
                Added {new Date(item.createdAt).toLocaleDateString()}
              </Text>
              {note ? (
                <Text
                  numberOfLines={2}
                  style={[styles.note, { color: theme.colors.neutral[700] }]}
                >
                  📝 {note}
                </Text>
              ) : (
                <Text
                  style={[
                    styles.notePlaceholder,
                    { color: theme.colors.neutral[400] },
                  ]}
                >
                  Add a note…
                </Text>
              )}
            </View>

            <HapticPressable
              style={styles.removeButton}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${
                item.fullName || "this user"
              } from shortlist`}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
                  () => {}
                );
                onRemove(item.userId, item.fullName || undefined);
              }}
            >
              <Ionicons
                name="heart-dislike"
                size={20}
                color={theme.colors.error[500]}
              />
            </HapticPressable>
            <HapticPressable
              style={styles.noteButton}
              accessibilityRole="button"
              accessibilityLabel={`Edit note for ${
                item.fullName || "this user"
              }`}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setEditingUserId(item.userId);
                setDraftNote(note);
              }}
            >
              <Ionicons
                name="create-outline"
                size={20}
                color={theme.colors.neutral[500]}
              />
            </HapticPressable>
          </View>
        </HapticPressable>
      </Swipeable>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="heart" size={48} color={theme.colors.neutral[200]} />
      <Text style={[styles.emptyTitle, { color: theme.colors.neutral[700] }]}>
        No Shortlists Yet
      </Text>
      <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
        Start adding people you're interested in to your shortlist
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Text style={[styles.errorText, { color: theme.colors.error[500] }]}>
        Failed to load shortlists
      </Text>
      <HapticPressable
        style={[
          styles.retryButton,
          { backgroundColor: theme.colors.error[500] },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Retry loading shortlists"
        onPress={() => refetch()}
      >
        <Text style={[styles.retryText, { color: theme.colors.text.inverse }]}>
          Retry
        </Text>
      </HapticPressable>
    </View>
  );

  if (isError) {
    return (
      <ScreenContainer useScrollView={false}>
        <AppHeader title="My Shortlists" />
        {renderErrorState()}
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer useScrollView={false}>
      <AppHeader
        title="My Shortlists"
        rightActions={
          <Text style={{ color: theme.colors.text.secondary, fontSize: 12 }}>
            {shortlists.length} {shortlists.length === 1 ? "person" : "people"}
          </Text>
        }
      />

      {isLoading ? (
        <View style={{ paddingHorizontal: 16 }}>
          <SkeletonList rows={6} avatarSize={48} />
        </View>
      ) : (
        <FlatList
          data={shortlists}
          keyExtractor={(item) => item.userId}
          renderItem={({ item, index }) => (
            <RowWrapper index={index}>
              {renderShortlistItem({ item })}
            </RowWrapper>
          )}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={[
            styles.listContainer,
            { backgroundColor: "transparent" },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[theme.colors.primary[500]]}
              tintColor={theme.colors.primary[500]}
            />
          }
        />
      )}

      {/* Edit Note Modal */}
      <Modal
        visible={!!editingUserId}
        animationType="slide"
        transparent
        onRequestClose={() => setEditingUserId(null)}
      >
        <View
          style={[
            styles.modalBackdrop,
            { backgroundColor: rgbaHex(theme.colors.text.primary, 0.4) },
          ]}
        >
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.colors.background.primary },
            ]}
          >
            <Text
              style={[styles.modalTitle, { color: theme.colors.text.primary }]}
            >
              Edit Note
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  borderColor: theme.colors.border.primary,
                  color: theme.colors.text.primary,
                },
              ]}
              placeholder="Write a personal note about this user"
              placeholderTextColor={theme.colors.neutral[400]}
              multiline
              value={draftNote}
              onChangeText={setDraftNote}
            />
            <View style={styles.modalActions}>
              <HapticPressable
                onPress={() => setEditingUserId(null)}
                style={[
                  styles.modalButton,
                  { backgroundColor: theme.colors.neutral[100] },
                ]}
              >
                <Text
                  style={{
                    fontWeight: "600",
                    color: theme.colors.neutral[700],
                  }}
                >
                  Cancel
                </Text>
              </HapticPressable>
              <HapticPressable
                onPress={async () => {
                  if (!editingUserId) return;
                  const ok = await setNote(editingUserId, draftNote.trim());
                  if (ok) {
                    setNotes((prev) => ({
                      ...prev,
                      [editingUserId]: draftNote.trim(),
                    }));
                    toast.show("Note saved", "success");
                    setEditingUserId(null);
                  } else {
                    toast.show("Failed to save note", "error");
                  }
                }}
                style={[
                  styles.modalButton,
                  { backgroundColor: theme.colors.error[500] },
                ]}
              >
                <Text
                  style={{
                    fontWeight: "700",
                    color: theme.colors.text.inverse,
                  }}
                >
                  Save
                </Text>
              </HapticPressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    header: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.primary,
      backgroundColor: "transparent",
    },
    headerTitle: {
      fontFamily: "Boldonse-Regular",
      fontSize: 24,
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 14,
    },
    note: {
      fontSize: 12,
      marginTop: 4,
    },
    notePlaceholder: {
      fontSize: 12,
      marginTop: 4,
      fontStyle: "italic",
    },
    listContainer: {
      flexGrow: 1,
      padding: 16,
    },
    item: {
      backgroundColor: theme.colors.background.primary,
      borderRadius: 12,
      marginBottom: 8,
      shadowColor: theme.colors.neutral[900],
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    itemContent: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
    },
    avatarContainer: {
      marginRight: 12,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
    },
    avatarPlaceholder: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.neutral[100],
    },
    itemInfo: {
      flex: 1,
    },
    name: {
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 2,
    },
    date: {
      fontSize: 12,
    },
    removeButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: theme.colors.error[50],
    },
    noteButton: {
      padding: 8,
      marginLeft: 8,
      borderRadius: 20,
      backgroundColor: theme.colors.neutral[100],
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 60,
    },
    emptyTitle: {
      fontFamily: "Boldonse-Regular",
      fontSize: 20,
      marginTop: 16,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 14,
      textAlign: "center",
      maxWidth: 280,
    },
    errorContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    },
    errorText: {
      fontSize: 16,
      marginBottom: 16,
      textAlign: "center",
    },
    retryButton: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
    },
    retryText: {
      fontSize: 14,
      fontWeight: "600",
    },
    modalBackdrop: {
      flex: 1,
      justifyContent: "flex-end",
    },
    modalCard: {
      padding: 16,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
    },
    modalTitle: {
      fontFamily: "Boldonse-Regular",
      fontSize: 18,
      marginBottom: 12,
    },
    modalInput: {
      minHeight: 100,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      textAlignVertical: "top",
    },
    modalActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginTop: 12,
      gap: 8,
    },
    modalButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
    },
    swipeAction: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
    },
    swipeText: {
      fontSize: 14,
      fontWeight: "600",
      marginLeft: 6,
    },
  });
}

export default ShortlistsScreen;
