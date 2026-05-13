import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  useListOutlets,
  useGetOutlet,
  useCreateOutlet,
  useUpdateOutlet,
  useDeleteOutlet,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useQueryClient } from "@tanstack/react-query";

type OutletForm = {
  name: string;
  address: string;
  phone: string;
  taxRate: string;
  currency: string;
};

const EMPTY_FORM: OutletForm = { name: "", address: "", phone: "", taxRate: "0", currency: "USD" };

function ScreenHeader({ title, onBack, rightAction }: { title: string; onBack: () => void; rightAction?: React.ReactNode }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 20 : insets.top + 8, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
      <Pressable onPress={onBack} style={styles.backBtn}>
        <Feather name="arrow-left" size={22} color={colors.foreground} />
      </Pressable>
      <Text style={[styles.headerTitle, { color: colors.foreground }]}>{title}</Text>
      {rightAction ?? <View style={{ width: 40 }} />}
    </View>
  );
}

function FormField({ label, value, onChange, placeholder, keyboardType, colors }: any) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? label}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboardType ?? "default"}
      />
    </View>
  );
}

export default function OutletsScreen() {
  const colors = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<OutletForm>(EMPTY_FORM);
  const [refreshing, setRefreshing] = useState(false);

  const { data: outlets, refetch, isLoading } = useListOutlets();
  const createOutlet = useCreateOutlet();
  const updateOutlet = useUpdateOutlet();
  const deleteOutlet = useDeleteOutlet();

  const openCreate = () => { setEditId(null); setForm(EMPTY_FORM); setModalOpen(true); };

  const openEdit = async (id: number) => {
    try {
      const res = await fetch(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/outlets/${id}`, { credentials: "include" });
      const data = await res.json();
      setForm({
        name: data.name ?? "",
        address: data.address ?? "",
        phone: data.phone ?? "",
        taxRate: String(data.taxRate ?? "0"),
        currency: data.currency ?? "USD",
      });
      setEditId(id);
      setModalOpen(true);
    } catch {
      Alert.alert("Error", "Could not load outlet details.");
    }
  };

  const handleSave = () => {
    if (!form.name.trim()) { Alert.alert("Required", "Outlet name is required."); return; }
    const payload = {
      name: form.name.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      taxRate: parseFloat(form.taxRate) || 0,
      currency: form.currency.trim() || "USD",
    };
    if (editId) {
      updateOutlet.mutate({ id: editId, data: payload }, {
        onSuccess: () => { setModalOpen(false); qc.invalidateQueries(); },
        onError: () => Alert.alert("Error", "Failed to update outlet."),
      });
    } else {
      createOutlet.mutate({ data: payload }, {
        onSuccess: () => { setModalOpen(false); qc.invalidateQueries(); },
        onError: () => Alert.alert("Error", "Failed to create outlet."),
      });
    }
  };

  const handleDelete = (id: number, name: string) => {
    Alert.alert(`Delete "${name}"?`, "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: () =>
          deleteOutlet.mutate({ id }, {
            onSuccess: () => qc.invalidateQueries(),
            onError: () => Alert.alert("Error", "Failed to delete outlet."),
          }),
      },
    ]);
  };

  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };
  const setF = (k: keyof OutletForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Outlets"
        onBack={() => router.back()}
        rightAction={
          <Pressable onPress={openCreate} style={[styles.addBtn, { backgroundColor: colors.accent }]}>
            <Feather name="plus" size={18} color="#fff" />
          </Pressable>
        }
      />

      <FlatList
        data={outlets ?? []}
        keyExtractor={(o) => String(o.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: insets.bottom + 20 }}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.center}>
              <Feather name="home" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No outlets yet</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardBody}>
              <Feather name="home" size={18} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.name}</Text>
                <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>ID #{item.id}</Text>
              </View>
            </View>
            <View style={styles.cardActions}>
              <Pressable onPress={() => openEdit(item.id)} style={[styles.iconBtn, { backgroundColor: `${colors.accent}18` }]}>
                <Feather name="edit-2" size={15} color={colors.accent} />
              </Pressable>
              <Pressable onPress={() => handleDelete(item.id, item.name)} style={[styles.iconBtn, { backgroundColor: `${colors.destructive}18` }]}>
                <Feather name="trash-2" size={15} color={colors.destructive} />
              </Pressable>
            </View>
          </View>
        )}
      />

      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>{editId ? "Edit Outlet" : "New Outlet"}</Text>
              <Pressable onPress={() => setModalOpen(false)}>
                <Feather name="x" size={22} color={colors.foreground} />
              </Pressable>
            </View>
            <FlatList
              data={[1]}
              keyExtractor={() => "form"}
              keyboardShouldPersistTaps="handled"
              renderItem={() => (
                <View style={styles.formContent}>
                  <FormField label="Name" value={form.name} onChange={setF("name")} colors={colors} />
                  <FormField label="Address" value={form.address} onChange={setF("address")} colors={colors} />
                  <FormField label="Phone" value={form.phone} onChange={setF("phone")} keyboardType="phone-pad" colors={colors} />
                  <FormField label="Tax Rate (%)" value={form.taxRate} onChange={setF("taxRate")} keyboardType="decimal-pad" colors={colors} />
                  <FormField label="Currency" value={form.currency} onChange={setF("currency")} placeholder="USD" colors={colors} />
                  <Pressable onPress={handleSave} style={[styles.saveBtn, { backgroundColor: colors.accent }]}>
                    <Text style={styles.saveBtnText}>Save Outlet</Text>
                  </Pressable>
                </View>
              )}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  backBtn: { width: 40, height: 40, alignItems: "flex-start", justifyContent: "center" },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  center: { alignItems: "center", justifyContent: "center", gap: 10, paddingTop: 60 },
  emptyText: { fontSize: 15 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  cardBody: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardSub: { fontSize: 13, marginTop: 2 },
  cardActions: { flexDirection: "row", gap: 8 },
  iconBtn: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  formContent: { padding: 16, gap: 14 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: "600" },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
