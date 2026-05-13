import { Feather } from "@expo/vector-icons";
import * as Print from "expo-print";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useListOrders, useGetOrder } from "@workspace/api-client-react";
import type { ListOrdersStatus } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

const FILTERS = [
  { label: "All", value: undefined },
  { label: "Open", value: "open" },
  { label: "Billed", value: "billed" },
  { label: "Paid", value: "paid" },
  { label: "Cancelled", value: "cancelled" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  open: "#f59e0b",
  billed: "#3b82f6",
  paid: "#22c55e",
  cancelled: "#ef4444",
};

const PAYMENT_ICONS: Record<string, string> = {
  cash: "dollar-sign",
  bank_transfer: "credit-card",
  credit: "user",
};

function fmt(n?: number | string | null) {
  if (n == null) return "—";
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function StatusBadge({ status, colors }: { status: string; colors: any }) {
  const color = STATUS_COLORS[status] ?? "#888";
  return (
    <View style={[s.statusBadge, { backgroundColor: `${color}20` }]}>
      <Text style={[s.statusText, { color }]}>
        {status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}
      </Text>
    </View>
  );
}

function Row({ label, value, bold, large, color }: { label: string; value: string; bold?: boolean; large?: boolean; color?: string }) {
  const colors = useColors();
  return (
    <View style={s.summaryRow}>
      <Text style={[s.summaryLabel, { color: colors.mutedForeground }, large && { fontSize: 15, fontWeight: "700", color: colors.foreground }]}>{label}</Text>
      <Text style={[s.summaryValue, { color: color ?? colors.foreground }, bold && { fontWeight: "700" }, large && { fontSize: 15, fontWeight: "800" }]}>{value}</Text>
    </View>
  );
}

function buildReceiptHtml(order: any, outletName: string): string {
  const items: any[] = order?.items ?? [];
  const payments: any[] = order?.payments ?? [];
  const subtotal = parseFloat(order?.subtotal ?? "0");
  const discount = parseFloat(order?.discountAmount ?? "0");
  const tax = parseFloat(order?.taxAmount ?? "0");
  const timeFee = parseFloat(order?.timeFee ?? "0");
  const total = parseFloat(order?.total ?? "0");
  const tableName = order?.tableName || `Table ${order?.tableId}`;

  const dt = order?.createdAt ? new Date(order.createdAt) : new Date();
  const dateStr = dt.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
  const timeStr = dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

  const DASH = "--------------------------------------------------------";
  const STAR = "************************************";

  const itemRows = items.map((item: any) => {
    const lineTotal = fmt(parseFloat(item.total ?? "0"));
    const mods = (item.modifiers ?? [])
      .map((m: any) => `<div class="indent">+ ${m.name}</div>`)
      .join("");
    const notes = item.notes ? `<div class="indent note">${item.notes}</div>` : "";
    return `
      <div class="item-row">
        <span class="item-qty">${item.quantity}x</span>
        <span class="item-name">${item.menuItemName}</span>
        <span class="item-price">${lineTotal}</span>
      </div>
      ${mods}${notes}`;
  }).join("");

  const paymentBlocks = payments.map((p: any) => {
    const method = p.method === "bank_transfer"
      ? "BANK TRANSFER"
      : p.method.toUpperCase();
    return `
      <div class="two-col"><span>PAYMENT:</span><span>${method}</span></div>
      <div class="two-col"><span>AMOUNT:</span><span>${fmt(p.amount)}</span></div>`;
  }).join(`<div class="dash">${DASH}</div>`);

  const statusLabel = (order?.status ?? "").toUpperCase();

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 13px;
    color: #111;
    padding: 20px 18px;
    max-width: 360px;
    margin: 0 auto;
    line-height: 1.5;
  }
  .top-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 14px; }
  .center { text-align: center; }
  .outlet-name { font-size: 15px; font-weight: bold; margin-bottom: 2px; }
  .outlet-sub { font-size: 12px; margin-bottom: 2px; }
  .terminal { font-size: 12px; text-transform: uppercase; margin: 10px 0 4px; }
  .order-num { font-size: 19px; font-weight: bold; letter-spacing: 0.5px; margin: 6px 0 10px; }
  .payment-hdr { font-size: 22px; font-weight: bold; margin: 8px 0 14px; letter-spacing: 1px; }
  .dash { font-size: 11px; color: #555; margin: 10px 0; overflow: hidden; white-space: nowrap; }
  .item-row { display: flex; align-items: baseline; gap: 4px; margin: 4px 0; }
  .item-qty  { flex-shrink: 0; width: 26px; }
  .item-name { flex: 1; }
  .item-price { flex-shrink: 0; font-weight: 600; }
  .indent { padding-left: 30px; font-size: 11px; color: #555; }
  .note { font-style: italic; }
  .summary-row { display: flex; justify-content: flex-end; gap: 8px; margin: 3px 0; font-size: 13px; }
  .summary-row .slabel { text-align: right; min-width: 180px; text-transform: uppercase; }
  .two-col { display: flex; justify-content: space-between; margin: 3px 0; font-size: 12px; text-transform: uppercase; }
  .approved { text-align: center; font-weight: bold; font-size: 13px; margin: 8px 0; }
  .stars { text-align: center; font-size: 11px; color: #333; overflow: hidden; white-space: nowrap; margin: 6px 0 2px; }
  .amount-paid-label { font-size: 16px; font-weight: bold; text-align: center; text-transform: uppercase; margin: 4px 0 0; }
  .amount-paid-value { font-size: 22px; font-weight: bold; text-align: center; margin: 2px 0 4px; }
  .footer { text-align: center; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-top: 10px; }
</style>
</head>
<body>

  <!-- Date / Time row -->
  <div class="top-row">
    <span>${dateStr}</span>
    <span>${timeStr}</span>
  </div>

  <!-- Outlet header -->
  <div class="center">
    <div class="outlet-name">${outletName}</div>
    <div class="outlet-sub terminal">TABLE NAME: ${tableName}</div>
    <div class="order-num">ORDER #: ${order?.id}</div>
    <div class="payment-hdr">RECEIPT</div>
  </div>

  <!-- Items -->
  <div>${itemRows}</div>
  <div class="dash">${DASH}</div>

  <!-- Summary -->
  <div class="summary-row"><span class="slabel">SUBTOTAL:</span><span>${fmt(subtotal)}</span></div>
  ${discount > 0 ? `<div class="summary-row"><span class="slabel">DISCOUNT:</span><span>-${fmt(discount)}</span></div>` : ""}
  ${tax > 0 ? `<div class="summary-row"><span class="slabel">TAX:</span><span>${fmt(tax)}</span></div>` : ""}
  ${timeFee > 0 ? `<div class="summary-row"><span class="slabel">TIME FEE:</span><span>${fmt(timeFee)}</span></div>` : ""}
  <div class="summary-row" style="font-weight:bold;font-size:14px;margin-top:4px">
    <span class="slabel">TOTAL:</span><span>${fmt(total)}</span>
  </div>

  ${payments.length > 0 ? `
  <div class="dash">${DASH}</div>
  ${paymentBlocks}
  <div class="approved">*** ${statusLabel} ***</div>
  <div class="dash">${DASH}</div>` : ""}

  <!-- Amount paid box -->
  <div class="stars">${STAR}</div>
  <div class="amount-paid-label">AMOUNT PAID:</div>
  <div class="amount-paid-value">${fmt(total)}</div>
  <div class="stars">${STAR}</div>

  <div class="footer">CUSTOMER COPY</div>

</body>
</html>`;
}

function OrderDetailSheet({
  orderId,
  visible,
  onClose,
  outletName,
}: {
  orderId: number | null;
  visible: boolean;
  onClose: () => void;
  outletName: string;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(600)).current;
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 600, duration: 220, useNativeDriver: true }).start();
    }
  }, [visible, slideAnim]);

  const { data: order, isLoading } = useGetOrder(orderId!, {
    query: { enabled: !!orderId },
  });

  const handlePrint = useCallback(async () => {
    if (!order) return;
    setPrinting(true);
    try {
      await Print.printAsync({ html: buildReceiptHtml(order, outletName) });
    } catch {
      // user cancelled or printer unavailable — silently ignore
    } finally {
      setPrinting(false);
    }
  }, [order, outletName]);

  const items: any[] = (order as any)?.items ?? [];
  const payments: any[] = (order as any)?.payments ?? [];

  const subtotal = parseFloat((order as any)?.subtotal ?? "0");
  const discount = parseFloat((order as any)?.discountAmount ?? "0");
  const tax = parseFloat((order as any)?.taxAmount ?? "0");
  const timeFee = parseFloat((order as any)?.timeFee ?? "0");
  const total = parseFloat((order as any)?.total ?? "0");

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={s.backdrop} onPress={onClose} />
      <Animated.View
        style={[
          s.sheet,
          {
            backgroundColor: colors.background,
            paddingBottom: insets.bottom + 8,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Handle */}
        <View style={s.handleWrap}>
          <View style={[s.handle, { backgroundColor: colors.border }]} />
        </View>

        {/* Sheet header */}
        <View style={[s.sheetHeader, { borderBottomColor: colors.border }]}>
          <View style={s.sheetHeaderLeft}>
            <Text style={[s.sheetTitle, { color: colors.foreground }]}>
              Order #{orderId}
            </Text>
            {order && (
              <Text style={[s.sheetSub, { color: colors.mutedForeground }]}>
                {(order as any).tableName || `Table ${order.tableId}`}
              </Text>
            )}
          </View>
          <View style={s.sheetHeaderRight}>
            {order && <StatusBadge status={order.status} colors={colors} />}
            <Pressable
              onPress={handlePrint}
              disabled={printing || isLoading || !order}
              style={[s.printBtn, { backgroundColor: colors.accent, opacity: printing || isLoading || !order ? 0.5 : 1 }]}
            >
              {printing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="printer" size={15} color="#fff" />
              )}
            </Pressable>
            <Pressable onPress={onClose} style={[s.closeBtn, { backgroundColor: colors.secondary }]}>
              <Feather name="x" size={16} color={colors.foreground} />
            </Pressable>
          </View>
        </View>

        {isLoading ? (
          <View style={s.sheetCenter}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={s.sheetBody} showsVerticalScrollIndicator={false}>

            {/* Items */}
            <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>ITEMS</Text>
            <View style={[s.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {items.length === 0 ? (
                <Text style={[s.emptyNote, { color: colors.mutedForeground }]}>No items</Text>
              ) : (
                items.map((item: any, idx: number) => (
                  <View key={item.id}>
                    {idx > 0 && <View style={[s.itemDivider, { backgroundColor: colors.border }]} />}
                    <View style={s.itemRow}>
                      <View style={[s.qtyBubble, { backgroundColor: colors.secondary }]}>
                        <Text style={[s.qtyText, { color: colors.foreground }]}>{item.quantity}</Text>
                      </View>
                      <View style={s.itemInfo}>
                        <Text style={[s.itemName, { color: colors.foreground }]}>{item.menuItemName}</Text>
                        {item.notes && (
                          <Text style={[s.itemNotes, { color: colors.mutedForeground }]}>{item.notes}</Text>
                        )}
                        {item.modifiers?.map((m: any) => (
                          <Text key={m.id} style={[s.modifierText, { color: colors.mutedForeground }]}>
                            + {m.name} {parseFloat(m.priceAdjustment) !== 0 ? `(${parseFloat(m.priceAdjustment) > 0 ? "+" : ""}${fmt(m.priceAdjustment)})` : ""}
                          </Text>
                        ))}
                      </View>
                      <Text style={[s.itemTotal, { color: colors.foreground }]}>{fmt(item.total)}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Totals */}
            <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>SUMMARY</Text>
            <View style={[s.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Row label="Subtotal" value={fmt(subtotal)} />
              {discount > 0 && <Row label="Discount" value={`-${fmt(discount)}`} color="#22c55e" />}
              {tax > 0 && <Row label="Tax" value={fmt(tax)} />}
              {timeFee > 0 && <Row label="Time Fee" value={fmt(timeFee)} />}
              <View style={[s.totalDivider, { backgroundColor: colors.border }]} />
              <Row label="Total" value={fmt(total)} bold large />
            </View>

            {/* Payments */}
            {payments.length > 0 && (
              <>
                <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>PAYMENTS</Text>
                <View style={[s.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {payments.map((p: any, idx: number) => (
                    <View key={p.id}>
                      {idx > 0 && <View style={[s.itemDivider, { backgroundColor: colors.border }]} />}
                      <View style={s.paymentRow}>
                        <View style={[s.payIconWrap, { backgroundColor: colors.secondary }]}>
                          <Feather
                            name={(PAYMENT_ICONS[p.method] ?? "dollar-sign") as any}
                            size={14}
                            color={colors.foreground}
                          />
                        </View>
                        <Text style={[s.payMethod, { color: colors.foreground }]}>
                          {p.method === "bank_transfer" ? "Bank Transfer" : p.method.charAt(0).toUpperCase() + p.method.slice(1)}
                        </Text>
                        <Text style={[s.payAmount, { color: colors.foreground }]}>{fmt(p.amount)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Created at */}
            {order?.createdAt && (
              <Text style={[s.createdAt, { color: colors.mutedForeground }]}>
                Opened {new Date(order.createdAt as string).toLocaleString()}
              </Text>
            )}
          </ScrollView>
        )}
      </Animated.View>
    </Modal>
  );
}

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { outlet, staff } = useAuth();
  const [statusFilter, setStatusFilter] = useState<ListOrdersStatus | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const { data: ordersResponse, isLoading, refetch } = useListOrders(
    {
      outletId: staff?.role === "super_admin" ? undefined : outlet?.id,
      status: statusFilter,
      limit: 100,
    },
    { query: { refetchInterval: 5000 } }
  );
  const orders = ordersResponse?.orders;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const openDetail = useCallback((id: number) => {
    setSelectedOrderId(id);
    setSheetVisible(true);
  }, []);

  const closeDetail = useCallback(() => {
    setSheetVisible(false);
  }, []);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[s.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: topPad + 12, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={[s.title, { color: colors.foreground }]}>Orders</Text>
        <Text style={[s.subtitle, { color: colors.mutedForeground }]}>
          {staff?.role === "super_admin" ? "All outlets" : outlet?.name ?? ""}
        </Text>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[s.filterBar, { borderBottomColor: colors.border, backgroundColor: colors.card }]}
        contentContainerStyle={s.filterBarContent}
      >
        {FILTERS.map((f) => {
          const active = statusFilter === f.value;
          return (
            <Pressable
              key={f.label}
              onPress={() => setStatusFilter(f.value as any)}
              style={[s.chip, { borderColor: active ? colors.accent : colors.border }, active && { backgroundColor: colors.accent }]}
            >
              <Text style={[s.chipText, { color: active ? "#fff" : colors.mutedForeground }]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {isLoading && !orders ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !orders?.length ? (
        <View style={s.center}>
          <Feather name="inbox" size={40} color={colors.mutedForeground} />
          <Text style={[s.emptyText, { color: colors.mutedForeground }]}>No orders found</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => String(o.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100, padding: 14, gap: 10 }}
          renderItem={({ item: o }) => {
            const statusColor = STATUS_COLORS[o.status] ?? colors.mutedForeground;
            return (
              <Pressable
                onPress={() => openDetail(o.id)}
                style={({ pressed }) => [
                  s.orderCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  pressed && { opacity: 0.75 },
                ]}
              >
                <View style={s.orderTop}>
                  <View style={s.orderLeft}>
                    <Text style={[s.orderNum, { color: colors.foreground }]}>#{o.id}</Text>
                    <Text style={[s.orderTable, { color: colors.mutedForeground }]}>
                      {(o as any).tableName ?? `Table ${o.tableId}`}
                    </Text>
                  </View>
                  <View style={s.orderRight}>
                    <View style={[s.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                      <Text style={[s.statusText, { color: statusColor }]}>
                        {o.status.charAt(0).toUpperCase() + o.status.slice(1).replace("_", " ")}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={14} color={colors.mutedForeground} style={{ marginLeft: 4 }} />
                  </View>
                </View>
                <View style={[s.orderDivider, { backgroundColor: colors.border }]} />
                <View style={s.orderBottom}>
                  <Text style={[s.orderTotal, { color: colors.foreground }]}>
                    {fmt(o.total)}
                  </Text>
                  <Text style={[s.orderTime, { color: colors.mutedForeground }]}>
                    {o.createdAt ? timeAgo(o.createdAt as string) : ""}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      <OrderDetailSheet
        orderId={selectedOrderId}
        visible={sheetVisible}
        onClose={closeDetail}
        outletName={outlet?.name ?? "Restaurant"}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  header: { borderBottomWidth: 1, paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: "800" },
  subtitle: { fontSize: 13, marginTop: 2 },
  filterBar: { flexGrow: 0, borderBottomWidth: 1 },
  filterBarContent: { paddingHorizontal: 14, paddingVertical: 10, gap: 8, flexDirection: "row" },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5 },
  chipText: { fontSize: 13, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyText: { fontSize: 15 },
  orderCard: { borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  orderTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
  orderLeft: { gap: 2 },
  orderRight: { flexDirection: "row", alignItems: "center" },
  orderNum: { fontSize: 16, fontWeight: "700" },
  orderTable: { fontSize: 13 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: "700" },
  orderDivider: { height: 1 },
  orderBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10 },
  orderTotal: { fontSize: 16, fontWeight: "800" },
  orderTime: { fontSize: 12 },

  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "88%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 24,
  },
  handleWrap: { alignItems: "center", paddingTop: 10, paddingBottom: 4 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  sheetHeaderLeft: { gap: 2 },
  sheetHeaderRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  sheetTitle: { fontSize: 20, fontWeight: "800" },
  sheetSub: { fontSize: 13 },
  printBtn: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  closeBtn: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  sheetCenter: { padding: 40, alignItems: "center" },
  sheetBody: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, gap: 8 },

  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginTop: 8, marginBottom: 4, marginLeft: 4 },
  section: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  emptyNote: { padding: 16, textAlign: "center", fontSize: 14 },

  itemRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12 },
  itemDivider: { height: 1 },
  qtyBubble: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", marginTop: 1 },
  qtyText: { fontSize: 13, fontWeight: "700" },
  itemInfo: { flex: 1, gap: 2 },
  itemName: { fontSize: 14, fontWeight: "600" },
  itemNotes: { fontSize: 12 },
  modifierText: { fontSize: 12 },
  itemTotal: { fontSize: 14, fontWeight: "700", marginTop: 2 },

  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 9 },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14 },
  totalDivider: { height: 1, marginHorizontal: 14, marginVertical: 2 },

  paymentRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 11 },
  payIconWrap: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  payMethod: { flex: 1, fontSize: 14, fontWeight: "600" },
  payAmount: { fontSize: 14, fontWeight: "700" },

  createdAt: { fontSize: 12, textAlign: "center", marginTop: 8 },
});
