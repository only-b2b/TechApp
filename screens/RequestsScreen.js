// screens/RequestsScreen.js

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../config";
import { useAuth } from "../auth/AuthContext";

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
  blue: "#3B82F6",
  blueLight: "rgba(59, 130, 246, 0.1)",
  orange: "#F59E0B",
  orangeLight: "rgba(245, 158, 11, 0.1)",
};

export default function RequestsScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { tech } = useAuth();

  const isCarWash = tech?.category === "carwash" || tech?.category === "car_wash";

  const fetchOrders = async () => {
    if (!tech?.id || !tech?.category) return;

    try {
      const res = await fetch(
        `${API_BASE_URL}/orders/pending/list?category=${tech.category}&technician_id=${tech.id}`
      );
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      console.log("FETCH ORDERS ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  useEffect(() => {
    if (!tech?.id) return;

    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [tech?.id, tech?.category]);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <View style={styles.loaderCard}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loaderText}>Loading requests...</Text>
        </View>
      </View>
    );
  }

  const getPaymentMethod = (item) => item.payment_method || "cash";
  const getCustomerTotal = (item) => parseFloat(item.customer_total || item.price || 0);

  const renderItem = ({ item }) => {
    const payMethod = getPaymentMethod(item);
    const isCash = payMethod === "cash";
    const customerTotal = getCustomerTotal(item);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("RequestDetailScreen", { orderId: item.id })}
        activeOpacity={0.7}
      >
        {/* New Badge */}
        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>NEW</Text>
        </View>

        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.iconBox}>
            <Ionicons
              name={isCarWash ? "water-outline" : "car-sport-outline"}
              size={22}
              color={COLORS.dark}
            />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.priceText}>₹{customerTotal}</Text>
            <Text style={styles.metaText}>
              {item.distance ? `${item.distance} km` : "—"} •{" "}
              {item.duration ? `${item.duration} min` : "—"}
            </Text>
          </View>
        </View>

        {/* Payment & Client */}
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
          {item.client_name && (
            <Text style={styles.clientName}>{item.client_name}</Text>
          )}
        </View>

        {/* Location */}
        <View style={styles.locationSection}>
          <View style={styles.locationRow}>
            <View style={[styles.locationDot, { backgroundColor: COLORS.success }]} />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.pickup_address || "Client location"}
            </Text>
          </View>

          {!isCarWash && item.drop_address && (
            <>
              <View style={styles.locationLine} />
              <View style={styles.locationRow}>
                <View style={[styles.locationDot, { backgroundColor: COLORS.error }]} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {item.drop_address}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <Text style={styles.viewText}>View Details</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.dark} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>New Requests</Text>
        <View style={styles.countPill}>
          <Text style={styles.countPillText}>{orders.length}</Text>
        </View>
      </View>

      <FlatList
        data={orders}
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
              <Ionicons name="hourglass-outline" size={40} color={COLORS.gray} />
            </View>
            <Text style={styles.emptyTitle}>No new requests</Text>
            <Text style={styles.emptySubtitle}>Pull down to refresh</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.lightGray },
  loaderContainer: {
    flex: 1, justifyContent: "center", alignItems: "center",
    backgroundColor: COLORS.lightGray,
  },
  loaderCard: {
    backgroundColor: COLORS.white, padding: 30, borderRadius: 20,
    alignItems: "center", shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1,
    shadowRadius: 10, elevation: 5,
  },
  loaderText: { marginTop: 12, fontSize: 15, fontWeight: "500", color: COLORS.gray },

  screenHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  screenTitle: { fontSize: 22, fontWeight: "800", color: COLORS.dark },
  countPill: {
    backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 12, minWidth: 28, alignItems: "center",
  },
  countPillText: { fontSize: 13, fontWeight: "700", color: COLORS.white },

  listContent: { padding: 16, paddingBottom: 100 },

  card: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 18,
    marginBottom: 12, borderWidth: 1, borderColor: COLORS.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  newBadge: {
    position: "absolute", top: 14, right: 14,
    backgroundColor: COLORS.success,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  newBadgeText: { color: COLORS.white, fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  iconBox: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: COLORS.lightGray,
    justifyContent: "center", alignItems: "center", marginRight: 14,
  },
  headerInfo: { flex: 1 },
  priceText: { fontSize: 22, fontWeight: "800", color: COLORS.dark },
  metaText: { fontSize: 13, color: COLORS.gray, marginTop: 3 },

  paymentRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 12,
  },
  paymentBadge: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  paymentBadgeText: { fontSize: 11, fontWeight: "700", marginLeft: 4 },
  clientName: { fontSize: 13, fontWeight: "600", color: COLORS.dark },

  locationSection: { marginBottom: 12 },
  locationRow: { flexDirection: "row", alignItems: "center" },
  locationDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  locationLine: {
    width: 2, height: 20, backgroundColor: COLORS.border,
    marginLeft: 4, marginVertical: 4,
  },
  locationText: { flex: 1, fontSize: 14, color: COLORS.dark },

  cardFooter: {
    flexDirection: "row", alignItems: "center", justifyContent: "flex-end",
    paddingTop: 14, borderTopWidth: 1, borderTopColor: COLORS.lightGray,
  },
  viewText: { fontSize: 14, fontWeight: "600", color: COLORS.dark, marginRight: 4 },

  emptyBox: { alignItems: "center", paddingTop: 80 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.white, justifyContent: "center",
    alignItems: "center", marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: COLORS.dark },
  emptySubtitle: { fontSize: 14, color: COLORS.gray, marginTop: 6 },
});