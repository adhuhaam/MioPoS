import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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

function formatElapsed(ms: number): string {
  const totalMins = Math.floor(ms / 60000);
  if (totalMins < 60) return `${totalMins}m`;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function TableCard({ table, now, onPress }: { table: Table; now: number; onPress: () => void }) {
  const colors = useColors();
  const cfg =
    STATUS_CONFIG[table.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.available;

  const t = table as any;
  const area = t.area as { name: string; type: string; color?: string; hourlyRate?: string | null } | null;
  const isOccupied = table.status === "occupied" || table.status === "bill_requested";
  const isTimedArea = area?.type === "timed";
  const tableOpenedAt: string | null = isOccupied && isTimedArea ? (t.tableOpenedAt ?? null) : null;
  const elapsedMs = tableOpenedAt ? now - new Date(tableOpenedAt).getTime() : 0;
  const showTimer = tableOpenedAt && elapsedMs >= 0;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.78 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.cardBody}>
        {/* Table icon + name row */}
        <View style={styles.nameRow}>
          <View style={[styles.tableIconWrap, { backgroundColor: `${cfg.dot}18` }]}>
            <MaterialCommunityIcons name="table-chair" size={20} color={cfg.dot} />
          </View>
          <Text style={[styles.cardName, { color: colors.foreground, flexShrink: 1 }]} numberOfLines={1}>
            {table.name}
          </Text>
          {showTimer && (
            <View style={styles.timerBadge}>
              <Feather name="clock" size={9} color="#6366f1" />
              <Text style={styles.timerText}>{formatElapsed(elapsedMs)}</Text>
            </View>
          )}
        </View>

        {/* Area row */}
        {area && (
          <View style={styles.areaRow}>
            <View style={[styles.areaDot, { backgroundColor: area.color ?? "#6366f1" }]} />
            <Text style={[styles.areaText, { color: colors.mutedForeground }]} numberOfLines={1}>
              {area.name}
              {isTimedArea && area.hourlyRate
                ? ` · $${Number(area.hourlyRate).toFixed(0)}/hr`
                : ""}
            </Text>
          </View>
        )}

        <View style={[styles.cardBadge, { backgroundColor: `${cfg.dot}18` }]}>
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
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const { data: tables, isLoading, refetch } = useListTables(
    { outletId: outlet?.id ?? 0 },
    {
      query: {
        enabled: !!outlet?.id,
        refetchInterval: 5000,
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
      <TableCard table={item} now={now} onPress={() => handleTablePress(item)} />
    ),
    [handleTablePress, now]
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
    borderWidth: 1,
    overflow: "hidden",
    minWidth: 110,
    maxWidth: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardBody: { padding: 12, gap: 6 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "nowrap" },
  tableIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardName: { fontSize: 15, fontWeight: "800", flexShrink: 1 },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#eef2ff",
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  timerText: { fontSize: 10, fontWeight: "700", color: "#6366f1" },
  areaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  areaDot: { width: 7, height: 7, borderRadius: 4 },
  areaText: { fontSize: 11 },
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
