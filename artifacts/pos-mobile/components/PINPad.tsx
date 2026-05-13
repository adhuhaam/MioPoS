import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface PINPadProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}

const KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "del"],
];

export function PINPad({ value, onChange, maxLength = 6 }: PINPadProps) {
  const colors = useColors();

  const handleKey = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (key === "del") {
      onChange(value.slice(0, -1));
    } else if (key === "" ) {
      return;
    } else if (value.length < maxLength) {
      onChange(value + key);
    }
  };

  const dots = Array.from({ length: maxLength }, (_, i) => i < value.length);

  return (
    <View style={styles.container}>
      <View style={styles.dotsRow}>
        {dots.map((filled, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { borderColor: colors.border, backgroundColor: filled ? colors.primary : "transparent" },
            ]}
          />
        ))}
      </View>

      <View style={styles.grid}>
        {KEYS.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((key, ki) => (
              <Pressable
                key={ki}
                style={({ pressed }) => [
                  styles.key,
                  {
                    backgroundColor: key === "" ? "transparent" : pressed ? colors.secondary : colors.card,
                    borderColor: key === "" ? "transparent" : colors.border,
                  },
                ]}
                onPress={() => handleKey(key)}
                disabled={key === ""}
              >
                {key === "del" ? (
                  <Feather name="delete" size={22} color={colors.foreground} />
                ) : (
                  <Text style={[styles.keyText, { color: colors.foreground }]}>{key}</Text>
                )}
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: 24 },
  dotsRow: { flexDirection: "row", gap: 16, height: 20, alignItems: "center" },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  grid: { gap: 12, width: "100%" },
  row: { flexDirection: "row", gap: 12, justifyContent: "center" },
  key: {
    width: 84,
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  keyText: { fontSize: 24, fontWeight: "600" },
});
