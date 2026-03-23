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
import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/Ionicons";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { API_BASE_URL } from "../config";
import { useAuth } from "../auth/AuthContext";

const COLORS = {
  bg: "#0F172A",
  card: "#1E293B",
  primary: "#00A86B",
  primaryLight: "#00C77B",
  orange: "#FF6B00",
  orangeLight: "#FFB347",
  cyan: "#22D3EE",
  text: "#F8FAFC",
  subtext: "#94A3B8",
  success: "#22C55E",
  error: "#EF4444",
  border: "#334155",
};

export default function RequestDetailScreen({ route, navigation }) {
  // ✅ VALIDATE IMMEDIATELY
  const orderId = route?.params?.orderId;
  const { tech } = useAuth();
  
  // Early return if invalid
  if (!orderId || orderId === "null" || orderId === "undefined") {
    React.useEffect(() => {
      console.error("❌ Invalid orderId in RequestDetailScreen:", orderId);
      Alert.alert("Error", "Invalid order ID", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    }, []);
    
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Icon name="alert-circle" size={48} color={COLORS.error} />
        <Text style={{ color: COLORS.text, marginTop: 12 }}>Invalid Order</Text>
      </View>
    );
  }

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);

  const isCarWash = tech?.category === "carwash" || tech?.category === "car_wash";
  const primaryColor = isCarWash ? COLORS.primary : COLORS.orange;
  const gradientColors = isCarWash 
    ? [COLORS.primary, COLORS.primaryLight] 
    : [COLORS.orange, COLORS.orangeLight];

  // ✅ Safe fetch with error handling
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        console.log("📥 Fetching order:", orderId);
        const res = await fetch(`${API_BASE_URL}/orders/${orderId}`);
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        
        const data = await res.json();
        
        if (!data || !data.id) {
          throw new Error("Invalid order data");
        }
        
        console.log("✅ Order fetched:", data);
        setOrder(data);
      } catch (error) {
        console.error("❌ Fetch error:", error);
        Alert.alert("Error", "Failed to load order details", [
          { text: "Retry", onPress: fetchOrder },
          { text: "Go Back", onPress: () => navigation.goBack() }
        ]);
      }
    };

    fetchOrder();
  }, [orderId]);

  // ✅ Safe accept handler
  const accept = async () => {
    if (!tech?.id) {
      Alert.alert("Error", "Technician ID not found");
      return;
    }

    setLoading(true);
    try {
      console.log("🔄 Accepting order:", orderId);
      
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technician_id: tech.id }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        Alert.alert("Unable to Accept", data.error || "Please try again");
        setLoading(false);
        return;
      }

      console.log("✅ Order accepted, navigating...");

      // ✅ Safe navigation
      const targetScreen = isCarWash ? "ActiveWashScreen" : "ActiveRideScreen";
      
      navigation.replace(targetScreen, { 
        orderId: String(orderId)
      });
      
    } catch (error) {
      console.error("❌ Accept error:", error);
      Alert.alert("Error", "Failed to accept order");
      setLoading(false);
    }
  };

  const reject = async () => {
    Alert.alert(
      "Reject Request",
      "Are you sure you want to reject this request?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            await fetch(`${API_BASE_URL}/orders/${orderId}/reject`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ technician_id: tech.id }),
            });
            navigation.goBack();
          },
        },
      ]
    );
  };

  if (!order) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  const hasLocation = order.pickup_lat && order.pickup_lng;

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={gradientColors} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Details</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

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
              initialRegion={{
                latitude: order.pickup_lat,
                longitude: order.pickup_lng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
            >
              <Marker
                coordinate={{
                  latitude: order.pickup_lat,
                  longitude: order.pickup_lng,
                }}
              >
                <View style={[styles.marker, { backgroundColor: primaryColor }]}>
                  <Icon name="location" size={18} color="#fff" />
                </View>
              </Marker>
            </MapView>
          </View>
        )}

        {/* Price Card */}
        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>Earnings</Text>
          <Text style={[styles.priceValue, { color: COLORS.cyan }]}>
            ₹{order.price}
          </Text>
          <View style={styles.priceStats}>
            <View style={styles.priceStat}>
              <Icon name="navigate-outline" size={16} color={COLORS.subtext} />
              <Text style={styles.priceStatText}>{order.distance || "—"}</Text>
            </View>
            <View style={styles.priceStat}>
              <Icon name="time-outline" size={16} color={COLORS.subtext} />
              <Text style={styles.priceStatText}>{order.duration || "—"}</Text>
            </View>
          </View>
        </View>

        {/* Service Details */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Service Details</Text>
          
          {isCarWash ? (
            <>
              <DetailRow 
                icon="water-outline" 
                label="Service" 
                value="Car Wash"
                color={primaryColor}
              />
              {order.package_name && (
                <DetailRow 
                  icon="sparkles-outline" 
                  label="Package" 
                  value={order.package_name}
                  color={primaryColor}
                />
              )}
              {order.vehicle && (
                <DetailRow 
                  icon="car-outline" 
                  label="Vehicle Type" 
                  value={order.vehicle}
                  color={primaryColor}
                />
              )}
            </>
          ) : (
            <>
              <DetailRow 
                icon="car-sport-outline" 
                label="Service" 
                value="Driver Service"
                color={primaryColor}
              />
            </>
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
                <View style={[styles.locationDot, { backgroundColor: COLORS.orange }]} />
                <View style={styles.locationInfo}>
                  <Text style={styles.locationLabel}>Drop</Text>
                  <Text style={styles.locationText}>{order.drop_address}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Info Note */}
        <View style={styles.noteCard}>
          <Icon name="information-circle" size={20} color={primaryColor} />
          <Text style={styles.noteText}>
            {isCarWash 
              ? "You'll need to verify client identity with OTP before starting the wash"
              : "Client will share pickup OTP when you arrive"
            }
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity 
          style={styles.rejectBtn}
          onPress={reject}
          activeOpacity={0.8}
        >
          <Icon name="close" size={22} color={COLORS.error} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.acceptBtn, loading && { opacity: 0.7 }]}
          onPress={accept}
          disabled={loading}
          activeOpacity={0.9}
        >
          <LinearGradient colors={gradientColors} style={styles.acceptGradient}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.acceptText}>Accept Request</Text>
                <Icon name="checkmark-circle" size={22} color="#fff" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const DetailRow = ({ icon, label, value, color }) => (
  <View style={styles.detailRow}>
    <View style={[styles.detailIcon, { backgroundColor: `${color}20` }]}>
      <Icon name={icon} size={18} color={color} />
    </View>
    <View style={styles.detailContent}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  mapContainer: {
    height: 160,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  priceCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  priceLabel: {
    color: COLORS.subtext,
    fontSize: 13,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 40,
    fontWeight: "900",
  },
  priceStats: {
    flexDirection: "row",
    marginTop: 12,
  },
  priceStat: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
  },
  priceStatText: {
    color: COLORS.text,
    marginLeft: 6,
    fontWeight: "600",
  },
  detailsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    color: COLORS.subtext,
    fontSize: 12,
    marginBottom: 2,
  },
  detailValue: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "600",
  },
  locationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    marginRight: 14,
  },
  locationLine: {
    width: 2,
    height: 20,
    backgroundColor: COLORS.border,
    marginLeft: 5,
    marginVertical: 4,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    color: COLORS.subtext,
    fontSize: 12,
    marginBottom: 2,
  },
  locationText: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
  },
  noteCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${COLORS.primary}15`,
    borderRadius: 12,
    padding: 14,
  },
  noteText: {
    flex: 1,
    marginLeft: 12,
    color: COLORS.primary,
    fontSize: 13,
    lineHeight: 18,
  },
  bottomActions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  rejectBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: `${COLORS.error}20`,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  acceptBtn: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  acceptGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
  },
  acceptText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    marginRight: 8,
  },
});
