import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  useListTables, getListTablesQueryKey, useCreateTable, useUpdateTable, useDeleteTable,
  useListAreas, getListAreasQueryKey, useCreateArea, useUpdateArea, useDeleteArea,
} from "@workspace/api-client-react";
import type { Table, Area } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Users, Clock, MapPin, Timer } from "lucide-react";

const STATUS_STYLE: Record<string, string> = {
  available: "border-green-400 bg-green-50 dark:bg-green-900/20 hover:border-green-500",
  occupied: "border-amber-400 bg-amber-50 dark:bg-amber-900/20",
  bill_requested: "border-red-400 bg-red-50 dark:bg-red-900/20",
};
const STATUS_DOT: Record<string, string> = {
  available: "bg-green-500",
  occupied: "bg-amber-500",
  bill_requested: "bg-red-500",
};

const AREA_COLORS = [
  "#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
];

type AreaForm = { name: string; type: "standard" | "timed"; hourlyRate: string; color: string; description: string };
type TableForm = { name: string; capacity: string; areaId: string };

// Live elapsed time for occupied timed-area tables
function useElapsedMinutes(openedAt?: string | null): number {
  const [mins, setMins] = useState(0);
  useEffect(() => {
    if (!openedAt) return;
    const update = () => setMins(Math.floor((Date.now() - new Date(openedAt).getTime()) / 60000));
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [openedAt]);
  return mins;
}

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function Tables() {
  const { auth } = useAuth();
  const outletId = auth!.outlet.id;
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  // ── Data ──────────────────────────────────────────────────────────────
  const { data: tables, isLoading: tablesLoading } = useListTables(
    { outletId },
    { query: { queryKey: getListTablesQueryKey({ outletId }), refetchInterval: 10000 } }
  );
  const { data: areas, isLoading: areasLoading } = useListAreas(
    { outletId },
    { query: { queryKey: getListAreasQueryKey({ outletId }) } }
  );

  // ── Table mutations ────────────────────────────────────────────────────
  const createTable = useCreateTable();
  const updateTable = useUpdateTable();
  const deleteTable = useDeleteTable();

  // ── Area mutations ─────────────────────────────────────────────────────
  const createArea = useCreateArea();
  const updateArea = useUpdateArea();
  const deleteArea = useDeleteArea();

  // ── Dialog state ───────────────────────────────────────────────────────
  const [tableDialog, setTableDialog] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [tableForm, setTableForm] = useState<TableForm>({ name: "", capacity: "4", areaId: "" });

  const [areaDialog, setAreaDialog] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [areaForm, setAreaForm] = useState<AreaForm>({ name: "", type: "standard", hourlyRate: "", color: AREA_COLORS[0], description: "" });

  // ── Invalidation ───────────────────────────────────────────────────────
  const invalidateTables = () => qc.invalidateQueries({ queryKey: getListTablesQueryKey({ outletId }) });
  const invalidateAreas = () => qc.invalidateQueries({ queryKey: getListAreasQueryKey({ outletId }) });

  // ── Table CRUD ─────────────────────────────────────────────────────────
  const openCreateTable = () => {
    setEditingTable(null);
    setTableForm({ name: "", capacity: "4", areaId: "" });
    setTableDialog(true);
  };
  const openEditTable = (t: Table) => {
    setEditingTable(t);
    setTableForm({ name: t.name, capacity: t.capacity.toString(), areaId: t.areaId?.toString() ?? "" });
    setTableDialog(true);
  };
  const saveTable = () => {
    const payload = {
      name: tableForm.name,
      capacity: parseInt(tableForm.capacity),
      areaId: tableForm.areaId ? parseInt(tableForm.areaId) : null,
    };
    if (editingTable) {
      updateTable.mutate({ id: editingTable.id, data: payload }, {
        onSuccess: () => { toast({ title: "Table updated" }); setTableDialog(false); invalidateTables(); },
        onError: () => toast({ variant: "destructive", title: "Failed to update table" }),
      });
    } else {
      createTable.mutate({ data: { outletId, ...payload, status: "available" } as any }, {
        onSuccess: () => { toast({ title: "Table created" }); setTableDialog(false); invalidateTables(); },
        onError: () => toast({ variant: "destructive", title: "Failed to create table" }),
      });
    }
  };
  const delTable = (id: number) => {
    if (!confirm("Delete this table?")) return;
    deleteTable.mutate({ id }, { onSuccess: invalidateTables, onError: () => toast({ variant: "destructive", title: "Failed" }) });
  };

  // ── Area CRUD ──────────────────────────────────────────────────────────
  const openCreateArea = () => {
    setEditingArea(null);
    setAreaForm({ name: "", type: "standard", hourlyRate: "", color: AREA_COLORS[0], description: "" });
    setAreaDialog(true);
  };
  const openEditArea = (a: Area) => {
    setEditingArea(a);
    setAreaForm({
      name: a.name,
      type: a.type as "standard" | "timed",
      hourlyRate: a.hourlyRate?.toString() ?? "",
      color: a.color ?? AREA_COLORS[0],
      description: a.description ?? "",
    });
    setAreaDialog(true);
  };
  const saveArea = () => {
    const payload = {
      name: areaForm.name,
      type: areaForm.type,
      hourlyRate: areaForm.type === "timed" && areaForm.hourlyRate ? parseFloat(areaForm.hourlyRate) : undefined,
      color: areaForm.color,
      description: areaForm.description || undefined,
    };
    if (editingArea) {
      updateArea.mutate({ id: editingArea.id, data: payload }, {
        onSuccess: () => { toast({ title: "Area updated" }); setAreaDialog(false); invalidateAreas(); invalidateTables(); },
        onError: () => toast({ variant: "destructive", title: "Failed to update area" }),
      });
    } else {
      createArea.mutate({ data: { outletId, ...payload } as any }, {
        onSuccess: () => { toast({ title: "Area created" }); setAreaDialog(false); invalidateAreas(); },
        onError: () => toast({ variant: "destructive", title: "Failed to create area" }),
      });
    }
  };
  const delArea = (id: number) => {
    if (!confirm("Delete this area? Tables in this area will become unassigned.")) return;
    deleteArea.mutate({ id }, { onSuccess: () => { invalidateAreas(); invalidateTables(); }, onError: () => toast({ variant: "destructive", title: "Failed" }) });
  };

  // ── Table click ────────────────────────────────────────────────────────
  const handleTableClick = (t: Table) => {
    if (t.status === "available") setLocation(`/pos?tableId=${t.id}`);
  };

  // ── Group tables by area ───────────────────────────────────────────────
  const areaMap = new Map(areas?.map(a => [a.id, a]) ?? []);
  const grouped: { area: Area | null; tables: Table[] }[] = [];
  if (areas) {
    for (const area of areas) {
      grouped.push({ area, tables: tables?.filter(t => t.areaId === area.id) ?? [] });
    }
  }
  const noAreaTables = tables?.filter(t => !t.areaId) ?? [];
  if (noAreaTables.length > 0) grouped.push({ area: null, tables: noAreaTables });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tables & Areas</h1>
          <p className="text-muted-foreground mt-1">Manage seating areas and tables</p>
        </div>
      </div>

      <Tabs defaultValue="tables">
        <TabsList>
          <TabsTrigger value="tables">Tables</TabsTrigger>
          <TabsTrigger value="areas">Areas</TabsTrigger>
        </TabsList>

        {/* ── TABLES TAB ─────────────────────────────────────────────── */}
        <TabsContent value="tables" className="space-y-6 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-4 text-sm">
              {Object.entries({ available: "Available", occupied: "Occupied", bill_requested: "Bill Requested" }).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${STATUS_DOT[k]}`} />
                  <span className="text-muted-foreground">{v}</span>
                </div>
              ))}
            </div>
            <Button onClick={openCreateTable} data-testid="button-create-table">
              <Plus className="w-4 h-4 mr-2" />Add Table
            </Button>
          </div>

          {tablesLoading ? (
            <div className="text-muted-foreground">Loading...</div>
          ) : grouped.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 text-sm">No tables configured</div>
          ) : (
            <div className="space-y-8">
              {grouped.map(({ area, tables: areaTables }) => (
                <div key={area?.id ?? "no-area"}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: area?.color ?? "#94a3b8" }} />
                    <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                      {area?.name ?? "No Area"}
                    </h2>
                    {area?.type === "timed" && (
                      <Badge variant="outline" className="gap-1 text-xs py-0 px-2">
                        <Timer className="w-2.5 h-2.5" />
                        {area.hourlyRate ? `$${Number(area.hourlyRate).toFixed(2)}/hr` : "Timed"}
                      </Badge>
                    )}
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">{areaTables.length} table{areaTables.length !== 1 ? "s" : ""}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                    {areaTables.map(t => (
                      <TableCard
                        key={t.id}
                        table={t}
                        area={t.areaId ? (areaMap.get(t.areaId) ?? null) : null}
                        onClick={() => handleTableClick(t)}
                        onEdit={() => openEditTable(t)}
                        onDelete={() => delTable(t.id)}
                      />
                    ))}
                    {areaTables.length === 0 && (
                      <div className="col-span-5 text-sm text-muted-foreground py-4 pl-2 italic">No tables in this area yet</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── AREAS TAB ──────────────────────────────────────────────── */}
        <TabsContent value="areas" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={openCreateArea}>
              <Plus className="w-4 h-4 mr-2" />Add Area
            </Button>
          </div>

          {areasLoading ? (
            <div className="text-muted-foreground">Loading...</div>
          ) : !areas?.length ? (
            <div className="text-center text-muted-foreground py-12 text-sm">
              No areas yet. Create areas like "Indoor", "Outdoor", "Karaoke Room" to organise your tables.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {areas.map(a => {
                const tableCount = tables?.filter(t => t.areaId === a.id).length ?? 0;
                return (
                  <div key={a.id} className="border rounded-xl p-5 space-y-3 bg-card">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
                        <div>
                          <p className="font-semibold">{a.name}</p>
                          {a.description && <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openEditArea(a)} className="p-1.5 rounded hover:bg-muted"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => delArea(a.id)} className="p-1.5 rounded hover:bg-muted text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{tableCount} table{tableCount !== 1 ? "s" : ""}</span>
                      </div>
                      {a.type === "timed" ? (
                        <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                          <Timer className="w-3.5 h-3.5" />
                          <span>{a.hourlyRate ? `$${Number(a.hourlyRate).toFixed(2)}/hr` : "Timed"}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Standard</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Table dialog ──────────────────────────────────────────────── */}
      <Dialog open={tableDialog} onOpenChange={setTableDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingTable ? "Edit Table" : "Add Table"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Table Name</Label>
              <Input value={tableForm.name} onChange={e => setTableForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Table 1, Booth 3, KTV Room 1" data-testid="input-table-name" />
            </div>
            <div>
              <Label>Seats</Label>
              <Input type="number" min={1} value={tableForm.capacity}
                onChange={e => setTableForm(f => ({ ...f, capacity: e.target.value }))} data-testid="input-table-capacity" />
            </div>
            <div>
              <Label>Area (optional)</Label>
              <Select
                value={tableForm.areaId || "none"}
                onValueChange={v => setTableForm(f => ({ ...f, areaId: v === "none" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No area</SelectItem>
                  {areas?.map(a => (
                    <SelectItem key={a.id} value={a.id.toString()}>
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: a.color }} />
                        {a.name}
                        {a.type === "timed" && <span className="text-xs text-muted-foreground ml-1">(timed)</span>}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTableDialog(false)}>Cancel</Button>
            <Button onClick={saveTable} disabled={createTable.isPending || updateTable.isPending} data-testid="button-save-table">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Area dialog ───────────────────────────────────────────────── */}
      <Dialog open={areaDialog} onOpenChange={setAreaDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingArea ? "Edit Area" : "Add Area"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Area Name</Label>
              <Input value={areaForm.name} onChange={e => setAreaForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Indoor, Outdoor, Karaoke Room" />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input value={areaForm.description} onChange={e => setAreaForm(f => ({ ...f, description: e.target.value }))}
                placeholder="e.g. Air-conditioned, rooftop, private dining" />
            </div>
            <div>
              <Label>Billing Type</Label>
              <Select value={areaForm.type} onValueChange={(v: "standard" | "timed") => setAreaForm(f => ({ ...f, type: v, hourlyRate: "" }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard — food only</SelectItem>
                  <SelectItem value="timed">Timed — hourly room rate + food</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {areaForm.type === "timed" && (
              <div>
                <Label>Hourly Rate</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input className="pl-7" type="number" min={0} step="0.01" value={areaForm.hourlyRate}
                    onChange={e => setAreaForm(f => ({ ...f, hourlyRate: e.target.value }))}
                    placeholder="0.00" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Charged per minute, calculated when the bill is generated.</p>
              </div>
            )}
            <div>
              <Label>Colour</Label>
              <div className="flex gap-2 flex-wrap mt-1">
                {AREA_COLORS.map(c => (
                  <button key={c} onClick={() => setAreaForm(f => ({ ...f, color: c }))}
                    className={`w-7 h-7 rounded-full transition-all ${areaForm.color === c ? "ring-2 ring-offset-2 ring-primary scale-110" : ""}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAreaDialog(false)}>Cancel</Button>
            <Button onClick={saveArea} disabled={createArea.isPending || updateArea.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Table card component ─────────────────────────────────────────────────────
interface TableCardProps {
  table: Table;
  area: Area | null;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function TableCard({ table, area, onClick, onEdit, onDelete }: TableCardProps) {
  const isOccupied = table.status === "occupied" || table.status === "bill_requested";
  const isTimedArea = area?.type === "timed";
  const openedAt = (table as any).tableOpenedAt as string | null;
  const elapsedMins = useElapsedMinutes(isOccupied && isTimedArea ? openedAt : null);

  return (
    <div data-testid={`card-table-${table.id}`}
      className={`border-2 rounded-xl p-4 transition-all ${STATUS_STYLE[table.status]} ${table.status === "available" ? "cursor-pointer" : "cursor-default"}`}
      onClick={onClick}>

      {/* Top row: status dot + edit/delete */}
      <div className="flex items-center justify-between mb-2">
        <div className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[table.status]}`} />
        <div className="flex gap-0.5">
          <button onClick={e => { e.stopPropagation(); onEdit(); }} data-testid={`button-edit-table-${table.id}`}
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10"><Pencil className="w-3 h-3" /></button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }} data-testid={`button-delete-table-${table.id}`}
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-destructive"><Trash2 className="w-3 h-3" /></button>
        </div>
      </div>

      {/* Name + timer on the same row */}
      <div className="flex items-center gap-2 flex-wrap">
        <p className="font-bold text-lg leading-none">{table.name}</p>
        {isTimedArea && isOccupied && (
          <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
            <Timer className="w-2.5 h-2.5" />
            {elapsedMins > 0 ? formatDuration(elapsedMins) : "0m"}
          </span>
        )}
      </div>

      {area && (
        <div className="flex items-center gap-1 mt-1.5">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: area.color }} />
          <span className="text-xs text-muted-foreground">{area.name}</span>
          {isTimedArea && area.hourlyRate && (
            <span className="text-xs text-muted-foreground">· ${Number(area.hourlyRate).toFixed(0)}/hr</span>
          )}
        </div>
      )}

      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
        <Users className="w-3 h-3" />{table.capacity} seats
      </div>

      <p className="text-xs mt-1 capitalize text-muted-foreground">{table.status.replace("_", " ")}</p>
    </div>
  );
}
