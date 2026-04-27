// screens/ActiveRideScreen.js

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  Linking,
  Animated,
  StatusBar,
  Modal,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import * as Location from "expo-location";
import { API_BASE_URL } from "../config";
import { useAuth } from "../auth/AuthContext";

const { width, height } = Dimensions.get("window");
const GOOGLE_MAPS_API_KEY = "AIzaSyDbTEOzGx3L0pr6D1_9q8whfqhLyyyL-EI";

const BOTTOM_CARD_HEIGHT = height * 0.48;

const COLORS = {
  primary: "#000000",
  white: "#FFFFFF",
  dark: "#1F2937",
  gray: "#6B7280",
  lightGray: "#F3F4F6",
  success: "#10B981",
  error: "#EF4444",
  warning: "#F59E0B",
  blue: "#3B82F6",
  orange: "#F59E0B",
  orangeLight: "rgba(245, 158, 11, 0.1)",
  greenLight: "rgba(16, 185, 129, 0.1)",
};

const mapStyle = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dadada" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9c9c9" }] },
];

const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const PulseMarker = ({ coordinate, type }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.5, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const isPickup = type === "pickup";
  const color = isPickup ? COLORS.success : COLORS.error;

  return (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }} zIndex={1}>
      <View style={styles.markerContainer}>
        <Animated.View
          style={[
            styles.pulseCircle,
            { backgroundColor: color + "30", transform: [{ scale: pulseAnim }] },
          ]}
        />
        <View style={[styles.markerDot, { backgroundColor: color }]}>
          <Ionicons
            name={isPickup ? "person" : "flag"}
            size={14}
            color={COLORS.white}
          />
        </View>
      </View>
    </Marker>
  );
};

const CarMarker = ({ coordinate, heading }) => {
  if (!coordinate) return null;

  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      rotation={heading || 0}
      flat={true}
      zIndex={999}
    >
      <View style={styles.carMarkerContainer}>
        <View style={styles.carMarkerBg}>
          <FontAwesome5 name="car-side" size={16} color={COLORS.white} />
        </View>
        <View style={styles.carShadow} />
      </View>
    </Marker>
  );
};

