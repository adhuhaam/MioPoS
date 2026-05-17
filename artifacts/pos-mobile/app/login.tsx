import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
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

import { ApiError } from "@workspace/api-client-react";
import { PINPad } from "@/components/PINPad";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch, getApiBaseUrl } from "@/lib/api";

type Outlet = { id: number; name: string };

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();
  const apiBase = getApiBaseUrl();

  const [selectedOutletId, setSelectedOutletId] = useState<number | null>(null);
  const [pin, setPin] = useState("");
  const [isLogging, setIsLogging] = useState(false);
  const [superAdmin, setSuperAdmin] = useState(false);

  const {
    data: outlets,
    isLoading: outletsLoading,
    isError: outletsError,
    error: outletsErr,
    refetch: refetchOutlets,
  } = useQuery<Outlet[]>({
    queryKey: ["outlets", apiBase],
    queryFn: () => apiFetch("/api/outlets"),
    retry: 1,
  });

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
    if (outletsError && !superAdmin) {
      Alert.alert(
        "Cannot reach server",
        `Outlets did not load. Check API URL:\n${apiBase}\n\n${outletsErr instanceof Error ? outletsErr.message : "Network error"}`,
      );
      return;
    }
    setIsLogging(true);
    try {
      await login(superAdmin ? null : selectedOutletId, pinValue);
      router.replace("/(tabs)");
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? (typeof e.data === "object" && e.data && "error" in (e.data as object)
              ? String((e.data as { error: string }).error)
              : e.message)
          : e instanceof Error
            ? e.message
            : "Login failed";
      const hint =
        msg.toLowerCase().includes("network") || msg.toLowerCase().includes("failed to fetch")
          ? `\n\nAPI: ${apiBase}\nUse USE_DEVICE=1 pnpm dev:mobile and open ${apiBase}/api/healthz in Safari on your phone.`
          : superAdmin
            ? "\n\nSuper admin PIN may differ from 0000. Ask your admin or reset via scripts/reset-staff-pin.mjs"
            : "";
      Alert.alert("Login failed", msg + hint);
      setPin("");
    } finally {
      setIsLogging(false);
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const outletList = outlets ?? [];

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

      <View style={[styles.apiBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.apiLabel, { color: colors.mutedForeground }]}>API</Text>
        <Text style={[styles.apiUrl, { color: colors.foreground }]} selectable>
          {apiBase}
        </Text>
        {apiBase.includes("127.0.0.1") && (
          <Text style={[styles.apiWarn, { color: colors.destructive }]}>
            On a real iPhone, use your Mac&apos;s Wi‑Fi IP (not 127.0.0.1). Run: USE_DEVICE=1 pnpm dev:mobile
          </Text>
        )}
      </View>

      {!superAdmin && (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>SELECT OUTLET</Text>
            <Pressable onPress={() => refetchOutlets()}>
              <Feather name="refresh-cw" size={14} color={colors.accent} />
            </Pressable>
          </View>
          {outletsLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : outletsError ? (
            <View style={[styles.errorBox, { borderColor: colors.destructive }]}>
              <Text style={{ color: colors.destructive, fontSize: 13 }}>
                Could not load outlets. Is the API running and reachable from your phone?
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 6 }}>
                {outletsErr instanceof Error ? outletsErr.message : "Error"}
              </Text>
            </View>
          ) : outletList.length === 0 ? (
            <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>No outlets found.</Text>
          ) : (
            <View style={styles.outletGrid}>
              {outletList.map((outlet) => (
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
                    numberOfLines={2}
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
          <Text style={[styles.superAdminText, { color: colors.accent }]}>
            Super Admin — no outlet needed
          </Text>
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
  container: { alignItems: "center", gap: 24, paddingHorizontal: 24 },
  brand: { alignItems: "center", gap: 8 },
  icon: { width: 80, height: 80, borderRadius: 20 },
  title: { fontSize: 32, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { fontSize: 15 },
  apiBanner: { width: "100%", borderWidth: 1, borderRadius: 10, padding: 12, gap: 4 },
  apiLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
  apiUrl: { fontSize: 12 },
  apiWarn: { fontSize: 11, marginTop: 4, lineHeight: 16 },
  section: { width: "100%", gap: 16, alignItems: "center" },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%" },
  label: { fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  errorBox: { borderWidth: 1, borderRadius: 10, padding: 12, width: "100%" },
  outletGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, width: "100%" },
  outletBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    width: "100%",
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
