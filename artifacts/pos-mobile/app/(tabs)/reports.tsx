import { Feather } from "@expo/vector-icons";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGetDashboard, useGetOutletReport } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

function StatCard({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
  icon: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
        <Feather name={icon as any} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
      {sub && <Text style={[styles.statSub, { color: colors.mutedForeground }]}>{sub}</Text>}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title}</Text>
      {children}
    </View>
  );
}

export default function ReportsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { outlet, staff } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const {
    data: dashboard,
    isLoading: dashLoading,
    refetch: refetchDash,
  } = useGetDashboard(
    { outletId: outlet?.id, dateFrom: today, dateTo: today },
    { query: { enabled: true, refetchInterval: 60000 } }
  );

  const {
    data: outletReport,
    isLoading: reportLoading,
    refetch: refetchReport,
  } = useGetOutletReport(
    { outletId: outlet?.id ?? 0, dateFrom: today, dateTo: today },
    { query: { enabled: !!outlet?.id, refetchInterval: 60000 } }
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchDash(), refetchReport()]);
    setRefreshing(false);
  }, [refetchDash, refetchReport]);

  const isLoading = dashLoading || reportLoading;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const fmt = (n?: number | string | null) =>
    n != null ? Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {staff?.role === "super_admin" ? "All Outlets" : outlet?.name ?? "Reports"}
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Today · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
        </Text>
      </View>

      {isLoading && !dashboard && !outletReport ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading reports…</Text>
        </View>
      ) : (
        <View style={[styles.content, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 80 }]}>
          {dashboard && (
            <Section title="TODAY'S OVERVIEW">
              <View style={styles.statGrid}>
                <StatCard
                  label="Revenue"
                  value={`$${fmt(dashboard.totalRevenue)}`}
                  color={colors.success}
                  icon="dollar-sign"
                />
                <StatCard
                  label="Orders"
                  value={String(dashboard.totalOrders ?? 0)}
                  color={colors.accent}
                  icon="shopping-bag"
                />
                <StatCard
                  label="Avg Order"
                  value={`$${fmt(dashboard.avgOrderValue)}`}
                  color={colors.warning}
                  icon="trending-up"
                />
                <StatCard
                  label="Open Orders"
                  value={String(dashboard.openOrders ?? 0)}
                  color={colors.tableOccupied}
                  icon="clock"
                />
              </View>
            </Section>
          )}

          {outletReport && (
            <Section title="PAYMENT BREAKDOWN">
              <View style={[styles.breakdownCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {([
                  ["Cash", outletReport.cashRevenue, "dollar-sign", colors.success],
                  ["Bank Transfer", outletReport.bankTransferRevenue, "credit-card", colors.accent],
                  ["Credit", outletReport.creditRevenue, "users", colors.warning],
                ] as const).map(([label, value, icon, color]) => (
                  <View key={label} style={[styles.breakdownRow, { borderBottomColor: colors.border }]}>
                    <View style={[styles.breakdownIcon, { backgroundColor: `${color}15` }]}>
                      <Feather name={icon as any} size={14} color={color as string} />
                    </View>
                    <Text style={[styles.breakdownLabel, { color: colors.foreground }]}>{label}</Text>
                    <Text style={[styles.breakdownValue, { color: colors.foreground }]}>
                      ${fmt(value as number)}
                    </Text>
                  </View>
                ))}
              </View>
            </Section>
          )}

          {outletReport && (
            <Section title="OUTLET PERFORMANCE">
              <View style={[styles.breakdownCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {([
                  ["Paid Orders", outletReport.paidOrderCount, "check-circle", colors.success],
                  ["Cancelled", outletReport.cancelledOrderCount, "x-circle", colors.destructive],
                  ["Items Sold", outletReport.itemsSold, "package", colors.primary],
                ] as const).map(([label, value, icon, color]) => (
                  <View key={label} style={[styles.breakdownRow, { borderBottomColor: colors.border }]}>
                    <View style={[styles.breakdownIcon, { backgroundColor: `${color}15` }]}>
                      <Feather name={icon as any} size={14} color={color as string} />
                    </View>
                    <Text style={[styles.breakdownLabel, { color: colors.foreground }]}>{label}</Text>
                    <Text style={[styles.breakdownValue, { color: colors.foreground }]}>
                      {value ?? 0}
                    </Text>
                  </View>
                ))}
              </View>
            </Section>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { borderBottomWidth: 1, paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: "800" },
  subtitle: { fontSize: 13, marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 80 },
  loadingText: { fontSize: 14 },
  content: { padding: 16, gap: 24 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 6,
    flex: 1,
    minWidth: 130,
  },
  statIcon: { alignSelf: "flex-start", padding: 8, borderRadius: 10 },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 12, fontWeight: "600" },
  statSub: { fontSize: 11 },
  breakdownCard: { borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  breakdownIcon: { padding: 6, borderRadius: 8 },
  breakdownLabel: { flex: 1, fontSize: 14, fontWeight: "500" },
  breakdownValue: { fontSize: 14, fontWeight: "700" },
});
