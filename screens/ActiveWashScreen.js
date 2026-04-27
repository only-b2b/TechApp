// screens/ActiveWashScreen.js - PREMIUM PROFESSIONAL DESIGN

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
  StatusBar,
  Vibration,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { API_BASE_URL } from "../config";
import { useAuth } from "../auth/AuthContext";

const { width, height } = Dimensions.get("window");

// ==================== PREMIUM DESIGN SYSTEM ====================
const COLORS = {
  // Primary Palette
  primary: "#0A0A0A",
  primaryLight: "#1A1A1A",
  primaryGradient: ["#1A1A1A", "#0A0A0A"],
  
  // Accent Colors
  accent: "#00D4AA",
  accentLight: "#00F5C4",
  accentDark: "#00B894",
  accentGradient: ["#00F5C4", "#00D4AA", "#00B894"],
  accentBg: "rgba(0, 212, 170, 0.08)",
  accentBgStrong: "rgba(0, 212, 170, 0.15)",
  
  // Status Colors
  success: "#10B981",
  successBg: "rgba(16, 185, 129, 0.1)",
  warning: "#F59E0B",
  warningBg: "rgba(245, 158, 11, 0.1)",
  error: "#EF4444",
  errorBg: "rgba(239, 68, 68, 0.1)",
  info: "#3B82F6",
  infoBg: "rgba(59, 130, 246, 0.1)",
  
  // Neutral Colors
  white: "#FFFFFF",
  background: "#FAFBFC",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  cardHover: "#F8FAFC",
  
  // Text Colors
  textDark: "#0A0A0A",
  textPrimary: "#1F2937",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  textLight: "#D1D5DB",
  
  // Border Colors
  border: "#E5E7EB",
  borderLight: "#F3F4F6",
  divider: "#F1F5F9",
  
  // Shadows
  shadowLight: "rgba(0, 0, 0, 0.04)",
  shadowMedium: "rgba(0, 0, 0, 0.08)",
  shadowDark: "rgba(0, 0, 0, 0.12)",
};

const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 40,
};

const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 100,
};

const SHADOWS = {
  small: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  medium: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  large: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
};

const COMMISSION_RATE = 15;
const TECHNICIAN_SHARE = 85;

const STEPS = {
  navigate: {
    key: "navigate",
    title: "En Route",
    subtitle: "Navigate to client",
    icon: "navigation-2",
    iconType: "feather",
    color: COLORS.info,
    gradient: ["#60A5FA", "#3B82F6"],
  },
  arrived: {
    key: "arrived",
    title: "Arrived",
    subtitle: "At location",
    icon: "map-pin",
    iconType: "feather",
    color: COLORS.accent,
    gradient: ["#00F5C4", "#00D4AA"],
  },
  otp: {
    key: "otp",
    title: "Verify OTP",
    subtitle: "Enter code",
    icon: "shield",
    iconType: "feather",
    color: COLORS.warning,
    gradient: ["#FCD34D", "#F59E0B"],
  },
  pre_photos: {
    key: "pre_photos",
    title: "Before Photos",
    subtitle: "Document condition",
    icon: "camera",
    iconType: "feather",
    color: COLORS.info,
    gradient: ["#60A5FA", "#3B82F6"],
  },
  washing: {
    key: "washing",
    title: "In Progress",
    subtitle: "Wash underway",
    icon: "droplet",
    iconType: "feather",
    color: COLORS.accent,
    gradient: ["#00F5C4", "#00D4AA"],
  },
  post_photos: {
    key: "post_photos",
    title: "After Photos",
    subtitle: "Capture results",
    icon: "check-circle",
    iconType: "feather",
    color: COLORS.success,
    gradient: ["#34D399", "#10B981"],
  },
  complete: {
    key: "complete",
    title: "Completed",
    subtitle: "Job finished",
    icon: "award",
    iconType: "feather",
    color: COLORS.success,
    gradient: ["#34D399", "#10B981"],
  },
};

