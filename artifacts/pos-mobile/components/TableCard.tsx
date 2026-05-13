import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Table } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

interface TableCardProps {
  table: Table;
  onPress: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  available: "Available",
  occupied: "Occupied",
  bill_requested: "Bill",
  reserved: "Reserved",
};

export function TableCard({ table, onPress }: TableCardProps) {
  const colors = useColors();

  const statusColor =
    table.status === "available"
      ? colors.tableAvailable
      : table.status === "occupied"
        ? colors.tableOccupied
        : table.status === "bill_requested"
          ? colors.tableBilled
          : colors.mutedForeground;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: statusColor,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      onPress={onPress}
    >
      <View style={[styles.statusBar, { backgroundColor: statusColor }]} />
      <View style={styles.body}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
          {table.name}
        </Text>
        <View style={[styles.badge, { backgroundColor: `${statusColor}20` }]}>
          <Text style={[styles.badgeText, { color: statusColor }]}>
            {STATUS_LABELS[table.status] ?? table.status}
          </Text>
        </View>
      </View>
      {table.capacity != null && (
        <Text style={[styles.capacity, { color: colors.mutedForeground }]}>
          {table.capacity} seats
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 2,
    overflow: "hidden",
    flex: 1,
    minWidth: 130,
    maxWidth: 180,
  },
  statusBar: { height: 4 },
  body: { padding: 12, gap: 8 },
  name: { fontSize: 16, fontWeight: "700" },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: "600" },
  capacity: { fontSize: 12, paddingHorizontal: 12, paddingBottom: 10 },
});
