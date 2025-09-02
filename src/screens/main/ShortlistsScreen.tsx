"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import { Colors } from "@constants";
import { rgbaHex } from "@utils/color";

export function ShortlistsScreen() {
  const navigation = useNavigation();
  const toast = useToast();
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
                toast.show("Removed from shortlist", "success");
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

    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() => navigateToProfile(item.userId)}
        activeOpacity={0.7}
      >
        <View style={styles.itemContent}>
          <View style={styles.avatarContainer}>
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={24} color={Colors.neutral[400]} />
              </View>
            )}
          </View>

          <View style={styles.itemInfo}>
            <Text style={styles.name}>
              {item.fullName || `User ${item.userId.slice(0, 8)}`}
            </Text>
            <Text style={styles.date}>
              Added {new Date(item.createdAt).toLocaleDateString()}
            </Text>
            {note ? (
              <Text numberOfLines={2} style={styles.note}>
                📝 {note}
              </Text>
            ) : (
              <Text style={styles.notePlaceholder}>Add a note…</Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => onRemove(item.userId, item.fullName || undefined)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="heart-dislike"
              size={20}
              color={Colors.error[500]}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.noteButton}
            onPress={() => {
              setEditingUserId(item.userId);
              setDraftNote(note);
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name="create-outline"
              size={20}
              color={Colors.neutral[500]}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="heart" size={48} color={Colors.neutral[200]} />
      <Text style={styles.emptyTitle}>No Shortlists Yet</Text>
      <Text style={styles.emptyText}>
        Start adding people you're interested in to your shortlist
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>Failed to load shortlists</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={() => refetch()}
        activeOpacity={0.7}
      >
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  if (isError) {
    return (
      <ScreenContainer>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Shortlists</Text>
        </View>
        {renderErrorState()}
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Shortlists</Text>
        <Text style={styles.headerSubtitle}>
          {shortlists.length} {shortlists.length === 1 ? "person" : "people"}
        </Text>
      </View>

      <FlatList
        data={shortlists}
        keyExtractor={(item) => item.userId}
        renderItem={renderShortlistItem}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[Colors.primary[500]]}
            tintColor={Colors.primary[500]}
          />
        }
      />

      {/* Edit Note Modal */}
      <Modal
        visible={!!editingUserId}
        animationType="slide"
        transparent
        onRequestClose={() => setEditingUserId(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Note</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Write a personal note about this user"
              placeholderTextColor={Colors.neutral[400]}
              multiline
              value={draftNote}
              onChangeText={setDraftNote}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setEditingUserId(null)}
                style={[styles.modalButton, styles.modalCancel]}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
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
                style={[styles.modalButton, styles.modalSave]}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
    backgroundColor: "transparent",
  },
  headerTitle: {
    fontFamily: "Boldonse-Regular",
    fontSize: 24,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  note: {
    fontSize: 12,
    color: Colors.neutral[700],
    marginTop: 4,
  },
  notePlaceholder: {
    fontSize: 12,
    color: Colors.neutral[400],
    marginTop: 4,
    fontStyle: "italic",
  },
  listContainer: {
    flexGrow: 1,
    padding: 16,
  },
  item: {
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: Colors.neutral[900],
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
    backgroundColor: Colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  itemInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  removeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: Colors.error[50],
  },
  noteButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 20,
    backgroundColor: Colors.neutral[100],
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
    color: Colors.neutral[700],
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.text.secondary,
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
    color: Colors.error[500],
    marginBottom: 16,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: Colors.error[500],
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: Colors.text.inverse,
    fontSize: 14,
    fontWeight: "600",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: rgbaHex(Colors.text.primary, 0.4),
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: Colors.background.primary,
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalTitle: {
    fontFamily: "Boldonse-Regular",
    fontSize: 18,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  modalInput: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    borderRadius: 8,
    padding: 12,
    color: Colors.text.primary,
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
  modalCancel: {
    backgroundColor: Colors.neutral[100],
  },
  modalSave: {
    backgroundColor: Colors.error[500],
  },
  modalCancelText: {
    color: Colors.neutral[700],
    fontWeight: "600",
  },
  modalSaveText: {
    color: Colors.text.inverse,
    fontWeight: "700",
  },
});

export default ShortlistsScreen;
