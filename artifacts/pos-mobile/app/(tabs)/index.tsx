import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useListTables, getListTablesQueryKey } from "@workspace/api-client-react";
import type { Table } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

const STATUS_CONFIG = {
  available: {
    label: "Available",
    dot: "#22c55e",
    bg: "#f0fdf4",
    border: "#86efac",
    darkBg: "#052e16",
  },
  occupied: {
    label: "Occupied",
    dot: "#f59e0b",
    bg: "#fffbeb",
    border: "#fcd34d",
    darkBg: "#451a03",
  },
  bill_requested: {
    label: "Bill",
    dot: "#0080ff",
    bg: "#eff6ff",
    border: "#93c5fd",
    darkBg: "#172554",
  },
  reserved: {
    label: "Reserved",
    dot: "#8b5cf6",
    bg: "#f5f3ff",
    border: "#c4b5fd",
    darkBg: "#2e1065",
  },
} as const;

type FilterKey = "all" | "available" | "occupied" | "bill_requested";
const FILTERS: FilterKey[] = ["all", "available", "occupied", "bill_requested"];
const FILTER_LABELS: Record<FilterKey, string> = {
  all: "All",
  available: "Available",
  occupied: "Occupied",
  bill_requested: "Bill",
};

function TableCard({ table, onPress }: { table: Table; onPress: () => void }) {
  const colors = useColors();
  const cfg =
    STATUS_CONFIG[table.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.available;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: cfg.dot,
          opacity: pressed ? 0.82 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
      onPress={onPress}
    >
      {/* Top colour strip */}
      <View style={[styles.cardStrip, { backgroundColor: cfg.dot }]} />

      <View style={styles.cardBody}>
        <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={1}>
          {table.name}
        </Text>

        <View style={[styles.cardBadge, { backgroundColor: `${cfg.dot}22` }]}>
          <View style={[styles.badgeDot, { backgroundColor: cfg.dot }]} />
          <Text style={[styles.badgeText, { color: cfg.dot }]}>{cfg.label}</Text>
        </View>

        <View style={styles.cardFooter}>
          <Feather name="users" size={12} color={colors.mutedForeground} />
          <Text style={[styles.capacityText, { color: colors.mutedForeground }]}>
            {table.capacity ?? "—"}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function TablesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { outlet, logout } = useAuth();
  const { width } = useWindowDimensions();
  const numCols = width >= 768 ? 4 : width >= 480 ? 3 : 2;

  const [filter, setFilter] = useState<FilterKey>("all");
  const [refreshing, setRefreshing] = useState(false);

  const { data: tables, isLoading, refetch } = useListTables(
    { outletId: outlet?.id ?? 0 },
    {
      query: {
        enabled: !!outlet?.id,
        refetchInterval: 12000,
        queryKey: getListTablesQueryKey({ outletId: outlet?.id ?? 0 }),
      },
    }
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const filtered = (tables ?? []).filter(
    (t) => filter === "all" || t.status === filter
  );

  // Counts for badges
  const counts = (tables ?? []).reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1;
    return acc;
  }, {});

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleTablePress = useCallback(
    (table: Table) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({
        pathname: "/order/[tableId]",
        params: { tableId: table.id, tableName: encodeURIComponent(table.name) },
      });
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item }: { item: Table }) => (
      <TableCard table={item} onPress={() => handleTablePress(item)} />
    ),
    [handleTablePress]
  );

  if (!outlet) {
    return (
      <View style={[styles.screen, styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          No outlet assigned
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 12,
            borderBottomColor: colors.border,
            backgroundColor: colors.card,
          },
        ]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.outletName, { color: colors.foreground }]}>
              {outlet.name}
            </Text>
            <Text style={[styles.outletSub, { color: colors.mutedForeground }]}>
              {tables?.length ?? 0} tables
            </Text>
          </View>
          <Pressable
            onPress={logout}
            style={[styles.logoutBtn, { borderColor: colors.border }]}
            hitSlop={8}
          >
            <Feather name="log-out" size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {/* Status summary row */}
        {tables && tables.length > 0 && (
          <View style={styles.summaryRow}>
            {(["available", "occupied", "bill_requested"] as const).map((k) => {
              const cfg = STATUS_CONFIG[k];
              const n = counts[k] ?? 0;
              return (
                <View key={k} style={[styles.summaryChip, { backgroundColor: `${cfg.dot}15` }]}>
                  <View style={[styles.summaryDot, { backgroundColor: cfg.dot }]} />
                  <Text style={[styles.summaryNum, { color: cfg.dot }]}>{n}</Text>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                    {cfg.label}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Filter bar */}
        <FlatList
          data={FILTERS}
          horizontal
          keyExtractor={(f) => f}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBar}
          renderItem={({ item: f }) => {
            const count = f === "all" ? (tables?.length ?? 0) : (counts[f] ?? 0);
            const active = filter === f;
            return (
              <Pressable
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? colors.primary : colors.secondary,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setFilter(f)}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: active ? colors.primaryForeground : colors.foreground },
                  ]}
                >
                  {FILTER_LABELS[f]}
                </Text>
                <View
                  style={[
                    styles.filterCount,
                    {
                      backgroundColor: active
                        ? "rgba(255,255,255,0.25)"
                        : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterCountText,
                      { color: active ? colors.primaryForeground : colors.mutedForeground },
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      </View>

      {/* Content */}
      {isLoading && !tables ? (
        <View style={[styles.center, { flex: 1 }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Loading tables…
          </Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={[styles.center, { flex: 1 }]}>
          <Feather name="grid" size={44} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {filter === "all" ? "No tables configured" : `No ${FILTER_LABELS[filter].toLowerCase()} tables`}
          </Text>
          {filter !== "all" && (
            <Pressable onPress={() => setFilter("all")}>
              <Text style={[styles.showAllLink, { color: colors.accent }]}>Show all tables</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(t) => String(t.id)}
          renderItem={renderItem}
          numColumns={numCols}
          key={numCols}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingBottom:
                insets.bottom + (Platform.OS === "web" ? 34 : 0) + 90,
            },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          scrollEnabled={!!filtered && filtered.length > 0}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", gap: 10, padding: 24 },

  header: { borderBottomWidth: 1, paddingBottom: 10 },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  outletName: { fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
  outletSub: { fontSize: 13, marginTop: 1 },
  logoutBtn: { borderWidth: 1, borderRadius: 8, padding: 8 },

  summaryRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  summaryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  summaryDot: { width: 7, height: 7, borderRadius: 4 },
  summaryNum: { fontSize: 14, fontWeight: "700" },
  summaryLabel: { fontSize: 12 },

  filterBar: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterText: { fontSize: 13, fontWeight: "600" },
  filterCount: { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, minWidth: 20, alignItems: "center" },
  filterCountText: { fontSize: 11, fontWeight: "700" },

  row: { gap: 10, marginHorizontal: 16 },
  listContent: { paddingTop: 14, gap: 10 },

  card: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 2,
    overflow: "hidden",
    minWidth: 110,
    maxWidth: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardStrip: { height: 5 },
  cardBody: { padding: 12, gap: 8 },
  cardName: { fontSize: 16, fontWeight: "800" },
  cardBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 4 },
  capacityText: { fontSize: 12 },

  emptyTitle: { fontSize: 16, fontWeight: "600" },
  emptyText: { fontSize: 14 },
  showAllLink: { fontSize: 14, fontWeight: "600", marginTop: 4 },
});
