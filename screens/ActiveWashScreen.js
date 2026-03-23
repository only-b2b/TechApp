// screens/ActiveWashScreen.js
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  TextInput,
  Image,
  Animated,
  Linking,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/Ionicons";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { API_BASE_URL } from "../config";
import { useAuth } from "../auth/AuthContext";

const { width } = Dimensions.get("window");

const COLORS = {
  bg: "#0F172A",
  card: "#1E293B",
  primary: "#00A86B",
  primaryLight: "#00C77B",
  cyan: "#22D3EE",
  text: "#F8FAFC",
  subtext: "#94A3B8",
  success: "#22C55E",
  warning: "#F59E0B",
  error: "#EF4444",
  border: "#334155",
};

// Steps: navigate → arrived → otp → pre_photos → washing → post_photos → complete
const STEPS = {
  navigate: { title: "Navigate to Client", icon: "navigate" },
  arrived: { title: "Arrived at Location", icon: "location" },
  otp: { title: "Verify OTP", icon: "key" },
  pre_photos: { title: "Pre-Wash Photos", icon: "camera" },
  washing: { title: "Wash in Progress", icon: "water" },
  post_photos: { title: "Post-Wash Photos", icon: "camera" },
  complete: { title: "Job Complete", icon: "checkmark-done" },
};

