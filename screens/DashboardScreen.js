// screens/DashboardScreen.js

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../auth/AuthContext";
import { API_BASE_URL } from "../config";

const { width } = Dimensions.get("window");

const COLORS = {
  primary: "#000000",
  white: "#FFFFFF",
  dark: "#111827",
  gray: "#6B7280",
  lightGray: "#F3F4F6",
  border: "#E5E7EB",
  bg: "#F9FAFB",
  success: "#10B981",
  successLight: "#D1FAE5",
  error: "#EF4444",
  errorLight: "#FEE2E2",
  warning: "#F59E0B",
  warningLight: "#FEF3C7",
  blue: "#3B82F6",
  blueLight: "#DBEAFE",
  orange: "#F59E0B",
  orangeLight: "rgba(245, 158, 11, 0.1)",
  indigo: "#6366F1",
  indigoLight: "#EEF2FF",
  pink: "#EC4899",
  pinkLight: "#FCE7F3",
};

export default function DashboardScreen({ navigation }) {
  const { tech } = useAuth();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tech?.id) fetchStats();
  }, [tech?.id]);

  const fetchStats = async () => {
    if (!tech?.id) return;

    try {
      const res = await fetch(`${API_BASE_URL}/earnings/overview?technician_id=${tech.id}`);
      if (!res.ok) return;
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Fetch stats error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  }, [tech?.id]);

  const fmt = (v) => {
    const n = parseFloat(v);
    return isNaN(n) ? "0" : n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  };

  const fmtDec = (v) => {
    const n = parseFloat(v);
    return isNaN(n) ? "0.00" : n.toFixed(2);
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const getGreetingEmoji = () => {
    const h = new Date().getHours();
    if (h < 12) return "☀️";
    if (h < 17) return "🌤️";
    return "🌙";
  };

  // Get wallet balances
  const getWallet = () => {
    const w = stats?.wallet || {};
    return {
      onlineBalance: parseFloat(w.onlineBalance) || 0,
      platformDues: parseFloat(w.platformDues) || 0,
      withdrawable: parseFloat(w.withdrawableBalance) || 0,
      cashCollected: parseFloat(w.totalCashCollected || stats?.today?.cashCollected) || 0,
      onlineEarned: parseFloat(w.totalOnlineEarned || stats?.today?.onlineEarned) || 0,
    };
  };

  const wallet = getWallet();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>
            {getGreeting()} {getGreetingEmoji()}
          </Text>
          <Text style={styles.userName}>{tech?.full_name || "Partner"}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.notificationBtn}>
            <Ionicons name="notifications-outline" size={22} color={COLORS.dark} />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileBtn}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {tech?.full_name?.charAt(0)?.toUpperCase() || "P"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
            colors={[COLORS.dark]} tintColor={COLORS.dark} />
        }
      >
        {/* Today's Earnings Card */}
        <View style={styles.earningsCard}>
          <LinearGradient
            colors={["#000000", "#94a3b9"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.earningsGradient}
          >
            <View style={styles.earningsTop}>
              <View>
                <Text style={styles.earningsLabel}>Today's Earnings</Text>
                <Text style={styles.earningsAmount}>
                  ₹{stats ? fmtDec(stats.today.earnings) : "0.00"}
                </Text>
              </View>
              {stats?.performance && (
                <View style={[styles.performanceBadge, {
                  backgroundColor: stats.performance.isUp
                    ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                }]}>
                  <Ionicons
                    name={stats.performance.isUp ? "trending-up" : "trending-down"}
                    size={16}
                    color={stats.performance.isUp ? COLORS.success : COLORS.error}
                  />
                  <Text style={[styles.performanceText,
                    { color: stats.performance.isUp ? COLORS.success : COLORS.error }
                  ]}>
                    {Math.abs(stats.performance.earningsChange)}%
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.earningsStatsRow}>
              <View style={styles.earningsStat}>
                <View style={styles.earningsStatIcon}>
                  <Ionicons name="car-sport" size={16} color={COLORS.white} />
                </View>
                <Text style={styles.earningsStatValue}>{stats?.today?.rides || 0}</Text>
                <Text style={styles.earningsStatLabel}>Rides</Text>
              </View>
              <View style={styles.earningsStatDivider} />
              <View style={styles.earningsStat}>
                <View style={styles.earningsStatIcon}>
                  <Ionicons name="cash-outline" size={16} color={COLORS.white} />
                </View>
                <Text style={styles.earningsStatValue}>
                  ₹{stats ? fmt(stats.today.cashCollected || 0) : "0"}
                </Text>
                <Text style={styles.earningsStatLabel}>Cash</Text>
              </View>
              <View style={styles.earningsStatDivider} />
              <View style={styles.earningsStat}>
                <View style={styles.earningsStatIcon}>
                  <Ionicons name="phone-portrait-outline" size={16} color={COLORS.white} />
                </View>
                <Text style={styles.earningsStatValue}>
                  ₹{stats ? fmt(stats.today.onlineEarned || 0) : "0"}
                </Text>
                <Text style={styles.earningsStatLabel}>Online</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Wallet Summary */}
        <TouchableOpacity
          style={styles.walletCard}
          onPress={() => navigation?.navigate("Wallet")}
          activeOpacity={0.7}
        >
          <View style={styles.walletLeft}>
            <View style={styles.walletIconBox}>
              <Ionicons name="wallet" size={24} color={COLORS.white} />
            </View>
            <View>
              <Text style={styles.walletLabel}>Withdrawable Balance</Text>
              <Text style={styles.walletAmount}>
                ₹{stats ? fmtDec(wallet.withdrawable) : "0.00"}
              </Text>
            </View>
          </View>
          <View style={styles.walletRight}>
            {wallet.platformDues > 0 && (
              <View style={styles.duesBadge}>
                <Text style={styles.duesText}>₹{fmt(wallet.platformDues)} dues</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
          </View>
        </TouchableOpacity>

        {/* Quick Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Earnings Overview</Text>
          <View style={styles.quickStatsGrid}>
            <TouchableOpacity style={styles.quickStatCard}>
              <View style={[styles.quickStatIconBox, { backgroundColor: COLORS.indigoLight }]}>
                <Ionicons name="calendar-outline" size={20} color={COLORS.indigo} />
              </View>
              <Text style={styles.quickStatValue}>₹{stats ? fmt(stats.week?.earnings) : "0"}</Text>
              <Text style={styles.quickStatLabel}>This Week</Text>
              <Text style={styles.quickStatSub}>{stats?.week?.rides || 0} rides</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickStatCard}>
              <View style={[styles.quickStatIconBox, { backgroundColor: COLORS.warningLight }]}>
                <Ionicons name="calendar" size={20} color={COLORS.warning} />
              </View>
              <Text style={styles.quickStatValue}>₹{stats ? fmt(stats.month?.earnings) : "0"}</Text>
              <Text style={styles.quickStatLabel}>This Month</Text>
              <Text style={styles.quickStatSub}>{stats?.month?.rides || 0} rides</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickStatCard}>
              <View style={[styles.quickStatIconBox, { backgroundColor: COLORS.successLight }]}>
                <Ionicons name="trophy" size={20} color={COLORS.success} />
              </View>
              <Text style={styles.quickStatValue}>{stats?.lifetime?.rides || 0}</Text>
              <Text style={styles.quickStatLabel}>Total Rides</Text>
              <Text style={styles.quickStatSub}>All time</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Today's Breakdown */}
        {stats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Breakdown</Text>
            <View style={styles.breakdownCard}>
              <View style={styles.breakdownRow}>
                <View style={styles.breakdownLeft}>
                  <View style={[styles.breakdownIcon, { backgroundColor: COLORS.lightGray }]}>
                    <Ionicons name="receipt-outline" size={18} color={COLORS.dark} />
                  </View>
                  <Text style={styles.breakdownLabel}>Total Fare</Text>
                </View>
                <Text style={styles.breakdownValue}>₹{fmtDec(stats.today.totalFare)}</Text>
              </View>

              <View style={styles.breakdownRow}>
                <View style={styles.breakdownLeft}>
                  <View style={[styles.breakdownIcon, { backgroundColor: COLORS.errorLight }]}>
                    <Ionicons name="remove-circle-outline" size={18} color={COLORS.error} />
                  </View>
                  <Text style={styles.breakdownLabel}>Platform Commission</Text>
                </View>
                <Text style={[styles.breakdownValue, { color: COLORS.error }]}>
                  -₹{fmtDec(stats.today.commission)}
                </Text>
              </View>

              <View style={styles.breakdownDivider} />

              <View style={styles.breakdownRow}>
                <View style={styles.breakdownLeft}>
                  <View style={[styles.breakdownIcon, { backgroundColor: COLORS.successLight }]}>
                    <Ionicons name="wallet" size={18} color={COLORS.success} />
                  </View>
                  <Text style={[styles.breakdownLabel, { fontWeight: "700" }]}>Your Earnings</Text>
                </View>
                <Text style={[styles.breakdownValue, styles.breakdownTotal]}>
                  ₹{fmtDec(stats.today.earnings)}
                </Text>
              </View>

              {/* Cash vs Online today */}
              {(stats.today.cashCollected > 0 || stats.today.onlineEarned > 0) && (
                <>
                  <View style={styles.breakdownDivider} />
                  <View style={styles.cashOnlineTodayRow}>
                    <View style={[styles.cashOnlineTodayItem, { backgroundColor: COLORS.orangeLight }]}>
                      <Ionicons name="cash-outline" size={14} color={COLORS.orange} />
                      <Text style={[styles.cashOnlineTodayText, { color: COLORS.orange }]}>
                        Cash: ₹{fmt(stats.today.cashCollected)}
                      </Text>
                    </View>
                    <View style={[styles.cashOnlineTodayItem, { backgroundColor: COLORS.blueLight }]}>
                      <Ionicons name="phone-portrait-outline" size={14} color={COLORS.blue} />
                      <Text style={[styles.cashOnlineTodayText, { color: COLORS.blue }]}>
                        Online: ₹{fmt(stats.today.onlineEarned)}
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionCard} onPress={() => navigation?.navigate("Wallet")}>
              <View style={[styles.actionIcon, { backgroundColor: COLORS.indigoLight }]}>
                <Ionicons name="wallet-outline" size={22} color={COLORS.indigo} />
              </View>
              <Text style={styles.actionLabel}>Wallet</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: COLORS.warningLight }]}>
                <Ionicons name="star-outline" size={22} color={COLORS.warning} />
              </View>
              <Text style={styles.actionLabel}>Ratings</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: COLORS.successLight }]}>
                <Ionicons name="help-circle-outline" size={22} color={COLORS.success} />
              </View>
              <Text style={styles.actionLabel}>Support</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: COLORS.pinkLight }]}>
                <Ionicons name="gift-outline" size={22} color={COLORS.pink} />
              </View>
              <Text style={styles.actionLabel}>Rewards</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tips Card */}
        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Text style={styles.tipsEmoji}>💡</Text>
            <Text style={styles.tipsTitle}>Quick Tips</Text>
          </View>
          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
              <Text style={styles.tipText}>Online payments settle instantly to your wallet</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
              <Text style={styles.tipText}>Cash ride fees auto-deduct from online earnings</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
              <Text style={styles.tipText}>Withdraw anytime when balance exceeds ₹100</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 16, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
  headerLeft: {},
  greeting: { fontSize: 14, color: COLORS.gray, fontWeight: "500" },
  userName: { fontSize: 22, fontWeight: "800", color: COLORS.dark, marginTop: 4 },
  headerRight: { flexDirection: "row", alignItems: "center" },
  notificationBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.lightGray, justifyContent: "center", alignItems: "center", marginRight: 12 },
  notificationDot: { position: "absolute", top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.error, borderWidth: 2, borderColor: COLORS.white },
  profileBtn: {},
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.dark, justifyContent: "center", alignItems: "center" },
  avatarText: { color: COLORS.white, fontSize: 18, fontWeight: "700" },

  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 20, paddingBottom: 40 },

  // Earnings Card
  earningsCard: { marginHorizontal: 20, borderRadius: 20, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  earningsGradient: { padding: 20 },
  earningsTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  earningsLabel: { color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: "500" },
  earningsAmount: { color: COLORS.white, fontSize: 36, fontWeight: "800", marginTop: 6, letterSpacing: -1 },
  performanceBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  performanceText: { fontSize: 13, fontWeight: "700", marginLeft: 4 },
  earningsStatsRow: { flexDirection: "row", marginTop: 24, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 14, padding: 16 },
  earningsStat: { flex: 1, alignItems: "center" },
  earningsStatIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center", marginBottom: 8 },
  earningsStatValue: { color: COLORS.white, fontSize: 15, fontWeight: "700" },
  earningsStatLabel: { color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 4, fontWeight: "500" },
  earningsStatDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.15)", marginHorizontal: 8 },

  // Wallet Card
  walletCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: COLORS.white, borderRadius: 16, padding: 18, marginHorizontal: 20, marginTop: 20, borderWidth: 1, borderColor: COLORS.border },
  walletLeft: { flexDirection: "row", alignItems: "center" },
  walletIconBox: { width: 52, height: 52, borderRadius: 14, backgroundColor: COLORS.dark, justifyContent: "center", alignItems: "center", marginRight: 14 },
  walletLabel: { fontSize: 13, color: COLORS.gray, fontWeight: "500" },
  walletAmount: { fontSize: 22, fontWeight: "800", color: COLORS.dark, marginTop: 4 },
  walletRight: { flexDirection: "row", alignItems: "center" },
  duesBadge: { backgroundColor: COLORS.orangeLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 8 },
  duesText: { fontSize: 10, fontWeight: "700", color: COLORS.orange },

  // Section
  section: { marginTop: 28, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: COLORS.dark, marginBottom: 16 },

  // Quick Stats
  quickStatsGrid: { flexDirection: "row", justifyContent: "space-between" },
  quickStatCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginHorizontal: 4, alignItems: "center", borderWidth: 1, borderColor: COLORS.border },
  quickStatIconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  quickStatValue: { fontSize: 18, fontWeight: "800", color: COLORS.dark },
  quickStatLabel: { fontSize: 12, color: COLORS.gray, marginTop: 4, fontWeight: "500" },
  quickStatSub: { fontSize: 10, color: "#9CA3AF", marginTop: 2 },

  // Breakdown
  breakdownCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  breakdownRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  breakdownLeft: { flexDirection: "row", alignItems: "center" },
  breakdownIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 12 },
  breakdownLabel: { fontSize: 14, color: "#374151" },
  breakdownValue: { fontSize: 15, fontWeight: "600", color: COLORS.dark },
  breakdownDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  breakdownTotal: { fontSize: 17, fontWeight: "800", color: COLORS.success },
  cashOnlineTodayRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  cashOnlineTodayItem: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 8, borderRadius: 8 },
  cashOnlineTodayText: { fontSize: 12, fontWeight: "600", marginLeft: 6 },

  // Actions
  actionsGrid: { flexDirection: "row", justifyContent: "space-between" },
  actionCard: { flex: 1, alignItems: "center", marginHorizontal: 4 },
  actionIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  actionLabel: { fontSize: 12, color: "#374151", fontWeight: "600" },

  // Tips
  tipsCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 18, marginHorizontal: 20, marginTop: 28, borderWidth: 1, borderColor: COLORS.border },
  tipsHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  tipsEmoji: { fontSize: 20, marginRight: 8 },
  tipsTitle: { fontSize: 16, fontWeight: "700", color: COLORS.dark },
  tipsList: {},
  tipItem: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  tipText: { fontSize: 14, color: COLORS.gray, marginLeft: 12 },
});