// screens/DocumentUploadScreen.js

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  StyleSheet,
  TextInput,
  Platform,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../auth/AuthContext";

import { DOC_RULES } from "../constants/docRules";
import { API_BASE_URL } from "../config";

const DOC_VALIDATION = {
  aadhaar: {
    pattern: /^\d{12}$/,
    message: "Aadhaar number must be 12 digits",
    format: "XXXX XXXX XXXX",
  },
  pan: {
    pattern: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
    message: "Invalid PAN format (e.g., ABCDE1234F)",
    format: "ABCDE1234F",
  },
  driving_license: {
    pattern: /^[A-Z]{2}[0-9]{2}[0-9]{11}$/,
    message: "Invalid DL format",
    format: "MH12XXXXXXXXXXX",
  },
  vehicle_rc: {
    pattern: /^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/,
    message: "Invalid RC format (e.g., MH12AB1234)",
    format: "MH12AB1234",
  },
};

export default function DocumentUploadScreen({ route, navigation }) {
  const params = route.params;
  const { language, category } = params;

  const rules = DOC_RULES[category] || [];
  const [files, setFiles] = useState({});
  const [inputs, setInputs] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  const { login } = useAuth();

  function validateDocument(docType, value) {
    const validation = DOC_VALIDATION[docType];
    if (!validation) return true;
    return validation.pattern.test(value.toUpperCase().replace(/\s/g, ""));
  }

  function formatDocNumber(docType, value) {
    if (docType === "aadhaar") {
      const digits = value.replace(/\D/g, "").slice(0, 12);
      return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
    }
    if (["pan", "driving_license", "vehicle_rc"].includes(docType)) {
      return value.toUpperCase();
    }
    return value;
  }

  async function pickFile(docKey) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      return Alert.alert("Permission Required", "Please grant camera permissions");
    }

    Alert.alert(
      language === "hi" ? "छवि चुनें" : "Select Image",
      language === "hi" ? "कहाँ से अपलोड करें?" : "Choose upload source",
      [
        {
          text: language === "hi" ? "कैमरा" : "Camera",
          onPress: async () => {
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              quality: 0.8,
              aspect: [4, 3],
            });
            if (!result.canceled) {
              setFiles((p) => ({ ...p, [docKey]: result.assets[0] }));
              setUploadProgress((p) => ({ ...p, [docKey]: "uploaded" }));
            }
          },
        },
        {
          text: language === "hi" ? "गैलरी" : "Gallery",
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              quality: 0.8,
              aspect: [4, 3],
            });
            if (!result.canceled) {
              setFiles((p) => ({ ...p, [docKey]: result.assets[0] }));
              setUploadProgress((p) => ({ ...p, [docKey]: "uploaded" }));
            }
          },
        },
        { text: language === "hi" ? "रद्द करें" : "Cancel", style: "cancel" },
      ]
    );
  }

  function removeFile(docKey) {
    const updated = { ...files };
    delete updated[docKey];
    setFiles(updated);
    setUploadProgress((p) => {
      const newProgress = { ...p };
      delete newProgress[docKey];
      return newProgress;
    });
  }

  function validateAll() {
    const newErrors = {};
    for (let rule of rules) {
      if (rule.required) {
        if (!files[rule.key]) {
          newErrors[`${rule.key}_file`] = `${rule.label} photo is required`;
        }
        if (!inputs[rule.key] || !inputs[rule.key].trim()) {
          newErrors[`${rule.key}_input`] = `${rule.label} number is required`;
        } else if (!validateDocument(rule.key, inputs[rule.key])) {
          newErrors[`${rule.key}_input`] = DOC_VALIDATION[rule.key]?.message || "Invalid format";
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function submitAll() {
    if (!validateAll()) {
      Alert.alert(
        language === "hi" ? "अधूरा फॉर्म" : "Incomplete Form",
        language === "hi"
          ? "कृपया सभी आवश्यक दस्तावेज़ अपलोड करें"
          : "Please upload all required documents"
      );
      return;
    }

    setLoading(true);

    try {
      let technician_id = null;
      let techData = null;

      const regRes = await fetch(`${API_BASE_URL}/tech/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...params, document_url: null }),
      });

      const regData = await regRes.json();

      if (regData.success && regData.tech) {
        technician_id = regData.tech.id;
        techData = regData.tech;
      }

      if (!technician_id && regData.error === "PHONE_EXISTS") {
        const loginRes = await fetch(`${API_BASE_URL}/tech/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: params.phone }),
        });

        const loginData = await loginRes.json();
        if (loginData.tech) {
          technician_id = loginData.tech.id;
          techData = loginData.tech;
        } else {
          setLoading(false);
          return Alert.alert("Error", "Account exists but data missing");
        }
      }

      if (!technician_id) {
        setLoading(false);
        return Alert.alert("Error", "Unable to identify technician");
      }

      let lastUrl = null;

      for (let rule of rules) {
        if (!files[rule.key]) continue;

        setUploadProgress((p) => ({ ...p, [rule.key]: "uploading" }));

        const form = new FormData();
        form.append("file", {
          uri: files[rule.key].uri,
          name: `${rule.key}_${Date.now()}.jpg`,
          type: "image/jpeg",
        });
        form.append("technician_id", String(technician_id));
        form.append("doc_type", rule.key);
        form.append("doc_number", inputs[rule.key].replace(/\s/g, ""));

        const uploadRes = await fetch(`${API_BASE_URL}/docs/upload`, {
          method: "POST",
          headers: { "Content-Type": "multipart/form-data" },
          body: form,
        });

        const uploadData = await uploadRes.json();

        if (!uploadData.success) {
          setUploadProgress((p) => ({ ...p, [rule.key]: "error" }));
          setLoading(false);
          return Alert.alert("Upload Failed", `Failed to upload ${rule.label}`);
        }

        setUploadProgress((p) => ({ ...p, [rule.key]: "success" }));
        lastUrl = uploadData.file_url;
      }

      if (lastUrl) {
        await fetch(`${API_BASE_URL}/tech/update-doc`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ technician_id, document_url: lastUrl }),
        });
      }

      await login(techData);
    } catch (err) {
      console.log("ERROR:", err);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const getStatusIcon = (docKey) => {
    const status = uploadProgress[docKey];
    switch (status) {
      case "uploading":
        return <ActivityIndicator size="small" color="#111827" />;
      case "success":
        return <Ionicons name="checkmark-circle" size={22} color="#10B981" />;
      case "error":
        return <Ionicons name="close-circle" size={22} color="#DC2626" />;
      case "uploaded":
        return <Ionicons name="cloud-done" size={22} color="#111827" />;
      default:
        return null;
    }
  };

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
        <Text style={styles.headerTitle}>
          {language === "hi" ? "दस्तावेज़ अपलोड" : "Upload Documents"}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <View style={styles.infoBannerIcon}>
            <Ionicons name="shield-checkmark-outline" size={22} color="#111827" />
          </View>
          <View style={styles.infoBannerContent}>
            <Text style={styles.infoBannerTitle}>
              {language === "hi" ? "सुरक्षित अपलोड" : "Secure Upload"}
            </Text>
            <Text style={styles.infoBannerText}>
              {language === "hi"
                ? "आपके दस्तावेज़ एन्क्रिप्टेड हैं"
                : "Your documents are encrypted and secure"}
            </Text>
          </View>
        </View>

        {/* Document Cards */}
        {rules.map((rule, index) => (
          <View key={rule.key} style={styles.documentCard}>
            <View style={styles.documentHeader}>
              <View style={styles.documentHeaderLeft}>
                <View style={styles.documentIndex}>
                  <Text style={styles.documentIndexText}>{index + 1}</Text>
                </View>
                <View style={styles.documentTitleBox}>
                  <Text style={styles.documentTitle}>{rule.label}</Text>
                  {rule.required && (
                    <View style={styles.requiredBadge}>
                      <Text style={styles.requiredBadgeText}>Required</Text>
                    </View>
                  )}
                </View>
              </View>
              {getStatusIcon(rule.key)}
            </View>

            {/* Document Number Input */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>{rule.inputPlaceholder}</Text>
              <View
                style={[
                  styles.inputBox,
                  errors[`${rule.key}_input`] && styles.inputBoxError,
                  inputs[rule.key] &&
                    validateDocument(rule.key, inputs[rule.key]) &&
                    styles.inputBoxSuccess,
                ]}
              >
                <TextInput
                  style={styles.textInput}
                  placeholder={DOC_VALIDATION[rule.key]?.format || "Enter number"}
                  placeholderTextColor="#9CA3AF"
                  value={inputs[rule.key] || ""}
                  onChangeText={(text) => {
                    const formatted = formatDocNumber(rule.key, text);
                    setInputs((p) => ({ ...p, [rule.key]: formatted }));
                    if (errors[`${rule.key}_input`]) {
                      setErrors((p) => ({ ...p, [`${rule.key}_input`]: null }));
                    }
                  }}
                  autoCapitalize="characters"
                />
                {inputs[rule.key] &&
                  validateDocument(rule.key, inputs[rule.key]) && (
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  )}
              </View>
              {errors[`${rule.key}_input`] && (
                <Text style={styles.errorText}>{errors[`${rule.key}_input`]}</Text>
              )}
            </View>

            {/* Upload Section */}
            <View style={styles.uploadSection}>
              {!files[rule.key] ? (
                <TouchableOpacity
                  style={styles.uploadArea}
                  onPress={() => pickFile(rule.key)}
                  activeOpacity={0.7}
                >
                  <View style={styles.uploadIconBox}>
                    <Ionicons name="camera-outline" size={28} color="#111827" />
                  </View>
                  <Text style={styles.uploadText}>
                    {language === "hi" ? "फोटो अपलोड करें" : "Upload Photo"}
                  </Text>
                  <Text style={styles.uploadSubtext}>
                    {language === "hi" ? "कैमरा या गैलरी से" : "From camera or gallery"}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.previewContainer}>
                  <Image
                    source={{ uri: files[rule.key].uri }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                  <View style={styles.previewActions}>
                    <TouchableOpacity
                      style={styles.previewBtn}
                      onPress={() => pickFile(rule.key)}
                    >
                      <Ionicons name="camera" size={18} color="#FFFFFF" />
                      <Text style={styles.previewBtnText}>Change</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.previewBtn, styles.deleteBtn]}
                      onPress={() => removeFile(rule.key)}
                    >
                      <Ionicons name="trash" size={18} color="#FFFFFF" />
                      <Text style={styles.previewBtnText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              {errors[`${rule.key}_file`] && (
                <Text style={styles.errorText}>{errors[`${rule.key}_file`]}</Text>
              )}
            </View>
          </View>
        ))}

        {/* Tips Section */}
        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb-outline" size={18} color="#6B7280" />
            <Text style={styles.tipsTitle}>
              {language === "hi" ? "फोटो टिप्स" : "Photo Tips"}
            </Text>
          </View>
          <View style={styles.tipsList}>
            <Text style={styles.tipItem}>
              • {language === "hi" ? "अच्छी रोशनी में फोटो लें" : "Take photos in good lighting"}
            </Text>
            <Text style={styles.tipItem}>
              • {language === "hi" ? "सभी जानकारी स्पष्ट दिखनी चाहिए" : "All info should be visible"}
            </Text>
            <Text style={styles.tipItem}>
              • {language === "hi" ? "पूरा दस्तावेज़ फ्रेम में होना चाहिए" : "Entire document in frame"}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={submitAll}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.submitBtnText}>
                {language === "hi" ? "अपलोड हो रहा है..." : "Uploading..."}
              </Text>
            </View>
          ) : (
            <View style={styles.submitRow}>
              <Text style={styles.submitBtnText}>
                {language === "hi" ? "पंजीकरण पूरा करें" : "Complete Registration"}
              </Text>
              <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
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
    borderBottomColor: "#E5E7EB",
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

  // Info Banner
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  infoBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  infoBannerContent: {
    flex: 1,
  },
  infoBannerTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  infoBannerText: {
    fontSize: 13,
    color: "#6B7280",
  },

  // Document Card
  documentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  documentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  documentHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  documentIndex: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  documentIndexText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  documentTitleBox: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  requiredBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 4,
  },
  requiredBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#DC2626",
  },

  // Input Section
  inputSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
    marginBottom: 8,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: "#F9FAFB",
    height: 50,
  },
  inputBoxError: {
    borderColor: "#DC2626",
    backgroundColor: "#FEF2F2",
  },
  inputBoxSuccess: {
    borderColor: "#10B981",
    backgroundColor: "#F0FDF4",
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
    letterSpacing: 1,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 12,
    marginTop: 6,
  },

  // Upload Section
  uploadSection: {
    padding: 16,
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 28,
    alignItems: "center",
    backgroundColor: "#FAFAFA",
  },
  uploadIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  uploadText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  uploadSubtext: {
    fontSize: 13,
    color: "#6B7280",
  },

  // Preview
  previewContainer: {
    borderRadius: 12,
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: 180,
  },
  previewActions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  previewBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  deleteBtn: {
    backgroundColor: "rgba(220,38,38,0.9)",
  },
  previewBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },

  // Tips Card
  tipsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  tipsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginLeft: 8,
  },
  tipsList: {},
  tipItem: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 22,
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
    borderTopColor: "#E5E7EB",
  },
  submitBtn: {
    backgroundColor: "#111827",
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  submitBtnDisabled: {
    backgroundColor: "#9CA3AF",
  },
  submitRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  submitBtnText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
    marginRight: 8,
    marginLeft: 8,
  },
});