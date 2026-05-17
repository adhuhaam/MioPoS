import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  useListCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useListMenuItems,
  useCreateMenuItem,
  useUpdateMenuItem,
  useDeleteMenuItem,
  useListModifierGroups,
  useCreateModifierGroup,
  useUpdateModifierGroup,
  useDeleteModifierGroup,
  useListOutlets,
} from "@workspace/api-client-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

type RecipeLine = {
  id: number;
  menuItemId: number;
  inventoryItemId: number;
  inventoryItemName: string;
  unit: string;
  quantity: string;
};

type InvItem = { id: number; name: string; unit: string };

type Tab = "categories" | "items" | "modifiers";

export default function MenuScreen() {
  const colors = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const { outlet, staff } = useAuth();
  const isSuperAdmin = staff?.role === "super_admin";

  const [activeTab, setActiveTab] = useState<Tab>("categories");
  const [selectedOutletId, setSelectedOutletId] = useState<number | null>(outlet?.id ?? null);
  const [outletPickerOpen, setOutletPickerOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const outletId = selectedOutletId ?? outlet?.id ?? 0;

  // Categories
  const { data: categories, refetch: refetchCats } = useListCategories({ outletId }, { query: { enabled: !!outletId } });
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  // Items
  const { data: items, refetch: refetchItems } = useListMenuItems({ outletId }, { query: { enabled: !!outletId } });
  const createItem = useCreateMenuItem();
  const updateItem = useUpdateMenuItem();
  const deleteItem = useDeleteMenuItem();

  // Modifiers
  const { data: modifiers, refetch: refetchMods } = useListModifierGroups({ outletId }, { query: { enabled: !!outletId } });
  const createModifier = useCreateModifierGroup();
  const updateModifier = useUpdateModifierGroup();
  const deleteModifier = useDeleteModifierGroup();

  const { data: outlets } = useListOutlets();

  // Category modal
  const [catModal, setCatModal] = useState(false);
  const [catEditId, setCatEditId] = useState<number | null>(null);
  const [catName, setCatName] = useState("");

  // Item modal
  const [itemModal, setItemModal] = useState(false);
  const [itemEditId, setItemEditId] = useState<number | null>(null);
  const [itemForm, setItemForm] = useState({ name: "", description: "", price: "", categoryId: "", available: true });

  // Modifier modal
  const [modModal, setModModal] = useState(false);
  const [modEditId, setModEditId] = useState<number | null>(null);
  const [modName, setModName] = useState("");

  // Recipe modal
  const [recipeModal, setRecipeModal] = useState(false);
  const [recipeItemId, setRecipeItemId] = useState<number | null>(null);
  const [recipeItemName, setRecipeItemName] = useState("");
  const [newIngId, setNewIngId] = useState("");
  const [newIngQty, setNewIngQty] = useState("");
  const [recipeAdding, setRecipeAdding] = useState(false);
  const [recipeRemoving, setRecipeRemoving] = useState<number | null>(null);

  const { data: recipeLines = [], refetch: refetchRecipe } = useQuery<RecipeLine[]>({
    queryKey: ["recipe", recipeItemId],
    queryFn: () => apiFetch(`/api/menu/items/${recipeItemId}/recipe`),
    enabled: !!recipeItemId && recipeModal,
  });
  const { data: invItems = [] } = useQuery<InvItem[]>({
    queryKey: ["inventory/items-all", outletId],
    queryFn: () => apiFetch(`/api/inventory/items?outletId=${outletId}`),
    enabled: recipeModal && !!outletId,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchCats(), refetchItems(), refetchMods()]);
    setRefreshing(false);
  };

  // Category CRUD
  const openCreateCat = () => { setCatEditId(null); setCatName(""); setCatModal(true); };
  const openEditCat = (c: any) => { setCatEditId(c.id); setCatName(c.name); setCatModal(true); };
  const saveCat = () => {
    if (!catName.trim()) return;
    if (catEditId) {
      updateCategory.mutate({ id: catEditId, data: { name: catName.trim() } }, {
        onSuccess: () => { setCatModal(false); qc.invalidateQueries(); },
        onError: () => Alert.alert("Error", "Failed to save."),
      });
    } else {
      createCategory.mutate({ data: { name: catName.trim(), outletId } }, {
        onSuccess: () => { setCatModal(false); qc.invalidateQueries(); },
        onError: () => Alert.alert("Error", "Failed to create."),
      });
    }
  };
  const delCat = (id: number, name: string) => Alert.alert(`Delete "${name}"?`, undefined, [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: () => deleteCategory.mutate({ id }, { onSuccess: () => qc.invalidateQueries() }) },
  ]);

  // Item CRUD
  const openCreateItem = () => { setItemEditId(null); setItemForm({ name: "", description: "", price: "", categoryId: "", available: true }); setItemModal(true); };
  const openEditItem = (it: any) => {
    setItemEditId(it.id);
    setItemForm({ name: it.name, description: it.description ?? "", price: String(it.price ?? ""), categoryId: it.categoryId ? String(it.categoryId) : "", available: it.available !== false });
    setItemModal(true);
  };
  const saveItem = () => {
    if (!itemForm.name.trim() || !itemForm.price) { Alert.alert("Required", "Name and price are required."); return; }
    const payload: any = { name: itemForm.name.trim(), description: itemForm.description.trim(), price: parseFloat(itemForm.price), categoryId: itemForm.categoryId ? parseInt(itemForm.categoryId) : null, available: itemForm.available, outletId };
    if (itemEditId) {
      updateItem.mutate({ id: itemEditId, data: payload }, {
        onSuccess: () => { setItemModal(false); qc.invalidateQueries(); },
        onError: () => Alert.alert("Error", "Failed to save."),
      });
    } else {
      createItem.mutate({ data: payload }, {
        onSuccess: () => { setItemModal(false); qc.invalidateQueries(); },
        onError: () => Alert.alert("Error", "Failed to create."),
      });
    }
  };
  const delItem = (id: number, name: string) => Alert.alert(`Delete "${name}"?`, undefined, [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: () => deleteItem.mutate({ id }, { onSuccess: () => qc.invalidateQueries() }) },
  ]);

  // Modifier CRUD
  const openCreateMod = () => { setModEditId(null); setModName(""); setModModal(true); };
  const openEditMod = (m: any) => { setModEditId(m.id); setModName(m.name); setModModal(true); };
  const saveMod = () => {
    if (!modName.trim()) return;
    if (modEditId) {
      updateModifier.mutate({ id: modEditId, data: { name: modName.trim() } }, {
        onSuccess: () => { setModModal(false); qc.invalidateQueries(); },
        onError: () => Alert.alert("Error", "Failed to save."),
      });
    } else {
      createModifier.mutate({ data: { name: modName.trim(), outletId } }, {
        onSuccess: () => { setModModal(false); qc.invalidateQueries(); },
        onError: () => Alert.alert("Error", "Failed to create."),
      });
    }
  };
  const delMod = (id: number, name: string) => Alert.alert(`Delete "${name}"?`, undefined, [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: () => deleteModifier.mutate({ id }, { onSuccess: () => qc.invalidateQueries() }) },
  ]);

  const openRecipe = (it: { id: number; name: string }) => {
    setRecipeItemId(it.id);
    setRecipeItemName(it.name);
    setNewIngId("");
    setNewIngQty("");
    setRecipeModal(true);
  };
  const addRecipeLine = async () => {
    if (!recipeItemId || !newIngId || !newIngQty) return;
    setRecipeAdding(true);
    try {
      await apiFetch(`/api/menu/items/${recipeItemId}/recipe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventoryItemId: parseInt(newIngId), quantity: parseFloat(newIngQty) }),
      });
      setNewIngId("");
      setNewIngQty("");
      refetchRecipe();
      Alert.alert("Added", "Ingredient added to recipe.");
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed");
    } finally {
      setRecipeAdding(false);
    }
  };
  const removeRecipeLine = async (recipeId: number) => {
    if (!recipeItemId) return;
    setRecipeRemoving(recipeId);
    try {
      await apiFetch(`/api/menu/items/${recipeItemId}/recipe/${recipeId}`, { method: "DELETE" });
      refetchRecipe();
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed");
    } finally {
      setRecipeRemoving(null);
    }
  };

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "categories", label: "Categories", icon: "tag" },
    { key: "items", label: "Items", icon: "package" },
    { key: "modifiers", label: "Modifiers", icon: "sliders" },
  ];

  const currentOutletName = outlets?.find((o) => o.id === outletId)?.name ?? outlet?.name;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 20 : insets.top + 8, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Menu</Text>
          {isSuperAdmin && (
            <Pressable onPress={() => setOutletPickerOpen(true)} style={styles.outletPickRow}>
              <Text style={[styles.outletPickLabel, { color: colors.accent }]}>{currentOutletName ?? "Select outlet"}</Text>
              <Feather name="chevron-down" size={13} color={colors.accent} />
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={() => { if (activeTab === "categories") openCreateCat(); else if (activeTab === "items") openCreateItem(); else openCreateMod(); }}
          style={[styles.addBtn, { backgroundColor: colors.accent }]}
        >
          <Feather name="plus" size={18} color="#fff" />
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {TABS.map((t) => (
          <Pressable key={t.key} onPress={() => setActiveTab(t.key)}
            style={[styles.tabBtn, activeTab === t.key && [styles.tabBtnActive, { borderBottomColor: colors.accent }]]}>
            <Text style={[styles.tabLabel, { color: activeTab === t.key ? colors.accent : colors.mutedForeground }]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      {activeTab === "categories" && (
        <FlatList
          data={categories ?? []}
          keyExtractor={(c) => String(c.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={{ padding: 14, gap: 8, paddingBottom: insets.bottom + 20 }}
          ListEmptyComponent={<View style={styles.center}><Text style={[{ color: colors.mutedForeground }]}>No categories</Text></View>}
          renderItem={({ item: c }) => (
            <View style={[styles.listRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="tag" size={16} color={colors.accent} />
              <Text style={[styles.rowName, { color: colors.foreground }]}>{c.name}</Text>
              <Pressable onPress={() => openEditCat(c)} style={[styles.iconBtn, { backgroundColor: `${colors.accent}18` }]}><Feather name="edit-2" size={14} color={colors.accent} /></Pressable>
              <Pressable onPress={() => delCat(c.id, c.name)} style={[styles.iconBtn, { backgroundColor: `${colors.destructive}18` }]}><Feather name="trash-2" size={14} color={colors.destructive} /></Pressable>
            </View>
          )}
        />
      )}

      {activeTab === "items" && (
        <FlatList
          data={items ?? []}
          keyExtractor={(it) => String(it.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={{ padding: 14, gap: 8, paddingBottom: insets.bottom + 20 }}
          ListEmptyComponent={<View style={styles.center}><Text style={[{ color: colors.mutedForeground }]}>No items</Text></View>}
          renderItem={({ item: it }) => {
            const catName = categories?.find((c) => c.id === it.categoryId)?.name;
            return (
              <View style={[styles.listRow, { backgroundColor: colors.card, borderColor: colors.border, flexWrap: "wrap" }]}>
                <View style={{ flex: 1 }}>
                  <View style={styles.itemTop}>
                    <Text style={[styles.rowName, { color: colors.foreground }]}>{it.name}</Text>
                    {!it.available && (
                      <View style={[styles.unavailBadge, { backgroundColor: `${colors.destructive}18` }]}>
                        <Text style={[styles.unavailText, { color: colors.destructive }]}>Unavailable</Text>
                      </View>
                    )}
                  </View>
                  {catName ? <Text style={[styles.itemCat, { color: colors.mutedForeground }]}>{catName}</Text> : null}
                </View>
                <Text style={[styles.itemPrice, { color: colors.foreground }]}>{Number(it.price).toFixed(2)}</Text>
                <Pressable onPress={() => openRecipe(it)} style={[styles.iconBtn, { backgroundColor: `${colors.success}18` }]}><Feather name="book-open" size={14} color={colors.success} /></Pressable>
                <Pressable onPress={() => openEditItem(it)} style={[styles.iconBtn, { backgroundColor: `${colors.accent}18` }]}><Feather name="edit-2" size={14} color={colors.accent} /></Pressable>
                <Pressable onPress={() => delItem(it.id, it.name)} style={[styles.iconBtn, { backgroundColor: `${colors.destructive}18` }]}><Feather name="trash-2" size={14} color={colors.destructive} /></Pressable>
              </View>
            );
          }}
        />
      )}

      {activeTab === "modifiers" && (
        <FlatList
          data={modifiers ?? []}
          keyExtractor={(m) => String(m.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={{ padding: 14, gap: 8, paddingBottom: insets.bottom + 20 }}
          ListEmptyComponent={<View style={styles.center}><Text style={[{ color: colors.mutedForeground }]}>No modifier groups</Text></View>}
          renderItem={({ item: m }) => (
            <View style={[styles.listRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="sliders" size={16} color={colors.accent} />
              <Text style={[styles.rowName, { color: colors.foreground }]}>{m.name}</Text>
              <Text style={[{ color: colors.mutedForeground, fontSize: 12 }]}>{(m as any).options?.length ?? 0} options</Text>
              <Pressable onPress={() => openEditMod(m)} style={[styles.iconBtn, { backgroundColor: `${colors.accent}18` }]}><Feather name="edit-2" size={14} color={colors.accent} /></Pressable>
              <Pressable onPress={() => delMod(m.id, m.name)} style={[styles.iconBtn, { backgroundColor: `${colors.destructive}18` }]}><Feather name="trash-2" size={14} color={colors.destructive} /></Pressable>
            </View>
          )}
        />
      )}

      {/* Outlet picker for super admin */}
      <Modal visible={outletPickerOpen} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Outlet</Text>
            <Pressable onPress={() => setOutletPickerOpen(false)}><Feather name="x" size={22} color={colors.foreground} /></Pressable>
          </View>
          {(outlets ?? []).map((o) => (
            <Pressable key={o.id} onPress={() => { setSelectedOutletId(o.id); setOutletPickerOpen(false); }}
              style={[styles.listRow, { backgroundColor: o.id === outletId ? `${colors.accent}14` : colors.card, borderColor: colors.border, margin: 8, borderRadius: 12 }]}>
              <Feather name="home" size={16} color={o.id === outletId ? colors.accent : colors.mutedForeground} />
              <Text style={[styles.rowName, { color: o.id === outletId ? colors.accent : colors.foreground }]}>{o.name}</Text>
              {o.id === outletId && <Feather name="check" size={16} color={colors.accent} />}
            </Pressable>
          ))}
        </View>
      </Modal>

      {/* Category Modal */}
      <Modal visible={catModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>{catEditId ? "Edit Category" : "New Category"}</Text>
              <Pressable onPress={() => setCatModal(false)}><Feather name="x" size={22} color={colors.foreground} /></Pressable>
            </View>
            <View style={styles.formContent}>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Name</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                  value={catName} onChangeText={setCatName} placeholder="e.g. Appetizers" placeholderTextColor={colors.mutedForeground} autoFocus />
              </View>
              <Pressable onPress={saveCat} style={[styles.saveBtn, { backgroundColor: colors.accent }]}>
                <Text style={styles.saveBtnText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Item Modal */}
      <Modal visible={itemModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>{itemEditId ? "Edit Item" : "New Item"}</Text>
              <Pressable onPress={() => setItemModal(false)}><Feather name="x" size={22} color={colors.foreground} /></Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formContent}>
              {[
                { label: "Name", key: "name", placeholder: "Item name" },
                { label: "Description", key: "description", placeholder: "Optional" },
                { label: "Price", key: "price", placeholder: "0.00", keyboardType: "decimal-pad" },
              ].map((f) => (
                <View key={f.key} style={styles.field}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{f.label}</Text>
                  <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                    value={(itemForm as any)[f.key]} onChangeText={(v) => setItemForm((prev) => ({ ...prev, [f.key]: v }))}
                    placeholder={f.placeholder} placeholderTextColor={colors.mutedForeground}
                    keyboardType={(f as any).keyboardType ?? "default"} />
                </View>
              ))}
              {categories && categories.length > 0 && (
                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Category</Text>
                  <View style={styles.typeRow}>
                    <Pressable onPress={() => setItemForm((f) => ({ ...f, categoryId: "" }))}
                      style={[styles.typeChip, { borderColor: !itemForm.categoryId ? colors.accent : colors.border }, !itemForm.categoryId && { backgroundColor: `${colors.accent}18` }]}>
                      <Text style={[{ fontWeight: "600", fontSize: 13 }, { color: !itemForm.categoryId ? colors.accent : colors.mutedForeground }]}>None</Text>
                    </Pressable>
                    {categories.map((c) => (
                      <Pressable key={c.id} onPress={() => setItemForm((f) => ({ ...f, categoryId: String(c.id) }))}
                        style={[styles.typeChip, { borderColor: itemForm.categoryId === String(c.id) ? colors.accent : colors.border }, itemForm.categoryId === String(c.id) && { backgroundColor: `${colors.accent}18` }]}>
                        <Text style={[{ fontWeight: "600", fontSize: 13 }, { color: itemForm.categoryId === String(c.id) ? colors.accent : colors.mutedForeground }]}>{c.name}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
              <View style={styles.switchRow}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Available</Text>
                <Switch value={itemForm.available} onValueChange={(v) => setItemForm((f) => ({ ...f, available: v }))} trackColor={{ true: colors.success }} />
              </View>
              <Pressable onPress={saveItem} style={[styles.saveBtn, { backgroundColor: colors.accent }]}>
                <Text style={styles.saveBtnText}>Save Item</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Recipe Modal */}
      <Modal visible={recipeModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]} numberOfLines={1}>Recipe — {recipeItemName}</Text>
              <Pressable onPress={() => { setRecipeModal(false); setRecipeItemId(null); }}><Feather name="x" size={22} color={colors.foreground} /></Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.formContent}>
              <Text style={[styles.recipeHint, { color: colors.mutedForeground }]}>
                Ingredients used per portion. Stock deducts when the order is paid.
              </Text>
              {recipeLines.length > 0 ? (
                recipeLines.map(line => (
                  <View key={line.id} style={[styles.recipeRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowName, { color: colors.foreground }]}>{line.inventoryItemName}</Text>
                      <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                        {Number(line.quantity).toLocaleString(undefined, { maximumFractionDigits: 4 })} {line.unit} / portion
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => removeRecipeLine(line.id)}
                      disabled={recipeRemoving === line.id}
                      style={[styles.iconBtn, { backgroundColor: `${colors.destructive}18` }]}
                    >
                      <Feather name="trash-2" size={14} color={colors.destructive} />
                    </Pressable>
                  </View>
                ))
              ) : (
                <Text style={[styles.recipeHint, { color: colors.mutedForeground, textAlign: "center", paddingVertical: 16 }]}>
                  No ingredients yet.
                </Text>
              )}
              <View style={[styles.recipeAddBox, { borderColor: colors.border, backgroundColor: `${colors.muted}40` }]}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Add ingredient</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {invItems
                      .filter(inv => !recipeLines.some(r => r.inventoryItemId === inv.id))
                      .map(inv => (
                        <Pressable
                          key={inv.id}
                          onPress={() => setNewIngId(String(inv.id))}
                          style={[styles.typeChip, { borderColor: newIngId === String(inv.id) ? colors.accent : colors.border }, newIngId === String(inv.id) && { backgroundColor: `${colors.accent}18` }]}
                        >
                          <Text style={{ fontSize: 12, fontWeight: "600", color: newIngId === String(inv.id) ? colors.accent : colors.foreground }}>{inv.name}</Text>
                          <Text style={{ fontSize: 10, color: colors.mutedForeground }}>{inv.unit}</Text>
                        </Pressable>
                      ))}
                  </View>
                </ScrollView>
                {!invItems.length && (
                  <Text style={{ color: colors.mutedForeground, fontSize: 12, marginBottom: 8 }}>Add ingredients in Inventory first.</Text>
                )}
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                  Qty per portion{newIngId ? ` (${invItems.find(i => String(i.id) === newIngId)?.unit ?? ""})` : ""}
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                  value={newIngQty}
                  onChangeText={setNewIngQty}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 200"
                  placeholderTextColor={colors.mutedForeground}
                />
                <Pressable
                  onPress={addRecipeLine}
                  disabled={!newIngId || !newIngQty || recipeAdding}
                  style={[styles.saveBtn, { backgroundColor: colors.accent, opacity: !newIngId || !newIngQty ? 0.5 : 1, marginTop: 10 }]}
                >
                  <Text style={styles.saveBtnText}>{recipeAdding ? "Adding…" : "Add Ingredient"}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modifier Modal */}
      <Modal visible={modModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>{modEditId ? "Edit Modifier Group" : "New Modifier Group"}</Text>
              <Pressable onPress={() => setModModal(false)}><Feather name="x" size={22} color={colors.foreground} /></Pressable>
            </View>
            <View style={styles.formContent}>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Group Name</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                  value={modName} onChangeText={setModName} placeholder="e.g. Spice Level" placeholderTextColor={colors.mutedForeground} autoFocus />
              </View>
              <Pressable onPress={saveMod} style={[styles.saveBtn, { backgroundColor: colors.accent }]}>
                <Text style={styles.saveBtnText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
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
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 11, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabBtnActive: {},
  tabLabel: { fontSize: 13, fontWeight: "700" },
  center: { alignItems: "center", justifyContent: "center", gap: 10, paddingTop: 60 },
  listRow: { borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  rowName: { flex: 1, fontSize: 15, fontWeight: "600" },
  iconBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  itemTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  itemCat: { fontSize: 11, marginTop: 2 },
  itemPrice: { fontSize: 15, fontWeight: "700" },
  unavailBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  unavailText: { fontSize: 10, fontWeight: "700" },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  formContent: { padding: 16, gap: 14 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: "600" },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1.5 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  recipeHint: { fontSize: 12, lineHeight: 18 },
  recipeRow: { borderWidth: 1, borderRadius: 10, padding: 12, flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  recipeAddBox: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 8 },
});
