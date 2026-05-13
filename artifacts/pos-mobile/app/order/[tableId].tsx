import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";

import {
  useListOrders,
  useGetOrder,
  useCreateOrder,
  useAddOrderItem,
  useUpdateOrderItem,
  useRemoveOrderItem,
  useMarkOrderBilled,
  useRecordPayment,
  useListCategories,
  useListMenuItems,
} from "@workspace/api-client-react";
import type { MenuItem, MenuCategory } from "@workspace/api-client-react";
import { MenuItemCard } from "@/components/MenuItemCard";
import { OrderLineItem } from "@/components/OrderLineItem";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

type PaymentMethod = "cash" | "bank_transfer" | "credit";

export default function OrderScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tableId } = useLocalSearchParams<{ tableId: string }>();
  const { outlet } = useAuth();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const queryClient = useQueryClient();

  const numericTableId = Number(tableId);
  const outletId = outlet?.id ?? 0;

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payMethod, setPayMethod] = useState<PaymentMethod>("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [notes, setNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: openOrders } = useListOrders(
    { outletId, tableId: numericTableId, status: "open" },
    { query: { enabled: !!outletId && !!numericTableId } }
  );

  const existingOrderId = openOrders?.orders?.[0]?.id ?? null;

  const { data: order, isLoading: orderLoading } = useGetOrder(existingOrderId ?? 0, {
    query: { enabled: !!existingOrderId, refetchInterval: 8000 },
  });

  const { data: categories } = useListCategories(
    { outletId },
    { query: { enabled: !!outletId } }
  );

  const activeCategoryId = selectedCategoryId ?? categories?.[0]?.id ?? null;

  const { data: menuItems } = useListMenuItems(
    { outletId, ...(activeCategoryId ? { categoryId: activeCategoryId } : {}) },
    { query: { enabled: !!outletId } }
  );

  const { mutateAsync: createOrder } = useCreateOrder();
  const { mutateAsync: addItem } = useAddOrderItem();
  const { mutateAsync: updateItem } = useUpdateOrderItem();
  const { mutateAsync: removeItem } = useRemoveOrderItem();
  const { mutateAsync: markBilled } = useMarkOrderBilled();
  const { mutateAsync: recordPayment } = useRecordPayment();

  const invalidateOrder = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    queryClient.invalidateQueries({ queryKey: [`/api/orders/${existingOrderId}`] });
    queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
    queryClient.invalidateQueries({ queryKey: ["/api/kitchen"] });
  }, [queryClient, existingOrderId]);

  const ensureOrder = useCallback(async (): Promise<number> => {
    if (existingOrderId) return existingOrderId;
    const created = await createOrder({ data: { tableId: numericTableId, outletId } });
    invalidateOrder();
    return created.id;
  }, [existingOrderId, createOrder, numericTableId, outletId, invalidateOrder]);

  const handleAddItem = useCallback(async (item: MenuItem) => {
    if (!item.isAvailable) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const orderId = await ensureOrder();
    const existing = order?.items?.find((i) => i.menuItemId === item.id);
    if (existing) {
      await updateItem({ id: orderId, itemId: existing.id, data: { quantity: existing.quantity + 1 } });
    } else {
      await addItem({ id: orderId, data: { menuItemId: item.id, quantity: 1 } });
    }
    invalidateOrder();
  }, [ensureOrder, order, updateItem, addItem, invalidateOrder]);

  const handleIncrease = useCallback(async (itemId: number, currentQty: number) => {
    if (!existingOrderId) return;
    await updateItem({ id: existingOrderId, itemId, data: { quantity: currentQty + 1 } });
    invalidateOrder();
  }, [existingOrderId, updateItem, invalidateOrder]);

  const handleDecrease = useCallback(async (itemId: number, currentQty: number) => {
    if (!existingOrderId) return;
    if (currentQty <= 1) {
      await removeItem({ id: existingOrderId, itemId });
    } else {
      await updateItem({ id: existingOrderId, itemId, data: { quantity: currentQty - 1 } });
    }
    invalidateOrder();
  }, [existingOrderId, removeItem, updateItem, invalidateOrder]);

  const handleRemove = useCallback(async (itemId: number) => {
    if (!existingOrderId) return;
    await removeItem({ id: existingOrderId, itemId });
    invalidateOrder();
  }, [existingOrderId, removeItem, invalidateOrder]);

  const handleBill = useCallback(async () => {
    if (!existingOrderId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await markBilled(existingOrderId);
      invalidateOrder();
      setShowPayModal(true);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to generate bill");
    }
  }, [existingOrderId, markBilled, invalidateOrder]);

  const handlePay = useCallback(async () => {
    if (!existingOrderId) return;
    setIsProcessing(true);
    try {
      const totalAmount = Number(order?.totalAmount ?? 0);
      await recordPayment({
        id: existingOrderId,
        data: {
          payments: [
            {
              method: payMethod,
              amount: payMethod === "cash" ? Number(cashReceived) || totalAmount : totalAmount,
            },
          ],
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      invalidateOrder();
      setShowPayModal(false);
      router.back();
    } catch (e: any) {
      Alert.alert("Payment Failed", e.message ?? "Something went wrong");
    } finally {
      setIsProcessing(false);
    }
  }, [existingOrderId, order, payMethod, cashReceived, recordPayment, invalidateOrder, router]);

  const items = order?.items ?? [];
  const total = Number(order?.totalAmount ?? 0);
  const orderStatus = order?.status;
  const isBilled = orderStatus === "billed";

  const orderPanel = (
    <View style={[styles.orderPanel, { borderRightColor: colors.border }]}>
      <View style={[styles.panelHeader, { borderBottomColor: colors.border }]}>
        <Text style={[styles.panelTitle, { color: colors.foreground }]}>Current Order</Text>
        {items.length > 0 && (
          <Text style={[styles.itemCount, { color: colors.mutedForeground }]}>
            {items.length} item{items.length !== 1 ? "s" : ""}
          </Text>
        )}
      </View>

      {orderLoading && !!existingOrderId ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Feather name="shopping-cart" size={32} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Tap menu items to add
          </Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }}>
          {items.map((item) => (
            <OrderLineItem
              key={item.id}
              item={item}
              onIncrease={() => handleIncrease(item.id, item.quantity)}
              onDecrease={() => handleDecrease(item.id, item.quantity)}
              onRemove={() => handleRemove(item.id)}
              disabled={isBilled}
            />
          ))}
        </ScrollView>
      )}

      <View style={[styles.orderFooter, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Total</Text>
          <Text style={[styles.totalValue, { color: colors.foreground }]}>${total.toFixed(2)}</Text>
        </View>
        <View style={styles.actions}>
          {!isBilled ? (
            <Pressable
              style={[styles.billBtn, { backgroundColor: colors.primary, opacity: items.length === 0 ? 0.4 : 1 }]}
              onPress={handleBill}
              disabled={items.length === 0}
            >
              <Feather name="file-text" size={16} color={colors.primaryForeground} />
              <Text style={[styles.actionText, { color: colors.primaryForeground }]}>Bill</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.billBtn, { backgroundColor: colors.success }]}
              onPress={() => setShowPayModal(true)}
            >
              <Feather name="credit-card" size={16} color={colors.successForeground} />
              <Text style={[styles.actionText, { color: colors.successForeground }]}>Pay</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );

  const menuPanel = (
    <View style={styles.menuPanel}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryBar}
      >
        {(categories ?? []).map((cat: MenuCategory) => (
          <Pressable
            key={cat.id}
            style={[
              styles.catChip,
              {
                backgroundColor: activeCategoryId === cat.id ? colors.primary : colors.secondary,
                borderColor: activeCategoryId === cat.id ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setSelectedCategoryId(cat.id)}
          >
            <Text
              style={[
                styles.catText,
                { color: activeCategoryId === cat.id ? colors.primaryForeground : colors.foreground },
              ]}
            >
              {cat.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        data={menuItems ?? []}
        keyExtractor={(i) => String(i.id)}
        renderItem={({ item }) => (
          <MenuItemCard item={item} onPress={() => handleAddItem(item)} disabled={isBilled} />
        )}
        numColumns={3}
        columnWrapperStyle={styles.menuRow}
        contentContainerStyle={[
          styles.menuContent,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 90 },
        ]}
        scrollEnabled
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No items in this category
            </Text>
          </View>
        }
      />
    </View>
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Table {tableId}
        </Text>
        {orderStatus && (
          <View style={[styles.statusTag, { backgroundColor: isBilled ? `${colors.tableBilled}20` : `${colors.tableOccupied}20` }]}>
            <Text style={[styles.statusTagText, { color: isBilled ? colors.tableBilled : colors.tableOccupied }]}>
              {isBilled ? "Billed" : "Open"}
            </Text>
          </View>
        )}
      </View>

      {isTablet ? (
        <View style={styles.tabletLayout}>
          <View style={styles.tabletLeft}>{orderPanel}</View>
          <View style={styles.tabletRight}>{menuPanel}</View>
        </View>
      ) : (
        <View style={styles.phoneLayout}>
          <View style={styles.phoneTop}>{orderPanel}</View>
          <View style={styles.phoneBottom}>{menuPanel}</View>
        </View>
      )}

      <Modal visible={showPayModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <Pressable style={styles.modalOverlay} onPress={() => !isProcessing && setShowPayModal(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Collect Payment</Text>
            <Text style={[styles.modalAmount, { color: colors.accent }]}>${total.toFixed(2)}</Text>

            <View style={styles.methodRow}>
              {(["cash", "bank_transfer", "credit"] as PaymentMethod[]).map((m) => (
                <Pressable
                  key={m}
                  style={[
                    styles.methodBtn,
                    {
                      backgroundColor: payMethod === m ? colors.primary : colors.secondary,
                      borderColor: payMethod === m ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setPayMethod(m)}
                >
                  <Text style={[styles.methodText, { color: payMethod === m ? colors.primaryForeground : colors.foreground }]}>
                    {m === "bank_transfer" ? "Transfer" : m.charAt(0).toUpperCase() + m.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {payMethod === "cash" && (
              <View style={[styles.cashInput, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
                <Text style={[styles.cashLabel, { color: colors.mutedForeground }]}>Cash Received</Text>
                <TextInput
                  style={[styles.cashField, { color: colors.foreground }]}
                  value={cashReceived}
                  onChangeText={setCashReceived}
                  keyboardType="decimal-pad"
                  placeholder={total.toFixed(2)}
                  placeholderTextColor={colors.mutedForeground}
                />
                {cashReceived && Number(cashReceived) >= total && (
                  <Text style={[styles.changeText, { color: colors.success }]}>
                    Change: ${(Number(cashReceived) - total).toFixed(2)}
                  </Text>
                )}
              </View>
            )}

            <Pressable
              style={[styles.confirmBtn, { backgroundColor: colors.success, opacity: isProcessing ? 0.7 : 1 }]}
              onPress={handlePay}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color={colors.successForeground} />
              ) : (
                <>
                  <Feather name="check" size={18} color={colors.successForeground} />
                  <Text style={[styles.confirmText, { color: colors.successForeground }]}>Confirm Payment</Text>
                </>
              )}
            </Pressable>

            <View style={{ height: insets.bottom + (Platform.OS === "web" ? 34 : 0) }} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", flex: 1 },
  statusTag: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusTagText: { fontSize: 12, fontWeight: "700" },

  tabletLayout: { flex: 1, flexDirection: "row" },
  tabletLeft: { width: "38%", borderRightWidth: 1, borderRightColor: "#e4e4ee" },
  tabletRight: { flex: 1 },

  phoneLayout: { flex: 1, flexDirection: "column" },
  phoneTop: { flex: 2 },
  phoneBottom: { flex: 3, borderTopWidth: 1, borderTopColor: "#e4e4ee" },

  orderPanel: { flex: 1 },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  panelTitle: { fontSize: 15, fontWeight: "700" },
  itemCount: { fontSize: 13 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyText: { fontSize: 14 },
  orderFooter: { borderTopWidth: 1, padding: 12, gap: 10 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 14, fontWeight: "600" },
  totalValue: { fontSize: 22, fontWeight: "800" },
  actions: { flexDirection: "row", gap: 10 },
  billBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 10,
    paddingVertical: 12,
  },
  actionText: { fontSize: 15, fontWeight: "700" },

  menuPanel: { flex: 1 },
  categoryBar: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  catChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  catText: { fontSize: 13, fontWeight: "600" },
  menuRow: { gap: 8, marginHorizontal: 12 },
  menuContent: { paddingTop: 4, gap: 8 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, padding: 20, gap: 16 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center" },
  modalTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  modalAmount: { fontSize: 32, fontWeight: "800", textAlign: "center" },
  methodRow: { flexDirection: "row", gap: 10 },
  methodBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  methodText: { fontSize: 13, fontWeight: "600" },
  cashInput: { borderWidth: 1, borderRadius: 10, padding: 14, gap: 4 },
  cashLabel: { fontSize: 12, fontWeight: "600" },
  cashField: { fontSize: 24, fontWeight: "700" },
  changeText: { fontSize: 14, fontWeight: "600", marginTop: 4 },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 12,
    paddingVertical: 16,
  },
  confirmText: { fontSize: 17, fontWeight: "700" },
});
