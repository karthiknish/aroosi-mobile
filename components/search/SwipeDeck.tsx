import React, { useMemo, useRef, useState, useCallback } from "react";
import { View, Text, StyleSheet, Image, TouchableWithoutFeedback, Dimensions } from "react-native";
import Swiper from "react-native-deck-swiper";
import { Colors, Layout } from "@constants";
import { useTheme } from "@contexts/ThemeContext";
import { useInterests } from "@/hooks/useInterests";

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
};

export default function SwipeDeck({ data, onEnd, onOpenProfile, onUninterested }: Props) {
  const { theme } = useTheme();
  const swiperRef = useRef<Swiper<SwipeDeckProfile>>(null);
  const { sendInterest } = useInterests();
  const [index, setIndex] = useState(0);

  const cards = useMemo(() => Array.isArray(data) ? data : [], [data]);

  const handleSwiped = useCallback((i: number) => {
    setIndex(i + 1);
    // Prefetch next page when nearing the end to keep deck fluid
    const remaining = cards.length - (i + 1);
    if (remaining <= 2) onEnd?.();
  }, [cards.length, onEnd]);

  const handleSwipedRight = useCallback(async (i: number) => {
    const profile = cards[i];
    if (!profile) return;
    try {
      await sendInterest(profile.userId);
    } catch {}
  }, [cards, sendInterest]);

  const renderCard = useCallback((item: SwipeDeckProfile | null) => {
    if (!item) return <View style={[styles.card, { backgroundColor: theme.colors.background.primary }]} />;
    const img = item.profile?.profileImageUrls?.[0];
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
          <View style={styles.imageContainer}>
            {img ? (
              <Image
                source={{ uri: img }}
                style={styles.image}
                resizeMode="cover"
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
  }, [onOpenProfile, theme.colors]);

  return (
    <View style={styles.container}>
      <Swiper
        ref={swiperRef}
        cards={cards}
        cardIndex={index}
        renderCard={renderCard}
        onSwiped={handleSwiped}
        onSwipedRight={handleSwipedRight}
        onSwipedLeft={(i) => {
          const profile = cards[i];
          if (profile) onUninterested?.(profile.userId);
        }}
        backgroundColor="transparent"
        stackSize={3}
        stackSeparation={12}
        cardVerticalMargin={8}
        cardHorizontalMargin={16}
        animateOverlayLabelsOpacity
        overlayLabels={{
          left: {
            title: "NOPE",
            style: {
              label: [styles.overlayLabel, { borderColor: Colors.error[500], color: Colors.error[500] }],
              wrapper: { alignItems: "flex-end", marginTop: 30, marginLeft: -30 },
            },
          },
          right: {
            title: "LIKE",
            style: {
              label: [styles.overlayLabel, { borderColor: Colors.success[500], color: Colors.success[500] }],
              wrapper: { alignItems: "flex-start", marginTop: 30, marginLeft: 30 },
            },
          },
        }}
        disableBottomSwipe
        disableTopSwipe
      />
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
  card: {
    height: CARD_HEIGHT,
    width: CARD_WIDTH,
    borderRadius: Layout.radius.xl,
    borderWidth: 1,
    overflow: "hidden",
  },
  imageContainer: {
    height: CARD_HEIGHT - 100,
    backgroundColor: Colors.neutral[100],
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
});
