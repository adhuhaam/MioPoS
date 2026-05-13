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
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  useListAreas,
  useCreateArea,
  useUpdateArea,
  useDeleteArea,
  useListTables,
  useCreateTable,
  useUpdateTable,
  useDeleteTable,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

const AREA_COLORS = ["#6366f1","#f59e0b","#22c55e","#ef4444","#8b5cf6","#0ea5e9","#f97316","#ec4899"];

type AreaForm = { name: string; description: string; type: "standard" | "timed"; hourlyRate: string; color: string };
const EMPTY_AREA: AreaForm = { name: "", description: "", type: "standard", hourlyRate: "", color: AREA_COLORS[0] };

type TableForm = { name: string; capacity: string; areaId: string };
const EMPTY_TABLE: TableForm = { name: "", capacity: "4", areaId: "" };

export default function AreasScreen() {
  const colors = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const { outlet, staff } = useAuth();
  const outletId = outlet?.id ?? 0;

  const [areaModal, setAreaModal] = useState(false);
  const [tableModal, setTableModal] = useState(false);
  const [editAreaId, setEditAreaId] = useState<number | null>(null);
  const [editTableId, setEditTableId] = useState<number | null>(null);
  const [areaForm, setAreaForm] = useState<AreaForm>(EMPTY_AREA);
  const [tableForm, setTableForm] = useState<TableForm>(EMPTY_TABLE);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedAreas, setExpandedAreas] = useState<Set<number>>(new Set());

  const { data: areas, refetch: refetchAreas } = useListAreas({ outletId });
  const { data: tables, refetch: refetchTables } = useListTables({ outletId });

  const createArea = useCreateArea();
  const updateArea = useUpdateArea();
  const deleteArea = useDeleteArea();
  const createTable = useCreateTable();
  const updateTable = useUpdateTable();
  const deleteTable = useDeleteTable();

  const setAF = (k: keyof AreaForm) => (v: string) => setAreaForm((f) => ({ ...f, [k]: v }));
  const setTF = (k: keyof TableForm) => (v: string) => setTableForm((f) => ({ ...f, [k]: v }));

  const toggleExpand = (id: number) => setExpandedAreas((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const openCreateArea = () => { setEditAreaId(null); setAreaForm(EMPTY_AREA); setAreaModal(true); };
  const openEditArea = (a: any) => {
    setEditAreaId(a.id);
    setAreaForm({ name: a.name, description: a.description ?? "", type: a.type as any, hourlyRate: String(a.hourlyRate ?? ""), color: a.color ?? AREA_COLORS[0] });
    setAreaModal(true);
  };

  const openCreateTable = (areaId?: number) => { setEditTableId(null); setTableForm({ ...EMPTY_TABLE, areaId: areaId ? String(areaId) : "" }); setTableModal(true); };
  const openEditTable = (t: any) => {
    setEditTableId(t.id);
    setTableForm({ name: t.name, capacity: String(t.capacity ?? 4), areaId: t.areaId ? String(t.areaId) : "" });
    setTableModal(true);
  };

  const saveArea = () => {
    if (!areaForm.name.trim()) { Alert.alert("Required", "Area name is required."); return; }
    const payload: any = { outletId, name: areaForm.name.trim(), description: areaForm.description.trim(), type: areaForm.type, color: areaForm.color };
    if (areaForm.type === "timed") payload.hourlyRate = parseFloat(areaForm.hourlyRate) || 0;
    if (editAreaId) {
      updateArea.mutate({ id: editAreaId, data: payload }, {
        onSuccess: () => { setAreaModal(false); qc.invalidateQueries(); },
        onError: () => Alert.alert("Error", "Failed to save area."),
      });
    } else {
      createArea.mutate({ data: payload }, {
        onSuccess: () => { setAreaModal(false); qc.invalidateQueries(); },
        onError: () => Alert.alert("Error", "Failed to create area."),
      });
    }
  };

  const saveTable = () => {
    if (!tableForm.name.trim()) { Alert.alert("Required", "Table name is required."); return; }
    const payload: any = { outletId, name: tableForm.name.trim(), capacity: parseInt(tableForm.capacity) || 4, areaId: tableForm.areaId ? parseInt(tableForm.areaId) : null };
    if (editTableId) {
      updateTable.mutate({ id: editTableId, data: payload }, {
        onSuccess: () => { setTableModal(false); qc.invalidateQueries(); },
        onError: () => Alert.alert("Error", "Failed to save table."),
      });
    } else {
      createTable.mutate({ data: payload }, {
        onSuccess: () => { setTableModal(false); qc.invalidateQueries(); },
        onError: () => Alert.alert("Error", "Failed to create table."),
      });
    }
  };

  const delArea = (id: number, name: string) => Alert.alert(`Delete "${name}"?`, "Tables in this area will be unassigned.", [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: () => deleteArea.mutate({ id }, { onSuccess: () => qc.invalidateQueries() }) },
  ]);

  const delTable = (id: number, name: string) => Alert.alert(`Delete "${name}"?`, undefined, [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: () => deleteTable.mutate({ id }, { onSuccess: () => qc.invalidateQueries() }) },
  ]);

  const onRefresh = async () => { setRefreshing(true); await Promise.all([refetchAreas(), refetchTables()]); setRefreshing(false); };

  const unassigned = (tables ?? []).filter((t) => !t.areaId);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 20 : insets.top + 8, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Areas & Tables</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={() => openCreateTable()} style={[styles.addBtn, { backgroundColor: `${colors.accent}22` }]}>
            <Feather name="plus-square" size={18} color={colors.accent} />
          </Pressable>
          <Pressable onPress={openCreateArea} style={[styles.addBtn, { backgroundColor: colors.accent }]}>
            <Feather name="plus" size={18} color="#fff" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: insets.bottom + 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {(areas ?? []).map((area) => {
          const areaTables = (tables ?? []).filter((t) => t.areaId === area.id);
          const expanded = expandedAreas.has(area.id);
          return (
            <View key={area.id} style={[styles.areaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Pressable onPress={() => toggleExpand(area.id)} style={styles.areaHeader}>
                <View style={[styles.areaColorDot, { backgroundColor: (area as any).color ?? colors.accent }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.areaName, { color: colors.foreground }]}>{area.name}</Text>
                  <Text style={[styles.areaMeta, { color: colors.mutedForeground }]}>
                    {area.type === "timed" ? `Timed · $${Number((area as any).hourlyRate ?? 0).toFixed(0)}/hr` : "Standard"}
                    {" · "}{areaTables.length} table{areaTables.length !== 1 ? "s" : ""}
                  </Text>
                </View>
                <Pressable onPress={() => openCreateTable(area.id)} style={[styles.smallBtn, { backgroundColor: `${colors.accent}18` }]}>
                  <Feather name="plus" size={14} color={colors.accent} />
                </Pressable>
                <Pressable onPress={() => openEditArea(area)} style={[styles.smallBtn, { backgroundColor: `${colors.accent}18` }]}>
                  <Feather name="edit-2" size={14} color={colors.accent} />
                </Pressable>
                <Pressable onPress={() => delArea(area.id, area.name)} style={[styles.smallBtn, { backgroundColor: `${colors.destructive}18` }]}>
                  <Feather name="trash-2" size={14} color={colors.destructive} />
                </Pressable>
                <Feather name={expanded ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
              </Pressable>

              {expanded && areaTables.length > 0 && (
                <View style={[styles.tableList, { borderTopColor: colors.border }]}>
                  {areaTables.map((t, i) => (
                    <View key={t.id}>
                      {i > 0 && <View style={[styles.rowDiv, { backgroundColor: colors.border }]} />}
                      <View style={styles.tableRow}>
                        <Feather name="square" size={14} color={colors.mutedForeground} />
                        <Text style={[styles.tableName, { color: colors.foreground }]}>{t.name}</Text>
                        <Text style={[styles.tableCap, { color: colors.mutedForeground }]}>{t.capacity} seats</Text>
                        <Pressable onPress={() => openEditTable(t)} style={[styles.smallBtn, { backgroundColor: `${colors.accent}18` }]}>
                          <Feather name="edit-2" size={13} color={colors.accent} />
                        </Pressable>
                        <Pressable onPress={() => delTable(t.id, t.name)} style={[styles.smallBtn, { backgroundColor: `${colors.destructive}18` }]}>
                          <Feather name="trash-2" size={13} color={colors.destructive} />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {unassigned.length > 0 && (
          <View style={[styles.areaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.areaHeader}>
              <View style={[styles.areaColorDot, { backgroundColor: colors.mutedForeground }]} />
              <Text style={[styles.areaName, { color: colors.foreground }]}>No Area</Text>
              <Text style={[styles.areaMeta, { color: colors.mutedForeground }]}>{unassigned.length} table{unassigned.length !== 1 ? "s" : ""}</Text>
            </View>
            {unassigned.map((t) => (
              <View key={t.id} style={[styles.tableRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
                <Feather name="square" size={14} color={colors.mutedForeground} />
                <Text style={[styles.tableName, { color: colors.foreground }]}>{t.name}</Text>
                <Text style={[styles.tableCap, { color: colors.mutedForeground }]}>{t.capacity} seats</Text>
                <Pressable onPress={() => openEditTable(t)} style={[styles.smallBtn, { backgroundColor: `${colors.accent}18` }]}>
                  <Feather name="edit-2" size={13} color={colors.accent} />
                </Pressable>
                <Pressable onPress={() => delTable(t.id, t.name)} style={[styles.smallBtn, { backgroundColor: `${colors.destructive}18` }]}>
                  <Feather name="trash-2" size={13} color={colors.destructive} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {!(areas ?? []).length && !unassigned.length && (
          <View style={styles.center}>
            <Feather name="layout" size={36} color={colors.mutedForeground} />
            <Text style={[{ color: colors.mutedForeground, fontSize: 15 }]}>No areas yet. Tap + to add one.</Text>
          </View>
        )}
      </ScrollView>

      {/* Area Modal */}
      <Modal visible={areaModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>{editAreaId ? "Edit Area" : "New Area"}</Text>
              <Pressable onPress={() => setAreaModal(false)}><Feather name="x" size={22} color={colors.foreground} /></Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formContent}>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Name</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                  value={areaForm.name} onChangeText={setAF("name")} placeholder="e.g. Indoor Dining"
                  placeholderTextColor={colors.mutedForeground} />
              </View>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Type</Text>
                <View style={styles.typeRow}>
                  {(["standard", "timed"] as const).map((t) => (
                    <Pressable key={t} onPress={() => setAreaForm((f) => ({ ...f, type: t }))}
                      style={[styles.typeChip, { borderColor: areaForm.type === t ? colors.accent : colors.border },
                        areaForm.type === t && { backgroundColor: `${colors.accent}18` }]}>
                      <Text style={[{ fontWeight: "600", fontSize: 14 }, { color: areaForm.type === t ? colors.accent : colors.mutedForeground }]}>
                        {t === "standard" ? "Standard" : "Timed (hourly)"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              {areaForm.type === "timed" && (
                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Hourly Rate</Text>
                  <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                    value={areaForm.hourlyRate} onChangeText={setAF("hourlyRate")} placeholder="0.00"
                    placeholderTextColor={colors.mutedForeground} keyboardType="decimal-pad" />
                </View>
              )}
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Colour</Text>
                <View style={styles.colorRow}>
                  {AREA_COLORS.map((c) => (
                    <Pressable key={c} onPress={() => setAreaForm((f) => ({ ...f, color: c }))}
                      style={[styles.colorDot, { backgroundColor: c }, areaForm.color === c && styles.colorDotActive]} />
                  ))}
                </View>
              </View>
              <Pressable onPress={saveArea} style={[styles.saveBtn, { backgroundColor: colors.accent }]}>
                <Text style={styles.saveBtnText}>Save Area</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Table Modal */}
      <Modal visible={tableModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>{editTableId ? "Edit Table" : "New Table"}</Text>
              <Pressable onPress={() => setTableModal(false)}><Feather name="x" size={22} color={colors.foreground} /></Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formContent}>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Name</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                  value={tableForm.name} onChangeText={setTF("name")} placeholder="e.g. T1"
                  placeholderTextColor={colors.mutedForeground} />
              </View>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Capacity</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                  value={tableForm.capacity} onChangeText={setTF("capacity")} keyboardType="number-pad"
                  placeholder="4" placeholderTextColor={colors.mutedForeground} />
              </View>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Area (optional)</Text>
                <View style={styles.typeRow}>
                  <Pressable onPress={() => setTF("areaId")("")}
                    style={[styles.typeChip, { borderColor: !tableForm.areaId ? colors.accent : colors.border },
                      !tableForm.areaId && { backgroundColor: `${colors.accent}18` }]}>
                    <Text style={[{ fontWeight: "600", fontSize: 13 }, { color: !tableForm.areaId ? colors.accent : colors.mutedForeground }]}>None</Text>
                  </Pressable>
                  {(areas ?? []).map((a) => (
                    <Pressable key={a.id} onPress={() => setTF("areaId")(String(a.id))}
                      style={[styles.typeChip, { borderColor: tableForm.areaId === String(a.id) ? (a as any).color ?? colors.accent : colors.border },
                        tableForm.areaId === String(a.id) && { backgroundColor: `${(a as any).color ?? colors.accent}18` }]}>
                      <Text style={[{ fontWeight: "600", fontSize: 13 }, { color: tableForm.areaId === String(a.id) ? ((a as any).color ?? colors.accent) : colors.mutedForeground }]}>
                        {a.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <Pressable onPress={saveTable} style={[styles.saveBtn, { backgroundColor: colors.accent }]}>
                <Text style={styles.saveBtnText}>Save Table</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700" },
  backBtn: { width: 40, height: 40, alignItems: "flex-start", justifyContent: "center" },
  headerActions: { flexDirection: "row", gap: 8 },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  center: { alignItems: "center", justifyContent: "center", gap: 10, paddingTop: 60 },
  areaCard: { borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  areaHeader: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12 },
  areaColorDot: { width: 12, height: 12, borderRadius: 6 },
  areaName: { fontSize: 15, fontWeight: "700" },
  areaMeta: { fontSize: 12, marginTop: 1 },
  smallBtn: { width: 28, height: 28, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  tableList: { borderTopWidth: 1 },
  tableRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 9 },
  tableName: { flex: 1, fontSize: 14, fontWeight: "600" },
  tableCap: { fontSize: 12 },
  rowDiv: { height: 1 },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  formContent: { padding: 16, gap: 14 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: "600" },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1.5 },
  colorRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  colorDot: { width: 30, height: 30, borderRadius: 15 },
  colorDotActive: { borderWidth: 3, borderColor: "#fff", transform: [{ scale: 1.15 }] },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