export default function ActiveWashScreen({ route, navigation }) {
  // ✅ VALIDATE FIRST
  const orderId = route?.params?.orderId;
  
  if (!orderId || orderId === "null" || orderId === "undefined") {
    React.useEffect(() => {
      console.error("❌ Invalid orderId in ActiveWashScreen:", orderId);
      Alert.alert("Error", "Invalid order ID", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    }, []);
    
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Icon name="alert-circle" size={48} color={COLORS.error} />
        <Text style={{ color: COLORS.text, marginTop: 12 }}>Invalid Order ID</Text>
      </View>
    );
  }

  const { tech } = useAuth();
  
  // States
  const [order, setOrder] = useState(null);
  const [step, setStep] = useState("navigate");
  const [loading, setLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  
  // OTP state
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const otpRefs = [useRef(), useRef(), useRef(), useRef()];
  
  // Photos state
  const [prePhotos, setPrePhotos] = useState([]);
  const [postPhotos, setPostPhotos] = useState([]);
  
  // Timer state
  const [washTime, setWashTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Fetch order data
  // In ActiveWashScreen.js - Update the fetchOrder function

  // screens/ActiveWashScreen.js - Update fetchOrder function

  // screens/ActiveWashScreen.js - UPDATE fetchOrder function

  const fetchOrder = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}`);
      const data = await res.json();
      setOrder(data);

      // ✅ Parse photo arrays safely
      const prePhotosArr = data.pre_photos 
        ? (typeof data.pre_photos === 'string' ? JSON.parse(data.pre_photos) : data.pre_photos) 
        : [];
      const postPhotosArr = data.post_photos 
        ? (typeof data.post_photos === 'string' ? JSON.parse(data.post_photos) : data.post_photos)
        : [];

      // ✅ Set photos state
      if (prePhotosArr.length > 0) setPrePhotos(prePhotosArr);
      if (postPhotosArr.length > 0) setPostPhotos(postPhotosArr);

      // ✅ AUTO-DETECT CORRECT STEP
      switch (data.status) {
        case "accepted":
          setStep("navigate");
          break;

        case "arrived":
          setStep("otp");
          break;

        case "in_progress":
          // ✅ Determine which sub-step within in_progress
          if (postPhotosArr.length >= 2) {
            // Post photos already uploaded, ready to complete
            setStep("post_photos");
          } else if (data.wash_end_time) {
            // Wash finished, need post photos
            setStep("post_photos");
          } else if (data.wash_started_at) {
            // Currently washing
            setStep("washing");
            
            // ✅ Calculate elapsed wash time
            const startTime = new Date(data.wash_started_at).getTime();
            const now = Date.now();
            const elapsed = Math.floor((now - startTime) / 1000);
            setWashTime(elapsed > 0 ? elapsed : 0);
          } else if (prePhotosArr.length >= 2) {
            // Pre photos taken but wash not started yet
            setStep("pre_photos");
          } else {
            // OTP verified but nothing else done
            setStep("pre_photos");
          }
          break;

        case "completed":
          setStep("complete");
          break;

        default:
          setStep("navigate");
      }
    } catch (err) {
      console.log("Fetch error:", err);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, []);

  // Get current location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    })();
  }, []);

  // Live location updates when navigating
  useEffect(() => {
    if (step !== "navigate" || !tech?.id) return;

    let subscription;
    (async () => {
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (loc) => {
          fetch(`${API_BASE_URL}/orders/${orderId}/location`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              technician_id: tech.id,
              lat: loc.coords.latitude,
              lng: loc.coords.longitude,
            }),
          });
        }
      );
    })();

    return () => subscription?.remove();
  }, [step, tech]);

  // Wash timer
  useEffect(() => {
    if (step !== "washing" || isPaused) return;
    
    const timer = setInterval(() => {
      setWashTime((prev) => prev + 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [step, isPaused]);

  // Pulse animation for washing
  useEffect(() => {
    if (step === "washing") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [step]);

  // Progress animation
  useEffect(() => {
    const stepIndex = Object.keys(STEPS).indexOf(step);
    const progress = stepIndex / (Object.keys(STEPS).length - 1);
    
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [step]);

  // Helpers
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const openNavigation = () => {
    if (!order?.pickup_lat || !order?.pickup_lng) return;
    
    const destination = `${order.pickup_lat},${order.pickup_lng}`;
    const url = Platform.OS === "ios"
      ? `maps://app?daddr=${destination}`
      : `google.navigation:q=${destination}`;
    
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destination}`);
    });
  };

  // Action handlers
  const handleArrived = async () => {
    setLoading(true);
    try {
      await fetch(`${API_BASE_URL}/orders/${orderId}/arrived`, {
        method: "POST",
      });
      setStep("otp");
      fetchOrder();
    } catch (err) {
      Alert.alert("Error", "Failed to update status");
    }
    setLoading(false);
  };

  const handleOTPChange = (value, index) => {
    if (isNaN(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setOtpError("");

    if (value && index < 3) {
      otpRefs[index + 1].current?.focus();
    }
  };

  const handleOTPKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  const verifyOTP = async () => {
    const otpString = otp.join("");
    if (otpString.length !== 4) {
      setOtpError("Please enter complete OTP");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: otpString }),
      });

      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error || "Invalid OTP");
        setLoading(false);
        return;
      }

      setStep("pre_photos");
    } catch (err) {
      setOtpError("Verification failed");
    }
    setLoading(false);
  };

  const takePhoto = async (type) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera access is required");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      if (type === "pre") {
        setPrePhotos([...prePhotos, uri]);
      } else {
        setPostPhotos([...postPhotos, uri]);
      }
    }
  };

  const startWashing = async () => {
    if (prePhotos.length < 2) {
      Alert.alert("Photos Required", "Please take at least 2 pre-wash photos");
      return;
    }

    setLoading(true);
    try {
      const uploadedUrls = await uploadPhotos(prePhotos);

      await fetch(`${API_BASE_URL}/orders/${orderId}/pre-photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: uploadedUrls }),
      });

      await fetch(`${API_BASE_URL}/orders/${orderId}/start-wash`, { method: "POST" });
      setStep("washing");
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to start wash");
    }
    setLoading(false);
  };

  const finishWashing = () => {
    setStep("post_photos");
  };

  const completeJob = async () => {
    if (postPhotos.length < 2) {
      Alert.alert("Photos Required", "Please take at least 2 post-wash photos");
      return;
    }

    setLoading(true);
    try {
      // ✅ upload local URIs -> get http URLs
      const uploadedUrls = await uploadPhotos(postPhotos);

      // ✅ save http URLs in DB
      await fetch(`${API_BASE_URL}/orders/${orderId}/post-photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: uploadedUrls }),
      });

      await fetch(`${API_BASE_URL}/orders/${orderId}/complete-wash`, {
        method: "POST",
      });

      setStep("complete");
      await fetchOrder(); // optional
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to complete job");
    }
    setLoading(false);
  };


  const uploadPhotos = async (localUris) => {
  const form = new FormData();
      localUris.forEach((uri) => {
        form.append("photos", {
          uri,
          name: `photo-${Date.now()}.jpg`,
          type: "image/jpeg",
        });
      });

      const res = await fetch(`${API_BASE_URL}/orders/${orderId}/upload-photos`, {
        method: "POST",
        body: form,
        // don't set Content-Type manually for FormData in RN
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      return data.urls; // ✅ http/https URLs
    };

  const goHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "AppTabs" }],
    });
  };

  if (!order) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Progress bar width
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryLight]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity 
            style={styles.backBtn}
            onPress={() => {
              if (step === "navigate") {
                navigation.goBack();
              } else {
                Alert.alert("Leave?", "Are you sure you want to leave this job?", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Leave", onPress: () => navigation.goBack() },
                ]);
              }
            }}
          >
            <Icon name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{STEPS[step].title}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBg}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
          <Text style={styles.progressText}>
            Step {Object.keys(STEPS).indexOf(step) + 1} of {Object.keys(STEPS).length}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* STEP: Navigate */}
        {step === "navigate" && (
          <>
            {/* Map */}
            {order.pickup_lat && order.pickup_lng && (
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
                >
                  <Marker
                    coordinate={{
                      latitude: order.pickup_lat,
                      longitude: order.pickup_lng,
                    }}
                  >
                    <View style={styles.marker}>
                      <Icon name="home" size={18} color="#fff" />
                    </View>
                  </Marker>
                </MapView>
              </View>
            )}

            {/* Client Info */}
            <View style={styles.card}>
              <View style={styles.clientRow}>
                <View style={styles.avatar}>
                  <Icon name="person" size={28} color={COLORS.primary} />
                </View>
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>{order.client_name || "Client"}</Text>
                  <Text style={styles.clientService}>{order.package_name || "Car Wash"}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.callBtn}
                  onPress={() => Linking.openURL(`tel:${order.client_phone || ""}`)}
                >
                  <Icon name="call" size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={styles.addressRow}>
                <Icon name="location" size={18} color={COLORS.primary} />
                <Text style={styles.addressText}>{order.pickup_address || "Client location"}</Text>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Icon name="navigate-outline" size={16} color={COLORS.subtext} />
                  <Text style={styles.statText}>{order.distance || "—"}</Text>
                </View>
                <View style={styles.statItem}>
                  <Icon name="time-outline" size={16} color={COLORS.subtext} />
                  <Text style={styles.statText}>{order.duration || "—"}</Text>
                </View>
                <View style={styles.statItem}>
                  <Icon name="cash-outline" size={16} color={COLORS.subtext} />
                  <Text style={styles.statText}>₹{order.price}</Text>
                </View>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actionsRow}>
              <TouchableOpacity 
                style={styles.navBtn}
                onPress={openNavigation}
              >
                <Icon name="navigate" size={20} color={COLORS.primary} />
                <Text style={styles.navBtnText}>Navigate</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                onPress={handleArrived}
                disabled={loading}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryLight]}
                  style={styles.primaryGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.primaryText}>I've Arrived</Text>
                      <Icon name="checkmark-circle" size={20} color="#fff" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* STEP: OTP */}
        {step === "otp" && (
          <View style={styles.otpContainer}>
            <View style={styles.otpIcon}>
              <Icon name="lock-closed" size={40} color={COLORS.primary} />
            </View>
            
            <Text style={styles.otpTitle}>Enter OTP</Text>
            <Text style={styles.otpSubtitle}>
              Ask the client for the 4-digit OTP
            </Text>

            <View style={styles.otpInputRow}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={otpRefs[index]}
                  style={[
                    styles.otpInput,
                    digit && styles.otpInputFilled,
                    otpError && styles.otpInputError,
                  ]}
                  value={digit}
                  onChangeText={(value) => handleOTPChange(value, index)}
                  onKeyPress={(e) => handleOTPKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>

            {otpError ? <Text style={styles.otpErrorText}>{otpError}</Text> : null}

            <TouchableOpacity 
              style={[styles.verifyBtn, loading && { opacity: 0.7 }]}
              onPress={verifyOTP}
              disabled={loading}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryLight]}
                style={styles.verifyGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.verifyText}>Verify & Continue</Text>
                    <Icon name="arrow-forward" size={20} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP: Pre Photos */}
        {step === "pre_photos" && (
          <>
            <View style={styles.photoHeader}>
              <Icon name="camera" size={24} color={COLORS.primary} />
              <Text style={styles.photoTitle}>Pre-Wash Photos</Text>
            </View>
            <Text style={styles.photoSubtitle}>
              Take photos to document vehicle condition (min 2)
            </Text>

            <View style={styles.photosGrid}>
              {[0, 1, 2, 3].map((index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.photoCard}
                  onPress={() => takePhoto("pre")}
                >
                  {prePhotos[index] ? (
                    <Image source={{ uri: prePhotos[index] }} style={styles.photoImage} />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Icon name="camera-outline" size={28} color={COLORS.subtext} />
                      <Text style={styles.photoPlaceholderText}>Tap to add</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.photoProgress}>
              <Text style={styles.photoProgressText}>
                {prePhotos.length} of 4 photos captured
              </Text>
              <View style={styles.photoProgressBar}>
                <View 
                  style={[
                    styles.photoProgressFill, 
                    { width: `${(prePhotos.length / 4) * 100}%` }
                  ]} 
                />
              </View>
            </View>

            <TouchableOpacity 
              style={[
                styles.startWashBtn, 
                prePhotos.length < 2 && { opacity: 0.5 },
                loading && { opacity: 0.7 },
              ]}
              onPress={startWashing}
              disabled={prePhotos.length < 2 || loading}
            >
              <LinearGradient
                colors={prePhotos.length >= 2 
                  ? [COLORS.primary, COLORS.primaryLight] 
                  : ["#666", "#666"]}
                style={styles.startWashGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.startWashText}>Start Washing</Text>
                    <Icon name="water" size={20} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        {/* STEP: Washing */}
        {step === "washing" && (
          <View style={styles.washingContainer}>
            <Animated.View 
              style={[
                styles.washingCircle,
                { transform: [{ scale: pulseAnim }] }
              ]}
            >
              <Icon name="water" size={50} color={COLORS.primary} />
            </Animated.View>

            <Text style={styles.washingTimer}>{formatTime(washTime)}</Text>
            <Text style={styles.washingStatus}>Wash in Progress</Text>

            {/* Order Info */}
            <View style={styles.washingInfo}>
              <View style={styles.washingInfoRow}>
                <Text style={styles.washingLabel}>Package</Text>
                <Text style={styles.washingValue}>{order.package_name || "Car Wash"}</Text>
              </View>
              <View style={styles.washingInfoRow}>
                <Text style={styles.washingLabel}>Vehicle</Text>
                <Text style={styles.washingValue}>{order.vehicle || "—"}</Text>
              </View>
              <View style={styles.washingInfoRow}>
                <Text style={styles.washingLabel}>Client</Text>
                <Text style={styles.washingValue}>{order.client_name || "Client"}</Text>
              </View>
            </View>

            {/* Pause Button */}
            <TouchableOpacity 
              style={styles.pauseBtn}
              onPress={() => setIsPaused(!isPaused)}
            >
              <Icon 
                name={isPaused ? "play" : "pause"} 
                size={20} 
                color={COLORS.primary} 
              />
              <Text style={styles.pauseBtnText}>
                {isPaused ? "Resume" : "Pause Timer"}
              </Text>
            </TouchableOpacity>

            {/* Finish Button */}
            <TouchableOpacity 
              style={styles.finishBtn}
              onPress={finishWashing}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryLight]}
                style={styles.finishGradient}
              >
                <Text style={styles.finishText}>Finish Washing</Text>
                <Icon name="checkmark" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP: Post Photos */}
        {step === "post_photos" && (
          <>
            <View style={styles.photoHeader}>
              <Icon name="sparkles" size={24} color={COLORS.primary} />
              <Text style={styles.photoTitle}>Post-Wash Photos</Text>
            </View>
            <Text style={styles.photoSubtitle}>
              Capture the sparkling clean result! (min 2)
            </Text>

            <View style={styles.photosGrid}>
              {[0, 1, 2, 3].map((index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.photoCard}
                  onPress={() => takePhoto("post")}
                >
                  {postPhotos[index] ? (
                    <Image source={{ uri: postPhotos[index] }} style={styles.photoImage} />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Icon name="camera-outline" size={28} color={COLORS.subtext} />
                      <Text style={styles.photoPlaceholderText}>Tap to add</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Job Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Duration</Text>
                <Text style={styles.summaryValue}>{formatTime(washTime)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Earnings</Text>
                <Text style={[styles.summaryValue, { color: COLORS.primary }]}>
                  ₹{Math.round(order.price * 0.7)}
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              style={[
                styles.completeBtn, 
                postPhotos.length < 2 && { opacity: 0.5 },
                loading && { opacity: 0.7 },
              ]}
              onPress={completeJob}
              disabled={postPhotos.length < 2 || loading}
            >
              <LinearGradient
                colors={postPhotos.length >= 2 
                  ? [COLORS.primary, COLORS.primaryLight] 
                  : ["#666", "#666"]}
                style={styles.completeGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.completeText}>Complete Job</Text>
                    <Icon name="checkmark-done" size={20} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        {/* STEP: Complete */}
        {step === "complete" && (
          <View style={styles.completeContainer}>
            <View style={styles.successCircle}>
              <Icon name="checkmark" size={60} color="#fff" />
            </View>

            <Text style={styles.successTitle}>Great Job! 🎉</Text>
            <Text style={styles.successSubtitle}>Wash completed successfully</Text>

            <View style={styles.earningsCard}>
              <Text style={styles.earningsLabel}>You Earned</Text>
              <Text style={styles.earningsAmount}>₹{Math.round(order.price * 0.7)}</Text>
            </View>

            <View style={styles.statsCard}>
              <View style={styles.statBox}>
                <Icon name="time-outline" size={22} color={COLORS.primary} />
                <Text style={styles.statBoxValue}>{formatTime(washTime)}</Text>
                <Text style={styles.statBoxLabel}>Duration</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Icon name="water-outline" size={22} color={COLORS.primary} />
                <Text style={styles.statBoxValue}>{order.package_name?.split(" ")[0] || "Wash"}</Text>
                <Text style={styles.statBoxLabel}>Package</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.homeBtn} onPress={goHome}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryLight]}
                style={styles.homeGradient}
              >
                <Text style={styles.homeText}>Back to Dashboard</Text>
                <Icon name="home" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
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
  progressContainer: {
    alignItems: "center",
  },
  progressBg: {
    width: "100%",
    height: 6,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 3,
  },
  progressText: {
    color: "#fff",
    fontSize: 12,
    marginTop: 8,
    opacity: 0.9,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Map
  mapContainer: {
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },

  // Card
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  clientRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: `${COLORS.primary}20`,
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
  clientService: {
    fontSize: 13,
    color: COLORS.subtext,
    marginTop: 2,
  },
  callBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.bg,
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  addressText: {
    flex: 1,
    marginLeft: 10,
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statText: {
    marginLeft: 6,
    color: COLORS.text,
    fontWeight: "600",
  },

  // Actions
  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  navBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  navBtnText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primary,
  },
  primaryBtn: {
    flex: 1.5,
    borderRadius: 14,
    overflow: "hidden",
  },
  primaryGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  primaryText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    marginRight: 8,
  },

  // OTP
  otpContainer: {
    alignItems: "center",
    paddingTop: 20,
  },
  otpIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${COLORS.primary}20`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  otpTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 8,
  },
  otpSubtitle: {
    fontSize: 14,
    color: COLORS.subtext,
    marginBottom: 32,
  },
  otpInputRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  otpInput: {
    width: 56,
    height: 64,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    color: COLORS.text,
  },
  otpInputFilled: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}10`,
  },
  otpInputError: {
    borderColor: COLORS.error,
  },
  otpErrorText: {
    color: COLORS.error,
    fontSize: 14,
    marginBottom: 16,
  },
  verifyBtn: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 16,
  },
  verifyGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  verifyText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    marginRight: 8,
  },

  // Photos
  photoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  photoTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
    marginLeft: 10,
  },
  photoSubtitle: {
    fontSize: 14,
    color: COLORS.subtext,
    marginBottom: 20,
  },
  photosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  photoCard: {
    width: (width - 52) / 2,
    aspectRatio: 4 / 3,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  photoPlaceholderText: {
    color: COLORS.subtext,
    fontSize: 12,
    marginTop: 6,
  },
  photoProgress: {
    marginBottom: 20,
  },
  photoProgressText: {
    color: COLORS.subtext,
    fontSize: 13,
    textAlign: "center",
    marginBottom: 8,
  },
  photoProgressBar: {
    height: 6,
    backgroundColor: COLORS.card,
    borderRadius: 3,
    overflow: "hidden",
  },
  photoProgressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  startWashBtn: {
    borderRadius: 14,
    overflow: "hidden",
  },
  startWashGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  startWashText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    marginRight: 8,
  },

  // Washing
  washingContainer: {
    alignItems: "center",
    paddingTop: 20,
  },
  washingCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${COLORS.primary}20`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  washingTimer: {
    fontSize: 48,
    fontWeight: "900",
    color: COLORS.cyan,
    letterSpacing: 2,
  },
  washingStatus: {
    fontSize: 16,
    color: COLORS.subtext,
    marginBottom: 30,
  },
  washingInfo: {
    width: "100%",
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  washingInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  washingLabel: {
    color: COLORS.subtext,
    fontSize: 14,
  },
  washingValue: {
    color: COLORS.text,
    fontWeight: "600",
    fontSize: 14,
  },
  pauseBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginBottom: 16,
  },
  pauseBtnText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primary,
  },
  finishBtn: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
  },
  finishGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  finishText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    marginRight: 8,
  },

  // Summary
  summaryCard: {
    width: "100%",
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  summaryLabel: {
    color: COLORS.subtext,
    fontSize: 14,
  },
  summaryValue: {
    color: COLORS.text,
    fontWeight: "600",
    fontSize: 14,
  },
  completeBtn: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
  },
  completeGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  completeText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    marginRight: 8,
  },

  // Complete
  completeContainer: {
    alignItems: "center",
    paddingTop: 20,
  },
  successCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: COLORS.subtext,
    marginBottom: 30,
  },
  earningsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 50,
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  earningsLabel: {
    fontSize: 13,
    color: COLORS.subtext,
    marginBottom: 4,
  },
  earningsAmount: {
    fontSize: 40,
    fontWeight: "900",
    color: COLORS.primary,
  },
  statsCard: {
    flexDirection: "row",
    width: "100%",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },
  statBoxValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 8,
  },
  statBoxLabel: {
    fontSize: 12,
    color: COLORS.subtext,
    marginTop: 2,
  },
  homeBtn: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
  },
  homeGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  homeText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    marginRight: 8,
  },
});
