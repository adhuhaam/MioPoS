import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useListOutlets } from "@workspace/api-client-react";
import { PINPad } from "@/components/PINPad";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();

  const [selectedOutletId, setSelectedOutletId] = useState<number | null>(null);
  const [pin, setPin] = useState("");
  const [isLogging, setIsLogging] = useState(false);
  const [superAdmin, setSuperAdmin] = useState(false);

  const { data: outlets, isLoading: outletsLoading } = useListOutlets();

  const handlePINChange = async (newPin: string) => {
    setPin(newPin);
    if (newPin.length === 4) {
      await submit(newPin);
    }
  };

  const submit = async (pinValue: string) => {
    if (isLogging) return;
    if (!superAdmin && selectedOutletId === null) {
      Alert.alert("Select Outlet", "Please choose your outlet first.");
      return;
    }
    setIsLogging(true);
    try {
      await login(superAdmin ? null : selectedOutletId, pinValue);
      router.replace("/(tabs)");
    } catch {
      Alert.alert("Invalid PIN", "The PIN you entered is incorrect. Please try again.");
      setPin("");
    } finally {
      setIsLogging(false);
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.container,
        { paddingTop: topPad + 24, paddingBottom: bottomPad + 24 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.brand}>
        <Image
          source={require("../assets/images/icon.png")}
          style={styles.icon}
          resizeMode="contain"
        />
        <Text style={[styles.title, { color: colors.primary }]}>ChainPOS</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Staff Login
        </Text>
      </View>

      {!superAdmin && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>SELECT OUTLET</Text>
          {outletsLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <View style={styles.outletGrid}>
              {(outlets ?? []).map((outlet) => (
                <Pressable
                  key={outlet.id}
                  style={[
                    styles.outletBtn,
                    {
                      backgroundColor:
                        selectedOutletId === outlet.id ? colors.primary : colors.card,
                      borderColor:
                        selectedOutletId === outlet.id ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedOutletId(outlet.id)}
                >
                  <Feather
                    name="home"
                    size={16}
                    color={selectedOutletId === outlet.id ? colors.primaryForeground : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.outletName,
                      {
                        color:
                          selectedOutletId === outlet.id
                            ? colors.primaryForeground
                            : colors.foreground,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {outlet.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}

      {superAdmin && (
        <View style={[styles.superAdminBanner, { backgroundColor: `${colors.accent}15`, borderColor: colors.accent }]}>
          <Feather name="shield" size={16} color={colors.accent} />
          <Text style={[styles.superAdminText, { color: colors.accent }]}>Super Admin Mode</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>ENTER PIN</Text>
        {isLogging ? (
          <View style={styles.loadingPIN}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Signing in…</Text>
          </View>
        ) : (
          <PINPad value={pin} onChange={handlePINChange} maxLength={4} />
        )}
      </View>

      <Pressable onPress={() => { setSuperAdmin((v) => !v); setSelectedOutletId(null); setPin(""); }}>
        <Text style={[styles.superAdminLink, { color: colors.mutedForeground }]}>
          {superAdmin ? "← Back to outlet login" : "Super Admin login"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: { alignItems: "center", gap: 32, paddingHorizontal: 24 },
  brand: { alignItems: "center", gap: 8 },
  icon: { width: 80, height: 80, borderRadius: 20 },
  title: { fontSize: 32, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { fontSize: 15 },
  section: { width: "100%", gap: 16, alignItems: "center" },
  label: { fontSize: 11, fontWeight: "700", letterSpacing: 1, alignSelf: "flex-start" },
  outletGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, width: "100%" },
  outletBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flex: 1,
    minWidth: 130,
  },
  outletName: { fontSize: 14, fontWeight: "600", flex: 1 },
  superAdminBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: "100%",
  },
  superAdminText: { fontSize: 14, fontWeight: "600" },
  loadingPIN: { alignItems: "center", gap: 12, paddingVertical: 24 },
  loadingText: { fontSize: 14 },
  superAdminLink: { fontSize: 13 },
});