export default function ActiveRideScreen({ route, navigation }) {
  const orderId = route?.params?.orderId;

  if (!orderId || orderId === "null" || orderId === "undefined") {
    React.useEffect(() => {
      Alert.alert("Error", "Invalid order", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    }, []);

    return (
      <View style={styles.loaderContainer}>
        <View style={styles.loaderCard}>
          <Ionicons name="alert-circle" size={48} color={COLORS.error} />
          <Text style={styles.loaderText}>Invalid Order ID</Text>
        </View>
      </View>
    );
  }

  const { tech } = useAuth();
  const mapRef = useRef(null);
  const prevCoordRef = useRef(null);

  const [order, setOrder] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);
  const [totalDistance, setTotalDistance] = useState(null);
  const [heading, setHeading] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const [autoFollow, setAutoFollow] = useState(true);
  const [initialFitDone, setInitialFitDone] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const calculateHeading = (from, to) => {
    if (!from || !to) return 0;
    const lat1 = (from.latitude * Math.PI) / 180;
    const lat2 = (to.latitude * Math.PI) / 180;
    const lng1 = (from.longitude * Math.PI) / 180;
    const lng2 = (to.longitude * Math.PI) / 180;
    const dLng = lng2 - lng1;
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    let bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return (bearing + 360) % 360;
  };

  const refreshOrder = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
        return data;
      }
    } catch (err) {
      console.error("Refresh error:", err);
    }
    return null;
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;

    let isMounted = true;
    let pollInterval = null;

    const loadOrder = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/orders/${orderId}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setOrder(data);
            setLoading(false);
          }
        }
      } catch (err) {
        if (isMounted) {
          setLoading(false);
          Alert.alert("Error", "Failed to load ride", [
            { text: "OK", onPress: () => navigation.goBack() },
          ]);
        }
      }
    };

    loadOrder();
    pollInterval = setInterval(() => {
      if (isMounted) refreshOrder();
    }, 5000);

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [orderId]);

  useEffect(() => {
    let isMounted = true;

    const getLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({});
      if (isMounted) {
        const coords = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };
        setCurrentLocation(coords);
        prevCoordRef.current = coords;
      }
    };

    getLocation();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (!tech?.id || !orderId) return;

    let sub = null;

    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 5 },
        async (loc) => {
          const newCoords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };

          if (prevCoordRef.current) {
            const newHeading = calculateHeading(prevCoordRef.current, newCoords);
            if (newHeading !== 0) setHeading(newHeading);
          }
          prevCoordRef.current = newCoords;
          setCurrentLocation(newCoords);

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
          } catch {}
        }
      );
    };

    startTracking();
    return () => { if (sub) sub.remove(); };
  }, [tech, orderId]);

  const fitMapToRoute = () => {
    if (!mapRef.current || !currentLocation) return;

    const destination = getDestination();
    if (!destination) return;

    const coordinates = [currentLocation, destination];

    mapRef.current.fitToCoordinates(coordinates, {
      edgePadding: {
        top: 100,
        right: 50,
        bottom: BOTTOM_CARD_HEIGHT + 30,
        left: 50,
      },
      animated: true,
    });
  };

  useEffect(() => {
    if (mapReady && currentLocation && order && !initialFitDone) {
      setTimeout(() => {
        fitMapToRoute();
        setInitialFitDone(true);
      }, 800);
    }
  }, [mapReady, currentLocation, order, initialFitDone]);

  useEffect(() => {
    if (!mapReady || !currentLocation || !autoFollow || !initialFitDone) return;

    const destination = getDestination();
    if (!destination) return;

    const dist = getDistanceKm(
      currentLocation.latitude,
      currentLocation.longitude,
      destination.latitude,
      destination.longitude
    );

    if (dist < 0.3) {
      mapRef.current?.animateToRegion({
        ...currentLocation,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 1000);
    } else {
      fitMapToRoute();
    }
  }, [currentLocation, autoFollow, initialFitDone]);

  const getDestination = () => {
    if (!order) return null;

    if (order.status === "in_progress" && order.drop_lat && order.drop_lng) {
      return {
        latitude: parseFloat(order.drop_lat),
        longitude: parseFloat(order.drop_lng),
      };
    }

    if (order.pickup_lat && order.pickup_lng) {
      return {
        latitude: parseFloat(order.pickup_lat),
        longitude: parseFloat(order.pickup_lng),
      };
    }

    return null;
  };

  const getProgress = () => {
    if (!totalDistance || !distance) return 0;
    const progress = ((totalDistance - parseFloat(distance)) / totalDistance) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  // ====== HELPER: Get payment/fare info from order ======
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
      order?.price ||
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

  const isCashPayment = () => {
    return getPaymentMethod() === "cash";
  };

  // Actions
  const markArrived = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}/arrived`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed");
      await refreshOrder();
      setShowOtpModal(true);
    } catch (err) {
      Alert.alert("Error", "Failed to update status");
    }
    setActionLoading(false);
  };

  const verifyOtp = async () => {
    if (otp.length !== 4) {
      Alert.alert("Invalid OTP", "Enter 4-digit OTP");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp }),
      });

      const data = await res.json();
      if (data.success) {
        await refreshOrder();
        setShowOtpModal(false);
        setOtp("");
        Alert.alert("Success", "Ride Started!");
      } else {
        Alert.alert("Wrong OTP", "Please try again");
        setOtp("");
      }
    } catch (err) {
      Alert.alert("Error", "Verification failed");
    }
    setActionLoading(false);
  };

  const endRide = () => {
    setShowCompleteModal(true);
  };

  const completeRide = async () => {
    setShowCompleteModal(false);
    setActionLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      console.log("Complete ride response:", JSON.stringify(data));

      if (data.success) {
        const customerTotal = getCustomerTotal();
        const driverEarn = data.earnings?.driverEarning || getDriverEarning();
        const platformEarn = data.earnings?.platformEarning || getPlatformEarning();
        const payMethod = data.earnings?.paymentMethod || getPaymentMethod();

        // Show warning if earnings calculation failed but ride completed
        if (data.earningsError) {
          console.warn("⚠️ Earnings calculation had an issue:", data.earningsError);
        }

        let message = "";
        if (payMethod === "cash") {
          message = `Customer paid ₹${customerTotal} cash.\nYour earning: ₹${driverEarn}\nPlatform fee ₹${platformEarn} will be adjusted from your wallet.`;
        } else {
          message = `Your earning: ₹${driverEarn}\nPlatform fee ₹${platformEarn} already deducted.\n₹${driverEarn} added to your wallet.`;
        }

        Alert.alert("🎉 Ride Completed!", message, [
          {
            text: "OK",
            onPress: () => {
              navigation.reset({ index: 0, routes: [{ name: "AppTabs" }] });
            },
          },
        ]);
      } else {
        // Even if backend says not success, check if order was actually completed
        const refreshedOrder = await refreshOrder();
        if (refreshedOrder?.status === "completed") {
          Alert.alert("✅ Ride Completed!", "Ride completed successfully.", [
            {
              text: "OK",
              onPress: () => {
                navigation.reset({ index: 0, routes: [{ name: "AppTabs" }] });
              },
            },
          ]);
        } else {
          Alert.alert(
            "Error",
            data.error || data.details || "Failed to complete ride",
            [{ text: "Try Again" }]
          );
        }
      }
    } catch (err) {
      console.error("Complete ride error:", err);

      // Network error - check if ride was actually completed
      try {
        const refreshedOrder = await refreshOrder();
        if (refreshedOrder?.status === "completed") {
          Alert.alert("✅ Ride Completed!", "Ride completed successfully.", [
            {
              text: "OK",
              onPress: () => {
                navigation.reset({ index: 0, routes: [{ name: "AppTabs" }] });
              },
            },
          ]);
          return;
        }
      } catch {}

      Alert.alert("Error", "Failed to complete ride. Please check your connection and try again.");
    }
    setActionLoading(false);
  };

  const openMaps = () => {
    const dest = getDestination();
    if (!dest) return;

    const url = Platform.OS === "ios"
      ? `maps://app?daddr=${dest.latitude},${dest.longitude}`
      : `google.navigation:q=${dest.latitude},${dest.longitude}`;

    Linking.openURL(url).catch(() => {
      Linking.openURL(
        `https://www.google.com/maps/dir/?api=1&destination=${dest.latitude},${dest.longitude}`
      );
    });
  };

  const callCustomer = () => {
    if (order?.client_phone) {
      Linking.openURL(`tel:${order.client_phone}`);
    }
  };

  const handleRecenter = () => {
    setAutoFollow(true);
    fitMapToRoute();
  };

  const handleShowFullRoute = () => {
    setAutoFollow(false);
    fitMapToRoute();
  };

  // Loading
  if (loading || !order || !currentLocation) {
    return (
      <View style={styles.loaderContainer}>
        <View style={styles.loaderCard}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loaderText}>Loading ride details...</Text>
          <Text style={styles.loaderSubText}>Please wait</Text>
        </View>
      </View>
    );
  }

  const pickup = {
    latitude: parseFloat(order.pickup_lat),
    longitude: parseFloat(order.pickup_lng),
  };

  const drop = order.drop_lat
    ? { latitude: parseFloat(order.drop_lat), longitude: parseFloat(order.drop_lng) }
    : null;

  const destination = getDestination();
  const isRideStarted = order.status === "in_progress";
  const isArrived = order.status === "arrived";
  const paymentMethod = getPaymentMethod();
  const customerTotal = getCustomerTotal();
  const driverEarning = getDriverEarning();
  const platformEarning = getPlatformEarning();

  const getStatusInfo = () => {
    switch (order.status) {
      case "accepted":
        return { text: "Going to Pickup", color: COLORS.blue };
      case "arrived":
        return { text: "Waiting for OTP", color: COLORS.warning };
      case "in_progress":
        return { text: "Ride in Progress", color: COLORS.success };
      default:
        return { text: "Active Ride", color: COLORS.gray };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
          <Text style={styles.statusText}>{statusInfo.text}</Text>
        </View>

        <TouchableOpacity style={styles.headerBtn} onPress={openMaps}>
          <Ionicons name="navigate" size={20} color={COLORS.blue} />
        </TouchableOpacity>
      </View>

      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        customMapStyle={mapStyle}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        showsTraffic={true}
        onMapReady={() => setMapReady(true)}
        onPanDrag={() => setAutoFollow(false)}
        initialRegion={{
          ...currentLocation,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        <CarMarker coordinate={currentLocation} heading={heading} />
        {!isRideStarted && <PulseMarker coordinate={pickup} type="pickup" />}
        {isRideStarted && drop && <PulseMarker coordinate={drop} type="drop" />}

        {destination && (
          <MapViewDirections
            origin={currentLocation}
            destination={destination}
            apikey={GOOGLE_MAPS_API_KEY}
            strokeWidth={4}
            strokeColor={COLORS.primary}
            optimizeWaypoints={true}
            onReady={(result) => {
              setDistance(result.distance.toFixed(1));
              setEta(Math.ceil(result.duration));
              if (!totalDistance) setTotalDistance(result.distance);
            }}
          />
        )}
      </MapView>

      {/* Map Controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity
          style={[styles.mapControlBtn, !autoFollow && styles.mapControlBtnActive]}
          onPress={handleShowFullRoute}
        >
          <MaterialCommunityIcons
            name="map-marker-distance"
            size={18}
            color={!autoFollow ? COLORS.white : COLORS.dark}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mapControlBtn, autoFollow && styles.mapControlBtnActive]}
          onPress={handleRecenter}
        >
          <MaterialCommunityIcons
            name="crosshairs-gps"
            size={18}
            color={autoFollow ? COLORS.white : COLORS.dark}
          />
        </TouchableOpacity>
      </View>

      {autoFollow && (
        <View style={styles.autoFollowBadge}>
          <View style={styles.autoFollowDot} />
          <Text style={styles.autoFollowText}>Auto-tracking</Text>
        </View>
      )}

      {/* Bottom Card */}
      <View style={styles.bottomCard}>
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${getProgress()}%` }]} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressText}>
              {isRideStarted ? "On the way" : "Going to pickup"}
            </Text>
            <Text style={styles.progressText}>
              {isRideStarted ? "Drop-off" : "Pickup"}
            </Text>
          </View>
        </View>

        {/* ETA Section */}
        <View style={styles.etaSection}>
          <View style={styles.etaMain}>
            <Text style={styles.etaTime}>{eta || "--"}</Text>
            <Text style={styles.etaUnit}>min</Text>
          </View>
          <View style={styles.etaDivider} />
          <View style={styles.etaDetails}>
            <Text style={styles.etaLabel}>
              {isRideStarted ? "Arriving in" : "Reaching pickup in"}
            </Text>
            <Text style={styles.etaDistance}>{distance || "--"} km away</Text>
          </View>
        </View>

        {/* Customer Info */}
        <View style={styles.customerSection}>
          <View style={styles.customerInfo}>
            <View style={styles.customerAvatar}>
              <Text style={styles.avatarText}>
                {(order.client_name || "C")[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.customerDetails}>
              <Text style={styles.customerName}>{order.client_name || "Customer"}</Text>
              <Text style={styles.customerPhone}>{order.client_phone || ""}</Text>
            </View>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionBtn} onPress={callCustomer}>
              <Ionicons name="call" size={18} color={COLORS.success} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Ride Details */}
        <View style={styles.rideDetails}>
          <View style={styles.locationRow}>
            <View style={styles.locationIcon}>
              <View style={styles.greenDot} />
            </View>
            <Text style={styles.locationText} numberOfLines={1}>
              {order.pickup_address || "Pickup Location"}
            </Text>
          </View>

          {order.drop_address && (
            <>
              <View style={styles.locationLine} />
              <View style={styles.locationRow}>
                <View style={styles.locationIcon}>
                  <View style={styles.redDot} />
                </View>
                <Text style={styles.locationText} numberOfLines={1}>
                  {order.drop_address}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* ====== PAYMENT SECTION (COMMISSION AWARE) ====== */}
        <View style={styles.paymentSection}>
          <View style={styles.paymentLeft}>
            <Ionicons
              name={isCashPayment() ? "cash" : "phone-portrait-outline"}
              size={18}
              color={isCashPayment() ? COLORS.orange : COLORS.blue}
            />
            <Text style={styles.paymentMode}>
              {isCashPayment() ? "CASH" : "ONLINE"}
            </Text>
          </View>
          <View style={styles.paymentRight}>
            <View style={styles.fareColumn}>
              <Text style={styles.fareAmount}>₹{customerTotal}</Text>
              {driverEarning > 0 && driverEarning !== customerTotal && (
                <Text style={styles.fareEarning}>You earn ₹{driverEarning}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Cash collection reminder */}
        {isCashPayment() && isRideStarted && (
          <View style={styles.cashReminder}>
            <Ionicons name="information-circle" size={16} color={COLORS.orange} />
            <Text style={styles.cashReminderText}>
              Collect ₹{customerTotal} cash from customer at drop-off
            </Text>
          </View>
        )}

        {/* Action Button */}
        <View style={styles.mainAction}>
          {order.status === "accepted" && (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={markArrived}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="location" size={20} color={COLORS.white} />
                  <Text style={styles.primaryBtnText}>I've Arrived at Pickup</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {order.status === "arrived" && (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: COLORS.success }]}
              onPress={() => setShowOtpModal(true)}
              disabled={actionLoading}
            >
              <Ionicons name="key" size={20} color={COLORS.white} />
              <Text style={styles.primaryBtnText}>Enter OTP to Start</Text>
            </TouchableOpacity>
          )}

          {order.status === "in_progress" && (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: COLORS.error }]}
              onPress={endRide}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="flag" size={20} color={COLORS.white} />
                  <Text style={styles.primaryBtnText}>Complete Ride</Text>
                  <View style={styles.fareBadge}>
                    <Text style={styles.fareBadgeText}>₹{customerTotal}</Text>
                  </View>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* OTP Modal */}
      <Modal visible={showOtpModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View style={styles.modalIconBg}>
                <Ionicons name="key" size={28} color={COLORS.white} />
              </View>
              <Text style={styles.modalTitle}>Enter OTP</Text>
              <Text style={styles.modalSubtitle}>
                Ask customer for 4-digit verification code
              </Text>
            </View>

            <View style={styles.otpContainer}>
              <TextInput
                style={styles.otpInput}
                value={otp}
                onChangeText={setOtp}
                keyboardType="numeric"
                maxLength={4}
                placeholder="0000"
                placeholderTextColor={COLORS.gray}
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: COLORS.success }]}
              onPress={verifyOtp}
              disabled={actionLoading || otp.length !== 4}
            >
              {actionLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="play" size={20} color={COLORS.white} />
                  <Text style={styles.modalBtnText}>Verify & Start Ride</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => { setShowOtpModal(false); setOtp(""); }}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ====== COMPLETE RIDE CONFIRMATION MODAL (COMMISSION AWARE) ====== */}
      <Modal visible={showCompleteModal} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmContent}>
            <View style={styles.confirmIconContainer}>
              <View style={styles.confirmIconBg}>
                <Ionicons name="checkmark-circle" size={40} color={COLORS.white} />
              </View>
            </View>

            <Text style={styles.confirmTitle}>Complete Ride?</Text>
            <Text style={styles.confirmSubtitle}>
              Are you sure you want to complete this ride?
            </Text>

            {/* Fare Summary */}
            <View style={styles.confirmSummary}>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Customer Pays</Text>
                <Text style={styles.confirmValue}>₹{customerTotal}</Text>
              </View>

              <View style={styles.confirmDivider} />

              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Your Earning</Text>
                <Text style={[styles.confirmValue, { color: COLORS.success }]}>
                  ₹{driverEarning}
                </Text>
              </View>

              {platformEarning > 0 && (
                <>
                  <View style={styles.confirmDivider} />
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>Platform Fee</Text>
                    <Text style={[styles.confirmValue, { fontSize: 14, color: COLORS.gray }]}>
                      ₹{platformEarning}
                    </Text>
                  </View>
                </>
              )}

              <View style={styles.confirmDivider} />

              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Payment</Text>
                <View style={styles.confirmPayment}>
                  <Ionicons
                    name={isCashPayment() ? "cash" : "phone-portrait-outline"}
                    size={16}
                    color={isCashPayment() ? COLORS.orange : COLORS.blue}
                  />
                  <Text style={styles.confirmPaymentText}>
                    {isCashPayment() ? "CASH" : "ONLINE"}
                  </Text>
                </View>
              </View>

              {/* Cash-specific note */}
              {isCashPayment() && (
                <>
                  <View style={styles.confirmDivider} />
                  <View style={styles.confirmCashNote}>
                    <Ionicons name="information-circle" size={18} color={COLORS.warning} />
                    <Text style={styles.confirmCashText}>
                      Collect ₹{customerTotal} from customer.{"\n"}
                      Platform fee ₹{platformEarning} will be adjusted from your wallet.
                    </Text>
                  </View>
                </>
              )}

              {/* Online-specific note */}
              {!isCashPayment() && (
                <>
                  <View style={styles.confirmDivider} />
                  <View style={styles.confirmOnlineNote}>
                    <Ionicons name="shield-checkmark" size={18} color={COLORS.success} />
                    <Text style={styles.confirmOnlineText}>
                      ₹{driverEarning} will be added to your wallet after completion.
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Buttons */}
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setShowCompleteModal(false)}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmYesBtn}
                onPress={completeRide}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color={COLORS.white} />
                    <Text style={styles.confirmYesText}>
                      {isCashPayment() ? "Cash Collected" : "Complete"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.lightGray },

  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.lightGray },
  loaderCard: { backgroundColor: COLORS.white, padding: 30, borderRadius: 20, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, marginHorizontal: 20 },
  loaderText: { marginTop: 15, fontSize: 16, fontWeight: "600", color: COLORS.dark },
  loaderSubText: { marginTop: 5, fontSize: 13, color: COLORS.gray },

  header: { position: "absolute", top: Platform.OS === "ios" ? 50 : 20, left: 0, right: 0, zIndex: 100, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  headerBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.white, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },
  headerCenter: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.white, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { fontSize: 13, fontWeight: "600", color: COLORS.dark },

  map: { flex: 1 },

  mapControls: { position: "absolute", right: 12, bottom: BOTTOM_CARD_HEIGHT + 20, gap: 8 },
  mapControlBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.white, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 4 },
  mapControlBtnActive: { backgroundColor: COLORS.primary },

  autoFollowBadge: { position: "absolute", top: Platform.OS === "ios" ? 100 : 70, alignSelf: "center", flexDirection: "row", alignItems: "center", backgroundColor: COLORS.white, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  autoFollowDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success, marginRight: 6 },
  autoFollowText: { fontSize: 11, fontWeight: "600", color: COLORS.gray },

  carMarkerContainer: { alignItems: "center" },
  carMarkerBg: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.primary, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 4 },
  carShadow: { width: 28, height: 5, borderRadius: 3, backgroundColor: "rgba(0,0,0,0.15)", marginTop: 3 },

  markerContainer: { alignItems: "center", justifyContent: "center" },
  pulseCircle: { position: "absolute", width: 44, height: 44, borderRadius: 22 },
  markerDot: { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: COLORS.white },

  bottomCard: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingBottom: Platform.OS === "ios" ? 28 : 18, shadowColor: "#000", shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 8 },

  progressContainer: { marginBottom: 14 },
  progressBar: { height: 4, backgroundColor: COLORS.lightGray, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: COLORS.success, borderRadius: 2 },
  progressLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  progressText: { fontSize: 11, color: COLORS.gray },

  etaSection: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.lightGray, borderRadius: 14, padding: 14, marginBottom: 14 },
  etaMain: { flexDirection: "row", alignItems: "baseline" },
  etaTime: { fontSize: 30, fontWeight: "800", color: COLORS.dark },
  etaUnit: { fontSize: 14, fontWeight: "600", color: COLORS.gray, marginLeft: 4 },
  etaDivider: { width: 1, height: 36, backgroundColor: "#D1D5DB", marginHorizontal: 16 },
  etaDetails: { flex: 1 },
  etaLabel: { fontSize: 12, color: COLORS.gray },
  etaDistance: { fontSize: 14, fontWeight: "600", color: COLORS.dark, marginTop: 3 },

  customerSection: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray, marginBottom: 12 },
  customerInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  customerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 18, fontWeight: "700", color: COLORS.white },
  customerDetails: { marginLeft: 12, flex: 1 },
  customerName: { fontSize: 15, fontWeight: "700", color: COLORS.dark },
  customerPhone: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  actionButtons: { flexDirection: "row", gap: 8 },
  actionBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.lightGray, justifyContent: "center", alignItems: "center" },

  rideDetails: { marginBottom: 12 },
  locationRow: { flexDirection: "row", alignItems: "center" },
  locationIcon: { width: 20, alignItems: "center" },
  greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success },
  redDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.error },
  locationLine: { width: 2, height: 16, backgroundColor: COLORS.lightGray, marginLeft: 9, marginVertical: 3 },
  locationText: { fontSize: 13, color: COLORS.dark, marginLeft: 10, flex: 1 },

  // ====== PAYMENT SECTION (UPDATED) ======
  paymentSection: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: COLORS.lightGray, padding: 12, borderRadius: 12, marginBottom: 8 },
  paymentLeft: { flexDirection: "row", alignItems: "center" },
  paymentMode: { fontSize: 13, fontWeight: "600", color: COLORS.dark, marginLeft: 8 },
  paymentRight: { flexDirection: "row", alignItems: "center" },
  fareColumn: { alignItems: "flex-end" },
  fareAmount: { fontSize: 17, fontWeight: "800", color: COLORS.dark },
  fareEarning: { fontSize: 11, fontWeight: "600", color: COLORS.success, marginTop: 2 },

  // Cash reminder
  cashReminder: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.orangeLight, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginBottom: 8 },
  cashReminderText: { fontSize: 11, color: COLORS.orange, marginLeft: 8, flex: 1, fontWeight: "500" },

  mainAction: {},
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6 },
  primaryBtnText: { fontSize: 16, fontWeight: "700", color: COLORS.white, marginLeft: 10 },
  fareBadge: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginLeft: 12 },
  fareBadgeText: { fontSize: 14, fontWeight: "700", color: COLORS.white },

  // OTP Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === "ios" ? 40 : 24 },
  modalHandle: { width: 40, height: 4, backgroundColor: COLORS.lightGray, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  modalHeader: { alignItems: "center", marginBottom: 24 },
  modalIconBg: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.success, justifyContent: "center", alignItems: "center", marginBottom: 14 },
  modalTitle: { fontSize: 22, fontWeight: "800", color: COLORS.dark },
  modalSubtitle: { fontSize: 14, color: COLORS.gray, marginTop: 6, textAlign: "center" },
  otpContainer: { marginBottom: 20 },
  otpInput: { backgroundColor: COLORS.lightGray, borderRadius: 14, paddingVertical: 18, paddingHorizontal: 20, fontSize: 32, fontWeight: "700", color: COLORS.dark, textAlign: "center", letterSpacing: 20, borderWidth: 2, borderColor: "#E5E7EB" },
  modalBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, borderRadius: 14, marginBottom: 12 },
  modalBtnText: { fontSize: 16, fontWeight: "700", color: COLORS.white, marginLeft: 10 },
  modalCancelBtn: { alignItems: "center", paddingVertical: 14 },
  modalCancelText: { fontSize: 15, fontWeight: "600", color: COLORS.gray },

  // Confirmation Modal
  confirmOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 24 },
  confirmContent: { width: "100%", backgroundColor: COLORS.white, borderRadius: 24, padding: 24 },
  confirmIconContainer: { alignItems: "center", marginBottom: 16 },
  confirmIconBg: { width: 70, height: 70, borderRadius: 35, backgroundColor: COLORS.success, justifyContent: "center", alignItems: "center" },
  confirmTitle: { fontSize: 22, fontWeight: "800", color: COLORS.dark, textAlign: "center" },
  confirmSubtitle: { fontSize: 14, color: COLORS.gray, textAlign: "center", marginTop: 8, marginBottom: 20 },
  confirmSummary: { backgroundColor: COLORS.lightGray, borderRadius: 14, padding: 16, marginBottom: 20 },
  confirmRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  confirmLabel: { fontSize: 14, color: COLORS.gray },
  confirmValue: { fontSize: 18, fontWeight: "800", color: COLORS.dark },
  confirmPayment: { flexDirection: "row", alignItems: "center" },
  confirmPaymentText: { fontSize: 14, fontWeight: "600", color: COLORS.dark, marginLeft: 6 },
  confirmDivider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 4 },
  confirmCashNote: { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#FEF3C7", padding: 12, borderRadius: 10, marginTop: 8 },
  confirmCashText: { fontSize: 12, color: "#92400E", marginLeft: 8, flex: 1, lineHeight: 18 },
  confirmOnlineNote: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.greenLight, padding: 12, borderRadius: 10, marginTop: 8 },
  confirmOnlineText: { fontSize: 12, color: "#065F46", marginLeft: 8, flex: 1, lineHeight: 18 },
  confirmButtons: { flexDirection: "row", gap: 12 },
  confirmCancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 14, backgroundColor: COLORS.lightGray, alignItems: "center", justifyContent: "center" },
  confirmCancelText: { fontSize: 16, fontWeight: "600", color: COLORS.dark },
  confirmYesBtn: { flex: 1, flexDirection: "row", paddingVertical: 16, borderRadius: 14, backgroundColor: COLORS.success, alignItems: "center", justifyContent: "center" },
  confirmYesText: { fontSize: 16, fontWeight: "700", color: COLORS.white, marginLeft: 6 },
});