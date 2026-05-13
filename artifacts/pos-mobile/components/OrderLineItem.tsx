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
  disabled?: boolean;
}

export function OrderLineItem({ item, onIncrease, onDecrease, onRemove, disabled }: OrderLineItemProps) {
  const colors = useColors();

  const lineTotal = (Number(item.unitPrice) * item.quantity).toFixed(2);

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
          {item.itemName}
        </Text>
        {item.notes ? (
          <Text style={[styles.notes, { color: colors.mutedForeground }]} numberOfLines={1}>
            {item.notes}
          </Text>
        ) : null}
        <Text style={[styles.price, { color: colors.mutedForeground }]}>
          {Number(item.unitPrice).toFixed(2)} ea
        </Text>
      </View>

      <View style={styles.controls}>
        <Pressable
          style={[styles.qtyBtn, { borderColor: colors.border, backgroundColor: colors.secondary }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onDecrease(); }}
          disabled={disabled}
        >
          <Feather name="minus" size={14} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.qty, { color: colors.foreground }]}>{item.quantity}</Text>
        <Pressable
          style={[styles.qtyBtn, { borderColor: colors.border, backgroundColor: colors.secondary }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onIncrease(); }}
          disabled={disabled}
        >
          <Feather name="plus" size={14} color={colors.foreground} />
        </Pressable>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onRemove(); }}
          disabled={disabled}
          style={styles.removeBtn}
        >
          <Feather name="trash-2" size={14} color={colors.destructive} />
        </Pressable>
      </View>

      <Text style={[styles.lineTotal, { color: colors.foreground }]}>{lineTotal}</Text>
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
  name: { fontSize: 14, fontWeight: "600" },
  notes: { fontSize: 11 },
  price: { fontSize: 12 },
  controls: { flexDirection: "row", alignItems: "center", gap: 6 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  qty: { fontSize: 15, fontWeight: "700", minWidth: 24, textAlign: "center" },
  removeBtn: { marginLeft: 4, padding: 4 },
  lineTotal: { fontSize: 14, fontWeight: "700", minWidth: 52, textAlign: "right" },
});
