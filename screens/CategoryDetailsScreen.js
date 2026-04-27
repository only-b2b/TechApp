// screens/CategoryDetailsScreen.js

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  StatusBar,
  BackHandler,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const VEHICLES = [
  { key: "bike", label: "Bike", labelHi: "बाइक", icon: "bicycle-outline" },
  { key: "scooter", label: "Scooter", labelHi: "स्कूटर", icon: "flash-outline" },
  { key: "car", label: "Car", labelHi: "कार", icon: "car-sport-outline" },
];

const EXPERIENCE_OPTIONS = [
  { key: "0-1", label: "0-1 years", labelHi: "0-1 वर्ष" },
  { key: "1-3", label: "1-3 years", labelHi: "1-3 वर्ष" },
  { key: "3-5", label: "3-5 years", labelHi: "3-5 वर्ष" },
  { key: "5+", label: "5+ years", labelHi: "5+ वर्ष" },
];

export default function CategoryDetailsScreen({ route, navigation }) {
  const { language, phone, email, fullName, category, area } = route.params;

  const [expertise, setExpertise] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [experience, setExperience] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const backAction = () => {
      navigation.goBack();
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, []);

  function validateExpertise() {
    if (!expertise.trim()) return "Please describe your expertise";
    if (expertise.trim().length < 20) return "Please provide more details (min 20 characters)";
    return null;
  }

  function next() {
    const newErrors = {};
    const payload = {
      language,
      phone: String(phone),
      email,
      fullName,
      category,
      area,
    };

    if (category === "carwash") {
      const expertiseError = validateExpertise();
      if (expertiseError) {
        newErrors.expertise = expertiseError;
      } else {
        payload.expertise = expertise.trim();
      }
    }

    if (category === "pickdrop") {
      if (!vehicle) {
        newErrors.vehicle = "Please select a vehicle";
      } else {
        payload.vehicle = vehicle;
      }
    }

    if (category === "driver") {
      if (!experience) {
        newErrors.experience = "Please select your experience";
      } else {
        payload.experience = experience;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    navigation.navigate("DocumentUpload", payload);
  }

  const getCategoryInfo = () => {
    switch (category) {
      case "carwash":
        return {
          title: language === "hi" ? "कारवॉश विवरण" : "Car Wash Details",
          subtitle: language === "hi" ? "अपने अनुभव के बारे में बताएं" : "Tell us about your experience",
          icon: "water-outline",
        };
      case "pickdrop":
        return {
          title: language === "hi" ? "पिक एंड ड्रॉप" : "Pick & Drop Details",
          subtitle: language === "hi" ? "अपना वाहन चुनें" : "Select the vehicle you'll use",
          icon: "bicycle-outline",
        };
      case "driver":
        return {
          title: language === "hi" ? "ड्राइवर विवरण" : "Driver Details",
          subtitle: language === "hi" ? "अपना अनुभव बताएं" : "Share your driving experience",
          icon: "car-sport-outline",
        };
      default:
        return { title: "", subtitle: "", icon: "help-outline" };
    }
  };

  const categoryInfo = getCategoryInfo();

  const isValid =
    (category === "carwash" && expertise.length >= 20) ||
    (category === "pickdrop" && vehicle) ||
    (category === "driver" && experience);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{categoryInfo.title}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Category Header */}
        <View style={styles.categoryHeader}>
          <View style={styles.categoryIconBox}>
            <Ionicons name={categoryInfo.icon} size={36} color="#111827" />
          </View>
          <Text style={styles.categoryTitle}>{categoryInfo.title}</Text>
          <Text style={styles.categorySubtitle}>{categoryInfo.subtitle}</Text>
        </View>

        {/* CARWASH FORM */}
        {category === "carwash" && (
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>
              {language === "hi" ? "आपका अनुभव" : "Describe Your Experience"} *
            </Text>
            <Text style={styles.sectionSubtitle}>
              {language === "hi"
                ? "विस्तार से बताएं कि आपके पास क्या अनुभव है"
                : "Help us understand your skills and background"}
            </Text>

            <View
              style={[
                styles.textAreaBox,
                errors.expertise && styles.inputBoxError,
              ]}
            >
              <TextInput
                style={styles.textArea}
                multiline
                numberOfLines={6}
                placeholder={
                  language === "hi"
                    ? "उदाहरण: मुझे 5+ साल का कारवॉश अनुभव है..."
                    : "Example: I have 5+ years of car washing experience..."
                }
                placeholderTextColor="#9CA3AF"
                value={expertise}
                onChangeText={(text) => {
                  setExpertise(text);
                  if (errors.expertise) setErrors({ ...errors, expertise: null });
                }}
                textAlignVertical="top"
              />
            </View>
            <Text style={styles.charCount}>{expertise.length}/20 min</Text>
            {errors.expertise && (
              <Text style={styles.errorText}>{errors.expertise}</Text>
            )}

            <View style={styles.tipCard}>
              <Ionicons name="bulb-outline" size={18} color="#6B7280" />
              <Text style={styles.tipText}>
                {language === "hi"
                  ? "विस्तृत विवरण से अधिक ग्राहक आकर्षित होते हैं"
                  : "A detailed description helps attract more customers"}
              </Text>
            </View>
          </View>
        )}

        {/* PICK & DROP FORM */}
        {category === "pickdrop" && (
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>
              {language === "hi" ? "अपना वाहन चुनें" : "Select Your Vehicle"} *
            </Text>
            <Text style={styles.sectionSubtitle}>
              {language === "hi"
                ? "पिक एंड ड्रॉप के लिए आप कौन सा वाहन इस्तेमाल करेंगे?"
                : "Which vehicle will you use for pick & drop services?"}
            </Text>

            <View style={styles.vehicleList}>
              {VEHICLES.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.vehicleCard,
                    vehicle === item.key && styles.vehicleCardSelected,
                  ]}
                  onPress={() => {
                    setVehicle(item.key);
                    if (errors.vehicle) setErrors({ ...errors, vehicle: null });
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.vehicleIconBox,
                      vehicle === item.key && styles.vehicleIconBoxSelected,
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={26}
                      color={vehicle === item.key ? "#FFFFFF" : "#111827"}
                    />
                  </View>
                  <Text
                    style={[
                      styles.vehicleLabel,
                      vehicle === item.key && styles.vehicleLabelSelected,
                    ]}
                  >
                    {language === "hi" ? item.labelHi : item.label}
                  </Text>
                  {vehicle === item.key && (
                    <Ionicons name="checkmark-circle" size={24} color="#111827" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            {errors.vehicle && (
              <Text style={styles.errorText}>{errors.vehicle}</Text>
            )}
          </View>
        )}

        {/* DRIVER FORM */}
        {category === "driver" && (
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>
              {language === "hi" ? "ड्राइविंग अनुभव" : "Driving Experience"} *
            </Text>
            <Text style={styles.sectionSubtitle}>
              {language === "hi"
                ? "आपको कितने साल का ड्राइविंग अनुभव है?"
                : "How many years of driving experience do you have?"}
            </Text>

            <View style={styles.experienceGrid}>
              {EXPERIENCE_OPTIONS.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.experienceCard,
                    experience === item.key && styles.experienceCardSelected,
                  ]}
                  onPress={() => {
                    setExperience(item.key);
                    if (errors.experience) setErrors({ ...errors, experience: null });
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.experienceLabel,
                      experience === item.key && styles.experienceLabelSelected,
                    ]}
                  >
                    {language === "hi" ? item.labelHi : item.label}
                  </Text>
                  {experience === item.key && (
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            {errors.experience && (
              <Text style={styles.errorText}>{errors.experience}</Text>
            )}

            <View style={styles.requirementCard}>
              <View style={styles.requirementHeader}>
                <Ionicons name="document-text-outline" size={18} color="#111827" />
                <Text style={styles.requirementTitle}>
                  {language === "hi" ? "आवश्यकताएं" : "Requirements"}
                </Text>
              </View>
              <View style={styles.requirementList}>
                <Text style={styles.requirementItem}>
                  • {language === "hi" ? "वैध ड्राइविंग लाइसेंस" : "Valid driving license"}
                </Text>
                <Text style={styles.requirementItem}>
                  • {language === "hi" ? "आयु 21 वर्ष से अधिक" : "Age above 21 years"}
                </Text>
                <Text style={styles.requirementItem}>
                  • {language === "hi" ? "साफ ड्राइविंग रिकॉर्ड" : "Clean driving record"}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.continueBtn, !isValid && styles.continueBtnDisabled]}
          onPress={next}
          activeOpacity={0.8}
          disabled={!isValid}
        >
          <Text style={styles.continueBtnText}>
            {language === "hi" ? "दस्तावेज़ अपलोड करें" : "Upload Documents"}
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

  // Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },

  // Category Header
  categoryHeader: {
    alignItems: "center",
    marginBottom: 32,
  },
  categoryIconBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  categorySubtitle: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
  },

  // Form Section
  formSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
    lineHeight: 20,
  },

  // TextArea
  textAreaBox: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
  },
  inputBoxError: {
    borderColor: "#DC2626",
    backgroundColor: "#FEF2F2",
  },
  textArea: {
    padding: 16,
    fontSize: 15,
    color: "#111827",
    minHeight: 140,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "right",
    marginTop: 8,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    marginTop: 8,
  },

  // Tip Card
  tipCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: "#6B7280",
    marginLeft: 12,
    lineHeight: 18,
  },

  // Vehicle Selection
  vehicleList: {
    marginBottom: 16,
  },
  vehicleCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "transparent",
    marginBottom: 12,
  },
  vehicleCardSelected: {
    backgroundColor: "#F3F4F6",
    borderColor: "#111827",
  },
  vehicleIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  vehicleIconBoxSelected: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  vehicleLabel: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    color: "#111827",
  },
  vehicleLabelSelected: {
    color: "#111827",
  },

  // Experience Selection
  experienceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
    marginHorizontal: -6,
  },
  experienceCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
    margin: 6,
  },
  experienceCardSelected: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  experienceLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginRight: 8,
  },
  experienceLabelSelected: {
    color: "#FFFFFF",
  },

  // Requirement Card
  requirementCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
  },
  requirementHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  requirementTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginLeft: 8,
  },
  requirementList: {},
  requirementItem: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 24,
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