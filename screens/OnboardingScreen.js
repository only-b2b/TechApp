// screens/OnboardingScreen.js

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  BackHandler,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { generateTestOTP } from "../utils/otp";
import { API_BASE_URL } from "../config";
import { useAuth } from "../auth/AuthContext";

const { width, height } = Dimensions.get("window");

export default function OnboardingScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [language, setLanguage] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const { login } = useAuth();

  // Start with opacity 1 - NO animation issues
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const otpRefs = [useRef(), useRef(), useRef(), useRef()];

  // Back handler
  useEffect(() => {
    const backAction = () => {
      if (step > 1) {
        setStep(step - 1);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [step]);

  // Timer for resend OTP
  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  function validatePhone(number) {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(number);
  }

  function chooseLang(l) {
    setLanguage(l);
    setStep(2);
  }

  function sendOtp() {
    if (!validatePhone(phone)) {
      return Alert.alert(
        "Invalid Phone Number",
        "Please enter a valid 10-digit Indian mobile number starting with 6-9"
      );
    }

    setLoading(true);

    setTimeout(() => {
      const newOtp = generateTestOTP();
      console.log("TEST OTP:", newOtp);
      setGeneratedOtp(newOtp);
      setTimer(30);
      setStep(3);
      setLoading(false);
    }, 1000);
  }

  function handleOtpChange(value, index) {
    if (value.length > 1) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 3) {
      otpRefs[index + 1].current?.focus();
    }
  }

  function handleOtpKeyPress(e, index) {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  }

  async function verifyOtp() {
    const enteredOtp = otp.join("");

    if (enteredOtp.length !== 4) {
      return Alert.alert("Invalid OTP", "Please enter complete 4-digit OTP");
    }

    if (enteredOtp !== generatedOtp) {
      return Alert.alert("Invalid OTP", "The OTP you entered is incorrect.");
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/tech/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();
      console.log("LOGIN RESPONSE:", data);

      if (data.exists && data.tech) {
        await login(data.tech);
        return;
      }

      navigation.navigate("BasicDetails", { language, phone });
    } catch (err) {
      console.log("OTP LOGIN ERROR:", err);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function resendOtp() {
    if (timer > 0) return;
    const newOtp = generateTestOTP();
    console.log("RESEND OTP:", newOtp);
    setGeneratedOtp(newOtp);
    setOtp(["", "", "", ""]);
    setTimer(30);
    Alert.alert("OTP Sent", "A new OTP has been sent to your phone");
  }

  // ==================== RENDER ====================
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ========== HEADER ========== */}
      <View style={styles.header}>
        {step > 1 ? (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setStep(step - 1)}
          >
            <Ionicons name="arrow-back" size={22} color="#1F2937" />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtnPlaceholder} />
        )}

        <View style={styles.logoRow}>
          <LinearGradient
            colors={["#F97316", "#EA580C"]}
            style={styles.logoBox}
          >
            <Ionicons name="car-sport" size={24} color="#FFFFFF" />
          </LinearGradient>
          <View style={styles.logoTextWrap}>
            <Text style={styles.logoTitle}>Motors Partner</Text>
            <Text style={styles.logoSub}>Start earning today</Text>
          </View>
        </View>

        <View style={styles.progressRow}>
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              style={[
                styles.progressBar,
                step >= s ? styles.progressActive : styles.progressInactive,
              ]}
            />
          ))}
        </View>
      </View>

      {/* ========== CONTENT ========== */}
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ==================== STEP 1: LANGUAGE ==================== */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              {/* Icon */}
              <View style={styles.iconCircle}>
                <Ionicons name="language" size={48} color="#F97316" />
              </View>

              {/* Title */}
              <Text style={styles.title}>Choose your language</Text>
              <Text style={styles.subtitle}>
                Select your preferred language for a better experience
              </Text>

              {/* English Card */}
              <TouchableOpacity
                style={styles.languageCard}
                onPress={() => chooseLang("en")}
                activeOpacity={0.7}
              >
                <View style={styles.languageLeft}>
                  <View style={styles.flagBox}>
                    <Text style={styles.flagEmoji}>🇬🇧</Text>
                  </View>
                  <View style={styles.languageTextBox}>
                    <Text style={styles.languageName}>English</Text>
                    <Text style={styles.languageDesc}>Continue in English</Text>
                  </View>
                </View>
                <View style={styles.arrowBox}>
                  <Ionicons name="chevron-forward" size={20} color="#F97316" />
                </View>
              </TouchableOpacity>

              {/* Hindi Card */}
              <TouchableOpacity
                style={styles.languageCard}
                onPress={() => chooseLang("hi")}
                activeOpacity={0.7}
              >
                <View style={styles.languageLeft}>
                  <View style={styles.flagBox}>
                    <Text style={styles.flagEmoji}>🇮🇳</Text>
                  </View>
                  <View style={styles.languageTextBox}>
                    <Text style={styles.languageName}>हिन्दी</Text>
                    <Text style={styles.languageDesc}>हिंदी में जारी रखें</Text>
                  </View>
                </View>
                <View style={styles.arrowBox}>
                  <Ionicons name="chevron-forward" size={20} color="#F97316" />
                </View>
              </TouchableOpacity>

              {/* Note */}
              <View style={styles.noteBox}>
                <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
                <Text style={styles.noteText}>You can change this later in settings</Text>
              </View>
            </View>
          )}

          {/* ==================== STEP 2: PHONE ==================== */}
          {step === 2 && (
            <View style={styles.stepContainer}>
              {/* Icon */}
              <View style={styles.iconCircle}>
                <Ionicons name="phone-portrait-outline" size={48} color="#F97316" />
              </View>

              {/* Title */}
              <Text style={styles.title}>
                {language === "hi" ? "मोबाइल नंबर दर्ज करें" : "Enter your mobile number"}
              </Text>
              <Text style={styles.subtitle}>
                {language === "hi"
                  ? "हम आपको सत्यापन के लिए OTP भेजेंगे"
                  : "We'll send you a one-time password to verify"}
              </Text>

              {/* Label */}
              <Text style={styles.inputLabel}>
                {language === "hi" ? "फोन नंबर" : "Phone Number"}
              </Text>

              {/* Phone Input */}
              <View
                style={[
                  styles.phoneInputContainer,
                  phone.length > 0 && !validatePhone(phone) && styles.phoneInputError,
                  phone.length === 10 && validatePhone(phone) && styles.phoneInputSuccess,
                ]}
              >
                <View style={styles.countryCodeBox}>
                  <Text style={styles.flagSmall}>🇮🇳</Text>
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>
                <View style={styles.dividerLine} />
                <TextInput
                  style={styles.phoneInput}
                  keyboardType="number-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="9876543210"
                  placeholderTextColor="#9CA3AF"
                />
                {phone.length === 10 && validatePhone(phone) && (
                  <View style={styles.checkIcon}>
                    <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
                  </View>
                )}
              </View>

              {/* Error */}
              {phone.length > 0 && !validatePhone(phone) && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" />
                  <Text style={styles.errorText}>
                    {language === "hi"
                      ? "कृपया वैध 10 अंकों का नंबर दर्ज करें"
                      : "Please enter a valid 10-digit number"}
                  </Text>
                </View>
              )}

              {/* Send OTP Button */}
              <TouchableOpacity
                style={[
                  styles.button,
                  (!validatePhone(phone) || loading) && styles.buttonDisabled,
                ]}
                onPress={sendOtp}
                disabled={!validatePhone(phone) || loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <View style={styles.buttonContent}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.buttonText}>
                      {language === "hi" ? "भेज रहा है..." : "Sending..."}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.buttonText}>
                      {language === "hi" ? "OTP भेजें" : "Send OTP"}
                    </Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Terms */}
              <Text style={styles.termsText}>
                {language === "hi" ? "जारी रखकर, आप हमारी " : "By continuing, you agree to our "}
                <Text style={styles.termsLink}>
                  {language === "hi" ? "सेवा शर्तों" : "Terms of Service"}
                </Text>
                {language === "hi" ? " और " : " and "}
                <Text style={styles.termsLink}>
                  {language === "hi" ? "गोपनीयता नीति" : "Privacy Policy"}
                </Text>
                {language === "hi" ? " से सहमत हैं" : ""}
              </Text>
            </View>
          )}

          {/* ==================== STEP 3: OTP ==================== */}
          {step === 3 && (
            <View style={styles.stepContainer}>
              {/* Icon */}
              <View style={styles.iconCircle}>
                <Ionicons name="shield-checkmark-outline" size={48} color="#F97316" />
              </View>

              {/* Title */}
              <Text style={styles.title}>
                {language === "hi" ? "OTP सत्यापन" : "OTP Verification"}
              </Text>
              <Text style={styles.subtitle}>
                {language === "hi"
                  ? `+91 ${phone} पर भेजा गया 4-अंकीय कोड दर्ज करें`
                  : `Enter the 4-digit code sent to +91 ${phone}`}
              </Text>

              {/* Edit Number */}
              <TouchableOpacity
                style={styles.editNumberBox}
                onPress={() => setStep(2)}
              >
                <Ionicons name="pencil-outline" size={14} color="#F97316" />
                <Text style={styles.editNumberText}>
                  {language === "hi" ? "नंबर बदलें" : "Change Number"}
                </Text>
              </TouchableOpacity>

              {/* OTP Label */}
              <Text style={styles.inputLabel}>
                {language === "hi" ? "4-अंकीय OTP" : "Enter OTP"}
              </Text>

              {/* OTP Boxes */}
              <View style={styles.otpRow}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={otpRefs[index]}
                    style={[
                      styles.otpInput,
                      digit ? styles.otpInputFilled : null,
                    ]}
                    maxLength={1}
                    keyboardType="number-pad"
                    value={digit}
                    onChangeText={(value) => handleOtpChange(value, index)}
                    onKeyPress={(e) => handleOtpKeyPress(e, index)}
                  />
                ))}
              </View>

              {/* Verify Button */}
              <TouchableOpacity
                style={[
                  styles.button,
                  (otp.join("").length !== 4 || loading) && styles.buttonDisabled,
                ]}
                onPress={verifyOtp}
                disabled={otp.join("").length !== 4 || loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <View style={styles.buttonContent}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.buttonText}>
                      {language === "hi" ? "सत्यापित हो रहा..." : "Verifying..."}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.buttonText}>
                      {language === "hi" ? "सत्यापित करें" : "Verify & Continue"}
                    </Text>
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Resend */}
              <View style={styles.resendBox}>
                {timer > 0 ? (
                  <View style={styles.timerRow}>
                    <Ionicons name="time-outline" size={16} color="#6B7280" />
                    <Text style={styles.timerText}>
                      {language === "hi"
                        ? `${timer} सेकंड में पुनः भेजें`
                        : `Resend OTP in ${timer}s`}
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.resendButton}
                    onPress={resendOtp}
                  >
                    <Ionicons name="refresh-outline" size={16} color="#F97316" />
                    <Text style={styles.resendText}>
                      {language === "hi" ? "OTP पुनः भेजें" : "Resend OTP"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Test Hint */}
              <View style={styles.hintBox}>
                <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
                <Text style={styles.hintText}>Test OTP: 1234</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  // ===== HEADER =====
  header: {
    backgroundColor: "#FFFFFF",
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 24) + 10 : 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  backBtnPlaceholder: {
    height: 40,
    marginBottom: 16,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  logoBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  logoTextWrap: {
    marginLeft: 12,
  },
  logoTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  logoSub: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  progressRow: {
    flexDirection: "row",
  },
  progressBar: {
    height: 4,
    width: 36,
    borderRadius: 2,
    marginRight: 8,
  },
  progressActive: {
    backgroundColor: "#F97316",
  },
  progressInactive: {
    backgroundColor: "#E5E7EB",
  },

  // ===== CONTENT =====
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  stepContainer: {
    flex: 1,
  },

  // ===== ICON =====
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FFF7ED",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 24,
  },

  // ===== TYPOGRAPHY =====
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 10,
  },

  // ===== LANGUAGE CARDS =====
  languageCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  languageLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  flagBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  flagEmoji: {
    fontSize: 24,
  },
  languageTextBox: {
    justifyContent: "center",
  },
  languageName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1F2937",
  },
  languageDesc: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  arrowBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFF7ED",
    justifyContent: "center",
    alignItems: "center",
  },
  noteBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  noteText: {
    fontSize: 13,
    color: "#6B7280",
    marginLeft: 6,
  },

  // ===== INPUT =====
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  phoneInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    marginBottom: 16,
    height: 56,
  },
  phoneInputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  phoneInputSuccess: {
    borderColor: "#22C55E",
    backgroundColor: "#F0FDF4",
  },
  countryCodeBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    backgroundColor: "#F3F4F6",
    height: "100%",
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  flagSmall: {
    fontSize: 18,
    marginRight: 6,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  dividerLine: {
    width: 1,
    height: 28,
    backgroundColor: "#D1D5DB",
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    fontSize: 18,
    fontWeight: "500",
    color: "#1F2937",
    letterSpacing: 1,
  },
  checkIcon: {
    paddingRight: 12,
  },

  // ===== ERROR =====
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    marginTop: -8,
  },
  errorText: {
    fontSize: 13,
    color: "#DC2626",
    marginLeft: 6,
  },

  // ===== BUTTON =====
  button: {
    backgroundColor: "#F97316",
    borderRadius: 12,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: "#D1D5DB",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    marginRight: 8,
  },

  // ===== TERMS =====
  termsText: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  termsLink: {
    color: "#F97316",
    fontWeight: "600",
  },

  // ===== OTP =====
  editNumberBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  editNumberText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F97316",
    marginLeft: 6,
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 24,
  },
  otpInput: {
    width: 56,
    height: 60,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    marginHorizontal: 6,
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
  },
  otpInputFilled: {
    borderColor: "#F97316",
    backgroundColor: "#FFF7ED",
  },

  // ===== RESEND =====
  resendBox: {
    alignItems: "center",
    marginBottom: 24,
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  timerText: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 6,
  },
  resendButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "#FFF7ED",
    borderRadius: 10,
  },
  resendText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#F97316",
    marginLeft: 8,
  },

  // ===== HINT =====
  hintBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  hintText: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 8,
  },
});