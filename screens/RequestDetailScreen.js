// screens/RequestDetailScreen.js

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
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
  errorLight: "rgba(239, 68, 68, 0.1)",
  warning: "#F59E0B",
  warningLight: "rgba(245, 158, 11, 0.1)",
  blue: "#3B82F6",
  blueLight: "rgba(59, 130, 246, 0.1)",
  orange: "#F59E0B",
  orangeLight: "rgba(245, 158, 11, 0.1)",
};

const mapStyle = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9c9c9" }] },
];

export default function RequestDetailScreen({ route, navigation }) {
  const orderId = route?.params?.orderId;
  const { tech } = useAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [invalidOrder, setInvalidOrder] = useState(false);

  const isCarWash = tech?.category === "carwash" || tech?.category === "car_wash";

  useEffect(() => {
    if (!orderId || orderId === "null" || orderId === "undefined") {
      setInvalidOrder(true);
      Alert.alert("Error", "Invalid order ID", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    }
  }, [orderId]);

  useEffect(() => {
    if (!orderId || invalidOrder) return;

    const fetchOrder = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/orders/${orderId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data || !data.id) throw new Error("Invalid order data");
        setOrder(data);
      } catch (error) {
        Alert.alert("Error", "Failed to load order details", [
          { text: "Go Back", onPress: () => navigation.goBack() },
        ]);
      }
    };

    fetchOrder();
  }, [orderId, invalidOrder]);

  const getPaymentMethod = () => {
    return order?.payment_method || order?.payment_mode || "cash";
  };

  const getCustomerTotal = () => {
    return parseFloat(order?.customer_total || order?.price || 0);
  };

  const getDriverEarning = () => {
    return parseFloat(
      order?.paymentBreakdown?.driverEarning ||
      order?.driver_earning ||
      order?.technician_earnings ||
      0
    );
  };

  const getPlatformEarning = () => {
    return parseFloat(
      order?.paymentBreakdown?.totalPlatformEarning ||
      order?.total_platform_earning ||
      order?.platform_commission ||
      0
    );
  };

  const accept = async () => {
    if (!tech?.id || loading) return;

    setLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(`${API_BASE_URL}/orders/${orderId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technician_id: tech.id }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to accept order");

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const targetScreen = isCarWash ? "ActiveWashScreen" : "ActiveRideScreen";
      navigation.replace(targetScreen, { orderId: String(orderId) });
    } catch (error) {
      setLoading(false);

      if (error.name === "AbortError") {
        Alert.alert("Timeout", "Request took too long. Try again.", [
          { text: "OK" },
          { text: "Retry", onPress: accept },
        ]);
      } else if (error.message === "Network request failed") {
        Alert.alert("Network Error", "Check your internet connection", [
          { text: "OK" },
          { text: "Retry", onPress: accept },
        ]);
      } else {
        Alert.alert("Unable to Accept", error.message || "Please try again");
      }
    }
  };

  const reject = async () => {
    Alert.alert("Reject Request", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reject",
        style: "destructive",
        onPress: async () => {
          try {
            await fetch(`${API_BASE_URL}/orders/${orderId}/reject`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ technician_id: tech.id }),
            });
          } catch (e) {}
          navigation.goBack();
        },
      },
    ]);
  };

  if (invalidOrder) {
    return (
      <View style={styles.loaderContainer}>
        <View style={styles.loaderCard}>
          <Ionicons name="alert-circle" size={48} color={COLORS.error} />
          <Text style={styles.loaderText}>Invalid Order</Text>
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.loaderContainer}>
        <View style={styles.loaderCard}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loaderText}>Loading order...</Text>
        </View>
      </View>
    );
  }

  const hasLocation = order.pickup_lat && order.pickup_lng;
  const paymentMethod = getPaymentMethod();
  const isCash = paymentMethod === "cash";
  const customerTotal = getCustomerTotal();
  const driverEarning = getDriverEarning();
  const platformEarning = getPlatformEarning();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Details</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Map Preview */}
        {hasLocation && (
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              customMapStyle={mapStyle}
              initialRegion={{
                latitude: parseFloat(order.pickup_lat),
                longitude: parseFloat(order.pickup_lng),
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
            >
              <Marker
                coordinate={{
                  latitude: parseFloat(order.pickup_lat),
                  longitude: parseFloat(order.pickup_lng),
                }}
              >
                <View style={styles.mapMarker}>
                  <Ionicons name="location" size={18} color={COLORS.white} />
                </View>
              </Marker>
            </MapView>
          </View>
        )}

        {/* ====== EARNINGS CARD (COMMISSION AWARE) ====== */}
        <View style={styles.earningsCard}>
          <View style={styles.earningsHeader}>
            <Text style={styles.earningsLabel}>Customer Pays</Text>
            <Text style={styles.earningsTotal}>₹{customerTotal}</Text>
          </View>

          <View style={styles.earningsDivider} />

          <View style={styles.earningsRow}>
            <View style={styles.earningsItem}>
              <Text style={styles.earningsItemLabel}>Your Earning</Text>
              <Text style={[styles.earningsItemValue, { color: COLORS.success }]}>
                ₹{driverEarning || customerTotal}
              </Text>
            </View>
            {platformEarning > 0 && (
              <View style={styles.earningsItem}>
                <Text style={styles.earningsItemLabel}>Platform Fee</Text>
                <Text style={[styles.earningsItemValue, { color: COLORS.gray }]}>
                  ₹{platformEarning}
                </Text>
              </View>
            )}
          </View>

          {/* Earnings bar */}
          {driverEarning > 0 && platformEarning > 0 && (
            <View style={styles.earningsBarContainer}>
              <View style={styles.earningsBar}>
                <View style={[
                  styles.earningsBarSegment,
                  {
                    flex: driverEarning,
                    backgroundColor: COLORS.success,
                    borderTopLeftRadius: 4, borderBottomLeftRadius: 4,
                  }
                ]} />
                <View style={[
                  styles.earningsBarSegment,
                  {
                    flex: platformEarning,
                    backgroundColor: COLORS.gray,
                    borderTopRightRadius: 4, borderBottomRightRadius: 4,
                  }
                ]} />
              </View>
            </View>
          )}

          {/* Stats */}
          <View style={styles.earningsStats}>
            <View style={styles.earningsStat}>
              <Ionicons name="navigate-outline" size={16} color={COLORS.gray} />
              <Text style={styles.earningsStatText}>
                {order.distance ? `${order.distance} km` : "—"}
              </Text>
            </View>
            <View style={styles.earningsStat}>
              <Ionicons name="time-outline" size={16} color={COLORS.gray} />
              <Text style={styles.earningsStatText}>
                {order.duration ? `${order.duration} min` : "—"}
              </Text>
            </View>
          </View>

          {/* Payment Method */}
          <View style={[
            styles.paymentMethodBadge,
            { backgroundColor: isCash ? COLORS.orangeLight : COLORS.blueLight }
          ]}>
            <Ionicons
              name={isCash ? "cash-outline" : "phone-portrait-outline"}
              size={16}
              color={isCash ? COLORS.orange : COLORS.blue}
            />
            <Text style={[
              styles.paymentMethodText,
              { color: isCash ? COLORS.orange : COLORS.blue }
            ]}>
              {isCash ? "Cash Payment" : "Online Payment"}
            </Text>
          </View>

          {isCash && (
            <View style={styles.cashNote}>
              <Ionicons name="information-circle" size={16} color={COLORS.orange} />
              <Text style={styles.cashNoteText}>
                Collect ₹{customerTotal} cash from customer. Platform fee will be adjusted from your wallet.
              </Text>
            </View>
          )}
        </View>

        {/* Service Details */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Service Details</Text>

          {isCarWash ? (
            <>
              <DetailRow icon="water-outline" label="Service" value="Car Wash" />
              {order.package_name && (
                <DetailRow icon="sparkles-outline" label="Package" value={order.package_name} />
              )}
              {order.vehicle && (
                <DetailRow icon="car-outline" label="Vehicle" value={order.vehicle} />
              )}
            </>
          ) : (
            <DetailRow icon="car-sport-outline" label="Service" value="Driver Service" />
          )}
        </View>

        {/* Location Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>
            {isCarWash ? "Service Location" : "Route"}
          </Text>

          <View style={styles.locationItem}>
            <View style={[styles.locationDot, { backgroundColor: COLORS.success }]} />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>
                {isCarWash ? "Client Address" : "Pickup"}
              </Text>
              <Text style={styles.locationText}>
                {order.pickup_address || "Location will be shared"}
              </Text>
            </View>
          </View>

          {!isCarWash && order.drop_address && (
            <>
              <View style={styles.locationLine} />
              <View style={styles.locationItem}>
                <View style={[styles.locationDot, { backgroundColor: COLORS.error }]} />
                <View style={styles.locationInfo}>
                  <Text style={styles.locationLabel}>Drop</Text>
                  <Text style={styles.locationText}>{order.drop_address}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Note */}
        <View style={styles.noteCard}>
          <Ionicons name="information-circle" size={20} color={COLORS.success} />
          <Text style={styles.noteText}>
            {isCarWash
              ? "Verify client identity with OTP before starting"
              : "Client will share pickup OTP when you arrive"}
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.rejectBtn} onPress={reject} activeOpacity={0.8}>
          <Ionicons name="close" size={24} color={COLORS.error} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.acceptBtn, loading && { opacity: 0.7 }]}
          onPress={accept}
          disabled={loading}
          activeOpacity={0.9}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Text style={styles.acceptText}>Accept Request</Text>
              <View style={styles.acceptEarningBadge}>
                <Text style={styles.acceptEarningText}>
                  ₹{driverEarning || customerTotal}
                </Text>
              </View>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const DetailRow = ({ icon, label, value }) => (
  <View style={styles.detailRow}>
    <View style={styles.detailIcon}>
      <Ionicons name={icon} size={18} color={COLORS.dark} />
    </View>
    <View style={styles.detailContent}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  </View>
);

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
  loaderText: { marginTop: 12, fontSize: 15, fontWeight: "600", color: COLORS.dark },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 56 : 40, paddingBottom: 16,
    paddingHorizontal: 16, backgroundColor: COLORS.white,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: COLORS.lightGray,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: COLORS.dark },

  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 120 },

  mapContainer: {
    height: 160, borderRadius: 16, overflow: "hidden", marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  map: { ...StyleSheet.absoluteFillObject },
  mapMarker: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary,
    alignItems: "center", justifyContent: "center",
    borderWidth: 3, borderColor: COLORS.white,
  },

  // Earnings Card
  earningsCard: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 20,
    marginBottom: 16, borderWidth: 1, borderColor: COLORS.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  earningsHeader: { alignItems: "center", marginBottom: 12 },
  earningsLabel: { color: COLORS.gray, fontSize: 13, marginBottom: 4 },
  earningsTotal: { fontSize: 36, fontWeight: "900", color: COLORS.dark },
  earningsDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  earningsRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 12 },
  earningsItem: { alignItems: "center" },
  earningsItemLabel: { fontSize: 12, color: COLORS.gray, marginBottom: 4 },
  earningsItemValue: { fontSize: 20, fontWeight: "800" },
  earningsBarContainer: { marginBottom: 12 },
  earningsBar: { flexDirection: "row", height: 6, borderRadius: 3, overflow: "hidden" },
  earningsBarSegment: { height: "100%", marginRight: 1 },
  earningsStats: { flexDirection: "row", justifyContent: "center", marginBottom: 12 },
  earningsStat: { flexDirection: "row", alignItems: "center", marginHorizontal: 16 },
  earningsStatText: { color: COLORS.dark, marginLeft: 6, fontWeight: "600", fontSize: 14 },
  paymentMethodBadge: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 8, borderRadius: 10, marginBottom: 8,
  },
  paymentMethodText: { fontSize: 13, fontWeight: "700", marginLeft: 6 },
  cashNote: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: COLORS.orangeLight, padding: 12, borderRadius: 10,
  },
  cashNoteText: { fontSize: 12, color: COLORS.orange, marginLeft: 8, flex: 1, lineHeight: 18 },

  // Details Card
  detailsCard: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 20,
    marginBottom: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: COLORS.dark, marginBottom: 16 },
  detailRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  detailIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: COLORS.lightGray,
    alignItems: "center", justifyContent: "center", marginRight: 14,
  },
  detailContent: { flex: 1 },
  detailLabel: { color: COLORS.gray, fontSize: 12, marginBottom: 2 },
  detailValue: { color: COLORS.dark, fontSize: 15, fontWeight: "600" },

  locationItem: { flexDirection: "row", alignItems: "flex-start" },
  locationDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4, marginRight: 14 },
  locationLine: {
    width: 2, height: 20, backgroundColor: COLORS.border,
    marginLeft: 5, marginVertical: 4,
  },
  locationInfo: { flex: 1 },
  locationLabel: { color: COLORS.gray, fontSize: 12, marginBottom: 2 },
  locationText: { color: COLORS.dark, fontSize: 14, lineHeight: 20 },

  noteCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: COLORS.successLight, borderRadius: 12, padding: 14,
  },
  noteText: { flex: 1, marginLeft: 12, color: COLORS.success, fontSize: 13, lineHeight: 18 },

  // Bottom Actions
  bottomActions: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", padding: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 8,
  },
  rejectBtn: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: COLORS.errorLight,
    alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  acceptBtn: {
    flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "center", backgroundColor: COLORS.primary,
    paddingVertical: 18, borderRadius: 16,
  },
  acceptText: { color: COLORS.white, fontSize: 17, fontWeight: "700", marginRight: 8 },
  acceptEarningBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8,
  },
  acceptEarningText: { fontSize: 14, fontWeight: "700", color: COLORS.white },
});