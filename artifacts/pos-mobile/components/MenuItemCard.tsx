import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { MenuItem } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

interface MenuItemCardProps {
  item: MenuItem;
  onPress: () => void;
  disabled?: boolean;
}

export function MenuItemCard({ item, onPress, disabled }: MenuItemCardProps) {
  const colors = useColors();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed || disabled ? 0.7 : 1,
        },
      ]}
      onPress={onPress}
      disabled={disabled || !item.available}
    >
      {!item.available && (
        <View style={[styles.unavailableOverlay, { backgroundColor: `${colors.muted}cc` }]}>
          <Text style={[styles.unavailableText, { color: colors.mutedForeground }]}>Unavailable</Text>
        </View>
      )}
      <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={2}>
        {item.name}
      </Text>
      <Text style={[styles.price, { color: colors.accent }]}>
        {Number(item.price).toFixed(2)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 6,
    overflow: "hidden",
    flex: 1,
    minWidth: 110,
    maxWidth: 160,
  },
  unavailableOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  unavailableText: { fontSize: 11, fontWeight: "600" },
  name: { fontSize: 13, fontWeight: "600", lineHeight: 18 },
  price: { fontSize: 15, fontWeight: "700" },
});
