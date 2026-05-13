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
  const area = (table as any).area as { name: string; type: string; color?: string; hourlyRate?: string | null } | null;

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

        {area && (
          <View style={[styles.areaRow]}>
            <View style={[styles.areaDot, { backgroundColor: area.color ?? "#6366f1" }]} />
            <Text style={[styles.areaText, { color: colors.mutedForeground }]} numberOfLines={1}>
              {area.name}
            </Text>
            {area.type === "timed" && (
              <View style={[styles.timedBadge, { backgroundColor: "#6366f120" }]}>
                <Text style={[styles.timedText, { color: "#6366f1" }]}>
                  {area.hourlyRate ? `$${Number(area.hourlyRate).toFixed(0)}/hr` : "Timed"}
                </Text>
              </View>
            )}
          </View>
        )}

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
  body: { padding: 12, gap: 6 },
  name: { fontSize: 16, fontWeight: "700" },
  areaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  areaDot: { width: 7, height: 7, borderRadius: 4 },
  areaText: { fontSize: 11, flex: 1 },
  timedBadge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  timedText: { fontSize: 10, fontWeight: "700" },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: "600" },
  capacity: { fontSize: 12, paddingHorizontal: 12, paddingBottom: 10 },
});
