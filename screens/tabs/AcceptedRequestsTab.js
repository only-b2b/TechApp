// screens/tab/acceptedRequestedtab.js

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../../config";
import { useAuth } from "../../auth/AuthContext";

const COLORS = {
  primary: "#000000",
  white: "#FFFFFF",
  dark: "#1F2937",
  gray: "#6B7280",
  lightGray: "#F3F4F6",
  border: "#E5E7EB",
  success: "#10B981",
  successLight: "rgba(16, 185, 129, 0.1)",
  error: "#EF4444",
  warning: "#F59E0B",
  warningLight: "rgba(245, 158, 11, 0.1)",
  blue: "#3B82F6",
  blueLight: "rgba(59, 130, 246, 0.1)",
  orange: "#F59E0B",
  orangeLight: "rgba(245, 158, 11, 0.1)",
};

const STATUS_CONFIG = {
  accepted: { label: "Navigate", color: COLORS.blue, icon: "navigate-outline", bg: COLORS.blueLight },
  arrived: { label: "OTP Pending", color: COLORS.warning, icon: "key-outline", bg: COLORS.warningLight },
  in_progress: { label: "In Progress", color: COLORS.success, icon: "play-outline", bg: COLORS.successLight },
};

export default function AcceptedRequestsTab({ navigation }) {
  const [leads, setLeads] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const { tech } = useAuth();

  const fetchLeads = async () => {
    if (!tech) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/orders/accepted/list?technician_id=${tech.id}`
      );
      const data = await res.json();
      setLeads(data);
    } catch (err) {
      console.log("Fetch error:", err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLeads();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchLeads();
    const i = setInterval(fetchLeads, 5000);
    return () => clearInterval(i);
  }, [tech]);

  const isCarWash = tech?.category === "carwash" || tech?.category === "car_wash";

  const getStatusConfig = (status) => {
    return STATUS_CONFIG[status] || STATUS_CONFIG.accepted;
  };

  const handlePress = (item) => {
    if (isCarWash) {
      navigation.navigate("ActiveWashScreen", { orderId: item.id });
    } else {
      navigation.navigate("ActiveRideScreen", { orderId: item.id });
    }
  };

  const getPaymentMethod = (item) => {
    return item.payment_method || item.payment_mode || "cash";
  };

  const getCustomerTotal = (item) => {
    return parseFloat(item.customer_total || item.price || 0);
  };

  const renderItem = ({ item }) => {
    const statusConfig = getStatusConfig(item.status);
    const payMethod = getPaymentMethod(item);
    const isCash = payMethod === "cash";
    const customerTotal = getCustomerTotal(item);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handlePress(item)}
        activeOpacity={0.7}
      >
        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.color }]}>
          <Ionicons name={statusConfig.icon} size={12} color={COLORS.white} />
          <Text style={styles.statusBadgeText}>{statusConfig.label}</Text>
        </View>

        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: statusConfig.bg }]}>
            <Ionicons
              name={isCarWash ? "water" : "car-sport"}
              size={22}
              color={statusConfig.color}
            />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.clientName}>
              {item.client_name || "Client"}
            </Text>
            <Text style={styles.priceText}>₹{customerTotal}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="location-outline" size={16} color={COLORS.gray} />
            <Text style={styles.statText}>
              {item.distance ? `${item.distance} km` : "—"}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={16} color={COLORS.gray} />
            <Text style={styles.statText}>
              {item.duration ? `${item.duration} min` : "—"}
            </Text>
          </View>
          {item.vehicle && (
            <View style={styles.statItem}>
              <Ionicons name="car-outline" size={16} color={COLORS.gray} />
              <Text style={styles.statText}>{item.vehicle}</Text>
            </View>
          )}
        </View>

        {/* Payment Info */}
        <View style={styles.paymentRow}>
          <View style={[
            styles.paymentBadge,
            { backgroundColor: isCash ? COLORS.orangeLight : COLORS.blueLight }
          ]}>
            <Ionicons
              name={isCash ? "cash-outline" : "phone-portrait-outline"}
              size={14}
              color={isCash ? COLORS.orange : COLORS.blue}
            />
            <Text style={[
              styles.paymentBadgeText,
              { color: isCash ? COLORS.orange : COLORS.blue }
            ]}>
              {isCash ? "CASH" : "ONLINE"}
            </Text>
          </View>
          {isCash && (
            <Text style={styles.collectText}>Collect ₹{customerTotal}</Text>
          )}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: statusConfig.color }]}
          onPress={() => handlePress(item)}
        >
          <Text style={styles.actionBtnText}>
            {item.status === "accepted" && "Start Navigation"}
            {item.status === "arrived" && "Enter OTP"}
            {item.status === "in_progress" && "Continue"}
          </Text>
          <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.countHeader}>
        <View style={styles.countLeft}>
          <View style={[styles.countDot, { backgroundColor: COLORS.success }]} />
          <Text style={styles.countText}>{leads.length} active jobs</Text>
        </View>
      </View>

      <FlatList
        data={leads}
        keyExtractor={(o) => o.id.toString()}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Ionicons name="checkmark-done-circle-outline" size={40} color={COLORS.gray} />
            </View>
            <Text style={styles.emptyTitle}>No active jobs</Text>
            <Text style={styles.emptySubtitle}>Accept requests to get started</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.lightGray },
  countHeader: {
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  countLeft: { flexDirection: "row", alignItems: "center" },
  countDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  countText: { fontSize: 14, fontWeight: "600", color: COLORS.gray },
  listContent: { padding: 16, paddingBottom: 100 },

  card: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 18,
    marginBottom: 12, borderWidth: 1, borderColor: COLORS.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  statusBadge: {
    position: "absolute", top: 14, right: 14,
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  statusBadgeText: { color: COLORS.white, fontSize: 11, fontWeight: "700", marginLeft: 4 },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  iconBox: {
    width: 48, height: 48, borderRadius: 14,
    justifyContent: "center", alignItems: "center", marginRight: 14,
  },
  headerInfo: { flex: 1 },
  clientName: { fontSize: 16, fontWeight: "700", color: COLORS.dark },
  priceText: { fontSize: 22, fontWeight: "800", color: COLORS.dark, marginTop: 4 },

  statsRow: {
    flexDirection: "row", marginBottom: 12, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.lightGray,
  },
  statItem: { flexDirection: "row", alignItems: "center", marginRight: 24 },
  statText: { fontSize: 14, color: COLORS.dark, fontWeight: "500", marginLeft: 6 },

  paymentRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 14,
  },
  paymentBadge: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  paymentBadgeText: { fontSize: 11, fontWeight: "700", marginLeft: 4 },
  collectText: { fontSize: 12, fontWeight: "600", color: COLORS.orange },

  actionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 14, borderRadius: 12,
  },
  actionBtnText: { color: COLORS.white, fontSize: 15, fontWeight: "700", marginRight: 8 },

  emptyBox: { alignItems: "center", paddingTop: 80 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.lightGray, justifyContent: "center",
    alignItems: "center", marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: COLORS.dark },
  emptySubtitle: { fontSize: 14, color: COLORS.gray, marginTop: 6 },
});