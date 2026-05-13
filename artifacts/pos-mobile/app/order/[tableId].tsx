import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
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
  useUpdateOrder,
  useRecordPayment,
  useListCategories,
  useListMenuItems,
  getListTablesQueryKey,
  getListKitchenOrdersQueryKey,
  getGetOrderQueryKey,
} from "@workspace/api-client-react";
import type {
  MenuItem,
  MenuCategory,
  OrderDetail,
  OrderItem,
  PaymentInputMethod,
} from "@workspace/api-client-react";
import { MenuItemCard } from "@/components/MenuItemCard";
import { OrderLineItem } from "@/components/OrderLineItem";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

type PayMethod = "cash" | "bank_transfer" | "credit";

export default function OrderScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tableId: tableIdParam, tableName: tableNameParam } = useLocalSearchParams<{
    tableId: string;
    tableName?: string;
  }>();
  const { outlet, staff } = useAuth();
  const { width } = useWindowDimensions();
  const isTablet = width >= 720;
  const qc = useQueryClient();

  const numericTableId = Number(tableIdParam);
  const outletId = outlet?.id ?? 0;

  // ── Menu state ────────────────────────────────────────────────────────────
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  // ── Payment modal state ────────────────────────────────────────────────────
  const [showPayModal, setShowPayModal] = useState(false);
  const [payMethod, setPayMethod] = useState<PayMethod>("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // ── Discount state ─────────────────────────────────────────────────────────
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [discountPercent, setDiscountPercent] = useState("");

  // ── Bank transfer slip state ───────────────────────────────────────────────
  const [slipUri, setSlipUri] = useState<string | null>(null);
  const [slipObjectPath, setSlipObjectPath] = useState<string | null>(null);
  const [isUploadingSlip, setIsUploadingSlip] = useState(false);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: openOrdersData, isLoading: openLoading } = useListOrders(
    { outletId, tableId: numericTableId, status: "open" },
    { query: { enabled: !!outletId && !!numericTableId, refetchOnMount: true } }
  );
  const { data: billedOrdersData, isLoading: billedLoading } = useListOrders(
    { outletId, tableId: numericTableId, status: "billed" },
    { query: { enabled: !!outletId && !!numericTableId, refetchOnMount: true } }
  );

  const openOrderId = openOrdersData?.orders?.[0]?.id ?? null;
  const billedOrderId = billedOrdersData?.orders?.[0]?.id ?? null;
  const existingOrderId = openOrderId ?? billedOrderId;
  const isBilledOrder = !openOrderId && !!billedOrderId;

  const { data: orderRaw, refetch: refetchOrder, isLoading: orderLoading } = useGetOrder(
    existingOrderId ?? 0,
    {
      query: {
        enabled: !!existingOrderId,
        queryKey: getGetOrderQueryKey(existingOrderId ?? 0),
        refetchInterval: 10000,
      },
    }
  );
  const order = orderRaw as OrderDetail | undefined;
  const items: OrderItem[] = order?.items ?? [];
  const subtotal = Number(order?.subtotal ?? 0);
  const discountAmount = Number(order?.discountAmount ?? 0);
  const taxAmount = Number(order?.taxAmount ?? 0);
  const total = Number(order?.total ?? 0);
  const orderStatus = order?.status;
  const isBilled = orderStatus === "billed";

  const { data: categories, isLoading: catLoading } = useListCategories(
    { outletId },
    { query: { enabled: !!outletId } }
  );
  const activeCategoryId = selectedCategoryId ?? categories?.[0]?.id ?? null;

  const { data: menuItems } = useListMenuItems(
    { outletId, ...(activeCategoryId ? { categoryId: activeCategoryId } : {}) },
    { query: { enabled: !!outletId } }
  );

  // ── Mutations ──────────────────────────────────────────────────────────────
  const { mutateAsync: createOrder } = useCreateOrder();
  const { mutateAsync: addItem } = useAddOrderItem();
  const { mutateAsync: updateItem } = useUpdateOrderItem();
  const { mutateAsync: removeItem } = useRemoveOrderItem();
  const { mutateAsync: updateOrder, isPending: updatePending } = useUpdateOrder();
  const { mutateAsync: recordPayment } = useRecordPayment();

  // ── Invalidation helper ────────────────────────────────────────────────────
  const invalidateAll = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["/api/orders"] });
    qc.invalidateQueries({ queryKey: ["/api/tables"] });
    qc.invalidateQueries({ queryKey: getListTablesQueryKey({ outletId }) });
    qc.invalidateQueries({ queryKey: getListKitchenOrdersQueryKey({ outletId }) });
    if (existingOrderId) {
      qc.invalidateQueries({ queryKey: getGetOrderQueryKey(existingOrderId) });
    }
  }, [qc, outletId, existingOrderId]);

  // ── Ensure an order exists (create if needed) ─────────────────────────────
  const ensureOrder = useCallback(async (): Promise<number> => {
    if (existingOrderId) return existingOrderId;
    const created = await createOrder({
      data: { outletId, tableId: numericTableId, staffId: staff?.id },
    });
    invalidateAll();
    return (created as any).id as number;
  }, [existingOrderId, createOrder, outletId, numericTableId, staff, invalidateAll]);

  // ── Add menu item ─────────────────────────────────────────────────────────
  const handleAddItem = useCallback(
    async (item: MenuItem) => {
      if (!item.available || isBilled) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      try {
        const orderId = await ensureOrder();
        // If item already in order, increment qty
        const existing = items.find((i) => i.menuItemId === item.id);
        if (existing) {
          await updateItem({
            id: orderId,
            itemId: existing.id,
            data: { quantity: existing.quantity + 1 },
          });
        } else {
          await addItem({ id: orderId, data: { menuItemId: item.id, quantity: 1 } });
        }
        refetchOrder();
        invalidateAll();
      } catch (e: any) {
        Alert.alert("Error", e?.message ?? "Failed to add item");
      }
    },
    [isBilled, ensureOrder, items, updateItem, addItem, refetchOrder, invalidateAll]
  );

  // ── Quantity controls ─────────────────────────────────────────────────────
  const handleIncrease = useCallback(
    async (itemId: number, currentQty: number) => {
      if (!existingOrderId) return;
      await updateItem({ id: existingOrderId, itemId, data: { quantity: currentQty + 1 } });
      refetchOrder();
    },
    [existingOrderId, updateItem, refetchOrder]
  );

  const handleDecrease = useCallback(
    async (itemId: number, currentQty: number) => {
      if (!existingOrderId) return;
      if (currentQty <= 1) {
        await removeItem({ id: existingOrderId, itemId });
      } else {
        await updateItem({ id: existingOrderId, itemId, data: { quantity: currentQty - 1 } });
      }
      refetchOrder();
      invalidateAll();
    },
    [existingOrderId, removeItem, updateItem, refetchOrder, invalidateAll]
  );

  const handleRemove = useCallback(
    async (itemId: number) => {
      if (!existingOrderId) return;
      await removeItem({ id: existingOrderId, itemId });
      refetchOrder();
      invalidateAll();
    },
    [existingOrderId, removeItem, refetchOrder, invalidateAll]
  );

  // ── Apply discount ────────────────────────────────────────────────────────
  const handleApplyDiscount = useCallback(async () => {
    if (!existingOrderId) return;
    const dp = parseFloat(discountPercent);
    if (isNaN(dp) || dp < 0 || dp > 100) {
      Alert.alert("Invalid", "Enter a discount between 0 and 100.");
      return;
    }
    try {
      await updateOrder({ id: existingOrderId, data: { discountPercent: dp } });
      refetchOrder();
      setShowDiscountInput(false);
      setDiscountPercent("");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to apply discount");
    }
  }, [existingOrderId, discountPercent, updateOrder, refetchOrder]);

  // ── Bill order ────────────────────────────────────────────────────────────
  const handleBill = useCallback(async () => {
    if (!existingOrderId || items.length === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    try {
      await updateOrder({ id: existingOrderId, data: { status: "billed" } });
      refetchOrder();
      invalidateAll();
      setCashReceived(total.toFixed(2));
      setPayMethod("cash");
      setShowPayModal(true);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to generate bill");
    }
  }, [existingOrderId, items, updateOrder, refetchOrder, invalidateAll, total]);

  // ── Open payment ──────────────────────────────────────────────────────────
  const closePayModal = useCallback(() => {
    setShowPayModal(false);
    setSlipUri(null);
    setSlipObjectPath(null);
    setCashReceived("");
  }, []);

  const handleOpenPayment = useCallback(() => {
    setCashReceived(total.toFixed(2));
    setPayMethod("cash");
    setSlipUri(null);
    setSlipObjectPath(null);
    setShowPayModal(true);
  }, [total]);

  // ── Pick & upload bank transfer slip ─────────────────────────────────────
  const doUploadSlip = useCallback(async (uri: string, contentType: string) => {
    setIsUploadingSlip(true);
    try {
      const base = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
      const fileName = uri.split("/").pop() ?? "slip.jpg";

      const blob = await (await fetch(uri)).blob();
      const size = blob.size;

      const urlRes = await fetch(`${base}/api/storage/uploads/request-url`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fileName, size, contentType }),
      });
      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await urlRes.json();

      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: blob,
      });
      if (!uploadRes.ok) throw new Error("Failed to upload slip image");

      setSlipUri(uri);
      setSlipObjectPath(objectPath);
    } catch (e: any) {
      Alert.alert("Upload Failed", e?.message ?? "Could not upload slip image");
    } finally {
      setIsUploadingSlip(false);
    }
  }, []);

  const pickAndUploadSlip = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "Camera access is needed to photograph the bank transfer slip. You can also choose from your photo library.",
        [
          {
            text: "Choose from library",
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"],
                quality: 0.8,
              });
              if (!result.canceled && result.assets[0]) {
                await doUploadSlip(result.assets[0].uri, result.assets[0].mimeType ?? "image/jpeg");
              }
            },
          },
          { text: "Cancel", style: "cancel" },
        ]
      );
      return;
    }

    Alert.alert("Attach Slip", "Choose a source", [
      {
        text: "Take Photo",
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) {
            await doUploadSlip(result.assets[0].uri, result.assets[0].mimeType ?? "image/jpeg");
          }
        },
      },
      {
        text: "Choose from Library",
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) {
            await doUploadSlip(result.assets[0].uri, result.assets[0].mimeType ?? "image/jpeg");
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [doUploadSlip]);

  // ── Record payment ────────────────────────────────────────────────────────
  const handlePay = useCallback(async () => {
    if (!existingOrderId) return;
    if (payMethod === "bank_transfer" && !slipObjectPath) {
      Alert.alert("Slip Required", "Please attach a photo of the bank transfer slip before confirming.");
      return;
    }
    setIsProcessing(true);
    try {
      const amount =
        payMethod === "cash" && cashReceived ? Number(cashReceived) : total;
      await recordPayment({
        id: existingOrderId,
        data: {
          method: payMethod as PaymentInputMethod,
          amount: Math.min(amount, total),
          ...(slipObjectPath ? { slipImagePath: slipObjectPath } : {}),
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      invalidateAll();
      closePayModal();
      router.back();
    } catch (e: any) {
      Alert.alert("Payment Failed", e?.message ?? "Something went wrong");
    } finally {
      setIsProcessing(false);
    }
  }, [existingOrderId, payMethod, cashReceived, total, slipObjectPath, recordPayment, invalidateAll, closePayModal, router]);

  // ── Loading state ─────────────────────────────────────────────────────────
  const isInitialLoading = (openLoading || billedLoading) && !existingOrderId;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const change =
    payMethod === "cash" && cashReceived && Number(cashReceived) > total
      ? (Number(cashReceived) - total).toFixed(2)
      : null;

  // ─────────────────────────────── Order Panel ───────────────────────────────
  const OrderPanel = (
    <View style={styles.panel}>
      {/* Panel header */}
      <View style={[styles.panelHeader, { borderBottomColor: colors.border }]}>
        <Text style={[styles.panelTitle, { color: colors.foreground }]}>
          {items.length > 0 ? `${items.length} item${items.length !== 1 ? "s" : ""}` : "Order"}
        </Text>
        {!isBilled && existingOrderId && (
          <Pressable
            onPress={() => setShowDiscountInput((v) => !v)}
            style={[styles.discountToggle, { borderColor: colors.border }]}
          >
            <Feather name="tag" size={13} color={colors.mutedForeground} />
            <Text style={[styles.discountToggleText, { color: colors.mutedForeground }]}>
              {discountAmount > 0 ? `−$${discountAmount.toFixed(2)}` : "Discount"}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Discount input */}
      {showDiscountInput && (
        <View style={[styles.discountRow, { borderBottomColor: colors.border, backgroundColor: colors.secondary }]}>
          <TextInput
            style={[styles.discountField, { color: colors.foreground, borderColor: colors.border }]}
            value={discountPercent}
            onChangeText={setDiscountPercent}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.mutedForeground}
          />
          <Text style={[styles.discountPct, { color: colors.mutedForeground }]}>%</Text>
          <Pressable
            style={[styles.discountApply, { backgroundColor: colors.primary }]}
            onPress={handleApplyDiscount}
          >
            <Text style={[styles.discountApplyText, { color: colors.primaryForeground }]}>Apply</Text>
          </Pressable>
        </View>
      )}

      {/* Items list */}
      {isInitialLoading || (orderLoading && !order) ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>Loading order…</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Feather name="shopping-cart" size={32} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}>
            No items yet
          </Text>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Tap menu items to add them
          </Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
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

      {/* Totals + actions */}
      <View style={[styles.orderFooter, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Subtotal</Text>
            <Text style={[styles.totalVal, { color: colors.mutedForeground }]}>${subtotal.toFixed(2)}</Text>
          </View>
          {discountAmount > 0 && (
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.success }]}>Discount</Text>
              <Text style={[styles.totalVal, { color: colors.success }]}>−${discountAmount.toFixed(2)}</Text>
            </View>
          )}
          {taxAmount > 0 && (
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Tax</Text>
              <Text style={[styles.totalVal, { color: colors.mutedForeground }]}>${taxAmount.toFixed(2)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={[styles.grandLabel, { color: colors.foreground }]}>Total</Text>
            <Text style={[styles.grandVal, { color: colors.foreground }]}>${total.toFixed(2)}</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          {!isBilled ? (
            <>
              <Pressable
                style={[
                  styles.actionBtn,
                  styles.actionBtnSecondary,
                  { borderColor: colors.border, backgroundColor: colors.secondary },
                  items.length === 0 && styles.disabled,
                ]}
                onPress={async () => {
                  if (!existingOrderId || items.length === 0) return;
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  await updateOrder({ id: existingOrderId, data: { status: "open" } });
                  refetchOrder();
                  invalidateAll();
                  Alert.alert("Sent to Kitchen", "Kitchen has been notified.");
                }}
                disabled={!existingOrderId || items.length === 0 || updatePending}
              >
                <Feather name="send" size={15} color={colors.foreground} />
                <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Kitchen</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.actionBtn,
                  { backgroundColor: colors.primary },
                  items.length === 0 && styles.disabled,
                ]}
                onPress={handleBill}
                disabled={!existingOrderId || items.length === 0 || updatePending}
              >
                {updatePending ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <>
                    <Feather name="file-text" size={15} color={colors.primaryForeground} />
                    <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>
                      Bill
                    </Text>
                  </>
                )}
              </Pressable>
            </>
          ) : (
            <Pressable
              style={[styles.actionBtn, styles.actionBtnFull, { backgroundColor: colors.success }]}
              onPress={handleOpenPayment}
            >
              <Feather name="credit-card" size={15} color={colors.successForeground} />
              <Text style={[styles.actionBtnText, { color: colors.successForeground }]}>
                Collect ${total.toFixed(2)}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );

  // ─────────────────────────────── Menu Panel ────────────────────────────────
  const MenuPanel = (
    <View style={[styles.panel, { borderTopColor: colors.border }]}>
      {/* Category scroll */}
      {catLoading ? (
        <View style={[styles.categoryBar, { justifyContent: "center" }]}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : (
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
                  backgroundColor:
                    activeCategoryId === cat.id ? colors.primary : colors.secondary,
                  borderColor:
                    activeCategoryId === cat.id ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setSelectedCategoryId(cat.id)}
            >
              <Text
                style={[
                  styles.catText,
                  {
                    color:
                      activeCategoryId === cat.id
                        ? colors.primaryForeground
                        : colors.foreground,
                  },
                ]}
              >
                {cat.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Items grid */}
      <FlatList
        data={menuItems ?? []}
        keyExtractor={(i) => String(i.id)}
        renderItem={({ item }) => (
          <MenuItemCard
            item={item}
            onPress={() => handleAddItem(item)}
            disabled={isBilled}
          />
        )}
        numColumns={isTablet ? 4 : 3}
        key={isTablet ? "t" : "p"}
        columnWrapperStyle={styles.menuRow}
        contentContainerStyle={[
          styles.menuContent,
          { paddingBottom: bottomPad + 90 },
        ]}
        scrollEnabled
        ListEmptyComponent={
          <View style={styles.center}>
            <Feather name="package" size={28} color={colors.border} />
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              No items in this category
            </Text>
          </View>
        }
      />
    </View>
  );

  // ─────────────────────────────── Render ───────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 8,
            borderBottomColor: colors.border,
            backgroundColor: colors.card,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>

        <View style={styles.headerMid}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {tableNameParam ? decodeURIComponent(tableNameParam) : `Table ${tableIdParam}`}
          </Text>
          {existingOrderId && (
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              Order #{existingOrderId}
            </Text>
          )}
        </View>

        {/* Status pill */}
        {isBilled ? (
          <View style={[styles.statusPill, { backgroundColor: `${colors.accent}18` }]}>
            <View style={[styles.statusDot, { backgroundColor: colors.accent }]} />
            <Text style={[styles.statusText, { color: colors.accent }]}>Billed</Text>
          </View>
        ) : existingOrderId ? (
          <View style={[styles.statusPill, { backgroundColor: `${colors.tableOccupied}18` }]}>
            <View style={[styles.statusDot, { backgroundColor: colors.tableOccupied }]} />
            <Text style={[styles.statusText, { color: colors.tableOccupied }]}>Open</Text>
          </View>
        ) : null}
      </View>

      {/* Body */}
      {isTablet ? (
        <View style={styles.tabletBody}>
          <View style={[styles.tabletLeft, { borderRightColor: colors.border }]}>
            {OrderPanel}
          </View>
          <View style={styles.tabletRight}>{MenuPanel}</View>
        </View>
      ) : (
        <View style={styles.phoneBody}>
          <View style={[styles.phoneOrder, { borderBottomColor: colors.border }]}>
            {OrderPanel}
          </View>
          <View style={styles.phoneMenu}>{MenuPanel}</View>
        </View>
      )}

      {/* Payment Modal */}
      <Modal
        visible={showPayModal}
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
        onRequestClose={() => !isProcessing && closePayModal()}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => !isProcessing && closePayModal()}
        >
          <Pressable
            style={[
              styles.modalSheet,
              { backgroundColor: colors.card, borderTopColor: colors.border },
            ]}
          >
            {/* Handle */}
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />

            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Collect Payment
            </Text>
            <Text style={[styles.modalTotal, { color: colors.accent }]}>
              ${total.toFixed(2)}
            </Text>

            {/* Method selector */}
            <View style={styles.methodRow}>
              {(
                [
                  { m: "cash" as PayMethod, label: "Cash", icon: "dollar-sign" },
                  { m: "bank_transfer" as PayMethod, label: "Transfer", icon: "credit-card" },
                  { m: "credit" as PayMethod, label: "Credit", icon: "users" },
                ] as const
              ).map(({ m, label, icon }) => (
                <Pressable
                  key={m}
                  style={[
                    styles.methodBtn,
                    {
                      backgroundColor:
                        payMethod === m ? colors.primary : colors.secondary,
                      borderColor:
                        payMethod === m ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setPayMethod(m)}
                >
                  <Feather
                    name={icon}
                    size={16}
                    color={payMethod === m ? colors.primaryForeground : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.methodLabel,
                      {
                        color:
                          payMethod === m
                            ? colors.primaryForeground
                            : colors.foreground,
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Cash amount input */}
            {payMethod === "cash" && (
              <View
                style={[
                  styles.cashBox,
                  { borderColor: colors.border, backgroundColor: colors.secondary },
                ]}
              >
                <Text style={[styles.cashBoxLabel, { color: colors.mutedForeground }]}>
                  Cash Received
                </Text>
                <TextInput
                  style={[styles.cashBoxInput, { color: colors.foreground }]}
                  value={cashReceived}
                  onChangeText={setCashReceived}
                  keyboardType="decimal-pad"
                  placeholder={total.toFixed(2)}
                  placeholderTextColor={colors.mutedForeground}
                  selectTextOnFocus
                />
                {change && (
                  <Text style={[styles.changeText, { color: colors.success }]}>
                    Change: ${change}
                  </Text>
                )}
              </View>
            )}

            {payMethod === "bank_transfer" && (
              <View style={styles.slipSection}>
                {slipUri ? (
                  <View style={styles.slipPreviewRow}>
                    <Image
                      source={{ uri: slipUri }}
                      style={styles.slipThumb}
                      contentFit="cover"
                    />
                    <View style={styles.slipPreviewInfo}>
                      <Feather name="check-circle" size={16} color={colors.success} />
                      <Text style={[styles.slipAttachedText, { color: colors.success }]}>
                        Slip attached
                      </Text>
                    </View>
                    <Pressable
                      onPress={pickAndUploadSlip}
                      style={[styles.slipChangeBtn, { borderColor: colors.border }]}
                    >
                      <Text style={[styles.slipChangeBtnText, { color: colors.mutedForeground }]}>
                        Change
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    style={[
                      styles.slipAttachBtn,
                      { borderColor: isUploadingSlip ? colors.accent : colors.border, backgroundColor: colors.secondary },
                    ]}
                    onPress={pickAndUploadSlip}
                    disabled={isUploadingSlip}
                  >
                    {isUploadingSlip ? (
                      <ActivityIndicator size="small" color={colors.accent} />
                    ) : (
                      <Feather name="camera" size={18} color={colors.accent} />
                    )}
                    <Text style={[styles.slipAttachBtnText, { color: isUploadingSlip ? colors.mutedForeground : colors.foreground }]}>
                      {isUploadingSlip ? "Uploading slip…" : "Attach Transfer Slip"}
                    </Text>
                  </Pressable>
                )}
                <Text style={[styles.slipHint, { color: colors.mutedForeground }]}>
                  A photo of the transfer slip is required to confirm payment.
                </Text>
              </View>
            )}

            {payMethod === "credit" && (
              <View
                style={[
                  styles.infoBox,
                  { backgroundColor: `${colors.accent}10`, borderColor: colors.accent },
                ]}
              >
                <Feather name="info" size={14} color={colors.accent} />
                <Text style={[styles.infoText, { color: colors.accent }]}>
                  Customer credit will be deducted from their balance.
                </Text>
              </View>
            )}

            <Pressable
              style={[
                styles.confirmBtn,
                { backgroundColor: colors.success, opacity: isProcessing ? 0.7 : 1 },
              ]}
              onPress={handlePay}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color={colors.successForeground} />
              ) : (
                <>
                  <Feather name="check-circle" size={18} color={colors.successForeground} />
                  <Text style={[styles.confirmText, { color: colors.successForeground }]}>
                    Confirm Payment
                  </Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={styles.cancelLink}
              onPress={closePayModal}
              disabled={isProcessing}
            >
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>

            <View style={{ height: bottomPad }} />
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  backBtn: { padding: 2 },
  headerMid: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  headerSub: { fontSize: 12, marginTop: 1 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: "600" },

  // Layout
  tabletBody: { flex: 1, flexDirection: "row" },
  tabletLeft: { width: "40%", borderRightWidth: 1 },
  tabletRight: { flex: 1 },
  phoneBody: { flex: 1, flexDirection: "column" },
  phoneOrder: { flex: 2, borderBottomWidth: 1 },
  phoneMenu: { flex: 3 },

  // Panel
  panel: { flex: 1 },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  panelTitle: { fontSize: 14, fontWeight: "700" },
  discountToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  discountToggleText: { fontSize: 12 },
  discountRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  discountField: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 15,
    fontWeight: "600",
    width: 70,
    textAlign: "right",
  },
  discountPct: { fontSize: 15, fontWeight: "600" },
  discountApply: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  discountApplyText: { fontSize: 13, fontWeight: "700" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 20 },
  emptyTitle: { fontSize: 15, fontWeight: "600" },
  hint: { fontSize: 13, textAlign: "center" },

  // Footer
  orderFooter: { borderTopWidth: 1, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12, gap: 10 },
  totals: { gap: 4 },
  totalRow: { flexDirection: "row", justifyContent: "space-between" },
  totalLabel: { fontSize: 13 },
  totalVal: { fontSize: 13 },
  grandTotalRow: { paddingTop: 6, marginTop: 2, borderTopWidth: 1, borderTopColor: "#e4e4ee" },
  grandLabel: { fontSize: 16, fontWeight: "800" },
  grandVal: { fontSize: 20, fontWeight: "800" },
  actions: { flexDirection: "row", gap: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    paddingVertical: 13,
  },
  actionBtnSecondary: { borderWidth: 1 },
  actionBtnFull: { flex: 1 },
  actionBtnText: { fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.4 },

  // Menu
  categoryBar: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  catChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  catText: { fontSize: 13, fontWeight: "600" },
  menuRow: { gap: 8, marginHorizontal: 12 },
  menuContent: { paddingTop: 4, gap: 8 },

  // Payment modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    padding: 22,
    gap: 16,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  modalTotal: { fontSize: 36, fontWeight: "800", textAlign: "center", letterSpacing: -0.5 },
  methodRow: { flexDirection: "row", gap: 10 },
  methodBtn: {
    flex: 1,
    alignItems: "center",
    gap: 5,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
  },
  methodLabel: { fontSize: 12, fontWeight: "600" },
  cashBox: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 6 },
  cashBoxLabel: { fontSize: 12, fontWeight: "600" },
  cashBoxInput: { fontSize: 28, fontWeight: "700" },
  changeText: { fontSize: 14, fontWeight: "600" },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 16,
  },
  confirmText: { fontSize: 17, fontWeight: "700" },
  cancelLink: { alignItems: "center", paddingVertical: 4 },
  cancelText: { fontSize: 14 },
  slipSection: { gap: 8 },
  slipAttachBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 16,
  },
  slipAttachBtnText: { fontSize: 15, fontWeight: "600" },
  slipPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  slipThumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  slipPreviewInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  slipAttachedText: { fontSize: 14, fontWeight: "600" },
  slipChangeBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  slipChangeBtnText: { fontSize: 13, fontWeight: "500" },
  slipHint: { fontSize: 12, lineHeight: 16 },
});
