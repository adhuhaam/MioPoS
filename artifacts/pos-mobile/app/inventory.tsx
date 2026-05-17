import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useListOutlets } from "@workspace/api-client-react";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
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

import { apiFetch } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

type InventoryItem = {
  id: number;
  name: string;
  unit: string;
  category: string | null;
  currentStock: string;
  costPerUnit: string;
  lowStockThreshold: string;
};

type Tab = "stock" | "supply";

const UNITS = ["piece", "kg", "g", "litre", "ml", "carton", "box", "bottle", "bag", "pack", "dozen"];

const fmtNum = (v: string | number, dp = 2) =>
  Number(v).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });

export default function InventoryScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { outlet, staff } = useAuth();
  const qc = useQueryClient();
  const isSuperAdmin = staff?.role === "super_admin";

  const [selectedOutletId, setSelectedOutletId] = useState<number | null>(outlet?.id && outlet.id > 0 ? outlet.id : null);
  const [outletPickerOpen, setOutletPickerOpen] = useState(false);
  const outletId = selectedOutletId ?? (outlet?.id && outlet.id > 0 ? outlet.id : null);

  const { data: outlets } = useListOutlets();
  const [tab, setTab] = useState<Tab>("stock");

  const [selItemId, setSelItemId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState("");
  const [costPerUnit, setCostPerUnit] = useState("");
  const [note, setNote] = useState("");

  const [itemModal, setItemModal] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [itemForm, setItemForm] = useState({ name: "", unit: "g", category: "", costPerUnit: "0", lowStockThreshold: "0" });

  const itemsKey = ["inventory/items", outletId];
  const { data: items = [], isLoading, refetch } = useQuery<InventoryItem[]>({
    queryKey: itemsKey,
    queryFn: () => apiFetch(`/api/inventory/items?outletId=${outletId}`),
    enabled: !!outletId,
  });

  const saveItemMut = useMutation({
    mutationFn: () => {
      const body = {
        name: itemForm.name.trim(),
        unit: itemForm.unit,
        category: itemForm.category.trim() || null,
        costPerUnit: parseFloat(itemForm.costPerUnit) || 0,
        lowStockThreshold: parseFloat(itemForm.lowStockThreshold) || 0,
      };
      if (editItem) {
        return apiFetch(`/api/inventory/items/${editItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      return apiFetch("/api/inventory/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outletId, ...body }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: itemsKey });
      setItemModal(false);
      Alert.alert("Saved", editItem ? "Item updated." : "Item created.");
    },
    onError: (e: Error) => Alert.alert("Error", e.message),
  });

  const deleteItemMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/inventory/items/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: itemsKey }); Alert.alert("Deleted", "Item removed."); },
    onError: (e: Error) => Alert.alert("Error", e.message),
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
      setSelItemId(null);
      setQuantity("");
      setCostPerUnit("");
      setNote("");
      Alert.alert("Success", "Supply recorded and stock updated.");
    },
    onError: (e: Error) => Alert.alert("Error", e.message),
  });

  const openNewItem = () => {
    setEditItem(null);
    setItemForm({ name: "", unit: "g", category: "", costPerUnit: "0", lowStockThreshold: "0" });
    setItemModal(true);
  };
  const openEditItem = (i: InventoryItem) => {
    setEditItem(i);
    setItemForm({
      name: i.name,
      unit: i.unit,
      category: i.category ?? "",
      costPerUnit: String(i.costPerUnit),
      lowStockThreshold: String(i.lowStockThreshold),
    });
    setItemModal(true);
  };

  const lowStockItems = items.filter(i => {
    const t = parseFloat(i.lowStockThreshold);
    return t > 0 && parseFloat(i.currentStock) <= t;
  });

  const currentOutletName = outlets?.find(o => o.id === outletId)?.name ?? outlet?.name;
  const topPad = Platform.OS === "web" ? 20 : insets.top;
  const selItem = items.find(i => i.id === selItemId);

  if (!outletId) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: topPad + 16 }]}>
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Inventory</Text>
        </View>
        <View style={styles.center}>
          <Text style={{ color: colors.mutedForeground, textAlign: "center", paddingHorizontal: 24 }}>
            {isSuperAdmin ? "Select an outlet to manage inventory." : "No outlet selected."}
          </Text>
          {isSuperAdmin && (
            <Pressable onPress={() => setOutletPickerOpen(true)} style={[styles.primaryBtn, { backgroundColor: colors.accent, marginTop: 16 }]}>
              <Text style={styles.primaryBtnText}>Select Outlet</Text>
            </Pressable>
          )}
        </View>
        <OutletPickerModal
          visible={outletPickerOpen}
          onClose={() => setOutletPickerOpen(false)}
          outlets={outlets ?? []}
          selectedId={outletId}
          onSelect={id => { setSelectedOutletId(id); setOutletPickerOpen(false); }}
          colors={colors}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={[styles.screen, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Inventory</Text>
          {isSuperAdmin && (
            <Pressable onPress={() => setOutletPickerOpen(true)} style={styles.outletPickRow}>
              <Text style={[styles.outletPickLabel, { color: colors.accent }]}>{currentOutletName ?? "Outlet"}</Text>
              <Feather name="chevron-down" size={13} color={colors.accent} />
            </Pressable>
          )}
        </View>
        {tab === "stock" && (
          <Pressable onPress={openNewItem} style={[styles.addBtn, { backgroundColor: colors.accent }]}>
            <Feather name="plus" size={18} color="#fff" />
          </Pressable>
        )}
      </View>

      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(["stock", "supply"] as Tab[]).map(t => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tabBtn, tab === t && { borderBottomColor: colors.accent, borderBottomWidth: 2 }]}>
            <Text style={[styles.tabLabel, { color: tab === t ? colors.accent : colors.mutedForeground }]}>
              {t === "stock" ? "Stock" : "Supply"}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === "stock" && (
        <FlatList
          data={items}
          keyExtractor={i => String(i.id)}
          refreshing={isLoading}
          onRefresh={() => refetch()}
          contentContainerStyle={{ padding: 14, gap: 8, paddingBottom: insets.bottom + 24 }}
          ListHeaderComponent={
            <>
              <View style={styles.summaryRow}>
                <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.statNum, { color: colors.foreground }]}>{items.length}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Items</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: lowStockItems.length ? "#fffbeb" : colors.card, borderColor: lowStockItems.length ? "#fbbf24" : colors.border }]}>
                  <Text style={[styles.statNum, { color: lowStockItems.length ? "#d97706" : colors.foreground }]}>{lowStockItems.length}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Low stock</Text>
                </View>
              </View>
              {lowStockItems.length > 0 && (
                <View style={[styles.alertBanner, { backgroundColor: "#fffbeb", borderColor: "#fbbf24", marginBottom: 8 }]}>
                  <Feather name="alert-triangle" size={14} color="#d97706" />
                  <Text style={{ color: "#92400e", fontSize: 12, flex: 1, marginLeft: 6 }}>
                    {lowStockItems.map(i => i.name).join(", ")}
                  </Text>
                </View>
              )}
            </>
          }
          ListEmptyComponent={
            isLoading ? (
              <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
            ) : (
              <View style={styles.center}>
                <Feather name="package" size={36} color={colors.mutedForeground} style={{ opacity: 0.4 }} />
                <Text style={[{ color: colors.mutedForeground, marginTop: 8 }]}>No ingredients yet — tap + to add</Text>
              </View>
            )
          }
          renderItem={({ item }) => {
            const stock = parseFloat(item.currentStock);
            const threshold = parseFloat(item.lowStockThreshold);
            const isLow = threshold > 0 && stock <= threshold;
            return (
              <View style={[styles.listRow, { backgroundColor: isLow ? "#fffbeb" : colors.card, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>
                    {item.category ? `${item.category} · ` : ""}{item.unit}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", marginRight: 8 }}>
                  <Text style={[styles.stockNum, { color: isLow ? "#d97706" : colors.foreground }]}>{fmtNum(stock, 4)}</Text>
                  <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>{item.unit}</Text>
                </View>
                <Pressable onPress={() => openEditItem(item)} style={[styles.iconBtn, { backgroundColor: `${colors.accent}18` }]}>
                  <Feather name="edit-2" size={14} color={colors.accent} />
                </Pressable>
                <Pressable
                  onPress={() => Alert.alert(`Delete "${item.name}"?`, undefined, [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: () => deleteItemMut.mutate(item.id) },
                  ])}
                  style={[styles.iconBtn, { backgroundColor: `${colors.destructive}18` }]}
                >
                  <Feather name="trash-2" size={14} color={colors.destructive} />
                </Pressable>
              </View>
            );
          }}
        />
      )}

      {tab === "supply" && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 14 }}>
          <Text style={[styles.supplyDesc, { color: colors.mutedForeground }]}>
            Record incoming stock for an ingredient.
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {items.map(i => (
                <Pressable
                  key={i.id}
                  onPress={() => { setSelItemId(i.id); setCostPerUnit(i.costPerUnit); }}
                  style={[styles.chip, { backgroundColor: selItemId === i.id ? colors.accent : colors.card, borderColor: selItemId === i.id ? colors.accent : colors.border }]}
                >
                  <Text style={{ color: selItemId === i.id ? "#fff" : colors.foreground, fontWeight: "600", fontSize: 13 }}>{i.name}</Text>
                  <Text style={{ color: selItemId === i.id ? "rgba(255,255,255,0.75)" : colors.mutedForeground, fontSize: 11 }}>{i.unit}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          {selItem && (
            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Current: {fmtNum(selItem.currentStock, 4)} {selItem.unit}</Text>
          )}
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
            placeholder="Quantity received"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="decimal-pad"
            value={quantity}
            onChangeText={setQuantity}
          />
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
            placeholder="Cost per unit (optional)"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="decimal-pad"
            value={costPerUnit}
            onChangeText={setCostPerUnit}
          />
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
            placeholder="Note (optional)"
            placeholderTextColor={colors.mutedForeground}
            value={note}
            onChangeText={setNote}
          />
          <Pressable
            onPress={() => {
              if (!selItemId) { Alert.alert("Select an item"); return; }
              if (!quantity || parseFloat(quantity) <= 0) { Alert.alert("Enter a valid quantity"); return; }
              supplyMut.mutate();
            }}
            disabled={supplyMut.isPending}
            style={[styles.primaryBtn, { backgroundColor: colors.accent, opacity: supplyMut.isPending ? 0.7 : 1 }]}
          >
            {supplyMut.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Record Supply</Text>}
          </Pressable>
        </ScrollView>
      )}

      <OutletPickerModal
        visible={outletPickerOpen}
        onClose={() => setOutletPickerOpen(false)}
        outlets={outlets ?? []}
        selectedId={outletId}
        onSelect={id => { setSelectedOutletId(id); setOutletPickerOpen(false); }}
        colors={colors}
      />

      <Modal visible={itemModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>{editItem ? "Edit Ingredient" : "New Ingredient"}</Text>
              <Pressable onPress={() => setItemModal(false)}><Feather name="x" size={22} color={colors.foreground} /></Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Name</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                value={itemForm.name}
                onChangeText={v => setItemForm(f => ({ ...f, name: v }))}
                placeholder="e.g. Rice"
                placeholderTextColor={colors.mutedForeground}
              />
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Unit</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                  {UNITS.map(u => (
                    <Pressable
                      key={u}
                      onPress={() => setItemForm(f => ({ ...f, unit: u }))}
                      style={[styles.chip, { borderColor: itemForm.unit === u ? colors.accent : colors.border, backgroundColor: itemForm.unit === u ? `${colors.accent}18` : colors.card }]}
                    >
                      <Text style={{ color: itemForm.unit === u ? colors.accent : colors.foreground, fontWeight: "600" }}>{u}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Category (optional)</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                value={itemForm.category}
                onChangeText={v => setItemForm(f => ({ ...f, category: v }))}
                placeholder="e.g. Dry goods"
                placeholderTextColor={colors.mutedForeground}
              />
              <Pressable
                onPress={() => {
                  if (!itemForm.name.trim()) { Alert.alert("Name required"); return; }
                  saveItemMut.mutate();
                }}
                disabled={saveItemMut.isPending}
                style={[styles.primaryBtn, { backgroundColor: colors.accent, marginTop: 8 }]}
              >
                <Text style={styles.primaryBtnText}>{saveItemMut.isPending ? "Saving…" : "Save"}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function OutletPickerModal({
  visible,
  onClose,
  outlets,
  selectedId,
  onSelect,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  outlets: { id: number; name: string }[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modal, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Outlet</Text>
          <Pressable onPress={onClose}><Feather name="x" size={22} color={colors.foreground} /></Pressable>
        </View>
        {outlets.map(o => (
          <Pressable
            key={o.id}
            onPress={() => onSelect(o.id)}
            style={[styles.listRow, { margin: 8, borderColor: colors.border, backgroundColor: o.id === selectedId ? `${colors.accent}14` : colors.card }]}
          >
            <Text style={[styles.itemName, { color: o.id === selectedId ? colors.accent : colors.foreground, flex: 1 }]}>{o.name}</Text>
            {o.id === selectedId && <Feather name="check" size={16} color={colors.accent} />}
          </Pressable>
        ))}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  outletPickRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  outletPickLabel: { fontSize: 12, fontWeight: "600" },
  backBtn: { width: 40, height: 40, alignItems: "flex-start", justifyContent: "center" },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 11 },
  tabLabel: { fontSize: 13, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  statCard: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 12, alignItems: "center" },
  statNum: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 11, marginTop: 2 },
  alertBanner: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 10, padding: 10 },
  listRow: { borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  itemName: { fontSize: 15, fontWeight: "600" },
  itemMeta: { fontSize: 12, marginTop: 2 },
  stockNum: { fontSize: 16, fontWeight: "700" },
  iconBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  chip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignItems: "center" },
  supplyDesc: { fontSize: 13 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  primaryBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  fieldLabel: { fontSize: 12, fontWeight: "600" },
});
