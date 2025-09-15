import React, {
  useMemo,
  useRef,
  useState,
  useCallback,
  useEffect,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableWithoutFeedback,
  Dimensions,
} from "react-native";
import Swiper from "react-native-deck-swiper";
import { Layout } from "@constants";
import { useTheme } from "@contexts/ThemeContext";
import { useInterests } from "@/hooks/useInterests";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import HapticPressable from "@/components/ui/HapticPressable";
import { showUndoToast } from "../../src/lib/ui/toast";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useReduceMotion } from "@/hooks/useReduceMotion";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
// Local placeholder image for profiles without photos
const PLACEHOLDER_IMAGE = require("../../assets/placeholder.png");

export interface SwipeDeckProfile {
  userId: string;
  profile?: {
    fullName?: string;
    city?: string;
    dateOfBirth?: string;
    profileImageUrls?: string[];
  };
}

function getAge(dateOfBirth?: string): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return null;
  const diff = Date.now() - dob.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

type Props = {
  data: SwipeDeckProfile[];
  onEnd?: () => void;
  onOpenProfile?: (profileId: string) => void;
  onUninterested?: (profileId: string) => void;
  onRestore?: (profileId: string) => void;
};

export default function SwipeDeck({
  data,
  onEnd,
  onOpenProfile,
  onUninterested,
  onRestore,
}: Props) {
  const { theme } = useTheme();
  const swiperRef = useRef<Swiper<SwipeDeckProfile>>(null);
  const { sendInterest } = useInterests();
  const [index, setIndex] = useState(0);
  // Track broken image URLs to fallback to placeholder
  const [brokenIds, setBrokenIds] = useState<Record<string, boolean>>({});
  const { reduceMotion } = useReduceMotion();
  const [showCoach, setShowCoach] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const seen = await AsyncStorage.getItem("swipe_coach_mark_seen");
        if (mounted && !seen) setShowCoach(true);
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const cards = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const handleSwiped = useCallback(
    (i: number) => {
      setIndex(i + 1);
      // Prefetch next page when nearing the end to keep deck fluid
      const remaining = cards.length - (i + 1);
      if (remaining <= 2) onEnd?.();
    },
    [cards.length, onEnd]
  );

  const handleSwipedRight = useCallback(
    async (i: number) => {
      const profile = cards[i];
      if (!profile) return;
      try {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        ).catch(() => {});
        const ok = await sendInterest(profile.userId);
        // Remove the profile from the deck immediately after a successful send
        if (ok) {
          onUninterested?.(profile.userId);
        }
      } catch {}
    },
    [cards, sendInterest, onUninterested]
  );

  const renderCard = useCallback(
    (item: SwipeDeckProfile | null) => {
      if (!item)
        return (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.colors.background.primary },
            ]}
          />
        );
      const raw = item.profile?.profileImageUrls?.[0];
      // Normalize to https when possible
      const img =
        raw && raw.startsWith("http:") ? raw.replace(/^http:/, "https:") : raw;
      const age = getAge(item.profile?.dateOfBirth || undefined);
      return (
        <TouchableWithoutFeedback onPress={() => onOpenProfile?.(item.userId)}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.background.primary,
                borderColor: theme.colors.border.primary,
              },
            ]}
            testID={`card-${item.userId}`}
          >
            <View
              style={[
                styles.imageContainer,
                { backgroundColor: theme.colors.neutral[100] },
              ]}
            >
              {img && !brokenIds[item.userId] ? (
                <Image
                  source={{ uri: img }}
                  style={styles.image}
                  resizeMode="cover"
                  onError={() =>
                    setBrokenIds((prev: Record<string, boolean>) => ({
                      ...prev,
                      [item.userId]: true,
                    }))
                  }
                />
              ) : (
                <Image
                  source={PLACEHOLDER_IMAGE}
                  style={styles.image}
                  resizeMode="cover"
                />
              )}
            </View>
            <View style={styles.metaContainer}>
              <Text
                style={[styles.nameText, { color: theme.colors.text.primary }]}
              >
                {item.profile?.fullName || "Unknown"}
                {age ? `, ${age}` : ""}
              </Text>
              {!!item.profile?.city && (
                <Text
                  style={[
                    styles.cityText,
                    { color: theme.colors.text.secondary },
                  ]}
                >
                  {item.profile.city}
                </Text>
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>
      );
    },
    [onOpenProfile, theme.colors, brokenIds]
  );

  // Overlay tint and badges for left/right swipes (typed as any to bypass missing type defs)
  const overlayProps: any = {
    animateOverlayLabelsOpacity: !reduceMotion,
    inputOverlayLabelsOpacityRangeX: [
      -SCREEN_WIDTH / 3,
      -SCREEN_WIDTH / 5,
      0,
      SCREEN_WIDTH / 5,
      SCREEN_WIDTH / 3,
    ],
    outputOverlayLabelsOpacityRangeX: [0.9, 0.4, 0, 0.4, 0.9],
    overlayLabels: {
      left: {
        element: (
          <View style={styles.overlayWrapper} pointerEvents="none">
            <View
              style={[
                styles.overlayTint,
                {
                  backgroundColor: "rgba(239,68,68,0.18)",
                  borderColor: theme.colors.error[500],
                },
              ]}
            />
            <View
              style={[
                styles.overlayBadge,
                {
                  left: Layout.spacing.lg,
                  borderColor: theme.colors.error[500],
                },
              ]}
            >
              <Ionicons
                name="close"
                size={20}
                color={theme.colors.error[500]}
              />
              <Text
                style={[styles.overlayText, { color: theme.colors.error[500] }]}
              >
                NOPE
              </Text>
            </View>
          </View>
        ),
        style: {
          wrapper: {
            position: "absolute",
            width: "100%",
            height: "100%",
            top: 0,
            left: 0,
          },
        },
      },
      right: {
        element: (
          <View style={styles.overlayWrapper} pointerEvents="none">
            <View
              style={[
                styles.overlayTint,
                {
                  backgroundColor: "rgba(16,185,129,0.18)",
                  borderColor: theme.colors.success[500],
                },
              ]}
            />
            <View
              style={[
                styles.overlayBadge,
                {
                  right: Layout.spacing.lg,
                  borderColor: theme.colors.success[500],
                  flexDirection: "row-reverse",
                },
              ]}
            >
              <Ionicons
                name="heart"
                size={20}
                color={theme.colors.success[500]}
              />
              <Text
                style={[
                  styles.overlayText,
                  { color: theme.colors.success[500] },
                ]}
              >
                LIKE
              </Text>
            </View>
          </View>
        ),
        style: {
          wrapper: {
            position: "absolute",
            width: "100%",
            height: "100%",
            top: 0,
            left: 0,
          },
        },
      },
    },
  };

  return (
    <View style={styles.container}>
      {/* Remaining counter */}
      <View style={styles.counterBadge}>
        <Text
          style={[styles.counterText, { color: theme.colors.text.secondary }]}
        >
          {Math.max(0, cards.length - index)} left
        </Text>
      </View>

      {/* One-time coach mark overlay */}
      {showCoach && (
        <View style={styles.coachOverlay} pointerEvents="box-none">
          <View
            style={[
              styles.coachCard,
              {
                backgroundColor: theme.colors.background.primary,
                borderColor: theme.colors.border.primary,
              },
            ]}
          >
            <Text
              style={[styles.coachTitle, { color: theme.colors.text.primary }]}
            >
              Swipe to browse
            </Text>
            <View style={styles.coachRow}>
              <Ionicons
                name="arrow-back"
                size={18}
                color={theme.colors.error[500]}
              />
              <Text
                style={[
                  styles.coachText,
                  { color: theme.colors.text.secondary },
                ]}
              >
                Pass
              </Text>
              <View style={{ width: 16 }} />
              <Text
                style={[
                  styles.coachText,
                  { color: theme.colors.text.secondary },
                ]}
              >
                Like
              </Text>
              <Ionicons
                name="arrow-forward"
                size={18}
                color={theme.colors.success[500]}
              />
            </View>
            <Text
              style={[styles.coachHint, { color: theme.colors.text.secondary }]}
            >
              Tap a card for details
            </Text>
            <HapticPressable
              style={[
                styles.coachButton,
                { backgroundColor: theme.colors.primary[500] },
              ]}
              onPress={async () => {
                setShowCoach(false);
                try {
                  await AsyncStorage.setItem("swipe_coach_mark_seen", "1");
                } catch {}
              }}
            >
              <Text
                style={{ color: theme.colors.text.inverse, fontWeight: "700" }}
              >
                Got it
              </Text>
            </HapticPressable>
          </View>
        </View>
      )}
      <Swiper
        ref={swiperRef}
        cards={cards}
        cardIndex={index}
        renderCard={renderCard}
        onSwiped={handleSwiped}
        onSwipedRight={handleSwipedRight}
        onSwipedLeft={(i) => {
          const profile = cards[i];
          if (profile) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
              () => {}
            );
            onUninterested?.(profile.userId);
            // Offer undo
            showUndoToast(
              `${profile.profile?.fullName || "Profile"} passed`,
              () => onRestore?.(profile.userId),
              "Undo",
              6000
            );
          }
        }}
        stackSize={3}
        stackSeparation={reduceMotion ? 6 : 12}
        cardVerticalMargin={8}
        cardHorizontalMargin={16}
        onTapCard={(tapIndex) => {
          const profile = cards[tapIndex];
          if (profile) onOpenProfile?.(profile.userId);
        }}
        animateCardOpacity={!reduceMotion}
        disableTopSwipe
        {...overlayProps}
      />

      {/* Bottom action bar */}
      <View style={styles.actionsBar} pointerEvents="box-none">
        <HapticPressable
          style={[
            styles.actionBtn,
            { backgroundColor: theme.colors.error[500] },
          ]}
          onPress={() => swiperRef.current?.swipeLeft()}
          accessibilityRole="button"
          accessibilityLabel="Pass"
        >
          <Ionicons name="close" size={24} color={theme.colors.text.inverse} />
        </HapticPressable>

        <HapticPressable
          style={[
            styles.actionBtn,
            { backgroundColor: theme.colors.neutral[700] },
          ]}
          onPress={() => {
            const current = cards[index];
            if (current) onOpenProfile?.(current.userId);
          }}
          accessibilityRole="button"
          accessibilityLabel="More info"
        >
          <Ionicons
            name="information"
            size={22}
            color={theme.colors.text.inverse}
          />
        </HapticPressable>

        <HapticPressable
          style={[
            styles.actionBtn,
            { backgroundColor: theme.colors.success[500] },
          ]}
          onPress={() => swiperRef.current?.swipeRight()}
          accessibilityRole="button"
          accessibilityLabel="Like"
        >
          <Ionicons name="heart" size={22} color={theme.colors.text.inverse} />
        </HapticPressable>
      </View>
    </View>
  );
}

