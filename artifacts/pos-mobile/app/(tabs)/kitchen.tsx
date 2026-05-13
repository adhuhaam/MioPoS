import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useListKitchenOrders } from "@workspace/api-client-react";
import type { KitchenOrder } from "@workspace/api-client-react";
import { KDSCard } from "@/components/KDSCard";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

const STATUS_FILTERS = ["all", "pending", "preparing", "served"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const LABELS: Record<StatusFilter, string> = {
  all: "All",
  pending: "Pending",
  preparing: "Preparing",
  served: "Served",
};

export default function KitchenScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { outlet, staff, logout } = useAuth();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [refreshing, setRefreshing] = useState(false);

  const { data: orders, isLoading, refetch } = useListKitchenOrders(
    {
      outletId: outlet?.id ?? 0,
      ...(statusFilter !== "all" ? { status: statusFilter as any } : {}),
    },
    { query: { enabled: !!outlet?.id, refetchInterval: 5000 } }
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const renderItem = useCallback(
    ({ item }: { item: KitchenOrder }) => <KDSCard order={item} />,
    []
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {outlet?.name ?? "Kitchen"}
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Kitchen Display</Text>
          </View>
          <View style={styles.headerRight}>
            <Pressable
              onPress={() => refetch()}
              style={[styles.iconBtn, { borderColor: colors.border }]}
            >
              <Feather name="refresh-cw" size={18} color={colors.mutedForeground} />
            </Pressable>
            {staff?.role === "kitchen" && (
              <Pressable onPress={logout} style={[styles.iconBtn, { borderColor: colors.border }]}>
                <Feather name="log-out" size={18} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>
        </View>

        <FlatList
          data={STATUS_FILTERS}
          horizontal
          keyExtractor={(f) => f}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBar}
          renderItem={({ item: f }) => (
            <Pressable
              style={[
                styles.filterChip,
                {
                  backgroundColor: statusFilter === f ? colors.primary : colors.secondary,
                  borderColor: statusFilter === f ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setStatusFilter(f)}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: statusFilter === f ? colors.primaryForeground : colors.foreground },
                ]}
              >
                {LABELS[f]}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !orders || orders.length === 0 ? (
        <View style={styles.center}>
          <Feather name="coffee" size={48} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No orders in the kitchen
          </Text>
          <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>
            New orders appear here automatically
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => String(o.id)}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 80 },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          scrollEnabled={!!orders && orders.length > 0}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  header: { borderBottomWidth: 1, paddingBottom: 10 },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  title: { fontSize: 20, fontWeight: "800" },
  subtitle: { fontSize: 13 },
  headerRight: { flexDirection: "row", gap: 8 },
  iconBtn: { borderWidth: 1, borderRadius: 8, padding: 8 },
  filterBar: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  filterText: { fontSize: 13, fontWeight: "600" },
  listContent: { padding: 14, gap: 0 },
  emptyText: { fontSize: 16, fontWeight: "600" },
  emptyHint: { fontSize: 13 },
});
