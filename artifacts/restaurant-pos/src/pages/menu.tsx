import { useState } from "react";
import {
  useListCategories, getListCategoriesQueryKey, useCreateCategory, useUpdateCategory, useDeleteCategory,
  useListMenuItems, getListMenuItemsQueryKey, useCreateMenuItem, useUpdateMenuItem, useDeleteMenuItem,
  useListModifierGroups, useCreateModifierGroup, useUpdateModifierGroup, useDeleteModifierGroup,
  useAddModifierOption, useDeleteModifierOption,
  useListItemModifierGroups, getListItemModifierGroupsQueryKey,
  useAssignItemModifierGroup, useUnassignItemModifierGroup,
} from "@workspace/api-client-react";
import type { MenuCategory, MenuItem, ModifierGroup } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, FlaskConical } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";

type RecipeLine = { id: number; inventoryItemId: number; inventoryItemName: string; unit: string; quantity: string };
type InvItem = { id: number; name: string; unit: string };

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...options });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: "Failed" })); throw new Error(e.error ?? "Failed"); }
  if (res.status === 204) return undefined as T;
  return res.json();
}

type ItemForm = { name: string; description: string; price: string; available: boolean };
type Tab = "menu" | "modifiers";

function getListModifierGroupsQueryKey(params: { outletId: number }) {
  return ["listModifierGroups", params];
}

