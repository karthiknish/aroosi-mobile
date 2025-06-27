import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "../../utils/api";
import { errorHandler } from "../../utils/errorHandling";
import { Colors, Layout } from "../../constants";

interface UsageHistoryScreenProps {
  navigation: any;
}

interface UsageHistoryItem {
  period: string; // YYYY-MM format
  tier: string;
  features: {
    name: string;
    used: number;
    limit: number;
    unlimited: boolean;
    percentageUsed: number;
  }[];
  totalUsage: number;
  periodStart: number;
  periodEnd: number;
}

export default function UsageHistoryScreen({
  navigation,
}: UsageHistoryScreenProps) {
  const apiClient = useApiClient();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: usageHistory,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["usageHistory"],
    queryFn: () => apiClient.getUsageHistory(),
    select: (data) => (data.success ? data.data : []),
  });

  React.useEffect(() => {
    if (error) {
      errorHandler.handle(error, {
        component: "UsageHistoryScreen",
        action: "fetchUsageHistory",
      });
    }
  }, [error]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const formatPeriod = (period: string) => {
    const [year, month] = period.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return Colors.error[500];
    if (percentage >= 70) return Colors.warning[500];
    return Colors.success[500];
  };

  const renderUsageItem = (item: UsageHistoryItem) => (
    <View key={item.period} style={styles.usageCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.periodText}>{formatPeriod(item.period)}</Text>
        <View
          style={[
            styles.tierBadge,
            { backgroundColor: getTierColor(item.tier) },
          ]}
        >
          <Text style={styles.tierText}>{item.tier.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.featuresContainer}>
        {item.features.map((feature) => (
          <View key={feature.name} style={styles.featureRow}>
            <View style={styles.featureInfo}>
              <Text style={styles.featureName}>
                {formatFeatureName(feature.name)}
              </Text>
              <Text style={styles.featureUsage}>
                {feature.unlimited
                  ? `${feature.used} (Unlimited)`
                  : `${feature.used} / ${feature.limit}`}
              </Text>
            </View>

            {!feature.unlimited && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(feature.percentageUsed, 100)}%`,
                        backgroundColor: getUsageColor(feature.percentageUsed),
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.percentageText,
                    { color: getUsageColor(feature.percentageUsed) },
                  ]}
                >
                  {feature.percentageUsed.toFixed(0)}%
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );

  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case "free":
        return Colors.gray[400];
      case "premium":
        return Colors.primary[500];
      case "premiumplus":
        return Colors.secondary[500];
      default:
        return Colors.gray[400];
    }
  };

  const formatFeatureName = (name: string) => {
    return name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
          <Text style={styles.loadingText}>Loading usage history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load usage history</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Usage History</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary[500]]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {usageHistory && (usageHistory as UsageHistoryItem[]).length > 0 ? (
          <View style={styles.content}>
            <Text style={styles.sectionTitle}>Monthly Usage Overview</Text>
            <Text style={styles.sectionSubtitle}>
              Track your feature usage across different billing periods
            </Text>

            {(usageHistory as UsageHistoryItem[]).map(renderUsageItem)}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No usage history available</Text>
            <Text style={styles.emptySubtext}>
              Start using premium features to see your usage statistics
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
    backgroundColor: Colors.background.primary,
  },
  backButton: {
    padding: Layout.spacing.sm,
  },
  backButtonText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.primary[500],
    fontWeight: Layout.typography.fontWeight.medium,
  },
  headerTitle: {
    fontSize: Layout.typography.fontSize.xl,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  placeholder: {
    width: 50,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Layout.spacing.lg,
  },
  sectionTitle: {
    fontSize: Layout.typography.fontSize["2xl"],
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.sm,
  },
  sectionSubtitle: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Layout.spacing.xl,
  },
  usageCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: Layout.radius.lg,
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Layout.spacing.lg,
  },
  periodText: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  tierBadge: {
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.xs,
    borderRadius: Layout.radius.md,
  },
  tierText: {
    fontSize: Layout.typography.fontSize.xs,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.inverse,
  },
  featuresContainer: {
    gap: Layout.spacing.md,
  },
  featureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  featureInfo: {
    flex: 1,
  },
  featureName: {
    fontSize: Layout.typography.fontSize.sm,
    fontWeight: Layout.typography.fontWeight.medium,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },
  featureUsage: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.sm,
    minWidth: 80,
  },
  progressBar: {
    width: 50,
    height: 4,
    backgroundColor: Colors.gray[200],
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  percentageText: {
    fontSize: Layout.typography.fontSize.xs,
    fontWeight: Layout.typography.fontWeight.medium,
    minWidth: 25,
    textAlign: "right",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: Layout.spacing.md,
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Layout.spacing.xl,
  },
  errorText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: "center",
    marginBottom: Layout.spacing.lg,
  },
  retryButton: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.radius.md,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.medium,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Layout.spacing.xl,
  },
  emptyText: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.medium,
    color: Colors.text.primary,
    textAlign: "center",
    marginBottom: Layout.spacing.sm,
  },
  emptySubtext: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: "center",
  },
});
