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
  useListStaff,
  useCreateStaff,
  useUpdateStaff,
  useDeleteStaff,
  useListOutlets,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

const ROLES = ["cashier", "manager", "kitchen", "super_admin"] as const;
type Role = typeof ROLES[number];

const ROLE_COLORS: Record<string, string> = {
  super_admin: "#ef4444",
  manager: "#f59e0b",
  cashier: "#22c55e",
  kitchen: "#8b5cf6",
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  manager: "Manager",
  cashier: "Cashier",
  kitchen: "Kitchen",
};

type StaffForm = { name: string; pin: string; role: Role; outletId: string; phone: string };
const EMPTY_FORM: StaffForm = { name: "", pin: "", role: "cashier", outletId: "", phone: "" };

export default function StaffScreen() {
  const colors = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const { staff: me, outlet } = useAuth();
  const isSuperAdmin = me?.role === "super_admin";

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<StaffForm>(EMPTY_FORM);
  const [refreshing, setRefreshing] = useState(false);

  const { data: staffList, refetch, isLoading } = useListStaff(
    isSuperAdmin ? {} : { outletId: outlet?.id }
  );
  const { data: outlets } = useListOutlets();
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const deleteStaff = useDeleteStaff();

  const setF = (k: keyof StaffForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const openCreate = () => {
    setEditId(null);
    setForm({ ...EMPTY_FORM, outletId: isSuperAdmin ? "" : String(outlet?.id ?? "") });
    setModalOpen(true);
  };

  const openEdit = (s: any) => {
    setEditId(s.id);
    setForm({ name: s.name, pin: "", role: s.role as Role, outletId: String(s.outletId ?? ""), phone: s.phone ?? "" });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { Alert.alert("Required", "Name is required."); return; }
    if (!editId && form.pin.length !== 4) { Alert.alert("Required", "PIN must be 4 digits."); return; }
    const outletId = parseInt(form.outletId) || (outlet?.id ?? 0);
    if (!outletId) { Alert.alert("Required", "Please select an outlet."); return; }
    const payload: any = { name: form.name.trim(), role: form.role, outletId, phone: form.phone.trim() };
    if (form.pin) payload.pin = form.pin;

    if (editId) {
      updateStaff.mutate({ id: editId, data: payload }, {
        onSuccess: () => { setModalOpen(false); qc.invalidateQueries(); },
        onError: () => Alert.alert("Error", "Failed to update staff."),
      });
    } else {
      createStaff.mutate({ data: payload }, {
        onSuccess: () => { setModalOpen(false); qc.invalidateQueries(); },
        onError: () => Alert.alert("Error", "Failed to create staff member."),
      });
    }
  };

  const handleDelete = (id: number, name: string) => {
    Alert.alert(`Remove "${name}"?`, "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () =>
        deleteStaff.mutate({ id }, {
          onSuccess: () => qc.invalidateQueries(),
          onError: () => Alert.alert("Error", "Failed to delete staff."),
        })
      },
    ]);
  };

  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 20 : insets.top + 8, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Staff</Text>
        <Pressable onPress={openCreate} style={[styles.addBtn, { backgroundColor: colors.accent }]}>
          <Feather name="plus" size={18} color="#fff" />
        </Pressable>
      </View>

      <FlatList
        data={staffList ?? []}
        keyExtractor={(s) => String(s.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: insets.bottom + 20 }}
        ListEmptyComponent={!isLoading ? (
          <View style={styles.center}>
            <Feather name="users" size={36} color={colors.mutedForeground} />
            <Text style={[{ color: colors.mutedForeground, fontSize: 15 }]}>No staff members</Text>
          </View>
        ) : null}
        renderItem={({ item: s }) => {
          const roleColor = ROLE_COLORS[s.role] ?? colors.accent;
          const outletName = outlets?.find((o) => o.id === s.outletId)?.name;
          return (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.roleStrip, { backgroundColor: roleColor }]} />
              <View style={styles.cardBody}>
                <View style={[styles.avatar, { backgroundColor: `${roleColor}22` }]}>
                  <Text style={[styles.avatarText, { color: roleColor }]}>{s.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.staffName, { color: colors.foreground }]}>{s.name}</Text>
                  <Text style={[styles.staffMeta, { color: colors.mutedForeground }]}>
                    {ROLE_LABELS[s.role] ?? s.role}
                    {outletName ? ` · ${outletName}` : ""}
                  </Text>
                </View>
                <View style={styles.actions}>
                  <Pressable onPress={() => openEdit(s)} style={[styles.iconBtn, { backgroundColor: `${colors.accent}18` }]}>
                    <Feather name="edit-2" size={14} color={colors.accent} />
                  </Pressable>
                  {s.id !== me?.id && (
                    <Pressable onPress={() => handleDelete(s.id, s.name)} style={[styles.iconBtn, { backgroundColor: `${colors.destructive}18` }]}>
                      <Feather name="trash-2" size={14} color={colors.destructive} />
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          );
        }}
      />

      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>{editId ? "Edit Staff" : "New Staff Member"}</Text>
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
                  {/* Name */}
                  <View style={styles.field}>
                    <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Name</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                      value={form.name} onChangeText={setF("name")} placeholder="Full name" placeholderTextColor={colors.mutedForeground} />
                  </View>
                  {/* PIN */}
                  <View style={styles.field}>
                    <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{editId ? "New PIN (leave blank to keep)" : "4-Digit PIN"}</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                      value={form.pin} onChangeText={setF("pin")} placeholder="••••" placeholderTextColor={colors.mutedForeground}
                      keyboardType="number-pad" maxLength={4} secureTextEntry />
                  </View>
                  {/* Role */}
                  <View style={styles.field}>
                    <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Role</Text>
                    <View style={styles.roleGrid}>
                      {ROLES.map((r) => (
                        <Pressable key={r} onPress={() => setForm((f) => ({ ...f, role: r }))}
                          style={[styles.roleChip, { borderColor: form.role === r ? (ROLE_COLORS[r] ?? colors.accent) : colors.border },
                            form.role === r && { backgroundColor: `${ROLE_COLORS[r] ?? colors.accent}18` }]}>
                          <Text style={[styles.roleChipText, { color: form.role === r ? (ROLE_COLORS[r] ?? colors.accent) : colors.mutedForeground }]}>
                            {ROLE_LABELS[r]}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                  {/* Outlet (super admin only) */}
                  {isSuperAdmin && (
                    <View style={styles.field}>
                      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Outlet</Text>
                      <View style={styles.roleGrid}>
                        {(outlets ?? []).map((o) => (
                          <Pressable key={o.id} onPress={() => setForm((f) => ({ ...f, outletId: String(o.id) }))}
                            style={[styles.roleChip, { borderColor: form.outletId === String(o.id) ? colors.accent : colors.border },
                              form.outletId === String(o.id) && { backgroundColor: `${colors.accent}18` }]}>
                            <Text style={[styles.roleChipText, { color: form.outletId === String(o.id) ? colors.accent : colors.mutedForeground }]}>
                              {o.name}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  )}
                  {/* Phone */}
                  <View style={styles.field}>
                    <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Phone (optional)</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                      value={form.phone} onChangeText={setF("phone")} placeholder="+1 234 567 8900"
                      placeholderTextColor={colors.mutedForeground} keyboardType="phone-pad" />
                  </View>
                  <Pressable onPress={handleSave} style={[styles.saveBtn, { backgroundColor: colors.accent }]}>
                    <Text style={styles.saveBtnText}>Save</Text>
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
  card: { borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  roleStrip: { height: 4 },
  cardBody: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontWeight: "800" },
  staffName: { fontSize: 15, fontWeight: "700" },
  staffMeta: { fontSize: 12, marginTop: 2 },
  actions: { flexDirection: "row", gap: 8 },
  iconBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  formContent: { padding: 16, gap: 14 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: "600" },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  roleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  roleChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1.5 },
  roleChipText: { fontSize: 13, fontWeight: "600" },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
