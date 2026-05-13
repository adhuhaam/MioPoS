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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useListTables } from "@workspace/api-client-react";
import type { Table } from "@workspace/api-client-react";
import { TableCard } from "@/components/TableCard";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

const FILTERS = ["all", "available", "occupied", "bill_requested"] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_LABELS: Record<Filter, string> = {
  all: "All",
  available: "Available",
  occupied: "Occupied",
  bill_requested: "Bill",
};

export default function TablesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { outlet, logout } = useAuth();
  const [filter, setFilter] = useState<Filter>("all");
  const [refreshing, setRefreshing] = useState(false);

  const { data: tables, isLoading, refetch } = useListTables(
    { outletId: outlet?.id ?? 0 },
    { query: { enabled: !!outlet?.id, refetchInterval: 15000 } }
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const filtered = (tables ?? []).filter(
    (t) => filter === "all" || t.status === filter
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const renderItem = useCallback(
    ({ item }: { item: Table }) => (
      <TableCard
        table={item}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/order/${item.id}`);
        }}
      />
    ),
    [router]
  );

  if (!outlet) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No outlet assigned</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.outletName, { color: colors.foreground }]}>{outlet.name}</Text>
            <Text style={[styles.screenTitle, { color: colors.mutedForeground }]}>Tables</Text>
          </View>
          <Pressable onPress={logout} style={[styles.logoutBtn, { borderColor: colors.border }]}>
            <Feather name="log-out" size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <FlatList
          data={FILTERS}
          horizontal
          keyExtractor={(f) => f}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBar}
          renderItem={({ item: f }) => (
            <Pressable
              style={[
                styles.filterChip,
                {
                  backgroundColor: filter === f ? colors.primary : colors.secondary,
                  borderColor: filter === f ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setFilter(f)}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: filter === f ? colors.primaryForeground : colors.foreground },
                ]}
              >
                {FILTER_LABELS[f]}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Feather name="grid" size={48} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {filter === "all" ? "No tables configured" : `No ${FILTER_LABELS[filter].toLowerCase()} tables`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(t) => String(t.id)}
          renderItem={renderItem}
          numColumns={3}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 80 },
          ]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          scrollEnabled={filtered.length > 0}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  header: { borderBottomWidth: 1, paddingBottom: 10 },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  outletName: { fontSize: 20, fontWeight: "800" },
  screenTitle: { fontSize: 13 },
  logoutBtn: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
  },
  filterBar: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  filterText: { fontSize: 13, fontWeight: "600" },
  row: { gap: 10, marginHorizontal: 16 },
  listContent: { paddingTop: 14, gap: 10 },
  emptyText: { fontSize: 15 },
});
