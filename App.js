// App.js
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
} from "react-native";

import { StatusBar } from "expo-status-bar";
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
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";

import MapView, { Marker } from "react-native-maps";

import { colors } from "./theme/colors";
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
import ErrorBoundary from './components/ErrorBoundary';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

export const navigationRef = createNavigationContainerRef();

const { width: SCREEN_WIDTH } = Dimensions.get("window");
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
// 🚗 INCOMING REQUEST MODAL
// ================================
function IncomingRequestModal({ order, technicianId, onAccept, onReject }) {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);

  const [timeLeft, setTimeLeft] = useState(30);
  const [sound, setSound] = useState(null);
  const [showRejectReason, setShowRejectReason] = useState(false);

  const vibrationIntervalRef = useRef(null);
  const soundRef = useRef(null);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 600 }),
        withTiming(1, { duration: 600 })
      ),
      -1
    );
  }, [scale]);

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
          {
            shouldPlay: true,
            isLooping: true,
            volume: 1.0,
          }
        );

        soundRef.current = createdSound;
        setSound(createdSound);

        vibrationIntervalRef.current = setInterval(() => {
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Warning
          ).catch(() => {});
        }, 2000);

        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning
        ).catch(() => {});
      } catch (error) {
        console.log("❌ Error playing sound:", error);
      }
    }

    playSound();

    return () => {
      if (vibrationIntervalRef.current) {
        clearInterval(vibrationIntervalRef.current);
        vibrationIntervalRef.current = null;
      }

      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
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

          if (!order?.id) return;

            fetch(`${API_BASE_URL}/orders/${order.id}/reject`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              technician_id: technicianId,
              reason: "Timeout",
            }),
          }).catch(() => {});

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
        body: JSON.stringify({
          technician_id: technicianId,
          reason,
        }),
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
    opacity: 0.3,
  }));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={modalStyles.container}>
      {order.pickup_lat && order.pickup_lng && (
        <MapView
          style={StyleSheet.absoluteFillObject}
          initialRegion={{
            latitude: parseFloat(order.pickup_lat) || 28.6139,
            longitude: parseFloat(order.pickup_lng) || 77.209,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
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
            <View style={modalStyles.markerContainer}>
              <Ionicons name="location" size={30} color="#FF6B00" />
            </View>
          </Marker>
        </MapView>
      )}

      <View style={modalStyles.overlay} />

      <View style={modalStyles.content}>
        <View style={modalStyles.countdownCircle}>
          <Text style={modalStyles.countdownText}>{timeLeft}</Text>
          <Text style={modalStyles.countdownLabel}>sec</Text>
        </View>

        <Animated.View style={[modalStyles.ringContainer, animatedStyle]}>
          <Ionicons name="car-sport" size={50} color="#fff" />
        </Animated.View>

        <Text style={modalStyles.title}>New Ride Request</Text>
        <Text style={modalStyles.price}>₹{order.price}</Text>
        <Text style={modalStyles.distance}>{order.distance} km away</Text>

        <View style={modalStyles.detailsCard}>
          {order.pickup && (
            <View style={modalStyles.detailRow}>
              <Ionicons name="radio-button-on" size={16} color="#10B981" />
              <Text style={modalStyles.detailText} numberOfLines={1}>
                {order.pickup}
              </Text>
            </View>
          )}

          {order.drop && (
            <View style={modalStyles.detailRow}>
              <Ionicons name="location" size={16} color="#EF4444" />
              <Text style={modalStyles.detailText} numberOfLines={1}>
                {order.drop}
              </Text>
            </View>
          )}
        </View>

        <Text style={modalStyles.autoRejectText}>
          Auto reject in {timeLeft}s
        </Text>

        <View style={modalStyles.swipeContainer}>
          <Animated.View
            style={[modalStyles.swipeProgress, swipeProgressStyle]}
          />

          <Text style={modalStyles.swipeTrackText}>Swipe to Accept →</Text>

          <GestureDetector gesture={panGesture}>
            <Animated.View
              style={[modalStyles.swipeButton, swipeAnimatedStyle]}
            >
              <Ionicons name="chevron-forward" size={28} color="#fff" />
            </Animated.View>
          </GestureDetector>
        </View>

        <TouchableOpacity
          style={modalStyles.rejectButton}
          onPress={() => setShowRejectReason(true)}
        >
          <Text style={modalStyles.rejectButtonText}>REJECT</Text>
        </TouchableOpacity>
      </View>

      {showRejectReason && (
        <View style={modalStyles.rejectModalOverlay}>
          <View style={modalStyles.rejectModal}>
            <Text style={modalStyles.rejectModalTitle}>
              Why are you rejecting?
            </Text>

            {["Too Far", "Low Price", "Busy", "Other"].map((reason) => (
              <TouchableOpacity
                key={reason}
                style={modalStyles.rejectReasonButton}
                onPress={() => handleRejectWithReason(reason)}
              >
                <Text style={modalStyles.rejectReasonText}>{reason}</Text>
                <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={modalStyles.cancelRejectButton}
              onPress={() => setShowRejectReason(false)}
            >
              <Text style={modalStyles.cancelRejectText}>Cancel</Text>
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
    backgroundColor: "#0F172A",
    zIndex: 999,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  countdownCircle: {
    position: "absolute",
    top: 60,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderWidth: 3,
    borderColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
  },
  countdownText: {
    color: "#EF4444",
    fontSize: 20,
    fontWeight: "bold",
  },
  countdownLabel: {
    color: "#EF4444",
    fontSize: 10,
  },
  ringContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FF6B00",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
    shadowColor: "#FF6B00",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 10,
  },
  price: {
    color: "#10B981",
    fontSize: 36,
    fontWeight: "bold",
  },
  distance: {
    color: "#CBD5E1",
    fontSize: 16,
    marginTop: 5,
  },
  detailsCard: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 15,
    marginTop: 20,
    width: "100%",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 5,
  },
  detailText: {
    color: "#fff",
    marginLeft: 10,
    flex: 1,
    fontSize: 14,
  },
  autoRejectText: {
    marginTop: 20,
    fontSize: 14,
    color: "#F87171",
  },
  swipeContainer: {
    width: "100%",
    height: 60,
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderRadius: 30,
    marginTop: 30,
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#10B981",
  },
  swipeProgress: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#10B981",
    borderRadius: 30,
  },
  swipeTrackText: {
    color: "#10B981",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  swipeButton: {
    position: "absolute",
    left: 5,
    top: 5,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  rejectButton: {
    marginTop: 20,
    paddingVertical: 15,
    paddingHorizontal: 50,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#EF4444",
  },
  rejectButtonText: {
    color: "#EF4444",
    fontWeight: "bold",
    fontSize: 16,
  },
  markerContainer: {
    backgroundColor: "#fff",
    padding: 5,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  rejectModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  rejectModal: {
    backgroundColor: "#1E293B",
    borderRadius: 20,
    padding: 20,
    width: "85%",
    maxWidth: 350,
  },
  rejectModalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 20,
  },
  rejectReasonButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#334155",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  rejectReasonText: {
    color: "#fff",
    fontSize: 16,
  },
  cancelRejectButton: {
    marginTop: 10,
    padding: 15,
    alignItems: "center",
  },
  cancelRejectText: {
    color: "#94A3B8",
    fontSize: 16,
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

  const isCarWash =
    tech?.category === "carwash" || tech?.category === "car_wash";

  useEffect(() => {
    async function setupNotifications() {
      try {
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("ride-requests", {
            name: "Ride Requests",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            sound: "default",
            lockscreenVisibility:
              Notifications.AndroidNotificationVisibility.PUBLIC,
          });
        }
      } catch (error) {
        console.log("Notification channel error:", error);
      }
    }

    setupNotifications();
  }, []);

  useEffect(() => {
    if (!tech?.id) return;

    const unsubscribe = messaging().onTokenRefresh(async (token) => {
      try {
        console.log("🔄 FCM token refreshed:", token);

        const response = await fetch(`${API_BASE_URL}/technicians/save-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            push_token: token,
            technician_id: tech.id,
          }),
        });

        console.log("🔄 save-token refresh status:", response.status);
      } catch (err) {
        console.log("❌ Token refresh save error:", err);
      }
    });

    return unsubscribe;
  }, [tech?.id]);

  useEffect(() => {
    async function testFirebase() {
      try {
        const token = await messaging().getToken();
        console.log("🔥 Firebase initialized. Token:", token);
      } catch (e) {
        console.log("Firebase error:", e);
      }
    }

    testFirebase();
  }, []);



    useEffect(() => {
    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      try {
        console.log("📩 RAW FCM:", JSON.stringify(remoteMessage, null, 2));

        // ✅ Extract data safely
        const rawData = remoteMessage?.data || {};
        
        if (typeof rawData !== 'object' || Object.keys(rawData).length === 0) {
          console.log("❌ No valid data in FCM");
          return;
        }

        const orderId = rawData.orderId || rawData.order_id;
        
        if (!orderId) {
          console.log("❌ No orderId found");
          return;
        }

        // ✅ Build safe order object
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

        // ✅ Parse car_details if exists
        if (rawData.car_details) {
          try {
            safeOrder.car_details = 
              typeof rawData.car_details === 'string' 
                ? JSON.parse(rawData.car_details) 
                : rawData.car_details;
          } catch (e) {
            console.log("car_details parse error");
          }
        }

        console.log("✅ Safe order created:", safeOrder);
        setIncomingOrder(safeOrder);

      } catch (err) {
        console.error("❌ FCM Handler Error:", err.message);
      }
    });

    return unsubscribe;
  }, []);

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

            if (isCarWash) {
              navigation.navigate("ActiveWashScreen", { orderId: order.id });
            } else {
              navigation.navigate("ActiveRideScreen", { orderId: order.id });
            }
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

  // INSIDE useEffect in AppTabs
    useEffect(() => {
      async function initializeFirebase() {
        try {
          console.log('🔥 Starting Firebase init...');
          
          const authStatus = await messaging().requestPermission();
          console.log('📱 Permission status:', authStatus);
          
          const enabled =
            authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
            authStatus === messaging.AuthorizationStatus.PROVISIONAL;

          if (!enabled) {
            console.log('❌ Firebase permission not granted');
            return;
          }

          const token = await messaging().getToken();
          console.log('✅ FCM Token:', token);
          console.log('📏 Token length:', token.length);

          if (tech?.id) {
            console.log('💾 Saving token for tech ID:', tech.id);
            
            const response = await fetch(`${API_BASE_URL}/technicians/save-token`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                push_token: token,
                technician_id: tech.id,
              }),
            });

            const responseText = await response.text();
            console.log("save-token response:", response.status, responseText);

            if (!response.ok) {
              console.log("❌ Failed to save token");
            }
          }
        } catch (error) {
          console.error('❌ Firebase init error:', error);
        }
      }

      if (tech?.id) {
        initializeFirebase();
      }
    }, [tech?.id]);

  useEffect(() => {
    if (!tech?.id || !activeOrder?.id) return;

    let subscription;

    const startTracking = async () => {
      try {
        const { status } =
          await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") return;

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 10,
          },
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
            } catch (err) {
              console.log("Location update error:", err);
            }
          }
        );
      } catch (error) {
        console.log("Tracking start error:", error);
      }
    };

    startTracking();

    return () => subscription?.remove();
  }, [tech?.id, activeOrder?.id]);

  // ✅ Fix banner press handler
  // Around line 520 - Update handleBannerPress
  const handleBannerPress = () => {
    if (!activeOrder?.id) {
      console.log("❌ No active order ID");
      Alert.alert("Error", "No active order found");
      return;
    }

    const orderId = String(activeOrder.id);
    const targetScreen = isCarWash ? "ActiveWashScreen" : "ActiveRideScreen";
    
    console.log(`✅ Navigating to ${targetScreen} with orderId:`, orderId);

    try {
      navigation.navigate(targetScreen, { orderId });
    } catch (error) {
      console.error("Navigation error:", error);
      Alert.alert("Error", "Failed to open active order");
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      accepted: "NAVIGATE TO CLIENT",
      arrived: "WAITING FOR OTP",
      in_progress: "WASH IN PROGRESS",
    };
    return labels[status] || "ACTIVE";
  };

  const getStatusColor = (status) => {
    const statusColors = {
      accepted: isCarWash ? "#00A86B" : "#FF6B00",
      arrived: "#F59E0B",
      in_progress: "#3B82F6",
    };
    return statusColors[status] || "#00A86B";
  };

  return (
    <View style={{ flex: 1 }}>
        {incomingOrder && incomingOrder.id && (
        <IncomingRequestModal
          order={incomingOrder}
          technicianId={tech?.id}
          onAccept={async () => {
            const selectedOrderId = incomingOrder?.id;
            
            // ✅ CRITICAL: Validate before clearing state
            if (!selectedOrderId || selectedOrderId === "null" || selectedOrderId === "undefined") {
              console.log("❌ Invalid order ID in onAccept");
              Alert.alert("Error", "Invalid order details");
              setIncomingOrder(null);
              return;
            }

            console.log("✅ Accepting order:", selectedOrderId);
            
            // Clear modal AFTER validation
            setIncomingOrder(null);

            // Navigate with validated ID
            try {
              navigation.navigate("RequestDetailScreen", {
                orderId: String(selectedOrderId),
              });
            } catch (error) {
              console.error("Navigation error:", error);
              Alert.alert("Error", "Failed to open order details");
            }
          }}
          onReject={() => {
            console.log("❌ Order rejected");
            setIncomingOrder(null);
          }}
        />
      )}

      {activeOrder && !incomingOrder && (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleBannerPress}
          style={{
            position: "absolute",
            bottom: 75,
            left: 15,
            right: 15,
            backgroundColor: "#111827",
            padding: 18,
            borderRadius: 18,
            zIndex: 100,
            shadowColor: "#000",
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
            borderLeftWidth: 4,
            borderLeftColor: getStatusColor(activeOrder.status),
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                backgroundColor: getStatusColor(activeOrder.status),
                width: 45,
                height: 45,
                borderRadius: 12,
                justifyContent: "center",
                alignItems: "center",
                marginRight: 12,
              }}
            >
              <Ionicons
                name={isCarWash ? "water" : "car-sport"}
                size={22}
                color="#fff"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                {activeOrder.client_name || "Client"}
              </Text>
              <Text
                style={{
                  color: getStatusColor(activeOrder.status),
                  fontSize: 12,
                  fontWeight: "600",
                  marginTop: 2,
                }}
              >
                {getStatusLabel(activeOrder.status)}
              </Text>
            </View>

            <View
              style={{
                backgroundColor: getStatusColor(activeOrder.status),
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 11 }}>
                TAP
              </Text>
            </View>
          </View>

          <View
            style={{
              flexDirection: "row",
              marginTop: 14,
              justifyContent: "space-between",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name="location"
                size={16}
                color={getStatusColor(activeOrder.status)}
              />
              <Text style={{ color: "#fff", marginLeft: 6 }}>
                {activeOrder.distance ?? "—"}
              </Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name="cash"
                size={16}
                color={getStatusColor(activeOrder.status)}
              />
              <Text style={{ color: "#fff", marginLeft: 6 }}>
                ₹{activeOrder.price}
              </Text>
            </View>

            {activeOrder.vehicle && (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="car"
                  size={16}
                  color={getStatusColor(activeOrder.status)}
                />
                <Text style={{ color: "#fff", marginLeft: 6 }}>
                  {activeOrder.vehicle}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      )}

      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarShowLabel: true,
          tabBarActiveTintColor: isCarWash ? "#00A86B" : colors.primary,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: {
            backgroundColor: "#fff",
            borderTopWidth: 1,
            borderTopColor: colors.border,
            height: 65 + insets.bottom,
            paddingBottom: insets.bottom,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "600",
            marginBottom: 4,
          },
          tabBarIcon: ({ color, focused }) => {
            const icons = {
              Home: "home-outline",
              Work: "briefcase-outline",
              Wallet: "wallet-outline",
              Profile: "person-outline",
            };

            return (
              <Ionicons
                name={
                  focused
                    ? icons[route.name].replace("-outline", "")
                    : icons[route.name]
                }
                size={22}
                color={color}
              />
            );
          },
        })}
      >
        <Tab.Screen name="Home" component={DashboardScreen} />
        <Tab.Screen name="Work" component={WorkScreen} />
        <Tab.Screen name="Wallet" component={WalletScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </View>
  );
}

function Router() {
  const { tech, loading } = useAuth();

  if (loading) return null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {tech ? (
        <>
          <Stack.Screen name="AppTabs" component={AppTabs} />
          <Stack.Screen
            name="RequestDetailScreen"
            component={RequestDetailScreen}
          />
          <Stack.Screen name="ActiveRideScreen" component={ActiveRideScreen} />
          <Stack.Screen name="ActiveWashScreen" component={ActiveWashScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="BasicDetails" component={BasicDetailsScreen} />
          <Stack.Screen
            name="CategoryDetails"
            component={CategoryDetailsScreen}
          />
          <Stack.Screen
            name="DocumentUpload"
            component={DocumentUploadScreen}
          />
          <Stack.Screen name="ThankYou" component={ThankYouScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <AuthProvider>
          <SafeAreaProvider>
            <View style={{ flex: 1, backgroundColor: colors.bg }}>
              <StatusBar style="dark" />
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