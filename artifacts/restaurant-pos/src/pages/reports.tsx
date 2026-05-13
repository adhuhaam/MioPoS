import { useState } from "react";
import { useGetOutletReport, getGetOutletReportQueryKey, useGetConsolidatedReport, getGetConsolidatedReportQueryKey, useListOutlets, getListOutletsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "../lib/auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, DollarSign, ShoppingBag, BarChart2 } from "lucide-react";

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="border border-border rounded-xl p-5 bg-card space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

export default function Reports() {
  const { auth } = useAuth();
  const isSuperAdmin = auth?.staff.role === "super_admin";
  const [activeTab, setActiveTab] = useState<"outlet" | "consolidated">(isSuperAdmin ? "consolidated" : "outlet");
  const [period, setPeriod] = useState<"today" | "week" | "month">("today");
  const [outletId, setOutletId] = useState<number | null>(isSuperAdmin ? null : auth!.outlet.id);

  const { data: outlets } = useListOutlets({ query: { queryKey: getListOutletsQueryKey() } });

  const { data: outletReport, isLoading: loadingOutlet } = useGetOutletReport(
    { outletId: outletId as number, period },
    {
      query: {
        enabled: activeTab === "outlet" && !!outletId,
        queryKey: getGetOutletReportQueryKey({ outletId: outletId as number, period })
      }
    }
  );

  const { data: consolidated, isLoading: loadingConsolidated } = useGetConsolidatedReport(
    { period },
    {
      query: {
        enabled: activeTab === "consolidated",
        queryKey: getGetConsolidatedReportQueryKey({ period })
      }
    }
  );

  const periods = [{ value: "today", label: "Today" }, { value: "week", label: "Last 7 days" }, { value: "month", label: "Last 30 days" }];

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-1">Revenue and performance analytics</p>
        </div>
        <Select value={period} onValueChange={v => setPeriod(v as any)}>
          <SelectTrigger className="w-40" data-testid="select-period"><SelectValue /></SelectTrigger>
          <SelectContent>
            {periods.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isSuperAdmin && (
        <div className="flex border-b border-border gap-1">
          {(["consolidated", "outlet"] as const).map(tab => (
            <button key={tab} data-testid={`tab-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${activeTab === tab ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {tab === "consolidated" ? "Consolidated" : "Per Outlet"}
            </button>
          ))}
        </div>
      )}

      {activeTab === "outlet" && (
        <div className="space-y-6">
          {isSuperAdmin && (
            <Select value={outletId?.toString() ?? ""} onValueChange={v => setOutletId(parseInt(v))}>
              <SelectTrigger className="w-64" data-testid="select-outlet-report"><SelectValue placeholder="Select outlet..." /></SelectTrigger>
              <SelectContent>
                {outlets?.map(o => <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          {loadingOutlet ? <div className="text-muted-foreground">Loading...</div> : outletReport ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard icon={DollarSign} label="Revenue" value={`$${(outletReport as any).revenue?.toFixed(2) ?? "0.00"}`} />
                <StatCard icon={ShoppingBag} label="Orders" value={(outletReport as any).orderCount?.toString() ?? "0"} />
                <StatCard icon={TrendingUp} label="Avg Order Value" value={`$${(outletReport as any).avgOrderValue?.toFixed(2) ?? "0.00"}`} />
              </div>

              {(outletReport as any).dailyRevenue?.length > 0 && (
                <div className="border border-border rounded-xl p-5 bg-card">
                  <h3 className="font-semibold mb-4">Daily Revenue</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={(outletReport as any).dailyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: any) => [`$${v.toFixed(2)}`, "Revenue"]} />
                      <Bar dataKey="revenue" className="fill-primary" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {(outletReport as any).topItems?.length > 0 && (
                <div className="border border-border rounded-xl p-5 bg-card">
                  <h3 className="font-semibold mb-4">Top Items</h3>
                  <div className="space-y-2">
                    {(outletReport as any).topItems.map((item: any, i: number) => (
                      <div key={i} data-testid={`row-top-item-${i}`} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                          <span className="w-5 text-right text-muted-foreground font-mono">{i + 1}</span>
                          <span>{item.name}</span>
                        </div>
                        <div className="flex gap-6 text-muted-foreground">
                          <span>{item.count} sold</span>
                          <span className="font-semibold text-foreground">${item.revenue.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            !loadingOutlet && <div className="text-center text-muted-foreground py-12">Select an outlet to view the report</div>
          )}
        </div>
      )}

      {activeTab === "consolidated" && (
        <div className="space-y-6">
          {loadingConsolidated ? <div className="text-muted-foreground">Loading...</div> : consolidated ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard icon={DollarSign} label="Total Revenue" value={`$${(consolidated as any).totalRevenue?.toFixed(2) ?? "0.00"}`} />
                <StatCard icon={ShoppingBag} label="Total Orders" value={(consolidated as any).totalOrders?.toString() ?? "0"} />
                <StatCard icon={TrendingUp} label="Avg Order Value" value={`$${(consolidated as any).avgOrderValue?.toFixed(2) ?? "0.00"}`} />
              </div>

              {(consolidated as any).dailyRevenue?.length > 0 && (
                <div className="border border-border rounded-xl p-5 bg-card">
                  <h3 className="font-semibold mb-4">Daily Revenue (All Outlets)</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={(consolidated as any).dailyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: any) => [`$${v.toFixed(2)}`, "Revenue"]} />
                      <Bar dataKey="revenue" className="fill-primary" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="border border-border rounded-xl overflow-hidden bg-card">
                <div className="px-5 py-3 border-b border-border">
                  <h3 className="font-semibold">Outlet Breakdown</h3>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-5 py-2.5 font-medium text-muted-foreground">Outlet</th>
                      <th className="text-right px-5 py-2.5 font-medium text-muted-foreground">Orders</th>
                      <th className="text-right px-5 py-2.5 font-medium text-muted-foreground">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(consolidated as any).outletBreakdown?.map((row: any) => (
                      <tr key={row.outletId} data-testid={`row-outlet-breakdown-${row.outletId}`} className="border-t border-border">
                        <td className="px-5 py-3 font-medium">{row.outletName}</td>
                        <td className="px-5 py-3 text-right text-muted-foreground">{row.orderCount}</td>
                        <td className="px-5 py-3 text-right font-semibold">${row.revenue.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