export default function ActiveWashScreen({ route, navigation }) {
  // ==================== SAFE PARAMS ====================
  const orderId = route?.params?.orderId;
  
  let insets = { top: 0, bottom: 0, left: 0, right: 0 };
  try {
    insets = useSafeAreaInsets();
  } catch (e) {
    console.log("⚠️ SafeAreaInsets error:", e.message);
  }

  const { tech } = useAuth();

  // ==================== STATES ====================
  const [order, setOrder] = useState(null);
  const [step, setStep] = useState("navigate");
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);

  // OTP state
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const otpRefs = [useRef(), useRef(), useRef(), useRef()];

  // Photos state
  const [prePhotos, setPrePhotos] = useState([]);
  const [postPhotos, setPostPhotos] = useState([]);

  // Timer state
  const [washStartTime, setWashStartTime] = useState(null);
  const [washTime, setWashTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedDuration, setPausedDuration] = useState(0);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef([...Array(6)].map(() => new Animated.Value(0))).current;

  // ==================== INVALID ORDER CHECK ====================
  if (!orderId || orderId === "null" || orderId === "undefined") {
    useEffect(() => {
      Alert.alert("Error", "Invalid order ID", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    }, []);

    return (
      <View style={[styles.errorContainer, { paddingTop: insets.top + 50 }]}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <View style={styles.errorIconWrapper}>
          <Feather name="alert-circle" size={48} color={COLORS.error} />
        </View>
        <Text style={styles.errorTitle}>Invalid Order</Text>
        <Text style={styles.errorSubtitle}>Unable to load order details</Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => navigation.goBack()}>
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ==================== HELPERS ====================
  const safeParseFloat = (value, defaultValue = 0) => {
    if (value === null || value === undefined) return defaultValue;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  };

  const safeString = (value, defaultValue = "") => {
    if (value === null || value === undefined) return defaultValue;
    return String(value);
  };

  const calculateEarnings = (price) => {
    const numPrice = safeParseFloat(price, 0);
    return Math.round((numPrice * TECHNICIAN_SHARE) / 100 * 100) / 100;
  };

  const calculateCommission = (price) => {
    const numPrice = safeParseFloat(price, 0);
    return Math.round((numPrice * COMMISSION_RATE) / 100 * 100) / 100;
  };

  const formatTime = (seconds) => {
    const secs = parseInt(seconds) || 0;
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatCurrency = (value) => {
    const num = safeParseFloat(value, 0);
    return num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  };

  const formatCurrencyDecimal = (value) => {
    const num = safeParseFloat(value, 0);
    return num.toFixed(2);
  };

  // ==================== ANIMATIONS ====================
  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Staggered card animations
    cardAnims.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 500,
        delay: 200 + index * 100,
        useNativeDriver: true,
      }).start();
    });
  }, []);

  // Pulse animation for timer
  useEffect(() => {
    if (step === "washing" && !isPaused) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
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
      pulse.start();
      return () => pulse.stop();
    }
  }, [step, isPaused]);

  // Progress animation
  useEffect(() => {
    const stepKeys = Object.keys(STEPS);
    const currentIndex = stepKeys.indexOf(step);
    const progress = currentIndex / (stepKeys.length - 1);
    
    Animated.spring(progressAnim, {
      toValue: progress,
      tension: 50,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [step]);

  // ==================== FETCH ORDER ====================
  const fetchOrder = async () => {
    try {
      console.log("📥 Fetching wash order:", orderId);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      
      if (!data || !data.id) {
        throw new Error("Invalid order data");
      }

      console.log("✅ Wash order loaded:", data.id, "Status:", data.status);
      
      setOrder({
        id: data.id,
        status: safeString(data.status, "accepted"),
        price: safeParseFloat(data.price, 0),
        pickup_address: safeString(data.pickup_address, "Location"),
        pickup_lat: safeParseFloat(data.pickup_lat, null),
        pickup_lng: safeParseFloat(data.pickup_lng, null),
        client_name: safeString(data.client_name, "Client"),
        client_phone: safeString(data.client_phone, ""),
        package_name: safeString(data.package_name, "Car Wash"),
        vehicle: safeString(data.vehicle, "Vehicle"),
        wash_started_at: data.wash_started_at,
        wash_end_time: data.wash_end_time,
        paused_duration: safeParseFloat(data.paused_duration, 0),
        pre_photos: data.pre_photos,
        post_photos: data.post_photos,
        technician_earnings: safeParseFloat(data.technician_earnings, 0),
        platform_commission: safeParseFloat(data.platform_commission, 0),
        otp: data.otp,
      });

      // Parse photos safely
      let prePhotosArr = [];
      let postPhotosArr = [];

      try {
        if (data.pre_photos) {
          prePhotosArr = typeof data.pre_photos === "string" 
            ? JSON.parse(data.pre_photos) 
            : Array.isArray(data.pre_photos) ? data.pre_photos : [];
        }
      } catch (e) {}

      try {
        if (data.post_photos) {
          postPhotosArr = typeof data.post_photos === "string"
            ? JSON.parse(data.post_photos)
            : Array.isArray(data.post_photos) ? data.post_photos : [];
        }
      } catch (e) {}

      if (prePhotosArr.length > 0) setPrePhotos(prePhotosArr);
      if (postPhotosArr.length > 0) setPostPhotos(postPhotosArr);

      // Sync timer
      if (data.wash_started_at) {
        const startTime = new Date(data.wash_started_at).getTime();
        if (!isNaN(startTime)) {
          setWashStartTime(startTime);
          const pauseDuration = safeParseFloat(data.paused_duration, 0);
          setPausedDuration(pauseDuration);
          
          if (!data.wash_end_time) {
            const elapsed = Math.floor((Date.now() - startTime) / 1000) - pauseDuration;
            setWashTime(Math.max(0, elapsed));
          } else {
            const endTime = new Date(data.wash_end_time).getTime();
            const elapsed = Math.floor((endTime - startTime) / 1000) - pauseDuration;
            setWashTime(Math.max(0, elapsed));
          }
        }
      }

      // Auto-detect step
      const status = safeString(data.status, "accepted");
      if (status === "accepted") {
        setStep("navigate");
      } else if (status === "arrived") {
        setStep("otp");
      } else if (status === "in_progress") {
        if (postPhotosArr.length >= 2 || data.wash_end_time) {
          setStep("post_photos");
        } else if (data.wash_started_at) {
          setStep("washing");
        } else {
          setStep("pre_photos");
        }
      } else if (status === "completed") {
        setStep("complete");
      }

      setFetchError(null);
      return true;
    } catch (err) {
      console.log("❌ Fetch error:", err.message);
      setFetchError(err.message);
      return false;
    }
  };

  // Initial fetch
  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;

    const loadOrder = async () => {
      while (isMounted && retryCount < 3) {
        const success = await fetchOrder();
        if (success) return;
        retryCount++;
        await new Promise(r => setTimeout(r, 2000));
      }

      if (isMounted && retryCount >= 3) {
        Alert.alert("Error", "Unable to load order", [
          { text: "Go Back", onPress: () => navigation.goBack() },
          { text: "Retry", onPress: () => { retryCount = 0; loadOrder(); } },
        ]);
      }
    };

    loadOrder();
    return () => { isMounted = false; };
  }, [orderId]);

  // ==================== LOCATION ====================
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const location = await Location.getCurrentPositionAsync({});
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch (e) {
        console.log("⚠️ Location error:", e.message);
      }
    })();
  }, []);

  // ==================== WASH TIMER ====================
  useEffect(() => {
    if (step !== "washing" || isPaused || !washStartTime) return;
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - washStartTime) / 1000) - pausedDuration;
      setWashTime(Math.max(0, elapsed));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, isPaused, washStartTime, pausedDuration]);

  // ==================== ACTIONS ====================
  const openNavigation = () => {
    if (!order?.pickup_lat || !order?.pickup_lng) {
      Alert.alert("Error", "Location not available");
      return;
    }
    Vibration.vibrate(50);
    const destination = `${order.pickup_lat},${order.pickup_lng}`;
    const url = Platform.OS === "ios"
      ? `maps://app?daddr=${destination}`
      : `google.navigation:q=${destination}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destination}`);
    });
  };

  const handleArrived = async () => {
    setLoading(true);
    Vibration.vibrate(50);
    try {
      await fetch(`${API_BASE_URL}/orders/${orderId}/arrived`, { method: "POST" });
      setStep("otp");
      fetchOrder();
    } catch (err) {
      Alert.alert("Error", "Failed to update status");
    }
    setLoading(false);
  };

  const handleOTPChange = (value, index) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setOtpError("");
    
    if (value && index < 3) {
      otpRefs[index + 1].current?.focus();
    }
    
    // Auto-submit when complete
    if (value && index === 3) {
      const fullOtp = [...newOtp.slice(0, 3), value].join("");
      if (fullOtp.length === 4) {
        Vibration.vibrate(50);
      }
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
      Vibration.vibrate([0, 50, 50, 50]);
      return;
    }

    setLoading(true);
    Vibration.vibrate(50);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: otpString }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error || "Invalid OTP");
        Vibration.vibrate([0, 50, 50, 50]);
        setLoading(false);
        return;
      }
      setStep("pre_photos");
    } catch (err) {
      setOtpError("Verification failed");
      Vibration.vibrate([0, 50, 50, 50]);
    }
    setLoading(false);
  };

  const takePhoto = async (type) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Camera access is required");
        return;
      }

      Vibration.vibrate(50);
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const uri = result.assets[0].uri;
        if (type === "pre") {
          setPrePhotos(prev => [...prev, uri]);
        } else {
          setPostPhotos(prev => [...prev, uri]);
        }
      }
    } catch (e) {
      Alert.alert("Error", "Failed to open camera");
    }
  };

  const removePhoto = (type, index) => {
    Vibration.vibrate(50);
    if (type === "pre") {
      setPrePhotos(prev => prev.filter((_, i) => i !== index));
    } else {
      setPostPhotos(prev => prev.filter((_, i) => i !== index));
    }
  };

  const startWashing = async () => {
    if (prePhotos.length < 2) {
      Alert.alert("Photos Required", "Please take at least 2 pre-wash photos");
      return;
    }

    setLoading(true);
    Vibration.vibrate(50);
    try {
      const uploadedUrls = await uploadPhotos(prePhotos);

      await fetch(`${API_BASE_URL}/orders/${orderId}/pre-photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: uploadedUrls }),
      });

      const res = await fetch(`${API_BASE_URL}/orders/${orderId}/start-wash`, { method: "POST" });
      const data = await res.json();

      setWashStartTime(data.wash_started_at ? new Date(data.wash_started_at).getTime() : Date.now());
      setWashTime(0);
      setPausedDuration(0);
      setStep("washing");
    } catch (err) {
      Alert.alert("Error", "Failed to start wash");
    }
    setLoading(false);
  };

  const togglePause = async () => {
    Vibration.vibrate(50);
    try {
      if (isPaused) {
        const res = await fetch(`${API_BASE_URL}/orders/${orderId}/resume-wash`, { method: "POST" });
        const data = await res.json();
        if (data.paused_duration !== undefined) {
          setPausedDuration(data.paused_duration);
        }
      } else {
        await fetch(`${API_BASE_URL}/orders/${orderId}/pause-wash`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ current_duration: washTime }),
        });
      }
    } catch (err) {}
    setIsPaused(!isPaused);
  };

  const finishWashing = async () => {
    setLoading(true);
    Vibration.vibrate(50);
    try {
      await fetch(`${API_BASE_URL}/orders/${orderId}/end-wash`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration: washTime }),
      });
    } catch (err) {}
    setStep("post_photos");
    setLoading(false);
  };

  const completeJob = async () => {
    if (postPhotos.length < 2) {
      Alert.alert("Photos Required", "Please take at least 2 post-wash photos");
      return;
    }

    setLoading(true);
    Vibration.vibrate(50);
    try {
      const uploadedUrls = await uploadPhotos(postPhotos);

      await fetch(`${API_BASE_URL}/orders/${orderId}/post-photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: uploadedUrls }),
      });

      const res = await fetch(`${API_BASE_URL}/orders/${orderId}/complete-wash`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration: washTime, technician_id: tech?.id }),
      });

      const data = await res.json();
      if (data.order) setOrder(data.order);
      setStep("complete");
      Vibration.vibrate([0, 100, 50, 100]);
    } catch (err) {
      Alert.alert("Error", "Failed to complete job");
    }
    setLoading(false);
  };

  const uploadPhotos = async (localUris) => {
    const form = new FormData();
    localUris.forEach((uri, index) => {
      form.append("photos", {
        uri,
        name: `photo-${Date.now()}-${index}.jpg`,
        type: "image/jpeg",
      });
    });

    const res = await fetch(`${API_BASE_URL}/orders/${orderId}/upload-photos`, {
      method: "POST",
      body: form,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data.urls || [];
  };

  const goHome = () => {
    Vibration.vibrate(50);
    navigation.reset({
      index: 0,
      routes: [{ name: "AppTabs" }],
    });
  };

  const callClient = () => {
    if (order?.client_phone) {
      Vibration.vibrate(50);
      Linking.openURL(`tel:${order.client_phone}`);
    }
  };

  // ==================== RENDER ICON ====================
  const renderIcon = (iconName, iconType, size, color) => {
    if (iconType === "feather") {
      return <Feather name={iconName} size={size} color={color} />;
    }
    return <Ionicons name={iconName} size={size} color={color} />;
  };

  // ==================== LOADING STATE ====================
  if (!order) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <View style={styles.loadingContent}>
          <View style={styles.loadingIconWrapper}>
            <ActivityIndicator size="large" color={COLORS.accent} />
          </View>
          <Text style={styles.loadingTitle}>Loading Order</Text>
          <Text style={styles.loadingSubtitle}>Please wait...</Text>
          {fetchError && (
            <View style={styles.loadingError}>
              <Feather name="alert-circle" size={16} color={COLORS.error} />
              <Text style={styles.loadingErrorText}>{fetchError}</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  // ==================== SAFE VALUES ====================
  const technicianEarnings = order.technician_earnings > 0
    ? order.technician_earnings
    : calculateEarnings(order.price);

  const platformCommission = order.platform_commission > 0
    ? order.platform_commission
    : calculateCommission(order.price);

  const currentStep = STEPS[step] || STEPS.navigate;
  const stepKeys = Object.keys(STEPS);
  const currentStepIndex = stepKeys.indexOf(step);
  const hasValidLocation = order.pickup_lat !== null && order.pickup_lng !== null;

  // ==================== ANIMATED CARD STYLE ====================
  const getCardStyle = (index) => ({
    opacity: cardAnims[index] || 1,
    transform: [{
      translateY: (cardAnims[index] || new Animated.Value(1)).interpolate({
        inputRange: [0, 1],
        outputRange: [30, 0],
      }),
    }],
  });

  // ==================== RENDER ====================
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      
      {/* ==================== HEADER ==================== */}
      <Animated.View 
        style={[
          styles.header, 
          { paddingTop: insets.top + 12 },
          { opacity: fadeAnim }
        ]}
      >
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="chevron-left" size={24} color={COLORS.textDark} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <LinearGradient
            colors={currentStep.gradient}
            style={styles.stepIconBadge}
          >
            {renderIcon(currentStep.icon, currentStep.iconType, 16, COLORS.white)}
          </LinearGradient>
          <View style={styles.headerTitles}>
            <Text style={styles.headerTitle}>{currentStep.title}</Text>
            <Text style={styles.headerSubtitle}>{currentStep.subtitle}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => Alert.alert("Support", "Call 1800-XXX-XXXX for help")}
          activeOpacity={0.7}
        >
          <Feather name="headphones" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </Animated.View>

      {/* ==================== PROGRESS BAR ==================== */}
      <View style={styles.progressWrapper}>
        <View style={styles.progressTrack}>
          <Animated.View 
            style={[
              styles.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]} 
          />
        </View>
        <View style={styles.progressSteps}>
          {stepKeys.map((key, index) => {
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const stepData = STEPS[key];
            
            return (
              <View key={key} style={styles.progressStepWrapper}>
                <View
                  style={[
                    styles.progressDot,
                    isCompleted && styles.progressDotCompleted,
                    isCurrent && styles.progressDotCurrent,
                  ]}
                >
                  {isCompleted ? (
                    <Feather name="check" size={10} color={COLORS.white} />
                  ) : isCurrent ? (
                    <View style={styles.progressDotInner} />
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* ==================== CONTENT ==================== */}
      <Animated.ScrollView
        style={[
          styles.scrollView,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim },
            ],
          },
        ]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ========== NAVIGATE STEP ========== */}
        {step === "navigate" && (
          <>
            {/* Location Card */}
            <Animated.View style={[styles.card, styles.locationCard, getCardStyle(0)]}>
              <LinearGradient
                colors={[COLORS.accent + "15", COLORS.accent + "05"]}
                style={styles.locationGradient}
              >
                <View style={styles.locationIconWrapper}>
                  <LinearGradient colors={STEPS.navigate.gradient} style={styles.locationIconBg}>
                    <Feather name="map-pin" size={28} color={COLORS.white} />
                  </LinearGradient>
                </View>
                
                <Text style={styles.locationLabel}>SERVICE LOCATION</Text>
                <Text style={styles.locationAddress}>{order.pickup_address}</Text>
                
                {hasValidLocation && (
                  <TouchableOpacity 
                    style={styles.navigateButton} 
                    onPress={openNavigation}
                    activeOpacity={0.8}
                  >
                    <LinearGradient 
                      colors={COLORS.accentGradient} 
                      style={styles.navigateButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Feather name="navigation" size={18} color={COLORS.white} />
                      <Text style={styles.navigateButtonText}>Open in Maps</Text>
                      <Feather name="external-link" size={14} color="rgba(255,255,255,0.7)" />
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </LinearGradient>
            </Animated.View>

            {/* Client Card */}
            <Animated.View style={[styles.card, getCardStyle(1)]}>
              <View style={styles.clientCardContent}>
                <View style={styles.clientAvatar}>
                  <LinearGradient colors={COLORS.primaryGradient} style={styles.clientAvatarGradient}>
                    <Text style={styles.clientAvatarText}>
                      {(order.client_name || "C").charAt(0).toUpperCase()}
                    </Text>
                  </LinearGradient>
                </View>
                
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>{order.client_name}</Text>
                  <View style={styles.clientServiceBadge}>
                    <Feather name="droplet" size={12} color={COLORS.accent} />
                    <Text style={styles.clientServiceText}>{order.package_name}</Text>
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={styles.callButton} 
                  onPress={callClient}
                  activeOpacity={0.7}
                >
                  <LinearGradient colors={["#34D399", "#10B981"]} style={styles.callButtonGradient}>
                    <Feather name="phone" size={18} color={COLORS.white} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Earnings Card */}
            <Animated.View style={[styles.card, styles.earningsCard, getCardStyle(2)]}>
              <View style={styles.earningsHeader}>
                <View style={styles.earningsIconWrapper}>
                  <Feather name="dollar-sign" size={18} color={COLORS.accent} />
                </View>
                <Text style={styles.earningsLabel}>Your Earnings</Text>
                <View style={styles.earningsBadge}>
                  <Text style={styles.earningsBadgeText}>{TECHNICIAN_SHARE}%</Text>
                </View>
              </View>
              
              <Text style={styles.earningsAmount}>₹{formatCurrency(technicianEarnings)}</Text>
              
              <View style={styles.earningsBreakdown}>
                <View style={styles.earningsBreakdownItem}>
                  <Text style={styles.earningsBreakdownLabel}>Total Fare</Text>
                  <Text style={styles.earningsBreakdownValue}>₹{formatCurrency(order.price)}</Text>
                </View>
                <View style={styles.earningsBreakdownDivider} />
                <View style={styles.earningsBreakdownItem}>
                  <Text style={styles.earningsBreakdownLabel}>Platform Fee</Text>
                  <Text style={[styles.earningsBreakdownValue, { color: COLORS.textMuted }]}>
                    -₹{formatCurrency(platformCommission)}
                  </Text>
                </View>
              </View>
            </Animated.View>

            {/* Order Details */}
            <Animated.View style={[styles.card, getCardStyle(3)]}>
              <Text style={styles.sectionTitle}>Order Details</Text>
              
              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: COLORS.infoBg }]}>
                  <Feather name="truck" size={16} color={COLORS.info} />
                </View>
                <View style={styles.detailInfo}>
                  <Text style={styles.detailLabel}>Vehicle Type</Text>
                  <Text style={styles.detailValue}>{order.vehicle}</Text>
                </View>
              </View>
              
              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: COLORS.accentBg }]}>
                  <Feather name="package" size={16} color={COLORS.accent} />
                </View>
                <View style={styles.detailInfo}>
                  <Text style={styles.detailLabel}>Package</Text>
                  <Text style={styles.detailValue}>{order.package_name}</Text>
                </View>
              </View>
              
              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: COLORS.warningBg }]}>
                  <Feather name="hash" size={16} color={COLORS.warning} />
                </View>
                <View style={styles.detailInfo}>
                  <Text style={styles.detailLabel}>Order ID</Text>
                  <Text style={styles.detailValue}>#{order.id}</Text>
                </View>
              </View>
            </Animated.View>

            {/* Arrived Button */}
            <Animated.View style={[getCardStyle(4), { marginTop: SPACING.lg }]}>
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleArrived}
                disabled={loading}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={loading ? ["#9CA3AF", "#6B7280"] : COLORS.primaryGradient}
                  style={styles.primaryButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} size="small" />
                  ) : (
                    <>
                      <Text style={styles.primaryButtonText}>I've Arrived</Text>
                      <View style={styles.primaryButtonIcon}>
                        <Feather name="check-circle" size={20} color={COLORS.primary} />
                      </View>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </>
        )}

        {/* ========== OTP STEP ========== */}
        {step === "otp" && (
          <View style={styles.otpContainer}>
            <Animated.View style={[styles.otpHeader, getCardStyle(0)]}>
              <View style={styles.otpIconWrapper}>
                <LinearGradient colors={STEPS.otp.gradient} style={styles.otpIconBg}>
                  <Feather name="shield" size={32} color={COLORS.white} />
                </LinearGradient>
                <View style={styles.otpIconRing} />
              </View>
              
              <Text style={styles.otpTitle}>Verification Required</Text>
              <Text style={styles.otpSubtitle}>
                Enter the 4-digit OTP shared by {order.client_name}
              </Text>
            </Animated.View>

            <Animated.View style={[styles.otpInputWrapper, getCardStyle(1)]}>
              <View style={styles.otpInputContainer}>
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
                    autoFocus={index === 0}
                  />
                ))}
              </View>

              {otpError && (
                <View style={styles.otpErrorContainer}>
                  <Feather name="alert-circle" size={14} color={COLORS.error} />
                  <Text style={styles.otpErrorText}>{otpError}</Text>
                </View>
              )}
            </Animated.View>

            <Animated.View style={[getCardStyle(2), { width: "100%" }]}>
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={verifyOTP}
                disabled={loading}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={loading ? ["#9CA3AF", "#6B7280"] : COLORS.primaryGradient}
                  style={styles.primaryButtonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} size="small" />
                  ) : (
                    <>
                      <Text style={styles.primaryButtonText}>Verify & Continue</Text>
                      <View style={styles.primaryButtonIcon}>
                        <Feather name="arrow-right" size={20} color={COLORS.primary} />
                      </View>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={[styles.otpHint, getCardStyle(3)]}>
              <Feather name="info" size={14} color={COLORS.textMuted} />
              <Text style={styles.otpHintText}>
                Ask the client for OTP displayed in their app
              </Text>
            </Animated.View>
          </View>
        )}

        {/* ========== PRE PHOTOS STEP ========== */}
        {step === "pre_photos" && (
          <>
            <Animated.View style={[styles.photoHeader, getCardStyle(0)]}>
              <LinearGradient colors={STEPS.pre_photos.gradient} style={styles.photoHeaderIcon}>
                <Feather name="camera" size={24} color={COLORS.white} />
              </LinearGradient>
              <View style={styles.photoHeaderText}>
                <Text style={styles.photoTitle}>Before Wash Photos</Text>
                <Text style={styles.photoSubtitle}>Document the vehicle's initial condition</Text>
              </View>
            </Animated.View>

            <Animated.View style={[styles.photoGridWrapper, getCardStyle(1)]}>
              <View style={styles.photoGrid}>
                {[0, 1, 2, 3].map((index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.photoCard,
                      prePhotos[index] && styles.photoCardFilled,
                    ]}
                    onPress={() => !prePhotos[index] && takePhoto("pre")}
                    activeOpacity={0.8}
                  >
                    {prePhotos[index] ? (
                      <>
                        <Image source={{ uri: prePhotos[index] }} style={styles.photoImage} />
                        <TouchableOpacity
                          style={styles.photoRemoveButton}
                          onPress={() => removePhoto("pre", index)}
                        >
                          <Feather name="x" size={12} color={COLORS.white} />
                        </TouchableOpacity>
                        <View style={styles.photoIndexBadge}>
                          <Text style={styles.photoIndexText}>{index + 1}</Text>
                        </View>
                      </>
                    ) : (
                      <View style={styles.photoPlaceholder}>
                        <View style={styles.photoAddIcon}>
                          <Feather name="plus" size={24} color={COLORS.accent} />
                        </View>
                        <Text style={styles.photoAddText}>Add Photo</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>

            <Animated.View style={[styles.photoStatus, getCardStyle(2)]}>
              <View style={styles.photoStatusLeft}>
                <Text style={styles.photoStatusCount}>{prePhotos.length}/4</Text>
                <Text style={styles.photoStatusLabel}>photos added</Text>
              </View>
              <View style={[
                styles.photoStatusBadge,
                prePhotos.length >= 2 ? styles.photoStatusBadgeSuccess : styles.photoStatusBadgeWarning
              ]}>
                <Feather 
                  name={prePhotos.length >= 2 ? "check" : "alert-circle"} 
                  size={12} 
                  color={prePhotos.length >= 2 ? COLORS.success : COLORS.warning} 
                />
                <Text style={[
                  styles.photoStatusBadgeText,
                  { color: prePhotos.length >= 2 ? COLORS.success : COLORS.warning }
                ]}>
                  {prePhotos.length >= 2 ? "Ready" : "Min 2 required"}
                </Text>
              </View>
            </Animated.View>

            <Animated.View style={[getCardStyle(3), { marginTop: SPACING.lg }]}>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (prePhotos.length < 2 || loading) && styles.buttonDisabled,
                ]}
                onPress={startWashing}
                disabled={prePhotos.length < 2 || loading}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={prePhotos.length < 2 || loading ? ["#9CA3AF", "#6B7280"] : COLORS.accentGradient}
                  style={styles.primaryButtonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} size="small" />
                  ) : (
                    <>
                      <Feather name="droplet" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
                      <Text style={[styles.primaryButtonText, { color: COLORS.white }]}>
                        Start Washing
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </>
        )}

        {/* ========== WASHING STEP ========== */}
        {step === "washing" && (
          <View style={styles.washingContainer}>
            <Animated.View style={[styles.timerWrapper, { transform: [{ scale: pulseAnim }] }]}>
              <LinearGradient
                colors={isPaused ? ["#FEF3C7", "#FDE68A"] : COLORS.accentGradient}
                style={styles.timerOuter}
              >
                <View style={[styles.timerInner, isPaused && styles.timerInnerPaused]}>
                  <Feather
                    name={isPaused ? "pause" : "droplet"}
                    size={32}
                    color={isPaused ? COLORS.warning : COLORS.accent}
                  />
                </View>
              </LinearGradient>
            </Animated.View>

            <Text style={styles.timerText}>{formatTime(washTime)}</Text>
            <View style={[
              styles.timerStatusBadge,
              isPaused && styles.timerStatusBadgePaused
            ]}>
              <View style={[
                styles.timerStatusDot,
                { backgroundColor: isPaused ? COLORS.warning : COLORS.accent }
              ]} />
              <Text style={[
                styles.timerStatusText,
                isPaused && { color: COLORS.warning }
              ]}>
                {isPaused ? "Timer Paused" : "Wash in Progress"}
              </Text>
            </View>

            <View style={styles.washInfoCard}>
              <View style={styles.washInfoRow}>
                <View style={styles.washInfoItem}>
                  <Feather name="package" size={16} color={COLORS.textMuted} />
                  <Text style={styles.washInfoLabel}>Package</Text>
                  <Text style={styles.washInfoValue}>{order.package_name}</Text>
                </View>
                <View style={styles.washInfoDivider} />
                <View style={styles.washInfoItem}>
                  <Feather name="truck" size={16} color={COLORS.textMuted} />
                  <Text style={styles.washInfoLabel}>Vehicle</Text>
                  <Text style={styles.washInfoValue}>{order.vehicle}</Text>
                </View>
                <View style={styles.washInfoDivider} />
                <View style={styles.washInfoItem}>
                  <Feather name="dollar-sign" size={16} color={COLORS.accent} />
                  <Text style={styles.washInfoLabel}>Earnings</Text>
                  <Text style={[styles.washInfoValue, { color: COLORS.accent }]}>
                    ₹{formatCurrency(technicianEarnings)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.washActions}>
              <TouchableOpacity
                style={[styles.secondaryButton, isPaused && styles.secondaryButtonActive]}
                onPress={togglePause}
                activeOpacity={0.8}
              >
                <Feather
                  name={isPaused ? "play" : "pause"}
                  size={18}
                  color={isPaused ? COLORS.warning : COLORS.textSecondary}
                />
                <Text style={[
                  styles.secondaryButtonText,
                  isPaused && { color: COLORS.warning }
                ]}>
                  {isPaused ? "Resume" : "Pause"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryButton, { flex: 1.5 }, loading && styles.buttonDisabled]}
                onPress={finishWashing}
                disabled={loading}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={loading ? ["#9CA3AF", "#6B7280"] : COLORS.primaryGradient}
                  style={styles.primaryButtonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} size="small" />
                  ) : (
                    <>
                      <Text style={styles.primaryButtonText}>Finish Washing</Text>
                      <View style={styles.primaryButtonIcon}>
                        <Feather name="check" size={18} color={COLORS.primary} />
                      </View>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ========== POST PHOTOS STEP ========== */}
        {step === "post_photos" && (
          <>
            <Animated.View style={[styles.photoHeader, getCardStyle(0)]}>
              <LinearGradient colors={STEPS.post_photos.gradient} style={styles.photoHeaderIcon}>
                <Feather name="check-circle" size={24} color={COLORS.white} />
              </LinearGradient>
              <View style={styles.photoHeaderText}>
                <Text style={styles.photoTitle}>After Wash Photos</Text>
                <Text style={styles.photoSubtitle}>Showcase your excellent work</Text>
              </View>
            </Animated.View>

            <Animated.View style={[styles.photoGridWrapper, getCardStyle(1)]}>
              <View style={styles.photoGrid}>
                {[0, 1, 2, 3].map((index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.photoCard,
                      postPhotos[index] && styles.photoCardFilled,
                    ]}
                    onPress={() => !postPhotos[index] && takePhoto("post")}
                    activeOpacity={0.8}
                  >
                    {postPhotos[index] ? (
                      <>
                        <Image source={{ uri: postPhotos[index] }} style={styles.photoImage} />
                        <TouchableOpacity
                          style={styles.photoRemoveButton}
                          onPress={() => removePhoto("post", index)}
                        >
                          <Feather name="x" size={12} color={COLORS.white} />
                        </TouchableOpacity>
                        <View style={styles.photoIndexBadge}>
                          <Text style={styles.photoIndexText}>{index + 1}</Text>
                        </View>
                      </>
                    ) : (
                      <View style={styles.photoPlaceholder}>
                        <View style={styles.photoAddIcon}>
                          <Feather name="plus" size={24} color={COLORS.success} />
                        </View>
                        <Text style={styles.photoAddText}>Add Photo</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>

            {/* Job Summary */}
            <Animated.View style={[styles.card, styles.summaryCard, getCardStyle(2)]}>
              <View style={styles.summaryHeader}>
                <Feather name="file-text" size={18} color={COLORS.textDark} />
                <Text style={styles.summaryTitle}>Job Summary</Text>
              </View>
              
              <View style={styles.summaryContent}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Duration</Text>
                  <View style={styles.summaryValueWrapper}>
                    <Feather name="clock" size={14} color={COLORS.textMuted} />
                    <Text style={styles.summaryValue}>{formatTime(washTime)}</Text>
                  </View>
                </View>
                
                <View style={styles.summaryDivider} />
                
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Fare</Text>
                  <Text style={styles.summaryValue}>₹{formatCurrencyDecimal(order.price)}</Text>
                </View>
                
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Platform Fee ({COMMISSION_RATE}%)</Text>
                  <Text style={[styles.summaryValue, { color: COLORS.error }]}>
                    -₹{formatCurrencyDecimal(platformCommission)}
                  </Text>
                </View>
                
                <View style={styles.summaryDividerThick} />
                
                <View style={styles.summaryRowFinal}>
                  <Text style={styles.summaryLabelFinal}>Your Earnings</Text>
                  <Text style={styles.summaryValueFinal}>₹{formatCurrencyDecimal(technicianEarnings)}</Text>
                </View>
              </View>
            </Animated.View>

            <Animated.View style={[getCardStyle(3), { marginTop: SPACING.lg }]}>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (postPhotos.length < 2 || loading) && styles.buttonDisabled,
                ]}
                onPress={completeJob}
                disabled={postPhotos.length < 2 || loading}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={postPhotos.length < 2 || loading ? ["#9CA3AF", "#6B7280"] : ["#34D399", "#10B981"]}
                  style={styles.primaryButtonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} size="small" />
                  ) : (
                    <>
                      <Feather name="check-circle" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
                      <Text style={[styles.primaryButtonText, { color: COLORS.white }]}>
                        Complete Job
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </>
        )}

        {/* ========== COMPLETE STEP ========== */}
        {step === "complete" && (
          <View style={styles.completeContainer}>
            <View style={styles.successAnimation}>
              <LinearGradient colors={["#D1FAE5", "#A7F3D0"]} style={styles.successOuter}>
                <LinearGradient colors={["#34D399", "#10B981"]} style={styles.successInner}>
                  <Feather name="check" size={40} color={COLORS.white} />
                </LinearGradient>
              </LinearGradient>
              <View style={styles.successRipple} />
            </View>

            <Text style={styles.successTitle}>Excellent Work! 🎉</Text>
            <Text style={styles.successSubtitle}>Job completed successfully</Text>

            <View style={styles.earningsCardLarge}>
              <LinearGradient
                colors={COLORS.primaryGradient}
                style={styles.earningsCardLargeGradient}
              >
                <View style={styles.earningsCardLargeHeader}>
                  <Feather name="trending-up" size={20} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.earningsCardLargeLabel}>YOU'VE EARNED</Text>
                </View>
                <Text style={styles.earningsCardLargeAmount}>
                  ₹{formatCurrencyDecimal(technicianEarnings)}
                </Text>
                <View style={styles.earningsCardLargeFooter}>
                  <Text style={styles.earningsCardLargeFooterText}>
                    {TECHNICIAN_SHARE}% of ₹{formatCurrency(order.price)} fare
                  </Text>
                </View>
              </LinearGradient>
            </View>

            <View style={styles.completeStats}>
              <View style={styles.completeStatItem}>
                <Feather name="clock" size={18} color={COLORS.textMuted} />
                <Text style={styles.completeStatValue}>{formatTime(washTime)}</Text>
                <Text style={styles.completeStatLabel}>Duration</Text>
              </View>
              <View style={styles.completeStatDivider} />
              <View style={styles.completeStatItem}>
                <Feather name="camera" size={18} color={COLORS.textMuted} />
                <Text style={styles.completeStatValue}>{prePhotos.length + postPhotos.length}</Text>
                <Text style={styles.completeStatLabel}>Photos</Text>
              </View>
              <View style={styles.completeStatDivider} />
              <View style={styles.completeStatItem}>
                <Feather name="star" size={18} color={COLORS.warning} />
                <Text style={styles.completeStatValue}>5.0</Text>
                <Text style={styles.completeStatLabel}>Rating</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={goHome}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={COLORS.primaryGradient}
                style={styles.primaryButtonGradient}
              >
                <Text style={styles.primaryButtonText}>Back to Dashboard</Text>
                <View style={styles.primaryButtonIcon}>
                  <Feather name="home" size={18} color={COLORS.primary} />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </View>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ==================== LOADING & ERROR ====================
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContent: {
    alignItems: "center",
  },
  loadingIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.accentBg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textDark,
    marginBottom: SPACING.xs,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  loadingError: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.errorBg,
    borderRadius: RADIUS.md,
  },
  loadingErrorText: {
    marginLeft: SPACING.sm,
    color: COLORS.error,
    fontSize: 13,
  },

  errorContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xxxxl,
  },
  errorIconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.errorBg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.textDark,
    marginBottom: SPACING.sm,
  },
  errorSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xxl,
    textAlign: "center",
  },
  errorButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxxl,
    borderRadius: RADIUS.lg,
  },
  errorButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "600",
  },

  // ==================== HEADER ====================
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.white,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.borderLight,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: SPACING.md,
  },
  stepIconBadge: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  headerTitles: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // ==================== PROGRESS ====================
  progressWrapper: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  progressTrack: {
    height: 4,
    backgroundColor: COLORS.borderLight,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: SPACING.md,
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },
  progressSteps: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressStepWrapper: {
    alignItems: "center",
  },
  progressDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.borderLight,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  progressDotCompleted: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  progressDotCurrent: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.white,
  },
  progressDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
  },

  // ==================== SCROLL ====================
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },

  // ==================== CARDS ====================
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },

  // ==================== LOCATION CARD ====================
  locationCard: {
    overflow: "hidden",
  },
  locationGradient: {
    padding: SPACING.xl,
    alignItems: "center",
  },
  locationIconWrapper: {
    marginBottom: SPACING.lg,
  },
  locationIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  locationLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    marginBottom: SPACING.sm,
  },
  locationAddress: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textDark,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: SPACING.lg,
  },
  navigateButton: {
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    marginTop: SPACING.sm,
  },
  navigateButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  navigateButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "600",
  },

  // ==================== CLIENT CARD ====================
  clientCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.lg,
  },
  clientAvatar: {
    marginRight: SPACING.md,
  },
  clientAvatarGradient: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  clientAvatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.white,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textDark,
    marginBottom: SPACING.xs,
  },
  clientServiceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.accentBg,
    alignSelf: "flex-start",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    gap: SPACING.xs,
  },
  clientServiceText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.accent,
  },
  callButton: {
    borderRadius: RADIUS.lg,
    overflow: "hidden",
  },
  callButtonGradient: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },

  // ==================== EARNINGS CARD ====================
  earningsCard: {
    padding: SPACING.lg,
  },
  earningsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  earningsIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.accentBg,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.sm,
  },
  earningsLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  earningsBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  earningsBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.white,
  },
  earningsAmount: {
    fontSize: 36,
    fontWeight: "900",
    color: COLORS.accent,
    marginBottom: SPACING.md,
  },
  earningsBreakdown: {
    flexDirection: "row",
    backgroundColor: COLORS.borderLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  earningsBreakdownItem: {
    flex: 1,
    alignItems: "center",
  },
  earningsBreakdownLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  earningsBreakdownValue: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  earningsBreakdownDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.md,
  },

  // ==================== SECTION TITLE ====================
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textDark,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },

  // ==================== DETAIL ROWS ====================
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  detailInfo: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textDark,
  },

  // ==================== PRIMARY BUTTON ====================
  primaryButton: {
    borderRadius: RADIUS.lg,
    overflow: "hidden",
  },
  primaryButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.white,
  },
  primaryButtonIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: SPACING.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // ==================== SECONDARY BUTTON ====================
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  secondaryButtonActive: {
    borderColor: COLORS.warning,
    backgroundColor: COLORS.warningBg,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },

  // ==================== OTP ====================
  otpContainer: {
    alignItems: "center",
    paddingTop: SPACING.xl,
  },
  otpHeader: {
    alignItems: "center",
    marginBottom: SPACING.xxxl,
  },
  otpIconWrapper: {
    position: "relative",
    marginBottom: SPACING.xl,
  },
  otpIconBg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  otpIconRing: {
    position: "absolute",
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 2,
    borderColor: COLORS.warning + "30",
    top: -10,
    left: -10,
  },
  otpTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.textDark,
    marginBottom: SPACING.sm,
  },
  otpSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  otpInputWrapper: {
    width: "100%",
    marginBottom: SPACING.xxl,
  },
  otpInputContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: SPACING.md,
  },
  otpInput: {
    width: 60,
    height: 72,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.border,
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.textDark,
    textAlign: "center",
    ...SHADOWS.small,
  },
  otpInputFilled: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentBg,
  },
  otpInputError: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.errorBg,
  },
  otpErrorContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACING.md,
    gap: SPACING.xs,
  },
  otpErrorText: {
    color: COLORS.error,
    fontSize: 13,
    fontWeight: "500",
  },
  otpHint: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACING.xl,
    gap: SPACING.sm,
  },
  otpHintText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },

  // ==================== PHOTOS ====================
  photoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  photoHeaderIcon: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.lg,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  photoHeaderText: {
    flex: 1,
  },
  photoTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.textDark,
    marginBottom: SPACING.xs,
  },
  photoSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  photoGridWrapper: {
    marginBottom: SPACING.md,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
  },
  photoCard: {
    width: (width - SPACING.lg * 2 - SPACING.md) / 2,
    aspectRatio: 4 / 3,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    overflow: "hidden",
    ...SHADOWS.small,
  },
  photoCardFilled: {
    borderStyle: "solid",
    borderColor: COLORS.success,
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  photoRemoveButton: {
    position: "absolute",
    top: SPACING.sm,
    right: SPACING.sm,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.error,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.small,
  },
  photoIndexBadge: {
    position: "absolute",
    bottom: SPACING.sm,
    left: SPACING.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  photoIndexText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.white,
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  photoAddIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.accentBg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  photoAddText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  photoStatus: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  photoStatusLeft: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: SPACING.xs,
  },
  photoStatusCount: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  photoStatusLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  photoStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    gap: SPACING.xs,
  },
  photoStatusBadgeSuccess: {
    backgroundColor: COLORS.successBg,
  },
  photoStatusBadgeWarning: {
    backgroundColor: COLORS.warningBg,
  },
  photoStatusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // ==================== WASHING ====================
  washingContainer: {
    alignItems: "center",
    paddingTop: SPACING.xl,
  },
  timerWrapper: {
    marginBottom: SPACING.xxl,
  },
  timerOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  timerInner: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: COLORS.accent,
    ...SHADOWS.medium,
  },
  timerInnerPaused: {
    borderColor: COLORS.warning,
  },
  timerText: {
    fontSize: 52,
    fontWeight: "900",
    color: COLORS.textDark,
    letterSpacing: 2,
    marginBottom: SPACING.md,
  },
  timerStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.accentBg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.xxl,
    gap: SPACING.sm,
  },
  timerStatusBadgePaused: {
    backgroundColor: COLORS.warningBg,
  },
  timerStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timerStatusText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.accent,
  },
  washInfoCard: {
    width: "100%",
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.xxl,
    ...SHADOWS.small,
  },
  washInfoRow: {
    flexDirection: "row",
  },
  washInfoItem: {
    flex: 1,
    alignItems: "center",
    gap: SPACING.xs,
  },
  washInfoLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  washInfoValue: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  washInfoDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.sm,
  },
  washActions: {
    flexDirection: "row",
    gap: SPACING.md,
    width: "100%",
  },

  // ==================== SUMMARY ====================
  summaryCard: {
    padding: 0,
    overflow: "hidden",
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    gap: SPACING.sm,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  summaryContent: {
    padding: SPACING.lg,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.sm,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  summaryValueWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textDark,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.sm,
  },
  summaryDividerThick: {
    height: 2,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  summaryRowFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabelFinal: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  summaryValueFinal: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.success,
  },

  // ==================== COMPLETE ====================
  completeContainer: {
    alignItems: "center",
    paddingTop: SPACING.xl,
  },
  successAnimation: {
    position: "relative",
    marginBottom: SPACING.xxl,
  },
  successOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: "center",
    alignItems: "center",
  },
  successInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.medium,
  },
  successRipple: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: COLORS.success + "30",
    top: -10,
    left: -10,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: COLORS.textDark,
    marginBottom: SPACING.sm,
  },
  successSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xxl,
  },
  earningsCardLarge: {
    width: "100%",
    borderRadius: RADIUS.xxl,
    overflow: "hidden",
    marginBottom: SPACING.xxl,
    ...SHADOWS.large,
  },
  earningsCardLargeGradient: {
    padding: SPACING.xxl,
    alignItems: "center",
  },
  earningsCardLargeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  earningsCardLargeLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 1.5,
  },
  earningsCardLargeAmount: {
    fontSize: 52,
    fontWeight: "900",
    color: COLORS.white,
    marginBottom: SPACING.md,
  },
  earningsCardLargeFooter: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  earningsCardLargeFooterText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
  },
  completeStats: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.xxl,
    width: "100%",
    ...SHADOWS.small,
  },
  completeStatItem: {
    flex: 1,
    alignItems: "center",
    gap: SPACING.xs,
  },
  completeStatValue: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  completeStatLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  completeStatDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
});