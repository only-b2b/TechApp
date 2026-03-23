import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { colors } from "../theme/colors";
import ScreenWrapper from "../components/ScreenWrapper";
import { useAuth } from "../auth/AuthContext";
import { API_BASE_URL } from "../config";
import Icon from "react-native-vector-icons/Ionicons";

export default function DashboardScreen() {
  const { tech } = useAuth();
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/earnings/overview?technician_id=${tech.id}`
      );
      
      // ✅ ADD ERROR HANDLING
      if (!res.ok) {
        console.error(`Stats API Error: ${res.status}`);
        return;
      }
      
      const data = await res.json();
      console.log("Dashboard stats:", data);
      setStats(data);
      
    } catch (err) {
      console.error("Fetch stats error:", err.message);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  return (
    <ScreenWrapper>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.title}>Dashboard</Text>

        {/* Welcome Card */}
        <View style={styles.card}>
          <View style={styles.welcomeHeader}>
            <View>
              <Text style={styles.welcomeTitle}>Welcome Back 👋</Text>
              <Text style={styles.welcomeName}>{tech.full_name}</Text>
            </View>
            <View style={styles.badge}>
              <Icon name="star" size={16} color="#F59E0B" />
              <Text style={styles.badgeText}>Pro</Text>
            </View>
          </View>
        </View>

        {/* Today's Earnings */}
        {stats && (
          <View style={styles.earningsCard}>
            <Text style={styles.earningsLabel}>Today's Earnings</Text>
            <Text style={styles.earningsAmount}>₹{stats.today.earnings.toFixed(2)}</Text>
            <Text style={styles.earningsSubtext}>
              {stats.today.rides} {stats.today.rides === 1 ? "ride" : "rides"} completed
            </Text>
          </View>
        )}

        {/* Quick Stats */}
        {stats && (
          <View style={styles.quickStats}>
            <View style={styles.quickStatItem}>
              <Icon name="calendar-outline" size={20} color={colors.primary} />
              <Text style={styles.quickStatValue}>₹{stats.week.earnings.toFixed(0)}</Text>
              <Text style={styles.quickStatLabel}>This Week</Text>
            </View>

            <View style={styles.quickStatItem}>
              <Icon name="calendar" size={20} color="#3B82F6" />
              <Text style={styles.quickStatValue}>₹{stats.month.earnings.toFixed(0)}</Text>
              <Text style={styles.quickStatLabel}>This Month</Text>
            </View>

            <View style={styles.quickStatItem}>
              <Icon name="briefcase" size={20} color="#10B981" />
              <Text style={styles.quickStatValue}>{stats.lifetime.rides}</Text>
              <Text style={styles.quickStatLabel}>Total Rides</Text>
            </View>
          </View>
        )}

        {/* Tips Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💡 Tips</Text>
          <Text style={styles.sub}>Keep app open for live requests</Text>
          <Text style={styles.sub}>Check Work tab for new requests</Text>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  title: { fontSize: 22, fontWeight: "900", color: colors.text, marginBottom: 12 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  welcomeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  welcomeTitle: {
    fontSize: 14,
    color: colors.subtext,
    fontWeight: "600",
  },
  welcomeName: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.text,
    marginTop: 4,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: "#F59E0B",
    fontWeight: "700",
    marginLeft: 4,
    fontSize: 12,
  },
  earningsCard: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  earningsLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "600",
  },
  earningsAmount: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "900",
    marginTop: 8,
  },
  earningsSubtext: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    marginTop: 4,
  },
  quickStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  quickStatItem: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickStatValue: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.text,
    marginTop: 8,
  },
  quickStatLabel: {
    fontSize: 11,
    color: colors.subtext,
    marginTop: 4,
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
  sub: { color: colors.subtext, marginTop: 6 },
});
