// screens/BasicDetailsScreen.js

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  BackHandler,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const CATEGORIES = [
  {
    key: "carwash",
    label: "Car Wash",
    labelHi: "कार वॉश",
    icon: "water-outline",
    description: "Exterior & interior cleaning",
    descriptionHi: "बाहरी और आंतरिक सफाई",
  },
  {
    key: "pickdrop",
    label: "Pick & Drop",
    labelHi: "पिक एंड ड्रॉप",
    icon: "bicycle-outline",
    description: "Vehicle pickup & delivery",
    descriptionHi: "वाहन पिकअप और डिलीवरी",
  },
  {
    key: "driver",
    label: "Driver",
    labelHi: "ड्राइवर",
    icon: "car-sport-outline",
    description: "Personal driver services",
    descriptionHi: "व्यक्तिगत ड्राइवर सेवाएं",
  },
];

export default function BasicDetailsScreen({ route, navigation }) {
  const { language, phone } = route.params;

  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("");
  const [area, setArea] = useState("");
  const [errors, setErrors] = useState({});

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

  function validateName(name) {
    const nameRegex = /^[a-zA-Z\s]{3,50}$/;
    return nameRegex.test(name.trim());
  }

  function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  function validateArea(area) {
    return area.trim().length >= 3;
  }

  function validateStep1() {
    const newErrors = {};

    if (!fullName.trim()) {
      newErrors.fullName = "Full name is required";
    } else if (!validateName(fullName)) {
      newErrors.fullName = "Enter a valid name (3-50 letters only)";
    }

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(email)) {
      newErrors.email = "Enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function nextStep() {
    if (step === 1) {
      if (!validateStep1()) return;
    }

    if (step === 2 && !category) {
      setErrors({ category: "Please select a category" });
      return;
    }

    if (step === 3) {
      if (!validateArea(area)) {
        setErrors({ area: "Enter a valid area/city (min 3 characters)" });
        return;
      }

      return navigation.navigate("CategoryDetails", {
        language,
        phone,
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        category,
        area: area.trim(),
      });
    }

    setErrors({});
    setStep(step + 1);
  }

  const isStep1Valid = validateName(fullName) && validateEmail(email);
  const isStep2Valid = !!category;
  const isStep3Valid = validateArea(area);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (step > 1) {
              setStep(step - 1);
            } else {
              navigation.goBack();
            }
          }}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {language === "hi" ? "प्रोफाइल बनाएं" : "Create Profile"}
        </Text>

        <View style={styles.headerRight} />
      </View>

      {/* Progress */}
      <View style={styles.progressSection}>
        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]}
          />
        </View>
        <Text style={styles.progressLabel}>
          {language === "hi" ? `चरण ${step}/3` : `Step ${step} of 3`}
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ==================== STEP 1 ==================== */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              <View style={styles.stepIconBox}>
                <Ionicons name="person-outline" size={28} color="#111827" />
              </View>

              <Text style={styles.stepTitle}>
                {language === "hi" ? "व्यक्तिगत जानकारी" : "Personal Information"}
              </Text>
              <Text style={styles.stepSubtitle}>
                {language === "hi"
                  ? "अपना नाम और ईमेल दर्ज करें"
                  : "Enter your name and email for verification"}
              </Text>

              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {language === "hi" ? "पूरा नाम" : "Full Name"} *
                </Text>
                <View
                  style={[
                    styles.inputBox,
                    errors.fullName && styles.inputBoxError,
                    fullName && validateName(fullName) && styles.inputBoxSuccess,
                  ]}
                >
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={errors.fullName ? "#DC2626" : "#6B7280"}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder={language === "hi" ? "राहुल शर्मा" : "John Doe"}
                    placeholderTextColor="#9CA3AF"
                    value={fullName}
                    onChangeText={(text) => {
                      setFullName(text);
                      if (errors.fullName) setErrors({ ...errors, fullName: null });
                    }}
                    autoCapitalize="words"
                  />
                  {fullName && validateName(fullName) && (
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  )}
                </View>
                {errors.fullName && (
                  <Text style={styles.errorText}>{errors.fullName}</Text>
                )}
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {language === "hi" ? "ईमेल" : "Email Address"} *
                </Text>
                <View
                  style={[
                    styles.inputBox,
                    errors.email && styles.inputBoxError,
                    email && validateEmail(email) && styles.inputBoxSuccess,
                  ]}
                >
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={errors.email ? "#DC2626" : "#6B7280"}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="example@email.com"
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (errors.email) setErrors({ ...errors, email: null });
                    }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  {email && validateEmail(email) && (
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  )}
                </View>
                {errors.email && (
                  <Text style={styles.errorText}>{errors.email}</Text>
                )}
              </View>

              {/* Info Card */}
              <View style={styles.infoCard}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#6B7280" />
                <Text style={styles.infoText}>
                  {language === "hi"
                    ? "आपकी जानकारी सुरक्षित है"
                    : "Your information is secure and encrypted"}
                </Text>
              </View>
            </View>
          )}

          {/* ==================== STEP 2 ==================== */}
          {step === 2 && (
            <View style={styles.stepContainer}>
              <View style={styles.stepIconBox}>
                <Ionicons name="briefcase-outline" size={28} color="#111827" />
              </View>

              <Text style={styles.stepTitle}>
                {language === "hi" ? "सेवा श्रेणी" : "Service Category"}
              </Text>
              <Text style={styles.stepSubtitle}>
                {language === "hi"
                  ? "आप किस प्रकार की सेवा देना चाहते हैं?"
                  : "What type of service will you provide?"}
              </Text>

              <View style={styles.categoryList}>
                {CATEGORIES.map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.categoryCard,
                      category === item.key && styles.categoryCardSelected,
                    ]}
                    onPress={() => {
                      setCategory(item.key);
                      setErrors({ ...errors, category: null });
                    }}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.categoryIconBox,
                        category === item.key && styles.categoryIconBoxSelected,
                      ]}
                    >
                      <Ionicons
                        name={item.icon}
                        size={26}
                        color={category === item.key ? "#FFFFFF" : "#111827"}
                      />
                    </View>
                    <View style={styles.categoryTextBox}>
                      <Text
                        style={[
                          styles.categoryName,
                          category === item.key && styles.categoryNameSelected,
                        ]}
                      >
                        {language === "hi" ? item.labelHi : item.label}
                      </Text>
                      <Text style={styles.categoryDesc}>
                        {language === "hi" ? item.descriptionHi : item.description}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.radioCircle,
                        category === item.key && styles.radioCircleSelected,
                      ]}
                    >
                      {category === item.key && <View style={styles.radioDot} />}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {errors.category && (
                <Text style={styles.errorTextCenter}>{errors.category}</Text>
              )}
            </View>
          )}

          {/* ==================== STEP 3 ==================== */}
          {step === 3 && (
            <View style={styles.stepContainer}>
              <View style={styles.stepIconBox}>
                <Ionicons name="location-outline" size={28} color="#111827" />
              </View>

              <Text style={styles.stepTitle}>
                {language === "hi" ? "कार्य क्षेत्र" : "Service Area"}
              </Text>
              <Text style={styles.stepSubtitle}>
                {language === "hi"
                  ? "आप कहाँ काम करना चाहते हैं?"
                  : "Where do you want to work?"}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {language === "hi" ? "क्षेत्र / शहर" : "Area / City"} *
                </Text>
                <View
                  style={[
                    styles.inputBox,
                    errors.area && styles.inputBoxError,
                    area && validateArea(area) && styles.inputBoxSuccess,
                  ]}
                >
                  <Ionicons
                    name="location-outline"
                    size={20}
                    color={errors.area ? "#DC2626" : "#6B7280"}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder={
                      language === "hi" ? "जैसे: पुणे, वाकड" : "e.g., Pune, Wakad"
                    }
                    placeholderTextColor="#9CA3AF"
                    value={area}
                    onChangeText={(text) => {
                      setArea(text);
                      if (errors.area) setErrors({ ...errors, area: null });
                    }}
                  />
                  {area && validateArea(area) && (
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  )}
                </View>
                {errors.area && (
                  <Text style={styles.errorText}>{errors.area}</Text>
                )}
              </View>

              <View style={styles.tipCard}>
                <Ionicons name="bulb-outline" size={18} color="#6B7280" />
                <Text style={styles.tipText}>
                  {language === "hi"
                    ? "आप बाद में अपना क्षेत्र बदल सकते हैं"
                    : "You can change your service area later"}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.continueBtn,
            ((step === 1 && !isStep1Valid) ||
              (step === 2 && !isStep2Valid) ||
              (step === 3 && !isStep3Valid)) &&
              styles.continueBtnDisabled,
          ]}
          onPress={nextStep}
          activeOpacity={0.8}
          disabled={
            (step === 1 && !isStep1Valid) ||
            (step === 2 && !isStep2Valid) ||
            (step === 3 && !isStep3Valid)
          }
        >
          <Text style={styles.continueBtnText}>
            {step === 3
              ? language === "hi"
                ? "जारी रखें"
                : "Continue"
              : language === "hi"
              ? "आगे बढ़ें"
              : "Next"}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 24) + 12 : 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111827",
  },
  headerRight: {
    width: 40,
  },

  // Progress
  progressSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
  },
  progressTrack: {
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#111827",
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "right",
  },

  // Content
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 120,
  },
  stepContainer: {},

  // Step Header
  stepIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 15,
    color: "#6B7280",
    lineHeight: 22,
    marginBottom: 28,
  },

  // Input
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 54,
  },
  inputBoxError: {
    borderColor: "#DC2626",
    backgroundColor: "#FEF2F2",
  },
  inputBoxSuccess: {
    borderColor: "#10B981",
    backgroundColor: "#F0FDF4",
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    marginTop: 6,
  },
  errorTextCenter: {
    color: "#DC2626",
    fontSize: 14,
    textAlign: "center",
    marginTop: 16,
  },

  // Info Card
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#6B7280",
    marginLeft: 12,
    lineHeight: 18,
  },

  // Category
  categoryList: {
    marginBottom: 16,
  },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  categoryCardSelected: {
    backgroundColor: "#F3F4F6",
    borderColor: "#111827",
  },
  categoryIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  categoryIconBoxSelected: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  categoryTextBox: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  categoryNameSelected: {
    color: "#111827",
  },
  categoryDesc: {
    fontSize: 13,
    color: "#6B7280",
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
  },
  radioCircleSelected: {
    borderColor: "#111827",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#111827",
  },

  // Tip Card
  tipCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: "#6B7280",
    marginLeft: 12,
    lineHeight: 18,
  },

  // Bottom Bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
    height: 56,
    borderRadius: 14,
  },
  continueBtnDisabled: {
    backgroundColor: "#D1D5DB",
  },
  continueBtnText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
    marginRight: 8,
  },
});