import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

type InventoryItem = {
  id: number; name: string; unit: string; category: string | null;
  currentStock: string; costPerUnit: string; lowStockThreshold: string;
};

type Tab = "stock" | "supply";

const BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { credentials: "include", ...options });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error ?? "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export default function InventoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { outlet } = useAuth();
  const qc = useQueryClient();
  const outletId = outlet?.id;
  const [tab, setTab] = useState<Tab>("stock");

  // Supply form state
  const [selItemId, setSelItemId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState("");
  const [costPerUnit, setCostPerUnit] = useState("");
  const [note, setNote] = useState("");

  const itemsKey = ["inventory/items", outletId];
  const { data: items = [], isLoading } = useQuery<InventoryItem[]>({
    queryKey: itemsKey,
    queryFn: () => apiFetch(`/api/inventory/items?outletId=${outletId}`),
    enabled: !!outletId,
  });

  const supplyMut = useMutation({
    mutationFn: () =>
      apiFetch("/api/inventory/supply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId,
          inventoryItemId: selItemId,
          quantity: parseFloat(quantity),
          costPerUnit: costPerUnit ? parseFloat(costPerUnit) : undefined,
          note: note || undefined,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: itemsKey });
      setSelItemId(null); setQuantity(""); setCostPerUnit(""); setNote("");
      Alert.alert("Success", "Supply recorded and stock updated.");
    },
    onError: (e: Error) => Alert.alert("Error", e.message),
  });

  const lowStockItems = items.filter(i => {
    const t = parseFloat(i.lowStockThreshold);
    return t > 0 && parseFloat(i.currentStock) <= t;
  });
  const categories = [...new Set(items.map(i => i.category ?? "Uncategorised"))].sort();

  const fmtNum = (v: string | number, dp = 2) =>
    Number(v).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const selItem = items.find(i => i.id === selItemId);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.headerIcon, { backgroundColor: `${colors.accent}20` }]}>
          <Feather name="package" size={20} color={colors.accent} />
        </View>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Inventory</Text>
      </View>

      {/* Tab bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(["stock", "supply"] as Tab[]).map(t => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tabBtn, tab === t && { borderBottomColor: colors.accent, borderBottomWidth: 2 }]}
          >
            <Text style={[styles.tabLabel, { color: tab === t ? colors.accent : colors.mutedForeground }]}>
              {t === "stock" ? "Stock Levels" : "Record Supply"}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── STOCK TAB ── */}
      {tab === "stock" && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100, gap: 16 }}>
          {isLoading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* Summary row */}
              <View style={styles.summaryRow}>
                <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.statNum, { color: colors.foreground }]}>{items.length}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total Items</Text>
                </View>
                <View style={[styles.statCard, {
                  backgroundColor: lowStockItems.length > 0 ? "#fffbeb" : colors.card,
                  borderColor: lowStockItems.length > 0 ? "#fbbf24" : colors.border,
                }]}>
                  <Text style={[styles.statNum, { color: lowStockItems.length > 0 ? "#d97706" : colors.foreground }]}>
                    {lowStockItems.length}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Low Stock</Text>
                </View>
              </View>

              {/* Low stock banner */}
              {lowStockItems.length > 0 && (
                <View style={[styles.alertBanner, { backgroundColor: "#fffbeb", borderColor: "#fbbf24" }]}>
                  <Feather name="alert-triangle" size={14} color="#d97706" />
                  <Text style={{ color: "#92400e", fontSize: 13, flex: 1, marginLeft: 6 }}>
                    {lowStockItems.map(i => `${i.name}: ${fmtNum(i.currentStock, 4)} ${i.unit}`).join(" · ")}
                  </Text>
                </View>
              )}

              {/* Items by category */}
              {categories.map(cat => {
                const catItems = items.filter(i => (i.category ?? "Uncategorised") === cat);
                return (
                  <View key={cat}>
                    <Text style={[styles.catHeader, { color: colors.mutedForeground }]}>{cat.toUpperCase()}</Text>
                    <View style={[styles.section, { borderColor: colors.border }]}>
                      {catItems.map((item, idx) => {
                        const stock = parseFloat(item.currentStock);
                        const threshold = parseFloat(item.lowStockThreshold);
                        const isLow = threshold > 0 && stock <= threshold;
                        return (
                          <React.Fragment key={item.id}>
                            {idx > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                            <View style={[styles.itemRow, { backgroundColor: isLow ? "#fffbeb" : colors.card }]}>
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                  {isLow && <Feather name="alert-triangle" size={12} color="#d97706" />}
                                  <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                                </View>
                                <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>
                                  Min {fmtNum(threshold, 4)} {item.unit} · ${fmtNum(item.costPerUnit)}/unit
                                </Text>
                              </View>
                              <View style={{ alignItems: "flex-end" }}>
                                <Text style={[styles.stockNum, {
                                  color: isLow ? "#d97706" : stock < 0 ? "#ef4444" : colors.foreground,
                                }]}>
                                  {fmtNum(stock, 4)}
                                </Text>
                                <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>{item.unit}</Text>
                              </View>
                            </View>
                          </React.Fragment>
                        );
                      })}
                    </View>
                  </View>
                );
              })}

              {!items.length && (
                <View style={{ alignItems: "center", marginTop: 60 }}>
                  <Feather name="package" size={40} color={colors.mutedForeground} style={{ opacity: 0.4 }} />
                  <Text style={[styles.emptyTitle, { color: colors.foreground, marginTop: 12 }]}>No items yet</Text>
                  <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
                    Add inventory items from the web dashboard.
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* ── SUPPLY TAB ── */}
      {tab === "supply" && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100, gap: 14 }}>
          <Text style={[styles.supplyTitle, { color: colors.foreground }]}>Record Delivery</Text>
          <Text style={[styles.supplyDesc, { color: colors.mutedForeground }]}>
            Select an item and enter the quantity received. Stock will be updated immediately.
          </Text>

          {/* Item picker */}
          <View style={[styles.fieldBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>INVENTORY ITEM</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {items.map(i => (
                  <Pressable
                    key={i.id}
                    onPress={() => { setSelItemId(i.id); setCostPerUnit(i.costPerUnit); }}
                    style={[styles.chip, {
                      backgroundColor: selItemId === i.id ? colors.accent : colors.background,
                      borderColor: selItemId === i.id ? colors.accent : colors.border,
                    }]}
                  >
                    <Text style={{ color: selItemId === i.id ? "#fff" : colors.foreground, fontSize: 13, fontWeight: "600" }}>
                      {i.name}
                    </Text>
                    <Text style={{ color: selItemId === i.id ? "rgba(255,255,255,0.7)" : colors.mutedForeground, fontSize: 11 }}>
                      {i.unit}
                    </Text>
                  </Pressable>
                ))}
                {!items.length && (
                  <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                    No items — add them from the web dashboard first.
                  </Text>
                )}
              </View>
            </ScrollView>
            {selItem && (
              <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 8 }}>
                Current stock: {fmtNum(selItem.currentStock, 4)} {selItem.unit}
              </Text>
            )}
          </View>

          {/* Quantity */}
          <View style={[styles.fieldBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>QUANTITY RECEIVED</Text>
            <TextInput
              style={[styles.textInput, { color: colors.foreground, borderColor: colors.border }]}
              placeholder={selItem ? `in ${selItem.unit}` : "e.g. 24"}
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
              value={quantity}
              onChangeText={setQuantity}
            />
          </View>

          {/* Cost per unit */}
          <View style={[styles.fieldBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>COST PER UNIT (optional)</Text>
            <TextInput
              style={[styles.textInput, { color: colors.foreground, borderColor: colors.border }]}
              placeholder="Leave blank to keep current"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
              value={costPerUnit}
              onChangeText={setCostPerUnit}
            />
          </View>

          {/* Note */}
          <View style={[styles.fieldBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>NOTE (optional)</Text>
            <TextInput
              style={[styles.textInput, { color: colors.foreground, borderColor: colors.border }]}
              placeholder="e.g. Supplier, invoice #..."
              placeholderTextColor={colors.mutedForeground}
              value={note}
              onChangeText={setNote}
            />
          </View>

          {/* Total preview */}
          {!!quantity && !!costPerUnit && !isNaN(parseFloat(quantity)) && !isNaN(parseFloat(costPerUnit)) && (
            <View style={[styles.totalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>Total delivery cost</Text>
              <Text style={{ color: colors.foreground, fontSize: 22, fontWeight: "800", marginTop: 2 }}>
                ${fmtNum(parseFloat(quantity) * parseFloat(costPerUnit))}
              </Text>
            </View>
          )}

          <Pressable
            onPress={() => {
              if (!selItemId) { Alert.alert("Select an item first"); return; }
              if (!quantity || isNaN(parseFloat(quantity)) || parseFloat(quantity) <= 0) {
                Alert.alert("Enter a valid quantity"); return;
              }
              supplyMut.mutate();
            }}
            disabled={supplyMut.isPending}
            style={({ pressed }) => [styles.submitBtn, { backgroundColor: colors.accent, opacity: (supplyMut.isPending || pressed) ? 0.7 : 1 }]}
          >
            {supplyMut.isPending
              ? <ActivityIndicator color="#fff" />
              : (
                <>
                  <Feather name="trending-up" size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>Record Supply</Text>
                </>
              )
            }
          </Pressable>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabLabel: { fontSize: 14, fontWeight: "600" },
  summaryRow: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 14, alignItems: "center" },
  statNum: { fontSize: 24, fontWeight: "800" },
  statLabel: { fontSize: 12, marginTop: 2 },
  alertBanner: { flexDirection: "row", alignItems: "flex-start", borderWidth: 1, borderRadius: 10, padding: 12 },
  catHeader: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 6, marginLeft: 2 },
  section: { borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  divider: { height: 1, marginLeft: 16 },
  itemRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 13, gap: 8 },
  itemName: { fontSize: 14, fontWeight: "600" },
  itemMeta: { fontSize: 12, marginTop: 2 },
  stockNum: { fontSize: 17, fontWeight: "700" },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptyDesc: { fontSize: 13, marginTop: 4, textAlign: "center" },
  supplyTitle: { fontSize: 18, fontWeight: "700" },
  supplyDesc: { fontSize: 13, lineHeight: 19 },
  fieldBox: { borderWidth: 1, borderRadius: 12, padding: 14 },
  fieldLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  textInput: { marginTop: 8, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 15 },
  chip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, alignItems: "center", minWidth: 80 },
  totalBox: { borderWidth: 1, borderRadius: 12, padding: 16, alignItems: "center" },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 16 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
