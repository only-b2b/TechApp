// screens/DocumentUploadScreen.js
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  StyleSheet,
  Animated,
  TextInput,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

import { DOC_RULES } from "../constants/docRules";
import { API_BASE_URL } from "../config";

export default function DocumentUploadScreen({ route, navigation }) {
  const params = route.params;
  const { language, category } = params;

  // Rules from docRules.js (already includes Aadhaar + PAN for all, DL & RC per category)
  const rules = DOC_RULES[category] || [];

  const [files, setFiles] = useState({});
  const [inputs, setInputs] = useState({});
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ------------- Animation -------------
  function animate() {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }

  useEffect(() => {
    animate();
  }, []);

  // ------------- Pick Image (with permission) -------------
  async function pickFile(docKey) {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        return Alert.alert(
          language === "hi" ? "अनुमति आवश्यक" : "Permission required",
          language === "hi"
            ? "कृपया गैलरी से फ़ोटो चुनने की अनुमति दें।"
            : "Please allow access to your photos to upload documents."
        );
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled) {
        setFiles((prev) => ({ ...prev, [docKey]: result.assets[0] }));
      }
    } catch (e) {
      console.log("pickFile error:", e);
      Alert.alert("Error", "Could not open image picker");
    }
  }

  // ------------- Delete selected image -------------
  function removeFile(docKey) {
    const updated = { ...files };
    delete updated[docKey];
    setFiles(updated);
  }

  // ------------- Submit all docs -------------
  async function submitAll() {
    try {
      // Validate required docs & numbers
      for (let rule of rules) {
        if (rule.required) {
          if (!files[rule.key]) {
            return Alert.alert(
              language === "hi" ? "दस्तावेज़ आवश्यक" : "Missing document",
              `${rule.label}`
            );
          }
          if (!inputs[rule.key]) {
            return Alert.alert(
              language === "hi" ? "नंबर आवश्यक" : "Missing number",
              rule.inputPlaceholder
            );
          }
        }
      }

      // 1) Register technician or fetch existing one
      const regRes = await fetch(`${API_BASE_URL}/tech/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...params, document_url: null }),
      });

      const regData = await regRes.json();
      let technician_id = null;
      let techData = null;

      if (!regData.success && regData.error === "PHONE_EXISTS") {
        const loginRes = await fetch(`${API_BASE_URL}/tech/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: params.phone }),
        });
        const loginData = await loginRes.json();

        technician_id = loginData.tech.id;
        techData = loginData.tech;
      } else if (regData.success) {
        technician_id = regData.tech.id;
        techData = regData.tech;
      } else {
        return Alert.alert("Error", regData.error || "Registration failed");
      }

      // 2) Upload each selected doc
      let lastUrl = null;

      for (let rule of rules) {
        // RC for driver is optional, and any optional doc may be skipped
        if (!files[rule.key]) continue;

        const f = files[rule.key];
        const form = new FormData();

        form.append("file", {
          uri: f.uri,
          name: `${rule.key}.jpg`,
          type: "image/jpeg",
        });
        form.append("technician_id", String(technician_id));
        form.append("doc_type", rule.key);
        form.append("doc_number", inputs[rule.key] || "");

        const uploadRes = await fetch(`${API_BASE_URL}/docs/upload`, {
          method: "POST",
          headers: { "Content-Type": "multipart/form-data" },
          body: form,
        });

        const uploadData = await uploadRes.json();

        if (!uploadData.success) {
          return Alert.alert(
            "Upload Failed",
            `Failed to upload ${rule.label}`
          );
        }

        lastUrl = uploadData.file_url;
      }

      // 3) Update technicians table with last document URL (for quick thumbnail)
      if (lastUrl) {
        await fetch(`${API_BASE_URL}/tech/update-doc`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            technician_id,
            document_url: lastUrl,
          }),
        });
      }

      // 4) Go to Thank You
      navigation.replace("ThankYou", { tech: techData });
    } catch (e) {
      console.log("submitAll error:", e);
      Alert.alert("Error", "Something went wrong");
    }
  }

  return (
    <ScrollView style={styles.container}>
      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Header */}
        <Text style={styles.heading}>
          {language === "hi" ? "दस्तावेज़ अपलोड करें" : "Upload Documents"}
        </Text>

        <Text style={styles.info}>
          {language === "hi"
            ? "अपनी पहचान और पात्रता सत्यापित करने के लिए आवश्यक दस्तावेज़ अपलोड करें।"
            : "Upload the required documents to verify your identity and eligibility."}
        </Text>

        {/* Category chip */}
        <View style={styles.categoryChip}>
          <Ionicons name="briefcase-outline" size={18} color="#38BDF8" />
          <Text style={styles.categoryChipText}>
            {language === "hi" ? "श्रेणी" : "Category"}: {category.toUpperCase()}
          </Text>
        </View>

        {/* Per-document blocks */}
        {rules.map((rule) => (
          <View key={rule.key} style={styles.block}>
            <View style={styles.blockHeader}>
              <Text style={styles.label}>{rule.label}</Text>
              {rule.required && (
                <Text style={styles.requiredBadge}>
                  {language === "hi" ? "अनिवार्य" : "Required"}
                </Text>
              )}
            </View>

            {/* Helper text */}
            {rule.helper && (
              <Text style={styles.helper}>{rule.helper}</Text>
            )}

            {/* Input box for document number */}
            <TextInput
              style={styles.input}
              placeholder={rule.inputPlaceholder}
              placeholderTextColor="#94A3B8"
              value={inputs[rule.key] || ""}
              onChangeText={(t) =>
                setInputs((p) => ({ ...p, [rule.key]: t }))
              }
            />

            {/* Upload button */}
            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={() => pickFile(rule.key)}
            >
              <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
              <Text style={styles.uploadText}>
                {language === "hi" ? "फ़ाइल चुनें" : "Select File"}
              </Text>
            </TouchableOpacity>

            {/* Thumbnail Preview + Remove */}
            {files[rule.key] && (
              <View style={styles.previewRow}>
                <Image
                  source={{ uri: files[rule.key].uri }}
                  style={styles.previewImg}
                />
                <TouchableOpacity
                  onPress={() => removeFile(rule.key)}
                  style={styles.deleteBtn}
                >
                  <Ionicons name="close-circle" size={26} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}

        {/* Submit Button */}
        <TouchableOpacity style={styles.submitBtn} onPress={submitAll}>
          <Text style={styles.submitText}>
            {language === "hi" ? "सबमिट करें" : "Submit All Documents"}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

// -------------------- STYLES --------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
    padding: 20,
  },

  heading: {
    color: "#22D3EE",
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 6,
  },

  info: {
    color: "#94A3B8",
    marginBottom: 16,
    fontSize: 14,
  },

  categoryChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1E293B",
    marginBottom: 16,
  },

  categoryChipText: {
    color: "#E5E7EB",
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "600",
  },

  block: {
    marginBottom: 18,
    backgroundColor: "#020617",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E293B",
  },

  blockHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },

  label: {
    color: "#E2E8F0",
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },

  requiredBadge: {
    fontSize: 11,
    color: "#F97316",
    borderWidth: 1,
    borderColor: "#F97316",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },

  helper: {
    color: "#64748B",
    marginBottom: 10,
    fontSize: 13,
  },

  input: {
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 10,
    padding: 10,
    color: "#F8FAFC",
    marginBottom: 10,
    fontSize: 14,
  },

  uploadBtn: {
    backgroundColor: "#3B82F6",
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  uploadText: {
    color: "white",
    fontSize: 14,
    marginLeft: 6,
    fontWeight: "600",
  },

  previewRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  previewImg: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1E293B",
  },

  deleteBtn: {
    marginLeft: 10,
  },

  submitBtn: {
    backgroundColor: "#10B981",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 10,
    alignItems: "center",
    marginBottom: 30,
  },

  submitText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
});
