"use client";

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { fetchShortlists, toggleShortlist, ShortlistEntry } from "@/utils/engagementUtil";
import { useToast } from "@/providers/ToastContext";
import ScreenContainer from "@components/common/ScreenContainer";

export function ShortlistsScreen() {
  const navigation = useNavigation();
  const toast = useToast();
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
    const profileImage = Array.isArray(item.profileImageUrls) && item.profileImageUrls[0];

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
                <Ionicons name="person" size={24} color="#9ca3af" />
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
          </View>

          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => onRemove(item.userId, item.fullName || undefined)}
            activeOpacity={0.7}
          >
            <Ionicons name="heart-dislike" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="heart" size={48} color="#e5e7eb" />
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
            colors={["#ef4444"]}
            tintColor="#ef4444"
          />
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  headerTitle: {
    fontFamily: "Boldonse-Regular",
    fontSize: 24,
    color: "#111827",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
  listContainer: {
    flexGrow: 1,
    padding: 16,
  },
  item: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#000",
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
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  itemInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    color: "#6b7280",
  },
  removeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#fef2f2",
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
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
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
    color: "#ef4444",
    marginBottom: 16,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default ShortlistsScreen;
