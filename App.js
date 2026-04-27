import "react-native-gesture-handler";
import "react-native-reanimated";

import React, { useEffect, useState, useRef } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  StatusBar,
  Alert,
} from "react-native";

import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNavigationContainerRef } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import messaging from "@react-native-firebase/messaging";

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  runOnJS,
  interpolate,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";

import MapView, { Marker } from "react-native-maps";
import { LinearGradient } from "expo-linear-gradient";

import { AuthProvider, useAuth } from "./auth/AuthContext";
import { API_BASE_URL } from "./config";

import OnboardingScreen from "./screens/OnboardingScreen";
import BasicDetailsScreen from "./screens/BasicDetailsScreen";
import CategoryDetailsScreen from "./screens/CategoryDetailsScreen";
import DocumentUploadScreen from "./screens/DocumentUploadScreen";
import ThankYouScreen from "./screens/ThankYouScreen";
import DashboardScreen from "./screens/DashboardScreen";
import WorkScreen from "./screens/WorkScreen";
import WalletScreen from "./screens/WalletScreen";
import ProfileScreen from "./screens/ProfileScreen";
import RequestDetailScreen from "./screens/RequestDetailScreen";
import ActiveRideScreen from "./screens/ActiveRideScreen";
import ActiveWashScreen from "./screens/ActiveWashScreen";
import ErrorBoundary from "./components/ErrorBoundary";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

