import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { OrderItem } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

interface OrderLineItemProps {
  item: OrderItem;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
  onNotePress?: () => void;
  disabled?: boolean;
}

const KITCHEN_STATUS_COLOR: Record<string, string> = {
  pending: "#f59e0b",
  preparing: "#0080ff",
  ready: "#22c55e",
  served: "#9ca3af",
};

export function OrderLineItem({ item, onIncrease, onDecrease, onRemove, onNotePress, disabled }: OrderLineItemProps) {
  const colors = useColors();
  const lineTotal = (Number(item.unitPrice) * item.quantity).toFixed(2);
  const ksDot = KITCHEN_STATUS_COLOR[item.kitchenStatus] ?? colors.mutedForeground;

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <View style={[styles.ksDot, { backgroundColor: ksDot }]} />
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {item.menuItemName}
          </Text>
          {!disabled && onNotePress && (
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onNotePress(); }}
              hitSlop={8}
              style={styles.noteBtn}
            >
              <Feather
                name="edit-2"
                size={11}
                color={item.notes ? colors.accent : colors.mutedForeground}
              />
            </Pressable>
          )}
        </View>
        {item.notes ? (
          <Text style={[styles.notes, { color: colors.accent }]} numberOfLines={2}>
            ✎ {item.notes}
          </Text>
        ) : null}
        {item.modifiers && item.modifiers.length > 0 && (
          <Text style={[styles.modifiers, { color: colors.mutedForeground }]} numberOfLines={1}>
            {item.modifiers.map(m => m.name).join(", ")}
          </Text>
        )}
        <Text style={[styles.unitPrice, { color: colors.mutedForeground }]}>
          ${Number(item.unitPrice).toFixed(2)} ea
        </Text>
      </View>

      <View style={styles.controls}>
        <Pressable
          style={[styles.qtyBtn, { borderColor: colors.border, backgroundColor: colors.secondary }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onDecrease(); }}
          disabled={disabled}
        >
          <Feather name="minus" size={13} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.qty, { color: colors.foreground }]}>{item.quantity}</Text>
        <Pressable
          style={[styles.qtyBtn, { borderColor: colors.border, backgroundColor: colors.secondary }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onIncrease(); }}
          disabled={disabled}
        >
          <Feather name="plus" size={13} color={colors.foreground} />
        </Pressable>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onRemove(); }}
          disabled={disabled}
          style={styles.removeBtn}
        >
          <Feather name="trash-2" size={13} color={colors.destructive} />
        </Pressable>
      </View>

      <Text style={[styles.lineTotal, { color: colors.foreground }]}>${lineTotal}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  info: { flex: 1, gap: 2 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  ksDot: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  name: { fontSize: 14, fontWeight: "600", flex: 1 },
  noteBtn: { padding: 2 },
  notes: { fontSize: 11, fontStyle: "italic" },
  modifiers: { fontSize: 11, fontStyle: "italic" },
  unitPrice: { fontSize: 12 },
  controls: { flexDirection: "row", alignItems: "center", gap: 5 },
  qtyBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  qty: { fontSize: 14, fontWeight: "700", minWidth: 22, textAlign: "center" },
  removeBtn: { marginLeft: 2, padding: 4 },
  lineTotal: { fontSize: 13, fontWeight: "700", minWidth: 50, textAlign: "right" },
});
