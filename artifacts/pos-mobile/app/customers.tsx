import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
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
  useListCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  useAdjustCustomerCredit,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

type CustomerForm = { name: string; phone: string; email: string };
const EMPTY_FORM: CustomerForm = { name: "", phone: "", email: "" };

export default function CustomersScreen() {
  const colors = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const { outlet, staff } = useAuth();

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [form, setForm] = useState<CustomerForm>(EMPTY_FORM);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditNote, setCreditNote] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const outletId = staff?.role === "super_admin" ? undefined : outlet?.id;

  const { data: customers, refetch, isLoading } = useListCustomers(
    outletId ? { outletId } : {}
  );
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();
  const adjustCredit = useAdjustCustomerCredit();

  const setF = (k: keyof CustomerForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const filtered = (customers ?? []).filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone ?? "").includes(search)
  );

  const openCreate = () => { setEditId(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (c: any) => { setEditId(c.id); setForm({ name: c.name, phone: c.phone ?? "", email: c.email ?? "" }); setModalOpen(true); };

  const openCredit = (c: any) => { setSelectedCustomer(c); setCreditAmount(""); setCreditNote(""); setCreditModalOpen(true); };

  const handleSave = () => {
    if (!form.name.trim()) { Alert.alert("Required", "Name is required."); return; }
    const payload: any = { name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(), outletId: outlet?.id };
    if (editId) {
      updateCustomer.mutate({ id: editId, data: payload }, {
        onSuccess: () => { setModalOpen(false); qc.invalidateQueries(); },
        onError: () => Alert.alert("Error", "Failed to update customer."),
      });
    } else {
      createCustomer.mutate({ data: payload }, {
        onSuccess: () => { setModalOpen(false); qc.invalidateQueries(); },
        onError: () => Alert.alert("Error", "Failed to create customer."),
      });
    }
  };

  const handleDelete = (id: number, name: string) => {
    Alert.alert(`Delete "${name}"?`, "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () =>
        deleteCustomer.mutate({ id }, {
          onSuccess: () => qc.invalidateQueries(),
          onError: () => Alert.alert("Error", "Failed to delete customer."),
        })
      },
    ]);
  };

  const handleCreditAdjust = (type: "add" | "deduct") => {
    const amount = parseFloat(creditAmount);
    if (!amount || amount <= 0) { Alert.alert("Invalid", "Enter a valid amount."); return; }
    adjustCredit.mutate(
      { id: selectedCustomer.id, data: { type, amount, note: creditNote.trim() || undefined } },
      {
        onSuccess: () => { setCreditModalOpen(false); qc.invalidateQueries(); },
        onError: () => Alert.alert("Error", "Failed to adjust credit."),
      }
    );
  };

  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  const fmt = (n?: string | number | null) =>
    n != null ? Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00";

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 20 : insets.top + 8, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Customers</Text>
        <Pressable onPress={openCreate} style={[styles.addBtn, { backgroundColor: colors.accent }]}>
          <Feather name="plus" size={18} color="#fff" />
        </Pressable>
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          value={search}
          onChangeText={setSearch}
          placeholder="Search name or phone…"
          placeholderTextColor={colors.mutedForeground}
        />
        {search ? <Pressable onPress={() => setSearch("")}><Feather name="x" size={16} color={colors.mutedForeground} /></Pressable> : null}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(c) => String(c.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: insets.bottom + 20 }}
        ListEmptyComponent={!isLoading ? (
          <View style={styles.center}>
            <Feather name="users" size={36} color={colors.mutedForeground} />
            <Text style={[{ color: colors.mutedForeground, fontSize: 15 }]}>No customers found</Text>
          </View>
        ) : null}
        renderItem={({ item: c }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardBody}>
              <View style={[styles.avatar, { backgroundColor: `${colors.accent}18` }]}>
                <Text style={[styles.avatarText, { color: colors.accent }]}>{c.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.custName, { color: colors.foreground }]}>{c.name}</Text>
                {c.phone ? <Text style={[styles.custMeta, { color: colors.mutedForeground }]}>{c.phone}</Text> : null}
              </View>
              <View style={styles.creditBox}>
                <Text style={[styles.creditLabel, { color: colors.mutedForeground }]}>Credit</Text>
                <Text style={[styles.creditValue, { color: Number(c.creditBalance) > 0 ? colors.success : colors.foreground }]}>
                  {fmt(c.creditBalance)}
                </Text>
              </View>
            </View>
            <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
              <Pressable onPress={() => openCredit(c)} style={[styles.footerBtn, { backgroundColor: `${colors.success}18` }]}>
                <Feather name="dollar-sign" size={14} color={colors.success} />
                <Text style={[styles.footerBtnText, { color: colors.success }]}>Credit</Text>
              </Pressable>
              <Pressable onPress={() => openEdit(c)} style={[styles.footerBtn, { backgroundColor: `${colors.accent}18` }]}>
                <Feather name="edit-2" size={14} color={colors.accent} />
                <Text style={[styles.footerBtnText, { color: colors.accent }]}>Edit</Text>
              </Pressable>
              <Pressable onPress={() => handleDelete(c.id, c.name)} style={[styles.footerBtn, { backgroundColor: `${colors.destructive}18` }]}>
                <Feather name="trash-2" size={14} color={colors.destructive} />
                <Text style={[styles.footerBtnText, { color: colors.destructive }]}>Delete</Text>
              </Pressable>
            </View>
          </View>
        )}
      />

      {/* Create/Edit Modal */}
      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>{editId ? "Edit Customer" : "New Customer"}</Text>
              <Pressable onPress={() => setModalOpen(false)}><Feather name="x" size={22} color={colors.foreground} /></Pressable>
            </View>
            <View style={styles.formContent}>
              {(["name", "phone", "email"] as const).map((k) => (
                <View key={k} style={styles.field}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{k.charAt(0).toUpperCase() + k.slice(1)}</Text>
                  <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                    value={form[k]} onChangeText={setF(k)} placeholder={k}
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType={k === "email" ? "email-address" : k === "phone" ? "phone-pad" : "default"} />
                </View>
              ))}
              <Pressable onPress={handleSave} style={[styles.saveBtn, { backgroundColor: colors.accent }]}>
                <Text style={styles.saveBtnText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Credit Adjustment Modal */}
      <Modal visible={creditModalOpen} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Adjust Credit</Text>
              <Pressable onPress={() => setCreditModalOpen(false)}><Feather name="x" size={22} color={colors.foreground} /></Pressable>
            </View>
            <View style={styles.formContent}>
              <Text style={[{ color: colors.mutedForeground, fontSize: 14 }]}>
                {selectedCustomer?.name} · Balance: {fmt(selectedCustomer?.creditBalance)}
              </Text>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Amount</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                  value={creditAmount} onChangeText={setCreditAmount} placeholder="0.00"
                  placeholderTextColor={colors.mutedForeground} keyboardType="decimal-pad" />
              </View>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Note (optional)</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                  value={creditNote} onChangeText={setCreditNote} placeholder="Reason…"
                  placeholderTextColor={colors.mutedForeground} />
              </View>
              <View style={styles.creditBtns}>
                <Pressable onPress={() => handleCreditAdjust("add")} style={[styles.creditBtn, { backgroundColor: colors.success }]}>
                  <Feather name="plus" size={16} color="#fff" />
                  <Text style={styles.saveBtnText}>Add Credit</Text>
                </Pressable>
                <Pressable onPress={() => handleCreditAdjust("deduct")} style={[styles.creditBtn, { backgroundColor: colors.destructive }]}>
                  <Feather name="minus" size={16} color="#fff" />
                  <Text style={styles.saveBtnText}>Deduct</Text>
                </Pressable>
              </View>
            </View>
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
  searchBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
  searchInput: { flex: 1, fontSize: 15 },
  center: { alignItems: "center", justifyContent: "center", gap: 10, paddingTop: 60 },
  card: { borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  cardBody: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontWeight: "800" },
  custName: { fontSize: 15, fontWeight: "700" },
  custMeta: { fontSize: 12, marginTop: 2 },
  creditBox: { alignItems: "flex-end" },
  creditLabel: { fontSize: 11, fontWeight: "600" },
  creditValue: { fontSize: 15, fontWeight: "800" },
  cardFooter: { flexDirection: "row", borderTopWidth: 1, gap: 1 },
  footerBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 9 },
  footerBtnText: { fontSize: 12, fontWeight: "700" },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  formContent: { padding: 16, gap: 14 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: "600" },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  creditBtns: { flexDirection: "row", gap: 10, marginTop: 8 },
  creditBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, paddingVertical: 14 },
});
