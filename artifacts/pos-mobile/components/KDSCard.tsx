import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { KitchenOrder } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useUpdateKitchenItem } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface KDSCardProps {
  order: KitchenOrder;
}

const ITEM_STATUS_NEXT: Record<string, string> = {
  pending: "preparing",
  preparing: "served",
  served: "served",
};

const ITEM_STATUS_COLOR = {
  pending: "#f59e0b",
  preparing: "#0080ff",
  served: "#22c55e",
};

export function KDSCard({ order }: KDSCardProps) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { mutate: updateItem, isPending } = useUpdateKitchenItem({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/kitchen"] });
      },
    },
  });

  const allServed = order.items.every((i) => i.status === "served");

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: allServed ? colors.success : colors.border,
        },
      ]}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.tableName, { color: colors.foreground }]}>
            {order.tableName ?? `Order #${order.orderId}`}
          </Text>
          <Text style={[styles.orderId, { color: colors.mutedForeground }]}>
            #{order.orderId}
          </Text>
        </View>
        {allServed && (
          <View style={[styles.doneTag, { backgroundColor: `${colors.success}20` }]}>
            <Feather name="check-circle" size={14} color={colors.success} />
            <Text style={[styles.doneText, { color: colors.success }]}>Done</Text>
          </View>
        )}
      </View>

      <View style={styles.items}>
        {order.items.map((item) => {
          const statusColor = ITEM_STATUS_COLOR[item.status as keyof typeof ITEM_STATUS_COLOR] ?? colors.mutedForeground;
          const nextStatus = ITEM_STATUS_NEXT[item.status];
          const isLast = item.status === "served";

          return (
            <View key={item.id} style={[styles.itemRow, { borderBottomColor: colors.border }]}>
              <View style={styles.itemInfo}>
                <Text style={[styles.qty, { color: colors.foreground }]}>×{item.quantity}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, { color: colors.foreground }]}>{item.itemName}</Text>
                  {item.notes ? (
                    <Text style={[styles.notes, { color: colors.mutedForeground }]}>{item.notes}</Text>
                  ) : null}
                </View>
              </View>
              <Pressable
                style={[styles.statusBtn, { backgroundColor: `${statusColor}20`, borderColor: statusColor }]}
                onPress={() => {
                  if (isLast) return;
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  updateItem({
                    orderId: order.orderId,
                    itemId: item.id,
                    data: { status: nextStatus as any },
                  });
                }}
                disabled={isLast || isPending}
              >
                {isPending ? (
                  <ActivityIndicator size="small" color={statusColor} />
                ) : (
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </Text>
                )}
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 2,
    overflow: "hidden",
    marginBottom: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerLeft: { gap: 2 },
  tableName: { fontSize: 16, fontWeight: "700" },
  orderId: { fontSize: 12 },
  doneTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  doneText: { fontSize: 12, fontWeight: "600" },
  items: {},
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  itemInfo: { flex: 1, flexDirection: "row", gap: 8, alignItems: "flex-start" },
  qty: { fontSize: 16, fontWeight: "700", minWidth: 30 },
  itemName: { fontSize: 14, fontWeight: "600" },
  notes: { fontSize: 12, marginTop: 2 },
  statusBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 90,
    alignItems: "center",
  },
  statusText: { fontSize: 12, fontWeight: "700" },
});
