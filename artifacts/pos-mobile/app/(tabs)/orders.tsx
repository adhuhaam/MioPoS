import { Feather } from "@expo/vector-icons";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useListOrders } from "@workspace/api-client-react";
import type { ListOrdersStatus } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

const FILTERS = [
  { label: "All", value: undefined },
  { label: "Open", value: "open" },
  { label: "Billed", value: "billed" },
  { label: "Paid", value: "paid" },
  { label: "Cancelled", value: "cancelled" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  open: "#f59e0b",
  billed: "#3b82f6",
  paid: "#22c55e",
  cancelled: "#ef4444",
};

function fmt(n?: number | string | null, currency = "") {
  if (n == null) return "—";
  return `${currency}${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { outlet, staff } = useAuth();
  const [statusFilter, setStatusFilter] = useState<ListOrdersStatus | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);

  const { data: ordersResponse, isLoading, refetch } = useListOrders(
    {
      outletId: staff?.role === "super_admin" ? undefined : outlet?.id,
      status: statusFilter,
      limit: 100,
    },
    { query: { refetchInterval: 30000 } }
  );
  const orders = ordersResponse?.orders;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Orders</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {staff?.role === "super_admin" ? "All outlets" : outlet?.name ?? ""}
        </Text>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.filterBar, { borderBottomColor: colors.border, backgroundColor: colors.card }]}
        contentContainerStyle={styles.filterBarContent}
      >
        {FILTERS.map((f) => {
          const active = statusFilter === f.value;
          return (
            <Pressable
              key={f.label}
              onPress={() => setStatusFilter(f.value as any)}
              style={[
                styles.chip,
                { borderColor: active ? colors.accent : colors.border },
                active && { backgroundColor: colors.accent },
              ]}
            >
              <Text style={[styles.chipText, { color: active ? "#fff" : colors.mutedForeground }]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {isLoading && !orders ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !orders?.length ? (
        <View style={styles.center}>
          <Feather name="inbox" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No orders found</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => String(o.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100, padding: 14, gap: 10 }}
          renderItem={({ item: o }) => {
            const statusColor = STATUS_COLORS[o.status] ?? colors.mutedForeground;
            return (
              <View style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.orderTop}>
                  <View style={styles.orderLeft}>
                    <Text style={[styles.orderNum, { color: colors.foreground }]}>#{o.id}</Text>
                    <Text style={[styles.orderTable, { color: colors.mutedForeground }]}>
                      {(o as any).tableName ?? `Table ${o.tableId}`}
                    </Text>
                  </View>
                  <View>
                    <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                      <Text style={[styles.statusText, { color: statusColor }]}>
                        {o.status.charAt(0).toUpperCase() + o.status.slice(1).replace("_", " ")}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={[styles.orderDivider, { backgroundColor: colors.border }]} />
                <View style={styles.orderBottom}>
                  <Text style={[styles.orderTotal, { color: colors.foreground }]}>
                    {fmt(o.total)}
                  </Text>
                  <Text style={[styles.orderTime, { color: colors.mutedForeground }]}>
                    {o.createdAt ? timeAgo(o.createdAt as string) : ""}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { borderBottomWidth: 1, paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: "800" },
  subtitle: { fontSize: 13, marginTop: 2 },
  filterBar: { flexGrow: 0, borderBottomWidth: 1 },
  filterBarContent: { paddingHorizontal: 14, paddingVertical: 10, gap: 8, flexDirection: "row" },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipText: { fontSize: 13, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyText: { fontSize: 15 },
  orderCard: { borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  orderTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
  orderLeft: { gap: 2 },
  orderNum: { fontSize: 16, fontWeight: "700" },
  orderTable: { fontSize: 13 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: "700" },
  orderDivider: { height: 1 },
  orderBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10 },
  orderTotal: { fontSize: 16, fontWeight: "800" },
  orderTime: { fontSize: 12 },
});