export default function Menu() {
  const { auth } = useAuth();
  const { fmt } = useCurrency();
  const outletId = auth!.outlet.id;
  const qc = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("menu");

  // ── Menu data ────────────────────────────────────────────────────────────
  const { data: categories } = useListCategories({ outletId }, { query: { queryKey: getListCategoriesQueryKey({ outletId }) } });
  const createCat = useCreateCategory();
  const updateCat = useUpdateCategory();
  const deleteCat = useDeleteCategory();

  const [selCat, setSelCat] = useState<number | null>(null);
  const activeCatId = selCat ?? categories?.[0]?.id;

  const { data: items } = useListMenuItems({ outletId }, { query: { queryKey: getListMenuItemsQueryKey({ outletId }) } });
  const catItems = items?.filter(i => i.categoryId === activeCatId) ?? [];

  const createItem = useCreateMenuItem();
  const updateItem = useUpdateMenuItem();
  const deleteItem = useDeleteMenuItem();

  const [catDialog, setCatDialog] = useState(false);
  const [itemDialog, setItemDialog] = useState(false);
  const [modGroupAssignDialog, setModGroupAssignDialog] = useState(false);
  const [modGroupAssignItemId, setModGroupAssignItemId] = useState<number | null>(null);

  // ── Recipe dialog ─────────────────────────────────────────────────────────
  const [recipeItemId, setRecipeItemId] = useState<number | null>(null);
  const [recipeDialog, setRecipeDialog] = useState(false);
  const [newIngredientId, setNewIngredientId] = useState("");
  const [newIngredientQty, setNewIngredientQty] = useState("");
  const [recipeAdding, setRecipeAdding] = useState(false);
  const [recipeRemoving, setRecipeRemoving] = useState<number | null>(null);

  const { data: recipeLines = [], refetch: refetchRecipe } = useQuery<RecipeLine[]>({
    queryKey: ["recipe", recipeItemId],
    queryFn: () => apiFetch(`/api/menu/items/${recipeItemId}/recipe`),
    enabled: !!recipeItemId && recipeDialog,
  });
  const { data: inventoryItems = [] } = useQuery<InvItem[]>({
    queryKey: ["inventory/items-all", outletId],
    queryFn: () => apiFetch(`/api/inventory/items?outletId=${outletId}`),
    enabled: recipeDialog,
  });

  const openRecipeDialog = (itemId: number) => {
    setRecipeItemId(itemId);
    setNewIngredientId(""); setNewIngredientQty("");
    setRecipeDialog(true);
  };
  const addRecipeLine = async () => {
    if (!newIngredientId || !newIngredientQty || !recipeItemId) return;
    setRecipeAdding(true);
    try {
      await apiFetch(`/api/menu/items/${recipeItemId}/recipe`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventoryItemId: parseInt(newIngredientId), quantity: parseFloat(newIngredientQty) }),
      });
      setNewIngredientId(""); setNewIngredientQty("");
      refetchRecipe();
      toast({ title: "Ingredient added" });
    } catch (e: any) { toast({ variant: "destructive", title: e.message }); }
    finally { setRecipeAdding(false); }
  };
  const removeRecipeLine = async (recipeId: number) => {
    if (!recipeItemId) return;
    setRecipeRemoving(recipeId);
    try {
      await apiFetch(`/api/menu/items/${recipeItemId}/recipe/${recipeId}`, { method: "DELETE" });
      refetchRecipe();
      toast({ title: "Ingredient removed" });
    } catch (e: any) { toast({ variant: "destructive", title: e.message }); }
    finally { setRecipeRemoving(null); }
  };
  const [editCat, setEditCat] = useState<MenuCategory | null>(null);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [catName, setCatName] = useState("");
  const [itemForm, setItemForm] = useState<ItemForm>({ name: "", description: "", price: "", available: true });

  const invalidateCats = () => qc.invalidateQueries({ queryKey: getListCategoriesQueryKey({ outletId }) });
  const invalidateItems = () => qc.invalidateQueries({ queryKey: getListMenuItemsQueryKey({ outletId }) });

  const openNewCat = () => { setEditCat(null); setCatName(""); setCatDialog(true); };
  const openEditCat = (c: MenuCategory) => { setEditCat(c); setCatName(c.name); setCatDialog(true); };
  const saveCat = () => {
    if (editCat) {
      updateCat.mutate({ id: editCat.id, data: { name: catName } }, {
        onSuccess: () => { toast({ title: "Category updated" }); setCatDialog(false); invalidateCats(); },
        onError: () => toast({ variant: "destructive", title: "Failed" }),
      });
    } else {
      if (!outletId || outletId <= 0) {
        toast({
          variant: "destructive",
          title: "No outlet selected",
          description: "Log in with a specific outlet (not “All Outlets”) to create categories.",
        });
        return;
      }
      createCat.mutate({ data: { outletId, name: catName, sortOrder: (categories?.length ?? 0) } }, {
        onSuccess: () => { toast({ title: "Category created" }); setCatDialog(false); invalidateCats(); },
        onError: () => toast({ variant: "destructive", title: "Failed" }),
      });
    }
  };
  const removeCat = (id: number) => {
    if (!confirm("Delete this category and all its items?")) return;
    deleteCat.mutate({ id }, { onSuccess: () => { invalidateCats(); invalidateItems(); }, onError: () => toast({ variant: "destructive", title: "Failed" }) });
  };

  const openNewItem = () => { setEditItem(null); setItemForm({ name: "", description: "", price: "", available: true }); setItemDialog(true); };
  const openEditItem = (i: MenuItem) => {
    setEditItem(i);
    setItemForm({ name: i.name, description: i.description ?? "", price: String(i.price), available: i.available });
    setItemDialog(true);
  };
  const saveItem = () => {
    const itemData = { name: itemForm.name, description: itemForm.description || undefined, price: parseFloat(itemForm.price), available: itemForm.available };
    if (editItem) {
      updateItem.mutate({ id: editItem.id, data: itemData }, {
        onSuccess: () => { toast({ title: "Item updated" }); setItemDialog(false); invalidateItems(); },
        onError: () => toast({ variant: "destructive", title: "Failed" }),
      });
    } else {
      if (!activeCatId) return;
      const activeCategory = categories?.find((c) => c.id === activeCatId);
      const resolvedOutletId = activeCategory?.outletId ?? (outletId > 0 ? outletId : undefined);
      if (!resolvedOutletId) {
        toast({
          variant: "destructive",
          title: "No outlet for this category",
          description: "Log in with a specific outlet, or pick a category that belongs to an outlet.",
        });
        return;
      }
      createItem.mutate({ data: { ...itemData, categoryId: activeCatId, outletId: resolvedOutletId } }, {
        onSuccess: () => { toast({ title: "Item created" }); setItemDialog(false); invalidateItems(); },
        onError: () => toast({ variant: "destructive", title: "Failed" }),
      });
    }
  };
  const removeItem = (id: number) => {
    if (!confirm("Delete this menu item?")) return;
    deleteItem.mutate({ id }, { onSuccess: invalidateItems, onError: () => toast({ variant: "destructive", title: "Failed" }) });
  };
  const toggleAvailable = (item: MenuItem) => {
    updateItem.mutate({ id: item.id, data: { available: !item.available } }, { onSuccess: invalidateItems });
  };

  // ── Item ↔ Modifier group assignment ─────────────────────────────────────
  const { data: itemAssignedGroups, refetch: refetchItemGroups } = useListItemModifierGroups(
    modGroupAssignItemId ?? 0,
    { query: { enabled: !!modGroupAssignItemId, queryKey: getListItemModifierGroupsQueryKey(modGroupAssignItemId ?? 0) } }
  );
  const assignGroup = useAssignItemModifierGroup();
  const unassignGroup = useUnassignItemModifierGroup();

  const openModGroupAssign = (itemId: number) => {
    setModGroupAssignItemId(itemId);
    setModGroupAssignDialog(true);
  };

  const handleAssignGroup = (groupId: number) => {
    if (!modGroupAssignItemId) return;
    const alreadyAssigned = itemAssignedGroups?.some((g: ModifierGroup) => g.id === groupId);
    if (alreadyAssigned) return;
    assignGroup.mutate(
      { itemId: modGroupAssignItemId, data: { modifierGroupId: groupId } },
      { onSuccess: () => refetchItemGroups(), onError: () => toast({ variant: "destructive", title: "Failed to assign" }) }
    );
  };

  const handleUnassignGroup = (groupId: number) => {
    if (!modGroupAssignItemId) return;
    unassignGroup.mutate(
      { itemId: modGroupAssignItemId, groupId },
      { onSuccess: () => refetchItemGroups(), onError: () => toast({ variant: "destructive", title: "Failed to remove" }) }
    );
  };

  // ── Modifier data ────────────────────────────────────────────────────────
  const { data: modifierGroups } = useListModifierGroups({ outletId }, {
    query: { queryKey: getListModifierGroupsQueryKey({ outletId }) },
  });
  const createGroup = useCreateModifierGroup();
  const updateGroup = useUpdateModifierGroup();
  const deleteGroup = useDeleteModifierGroup();
  const addOption = useAddModifierOption();
  const deleteOption = useDeleteModifierOption();

  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [groupDialog, setGroupDialog] = useState(false);
  const [editGroup, setEditGroup] = useState<ModifierGroup | null>(null);
  const [groupForm, setGroupForm] = useState({ name: "", required: false, multiSelect: false });
  const [optionDialogGroupId, setOptionDialogGroupId] = useState<number | null>(null);
  const [optionForm, setOptionForm] = useState({ name: "", priceAdjustment: "0" });

  const invalidateModifiers = () => qc.invalidateQueries({ queryKey: getListModifierGroupsQueryKey({ outletId }) });

  const toggleExpand = (id: number) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const openNewGroup = () => {
    setEditGroup(null);
    setGroupForm({ name: "", required: false, multiSelect: false });
    setGroupDialog(true);
  };
  const openEditGroup = (g: ModifierGroup) => {
    setEditGroup(g);
    setGroupForm({ name: g.name, required: g.required, multiSelect: g.multiSelect });
    setGroupDialog(true);
  };
  const saveGroup = () => {
    if (editGroup) {
      updateGroup.mutate({ groupId: editGroup.id, data: groupForm }, {
        onSuccess: () => { toast({ title: "Group updated" }); setGroupDialog(false); invalidateModifiers(); },
        onError: () => toast({ variant: "destructive", title: "Failed" }),
      });
    } else {
      createGroup.mutate({ data: { outletId, ...groupForm } }, {
        onSuccess: () => { toast({ title: "Modifier group created" }); setGroupDialog(false); invalidateModifiers(); },
        onError: () => toast({ variant: "destructive", title: "Failed" }),
      });
    }
  };
  const removeGroup = (id: number) => {
    if (!confirm("Delete this modifier group and all its options?")) return;
    deleteGroup.mutate({ groupId: id }, {
      onSuccess: invalidateModifiers,
      onError: () => toast({ variant: "destructive", title: "Failed" }),
    });
  };

  const openAddOption = (groupId: number) => {
    setOptionDialogGroupId(groupId);
    setOptionForm({ name: "", priceAdjustment: "0" });
  };
  const saveOption = () => {
    if (!optionDialogGroupId) return;
    addOption.mutate({
      groupId: optionDialogGroupId,
      data: { name: optionForm.name, priceAdjustment: parseFloat(optionForm.priceAdjustment) || 0 },
    }, {
      onSuccess: () => { toast({ title: "Option added" }); setOptionDialogGroupId(null); invalidateModifiers(); },
      onError: () => toast({ variant: "destructive", title: "Failed" }),
    });
  };
  const removeOption = (groupId: number, optionId: number) => {
    if (!confirm("Delete this option?")) return;
    deleteOption.mutate({ groupId, optionId }, {
      onSuccess: invalidateModifiers,
      onError: () => toast({ variant: "destructive", title: "Failed" }),
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-4 flex gap-4">
        {(["menu", "modifiers"] as Tab[]).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`py-3 text-sm font-medium capitalize border-b-2 transition-colors ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {tab === "modifiers" ? "Modifier Groups" : "Menu Items"}
          </button>
        ))}
      </div>

      {activeTab === "menu" ? (
        <div className="flex flex-1 overflow-hidden">
          <aside className="w-64 border-r border-border flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <span className="font-semibold text-sm">Categories</span>
              <Button size="icon" variant="ghost" onClick={openNewCat} data-testid="button-create-category"><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="flex-1 overflow-auto py-2">
              {categories?.map(cat => (
                <div key={cat.id} data-testid={`item-category-${cat.id}`}
                  className={`flex items-center justify-between px-4 py-2.5 cursor-pointer group transition-colors ${activeCatId === cat.id ? "bg-primary/10 text-primary" : "hover:bg-muted/50"}`}
                  onClick={() => setSelCat(cat.id)}>
                  <span className="text-sm font-medium truncate flex-1">{cat.name}</span>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                    <button onClick={e => { e.stopPropagation(); openEditCat(cat); }} data-testid={`button-edit-category-${cat.id}`} className="p-1 rounded hover:bg-muted"><Pencil className="w-3 h-3" /></button>
                    <button onClick={e => { e.stopPropagation(); removeCat(cat.id); }} data-testid={`button-delete-category-${cat.id}`} className="p-1 rounded hover:bg-muted text-destructive"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
              {!categories?.length && <p className="text-xs text-muted-foreground px-4 py-3">No categories yet</p>}
            </div>
          </aside>

          <main className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <span className="font-semibold">{categories?.find(c => c.id === activeCatId)?.name ?? "Select a category"}</span>
              {activeCatId && <Button size="sm" onClick={openNewItem} data-testid="button-create-item"><Plus className="w-4 h-4 mr-1" />Add Item</Button>}
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {catItems.map(item => (
                  <div key={item.id} data-testid={`card-item-${item.id}`} className={`border border-border rounded-xl p-4 bg-card space-y-2 ${!item.available ? "opacity-60" : ""}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{item.name}</p>
                        {item.description && <p className="text-xs text-muted-foreground truncate">{item.description}</p>}
                      </div>
                      <div className="flex gap-1 ml-2">
                        <button onClick={() => openRecipeDialog(item.id)} data-testid={`button-item-recipe-${item.id}`} title="Recipe / ingredients" className="p-1 rounded hover:bg-muted text-muted-foreground"><FlaskConical className="w-3.5 h-3.5" /></button>
                        <button onClick={() => openModGroupAssign(item.id)} data-testid={`button-item-modifiers-${item.id}`} title="Modifier groups" className="p-1 rounded hover:bg-muted text-muted-foreground"><Plus className="w-3.5 h-3.5" /></button>
                        <button onClick={() => openEditItem(item)} data-testid={`button-edit-item-${item.id}`} className="p-1 rounded hover:bg-muted"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => removeItem(item.id)} data-testid={`button-delete-item-${item.id}`} className="p-1 rounded hover:bg-muted text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{fmt(item.price)}</span>
                      <Switch checked={item.available} onCheckedChange={() => toggleAvailable(item)} data-testid={`switch-item-available-${item.id}`} />
                    </div>
                  </div>
                ))}
                {activeCatId && !catItems.length && <div className="col-span-3 text-center text-muted-foreground py-12 text-sm">No items in this category</div>}
              </div>
            </div>
          </main>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Modifier Groups</h2>
            <Button size="sm" onClick={openNewGroup} data-testid="button-create-modifier-group">
              <Plus className="w-4 h-4 mr-1" />New Group
            </Button>
          </div>

          {!modifierGroups?.length && (
            <div className="text-center text-muted-foreground py-16 text-sm">
              No modifier groups yet. Create one to let cashiers add extras (e.g. Size, Add-ons).
            </div>
          )}

          <div className="space-y-3 max-w-2xl">
            {modifierGroups?.map(group => (
              <div key={group.id} className="border border-border rounded-xl bg-card overflow-hidden" data-testid={`card-modifier-group-${group.id}`}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <button onClick={() => toggleExpand(group.id)} className="text-muted-foreground">
                    {expandedGroups.has(group.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{group.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {group.options.length} option{group.options.length !== 1 ? "s" : ""}
                      {group.required ? " · Required" : " · Optional"}
                      {group.multiSelect ? " · Multi-select" : " · Single-select"}
                    </p>
                  </div>
                  <button onClick={() => openEditGroup(group)} data-testid={`button-edit-modifier-group-${group.id}`} className="p-1 rounded hover:bg-muted"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => removeGroup(group.id)} data-testid={`button-delete-modifier-group-${group.id}`} className="p-1 rounded hover:bg-muted text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>

                {expandedGroups.has(group.id) && (
                  <div className="border-t border-border px-4 pb-3">
                    <div className="space-y-1 mt-2">
                      {group.options.map(opt => (
                        <div key={opt.id} className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-muted/50" data-testid={`option-${opt.id}`}>
                          <span>{opt.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-xs">
                              {Number(opt.priceAdjustment) === 0 ? "No charge" : `+${fmt(opt.priceAdjustment)}`}
                            </span>
                            <button onClick={() => removeOption(group.id, opt.id)} className="p-0.5 rounded hover:bg-muted text-destructive">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {!group.options.length && <p className="text-xs text-muted-foreground py-1">No options yet</p>}
                    </div>
                    <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={() => openAddOption(group.id)} data-testid={`button-add-option-${group.id}`}>
                      <Plus className="w-3 h-3 mr-1" />Add Option
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Dialog */}
      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editCat ? "Edit Category" : "New Category"}</DialogTitle></DialogHeader>
          <Label>Name</Label>
          <Input value={catName} onChange={e => setCatName(e.target.value)} data-testid="input-category-name" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialog(false)}>Cancel</Button>
            <Button onClick={saveCat} disabled={createCat.isPending || updateCat.isPending} data-testid="button-save-category">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Dialog */}
      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? "Edit Item" : "New Item"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} data-testid="input-item-name" /></div>
            <div><Label>Description</Label><Input value={itemForm.description} onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))} data-testid="input-item-description" /></div>
            <div><Label>Price</Label><Input type="number" step="0.01" value={itemForm.price} onChange={e => setItemForm(f => ({ ...f, price: e.target.value }))} data-testid="input-item-price" /></div>
            <div className="flex items-center gap-2"><Switch checked={itemForm.available} onCheckedChange={v => setItemForm(f => ({ ...f, available: v }))} data-testid="switch-item-available-form" /><Label>Available</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialog(false)}>Cancel</Button>
            <Button onClick={saveItem} disabled={createItem.isPending || updateItem.isPending} data-testid="button-save-item">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modifier Group Dialog */}
      <Dialog open={groupDialog} onOpenChange={setGroupDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editGroup ? "Edit Modifier Group" : "New Modifier Group"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Group Name</Label><Input value={groupForm.name} onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Size, Extras, Spice Level" data-testid="input-modifier-group-name" /></div>
            <div className="flex items-center gap-2">
              <Switch checked={groupForm.required} onCheckedChange={v => setGroupForm(f => ({ ...f, required: v }))} data-testid="switch-modifier-required" />
              <Label>Required selection</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={groupForm.multiSelect} onCheckedChange={v => setGroupForm(f => ({ ...f, multiSelect: v }))} data-testid="switch-modifier-multiselect" />
              <Label>Allow multiple options</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupDialog(false)}>Cancel</Button>
            <Button onClick={saveGroup} disabled={createGroup.isPending || updateGroup.isPending} data-testid="button-save-modifier-group">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Modifier Group Assignment Dialog */}
      <Dialog open={modGroupAssignDialog} onOpenChange={open => { if (!open) { setModGroupAssignDialog(false); setModGroupAssignItemId(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Modifier Groups to Item</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold mb-2">Currently assigned</p>
              {itemAssignedGroups && itemAssignedGroups.length > 0 ? (
                <div className="space-y-1">
                  {itemAssignedGroups.map((g: ModifierGroup) => (
                    <div key={g.id} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
                      <span>{g.name}</span>
                      <button onClick={() => handleUnassignGroup(g.id)} className="text-destructive hover:opacity-80" data-testid={`button-unassign-group-${g.id}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No modifier groups assigned yet.</p>
              )}
            </div>
            {modifierGroups && modifierGroups.filter(g => !itemAssignedGroups?.some((a: ModifierGroup) => a.id === g.id)).length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">Add modifier group</p>
                <div className="space-y-1">
                  {modifierGroups.filter(g => !itemAssignedGroups?.some((a: ModifierGroup) => a.id === g.id)).map(g => (
                    <button key={g.id} onClick={() => handleAssignGroup(g.id)}
                      className="w-full text-left text-sm px-3 py-2 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                      data-testid={`button-assign-group-${g.id}`}>
                      {g.name} <span className="text-muted-foreground text-xs">({g.options.length} options)</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => { setModGroupAssignDialog(false); setModGroupAssignItemId(null); }}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Option Dialog */}
      <Dialog open={optionDialogGroupId !== null} onOpenChange={open => { if (!open) setOptionDialogGroupId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Modifier Option</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Option Name</Label><Input value={optionForm.name} onChange={e => setOptionForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Large, Extra Cheese" data-testid="input-option-name" /></div>
            <div><Label>Price adjustment</Label><Input type="number" step="0.01" value={optionForm.priceAdjustment} onChange={e => setOptionForm(f => ({ ...f, priceAdjustment: e.target.value }))} placeholder="0.00" data-testid="input-option-price" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOptionDialogGroupId(null)}>Cancel</Button>
            <Button onClick={saveOption} disabled={addOption.isPending} data-testid="button-save-option">Add Option</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recipe / Ingredients Dialog */}
      <Dialog open={recipeDialog} onOpenChange={open => { if (!open) { setRecipeDialog(false); setRecipeItemId(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4" />
              Recipe — {items?.find(i => i.id === recipeItemId)?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <p className="text-xs text-muted-foreground">
              Define which inventory ingredients are consumed per portion. Stock is automatically deducted when an order is paid.
            </p>

            {/* Current recipe lines */}
            {recipeLines.length > 0 ? (
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground text-xs">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Ingredient</th>
                      <th className="text-right px-3 py-2 font-medium">Qty per portion</th>
                      <th className="px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recipeLines.map(line => (
                      <tr key={line.id}>
                        <td className="px-3 py-2.5 font-medium">{line.inventoryItemName}</td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground">
                          {Number(line.quantity).toLocaleString(undefined, { maximumFractionDigits: 4 })} {line.unit}
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          <button
                            onClick={() => removeRecipeLine(line.id)}
                            disabled={recipeRemoving === line.id}
                            className="p-1 rounded hover:bg-muted text-destructive disabled:opacity-40"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
                No ingredients defined yet. Add one below.
              </div>
            )}

            {/* Add ingredient form */}
            <div className="border border-border rounded-lg p-3 space-y-3 bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add Ingredient</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Inventory Item</Label>
                  <select
                    value={newIngredientId}
                    onChange={e => setNewIngredientId(e.target.value)}
                    className="w-full mt-1 h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Select…</option>
                    {inventoryItems
                      .filter(inv => !recipeLines.some(r => r.inventoryItemId === inv.id))
                      .map(inv => (
                        <option key={inv.id} value={inv.id}>{inv.name} ({inv.unit})</option>
                      ))}
                  </select>
                  {!inventoryItems.length && (
                    <p className="text-xs text-muted-foreground mt-1">Add inventory items first.</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs">
                    Qty per portion
                    {newIngredientId && (
                      <span className="text-muted-foreground ml-1">
                        ({inventoryItems.find(i => i.id === parseInt(newIngredientId))?.unit})
                      </span>
                    )}
                  </Label>
                  <Input
                    className="mt-1 h-8 text-sm"
                    type="number" step="0.0001" min="0.0001"
                    placeholder="e.g. 0.25"
                    value={newIngredientQty}
                    onChange={e => setNewIngredientQty(e.target.value)}
                  />
                </div>
              </div>
              <Button
                size="sm" className="w-full"
                onClick={addRecipeLine}
                disabled={!newIngredientId || !newIngredientQty || recipeAdding}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                {recipeAdding ? "Adding…" : "Add Ingredient"}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => { setRecipeDialog(false); setRecipeItemId(null); }}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
