import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

const BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

type OrderStatus = "open" | "billed" | "paid" | "cancelled";

interface OrderRow {
  id: number;
  tableId: number;
  tableName: string;
  status: OrderStatus;
  total: string | number;
  createdAt: string;
  staffId?: number | null;
}

const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string }> = {
  open:      { bg: "#dbeafe", text: "#1d4ed8" },
  billed:    { bg: "#fef3c7", text: "#b45309" },
  paid:      { bg: "#dcfce7", text: "#15803d" },
  cancelled: { bg: "#fee2e2", text: "#b91c1c" },
};

const FILTERS: { label: string; value: "all" | OrderStatus }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "Billed", value: "billed" },
  { label: "Paid", value: "paid" },
  { label: "Cancelled", value: "cancelled" },
];

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function useOrders(outletId: number, status: "all" | OrderStatus) {
  const [orders, setOrders] = React.useState<OrderRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ outletId: String(outletId) });
      if (status !== "all") qs.set("status", status);
      const data = await apiFetch<{ orders: OrderRow[] }>(`/api/orders?${qs}`);
      setOrders(data.orders ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [outletId, status]);

  React.useEffect(() => { load(); }, [load]);

  return { orders, loading, error, reload: load };
}

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { outlet } = useAuth();
  const outletId = outlet?.id ?? 0;

  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const { orders, loading, error, reload } = useOrders(outletId, statusFilter);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Orders</Text>
      </View>

      {/* Status filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={[styles.filterBar, { borderBottomColor: colors.border, backgroundColor: colors.card }]}
      >
        {FILTERS.map(f => {
          const active = statusFilter === f.value;
          return (
            <Pressable
              key={f.value}
              onPress={() => setStatusFilter(f.value)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.primary : colors.secondary,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.chipText, { color: active ? colors.primaryForeground : colors.foreground }]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={32} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          <Pressable onPress={reload} style={[styles.retryBtn, { backgroundColor: colors.accent }]}>
            <Text style={[styles.retryText, { color: "#fff" }]}>Retry</Text>
          </Pressable>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <Feather name="inbox" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No orders found</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}>
          {orders.map((order, i) => {
            const sc = STATUS_COLORS[order.status] ?? STATUS_COLORS.open;
            const date = new Date(order.createdAt);
            const dateStr = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
            const timeStr = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
            return (
              <View
                key={order.id}
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.cardTop}>
                  <View style={styles.cardLeft}>
                    <Text style={[styles.orderNum, { color: colors.foreground }]}>#{order.id}</Text>
                    <Text style={[styles.tableName, { color: colors.mutedForeground }]}>
                      {order.tableName || `Table #${order.tableId}`}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusText, { color: sc.text }]}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Text>
                  </View>
                </View>
                <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />
                <View style={styles.cardBottom}>
                  <View style={styles.dateRow}>
                    <Feather name="calendar" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.dateText, { color: colors.mutedForeground }]}>{dateStr} · {timeStr}</Text>
                  </View>
                  <Text style={[styles.total, { color: colors.foreground }]}>
                    ${Number(order.total).toFixed(2)}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700" },
  filterBar: { borderBottomWidth: 1 },
  filterRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 14, fontWeight: "500" },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
  retryText: { fontSize: 14, fontWeight: "600" },
  emptyText: { fontSize: 15 },
  list: { padding: 16, gap: 10 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  cardLeft: { gap: 2 },
  orderNum: { fontSize: 16, fontWeight: "700" },
  tableName: { fontSize: 13 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: { fontSize: 12, fontWeight: "600" },
  cardDivider: { height: 1 },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  dateText: { fontSize: 12 },
  total: { fontSize: 16, fontWeight: "700" },
});
