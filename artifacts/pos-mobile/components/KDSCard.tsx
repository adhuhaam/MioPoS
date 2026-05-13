import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { KitchenOrder } from "@workspace/api-client-react";
import { useUpdateOrderItem, getListKitchenOrdersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";

interface KDSCardProps {
  order: KitchenOrder;
}

const NEXT_STATUS: Record<string, string> = {
  pending: "preparing",
  preparing: "ready",
  ready: "served",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "#f59e0b",
  preparing: "#0080ff",
  ready: "#22c55e",
  served: "#9ca3af",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
};

export function KDSCard({ order }: KDSCardProps) {
  const colors = useColors();
  const qc = useQueryClient();
  const { outlet } = useAuth();

  const { mutate: updateItem, isPending } = useUpdateOrderItem({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({
          queryKey: getListKitchenOrdersQueryKey({ outletId: outlet?.id ?? 0 }),
        });
      },
    },
  });

  const allServed = order.items.every((i) => i.kitchenStatus === "served");
  const allReady = order.items.every(
    (i) => i.kitchenStatus === "ready" || i.kitchenStatus === "served"
  );

  const advanceAll = () => {
    if (allServed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    order.items.forEach((item) => {
      const next = NEXT_STATUS[item.kitchenStatus];
      if (next) {
        updateItem({
          id: order.id,
          itemId: item.id,
          data: { kitchenStatus: next as any },
        });
      }
    });
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: allReady
            ? colors.success
            : allServed
              ? colors.border
              : colors.border,
          borderWidth: allReady ? 2 : 1,
        },
      ]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.tableName, { color: colors.foreground }]}>
            {order.tableName ?? `Order #${order.id}`}
          </Text>
          <Text style={[styles.orderId, { color: colors.mutedForeground }]}>
            Order #{order.id}
          </Text>
        </View>

        <View style={styles.headerRight}>
          {allServed ? (
            <View style={[styles.statusTag, { backgroundColor: `${colors.mutedForeground}15` }]}>
              <Feather name="check" size={12} color={colors.mutedForeground} />
              <Text style={[styles.statusTagText, { color: colors.mutedForeground }]}>Done</Text>
            </View>
          ) : allReady ? (
            <View style={[styles.statusTag, { backgroundColor: `${colors.success}15` }]}>
              <Feather name="check-circle" size={12} color={colors.success} />
              <Text style={[styles.statusTagText, { color: colors.success }]}>Ready to Serve</Text>
            </View>
          ) : (
            <Pressable
              style={[styles.advanceBtn, { backgroundColor: colors.accent }]}
              onPress={advanceAll}
              disabled={isPending}
            >
              <Text style={[styles.advanceBtnText, { color: colors.accentForeground }]}>
                Advance All
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Items */}
      {order.items.map((item, idx) => {
        const statusColor = STATUS_COLOR[item.kitchenStatus] ?? colors.mutedForeground;
        const nextStatus = NEXT_STATUS[item.kitchenStatus];
        const isDone = !nextStatus;

        return (
          <View
            key={item.id}
            style={[
              styles.itemRow,
              {
                borderBottomColor: colors.border,
                borderBottomWidth: idx < order.items.length - 1 ? 1 : 0,
                backgroundColor: item.kitchenStatus === "ready" ? `${colors.success}08` : "transparent",
              },
            ]}
          >
            <View style={styles.itemLeft}>
              <View style={[styles.qtyBadge, { backgroundColor: `${statusColor}20` }]}>
                <Text style={[styles.qtyText, { color: statusColor }]}>×{item.quantity}</Text>
              </View>
              <View style={styles.itemMeta}>
                <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={1}>
                  {item.menuItemName}
                </Text>
                {item.notes ? (
                  <Text style={[styles.itemNotes, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {item.notes}
                  </Text>
                ) : null}
              </View>
            </View>

            <Pressable
              style={[
                styles.statusBtn,
                {
                  backgroundColor: `${statusColor}18`,
                  borderColor: statusColor,
                  opacity: isDone ? 0.5 : 1,
                },
              ]}
              onPress={() => {
                if (isDone || isPending) return;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updateItem({
                  id: order.id,
                  itemId: item.id,
                  data: { kitchenStatus: nextStatus as any },
                });
              }}
              disabled={isDone || isPending}
            >
              {isPending ? (
                <ActivityIndicator size="small" color={statusColor} />
              ) : (
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {STATUS_LABEL[item.kitchenStatus] ?? item.kitchenStatus}
                </Text>
              )}
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  headerLeft: { gap: 1 },
  tableName: { fontSize: 16, fontWeight: "700" },
  orderId: { fontSize: 12 },
  headerRight: { alignItems: "flex-end" },
  statusTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusTagText: { fontSize: 12, fontWeight: "600" },
  advanceBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  advanceBtnText: { fontSize: 12, fontWeight: "700" },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },
  itemLeft: { flex: 1, flexDirection: "row", gap: 10, alignItems: "center" },
  qtyBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, minWidth: 36, alignItems: "center" },
  qtyText: { fontSize: 13, fontWeight: "700" },
  itemMeta: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: "600" },
  itemNotes: { fontSize: 12, marginTop: 1 },
  statusBtn: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 94,
    alignItems: "center",
  },
  statusText: { fontSize: 12, fontWeight: "700" },
});