const CARD_HEIGHT = SCREEN_HEIGHT * 0.7;
const CARD_WIDTH = SCREEN_WIDTH - Layout.spacing.lg * 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Layout.spacing.lg,
    paddingTop: Layout.spacing.md,
  },
  counterBadge: {
    position: "absolute",
    top: Layout.spacing.md,
    right: Layout.spacing.xl,
    zIndex: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  counterText: {
    fontSize: 12,
    fontWeight: "600",
  },
  card: {
    height: CARD_HEIGHT,
    width: CARD_WIDTH,
    borderRadius: Layout.radius.xl,
    borderWidth: 1,
    overflow: "hidden",
  },
  imageContainer: {
    height: CARD_HEIGHT - 100,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  metaContainer: {
    padding: Layout.spacing.md,
  },
  nameText: {
    fontFamily: Layout.typography.fontFamily.serif,
    fontSize: Layout.typography.fontSize.xl,
    fontWeight: Layout.typography.fontWeight.bold,
  },
  cityText: {
    marginTop: 4,
    fontSize: Layout.typography.fontSize.base,
  },
  overlayLabel: {
    borderWidth: 3,
    fontSize: 24,
    padding: 8,
    borderRadius: 8,
    overflow: "hidden",
  },
  overlayWrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayTint: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderRadius: Layout.radius.xl,
  },
  overlayBadge: {
    position: "absolute",
    top: Layout.spacing.lg,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.85)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  overlayText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
  },
  actionsBar: {
    position: "absolute",
    bottom: Layout.spacing.xl,
    left: 0,
    right: 0,
    paddingHorizontal: Layout.spacing.xl,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  coachOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Layout.spacing.lg,
    zIndex: 20,
  },
  coachCard: {
    width: "90%",
    maxWidth: 420,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    padding: Layout.spacing.lg,
    alignItems: "center",
  },
  coachTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  coachRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 6,
  },
  coachText: {
    fontSize: 14,
    fontWeight: "600",
  },
  coachHint: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: Layout.spacing.md,
  },
  coachButton: {
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.radius.md,
  },
});
