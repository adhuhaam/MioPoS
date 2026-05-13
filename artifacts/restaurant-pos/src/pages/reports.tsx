import { useState } from "react";
import type { ElementType } from "react";
import { useGetOutletReport, getGetOutletReportQueryKey, useGetConsolidatedReport, getGetConsolidatedReportQueryKey, useListOutlets, getListOutletsQueryKey } from "@workspace/api-client-react";
import type { OutletReport, ConsolidatedReport, GetOutletReportPeriod, GetConsolidatedReportPeriod } from "@workspace/api-client-react";
import { useAuth } from "../lib/auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, DollarSign, ShoppingBag } from "lucide-react";

function StatCard({ icon: Icon, label, value }: { icon: ElementType; label: string; value: string }) {
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

const PERIOD_OPTIONS: { value: GetOutletReportPeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "Last 30 days" },
];

export default function Reports() {
  const { auth } = useAuth();
  const isSuperAdmin = auth?.staff.role === "super_admin";
  const [activeTab, setActiveTab] = useState<"outlet" | "consolidated">(isSuperAdmin ? "consolidated" : "outlet");
  const [period, setPeriod] = useState<GetOutletReportPeriod>("today");
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
    { period: period as GetConsolidatedReportPeriod },
    {
      query: {
        enabled: activeTab === "consolidated",
        queryKey: getGetConsolidatedReportQueryKey({ period: period as GetConsolidatedReportPeriod })
      }
    }
  );

  const report = outletReport as OutletReport | undefined;
  const cons = consolidated as ConsolidatedReport | undefined;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-1">Revenue and performance analytics</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as GetOutletReportPeriod)}>
          <SelectTrigger className="w-40" data-testid="select-period"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
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

          {loadingOutlet ? <div className="text-muted-foreground">Loading...</div> : report ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard icon={DollarSign} label="Revenue" value={`$${report.totalRevenue.toFixed(2)}`} />
                <StatCard icon={ShoppingBag} label="Orders" value={report.totalOrders.toString()} />
                <StatCard icon={TrendingUp} label="Avg Order Value" value={`$${report.averageOrderValue.toFixed(2)}`} />
              </div>

              {report.dailyRevenue.length > 0 && (
                <div className="border border-border rounded-xl p-5 bg-card">
                  <h3 className="font-semibold mb-4">Daily Revenue</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={report.dailyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, "Revenue"]} />
                      <Bar dataKey="revenue" className="fill-primary" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {report.topItems.length > 0 && (
                <div className="border border-border rounded-xl p-5 bg-card">
                  <h3 className="font-semibold mb-4">Top Items</h3>
                  <div className="space-y-2">
                    {report.topItems.map((item, i) => (
                      <div key={i} data-testid={`row-top-item-${i}`} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                          <span className="w-5 text-right text-muted-foreground font-mono">{i + 1}</span>
                          <span>{item.menuItemName}</span>
                        </div>
                        <div className="flex gap-6 text-muted-foreground">
                          <span>{item.quantitySold} sold</span>
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
          {loadingConsolidated ? <div className="text-muted-foreground">Loading...</div> : cons ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard icon={DollarSign} label="Total Revenue" value={`$${cons.totalRevenue.toFixed(2)}`} />
                <StatCard icon={ShoppingBag} label="Total Orders" value={cons.totalOrders.toString()} />
                <StatCard icon={TrendingUp} label="Avg Order Value" value={`$${(cons.averageOrderValue ?? 0).toFixed(2)}`} />
              </div>

              {cons.dailyRevenue && cons.dailyRevenue.length > 0 && (
                <div className="border border-border rounded-xl p-5 bg-card">
                  <h3 className="font-semibold mb-4">Daily Revenue (All Outlets)</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={cons.dailyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, "Revenue"]} />
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
                    {cons.outletBreakdown.map((row) => (
                      <tr key={row.outletId} data-testid={`row-outlet-breakdown-${row.outletId}`} className="border-t border-border">
                        <td className="px-5 py-3 font-medium">{row.outletName}</td>
                        <td className="px-5 py-3 text-right text-muted-foreground">{row.orders}</td>
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
