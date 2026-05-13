import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGetOutlet, useUpdateOutlet } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const { outlet, staff } = useAuth();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [currency, setCurrency] = useState("USD");
  const [saved, setSaved] = useState(false);

  const outletId = outlet?.id ?? 0;
  const { data: outletData } = useGetOutlet(outletId, { query: { enabled: !!outletId } });
  const updateOutlet = useUpdateOutlet();

  useEffect(() => {
    if (outletData) {
      setName(outletData.name ?? "");
      setAddress(outletData.address ?? "");
      setPhone(outletData.phone ?? "");
      setTaxRate(String(outletData.taxRate ?? "0"));
      setCurrency(outletData.currency ?? "USD");
    }
  }, [outletData]);

  const handleSave = () => {
    if (!name.trim()) { Alert.alert("Required", "Outlet name is required."); return; }
    updateOutlet.mutate(
      { id: outletId, data: { name: name.trim(), address: address.trim(), phone: phone.trim(), taxRate: parseFloat(taxRate) || 0, currency: currency.trim() || "USD" } },
      {
        onSuccess: () => { qc.invalidateQueries(); setSaved(true); setTimeout(() => setSaved(false), 2000); },
        onError: () => Alert.alert("Error", "Failed to save settings."),
      }
    );
  };

  const domain = process.env.EXPO_PUBLIC_DOMAIN ?? "";
  const qrUrl = `https://${domain}/qr/${outletId}`;

  const copyQrUrl = async () => {
    try {
      await Share.share({ message: qrUrl, url: qrUrl });
    } catch {
      Alert.alert("Menu URL", qrUrl);
    }
  };

  const canEdit = staff?.role === "super_admin" || staff?.role === "manager";
  const topPad = Platform.OS === "web" ? 20 : insets.top + 8;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Settings</Text>
          {canEdit ? (
            <Pressable onPress={handleSave} style={[styles.saveBtn, { backgroundColor: saved ? colors.success : colors.accent }]}>
              <Text style={styles.saveBtnText}>{saved ? "Saved!" : "Save"}</Text>
            </Pressable>
          ) : <View style={{ width: 60 }} />}
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 40 }}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>OUTLET INFO</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {[
              { label: "Name", value: name, setter: setName, placeholder: "Outlet name" },
              { label: "Address", value: address, setter: setAddress, placeholder: "Street address" },
              { label: "Phone", value: phone, setter: setPhone, placeholder: "+1 234 567 8900", keyboardType: "phone-pad" },
            ].map((f, i, arr) => (
              <View key={f.label}>
                <View style={styles.formRow}>
                  <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>{f.label}</Text>
                  <TextInput
                    style={[styles.formInput, { color: colors.foreground }]}
                    value={f.value}
                    onChangeText={canEdit ? f.setter : undefined}
                    editable={canEdit}
                    placeholder={f.placeholder}
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType={(f as any).keyboardType ?? "default"}
                  />
                </View>
                {i < arr.length - 1 && <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />}
              </View>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>BILLING</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.formRow}>
              <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>Tax Rate (%)</Text>
              <TextInput
                style={[styles.formInput, { color: colors.foreground }]}
                value={taxRate}
                onChangeText={canEdit ? setTaxRate : undefined}
                editable={canEdit}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
            <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
            <View style={styles.formRow}>
              <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>Currency</Text>
              <TextInput
                style={[styles.formInput, { color: colors.foreground }]}
                value={currency}
                onChangeText={canEdit ? setCurrency : undefined}
                editable={canEdit}
                placeholder="USD"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="characters"
              />
            </View>
          </View>

          {outletId ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>CUSTOMER MENU QR</Text>
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.qrRow}>
                  <Text style={[styles.qrUrl, { color: colors.foreground }]} numberOfLines={2}>{qrUrl}</Text>
                  <Pressable onPress={copyQrUrl} style={[styles.copyBtn, { backgroundColor: `${colors.accent}18` }]}>
                    <Feather name="copy" size={16} color={colors.accent} />
                  </Pressable>
                </View>
                <Text style={[styles.qrHint, { color: colors.mutedForeground }]}>
                  Share this URL with customers to view your menu on their device.
                </Text>
              </View>
            </>
          ) : null}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  backBtn: { width: 40, height: 40, alignItems: "flex-start", justifyContent: "center" },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginLeft: 4 },
  card: { borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  formRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 13 },
  formLabel: { fontSize: 14, fontWeight: "500", flex: 1 },
  formInput: { flex: 1, fontSize: 14, fontWeight: "600", textAlign: "right" },
  rowDivider: { height: 1, marginLeft: 14 },
  qrRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  qrUrl: { flex: 1, fontSize: 13 },
  copyBtn: { padding: 8, borderRadius: 8 },
  qrHint: { fontSize: 12, paddingHorizontal: 14, paddingBottom: 12 },
});