export const navigationRef = createNavigationContainerRef();

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.5;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ================================
// 🚗 INCOMING REQUEST MODAL (REDESIGNED)
// ================================
function IncomingRequestModal({ order, technicianId, onAccept, onReject }) {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  const [timeLeft, setTimeLeft] = useState(30);
  const [sound, setSound] = useState(null);
  const [showRejectReason, setShowRejectReason] = useState(false);

  const vibrationIntervalRef = useRef(null);
  const soundRef = useRef(null);

  // Pulse animation
  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1
    );
  }, []);

  useEffect(() => {
    async function playSound() {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: false,
        });

        const { sound: createdSound } = await Audio.Sound.createAsync(
          require("./assets/sounds/ride_request.mp3"),
          { shouldPlay: true, isLooping: true, volume: 1.0 }
        );

        soundRef.current = createdSound;
        setSound(createdSound);

        vibrationIntervalRef.current = setInterval(() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
            () => {}
          );
        }, 2000);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
          () => {}
        );
      } catch (error) {
        console.log("Error playing sound:", error);
      }
    }

    playSound();

    return () => {
      if (vibrationIntervalRef.current) {
        clearInterval(vibrationIntervalRef.current);
      }
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const stopEverything = async () => {
    try {
      if (vibrationIntervalRef.current) {
        clearInterval(vibrationIntervalRef.current);
        vibrationIntervalRef.current = null;
      }
      if (soundRef.current) {
        await soundRef.current.stopAsync().catch(() => {});
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
      if (sound) {
        await sound.stopAsync().catch(() => {});
        await sound.unloadAsync().catch(() => {});
      }
    } catch (error) {
      console.log("Error stopping sound:", error);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          stopEverything();

          if (order?.id) {
            fetch(`${API_BASE_URL}/orders/${order.id}/reject`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ technician_id: technicianId, reason: "Timeout" }),
            }).catch(() => {});
          }

          onReject();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [order?.id, technicianId, onReject]);

  const handleAccept = async () => {
    await stopEverything();
    onAccept();
  };

  const handleRejectWithReason = async (reason) => {
    try {
      await fetch(`${API_BASE_URL}/orders/${order.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technician_id: technicianId, reason }),
      });
    } catch (error) {
      console.log("Error rejecting:", error);
    }

    await stopEverything();
    setShowRejectReason(false);
    onReject();
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationX > 0) {
        translateX.value = Math.min(event.translationX, SWIPE_THRESHOLD + 50);
      }
    })
    .onEnd(() => {
      if (translateX.value > SWIPE_THRESHOLD * 0.7) {
        translateX.value = withTiming(SWIPE_THRESHOLD, {}, () => {
          runOnJS(handleAccept)();
        });
      } else {
        translateX.value = withSpring(0);
      }
    });

  const swipeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const swipeProgressStyle = useAnimatedStyle(() => ({
    width: translateX.value + 60,
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0.2, 0.5]),
  }));

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const progressPercent = (timeLeft / 30) * 100;

  return (
    <View style={modalStyles.container}>
      {/* Background Map */}
      {order.pickup_lat && order.pickup_lng && (
        <MapView
          style={StyleSheet.absoluteFillObject}
          initialRegion={{
            latitude: parseFloat(order.pickup_lat) || 28.6139,
            longitude: parseFloat(order.pickup_lng) || 77.209,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
        >
          <Marker
            coordinate={{
              latitude: parseFloat(order.pickup_lat) || 28.6139,
              longitude: parseFloat(order.pickup_lng) || 77.209,
            }}
          >
            <View style={modalStyles.mapMarker}>
              <Ionicons name="location" size={24} color="#111827" />
            </View>
          </Marker>
        </MapView>
      )}

      {/* Overlay */}
      <LinearGradient
        colors={["rgba(0,0,0,0.6)", "rgba(0,0,0,0.85)", "#111827"]}
        style={modalStyles.overlay}
      />

      {/* Content */}
      <View style={modalStyles.content}>
        {/* Timer */}
        <View style={modalStyles.timerContainer}>
          <View style={modalStyles.timerCircle}>
            <View
              style={[
                modalStyles.timerProgress,
                {
                  transform: [{ rotate: `${(1 - timeLeft / 30) * 360}deg` }],
                },
              ]}
            />
            <View style={modalStyles.timerInner}>
              <Text style={modalStyles.timerText}>{timeLeft}</Text>
              <Text style={modalStyles.timerLabel}>sec</Text>
            </View>
          </View>
        </View>

        {/* Icon with pulse */}
        <Animated.View style={[modalStyles.iconContainer, pulseAnimatedStyle]}>
          <View style={modalStyles.iconInner}>
            <Ionicons name="car-sport" size={40} color="#FFFFFF" />
          </View>
        </Animated.View>

        {/* Title */}
        <Text style={modalStyles.title}>New Ride Request</Text>

        {/* Price & Distance */}
        <View style={modalStyles.priceRow}>
          <View style={modalStyles.priceBox}>
            <Text style={modalStyles.priceAmount}>₹{order.price}</Text>
          </View>
          <View style={modalStyles.distanceBox}>
            <Ionicons name="location-outline" size={16} color="#9CA3AF" />
            <Text style={modalStyles.distanceText}>{order.distance} km</Text>
          </View>
        </View>

        {/* Location Details */}
        <View style={modalStyles.locationCard}>
          {order.pickup && (
            <View style={modalStyles.locationRow}>
              <View style={[modalStyles.locationDot, { backgroundColor: "#10B981" }]} />
              <Text style={modalStyles.locationText} numberOfLines={1}>
                {order.pickup}
              </Text>
            </View>
          )}
          
          {order.pickup && order.drop && (
            <View style={modalStyles.locationLine} />
          )}

          {order.drop && (
            <View style={modalStyles.locationRow}>
              <View style={[modalStyles.locationDot, { backgroundColor: "#EF4444" }]} />
              <Text style={modalStyles.locationText} numberOfLines={1}>
                {order.drop}
              </Text>
            </View>
          )}
        </View>

        {/* Swipe to Accept */}
        <View style={modalStyles.swipeContainer}>
          <Animated.View style={[modalStyles.swipeProgress, swipeProgressStyle]} />
          <Text style={modalStyles.swipeText}>Slide to Accept</Text>
          <GestureDetector gesture={panGesture}>
            <Animated.View style={[modalStyles.swipeButton, swipeAnimatedStyle]}>
              <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
            </Animated.View>
          </GestureDetector>
        </View>

        {/* Reject Button */}
        <TouchableOpacity
          style={modalStyles.rejectButton}
          onPress={() => setShowRejectReason(true)}
        >
          <Ionicons name="close" size={20} color="#EF4444" />
          <Text style={modalStyles.rejectText}>Decline</Text>
        </TouchableOpacity>
      </View>

      {/* Reject Reason Modal */}
      {showRejectReason && (
        <View style={modalStyles.reasonOverlay}>
          <View style={modalStyles.reasonModal}>
            <Text style={modalStyles.reasonTitle}>Why are you declining?</Text>

            {["Too Far", "Low Price", "Busy", "Other"].map((reason) => (
              <TouchableOpacity
                key={reason}
                style={modalStyles.reasonOption}
                onPress={() => handleRejectWithReason(reason)}
              >
                <Text style={modalStyles.reasonOptionText}>{reason}</Text>
                <Ionicons name="chevron-forward" size={18} color="#6B7280" />
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={modalStyles.reasonCancel}
              onPress={() => setShowRejectReason(false)}
            >
              <Text style={modalStyles.reasonCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const modalStyles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 999,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },

  // Timer
  timerContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 40,
    right: 24,
  },
  timerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#EF4444",
  },
  timerInner: {
    alignItems: "center",
  },
  timerText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  timerLabel: {
    color: "#EF4444",
    fontSize: 10,
    fontWeight: "600",
  },

  // Icon
  iconContainer: {
    marginBottom: 24,
  },
  iconInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.2)",
  },

  // Title
  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20,
  },

  // Price
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  priceBox: {
    backgroundColor: "#10B981",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 16,
  },
  priceAmount: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
  },
  distanceBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  distanceText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 6,
  },

  // Location
  locationCard: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    padding: 18,
    marginBottom: 30,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 14,
  },
  locationLine: {
    width: 2,
    height: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginLeft: 5,
    marginVertical: 6,
  },
  locationText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
  },

  // Swipe
  swipeContainer: {
    width: "100%",
    height: 64,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderRadius: 32,
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#10B981",
    marginBottom: 20,
  },
  swipeProgress: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#10B981",
    borderRadius: 32,
  },
  swipeText: {
    color: "#10B981",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  swipeButton: {
    position: "absolute",
    left: 6,
    top: 6,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
  },

  // Reject
  rejectButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: "rgba(239, 68, 68, 0.5)",
  },
  rejectText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },

  // Map Marker
  mapMarker: {
    backgroundColor: "#FFFFFF",
    padding: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },

  // Reason Modal
  reasonOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  reasonModal: {
    backgroundColor: "#1F2937",
    borderRadius: 24,
    padding: 24,
    width: "85%",
    maxWidth: 340,
  },
  reasonTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 20,
  },
  reasonOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#374151",
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
  },
  reasonOptionText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
  reasonCancel: {
    marginTop: 10,
    padding: 16,
    alignItems: "center",
  },
  reasonCancelText: {
    color: "#9CA3AF",
    fontSize: 16,
    fontWeight: "500",
  },
});

// ================================
// 📱 CUSTOM TAB BAR
// ================================
function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { tech } = useAuth();

  const getIcon = (routeName, focused) => {
    const icons = {
      Home: focused ? "home" : "home-outline",
      Work: focused ? "briefcase" : "briefcase-outline",
      Wallet: focused ? "wallet" : "wallet-outline",
      Profile: focused ? "person" : "person-outline",
    };
    return icons[routeName] || "help-outline";
  };

  return (
    <View
      style={[
        tabBarStyles.container,
        { paddingBottom: insets.bottom > 0 ? insets.bottom : 10 },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            style={tabBarStyles.tab}
            activeOpacity={0.7}
          >
            <View
              style={[
                tabBarStyles.iconContainer,
                isFocused && tabBarStyles.iconContainerActive,
              ]}
            >
              <Ionicons
                name={getIcon(label, isFocused)}
                size={22}
                color={isFocused ? "#FFFFFF" : "#6B7280"}
              />
            </View>
            <Text
              style={[
                tabBarStyles.label,
                isFocused && tabBarStyles.labelActive,
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tabBarStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 10,
    paddingHorizontal: 10,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  iconContainerActive: {
    backgroundColor: "#111827",
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
  },
  labelActive: {
    color: "#111827",
  },
});

// ================================
// 📱 APP TABS
// ================================
function AppTabs() {
  const insets = useSafeAreaInsets();
  const { tech } = useAuth();
  const navigation = useNavigation();

  const [activeOrder, setActiveOrder] = useState(null);
  const [hasAutoNavigated, setHasAutoNavigated] = useState(false);
  const [incomingOrder, setIncomingOrder] = useState(null);

  const isCarWash = tech?.category === "carwash" || tech?.category === "car_wash";

  // Setup notifications
  useEffect(() => {
    async function setupNotifications() {
      try {
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("ride-requests", {
            name: "Ride Requests",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            sound: "default",
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          });
        }
      } catch (error) {
        console.log("Notification channel error:", error);
      }
    }
    setupNotifications();
  }, []);

  // FCM Token refresh
  useEffect(() => {
    if (!tech?.id) return;

    const unsubscribe = messaging().onTokenRefresh(async (token) => {
      try {
        await fetch(`${API_BASE_URL}/technicians/save-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ push_token: token, technician_id: tech.id }),
        });
      } catch (err) {
        console.log("Token refresh save error:", err);
      }
    });

    return unsubscribe;
  }, [tech?.id]);

  // Initialize Firebase
  useEffect(() => {
    async function initializeFirebase() {
      try {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (!enabled) return;

        const token = await messaging().getToken();

        if (tech?.id) {
          await fetch(`${API_BASE_URL}/technicians/save-token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ push_token: token, technician_id: tech.id }),
          });
        }
      } catch (error) {
        console.error("Firebase init error:", error);
      }
    }

    if (tech?.id) {
      initializeFirebase();
    }
  }, [tech?.id]);

  // FCM Message Handler
  useEffect(() => {
    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      try {
        const rawData = remoteMessage?.data || {};
        if (typeof rawData !== "object" || Object.keys(rawData).length === 0) return;

        const orderId = rawData.orderId || rawData.order_id;
        if (!orderId) return;

        const safeOrder = {
          id: String(orderId),
          service_type: rawData.service_type || "",
          price: rawData.price || "0",
          distance: rawData.distance || "0",
          duration: rawData.duration || "",
          vehicle: rawData.vehicle || "",
          package_name: rawData.package_name || "",
          pickup: rawData.pickup_address || "Pickup",
          drop: rawData.drop_address || "Drop",
          pickup_lat: rawData.pickup_lat ? parseFloat(rawData.pickup_lat) : null,
          pickup_lng: rawData.pickup_lng ? parseFloat(rawData.pickup_lng) : null,
          drop_lat: rawData.drop_lat ? parseFloat(rawData.drop_lat) : null,
          drop_lng: rawData.drop_lng ? parseFloat(rawData.drop_lng) : null,
          car_details: null,
        };

        if (rawData.car_details) {
          try {
            safeOrder.car_details =
              typeof rawData.car_details === "string"
                ? JSON.parse(rawData.car_details)
                : rawData.car_details;
          } catch (e) {}
        }

        setIncomingOrder(safeOrder);
      } catch (err) {
        console.error("FCM Handler Error:", err.message);
      }
    });

    return unsubscribe;
  }, []);

  // Check active orders
  useEffect(() => {
    if (!tech?.id) return;

    const checkActiveOrder = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/orders/accepted/list?technician_id=${tech.id}`
        );
        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
          setActiveOrder(data[0]);

          if (!hasAutoNavigated) {
            setHasAutoNavigated(true);
            const order = data[0];
            const screen = isCarWash ? "ActiveWashScreen" : "ActiveRideScreen";
            navigation.navigate(screen, { orderId: order.id });
          }
        } else {
          setActiveOrder(null);
        }
      } catch (err) {
        console.log("Active order check error:", err);
      }
    };

    checkActiveOrder();
    const interval = setInterval(checkActiveOrder, 5000);
    return () => clearInterval(interval);
  }, [tech?.id, hasAutoNavigated, isCarWash, navigation]);

  // Location tracking
  useEffect(() => {
    if (!tech?.id || !activeOrder?.id) return;

    let subscription;

    const startTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
          async (loc) => {
            try {
              await fetch(`${API_BASE_URL}/orders/${activeOrder.id}/location`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  technician_id: tech.id,
                  lat: loc.coords.latitude,
                  lng: loc.coords.longitude,
                }),
              });
            } catch (err) {}
          }
        );
      } catch (error) {}
    };

    startTracking();
    return () => subscription?.remove();
  }, [tech?.id, activeOrder?.id]);

  const handleBannerPress = () => {
    if (!activeOrder?.id) return;
    const screen = isCarWash ? "ActiveWashScreen" : "ActiveRideScreen";
    navigation.navigate(screen, { orderId: String(activeOrder.id) });
  };

  const getStatusLabel = (status) => {
    const labels = {
      accepted: "NAVIGATE TO CLIENT",
      arrived: "WAITING FOR OTP",
      in_progress: "IN PROGRESS",
    };
    return labels[status] || "ACTIVE";
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      {/* Incoming Request Modal */}
      {incomingOrder && incomingOrder.id && (
        <IncomingRequestModal
          order={incomingOrder}
          technicianId={tech?.id}
          onAccept={async () => {
            const selectedOrderId = incomingOrder?.id;
            if (!selectedOrderId || selectedOrderId === "null") {
              Alert.alert("Error", "Invalid order details");
              setIncomingOrder(null);
              return;
            }
            setIncomingOrder(null);
            navigation.navigate("RequestDetailScreen", { orderId: String(selectedOrderId) });
          }}
          onReject={() => setIncomingOrder(null)}
        />
      )}

      {/* Active Order Banner */}
      {activeOrder && !incomingOrder && (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleBannerPress}
          style={styles.activeBanner}
        >
          <View style={styles.activeBannerContent}>
            <View style={styles.activeBannerIcon}>
              <Ionicons name={isCarWash ? "water" : "car-sport"} size={22} color="#FFFFFF" />
            </View>
            <View style={styles.activeBannerText}>
              <Text style={styles.activeBannerName}>
                {activeOrder.client_name || "Client"}
              </Text>
              <Text style={styles.activeBannerStatus}>
                {getStatusLabel(activeOrder.status)}
              </Text>
            </View>
            <View style={styles.activeBannerArrow}>
              <Ionicons name="arrow-forward" size={18} color="#111827" />
            </View>
          </View>

          <View style={styles.activeBannerDetails}>
            <View style={styles.activeBannerDetail}>
              <Ionicons name="location-outline" size={14} color="#6B7280" />
              <Text style={styles.activeBannerDetailText}>
                {activeOrder.distance ?? "—"} km
              </Text>
            </View>
            <View style={styles.activeBannerDetail}>
              <Ionicons name="cash-outline" size={14} color="#6B7280" />
              <Text style={styles.activeBannerDetailText}>₹{activeOrder.price}</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* Tab Navigator */}
      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="Home" component={DashboardScreen} />
        <Tab.Screen name="Work" component={WorkScreen} />
        <Tab.Screen name="Wallet" component={WalletScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  activeBanner: {
    position: "absolute",
    bottom: 90,
    left: 16,
    right: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    zIndex: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#111827",
  },
  activeBannerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  activeBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activeBannerText: {
    flex: 1,
  },
  activeBannerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  activeBannerStatus: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10B981",
    marginTop: 2,
  },
  activeBannerArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  activeBannerDetails: {
    flexDirection: "row",
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  activeBannerDetail: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
  },
  activeBannerDetailText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "600",
    marginLeft: 6,
  },
});

// ================================
// 🔀 ROUTER
// ================================
function Router() {
  const { tech, loading } = useAuth();

  if (loading) return null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {tech ? (
        <>
          <Stack.Screen name="AppTabs" component={AppTabs} />
          <Stack.Screen name="RequestDetailScreen" component={RequestDetailScreen} />
          <Stack.Screen name="ActiveRideScreen" component={ActiveRideScreen} />
          <Stack.Screen name="ActiveWashScreen" component={ActiveWashScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="BasicDetails" component={BasicDetailsScreen} />
          <Stack.Screen name="CategoryDetails" component={CategoryDetailsScreen} />
          <Stack.Screen name="DocumentUpload" component={DocumentUploadScreen} />
          <Stack.Screen name="ThankYou" component={ThankYouScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

// ================================
// 🚀 APP ENTRY
// ================================
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <AuthProvider>
          <SafeAreaProvider>
            <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
              <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
              <NavigationContainer ref={navigationRef}>
                <Router />
              </NavigationContainer>
            </View>
          </SafeAreaProvider>
        </AuthProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}