import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

interface MenuRowProps {
  icon: string;
  label: string;
  description?: string;
  onPress: () => void;
  tint?: string;
  destructive?: boolean;
}

function MenuRow({ icon, label, description, onPress, tint, destructive }: MenuRowProps) {
  const colors = useColors();
  const iconColor = destructive ? colors.destructive : (tint ?? colors.accent);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: `${iconColor}18` }]}>
        <Feather name={icon as any} size={18} color={iconColor} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, { color: destructive ? colors.destructive : colors.foreground }]}>
          {label}
        </Text>
        {description && (
          <Text style={[styles.rowDesc, { color: colors.mutedForeground }]}>{description}</Text>
        )}
      </View>
      {!destructive && <Feather name="chevron-right" size={18} color={colors.mutedForeground} />}
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>{title}</Text>
  );
}

function Divider() {
  const colors = useColors();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

export default function MoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { staff, outlet, logout } = useAuth();
  const role = staff?.role ?? "cashier";
  const isSuperAdmin = role === "super_admin";
  const isManager = role === "manager" || isSuperAdmin;

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleLogout = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => logout() },
    ]);
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
          <Text style={styles.avatarText}>{staff?.name?.charAt(0)?.toUpperCase() ?? "?"}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.staffName, { color: colors.foreground }]}>{staff?.name}</Text>
          <Text style={[styles.staffRole, { color: colors.mutedForeground }]}>
            {role.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            {outlet ? ` · ${outlet.name}` : ""}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Operations */}
        <SectionHeader title="OPERATIONS" />
        <View style={[styles.section, { borderColor: colors.border }]}>
          <MenuRow icon="list" label="Orders" description="Order history & status"
            onPress={() => router.push("/orders")} tint="#0ea5e9" />
          <Divider />
          <MenuRow icon="users" label="Customers" description="CRM & credit balances"
            onPress={() => router.push("/customers")} tint="#8b5cf6" />
        </View>

        {/* Management */}
        {isManager && (
          <>
            <SectionHeader title="MANAGEMENT" />
            <View style={[styles.section, { borderColor: colors.border }]}>
              <MenuRow icon="book-open" label="Menu" description="Categories, items & modifiers"
                onPress={() => router.push("/menu")} tint="#f59e0b" />
              <Divider />
              <MenuRow icon="package" label="Inventory" description="Stock levels & supply tracking"
                onPress={() => router.push("/inventory")} tint="#10b981" />
              <Divider />
              <MenuRow icon="layout" label="Areas & Tables" description="Seating layout & timed rooms"
                onPress={() => router.push("/areas")} tint="#22c55e" />
              <Divider />
              <MenuRow icon="users" label="Staff" description="Employees & roles"
                onPress={() => router.push("/staff")} tint="#3b82f6" />
            </View>
          </>
        )}

        {/* Admin */}
        {isSuperAdmin && (
          <>
            <SectionHeader title="ADMIN" />
            <View style={[styles.section, { borderColor: colors.border }]}>
              <MenuRow icon="home" label="Outlets" description="Manage all branches"
                onPress={() => router.push("/outlets")} tint="#ef4444" />
            </View>
          </>
        )}

        {/* Account */}
        <SectionHeader title="ACCOUNT" />
        <View style={[styles.section, { borderColor: colors.border }]}>
          <MenuRow icon="settings" label="Settings" description="Outlet configuration & QR code"
            onPress={() => router.push("/settings")} tint="#6b7280" />
          <Divider />
          <MenuRow icon="log-out" label="Sign out" onPress={handleLogout} destructive />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 20, fontWeight: "800", color: "#fff" },
  headerInfo: { gap: 2 },
  staffName: { fontSize: 17, fontWeight: "700" },
  staffRole: { fontSize: 13 },
  content: { padding: 16, gap: 6 },
  sectionHeader: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginTop: 10, marginBottom: 4, marginLeft: 4 },
  section: { borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: "600" },
  rowDesc: { fontSize: 12, marginTop: 1 },
  divider: { height: 1, marginLeft: 62 },
});
