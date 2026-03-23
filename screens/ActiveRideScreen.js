// screens/ActiveRideScreen.js
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Platform,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/Ionicons";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import * as Location from "expo-location";
import { API_BASE_URL } from "../config";
import { useAuth } from "../auth/AuthContext";

const { width, height } = Dimensions.get("window");
const GOOGLE_MAPS_API_KEY = "AIzaSyDbTEOzGx3L0pr6D1_9q8whfqhLyyyL-EI";

const COLORS = {
  bg: "#0F172A",
  card: "#1E293B",
  orange: "#FF6B00",
  orangeLight: "#FFB347",
  cyan: "#22D3EE",
  text: "#F8FAFC",
  subtext: "#94A3B8",
  success: "#22C55E",
  warning: "#F59E0B",
  error: "#EF4444",
  border: "#334155",
};

export default function ActiveRideScreen({ route, navigation }) {
  // ✅ VALIDATE FIRST
  const orderId = route?.params?.orderId;
  
  if (!orderId || orderId === "null" || orderId === "undefined") {
    React.useEffect(() => {
      console.error("❌ Invalid orderId in ActiveRideScreen:", orderId);
      Alert.alert("Error", "Invalid order ID", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    }, []);
    
    return (
      <View style={styles.loadingContainer}>
        <Icon name="alert-circle" size={48} color={COLORS.error} />
        <Text style={styles.loadingText}>Invalid Order ID</Text>
      </View>
    );
  }

  const { tech } = useAuth();
  const mapRef = useRef(null);

  // States
  const [order, setOrder] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [enteredOtp, setEnteredOtp] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);
  const [mapReady, setMapReady] = useState(false);

  // Animations
  const slideAnim = useRef(new Animated.Value(height)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ✅ GET STATUS TITLE - Fixed conditional rendering
  const getStatusTitle = () => {
    if (!order) return "Loading...";
    
    switch (order.status) {
      case "accepted":
        return "Navigate to Client";
      case "arrived":
        return "Waiting for OTP";
      case "in_progress":
        return "Ride in Progress";
      default:
        return "Active Ride";
    }
  };

  // Fetch order data
  useEffect(() => {
    if (!orderId) return;

    let isMounted = true;

    const fetchOrder = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/orders/${orderId}`);
        const data = await res.json();
        
        if (isMounted) {
          setOrder(data);
          setLoading(false);
        }
      } catch (err) {
        console.log("Fetch error:", err);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchOrder();
    const interval = setInterval(fetchOrder, 3000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [orderId]);

  // Get current location
  useEffect(() => {
    let isMounted = true;

    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Required", "Location access is needed for navigation");
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        if (isMounted) {
          setCurrentLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      } catch (err) {
        console.log("Location error:", err);
      }
    };

    getLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  // Live location tracking
  useEffect(() => {
    if (!tech?.id || !orderId) return;

    let subscription = null;

    const startTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 10,
          },
          async (loc) => {
            const newLocation = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            };
            setCurrentLocation(newLocation);

            // Update server
            try {
              await fetch(`${API_BASE_URL}/orders/${orderId}/location`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  technician_id: tech.id,
                  lat: loc.coords.latitude,
                  lng: loc.coords.longitude,
                }),
              });
            } catch (err) {
              // Silent fail for location updates
            }
          }
        );
      } catch (err) {
        console.log("Tracking error:", err);
      }
    };

    startTracking();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [tech, orderId]);

  // Auto-fit map to route
  useEffect(() => {
    if (
      mapReady &&
      mapRef.current &&
      currentLocation &&
      order?.pickup_lat &&
      order?.pickup_lng
    ) {
      const coordinates = [
        currentLocation,
        { latitude: parseFloat(order.pickup_lat), longitude: parseFloat(order.pickup_lng) },
      ];

      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
        animated: true,
      });
    }
  }, [mapReady, currentLocation, order]);

  // Slide-up animation
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  }, []);

  // Pulse animation for live location
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    
    animation.start();

    return () => animation.stop();
  }, []);

  // Actions
  const markArrived = async () => {
    setActionLoading(true);
    try {
      await fetch(`${API_BASE_URL}/orders/${orderId}/arrived`, {
        method: "POST",
      });
      Alert.alert("✅ Status Updated", "Marked as arrived");
    } catch (err) {
      Alert.alert("Error", "Failed to update status");
    }
    setActionLoading(false);
  };

  const verifyOtp = async () => {
    if (!enteredOtp || enteredOtp.length !== 4) {
      Alert.alert("Invalid OTP", "Please enter 4-digit OTP");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: enteredOtp }),
      });

      const data = await res.json();
      if (data.success) {
        Alert.alert("🚗 Ride Started", "OTP verified successfully");
        setEnteredOtp("");
      } else {
        Alert.alert("Invalid OTP", "Please check and try again");
      }
    } catch (err) {
      Alert.alert("Error", "Verification failed");
    }
    setActionLoading(false);
  };

  const endRide = async () => {
    if (order.payment_mode === "online" && order.payment_status !== "paid") {
      Alert.alert("Payment Pending", "Customer hasn't completed payment yet");
      return;
    }

    if (order.payment_mode === "cash") {
      Alert.alert(
        "Collect Cash",
        `Did you collect ₹${order.price}?`,
        [
          { text: "No", style: "cancel" },
          { text: "Yes, Collected", onPress: completeRide },
        ]
      );
      return;
    }

    completeRide();
  };

  const completeRide = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}/complete`, {
        method: "POST",
      });

      const data = await res.json();
      if (data.success) {
        navigation.reset({
          index: 0,
          routes: [{ name: "AppTabs" }],
        });
      }
    } catch (err) {
      Alert.alert("Error", "Failed to complete ride");
    }
    setActionLoading(false);
  };

  const openGoogleMaps = () => {
    if (!order?.pickup_lat || !order?.pickup_lng) {
      Alert.alert("Error", "Destination coordinates not available");
      return;
    }

    const destination = `${order.pickup_lat},${order.pickup_lng}`;
    const url =
      Platform.OS === "ios"
        ? `maps://app?daddr=${destination}`
        : `google.navigation:q=${destination}`;

    Linking.openURL(url).catch(() => {
      Linking.openURL(
        `https://www.google.com/maps/dir/?api=1&destination=${destination}`
      );
    });
  };

  const callClient = () => {
    if (order?.client_phone) {
      Linking.openURL(`tel:${order.client_phone}`);
    } else {
      Alert.alert("Error", "Phone number not available");
    }
  };

  // ✅ Loading State
  if (loading || !order || !currentLocation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.orange} />
        <Text style={styles.loadingText}>Loading ride details...</Text>
      </View>
    );
  }

  // ✅ Validate coordinates
  const pickupLat = parseFloat(order.pickup_lat);
  const pickupLng = parseFloat(order.pickup_lng);

  if (isNaN(pickupLat) || isNaN(pickupLng)) {
    return (
      <View style={styles.loadingContainer}>
        <Icon name="alert-circle" size={48} color={COLORS.error} />
        <Text style={styles.loadingText}>Invalid destination coordinates</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const destination = {
    latitude: pickupLat,
    longitude: pickupLng,
  };

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        onMapReady={() => setMapReady(true)}
      >
        {/* Current Location Marker */}
        <Marker coordinate={currentLocation} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.markerContainer}>
            <Animated.View
              style={[
                styles.currentLocationPulse,
                { transform: [{ scale: pulseAnim }] },
              ]}
            />
            <View style={styles.currentLocationMarker}>
              <Icon name="car" size={20} color="#fff" />
            </View>
          </View>
        </Marker>

        {/* Destination Marker */}
        <Marker coordinate={destination} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.destinationMarker}>
            <Icon name="home" size={24} color={COLORS.orange} />
          </View>
        </Marker>

        {/* Route Polyline */}
        <MapViewDirections
          origin={currentLocation}
          destination={destination}
          apikey={GOOGLE_MAPS_API_KEY}
          strokeWidth={5}
          strokeColor={COLORS.orange}
          onReady={(result) => {
            setDistance(result.distance.toFixed(1));
            setEta(Math.ceil(result.duration));
          }}
          onError={(error) => console.log("Directions error:", error)}
        />
      </MapView>

      {/* Top Status Bar */}
      <LinearGradient
        colors={[COLORS.orange, COLORS.orangeLight]}
        style={styles.topBar}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.topBarInfo}>
          <Text style={styles.topBarTitle}>{getStatusTitle()}</Text>
          {eta !== null && distance !== null ? (
            <Text style={styles.topBarSubtitle}>
              {distance} km • {eta} min away
            </Text>
          ) : null}
        </View>

        <TouchableOpacity style={styles.navBtn} onPress={openGoogleMaps}>
          <Icon name="navigate" size={20} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Bottom Sheet */}
      <Animated.View
        style={[
          styles.bottomSheet,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Handle */}
        <View style={styles.handle} />

        {/* Client Info */}
        <View style={styles.clientCard}>
          <View style={styles.avatar}>
            <Icon name="person" size={28} color={COLORS.orange} />
          </View>
          <View style={styles.clientInfo}>
            <Text style={styles.clientName}>
              {order.client_name || "Client"}
            </Text>
            <Text style={styles.clientPhone}>
              {order.client_phone || "Phone not available"}
            </Text>
          </View>
          <TouchableOpacity style={styles.callBtn} onPress={callClient}>
            <Icon name="call" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Ride Details */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Icon name="location-outline" size={18} color={COLORS.success} />
            <Text style={styles.detailText} numberOfLines={2}>
              {order.pickup_address || "Pickup location"}
            </Text>
          </View>

          {order.drop_address ? (
            <View style={styles.detailRow}>
              <Icon name="flag-outline" size={18} color={COLORS.error} />
              <Text style={styles.detailText} numberOfLines={2}>
                {order.drop_address}
              </Text>
            </View>
          ) : null}

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>₹{order.price || 0}</Text>
              <Text style={styles.statLabel}>Fare</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {order.payment_mode ? order.payment_mode.toUpperCase() : "CASH"}
              </Text>
              <Text style={styles.statLabel}>Payment</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{order.distance || "—"}</Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
          </View>
        </View>

        {/* OTP Input (if status is arrived) */}
        {order.status === "arrived" ? (
          <View style={styles.otpContainer}>
            <Text style={styles.otpLabel}>Enter OTP from Client</Text>
            <TextInput
              style={styles.otpInput}
              value={enteredOtp}
              onChangeText={setEnteredOtp}
              keyboardType="numeric"
              maxLength={4}
              placeholder="• • • •"
              placeholderTextColor={COLORS.subtext}
            />
          </View>
        ) : null}

        {/* Action Buttons */}
        <View style={styles.actions}>
          {order.status === "accepted" ? (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={markArrived}
              activeOpacity={0.9}
              disabled={actionLoading}
            >
              <LinearGradient
                colors={[COLORS.orange, COLORS.orangeLight]}
                style={styles.btnGradient}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Icon name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.btnText}>I've Arrived</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          ) : null}

          {order.status === "arrived" ? (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={verifyOtp}
              activeOpacity={0.9}
              disabled={actionLoading}
            >
              <LinearGradient
                colors={[COLORS.orange, COLORS.orangeLight]}
                style={styles.btnGradient}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Icon name="key" size={20} color="#fff" />
                    <Text style={styles.btnText}>Start Ride</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          ) : null}

          {order.status === "in_progress" ? (
            <TouchableOpacity
              style={styles.endBtn}
              onPress={endRide}
              activeOpacity={0.9}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Icon name="checkmark-done" size={20} color="#fff" />
                  <Text style={styles.btnText}>End Ride</Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },
  loadingText: {
    color: COLORS.text,
    marginTop: 12,
    fontSize: 14,
  },
  retryBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.orange,
    borderRadius: 10,
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },

  // Marker Container
  markerContainer: {
    alignItems: "center",
    justifyContent: "center",
  },

  // Current Location
  currentLocationPulse: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 107, 0, 0.2)",
  },
  currentLocationMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.orange,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },

  // Destination Marker
  destinationMarker: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.orange,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },

  // Top Bar
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    paddingBottom: 15,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  topBarInfo: {
    flex: 1,
    marginLeft: 12,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  topBarSubtitle: {
    fontSize: 13,
    color: "#fff",
    opacity: 0.9,
    marginTop: 2,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Bottom Sheet
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 30 : 20,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: "center",
    marginBottom: 16,
  },

  // Client Card
  clientCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 107, 0, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  clientInfo: {
    flex: 1,
    marginLeft: 12,
  },
  clientName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  clientPhone: {
    fontSize: 13,
    color: COLORS.subtext,
    marginTop: 2,
  },
  callBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.orange,
    alignItems: "center",
    justifyContent: "center",
  },

  // Details Card
  detailsCard: {
    backgroundColor: COLORS.bg,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  detailText: {
    flex: 1,
    marginLeft: 10,
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: "row",
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.subtext,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },

  // OTP
  otpContainer: {
    marginBottom: 16,
  },
  otpLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  otpInput: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
    letterSpacing: 16,
  },

  // Actions
  actions: {
    marginTop: 4,
  },
  primaryBtn: {
    borderRadius: 14,
    overflow: "hidden",
  },
  btnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
  endBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.error,
    paddingVertical: 16,
    borderRadius: 14,
  },
});
