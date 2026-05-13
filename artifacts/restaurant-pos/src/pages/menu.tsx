import { useState } from "react";
import {
  useListCategories, getListCategoriesQueryKey, useCreateCategory, useUpdateCategory, useDeleteCategory,
  useListMenuItems, getListMenuItemsQueryKey, useCreateMenuItem, useUpdateMenuItem, useDeleteMenuItem,
} from "@workspace/api-client-react";
import type { MenuCategory, MenuItem } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

type ItemForm = { name: string; description: string; price: string; available: boolean };

export default function Menu() {
  const { auth } = useAuth();
  const outletId = auth!.outlet.id;
  const qc = useQueryClient();
  const { toast } = useToast();

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
      createItem.mutate({ data: { ...itemData, categoryId: activeCatId, outletId } }, {
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

  return (
    <div className="flex h-full">
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
                    <button onClick={() => openEditItem(item)} data-testid={`button-edit-item-${item.id}`} className="p-1 rounded hover:bg-muted"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => removeItem(item.id)} data-testid={`button-delete-item-${item.id}`} className="p-1 rounded hover:bg-muted text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">${Number(item.price).toFixed(2)}</span>
                  <Switch checked={item.available} onCheckedChange={() => toggleAvailable(item)} data-testid={`switch-item-available-${item.id}`} />
                </div>
              </div>
            ))}
            {activeCatId && !catItems.length && <div className="col-span-3 text-center text-muted-foreground py-12 text-sm">No items in this category</div>}
          </div>
        </div>
      </main>

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
    </div>
  );
}
